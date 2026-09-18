#!/usr/bin/env node
'use strict';

/**
 * PostToolUse hook: runs phpcs on edited PHP files.
 *
 * Reads the hook payload as JSON on stdin. When phpcs reports violations,
 * prints a PostToolUse JSON object with `additionalContext` to stdout so
 * the findings are fed back to Claude as context (exit 0 = non-blocking).
 * Always exits 0 — this hook surfaces findings, it never blocks.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

// additionalContext is capped at 10,000 characters by Claude Code.
const MAX_CONTEXT_LENGTH = 9000;

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
		process.stderr.write('[wp-phpcs] hook error: ' + e.message + '\n');
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

	const cwd = input.cwd || process.cwd();
	const phpcs = path.join(cwd, 'vendor', 'bin', 'phpcs');

	if (!fs.existsSync(phpcs)) {
		process.stderr.write(
			'[wp-phpcs] vendor/bin/phpcs not found — skipping lint (run /wp-setup to install)\n'
		);
		return;
	}

	let report;
	try {
		execFileSync(
			phpcs,
			// No --standard: phpcs finds phpcs.xml in cwd, so the project ruleset
			// (text domain, PHPCompatibility, excludes) applies rather than bare WPCS.
			['--report=emacs', filePath],
			{
				cwd,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
			}
		);
		return; // Exit code 0 — no violations found.
	} catch (e) {
		// phpcs exits non-zero when violations are found — report is on stdout.
		report = ((e.stdout || '') + (e.stderr || '')).trim();
		if (!report) {
			process.stderr.write(
				'[wp-phpcs] phpcs failed: ' + e.message + '\n'
			);
			return;
		}
	}

	emitAdditionalContext(
		'[wp-phpcs] WordPress coding standards violations in ' +
			filePath +
			':\n' +
			report +
			'\n' +
			'Fix these in the file you just edited (or run vendor/bin/phpcbf for auto-fixable ones).'
	);
}
