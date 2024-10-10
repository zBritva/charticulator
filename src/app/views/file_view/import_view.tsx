// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";

import { ContextedComponent } from "../../context_component";
import { Dataset, Specification } from "../../../core";
import { DataType, Table, TableType } from "../../../core/dataset/dataset";
import { strings } from "../../../strings";
import { showOpenFileDialog } from "../../utils";
import { getTableName, LocaleFileFormat } from "../../../core/dataset/utils";
import { Button, Dialog, DialogBody, DialogContent, DialogSurface, DialogTitle, Dropdown, Option, Table as FTable, TableHeader, TableRow, TableHeaderCell, TableBody, TableCell, DialogActions } from "@fluentui/react-components";

export enum MappingMode {
  ImportTemplate,
  ImportDataset,
}

export interface FileViewImportProps {
  mode: MappingMode;
  tables: Specification.Template.Table[];
  datasetTables: Table[];
  tableMapping: Map<string, string>;
  unmappedColumns: Specification.Template.Column[];
  format: LocaleFileFormat;
  onSave: (columnMapping: Map<string, string>, tableMapping: Map<string, string>, datasetTables: Table[]) => void;
  onImportDataClick: (type: TableType) => void;
  onClose: () => void;
}
export interface FileViewImportState {
  saving?: boolean;
  error?: string;
  columnMappings: Map<string, string>;
  tableMapping: Map<string, string>;
  datasetTables: Table[];
}

export class FileViewImport extends ContextedComponent<
  FileViewImportProps,
  FileViewImportState
