import { LocaleNumberFormat } from "./data_types";

export function getTableName(fileName: string) {
  return fileName.replace(/\W/g, "_");
}

export interface LocaleFileFormat {
    delimiter: string;
    numberFormat: LocaleNumberFormat;
    currency: string;
    group: string;
    utcTimeZone: boolean;
    billionsFormat: "giga" | "billions";
  }