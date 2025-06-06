// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * See {@link DatasetView} or {@link TableView}
 * @packageDocumentation
 * @preferred
 */

import * as React from "react";
import { Dataset, Expression, Specification } from "../../../core";
import { DragData, Actions } from "../../actions";
import { DraggableElement, SVGImageIcon } from "../../components";
import {
  PopupAlignment,
  PopupView,
} from "../../controllers";
import * as globals from "../../globals";
import * as R from "../../resources";
import { AppStore } from "../../stores";
import {
  classNames,
  showOpenFileDialog,
  getFileNameWithoutExtension,
  getConvertableDataKind,
} from "../../utils";
import { DropdownListView } from "../panels/widgets/controls";
import { DerivedColumnDescription, kind2Icon, type2DerivedColumns } from "./common";
import { TableView } from "./table_view";
import { TableType, tableTypeName } from "../../../core/dataset";
import { DataType, DataKind } from "../../../core/specification";
import { ChartTemplateBuilder } from "../../../template";
import { ChartTemplate } from "../../../container";
import { FileViewImport, MappingMode } from "../file_view/import_view";
import { strings } from "../../../strings";
import { EditorType } from "../../stores/app_store";
import {
  Popover,
  PopoverSurface,
  PopoverTrigger,
} from "@fluentui/react-popover";
import { Button } from "@fluentui/react-button";
import {
  ChevronDownRegular,
  ChevronLeftRegular,
  MoreHorizontalRegular,
} from "@fluentui/react-icons";

import { tokens } from '@fluentui/react-components';

declare let CHARTICULATOR_PACKAGE: {
  version: string;
  buildTimestamp: number;
  revision: string;
};

export interface DatasetViewProps {
  store: AppStore;
}

/**
 * Component for displaying dataset on the left side of app
 *
 * ![Mark widgets](media://dataset_view.png)
 */
export class DatasetView extends React.Component<
  React.PropsWithChildren<DatasetViewProps>,
  Record<string, unknown>
> {
  public componentDidMount() {
    this.props.store.addListener(AppStore.EVENT_DATASET, () =>
      this.forceUpdate()
    );
  }
  public render() {
    const tables = this.props.store.getTables();
    const mainTables = [TableType.Main, TableType.Links, TableType.Image];
    return (
      <div className="charticulator__dataset-view">
        {tables
          .filter((table) => mainTables.find((m) => m === table.type))
          .map((table, idx) => (
            <ColumnsView
              key={`t${idx}`}
              table={table}
              store={this.props.store}
            />
          ))}
      </div>
    );
  }

  public onImportConnections() {
    alert(strings.error.notImplemented);
  }
}

export interface ColumnsViewProps {
  store: AppStore;
  table: Dataset.Table;
}

export interface ColumnsViewState {
  selectedColumn: string;
  tableViewIsOpened: boolean;
  dialogOptions: any;
}

// const buttonStyles = {
//   root: {
//     height: `${defultBindButtonSize}px`,
//     width: `${defultBindButtonSize}px`,
//     minWidth: `${defultBindButtonSize}px`,
//     padding: "0px",
//     border: "none",
//   },
// };

export class ColumnsView extends React.Component<
  React.PropsWithChildren<ColumnsViewProps>,
  ColumnsViewState
