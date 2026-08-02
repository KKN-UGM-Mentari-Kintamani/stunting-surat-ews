/* worker/src/renderer.ts
 * Puppeteer-core renderer — one reusable browser instance (PRD §5.1: reuse
 * browser, don't launch() per request), system Chromium, memory-saving flags.
 * Explicit 15s timeout per render.
 */
import puppeteer, { type Browser } from 'puppeteer-core';

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser && browser.connected) return browser;
  const executablePath = process.env.CHROMIUM_EXECUTABLE_PATH;
  if (!executablePath) {
    throw new Error('Missing CHROMIUM_EXECUTABLE_PATH');
  }
  browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--single-process',
    ],
  });
  return browser;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 10_000 });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
      timeout: 15_000,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}

/** Graceful shutdown for SIGTERM/SIGINT. */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}
