// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { dsvFormat } from "d3-dsv";

import { inferAndConvertColumn, LocaleNumberFormat } from "./data_types";
import {
  Row,
  Table,
  rawColumnPostFix,
  DataValue,
  DataType,
  ColumnMetadata,
  TableType,
  Column,
} from "./dataset";
import { deepClone } from "../common";
import { getTableName, LocaleFileFormat } from "./utils";


export function parseDataset(
    fileName: string,
    content: string,
    localeFileFormat: LocaleFileFormat
  ): Table {

    const parsed = JSON.parse(content);

    if (typeof parsed !== "object" && parsed instanceof Array && parsed[0] != null && typeof parsed[0] !== "object") {
      return null;
    }

    const array = parsed as Array<Record<string, string>>;

    const keys = Object.keys(array[0]);

    let columnValues = keys.map((name, index) => {
      const values = array.map((row) => row[index]);
      return inferAndConvertColumn(values, localeFileFormat);
    });

    const columns = columnValues.map((x, i) => ({
      name: keys[i],
      displayName: keys[i],
      type: x.type,
      metadata: x.metadata,
    }));

    const outRows = array.map((row, rindex) => {
      const out: Row = { _id: rindex.toString() };
      columnValues.forEach((column, cindex) => {
        out[keys[cindex]] = columnValues[cindex].values[rindex];
        if (columnValues[cindex].rawValues) {
          out[keys[cindex] + rawColumnPostFix] =
            columnValues[cindex].rawValues[rindex];
          if (!keys.find((h) => h === keys[cindex] + rawColumnPostFix)) {
            keys.push(keys[cindex] + rawColumnPostFix);
          }
        }
      });
      return out;
    });

    const tableName = getTableName(fileName)
    return {
        name: tableName,
        displayName: tableName,
        columns,
        rows: outRows,
        type: TableType.Main,
    }
}