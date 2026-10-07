#!/usr/bin/env node
'use strict';

/**
 * PostToolUse hook: validates block markup after edits to a block theme's
 * templates/, parts/, or patterns/ files.
 *
 * Runs the project's bin/validate-blocks.js (installed by /wp-theme-init or
 * /wp-setup) on the edited file. Templates and parts validate from disk;
 * patterns need WordPress to render the PHP, which the validator reaches
 * through WP-CLI and skips with a note when none is available.
 *
 * When a block would enter recovery mode, or matches a deprecated save format
 * the editor would rewrite, prints a PostToolUse JSON object with
 * `additionalContext` so the expected/found markup is fed back to Claude.
 * Always exits 0 — this hook surfaces findings, it never blocks.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const VALIDATOR = path.join('bin', 'validate-blocks.js');
const THEME_DIRS = /(^|\/)(templates|parts|patterns)\/[^/]+\.(html|php)$/;

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
		process.stderr.write('[wp-validate-blocks] hook error: ' + e.message + '\n');
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

	if (!filePath || !THEME_DIRS.test(filePath)) {
		return;
	}

	const cwd = input.cwd || process.cwd();
	const validator = path.join(cwd, VALIDATOR);

	if (!fs.existsSync(validator)) {
		process.stderr.write(
			'[wp-validate-blocks] bin/validate-blocks.js not found — skipping (run /wp-setup to install)\n'
		);
		return;
	}

	const relative = path.isAbsolute(filePath) ? path.relative(cwd, filePath) : filePath;

	let output;
	try {
		execFileSync(process.execPath, [validator, relative], {
			cwd,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
			timeout: 110000,
		});
		return; // Exit code 0 — every block valid.
	} catch (e) {
		output = ((e.stdout || '') + (e.stderr || '')).trim();
		if (!output) {
			process.stderr.write('[wp-validate-blocks] validator failed: ' + e.message + '\n');
			return;
		}
	}

	emitAdditionalContext(
		'[wp-validate-blocks] Block markup problems in ' +
			relative +
			':\n' +
			output +
			'\n' +
			'Match each wrapper element and class list to what the block\'s save() produces, then re-run node bin/validate-blocks.js ' +
			relative +
			'.'
	);
}
