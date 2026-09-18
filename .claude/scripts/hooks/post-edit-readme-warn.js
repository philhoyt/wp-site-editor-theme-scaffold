#!/usr/bin/env node
'use strict';

/**
 * PostToolUse hook: flags marketing and generated-sounding prose in plugin copy.
 *
 * Fires on readme.txt, README.md, CHANGELOG.md, changelog.txt, and block.json
 * (title, description, and variation titles/descriptions). Reports banned
 * words, intensifiers, throat-clearing openers, mechanical contrasts, and
 * the em dash character, each with its line number or key path, as a
 * PostToolUse `additionalContext` block. The full rules live in the
 * wp-readme-rules skill at references/prose.md; this hook carries the subset
 * a regex can catch without false positives. Advisory only, always exits 0.
 */

const fs = require('fs');
const path = require('path');

// additionalContext is capped at 10,000 characters by Claude Code.
const MAX_CONTEXT_LENGTH = 9000;

const TARGET_BASENAMES = new Set([
	'readme.txt',
	'readme.md',
	'changelog.md',
	'changelog.txt',
	'block.json',
]);

// Word lists as plain strings with exact spelling: the rule-drift canary in
// check-plugin.sh pins the first banned word and the look-no-further opener
// here and in skills/wp-readme-rules/references/prose.md so the lists stay in step.
// Left out on purpose: navigate, harness, landscape, unlock — each has an
// ordinary technical meaning ("Navigate to Settings", "test harness",
// "landscape orientation", "unlock the post"). prose.md covers them.
const BANNED_WORDS = [
	'seamlessly',
	'robust',
	'leverage',
	'elevate',
	'powerful',
	'cutting-edge',
	'game-changing',
	'game-changer',
	'intuitive',
	'dive into',
	'delve into',
	'revolutionize',
	'streamline',
	'effortlessly',
	'unpack',
	'lean into',
	'deep dive',
	'double down',
	'empower',
	'supercharge',
	'next-level',
	'best-in-class',
	'world-class',
	'blazing-fast',
	'hassle-free',
	'all-in-one',
	'ultimate',
];

// "simply" and "highly" appear in ordinary install copy; prose.md lists them,
// the hook does not.
const INTENSIFIERS = [
	'really',
	'truly',
	'genuinely',
	'incredibly',
	'extremely',
];

const OPENERS = [
	"Here's the thing",
	"It's worth noting",
	'The truth is',
	'Look no further',
	'Say goodbye to',
	'Say hello to',
	'Introducing',
];

// Build a case-insensitive alternation; spaces match any whitespace and a
// straight apostrophe also matches the curly one.
function alternation(words) {
	return words
		.map((w) =>
			w
				.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
				.replace(/ /g, '\\s+')
				.replace(/'/g, "['\u2019]")
		)
		.join('|');
}

// No `g` flag anywhere: a `g` regex used with exec()/test() keeps lastIndex
// between calls and would silently skip alternate lines.
const PATTERNS = [
	{
		re: new RegExp('\\b(?:' + alternation(BANNED_WORDS) + ')\\b', 'i'),
		msg: 'marketing word',
	},
	{
		re: new RegExp('\\b(?:' + alternation(INTENSIFIERS) + ')\\b', 'i'),
		msg: 'intensifier adds nothing',
	},
	// Openers count only at the start of a line, after an optional bullet,
	// heading, list number, or readme.txt `= heading =` prefix.
	{
		re: new RegExp(
			'^\\s*(?:[-*]\\s+|#+\\s+|\\d+\\.\\s+|=+\\s*)?(?:' +
				alternation(OPENERS) +
				')\\b',
			'i'
		),
		msg: 'throat-clearing opener',
	},
	{ re: /\bwhether you['\u2019]re\b/i, msg: 'throat-clearing opener' },
	// Sentence-start only: "not just the first page but all pages" mid-sentence is a fact.
	{
		re: /^\s*(?:[-*]\s+)?not just\b[^.]*\bbut\b/i,
		msg: '"not just X but Y" contrast',
	},
	{
		re: /\bisn['\u2019]t (?:just )?(?:a|an|about)\b[^.]*\bit['\u2019]s\b/i,
		msg: '"isn\'t X, it\'s Y" contrast',
	},
	{ re: /\u2014/, msg: 'em dash (use -- or rewrite)' },
];

let raw = '';
let done = false;
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
	raw += chunk;
});
process.stdin.on('end', finish);
// Never hang the session: if the payload is never delivered or never closed
// (seen on Windows when a shell wrapper swallows stdin), process whatever
// arrived after 1 s. unref() keeps the timer from adding latency on the
// normal path, where 'end' fires first.
process.stdin.on('error', finish);
setTimeout(finish, 1000).unref();

