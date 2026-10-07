#!/usr/bin/env node
/* eslint-disable no-console -- CLI report for npm run validate:blocks */
/**
 * Validates the block markup in patterns, templates and parts the way the
 * editor does, so hand-written serialised HTML that would drop a block into
 * recovery mode is caught before it ships.
 *
 * Patterns are PHP, so their rendered content is read from WordPress through
 * WP-CLI (bin/wp.sh, which uses Local or falls back to wp-env); templates and
 * parts are read from disk. If bin/wp.sh cannot reach a site, or the theme is
 * not active there, the patterns are skipped with a warning and the run
 * continues with the on-disk documents. Each document is run through the
 * parse() function from @wordpress/blocks against the core block registry,
 * and each block is checked for:
 *
 *   unknown     — a block name that is not registered (a typo, or a plugin
 *                 block whose namespace is not allowed; see below).
 *   invalid     — the markup matches no save() version; the editor shows
 *                 "This block contains unexpected or invalid content".
 *   deprecated  — the markup matches only an older save(); the editor accepts
 *                 it but rewrites it, and the template shows as customised.
 *   references  — a wp:pattern slug that is not registered, or a
 *                 wp:template-part slug with no parts/<slug>.html.
 *
 * Plugin blocks cannot be validated here (their save() lives in the plugin's
 * editor JS). List their namespaces under "validateBlocks": { "allow": [] } in
 * package.json, or pass --allow=; they are then counted as skipped, and the
 * core blocks inside them are still checked.
 *
 * Usage:
 *   npm run validate:blocks
 *   npm run validate:blocks -- templates/page.html patterns/header.php
 *   npm run validate:blocks -- --from=/path/documents.json   # {"name": "block markup", ...}
 *   npm run validate:blocks -- --allow=blockendar,gravityforms
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const fromArg = args.find((arg) => arg.startsWith("--from="));
const allowArg = args.find((arg) => arg.startsWith("--allow="));
const fileArgs = args.filter((arg) => !arg.startsWith("--"));

// Patterns are registered under the theme's text domain (`wpsets/…`); read it
// from style.css so the script does not need editing in a derived theme.
const textDomain = (fs
	.readFileSync(path.join(root, "style.css"), "utf8")
	.match(/^Text Domain:\s*(\S+)/m) || [])[1];
if (!textDomain) {
	console.error("Could not read Text Domain from style.css.");
	process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const allowed = new Set([
	...((pkg.validateBlocks && pkg.validateBlocks.allow) || []),
	...(allowArg ? allowArg.slice("--allow=".length).split(",").filter(Boolean) : []),
]);

// @wordpress/blocks and the core block library expect browser globals.
// A silent virtual console: jsdom cannot parse the editor UI package's modern
// CSS and would otherwise print a stack trace for every stylesheet it injects.
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
	url: "http://localhost/",
	virtualConsole: new VirtualConsole(),
});
for (const key of [
	"window",
	"document",
	"navigator",
	"HTMLElement",
	"Node",
	"Element",
	"DOMParser",
	"MutationObserver",
	"getComputedStyle",
	"CSS",
]) {
	if (!(key in globalThis) && key in dom.window) {
		globalThis[key] = dom.window[key];
	}
}
globalThis.matchMedia =
	globalThis.matchMedia ||
	(() => ({
		matches: false,
		addListener() {},
		removeListener() {},
		addEventListener() {},
		removeEventListener() {},
	}));

const { parse, getBlockType, validateBlock } = require("@wordpress/blocks");
const { registerCoreBlocks } = require("@wordpress/block-library");

registerCoreBlocks();

// Rendered theme patterns and the names of every registered pattern, read
// through WP-CLI so the PHP runs. Returns null when no site answers.
function fetchPatterns() {
	const php =
		"$out = array( 'patterns' => array(), 'names' => array() );" +
		"foreach ( WP_Block_Patterns_Registry::get_instance()->get_all_registered() as $p ) {" +
		"  $out['names'][] = $p['name'];" +
		`  if ( 0 === strpos( $p['name'], '${textDomain}/' ) ) { $out['patterns'][ $p['name'] ] = $p['content']; }` +
		"}" +
		"$out['patterns'] = (object) $out['patterns'];" +
		"echo wp_json_encode( $out );";
	let out;
	try {
		out = execFileSync(path.join(root, "bin", "wp.sh"), ["eval", php], {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
			timeout: 120000,
		});
	} catch {
		console.error("Patterns skipped: bin/wp.sh could not reach a site.");
		return null;
	}
	try {
		return JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
	} catch {
		console.error("Patterns skipped: WP-CLI returned no pattern data.");
		return null;
	}
}

function patternSlug(file) {
	const match = fs.readFileSync(file, "utf8").match(/^\s*\*?\s*Slug:\s*(\S+)/m);
	return match ? match[1] : null;
}

// Collect the documents to validate.
const docs = [];
let registered = null;

if (fromArg) {
	const data = JSON.parse(fs.readFileSync(fromArg.slice("--from=".length), "utf8"));
	for (const [name, content] of Object.entries(data)) {
		docs.push({ name, content });
	}
	// Pattern references in a --from document are checked against the site
	// when one answers.
	const fetched = fetchPatterns();
	registered = fetched ? new Set(fetched.names) : null;
} else {
	const wantedPatterns = new Set();
	const htmlFiles = [];

	if (fileArgs.length) {
		for (const file of fileArgs) {
			if (file.endsWith(".php")) {
				const slug = patternSlug(path.resolve(root, file));
				if (slug) {
					wantedPatterns.add(slug);
				} else {
					console.error(`${file}: no Slug: header, skipped.`);
				}
			} else {
				htmlFiles.push(file);
			}
		}
	} else {
		for (const dir of ["templates", "parts"]) {
			for (const file of fs.readdirSync(path.join(root, dir))) {
				if (file.endsWith(".html")) {
					htmlFiles.push(path.join(dir, file));
				}
			}
		}
	}

	// Fetched even when only HTML files are named, so their wp:pattern
	// references can be checked against the registry.
	const fetched = fetchPatterns();
	if (fetched && !Object.keys(fetched.patterns).length) {
		console.error(
			`Patterns skipped: no ${textDomain}/ patterns registered. Is the theme active on the site behind bin/wp.sh?`
		);
	} else if (fetched) {
		registered = new Set(fetched.names);
		for (const [name, content] of Object.entries(fetched.patterns)) {
			if (!fileArgs.length || wantedPatterns.has(name)) {
				docs.push({ name: `pattern ${name}`, content });
			}
		}
		for (const slug of wantedPatterns) {
			if (!(slug in fetched.patterns)) {
				console.error(`pattern ${slug} is not registered (npm run patterns:flush, or bump Version).`);
			}
		}
	}

	for (const file of htmlFiles) {
		docs.push({ name: file, content: fs.readFileSync(path.resolve(root, file), "utf8") });
	}
}

if (!registered) {
	console.error("Pattern slug references not checked: no pattern registry was read.");
}

// Validation detail arrives through console.error/warn with %s/%o
// placeholders; `%o` is the block type object, shown by name. The last two
// substitutions of a failure are the generated and saved markup.
const format = (message, values) => {
	const parts = [...values];
	if (message.startsWith("Block validation failed") && parts.length >= 2) {
		const saved = parts[parts.length - 1];
		const generated = parts[parts.length - 2];
		return `expected: ${generated}\nfound:    ${saved}`;
	}
	return message.replace(/^Block validation: /, "").replace(/%[so]/g, () => {
		const value = parts.shift();
		return value && typeof value === "object" && value.name ? value.name : String(value);
	});
};
let captured = [];
const capture = (...parts) => {
	if (typeof parts[0] === "string" && parts[0].startsWith("Block validation")) {
		captured.push(format(parts[0], parts.slice(1)));
	}
};
const original = {
	error: console.error,
	warn: console.warn,
	info: console.info,
	log: console.log,
};
console.error = capture;
console.warn = capture;
console.info = () => {};
console.log = () => {};

let problems = 0;
let skipped = 0;
let checked = 0;

function report(doc, label, verdict, detail) {
	problems++;
	const body = detail
		? "\n" +
			detail
				.replace(/[ \t]+/g, " ")
				.split("\n")
				.map((line) => `    ${line}`)
				.join("\n")
				.slice(0, 1200)
		: "";
	original.error(`\n✖ ${doc.name}\n  ${label}: ${verdict}${body}`);
}

function checkReferences(block, doc, label) {
	if (block.name === "core/pattern" && registered) {
		const slug = block.attributes.slug;
		if (slug && !registered.has(slug)) {
			report(doc, label, `pattern "${slug}" is not registered`);
		}
	}
	if (block.name === "core/template-part") {
		const slug = block.attributes.slug;
		if (slug && !fs.existsSync(path.join(root, "parts", `${slug}.html`))) {
			report(doc, label, `template part "${slug}" has no parts/${slug}.html`);
		}
	}
}

function walk(blocks, doc, trail) {
	for (const block of blocks) {
		checked++;
		// parse() turns an unregistered name into core/missing, which is
		// registered and "valid", so a misspelt name would otherwise pass.
		const missing = block.name === "core/missing";
		const name = missing ? block.attributes.originalName : block.name;
		const label = [...trail, name].join(" > ");
		const blockType = missing ? null : getBlockType(name);
		if (!blockType) {
			if (allowed.has(String(name).split("/")[0])) {
				skipped++;
			} else {
				report(doc, label, "unknown block type");
			}
		} else if (block.isValid === false) {
			report(doc, label, "invalid — would enter recovery mode", captured.join("\n"));
		} else if (block.originalContent !== undefined) {
			// isValid is also true for a deprecation match. Re-validate against
			// the current save(): a mismatch means the editor will rewrite it.
			const [current, log] = validateBlock(block, blockType);
			if (!current) {
				report(
					doc,
					label,
					"matches only a deprecated save format — the editor will rewrite it",
					log.map((item) => format(item.args[0], item.args.slice(1))).join("\n")
				);
			}
		}
		checkReferences(block, doc, label);
		captured = [];
		walk(block.innerBlocks, doc, [...trail, name]);
	}
}

for (const doc of docs) {
	captured = [];
	walk(parse(doc.content), doc, []);
}

console.error = original.error;
console.warn = original.warn;
console.info = original.info;
console.log = original.log;

console.log(`\nChecked ${checked} blocks across ${docs.length} documents.`);
if (skipped) {
	console.log(
		`${skipped} block(s) from allowed plugin namespaces skipped (their own markup is not compared).`
	);
}
if (problems) {
	console.log(`${problems} problem(s).`);
	process.exit(1);
}
console.log("All blocks valid.");
