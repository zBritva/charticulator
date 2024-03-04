import { test, expect } from '@playwright/test';
import * as path from "path";
import { expectShapesCount, loadChart, pathPrefix } from './utils';

test('has title Charticulator', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Charticulator/);
});

test('opens file view', async ({ page }) => {
  await page.goto('/');

  // Click the get started link.
  let appbutton = await page.getByTestId('appbutton');

  // Expects page to have a heading with the name of Installation.
  await expect(appbutton).toBeVisible();

  await appbutton.click();

  let fileViewTabs = await page.getByTestId('file-view-tabs');

  await expect(fileViewTabs).toBeVisible();
});

test('open mushrooms', async ({ page }) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/mushrooms.chart`;
  await loadChart(page, chartFilePath);
  await expectShapesCount(page, 412);
});

test('open bubble_chart', async ({ page }) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/bubble_chart.chart`;
  await loadChart(page, chartFilePath);
  await expectShapesCount(page, 148);
});

test('open bump_chart', async ({ page }) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/bump_chart.chart`;
  await loadChart(page, chartFilePath);
  await expectShapesCount(page, 812);
});

test('open nightingale', async ({ page }) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/nightingale.chart`;
  await loadChart(page, chartFilePath);
  await expectShapesCount(page, 84);
});

test('open 200_Mushrooms', async ({ page }) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/200_Mushrooms.chart`;
  await loadChart(page, chartFilePath);
  await expectShapesCount(page, 344);
});

test('open World_Population_2017', async ({ page }) => {
  await page.goto('/');
  const chartFilePath = `${pathPrefix}/World_Population_2017.chart`;
  await loadChart(page, chartFilePath);
  await expectShapesCount(page, 98);
});