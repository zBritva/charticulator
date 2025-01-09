import { test, expect } from '@playwright/test';
import * as path from "path";
import { expectShapesCount, pathPrefix, takeScreenshot } from './utils';
import { clickOnAppButton, loadChart } from './actions';

test('has title Charticulator', async ({ page }, testInfo) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Charticulator/);

  await takeScreenshot(testInfo, page);
});

test('opens file view', async ({ page }, testInfo) => {
  await page.goto('/');

  await clickOnAppButton(page);

  let fileViewTabs = await page.getByTestId('file-view-tabs');

  await takeScreenshot(testInfo, page);

  await expect(fileViewTabs).toBeVisible();
});

test('open mushrooms', async ({ page }, testInfo) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/mushrooms.chart`;
  await loadChart(page, chartFilePath);

  await takeScreenshot(testInfo, page);
  await expectShapesCount(page, 412);
});

test('open bubble_chart', async ({ page }, testInfo) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/bubble_chart.chart`;
  await loadChart(page, chartFilePath);

  await takeScreenshot(testInfo, page);
  await expectShapesCount(page, 148);
});

test('open bump_chart', async ({ page }, testInfo) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/bump_chart.chart`;
  await loadChart(page, chartFilePath);

  await takeScreenshot(testInfo, page);
  await expectShapesCount(page, 812);
});

test('open nightingale', async ({ page }, testInfo) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/nightingale.chart`;
  await loadChart(page, chartFilePath);

  await takeScreenshot(testInfo, page);
  await expectShapesCount(page, 84);
});

test('open 200_Mushrooms', async ({ page }, testInfo) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/200_Mushrooms.chart`;
  await loadChart(page, chartFilePath);

  await takeScreenshot(testInfo, page);
  await expectShapesCount(page, 344);
});

test('open World_Population_2017', async ({ page }, testInfo) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/World_Population_2017.chart`;
  await loadChart(page, chartFilePath);

  await takeScreenshot(testInfo, page);
  await expectShapesCount(page, 94);
});