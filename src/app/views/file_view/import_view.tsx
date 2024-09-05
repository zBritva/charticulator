// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";

import { ButtonRaised, FloatingPanel } from "../../components";
import { ContextedComponent } from "../../context_component";
import { Dataset, Specification } from "../../../core";
import { Select } from "../panels/widgets/controls";
import { DataType, Table, TableType } from "../../../core/dataset/dataset";
import { strings } from "../../../strings";
import { showOpenFileDialog } from "../../utils";
import { LocaleFileFormat } from "../../../core/dataset/dsv_parser";
import { debug } from "console";

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
  onSave: (columnMapping: Map<string, string>, datasetTables: Table[]) => void;
  onImportDataClick: (type: TableType) => void;
  onClose: () => void;
}
export interface FileViewImportState {
  saving?: boolean;
  error?: string;
  columnMappings: Map<string, string>;
  datasetTables: Table[];
}

export class FileViewImport extends ContextedComponent<
  FileViewImportProps,
  FileViewImportState
> {
  public state: FileViewImportState = {
    columnMappings: new Map(),
    datasetTables: this.props.datasetTables
  };

  // eslint-disable-next-line
  public render() {
    const tables = this.props.tables;
    const newMapping = new Map(this.state.columnMappings);

    const getDefaultValue = (name: string) => ():
      | string
      | number
      | string[] => {
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
      <FloatingPanel
        floatInCenter={true}
        scroll={true}
        peerGroup="import"
        title={strings.templateImport.title}
        closeButtonIcon={"ChromeClose"}
        height={600}
        width={800}
        onClose={this.props.onClose}
      >
        <section className="charticulator__file-view-mapping_view">
          <section>
            {tables &&
              tables.map((table) => {
                return (
                  <div
                    className="charticulator__file-view-mapping_table"
                    key={table.name}
                  >
                    <h4>
                      {this.props.mode === MappingMode.ImportTemplate
                        ? strings.templateImport.usbtitleImportTemplate
                        : strings.templateImport.usbtitleImportData}
                    </h4>
                    <table className="charticulator__file-view-mapping_table">
                      <thead>
                        <tr className="charticulator__file-view-mapping_rows">
                          <th className="charticulator__file-view-mapping_row_item">
                            {this.props.mode === MappingMode.ImportTemplate
                              ? strings.templateImport.columnNameTemplate
                              : strings.templateImport.columnNameChart}
                          </th>
                          <th className="charticulator__file-view-mapping_row_item">
                            {strings.templateImport.dataType}
                          </th>
                          <th className="charticulator__file-view-mapping_row_item">
                            {strings.templateImport.examples}
                          </th>
                          <th className="charticulator__file-view-mapping_row_item">
                            {strings.templateImport.mapped}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {table.columns.map((column) => {
                          const datasetTable = this.state.datasetTables.find(
                            (t) =>
                              t.name ===
                              this.props.tableMapping.get(table.name) || table.name || t.type === table.type
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

                          return (
                            <React.Fragment
                              key={`${table.name}-${column.name}`}
                            >
                              <tr className="charticulator__file-view-mapping_rows">
                                {" "}
                                {/*  className="charticulator__file-view-mapping_row_item" */}
                                <td className="charticulator__file-view-mapping_row_item">
                                  {column.name}
                                </td>
                                <td className="charticulator__file-view-mapping_row_item">
                                  {strings.typeDisplayNames[column.type]}
                                </td>
                                <td className="charticulator__file-view-mapping_row_item">
                                  {column.metadata.examples}
                                </td>
                                <td className="charticulator__file-view-mapping_row_item">
                                  <Select
                                    labels={optionValues}
                                    icons={null}
                                    options={optionValues}
                                    value={getDefaultValue(
                                      column.name
                                    )().toString()}
                                    showText={true}
                                    onChange={onChange(column.name)}
                                  />
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            <div className="charticulator__file-view-mapping_row_button_toolbar">
              <ButtonRaised
                onClick={() => {
                  this.props.onClose();
                }}
                text={strings.button.cancel}
              />
              <ButtonRaised
              
                onClick={() => {
                  if (
                    this.props.unmappedColumns.filter(
                      (unmapped) =>
                        this.state.columnMappings.get(unmapped.name) ===
                        undefined
                    ).length === 0
                  ) {
                    this.props.onSave(this.state.columnMappings, this.state.datasetTables);
                  }
                }}
                text={strings.templateImport.save}
                disabled={
                  this.props.unmappedColumns.filter(
                    (unmapped) =>
                      this.state.columnMappings.get(unmapped.name) === undefined
                  ).length !== 0
                }
              />
              <ButtonRaised
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
                      const datasetTables = this.state.datasetTables.map((x) => {
                        if (x.type == TableType.Main) {
                          return newTable;
                        } else {
                          return x;
                        }
                      });

                      this.setState({
                        datasetTables: [...datasetTables]
                      });
                  
                      this.props.onImportDataClick(TableType.Main)
                    }

                    reader.readAsText(file);
                  });
                }}
                text={strings.templateImport.importData}
              />
              <ButtonRaised
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
                      const datasetTables = this.state.datasetTables.map((x) => {
                        if (x.type == TableType.Links) {
                          return newTable;
                        } else {
                          return x;
                        }
                      });

                      this.setState({
                        datasetTables: [...datasetTables]
                      });

                      this.props.onImportDataClick(TableType.Links)
                    }

                    reader.readAsText(file);
                  });
                }}
                text={strings.templateImport.importLinksData}
              />
            </div>
          </section>
        </section>
      </FloatingPanel>
    );
  }
}
