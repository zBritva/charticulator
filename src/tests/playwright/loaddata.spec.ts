// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { test, expect } from '@playwright/test';
import * as path from "path";
import { expectShapesCount, pathPrefix, takeScreenshot } from './utils';
import { clickOnAppButton, loadChart } from './actions';

declare var Charticulator

test('has title Charticulator Test', async ({ page }, testInfo) => {
  await page.goto('/playwright');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Charticulator Test/);

  const result = await page.evaluate(datasetname => {
    debugger;
    Charticulator.loadSampleData(datasetname);
  }, "datasetname");

  await takeScreenshot(testInfo, page);
});
