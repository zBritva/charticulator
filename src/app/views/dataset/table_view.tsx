/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import jspreadsheet from "jspreadsheet-ce";

/**
 * See {@link DatasetView} or {@link TableView}
 * @packageDocumentation
 * @preferred
 */

import * as React from "react";
import { Dataset } from "../../../core";
// import { getConvertableTypes } from "../../utils";
// import { Dropdown, Option } from "@fluentui/react-combobox";

export interface TableViewProps {
  table: Dataset.Table;
  maxRows?: number;
  onTypeChange?: (column: string, type: string) => void;
  onChange?: (changes: jspreadsheet.CellChange[]) => void;
}

export interface TableViewState {
}

/**
 * Component for displaying data samples on loading or in context menu of {@link DatasetView}
 *
 * ![Table view](media://table_view.png)
 *
 * ![Table view](media://table_view_leftside.png)
 */
export const TableView: React.FC<TableViewProps> = (props: TableViewProps) => {
  const table = props.table;

  const refjspreadsheet = React.useRef<jspreadsheet.JspreadsheetInstance>();
  const refContainer = React.useRef();
  const onChange = props.onChange;

  React.useEffect(() => {
    refjspreadsheet.current = jspreadsheet(refContainer.current, {
      onafterchanges(element, changes) {
        onChange(changes);
      },
      columns: table.columns.map(col => ({
        title: col.displayName,
        width: 150
      })),
      data: table.rows.map(row => table.columns.map(col => row[col.name])),
      pagination: 40,
      allowExport: true,
      allowDeleteColumn: true,
      allowDeleteRow: true,
      allowInsertColumn: true,
      allowRenameColumn: true,
    });
  }, []);

  if (refjspreadsheet.current) {
    table.columns.forEach((col, idx) => {
      refjspreadsheet.current.setHeader(idx, col.displayName)
    });
    refjspreadsheet.current.setData(table.rows.map(row => table.columns.map(col => row[col.name])));
  }

  return (
    <>
      <div ref={refContainer} id='table-spreadsheet' className="charticulator__dataset-table-view-spreadsheet"></div>
    </>
  );
}
