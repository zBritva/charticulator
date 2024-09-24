/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { ReactGrid, Column, Row, DefaultCellTypes, CellChange, CellLocation, DropdownCell, Id, MenuOption, SelectionMode } from "@silevis/reactgrid";
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

export interface TableViewProps {
  table: Dataset.Table;
  maxRows?: number;
  onChange?: (table: Dataset.Table) => void;
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

  const onChange = props.onChange;

  const findOpenedDropdownCellLocation = React.useCallback((
    changes: CellChange<any | DropdownCell>[]
  ) : CellLocation | undefined => {
    const openedDropdownChanges: CellChange<DropdownCell>[] = changes.filter(
      (change) => change.type === "dropdown" && change.newCell.isOpen
    );
    if (openedDropdownChanges.length >= 1) {
      const cell = openedDropdownChanges[0];
      return { rowId: cell.rowId, columnId: cell.columnId };
    }
    return undefined;
  }, []);

  const [openedDropdownLocation, setOpenedDropdownLocation] = React.useState<
    CellLocation
  >();

  const applyChanges = (
    changes: CellChange<any>[],
    prevTable: Dataset.Table,
  ): Dataset.Table => {

    changes.forEach((change) => {
      const dataRowId = change.rowId;
      const dataColumnId = change.columnId;
      let dataRow = table.rows.find((d) => d._id == dataRowId);

      if (dataRowId === "header") {
        debugger;
        const colIndex = prevTable.columns.findIndex(col => col.displayName === change.previousCell.text);
        prevTable.columns[colIndex].name == change.newCell.text;
        prevTable.columns[colIndex].displayName == change.newCell.text;
      } else
      if (dataRowId === "type") {
        const colIndex = prevTable.columns.findIndex(col => col.displayName === dataColumnId);
        prevTable.columns[colIndex].type == change.newCell.selectedValue;
      } else {

        if (!dataRow) {
          const id = prevTable.rows.length + 1;
          dataRow = {
            _id: id.toString(),
          };
          // prevRows.push(dataRow);
        }
        if (change.type === "text" && typeof dataRow[dataColumnId] === "string") {
          editObj(dataRow, dataColumnId, change.newCell.text);
        } else if (
          change.type === "number" &&
          typeof dataRow[dataColumnId] === "number"
        ) {
          editObj(dataRow, dataColumnId, change.newCell.value);
        } else if (
          change.type === "checkbox" &&
          typeof dataRow[dataColumnId] === "boolean"
        ) {
          editObj(dataRow, dataColumnId, change.newCell.checked);
        } else if (change.type === "dropdown") {
          if (change.newCell.selectedValue != change.previousCell.selectedValue) {
            editObj(dataRow, dataColumnId, change.newCell.selectedValue);
          }
        } else {
          editObj(dataRow, dataColumnId, change.newCell.text);
        }
      }
    });

    return {
      ...prevTable
    }
  }

  const handleChanges = (changes: CellChange<any>[]) => {
    setOpenedDropdownLocation(findOpenedDropdownCellLocation(changes));
    setTable(previousRows => {
      const appliedChanges = applyChanges(changes, previousRows);
      setTimeout(() => onChange(appliedChanges), 0);
      return appliedChanges;
    })
  };

  const handleContextMenu = (
    selectedRowIds: Id[], selectedColIds: Id[], selectionMode: SelectionMode, menuOptions: MenuOption[], selectedRanges: Array<CellLocation[]>
  ): MenuOption[] => {
    menuOptions = [
      ...menuOptions,
      {
        id: "removeRow",
        label: "Remove row",
        handler: () => {
          
        }
      },
      {
        id: "removeColumn",
        label: "Remove column",
        handler: () => {
          
        }
      },
      {
        id: "addRowBefore",
        label: "Add row before",
        handler: () => {
          
        }
      },
      {
        id: "addRowAfter",
        label: "Add row before",
        handler: () => {
          
        }
      },
      {
        id: "addColumnBefore",
        label: "Add column before",
        handler: () => {
          
        }
      },
      {
        id: "addColumnAfter",
        label: "Add column before",
        handler: () => {
          
        }
      },
    ];
    return menuOptions;
  }

  const getGridRows = (table: Dataset.Table) => {
    const headerRow: Row = {
      rowId: "header",
      cells: table.columns.map(col => {
        return {
          
          text: col.displayName,
          type: "text"
        };
      })
    }
  
    const typeRow: Row = {
      rowId: "type",
      cells: table.columns.map(col => {
        const convertibleTypes = getConvertibleTypes(
          col.type,
          table.rows.slice(0, 10).map((row) => row[col.name])
        );
  
        return {
          text: col.type,
          type: "dropdown",
          isOpen:
          openedDropdownLocation?.columnId === col.displayName,
          selectedValue: col.type,
          values: convertibleTypes.map(type => ({
            label: type,
            value: type,
          }))
        };
      })
    }
  
    const tableRows: Row[] = table.rows.map(row => {
      return {
        rowId: row._id,
        cells: table.columns.map(col => {
          return {
            text: !row[col.displayName] ? "" : row[col.displayName].toString(),
            type: "text"
          } as DefaultCellTypes
        })
      }
    });

    return [
      headerRow,
      typeRow,
      ...tableRows
    ]
  };

  const [table, setTable] = React.useState<Dataset.Table>(props.table);

  const columns: Column[] = React.useMemo(() => {
    return table.columns.map(col => {
      return { columnId: col.displayName, width: 150 }
    })
  }, [table]);

  return <ReactGrid
    canReorderColumns={() => false}
    canReorderRows={() => false}
    onCellsChanged={handleChanges}
    onContextMenu={handleContextMenu}
    rows={getGridRows(table)}
    columns={columns} />;
}
