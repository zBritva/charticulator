import { test, expect } from '@playwright/test';
import * as path from "path";
import { expectShapesCount, pathPrefix, takeScreenshot } from './utils';

import { clickOnAppButton } from "./actions";

test('Opens dataset', async ({ page }, testInfo) => {
    await page.goto('/');

    await clickOnAppButton(page);
  
    const fileViewTabs = await page.getByTestId('file-view-tabs');
    const datasets = fileViewTabs.getByTestId('file-view-tabs-datasets');

    await datasets.click();
    const datasetList = await page.getByTestId('dataset-list');
    const bostonDataset = await datasetList.getByTestId('dataset-list-1');
    await bostonDataset.click();
    const dateColumn = await page.getByTestId('dataset-view-column-DATE');

    expect(dateColumn).toBeVisible();

    await takeScreenshot(testInfo, page);
});

