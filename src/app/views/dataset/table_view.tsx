/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import "jsuites/react/index";

import { ReactGrid, Column, Row, DefaultCellTypes, CellChange, OptionType, CellLocation, DropdownCell, TextCell, NumberCell, CheckboxCell, DateCell } from "@silevis/reactgrid";
import "@silevis/reactgrid/styles.css";

/**
 * See {@link DatasetView} or {@link TableView}
 * @packageDocumentation
 * @preferred
 */

import * as React from "react";
import { Dataset } from "../../../core";
import { getConvertibleTypes as getConvertibleTypes } from "../../utils";

function editObj(obj: any, prop: string | number, value: any) {
  obj[prop] = value;
}

function convertDataTypeToExcelType(type: Dataset.DataType) : string {
  switch(type) {
    case Dataset.DataType.Number:
      return "number";
    case Dataset.DataType.Boolean:
      return "checkbox";
    case Dataset.DataType.Date:
      return "date";
    default:
      return "text";
  }
}

function convertExcelTypeToDataType(type: string): Dataset.DataType {
  switch(type) {
    case "number":
      return Dataset.DataType.Number;
    case "checkbox":
      return Dataset.DataType.Boolean;
    case "date":
      return Dataset.DataType.Date;
    default:
      return Dataset.DataType.String;
  }
}

export interface TableViewProps {
  table: Dataset.Table;
  maxRows?: number;
  onTypeChange?: (column: string, type: string) => void;
  onChange?: (cellChanges: CellChange[]) => void;
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

  // const findOpenedDropdownCellLocation = React.useCallback((
  //   changes: CellChange<any | DropdownCell>[]
  // ) : CellLocation | undefined => {
  //   const openedDropdownChanges: CellChange<DropdownCell>[] = changes.filter(
  //     (change) => change.type === "dropdown" && change.newCell.isOpen
  //   );
  //   if (openedDropdownChanges.length >= 1) {
  //     const cell = openedDropdownChanges[0];
  //     return { rowId: cell.rowId, columnId: cell.columnId };
  //   }
  //   return undefined;
  // }, []);

  // const [openedDropdownLocation, setOpenedDropdownLocation] = React.useState<
  //   CellLocation
  // >();

  const applyChanges = (
    changes: CellChange<any>[],
    prevRows: Row<DefaultCellTypes>[],
  ): Row<DefaultCellTypes>[] => {

    changes.forEach((change) => {
      const dataRowId = change.rowId as number;
      const fieldName = change.columnId;
      let dataRow = rows.find((d) => d.rowId == dataRowId);

      console.log('change', change);

      debugger;
      if (dataRow.rowId === "type") {
        const colIndex = columns.findIndex(col => col.columnId === fieldName);
        (dataRow.cells[colIndex] as DropdownCell).isOpen = change.newCell.isOpen;
      }

      if (!dataRow) {
        const id = prevRows.length + 1;
        dataRow = {
          rowId: id.toString(),
          cells: []
        };
        // prevRows.push(dataRow);
      }
      if (change.type === "text" && typeof dataRow[fieldName] === "string") {
        editObj(dataRow, fieldName, change.newCell.text);
      } else if (
        change.type === "number" &&
        typeof dataRow[fieldName] === "number"
      ) {
        editObj(dataRow, fieldName, change.newCell.value);
      } else if (
        change.type === "checkbox" &&
        typeof dataRow[fieldName] === "boolean"
      ) {
        editObj(dataRow, fieldName, change.newCell.checked);
      } else if (change.type === "dropdown") {
        if (change.newCell.selectedValue != change.previousCell.selectedValue) {
          editObj(dataRow, fieldName, change.newCell.selectedValue);
        }
      } else {
        editObj(dataRow, fieldName, change.newCell.text);
      }
    });

    return [
      ...prevRows
    ]
  }

  const handleChanges = (changes: CellChange<any>[]) => {
    setRows(previousRows => {
      const appliedChanges = applyChanges(changes, previousRows);
      return appliedChanges;
    })
    // onChange(changes);
  };

  const columns: Column[] = React.useMemo(() => {
    return props.table.columns.map(col => {
      return { columnId: col.displayName, width: 150 }
    })
  }, [props.table]);

  const headerRow: Row = {
    rowId: "header",
    cells: props.table.columns.map(col => {
      return {
        
        text: col.displayName,
        type: "text"
      };
    })
  }

  const typeRow: Row = {
    rowId: "type",
    cells: props.table.columns.map(col => {
      const convertibleTypes = getConvertibleTypes(
        col.type,
        props.table.rows.slice(0, 10).map((row) => row[col.name])
      );

      return {
        text: col.type,
        type: "dropdown",
        isOpen: false,
        selectedValue: col.type,
        values: convertibleTypes.map(type => ({
          label: type,
          value: type,
        }))
      };
    })
  }

  const tableRows: Row[] = props.table.rows.map(row => {
    return {
      rowId: row._id,
      cells: props.table.columns.map(col => {
        return {
          text: !row[col.displayName] ? "" : row[col.displayName].toString(),
          type: "text"
        } as DefaultCellTypes
      })
    }
  });

  
  const [rows, setRows] = React.useState<Row<DefaultCellTypes>[]>([
    headerRow,
    typeRow,
    ...tableRows
  ]);

  return <ReactGrid
    canReorderColumns={() => false}
    canReorderRows={() => false}
    minColumnWidth={120}
    onCellsChanged={handleChanges}
    rows={rows}
    columns={columns} />;
}
