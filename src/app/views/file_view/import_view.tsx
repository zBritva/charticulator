// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";

import { FloatingPanel } from "../../components";
import { ContextedComponent } from "../../context_component";
import { Specification } from "../../../core";
import { Button, Select } from "../panels/widgets/controls";
import { Table } from "../../../core/dataset/dataset";

export interface FileViewImportProps {
  tables: Specification.Template.Table[];
  datasetTables: Table[];
  tableMapping: Map<string, string>;
  unmappedColumns: Specification.Template.Column[];
  onSave: (columnMapping: Map<string, string>) => void;
  onClose: () => void;
}
export interface FileViewImportState {
  saving?: boolean;
  error?: string;
  columnMappings: Map<string, string>;
}

export const typeDisplayNames: { [key in Specification.DataType]: string } = {
  boolean: "Boolean",
  date: "Date",
  number: "Number",
  string: "String",
};

export class FileViewImport extends ContextedComponent<
  FileViewImportProps,
  FileViewImportState
> {
  public state: FileViewImportState = {
    columnMappings: new Map(),
  };

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

      console.log(name, "Unmapped", newMapping);
      return "Unmapped";
    };

    const onChange = (columnName: string) => (value: string) => {
      newMapping.set(columnName, value);
      this.setState({
        columnMappings: newMapping,
      });
    };

    return (
      <FloatingPanel
        floatInCenter={true}
        scroll={true}
        peerGroup="import"
        title="Import template"
        closeButtonIcon={"general/cross"}
        height={400}
        width={650}
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
                    <h4>Table name: {table.name}</h4>
                    {/* <div
                      className="charticulator__file-view-mapping_rows"
                      key={table.name}
                    > */}
                      <table className="charticulator__file-view-mapping_table">
                        <thead>
                          <tr className="charticulator__file-view-mapping_rows">
                            <th className="charticulator__file-view-mapping_row_item">Template column</th>
                            <th className="charticulator__file-view-mapping_row_item">Required data type</th>
                            <th className="charticulator__file-view-mapping_row_item">Dataset column</th>
                          </tr>
                        </thead>
                        <tbody>
                          {table.columns.map((column) => {
                            const datasetTable = this.props.datasetTables
                              .find(
                                (t) =>
                                  t.name ===
                                  (this.props.tableMapping.get(table.name) ||
                                    table.name)
                              )

                              const optionValues = datasetTable?.columns.filter(
                                (pbiColumn) => pbiColumn.type === column.type
                              )
                              .map((pbiColumn) => {
                                let selected = false;
                                if (pbiColumn.displayName === column.name) {
                                  selected = true;
                                }
                                return pbiColumn.displayName;
                              }) || [];

                            return (
                              <React.Fragment key={`${table.name}-${column.name}`}>
                                <tr className="charticulator__file-view-mapping_rows"> {/*  className="charticulator__file-view-mapping_row_item" */}
                                  <td className="charticulator__file-view-mapping_row_item">
                                    {column.name}
                                  </td>
                                  <td className="charticulator__file-view-mapping_row_item">
                                    {typeDisplayNames[column.type]}
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
                  // </div>
                );
              })}
              <div className="charticulator__file-view-mapping_row_button_toolbar">
                <Button
                  onClick={() => {
                    if (
                      this.props.unmappedColumns.filter(
                        (unmapped) =>
                          this.state.columnMappings.get(unmapped.name) ===
                          undefined
                      ).length == 0
                    ) {
                      this.props.onSave(this.state.columnMappings);
                    }
                  }}
                  text={"Save mapping"}
                  active={
                    this.props.unmappedColumns.filter(
                      (unmapped) =>
                        this.state.columnMappings.get(unmapped.name) ===
                        undefined
                    ).length == 0
                  }
                />
                <Button
                  onClick={() => {
                    this.props.onClose();
                  }}
                  text={"Cancel"}
                />
              </div>
              {/* <div className="charticulator__file-view-mapping_row_item">
                
              </div> */}
          </section>
        </section>
      </FloatingPanel>
    );
  }
}
