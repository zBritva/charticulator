/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import "jsuites/react/index";
import jspreadsheet from "jspreadsheet-ce";

import "../../../../node_modules/jspreadsheet-ce/dist/jspreadsheet.css";

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

  // eslint-disable-next-line powerbi-visuals/insecure-random
  const id = React.useRef<string>(`refjspreadsheet-${Math.ceil(Math.random() * 1000000000)}`);
  const refjspreadsheet = React.useRef<jspreadsheet.JspreadsheetInstance>();
  const refContainer = React.useRef();
  const onChange = props.onChange;

  React.useEffect(() => {
    if (!refjspreadsheet.current) {
      refjspreadsheet.current = jspreadsheet(refContainer.current, {
        meta: {
          
        },
        onafterchanges: (element, changes) => {
          onChange(changes);
        },
        // oninsertrow: (el, rowIndex) => {

        // },
        // ondeleterow: (el, rowIndex) => {

        // },
        // oninsertcolumn: (el, colIndex, count, cells) => {

        // },
        // onchangeheader: (el, colIndex, old, val) => {

        // },
        // columns: table.columns.map(col => ({
        //   title: col.displayName,
        //   width: 150
        // })),
        // data: table.rows.map(row => table.columns.map(col => row[col.name])),
        pagination: 20,
        allowExport: true,
        allowDeleteColumn: true,
        allowDeleteRow: true,
        allowInsertColumn: true,
        allowRenameColumn: true,
        allowDeletingAllRows: true,
        allowInsertRow: true,
        allowManualInsertColumn: true,
        allowManualInsertRow: true,
        allowComments: false,
        editable: true,
        paginationOptions: [20, 50, 100],
        csvHeaders: false,
      });
    }
  }, [onChange]);

  React.useEffect(() => {
    if (refjspreadsheet.current) {
      const headers = refjspreadsheet.current.getHeaders(true) as string[]; 
      if (headers.length > 0) {
        refjspreadsheet.current.destroy();
        // headers.forEach((header, idx) => {
        //   refjspreadsheet.current.deleteColumn(idx);
        // })
      }
      
      table.columns.forEach((col, idx) => {
        refjspreadsheet.current.insertColumn(1, idx, false, []);
        refjspreadsheet.current.setHeader(idx, col.displayName);
        refjspreadsheet.current.setWidth(idx, 150);
      });
      refjspreadsheet.current.setData(table.rows.map(row => table.columns.map(col => row[col.name])));
      refjspreadsheet.current.refresh();
    }
  }, [table]);

  return (
    <>
      <div id={id.current} ref={refContainer} className="charticulator__dataset-table-view-spreadsheet"></div>
    </>
  );
}