> {
  constructor(props: ColumnsViewProps) {
    super(props);
    this.state = {
      selectedColumn: null,
      tableViewIsOpened: false,
      dialogOptions: null
    };
  }

  private renderFileViewImport(options: any) {
    return (
      <FileViewImport
        mode={MappingMode.ImportDataset}
        tables={options.tables}
        datasetTables={options.datasetTables}
        tableMapping={options.tableMapping}
        unmappedColumns={options.unmappedColumns}
        format={options.format}
        onSave={(mapping, tableMapping, datasetTables) => {
          options.onSave(mapping, tableMapping, datasetTables);
        }}
        onClose={() => {
          options.onClose();
        }}
        onImportDataClick={null}
      />
    )
  }

  // eslint-disable-next-line
  public render() {
    const table = this.props.table;
    return (
      <>
        {this.state.dialogOptions ? this.renderFileViewImport(this.state.dialogOptions) : null}
        <div className="charticulator__dataset-view-columns">
          <h2 className="el-title">
            <span className="el-text">
              {tableTypeName[this.props.table.type]}
            </span>
            {this.props.store.editorType === EditorType.Chart ? (
              <Button
                appearance="subtle"
                icon={<SVGImageIcon url={R.getSVGIcon("general/replace")} />}
                title={strings.dataset.replaceWithCSV}
                // eslint-disable-next-line
                onClick={() => {
                  // eslint-disable-next-line
                  showOpenFileDialog(["csv"]).then((file) => {
                    const loader = new Dataset.DatasetLoader();
                    const reader = new FileReader();
                    // eslint-disable-next-line
                    reader.onload = () => {
                      const newTable = loader.loadDSVFromContents(
                        table.name,
                        reader.result as string,
                        this.props.store.getLocaleFileFormat()
                      );
                      newTable.displayName = getFileNameWithoutExtension(
                        file.name
                      );
                      newTable.name = table.name;
                      newTable.type = table.type;
                      const store = this.props.store;
                      const newDataset: Dataset.Dataset = {
                        name: store.dataset.name,
                        tables: store.dataset.tables.map((x) => {
                          if (x.name == table.name) {
                            return newTable;
                          } else {
                            return x;
                          }
                        }),
                      };
                      {
                        const builder = new ChartTemplateBuilder(
                          store.chart,
                          store.dataset,
                          store.chartManager,
                          CHARTICULATOR_PACKAGE.version
                        );
                        const template = builder.build();

                        let unmappedColumns: Specification.Template.Column[] = [];
                        template.tables[0].columns.forEach((column) => {
                          unmappedColumns = unmappedColumns.concat(
                            store.checkColumnsMapping(
                              column,
                              TableType.Main,
                              newDataset
                            )
                          );
                        });
                        if (template.tables[1]) {
                          template.tables[1].columns.forEach((column) => {
                            unmappedColumns = unmappedColumns.concat(
                              store.checkColumnsMapping(
                                column,
                                TableType.Links,
                                newDataset
                              )
                            );
                          });
                        }

                        const tableMapping = new Map<string, string>();
                        tableMapping.set(
                          template.tables[0].name,
                          store.dataset.tables[0].name
                        );
                        if (template.tables[1] && store.dataset.tables[1]) {
                          tableMapping.set(
                            template.tables[1].name,
                            store.dataset.tables[1].name
                          );
                        }

                        // eslint-disable-next-line
                        const loadTemplateIntoState = (
                          store: AppStore,
                          tableMapping: Map<string, string>,
                          columnMapping: Map<string, string>,
                          template: Specification.Template.ChartTemplate,
                          datasetTables: Dataset.Table[]
                        ) => {
                          newDataset.tables = datasetTables;
                          const templateInstance = new ChartTemplate(template);

                          for (const table of templateInstance.getDatasetSchema()) {
                            templateInstance.assignTable(
                              table.name,
                              tableMapping.get(table.name) || table.name
                            );
                            for (const column of table.columns) {
                              templateInstance.assignColumn(
                                table.name,
                                column.name,
                                columnMapping.get(column.name) || column.name
                              );
                            }
                          }
                          const instance = templateInstance.instantiate(
                            newDataset,
                            false // no scale inference
                          );

                          store.dispatcher.dispatch(
                            new Actions.ImportChartAndDataset(
                              instance.chart,
                              newDataset,
                              {}
                            )
                          );
                          store.dispatcher.dispatch(
                            new Actions.ReplaceDataset(newDataset)
                          );
                        };

                        if (unmappedColumns.length > 0) {
                          // globals.popupController.showModal(
                          //   (context) => {
                          //     return (
                          //       <ModalView context={context}>
                          //         <div onClick={(e) => e.stopPropagation()}>

                          //         </div>
                          //       </ModalView>
                          //     );
                          //   },
                          //   { anchor: null }
                          // );
                          this.setState({
                            dialogOptions: {
                              tables: template.tables,
                              datasetTables: newDataset.tables,
                              tableMapping: tableMapping,
                              unmappedColumns: unmappedColumns,
                              format: store.getLocaleFileFormat(),
                              onClose: () => {
                                this.setState({
                                  dialogOptions: null
                                });
                              },
                              onSave: (mapping, tableMapping, datasetTables) => {
                                loadTemplateIntoState(
                                  store,
                                  tableMapping,
                                  mapping,
                                  template,
                                  datasetTables
                                );
                              }
                            }
                          })
                        } else {
                          store.dispatcher.dispatch(
                            new Actions.ReplaceDataset(newDataset)
                          );
                        }
                      }
                    };
                    reader.readAsText(file);
                  });
                }}
              />
            ) : null}
            <Popover>
              <PopoverTrigger>
                <Button
                  appearance="subtle"
                  icon={<MoreHorizontalRegular />}
                  title={strings.dataset.showDataValues}
                  onClick={() => {
                    this.setState({
                      tableViewIsOpened: !this.state.tableViewIsOpened,
                    });
                  }}
                />
              </PopoverTrigger>
              <PopoverSurface>
                <div className="charticulator__dataset-view-detail">
                  <h2>{table.displayName || table.name}</h2>
                  <p>
                    {strings.dataset.dimensions(
                      table.rows.length,
                      table.columns.length
                    )}
                  </p>
                  <TableView
                    table={table}
                    onChange={
                      this.props.store.editorType === EditorType.Chart
                        ? (table: Dataset.Table) => {
                          const store = this.props.store;

                          const restTables = this.props.store.dataset.tables.filter(t => t.type != table.type);

                          store.dispatcher.dispatch(
                            new Actions.ReplaceDataset({
                              name: this.props.store.dataset.name,
                              tables: [
                                ...restTables,
                                table
                              ]
                            }, true)
                          );
                        }
                        : null
                    }
                  />
                </div>
              </PopoverSurface>
            </Popover>
          </h2>
          <p style={{
            color: tokens.colorNeutralForeground1
          }} className="el-details">{table.displayName || table.name}</p>
          {table.columns
            .filter((c) => !c.metadata.isRaw)
            .map((c, idx) => (
              <ColumnView
                key={`t${idx}`}
                store={this.props.store}
                table={this.props.table}
                column={c}
              />
            ))}
        </div>
      </>
    );
  }
}

