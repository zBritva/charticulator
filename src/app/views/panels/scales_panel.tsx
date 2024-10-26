// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, Prototypes, Expression, Specification } from "../../../core";
import { SVGImageIcon, DraggableElement } from "../../components";

import { AppStore } from "../../stores";
import { ReorderListView } from "./object_list_editor";
import { ContextedComponent } from "../../context_component";
import {
  ScaleMapping,
  Glyph,
  ChartElement,
  ObjectProperties,
  Element,
  Scale,
  MappingType,
} from "../../../core/specification";
import { Actions, DragData } from "../..";
import { classNames } from "../../utils";
import { FunctionCall, Variable } from "../../../core/expression";
import { ColumnMetadata } from "../../../core/dataset";
import { Button, Dialog, DialogActions, DialogBody, DialogSurface, DialogTitle } from "@fluentui/react-components";
import { strings } from "../../../strings";
import { AdvancedScaleEditor } from "./adv_scale_editor";

export class ScalesPanel extends ContextedComponent<
  {
    store: AppStore;
  },
  {
    isSelected: string;
    createDialog: boolean;
    scale: Specification.Scale<Specification.ObjectProperties>,
    scaleClass: Prototypes.Scales.ScaleClass<Specification.AttributeMap, Specification.AttributeMap>
    domainSourceTable: string;
    domainSourceColumn: string;
    currentScale: Specification.Scale<Specification.ObjectProperties>
    table: Prototypes.Dataflow.DataflowTable
  }
