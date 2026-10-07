#!/usr/bin/env node
/* eslint-disable no-console -- CLI report for npm run test:smoke */
/**
 * Smoke-tests the theme on a running site: visits the main templates and the
 * smoke-* content from bin/seed-content.php, at a desktop and a phone width,
 * and fails on:
 *
 *   - an unexpected HTTP status;
 *   - a missing theme stylesheet, or one that does not load;
 *   - PHP warnings, notices, deprecations or fatals printed into the page
 *     (the site needs WP_DEBUG_DISPLAY on, as the wp-env sites have);
 *   - browser console errors and uncaught exceptions;
 *   - a page wider than the screen at 375px;
 *   - the content checks below (classic page links, locked comments, page
 *     comments, no list directly inside a list in the navigation).
 *
 * Usage:
 *   npm run test:smoke                          # http://localhost:8888 (wp-env)
 *   npm run test:smoke -- https://wp-sets.local # another site, seeded first
 */

const puppeteer = require("puppeteer");

const BASE = (
	process.argv.slice(2).find((arg) => !arg.startsWith("--")) || "http://localhost:8888"
).replace(/\/$/, "");

// Query-string URLs work under any permalink structure.
const PAGES = [
	{ name: "home", path: "/" },
	{ name: "single", path: "/?name=sleep-important-say-experts" },
	{ name: "page", path: "/?pagename=about" },
	{ name: "archive", path: "/?category_name=notes" },
	{ name: "search", path: "/?s=sleep" },
	{ name: "404", path: "/?name=this-page-does-not-exist", status: 404 },
	{
		name: "classic page links",
		path: "/?name=smoke-paged",
		check: (doc) =>
			!!doc.querySelector(".post-nav-links a") || "no page links under a <!--nextpage--> post",
	},
	{
		name: "locked post",
		path: "/?name=smoke-locked",
		check: (doc) =>
			!doc.querySelector(".wp-block-comments") || "comments block shown on a password-protected post",
	},
	{
		name: "page comments",
		path: "/?pagename=smoke-page-comments",
		check: (doc) =>
			!!doc.querySelector(".wp-block-comments .wp-block-comment-template") ||
			"no comments on a page with comments open",
	},
	{ name: "classic content", path: "/?name=smoke-classic" },
];

const VIEWPORTS = [
	{ name: "desktop", width: 1280, height: 900 },
	{ name: "phone", width: 375, height: 812 },
];

const PHP_NOTICE =
	/(Warning|Notice|Deprecated|Fatal error|Parse error): .+ in \/\S+\.php on line \d+/;

// Page-level checks every template must pass. Runs in the browser.
function inspect() {
	const problems = [];
	const style = document.querySelector("link#wpsets-style-css");
	if (!style) {
		problems.push("theme stylesheet (wpsets-style-css) not enqueued");
	}
	for (const nav of document.querySelectorAll(".wp-block-navigation")) {
		if (nav.querySelector("ul > ul")) {
			problems.push("a <ul> directly inside a <ul> in the navigation");
		}
	}
	if (document.documentElement.scrollWidth > window.innerWidth) {
		problems.push(
			`page is ${document.documentElement.scrollWidth}px wide in a ${window.innerWidth}px viewport`
		);
	}
	return { problems, text: document.body.innerText, stylesheet: style ? style.href : null };
}

(async () => {
	const browser = await puppeteer.launch({
		args: process.env.CI ? ["--no-sandbox", "--disable-setuid-sandbox"] : [],
	});
	const page = await browser.newPage();
	const failures = [];
	const stylesheets = new Set();

	for (const viewport of VIEWPORTS) {
		await page.setViewport({ width: viewport.width, height: viewport.height });
		for (const test of PAGES) {
			const label = `${test.name} (${viewport.name})`;
			const errors = [];
			const onConsole = (message) => {
				if (message.type() !== "error") {
					return;
				}
				const text = message.text();
				// A 404 template logs its own document request as a failed resource.
				if (test.status === 404 && /status of 404/.test(text)) {
					return;
				}
				errors.push(text);
			};
			const onPageError = (error) => errors.push(`uncaught: ${error.message}`);
			page.on("console", onConsole);
			page.on("pageerror", onPageError);

			let response;
			try {
				response = await page.goto(BASE + test.path, { waitUntil: "networkidle2", timeout: 60000 });
			} catch (error) {
				failures.push(`${label}: ${error.message}`);
				page.off("console", onConsole);
				page.off("pageerror", onPageError);
				continue;
			}

			const problems = [];
			const expected = test.status || 200;
			if (!response || response.status() !== expected) {
				problems.push(`HTTP ${response ? response.status() : "no response"}, expected ${expected}`);
			}

			const result = await page.evaluate(inspect);
			problems.push(...result.problems);
			if (result.stylesheet) {
				stylesheets.add(result.stylesheet);
			}
			const notice = result.text.match(PHP_NOTICE);
			if (notice) {
				problems.push(`PHP: ${notice[0]}`);
			}
			if (test.check) {
				const verdict = await page.evaluate(`(${test.check})(document)`);
				if (verdict !== true) {
					problems.push(verdict);
				}
			}
			if (errors.length) {
				problems.push(`console: ${errors.join(" | ")}`);
			}

			page.off("console", onConsole);
			page.off("pageerror", onPageError);

			console.log(`${problems.length ? "✖" : "✔"} ${label}`);
			for (const problem of problems) {
				failures.push(`${label}: ${problem}`);
				console.log(`    ${problem}`);
			}
		}
	}

	// The stylesheet must load, not only be linked.
	for (const href of stylesheets) {
		const response = await fetch(href);
		const body = response.ok ? await response.text() : "";
		if (!response.ok || !body.length) {
			failures.push(`stylesheet ${href}: HTTP ${response.status}, ${body.length} bytes`);
		}
	}

	await browser.close();

	if (failures.length) {
		console.log(`\n${failures.length} problem(s) on ${BASE}.`);
		process.exit(1);
	}
	console.log(`\nAll ${PAGES.length * VIEWPORTS.length} checks passed on ${BASE}.`);
})();