> {
  public state: FileViewImportState = {
    columnMappings: new Map(),
    datasetTables: this.props.datasetTables,
    tableMapping: this.props.tableMapping
  };

  // eslint-disable-next-line
  public render() {
    const tables = this.props.tables;
    const newMapping = new Map(this.state.columnMappings);

    const getDefaultValue = (name: string) => {
      const mapped = newMapping.get(name) as any;
      if (mapped) {
        return mapped;
      }

      return strings.templateImport.unmapped;
    };

    const onChange = (columnName: string) => (value: string) => {
      newMapping.set(columnName, value);
      this.setState({
        columnMappings: newMapping,
      });
    };

    tables.forEach((table, tableIndex) => {
      const filteredByTableColumns = this.state.datasetTables[tableIndex]
        ?.columns;
      if (!filteredByTableColumns) {
        return;
      }
      const usedColumns = new Set();
      // match columns by name and type
      table.columns.forEach((column) => {
        filteredByTableColumns.forEach((pbiColumn) => {
          if (
            pbiColumn.displayName === column.name &&
            (column.type === pbiColumn.type ||
              column.type === DataType.String) &&
            !newMapping.get(column.name)
          ) {
            newMapping.set(column.name, pbiColumn.name);
            usedColumns.add(pbiColumn);
          }
        });
      });
      // match columns by type
      table.columns.forEach((column) => {
        // Set default column by type
        if (!newMapping.get(column.name)) {
          filteredByTableColumns.forEach((pbiColumn) => {
            if (column.type === pbiColumn.type && !usedColumns.has(pbiColumn)) {
              newMapping.set(column.name, pbiColumn.name);
              usedColumns.add(pbiColumn);
            }
          });
        }
      });
    });

    return (
      <Dialog
        open={true}>
        <DialogSurface
          style={{
            maxWidth: "100vh"
          }}
        >
          <DialogBody>
            <DialogTitle>{strings.templateImport.title}</DialogTitle>
            <DialogContent>
              {tables &&
                tables.map((table) => {
                  return (
                    <React.Fragment key={`table-${table.name}`}>
                      <h4>{table.type} table: {table.name}</h4>
                      <h5>
                        {this.props.mode === MappingMode.ImportTemplate
                          ? strings.templateImport.usbtitleImportTemplate
                          : strings.templateImport.usbtitleImportData}
                      </h5>
                      <FTable>
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>
                              {this.props.mode === MappingMode.ImportTemplate
                                ? strings.templateImport.columnNameTemplate
                                : strings.templateImport.columnNameChart}
                            </TableHeaderCell>
                            <TableHeaderCell>
                              {strings.templateImport.dataType}
                            </TableHeaderCell>
                            <TableHeaderCell>
                              {strings.templateImport.examples}
                            </TableHeaderCell>
                            <TableHeaderCell>
                              {strings.templateImport.mapped}
                            </TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {table.columns.map((column) => {
                            const datasetTable = this.state.datasetTables.find(
                              (t) =>
                                t.name ===
                                this.props.tableMapping.get(table.name) ||  t.type === table.type
                            );

                            const optionValues =
                              datasetTable?.columns
                                .filter(
                                  (pbiColumn) =>
                                    pbiColumn.type === column.type ||
                                    column.type === DataType.String
                                )
                                .map((pbiColumn) => {
                                  return pbiColumn.displayName;
                                }) || [];

                            const defaultValue = getDefaultValue(
                              column.name
                            );

                            return (
                              <React.Fragment
                                key={`column-${table.name}-${column.name}`}
                              >
                                <TableRow>
                                  <TableCell>
                                    {column.name}
                                  </TableCell>
                                  <TableCell>
                                    {strings.typeDisplayNames[column.type]}
                                  </TableCell>
                                  <TableCell>
                                    {column.metadata.examples}
                                  </TableCell>
                                  <TableCell>
                                    <Dropdown
                                      style={{
                                        minWidth: "unset",
                                        width: "100%",
                                      }}
                                      value={defaultValue}
                                      onOptionSelect={(e, data) => {
                                        onChange(column.name)(data.optionValue);
                                      }}
                                    >
                                      {optionValues.map(option => {
                                        return (<Option value={option} text={option}>
                                          {option}
                                        </Option>);
                                      })}
                                    </Dropdown>
                                  </TableCell>
                                </TableRow>
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </FTable>
                    </React.Fragment>
                  );
                })}
            </DialogContent>
            <DialogActions
              style={{
                gridColumnStart: 1
              }}
            >
              <Button
                disabled={this.props.mode === MappingMode.ImportDataset}
                onClick={() => {
                  showOpenFileDialog(["csv"]).then((file) => {
                    const loader = new Dataset.DatasetLoader();
                    const reader = new FileReader();

                    reader.onload = () => {
                      const newTable = loader.loadDSVFromContents(
                        file.name,
                        reader.result as string,
                        this.props.format
                      );
                      newTable.type = TableType.Main;
                      const datasetTables = this.state.datasetTables.map((x) => {
                        if (x.type == TableType.Main) {
                          return newTable;
                        } else {
                          return x;
                        }
                      });
                      if (!datasetTables.find(t => t.type === TableType.Main)) {
                        datasetTables.push(newTable);
                      }      
                      const newTableMapping = new Map(this.state.tableMapping.entries());
                      const mainTableName = this.props.tables.find(t => t.type === TableType.Main).name;

                      newTableMapping.set(mainTableName, getTableName(file.name));

                      this.setState({
                        datasetTables: [...datasetTables],
                        tableMapping: newTableMapping
                      });

                      this.props.onImportDataClick(TableType.Main)
                    }

                    reader.readAsText(file);
                  });
                }}
                title={strings.templateImport.importData}
              >
                {strings.templateImport.importData}
              </Button>
              <Button
                disabled={this.props.mode === MappingMode.ImportDataset}
                onClick={() => {
                  showOpenFileDialog(["csv"]).then((file) => {
                    const loader = new Dataset.DatasetLoader();
                    const reader = new FileReader();

                    reader.onload = () => {
                      const newTable = loader.loadDSVFromContents(
                        file.name,
                        reader.result as string,
                        this.props.format,
                      );
                      newTable.type = TableType.Links;
                      const datasetTables = this.state.datasetTables.map((x) => {
                        if (x.type == TableType.Links) {
                          return newTable;
                        } else {
                          return x;
                        }
                      });
                      if (!datasetTables.find(t => t.type === TableType.Links)) {
                        datasetTables.push(newTable);
                      }                      
                      const newTableMapping = new Map(this.state.tableMapping.entries());
                      const linksTableName = this.props.tables.find(t => t.type === TableType.Links)?.name;
                      if (linksTableName) {
                        newTableMapping.set(linksTableName, getTableName(file.name));
                      } else {
                        newTableMapping.set(getTableName(file.name), getTableName(file.name));
                      }

                      this.setState({
                        datasetTables: [...datasetTables],
                        tableMapping: newTableMapping
                      });

                      this.props.onImportDataClick(TableType.Links)
                    }

                    reader.readAsText(file);
                  });
                }}
                title={strings.templateImport.importLinksData}
              >
                {strings.templateImport.importLinksData}
              </Button>
              <Button
                onClick={() => {
                  this.props.onClose();
                }}
                title={strings.button.cancel}
              >
                {strings.button.cancel}
              </Button>
              <Button
                onClick={() => {
                  if (
                    this.props.unmappedColumns.filter(
                      (unmapped) =>
                        this.state.columnMappings.get(unmapped.name) ===
                        undefined
                    ).length === 0
                  ) {
                    this.props.onSave(this.state.columnMappings, this.state.tableMapping, this.state.datasetTables);
                  }
                }}
                title={strings.templateImport.save}
                disabled={
                  this.props.unmappedColumns.filter(
                    (unmapped) =>
                      this.state.columnMappings.get(unmapped.name) === undefined
                  ).length !== 0
                }
              >
                {strings.templateImport.save}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    );
  }
}
