/* eslint-disable */
"use strict";

const path = require("path");
const fs = require("fs");

const tsconfig = require("./tsconfig.test.json");
const webpack = require("./webpack.config.test.js");
const testRecursivePath = "./tests/karma/**/*.ts";
const coreTestsRecursivePath = "./tests/unit/**/*.ts";

const browser = "ChromeHeadless";
const karmaSnapshotsDirectory = `tests/karma/${browser}/__snapshots__/**/*.md`;
const styles = ["../dist/styles/app.css", "../dist/styles/page.css"];

function resolve(basePath, suiteName) {
  return path.join(
    basePath,
    `tests/karma/${browser}/__snapshots__`,
    suiteName + ".md"
  );
}

const pathPrefix = "tests/unit/charts";
const cases = fs.readdirSync("./src/" + pathPrefix).map((testCase) => path.join(pathPrefix, testCase));

process.env.CHROME_BIN = require("puppeteer").executablePath();
const webpackConfig = webpack(webpack, { mode: "development" });

module.exports = (config) => {
  config.set({
    mode: "development",
    browserNoActivityTimeout: 100000,
    browsers: ["ChromeHeadlessNoSandbox"],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: "ChromeHeadless",
        flags: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--headless",
          "--disable-gpu",
          "--remote-debugging-port=9222",
        ],
      },
    },
    colors: true,
    frameworks: ["mocha", "webpack", "snapshot", "mocha-snapshot", "viewport"],
    reporters: ["mocha"],
    singleRun: true,
    autoWatch: true,
    port: 5001,
    plugins: [
      require.resolve("karma-coverage"),
      require.resolve("karma-typescript"),
      require.resolve("karma-mocha"),
      require.resolve("karma-mocha-reporter"),
      require.resolve("karma-sourcemap-loader"),
      require.resolve("karma-chrome-launcher"),
      require.resolve("karma-webpack"),
      require.resolve("karma-snapshot"),
      require.resolve("karma-mocha-snapshot"),
      require.resolve("karma-viewport"),
    ],
    basePath: __dirname + "/src",
    files: [
      {
        pattern: "../dist/scripts/config.json",
        watched: false,
        served: true,
        included: false,
      },
      ...cases.map((cases) => {
        return {
          pattern: cases,
          watched: false,
          served: true,
          included: false,
        };
      }),
      testRecursivePath,
      coreTestsRecursivePath,
      ...styles,
      karmaSnapshotsDirectory,
    ],
    preprocessors: {
      [testRecursivePath]: ["webpack"],
      [coreTestsRecursivePath]: ["webpack"],
      [karmaSnapshotsDirectory]: ["snapshot"],
    },
    snapshot: {
      update: false,
      prune: false,
      checkSourceFile: false,
      pathResolver: resolve,
    },
    viewport: {},
    mochaReporter: {
      showDiff: true,
    },
    client: {
      mocha: {
        reporter: "html",
        ui: "bdd",
      },
    },
    typescriptPreprocessor: {
      ...tsconfig,
      options: tsconfig.compilerOptions,
    },
    mime: {
      "text/x-typescript": ["ts", "tsx"],
    },
    webpack: webpackConfig,
    webpackMiddleware: {
      stats: "errors-only",
    },
  });
};
