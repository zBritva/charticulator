import { LocaleNumberFormat } from "./data_types";

export function getTableName(fileName: string) {
  return fileName.replace(/\W/g, "_");
}

export function getDataSourceType(content: string): ContentType {
  if (content.trim().startsWith('[') && content.trim().endsWith(']')) {
    return 'json';
  } else {
    return 'csv';
  }
}

export type ContentType = "json" | "csv"

export interface LocaleFileFormat {
    delimiter?: string;
    numberFormat: LocaleNumberFormat;
    currency: string;
    group: string;
    utcTimeZone: boolean;
    billionsFormat: "giga" | "billions";
  }