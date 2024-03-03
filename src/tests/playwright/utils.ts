import { test, expect, Page } from '@playwright/test';

export const pathPrefix = "./src/tests/unit/charts";

export async function loadChart(page: Page, file: string) {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('appbutton').click();
    await page.getByTestId('fileOpenButton').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);
}


export async function expectShapesCount(page: Page, toBe: number) {
    await page.waitForSelector('.element-shape');
    let shapes = await page.$$('.element-shape');
    expect(shapes.length).toBeGreaterThanOrEqual(toBe);
}
