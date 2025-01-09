import { expect, Page } from '@playwright/test';

export async function clickOnAppButton(page) {
    const appbutton = await page.getByTestId('appbutton');
    await appbutton.click();
}

export async function loadChart(page: Page, file: string) {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByTestId('appbutton').click();
    await page.getByTestId('fileOpenButton').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(file);
}