function finish() {
	if (done) {
		return;
	}
	done = true;
	try {
		// Strip a UTF-8 BOM some shells prepend when piping (breaks JSON.parse).
		run(raw.replace(/^\uFEFF/, ''));
	} catch (e) {
		process.stderr.write('[wp-prose] hook error: ' + e.message + '\n');
	}
	process.exit(0);
}

function emitAdditionalContext(message) {
	const context =
		message.length > MAX_CONTEXT_LENGTH
			? message.slice(0, MAX_CONTEXT_LENGTH) + '\n… (output truncated)'
			: message;
	process.stdout.write(
		JSON.stringify({
			hookSpecificOutput: {
				hookEventName: 'PostToolUse',
				additionalContext: context,
			},
		}) + '\n'
	);
}

function run(payload) {
	const input = JSON.parse(payload);
	const filePath = input.tool_input?.file_path || input.tool_input?.path;
	if (!filePath) {
		return;
	}

	const base = path.basename(filePath).toLowerCase();
	if (!TARGET_BASENAMES.has(base)) {
		return;
	}

	// Skip generated/vendor copies
	if (/\/(build|vendor|node_modules)\//.test(filePath)) {
		return;
	}

	let content;
	try {
		content = fs.readFileSync(filePath, 'utf8');
	} catch {
		return;
	}

	const findings =
		base === 'block.json' ? scanBlockJson(content) : scanText(content);
	if (findings.length === 0) {
		return;
	}

	emitAdditionalContext(
		'[wp-prose] Plain-English issues in ' +
			filePath +
			':\n' +
			findings.map((f) => '- ' + f).join('\n') +
			'\n' +
			'Rewrite each flagged line per wp-readme-rules/references/prose.md; leave any that quote a product name or heading verbatim.'
	);
}

function check(text) {
	const hits = [];
	for (const { re, msg } of PATTERNS) {
		const m = re.exec(text);
		if (m) {
			hits.push(msg + ' ("' + m[0].trim() + '")');
		}
	}
	return hits;
}

function scanText(content) {
	const findings = [];
	let inFence = false;
	content.split(/\r?\n/).forEach((line, i) => {
		if (/^\s*```/.test(line)) {
			inFence = !inFence;
			return;
		}
		if (inFence) {
			return;
		}
		for (const hit of check(line)) {
			findings.push('line ' + (i + 1) + ': ' + hit);
		}
	});
	return findings;
}

function scanBlockJson(content) {
	let json;
	try {
		json = JSON.parse(content);
	} catch {
		return []; // not our job to report invalid JSON
	}
	const fields = [
		['title', json.title],
		['description', json.description],
	];
	if (Array.isArray(json.variations)) {
		json.variations.forEach((v, i) => {
			fields.push(['variations[' + i + '].title', v && v.title]);
			fields.push([
				'variations[' + i + '].description',
				v && v.description,
			]);
		});
	}
	const findings = [];
	for (const [key, value] of fields) {
		if (typeof value !== 'string') {
			continue;
		}
		for (const hit of check(value)) {
			findings.push(key + ': ' + hit);
		}
	}
	return findings;
}
