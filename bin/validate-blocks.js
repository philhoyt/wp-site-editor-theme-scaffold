#!/usr/bin/env node
/* eslint-disable no-console -- CLI report for npm run validate:blocks */
/**
 * Validates the block markup in patterns, templates and parts the way the
 * editor does, so hand-written serialised HTML that would drop a block into
 * recovery mode is caught before it ships.
 *
 * Patterns are PHP, so their rendered content is read from WordPress through
 * WP-CLI (bin/wp.sh); templates and parts are read from disk. If bin/wp.sh
 * cannot reach a site the patterns are skipped with a warning and the run
 * continues with the on-disk documents. Each document is run through the
 * parse() function from @wordpress/blocks, which registers the core blocks
 * and compares the saved markup against what each block's save() would produce.
 *
 * Usage:
 *   npm run validate:blocks
 *   npm run validate:blocks -- --from=/path/documents.json   # {"name": "block markup", ...}
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { JSDOM, VirtualConsole } = require("jsdom");

const root = path.resolve(__dirname, "..");

// Patterns are registered under the theme's text domain (`wpsets/…`); read it
// from style.css so the script does not need editing in a derived theme.
const textDomain = (fs
	.readFileSync(path.join(root, "style.css"), "utf8")
	.match(/^Text Domain:\s*(\S+)/m) || [])[1];
if (!textDomain) {
	console.error("Could not read Text Domain from style.css.");
	process.exit(1);
}

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

const { parse, getBlockType } = require("@wordpress/blocks");
const { registerCoreBlocks } = require("@wordpress/block-library");

registerCoreBlocks();

// Collect the documents to validate.
const docs = [];
const fromArg = process.argv.find((arg) => arg.startsWith("--from="));

if (fromArg) {
	const data = JSON.parse(fs.readFileSync(fromArg.slice(7), "utf8"));
	for (const [name, content] of Object.entries(data)) {
		docs.push({ name, content });
	}
}

let patternsJson = "{}";
if (!fromArg) {
	try {
		patternsJson = execFileSync(
			path.join(root, "bin", "wp.sh"),
			[
				"eval",
				`$out = array(); foreach ( WP_Block_Patterns_Registry::get_instance()->get_all_registered() as $p ) { if ( 0 === strpos( $p["name"], "${textDomain}/" ) ) { $out[ $p["name"] ] = $p["content"]; } } echo wp_json_encode( $out );`,
			],
			{ encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
		);
	} catch {
		// No site behind bin/wp.sh (the scaffold itself has none). Templates and
		// parts can still be checked from disk.
		console.error("Patterns skipped: bin/wp.sh could not reach a site.");
	}
}
const patterns = JSON.parse(patternsJson.slice(patternsJson.indexOf("{")));
for (const [name, content] of Object.entries(patterns)) {
	docs.push({ name: `pattern ${name}`, content });
}
for (const dir of fromArg ? [] : ["templates", "parts"]) {
	for (const file of fs.readdirSync(path.join(root, dir))) {
		if (file.endsWith(".html")) {
			docs.push({
				name: `${dir}/${file}`,
				content: fs.readFileSync(path.join(root, dir, file), "utf8"),
			});
		}
	}
}

// parse() reports validation detail through console.error/warn; capture it.
let captured = [];
const origError = console.error;
const origWarn = console.warn;
// The validation logger calls console.error( format, ...args ) with %s/%o
// placeholders; the last two substitutions are the generated and saved markup.
const capture = (...args) => {
	if (typeof args[0] !== "string" || !args[0].startsWith("Block validation")) {
		return;
	}
	const values = args.slice(1);
	if (args[0].startsWith("Block validation failed")) {
		const name = values[0];
		const generated = values[values.length - 2];
		const saved = values[values.length - 1];
		captured.push(`${name}\n    expected: ${generated}\n    found:    ${saved}`);
		return;
	}
	captured.push(args[0].replace(/%[so]/g, () => String(values.shift())));
};
const origInfo = console.info;
const origLog = console.log;
console.error = capture;
console.warn = capture;
console.info = () => {};
console.log = () => {};

let problems = 0;
let checked = 0;

function walk(blocks, doc, trail) {
	for (const block of blocks) {
		checked++;
		const label = [...trail, block.name].join(" > ");
		if (!getBlockType(block.name)) {
			problems++;
			origError(`\n✖ ${doc.name}\n  ${label}: unknown block type`);
		} else if (block.isValid === false) {
			problems++;
			const detail = captured
				.filter((line) => line.includes(block.name))
				.map(
					(line) =>
						"    " +
						line
							.replace(/\n\s*/g, "\n    ")
							.replace(/[ \t]+/g, " ")
							.slice(0, 900)
				)
				.join("\n");
			origError(`\n✖ ${doc.name}\n  ${label}: invalid — would enter recovery mode\n${detail}`);
		}
		walk(block.innerBlocks, doc, [...trail, block.name]);
	}
}

for (const doc of docs) {
	captured = [];
	const blocks = parse(doc.content);
	walk(blocks, doc, []);
}

console.error = origError;
console.warn = origWarn;
console.info = origInfo;
console.log = origLog;

console.log(`\nChecked ${checked} blocks across ${docs.length} documents.`);
if (problems) {
	console.log(`${problems} invalid block(s).`);
	process.exit(1);
}
console.log("All blocks valid.");
