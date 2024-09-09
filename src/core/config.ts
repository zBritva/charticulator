/**
 * @ignore
 * @packageDocumentation
 * @preferred
 */

export type BillionsFormat = "giga" | "billions";

export interface LocalizationConfig {
  currency: string;
  thousandsDelimiter: string;
  decimalDelimiter: string;
  billionsFormat: BillionsFormat;
  grouping?: [number];
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
export interface CharticulatorCoreConfig {
  MapService?: {
    provider: string;
    apiKey: string;
  };
  localization: LocalizationConfig;
}

let config: CharticulatorCoreConfig;

export function setConfig(_?: CharticulatorCoreConfig) {
  if (_ == null) {
    config = {
      localization: {
        currency: "$",
        thousandsDelimiter: ",",
        decimalDelimiter: ".",
        billionsFormat: "billions",
      },
    };
  } else {
    config = _;
  }
}

export function getConfig(): CharticulatorCoreConfig {
  return config;
}