export class ColumnViewProps {
  public store: AppStore;
  public table: Dataset.Table;
  public column: Dataset.Column;
}

export class ColumnViewState {
  public isSelected: string;
  public isExpanded: boolean;
}

export class ColumnView extends React.Component<
  React.PropsWithChildren<ColumnViewProps>,
  ColumnViewState
> {
  private columnRef: HTMLElement;
  constructor(props: ColumnViewProps) {
    super(props);
    this.state = {
      isSelected: null,
      isExpanded: false,
    };
  }

  public renderDerivedColumns() {
    const c = this.props.column;
    let derivedColumns = type2DerivedColumns[c.type];
    if (c.metadata.derivedColumns) {
      if (!derivedColumns) {
        derivedColumns = [];
      }

      derivedColumns = derivedColumns.concat(c.metadata.derivedColumns.map(fp => {
        return {
          name: fp,
          metadata: c.metadata,
          type: c.type,
          displayName: fp,
          function: "powerBIderivedColumn"
        } as DerivedColumnDescription;
      }))
    } 
    if (!derivedColumns) {
      return null;
    }
    return (
      <div className="charticulator__dataset-view-derived-fields">
        {derivedColumns.map((desc) => {
          let expr = "";
          if (desc.function == "powerBIderivedColumn") {
            expr = Expression.variable(this.props.column.name).toString();
          } else {
            expr = Expression.functionCall(
              desc.function,
              Expression.variable(this.props.column.name)
            ).toString();
          }
          const type = desc.type;
          return this.renderColumnControl(
            desc.name,
            R.getSVGIcon(kind2Icon[desc.metadata.kind]),
            expr,
            type,
            null,
            desc.metadata,
            undefined,
            expr,
            desc.displayName
          );
        })}
      </div>
    );
  }

  public applyAggregation(expr: string, type: DataType, kind: DataKind) {
    const aggregation = Expression.getDefaultAggregationFunction(type, kind);
    return Expression.functionCall(
      aggregation,
      Expression.parse(expr)
    ).toString();
  }

  // eslint-disable-next-line max-lines-per-function
  public renderColumnControl(
    label: string,
    icon: string,
    expr: string,
    type: Dataset.DataType,
    additionalElement: JSX.Element = null,
    metadata: Dataset.ColumnMetadata,
    onColumnKindChanged?: (column: string, type: string) => void,
    rawColumnExpr?: string,
    displayLabel?: string
  ) {
    let anchor: HTMLDivElement;
    const onClickHandler = () => {
      if (!onColumnKindChanged) {
        return;
      }
      globals.popupController.popupAt(
        (context) => (
          <PopupView key={label} context={context}>
            <div>
              <DropdownListView
                selected={type}
                list={getConvertableDataKind(type).map((type) => {
                  return {
                    name: type.toString(),
                    text: type.toString(),
                    url: R.getSVGIcon(kind2Icon[type]),
                  };
                })}
                context={context}
                onClick={(value: string) => {
                  onColumnKindChanged(label, value);
                }}
                onClose={() => {
                  anchor?.focus();
                }}
              />
            </div>
          </PopupView>
        ),
        {
          anchor,
          alignX: PopupAlignment.Outer,
          alignY: PopupAlignment.StartInner,
        }
      );
    };
    return (
      <div
        tabIndex={0}
        key={label}
        style={{
          backgroundColor: tokens.colorNeutralBackground1
        }}
        data-testid={`dataset-view-column-${label.replace(/\W/g, "_")}`}
        className="click-handler"
        ref={(e) => (anchor = e)}
        onClick={onClickHandler}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            onClickHandler();
          }
        }}
      >
        <DraggableElement
          key={expr}
          className={classNames("charticulator__dataset-view-column", [
            "is-active",
            this.state.isSelected == expr,
          ])}
          onDragStart={() => this.setState({ isSelected: expr })}
          onDragEnd={() => this.setState({ isSelected: null })}
          dragData={() => {
            this.setState({ isSelected: expr });
            const r = new DragData.DataExpression(
              this.props.table,
              this.applyAggregation(expr, type, metadata.kind),
              type,
              {
                ...metadata,
                columnName: displayLabel ?? label,
              },
              rawColumnExpr
                ? this.applyAggregation(
                  rawColumnExpr,
                  DataType.String,
                  metadata.kind
                )
                : this.applyAggregation(expr, type, metadata.kind)
            );
            return r;
          }}
          renderDragElement={() => [
            <span className="dragging-table-cell">{expr}</span>,
            { x: -10, y: -8 },
          ]}
        >
          <SVGImageIcon url={icon} />
          <span className="el-text">{displayLabel ?? label}</span>
          {additionalElement}
        </DraggableElement>
      </div>
    );
  }

  // eslint-disable-next-line
  public render() {
    const c = this.props.column;
    const derivedColumnsControl = this.renderDerivedColumns();

    if (derivedColumnsControl != null) {
      return (
        <div>
          {this.renderColumnControl(
            c.name,
            R.getSVGIcon(kind2Icon[c.metadata.kind]),
            Expression.variable(c.name).toString(),
            c.type,
            <Button
              appearance="subtle"
              title={strings.dataset.showDerivedFields}
              icon={
                this.state.isExpanded ? (
                  <ChevronDownRegular />
                ) : (
                  <ChevronLeftRegular />
                )
              }
              onClick={(e: { stopPropagation: () => void }) => {
                this.setState({ isExpanded: !this.state.isExpanded });
                e.stopPropagation();
              }}
            />,
            c.metadata,
            (column, type) => {
              c.metadata.kind = type as DataKind;
              this.forceUpdate();
              this.props.store.dispatcher.dispatch(
                new Actions.UpdatePlotSegments()
              );
            },
            Expression.variable(c.metadata.rawColumnName || c.name).toString(),
            c.displayName
          )}
          {this.state.isExpanded ? derivedColumnsControl : null}
        </div>
      );
    } else {
      return this.renderColumnControl(
        c.name,
        R.getSVGIcon(kind2Icon[c.metadata.kind]),
        Expression.variable(c.name).toString(),
        c.type,
        null,
        c.metadata,
        (column, type) => {
          c.metadata.kind = type as DataKind;
          this.props.store.dispatcher.dispatch(
            new Actions.UpdatePlotSegments()
          );
          this.forceUpdate();
        },
        Expression.variable(c.metadata.rawColumnName || c.name).toString(),
        c.displayName
      );
    }
  }
}
