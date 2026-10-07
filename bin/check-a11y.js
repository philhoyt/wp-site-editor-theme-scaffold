#!/usr/bin/env node
/* eslint-disable no-console -- CLI report for npm run check:a11y */
/**
 * Runs axe-core against the main templates of a running site and fails on any
 * WCAG 2.1 A or AA violation, plus axe's best-practice rules (heading order,
 * landmarks), which auditors treat the same way. Each path is checked at a
 * desktop and a phone width; on the phone pass the navigation drawer is
 * opened so it is audited too.
 *
 * Usage:
 *   npm run check:a11y                          # http://localhost:8888 (wp-env)
 *   npm run check:a11y -- https://wp-sets.local # another site
 *   npm run check:a11y -- --paths=/,/about/     # override the path list
 *
 * Paths default to the content from bin/seed-content.php plus the archive,
 * search and 404 templates, as query strings so any permalink structure
 * works. Checks axe cannot decide on its own (contrast over an image, for one)
 * are listed as manual and do not fail the run; they are the list to walk
 * with a keyboard and a screen reader.
 */

const puppeteer = require("puppeteer");

const DEFAULT_PATHS = [
	"/",
	"/?name=sleep-important-say-experts",
	"/?pagename=about",
	"/?pagename=smoke-page-comments",
	"/?name=smoke-classic",
	"/?category_name=notes",
	"/?s=sleep",
	"/?name=this-page-does-not-exist",
];

const VIEWPORTS = [
	{ name: "desktop", width: 1280, height: 900 },
	{ name: "phone", width: 375, height: 812, openMenu: true },
];

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"];

const args = process.argv.slice(2);
const baseUrl = (args.find((a) => !a.startsWith("--")) || "http://localhost:8888").replace(
	/\/$/,
	""
);
const pathsArg = args.find((a) => a.startsWith("--paths="));
const paths = pathsArg ? pathsArg.slice("--paths=".length).split(",") : DEFAULT_PATHS;

const axeSource = require.resolve("axe-core/axe.min.js");

const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };

(async () => {
	console.log(`Checking ${paths.length} paths on ${baseUrl} at ${VIEWPORTS.length} widths...\n`);

	// Ubuntu 24.04 runners block Chrome's unprivileged sandbox; the pages under
	// test are the site's own, so CI runs without it.
	const browser = await puppeteer.launch({ args: process.env.CI ? ["--no-sandbox"] : [] });
	const page = await browser.newPage();

	let violationCount = 0;
	const manual = new Map();

	for (const viewport of VIEWPORTS) {
		await page.setViewport({ width: viewport.width, height: viewport.height });

		for (const p of paths) {
			const url = baseUrl + p;
			let response;
			try {
				response = await page.goto(url, { waitUntil: "networkidle2" });
			} catch (error) {
				console.error(`✗ ${p} (${viewport.name}): ${error.message}`);
				violationCount += 1;
				continue;
			}
			const status = response ? response.status() : 0;
			if (status >= 500) {
				console.error(`✗ ${p} (${viewport.name}): HTTP ${status}`);
				violationCount += 1;
				continue;
			}

			if (viewport.openMenu) {
				const toggle = await page.$(".wp-block-navigation__responsive-container-open");
				if (toggle) {
					await toggle.click();
					await page
						.waitForSelector(".wp-block-navigation__responsive-container.is-menu-open", { timeout: 2000 })
						.catch(() => {});
					// Let the drawer finish sliding in; contrast is measured against what is on screen.
					await page.evaluate(() =>
						Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {})))
					);
				}
			}

			await page.addScriptTag({ path: axeSource });
			const results = await page.evaluate(
				(tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }),
				TAGS
			);

			const label = `${p} (${viewport.name}${status === 404 ? ", 404" : ""})`;

			if (results.violations.length === 0) {
				console.log(`✓ ${label}`);
			} else {
				console.log(`✗ ${label}`);
				results.violations
					.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])
					.forEach((violation) => {
						violationCount += violation.nodes.length;
						console.log(
							`    ${violation.impact}: ${violation.help} [${violation.id}] × ${violation.nodes.length}`
						);
						console.log(`      ${violation.helpUrl}`);
						violation.nodes.slice(0, 3).forEach((node) => {
							const data = node.any[0] && node.any[0].data;
							const detail =
								data && data.contrastRatio
									? ` (${data.fgColor} on ${data.bgColor}, ${data.contrastRatio}:1, needs ${data.expectedContrastRatio})`
									: "";
							console.log(`      ${node.target.join(" ")}${detail}`);
						});
						if (violation.nodes.length > 3) {
							console.log(`      … and ${violation.nodes.length - 3} more`);
						}
					});
			}

			results.incomplete.forEach((check) => {
				const key = `${check.id}: ${check.help}`;
				const targets = manual.get(key) || new Set();
				check.nodes.forEach((node) => targets.add(`${p} ${node.target.join(" ")}`));
				manual.set(key, targets);
			});
		}
	}

	await browser.close();

	if (manual.size) {
		console.log("\nNeeds a manual check (axe could not decide):");
		for (const [key, targets] of manual) {
			console.log(`  ${key}`);
			[...targets].slice(0, 4).forEach((t) => console.log(`    ${t}`));
			if (targets.size > 4) {
				console.log(`    … and ${targets.size - 4} more`);
			}
		}
	}

	if (violationCount) {
		console.error(`\n${violationCount} accessibility violation(s).`);
		process.exit(1);
	}
	console.log("\nNo accessibility violations.");
})();