> {
  public mappingButton: Element;
  private tokens: EventSubscription[];

  constructor(props: { store: AppStore }) {
    super(props, null);
    this.state = {
      isSelected: "",
      createDialog: false,
      scale: null,
      scaleClass: null,
      currentScale: null,
      domainSourceColumn: null,
      domainSourceTable: null,
      table: null
    };
  }

  public componentDidMount() {
    this.tokens = [
      this.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate()),
      this.store.addListener(AppStore.EVENT_SELECTION, () =>
        this.forceUpdate()
      ),
      this.store.addListener(AppStore.EVENT_SAVECHART, () =>
        this.forceUpdate()
      ),
    ];
  }

  public componentWillUnmount() {
    this.tokens.forEach((token) => token.remove());
    this.tokens = [];
  }

  public renderUnexpectedState(message: string) {
    return (
      <div className="attribute-editor charticulator__widget-container">
        <div className="attribute-editor-unexpected">{message}</div>
      </div>
    );
  }

  private getPropertyDisplayName(name: string) {
    return name[0].toUpperCase() + name.slice(1);
  }

  // eslint-disable-next-line
  public render(): any {
    const store = this.props.store;
    let scales = store.chart.scales;

    const filterElementByScalePredicate = (scaleID: string) => (
      element: any
    ) => {
      return (
        Object.keys(element.mappings).find((key) => {
          const mapping = element.mappings[key];
          return (
            (mapping.type === MappingType.scale ||
              mapping.type === MappingType.expressionScale) &&
            (mapping as ScaleMapping).scale === scaleID
          );
        }) != undefined
      );
    };

    const filterElementProperties = (scaleID: string, element: any) => {
      return Object.keys(element.mappings).filter((key) => {
        const mapping = element.mappings[key];
        return (
          (mapping.type === MappingType.scale ||
            mapping.type === MappingType.expressionScale) &&
          (mapping as ScaleMapping).scale === scaleID
        );
      });
    };

    // eslint-disable-next-line
    const mapToUI = (scale: Scale<ObjectProperties>) => (
      glyph: Glyph,
      element: ChartElement<ObjectProperties>
      // eslint-disable-next-line
    ) => (key: string) => {
      if (!element) {
        const onClick = () => {
          this.setState({
            currentScale: scale,
            createDialog: true
          })
        };
        return (
          <div key={scale._id} className="el-object-item">
            <SVGImageIcon
              url={R.getSVGIcon(
                Prototypes.ObjectClasses.GetMetadata(scale.classID).iconPath
              )}
            />
            <span className="el-text">{scale.properties.name}</span>
            <div tabIndex={0} onClick={onClick} onKeyDown={(e) => {
              if (e.key == "Enter") {
                onClick
              }
            }}>
              <SVGImageIcon
                url={R.getSVGIcon("Edit")}
              />
            </div>
          </div>
        );
      } else {
        const expr = (element.mappings[key] as any).expression;
        let rawColumnExpr: string = null; // TODO handle
        return (
          <div
            className="el-object-item el-object-scale-attribute"
            key={scale._id + "_" + element._id + "_" + key}
            onClick={() => {
              if (glyph) {
                this.dispatch(new Actions.SelectMark(null, glyph, element));
              } else {
                this.dispatch(new Actions.SelectChartElement(element));
              }
              this.dispatch(new Actions.FocusToMarkAttribute(key));
            }}
          >
            <DraggableElement
              key={key}
              className={classNames("charticulator__scale-panel-property", [
                "is-active",
                this.state.isSelected === expr,
              ])}
              onDragStart={() => this.setState({ isSelected: expr })}
              onDragEnd={() => this.setState({ isSelected: null })}
              dragData={() => {
                const type = (element.mappings[key] as any).valueType;
                const scaleID = (element.mappings[key] as any).scale;
                const allowSelectValue = (element.mappings[key] as any)
                  .allowSelectValue;
                const aggregation = Expression.getDefaultAggregationFunction(
                  type,
                  null
                );
                const applyAggregation = (expr: string) => {
                  return Expression.functionCall(
                    aggregation,
                    Expression.parse(expr)
                  ).toString();
                };
                const table = this.store.dataset.tables.find(
                  (table) => table.name === (element.mappings[key] as any).table
                );
                const parsedExpression = Expression.parse(expr);
                let metadata: ColumnMetadata = {};
                if (
                  parsedExpression instanceof FunctionCall &&
                  parsedExpression.args[0] instanceof Variable
                ) {
                  const firstArgument = parsedExpression.args[0] as Variable;
                  const column = table.columns.find(
                    (col) => col.name === firstArgument.name
                  );
                  metadata = column.metadata;
                  rawColumnExpr =
                    metadata.rawColumnName &&
                    applyAggregation(metadata.rawColumnName);
                }
                this.setState({ isSelected: expr });
                const r = new DragData.DataExpression(
                  table,
                  expr,
                  type,
                  metadata,
                  rawColumnExpr,
                  scaleID,
                  allowSelectValue
                );
                return r;
              }}
              renderDragElement={() => [
                <span className="dragging-table-cell">
                  {(element.mappings[key] as any).expression}
                </span>,
                { x: -10, y: -8 },
              ]}
            >
              <SVGImageIcon
                url={R.getSVGIcon(
                  Prototypes.ObjectClasses.GetMetadata(element.classID).iconPath
                )}
              />
              <span className="el-text">{`${element.properties.name
                }.${this.getPropertyDisplayName(key)}`}</span>
            </DraggableElement>
          </div>
        );
      }
    };
    scales = scales.sort(
      (a: Scale<ObjectProperties>, b: Scale<ObjectProperties>) => {
        if (a.properties.name < b.properties.name) {
          return -1;
        }
        if (a.properties.name > b.properties.name) {
          return 1;
        }
        return 0;
      }
    );
    // Collect all used scales and object with properties into one list
    const propertyList = scales.flatMap((scale) => {
      return [0]
        .map(() => {
          return {
            scale,
            mark: null as ChartElement<ObjectProperties>,
            property: null as string,
            glyph: null as Glyph,
          };
        })
        .concat(
          // take all chart elements
          store.chart.elements
            // filter elements by scale
            .filter(filterElementByScalePredicate(scale._id))
            .flatMap((mark: ChartElement<ObjectProperties>) => {
              // Take all properties of object/element where scale was used and map them into {property, element, scale} object/element
              return filterElementProperties(scale._id, mark).map(
                (property) => {
                  return {
                    property,
                    mark,
                    scale,
                    glyph: null,
                  };
                }
              );
            })
        )
        .concat(
          store.chart.glyphs
            // map all glyphs into {glyph & marks} group
            .flatMap((glyph: Glyph): {
              glyph: Glyph;
              mark: Element<ObjectProperties>;
            }[] =>
              glyph.marks.map((mark) => {
                return {
                  glyph,
                  mark,
                };
              })
            )
            // filter elements by scale
            .filter(
              ({ mark }: { glyph: Glyph; mark: Element<ObjectProperties> }) =>
                filterElementByScalePredicate(scale._id)(mark)
            )
            // Take all properties of object/element where scale was used and map them into {property, element, scale} object/element
            .flatMap(
              ({
                mark,
                glyph,
              }: {
                glyph: Glyph;
                mark: Element<ObjectProperties>;
              }) => {
                return filterElementProperties(scale._id, mark).map(
                  (property) => {
                    return {
                      property,
                      mark,
                      scale,
                      glyph,
                    };
                  }
                );
              }
            )
        );
    });

    return (
      <div className="charticulator__object-list-editor charticulator__object-scales">
        <Button
          style={{
            width: '100%'
          }}
          onClick={() => this.setState({ createDialog: true })}>
            {strings.scaleEditor.createScale}
        </Button>
        <ReorderListView
          restrict={true}
          enabled={true}
          onReorder={(IndexA, IndexB) => {
            // Drag properties item only
            if (!propertyList[IndexA].property || IndexA === IndexB) {
              return;
            }

            // Find next scale in the list
            if (IndexB > 0) {
              IndexB--;
            }
            while (
              IndexB > 0 &&
              !propertyList[IndexB] &&
              propertyList[IndexB].property != null
            ) {
              IndexB--;
            }

            store.dispatcher.dispatch(
              new Actions.SetObjectMappingScale(
                propertyList[IndexA].mark,
                propertyList[IndexA].property,
                propertyList[IndexB].scale._id
              )
            );
          }}
        >
          {propertyList.map((el) => {
            return mapToUI(el.scale)(el.glyph, el.mark)(el.property);
          })}
        </ReorderListView>
        <Dialog
          modalType={"non-modal"}
          open={this.state.createDialog}>
          <DialogSurface>
            <DialogTitle>{strings.scaleEditor.createScale}</DialogTitle>
            <DialogBody>
              <AdvancedScaleEditor
                store={this.context.store}
                scale={this.state.currentScale}
                onScaleChange={(scale, scaleClass, domainSourceTable, domainSourceColumn, table) => {
                  const newState: any = {};
                  if (scale != this.state.scale) {
                    // TODO move dialog into AdvancedScaleEditor
                    newState.scale = scale;
                  }
                  if (scaleClass != this.state.scaleClass) {
                    newState.scaleClass = scaleClass;
                  }
                  if (domainSourceTable != this.state.domainSourceTable) {
                    newState.domainSourceTable = domainSourceTable;
                  }
                  if (domainSourceColumn != this.state.domainSourceColumn) {
                    newState.domainSourceColumn = domainSourceColumn;
                  }
                  if (table != this.state.table) {
                    newState.table = table;
                  }
                  
                  if (newState.scale || newState.scaleClass || newState.domainSourceColumn || newState.table) {
                    this.setState({
                      ...newState
                    });
                  }
                }}
              />
              <DialogActions>
                <Button
                  style={{
                    width: 150
                  }}
                  onClick={() => {
                  this.setState({
                    createDialog: false
                  });
                }}>
                  {strings.scaleEditor.close}
                </Button>
                <Button
                  style={{
                    width: 150
                  }}
                  appearance="primary"
                  onClick={() => {
                    if (!this.state.currentScale) {
                      store.chartManager.addScale(this.state.scale);
                    } else {
                      const property = propertyList.find(p => p.scale._id == this.state.currentScale._id && !!p.property && !!p.mark);
                      if (property) {
                        const column = this.state.table.columns.find(col => col.displayName == this.state.domainSourceColumn);
                        if (!column) {
                          return;
                        }
                        const valueType = column.type;
                        property.mark.mappings[property.property] = {
                          type: MappingType.scale,
                          table: this.state.domainSourceTable,
                          expression: `first(${this.state.domainSourceColumn})`,
                          valueType: valueType,
                          scale: this.state.scale._id,
                          attribute: property.property,
                          valueIndex: 0,
                        } as Specification.ScaleMapping;
                      }
                    }
                    this.setState({
                      createDialog: false,
                      currentScale: null
                    });
                    store.solveConstraintsAndUpdateGraphics();
                    store.emit(AppStore.EVENT_GRAPHICS);
                  }}>
                  {this.state.currentScale ? strings.scaleEditor.save : strings.scaleEditor.createScale}
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      </div>
    );
  }
}
