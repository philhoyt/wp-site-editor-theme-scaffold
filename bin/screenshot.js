#!/usr/bin/env node
/* eslint-disable no-console -- CLI progress for npm run screenshot */
/**
 * Captures a 1200x900 screenshot of the local WordPress site and saves it as screenshot.png.
 *
 * Usage:
 *   npm run screenshot
 *   npm run screenshot -- https://my-site.local
 */

const puppeteer = require("puppeteer");
const path = require("path");

const url = process.argv[2] || "http://localhost:8888";
const output = path.resolve(__dirname, "..", "screenshot.png");

(async () => {
	console.log(`Capturing screenshot of ${url}...`);

	const browser = await puppeteer.launch();
	const page = await browser.newPage();

	await page.setViewport({ width: 1200, height: 900 });
	await page.goto(url, { waitUntil: "networkidle2" });
	await page.screenshot({ path: output });

	await browser.close();

	console.log(`Screenshot saved to screenshot.png`);
})();
