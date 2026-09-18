#!/usr/bin/env node
'use strict';

/**
 * PostToolUse hook: warns on common WordPress security anti-patterns.
 *
 * Scans the edited file for patterns that require manual review. When any
 * are found, prints a PostToolUse JSON object with `additionalContext` to
 * stdout so the warnings are fed back to Claude as context (exit 0 =
 * non-blocking). Always exits 0 — warnings only, never blocks.
 */

const fs = require('fs');

// additionalContext is capped at 10,000 characters by Claude Code.
const MAX_CONTEXT_LENGTH = 9000;

const PATTERNS = [
	{
		re: /echo\s+\$(?!_POST|_GET|_REQUEST|_COOKIE)/,
		msg: 'Possible unescaped output: `echo $var` — wrap with esc_html(), esc_attr(), esc_url(), etc.',
	},
	{
		re: /\$_(?:GET|POST|REQUEST|COOKIE)\s*\[/,
		msg: 'Direct superglobal access — must call wp_unslash() then a sanitize_*() function before use.',
	},
	{
		re: /\$wpdb->(?:query|get_results|get_row|get_var|get_col)\s*\(\s*["'`]/,
		msg: 'Raw string passed to $wpdb query — use $wpdb->prepare() for any dynamic values.',
	},
	{
		re: /'__return_true'\s*[,)]/,
		msg: '`__return_true` as permission_callback — verify this endpoint should be fully public.',
	},
	{
		// \b prevents matching inside longer identifiers, e.g. `add(` or `add_action(`
		// must not trip the `dd` alternative, and `wp_dump(` must not trip `dump`.
		re: /\b(?:var_dump|print_r|error_log|dd|dump)\s*\(/,
		msg: 'Debug output left in file — remove before committing.',
	},
	{
		// Lookbehind ensures bare `die(` matches but `wp_die(` (and any
		// `*_die(` / `*die(` identifier) does not. Whitespace lives inside
		// the lookahead so `die( esc_html(...) )` cannot match via backtracking.
		re: /(?<![A-Za-z0-9_])die\s*\((?!\s*esc_)/,
		msg: '`die()` without escaped output — use wp_die() for WordPress context.',
	},
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
		process.stderr.write('[wp-security] hook error: ' + e.message + '\n');
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

	if (!filePath || !filePath.endsWith('.php')) {
		return;
	}

	// Skip test files
	if (filePath.includes('/tests/') || filePath.includes('/test-')) {
		return;
	}

	let content;
	try {
		content = fs.readFileSync(filePath, 'utf8');
	} catch {
		return;
	}

	const warnings = [];
	for (const { re, msg } of PATTERNS) {
		if (re.test(content)) {
			warnings.push('- ' + msg);
		}
	}

	if (warnings.length > 0) {
		emitAdditionalContext(
			'[wp-security] Review warnings in ' +
				filePath +
				':\n' +
				warnings.join('\n') +
				'\n' +
				'Review each warning in the file you just edited — fix real issues, or note why the pattern is safe here.'
		);
	}
}
