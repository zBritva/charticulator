import { test, expect, Page } from '@playwright/test';

export const pathPrefix = "./src/tests/unit/charts";

export async function expectShapesCount(page: Page, toBe: number) {
    await page.waitForSelector('.element-shape');
    let shapes = await page.$$('.element-shape');
    expect(shapes.length).toBeGreaterThanOrEqual(toBe);
}

export async function takeScreenshot(testInfo, page) {
    // Get a unique place for the screenshot.
    const screenshotPath = testInfo.outputPath(`page.png`);
    // Add it to the report
    testInfo.attachments.push({ name: 'screenshot', path: screenshotPath, contentType: 'image/png' });
    // Take the screenshot itself.
    await page.screenshot({ path: screenshotPath, timeout: 5000 });
  }
  