/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import {
  EventEmitter,
  EventSubscription,
  Expression,
  getById,
  Prototypes,
  Specification,
} from "../../../../core";
import { DragData } from "../../../actions";
import { ColorPicker } from "../../../components/fluentui_color_picker";
import { ContextedComponent } from "../../../context_component";
import { isKindAcceptable, type2DerivedColumns } from "../../dataset/common";
import { ScaleEditor } from "../scale_editor";
import { CharticulatorPropertyAccessors, DropZoneView } from "./types";
import { AppStore } from "../../../stores";
import { ScaleValueSelector } from "../scale_value_selector";
import { FunctionCall } from "../../../../core/expression";
import { FluentValueEditor } from "./fluentui_value_editor";
import { FluentInputExpression } from "./controls/fluentui_input_expression";
import { Button, ToggleButton } from "@fluentui/react-button";
import { Popover, PopoverSurface } from "@fluentui/react-popover";

import { Label } from "@fluentui/react-label";

import { FluentColumnLayout } from "./controls/fluentui_customized_components";
import { ObjectClass } from "../../../../core/prototypes";
import {
  DataFieldSelector,
  DataFieldSelectorValue,
} from "../../dataset/fluent_ui_data_field_selector";
import {
  Director,
  IContextualMenuItem,
  IDefaultValue,
  MenuItemBuilder,
} from "../../dataset/data_field_binding_builder";
import { strings } from "../../../../strings";
import { MappingType } from "../../../../core/specification";
import { EmptyMapping } from "./controls/fluentui_empty_mapping";
import { FluentUIWidgetManager } from "./fluentui_manager";
import { getDropzoneAcceptTables } from "./utils";

import {
  ArrowTrendingRegular,
  EraserRegular,
  LinkMultipleRegular,
} from "@fluentui/react-icons";

export interface MappingEditorProps {
  parent: Prototypes.Controls.WidgetManager & CharticulatorPropertyAccessors;
  attribute: string;
  type: Specification.AttributeType;
  options: Prototypes.Controls.MappingEditorOptions;
  store?: AppStore;
}

export interface MappingEditorState {
  showNoneAsValue: boolean;
  isDataFieldValueSelectionOpen: boolean;
  isColorPickerOpen: boolean;
}

export class FluentMappingEditor extends React.Component<
  React.PropsWithChildren<MappingEditorProps>,
  MappingEditorState
> {
  public mappingButton: HTMLElement;
  public noneLabel: HTMLSpanElement;
  public scaleMappingDisplay: HTMLSpanElement;

  public updateEvents = new EventEmitter();

  public state: MappingEditorState = {
    showNoneAsValue: false,
    isDataFieldValueSelectionOpen: false,
    isColorPickerOpen: false,
  };

  public director: Director = null;

  private changeDataFieldValueSelectionState() {
    this.setState({
      ...this.state,
      isDataFieldValueSelectionOpen: !this.state.isDataFieldValueSelectionOpen,
    });
  }

  private changeColorPickerState() {
    this.setState({
      ...this.state,
      isColorPickerOpen: !this.state.isColorPickerOpen,
    });
  }

  private openDataFieldValueSelection(): JSX.Element {
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const mapping = parent.getAttributeMapping(attribute);
    const scaleMapping = mapping as Specification.ScaleMapping;
    if (scaleMapping?.scale) {
      const scaleObject = getById(
        this.props.store.chart.scales,
        scaleMapping.scale
      );
      return (
        <Popover open={this.state.isDataFieldValueSelectionOpen}>
          <PopoverSurface>
            <ScaleValueSelector
              scale={scaleObject}
              scaleMapping={mapping as any}
              store={this.props.store}
              onSelect={(index) => {
                const paresedExpression = Expression.parse(
                  scaleMapping.expression
                ) as FunctionCall;
                // change the second param of get function
                (paresedExpression.args[1] as any).value = index;
                scaleMapping.expression = paresedExpression.toString();
                this.props.parent.onEditMappingHandler(
                  this.props.attribute,
                  scaleMapping
                );
                this.changeDataFieldValueSelectionState();
              }}
            />
          </PopoverSurface>
        </Popover>
      );
    }
    return null;
  }

  private initiateValueEditor() {
    switch (this.props.type) {
      case "number":
      case "font-family":
      case "text":
        {
          this.setState({
            ...this.state,
            showNoneAsValue: true,
          });
        }
        break;
      case "color":
        {
          if (this.noneLabel == null) {
            return;
          }
          this.changeColorPickerState();
        }
        break;
    }
  }

  private setValueMapping(value: Specification.AttributeValue) {
    this.props.parent.onEditMappingHandler(this.props.attribute, {
      type: "value",
      value,
    } as Specification.ValueMapping);
  }

  public clearMapping() {
    this.props.parent.onEditMappingHandler(this.props.attribute, null);
    this.setState({
      ...this.state,
      showNoneAsValue: false,
    });
  }

  public mapData(
    data: DragData.DataExpression,
    hints: Prototypes.DataMappingHints
  ) {
    this.props.parent.onMapDataHandler(this.props.attribute, data, hints);
  }

  public componentDidUpdate() {
    this.updateEvents.emit("update");
  }

  public getTableOrDefault() {
    if (this.props.options.table) {
      return this.props.options.table;
    } else {
      return this.props.parent.store.getTables()[0].name;
    }
  }

  constructor(props: MappingEditorProps) {
    super(props);
    this.director = new Director();
    this.director.setBuilder(new MenuItemBuilder());
  }

  private renderValueEditor(value: Specification.AttributeValue, setMappingButton?: (e: HTMLElement) => void){
    let placeholderText = this.props.options.defaultAuto
      ? strings.core.auto
      : strings.core.none;
    if (this.props.options.defaultValue != null) {
      placeholderText = this.props.options.defaultValue.toString();
    }
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const options = this.props.options;
    const mapping = parent.getAttributeMapping(attribute);

    const table = mapping ? (mapping as any).table : options.table;
    const builderProps = getMenuProps.bind(this)(parent, attribute, options);
    const mainMenuItems: IContextualMenuItem[] = this.director.buildFieldsMenu(
      builderProps.onClick,
      builderProps.defaultValue,
      parent.store,
      this,
      attribute,
      table,
      options.acceptKinds
    );
    const menuRender = this.director.menuRender(mainMenuItems, `conditionedBy-${attribute}`,mapping, {
      text:
        this.props.type == Specification.AttributeType.Boolean
          ? strings.attributesPanel.conditionedBy
          : null,
    }, setMappingButton);

    return (
      <React.Fragment key={`mapping-editor-value-fragment-${attribute}`}>
        <FluentValueEditor
          key={`mapping-editor-value-${attribute}`}
          label={this.props.options.label}
          value={value}
          type={this.props.type}
          placeholder={placeholderText}
          onClear={() => this.clearMapping()}
          onEmitValue={(value) => this.setValueMapping(value)}
          onEmitMapping={(mapping) =>
            this.props.parent.onEditMappingHandler(
              this.props.attribute,
              mapping
            )
          }
          onBeginDataFieldSelection={() => {
            if (this.mappingButton) {
              this.mappingButton.click();
            }
          }}
          getTable={() => this.getTableOrDefault()}
          hints={this.props.options.hints}
          numberOptions={this.props.options.numberOptions}
          stopPropagation={this.props.options.stopPropagation}
          mainMenuItems={mainMenuItems}
          menuRender={menuRender}
        />
      </React.Fragment>
    );
  }

  private renderColorPicker(): JSX.Element {
    return (
      <Popover open={this.state.isColorPickerOpen}>
        <PopoverSurface>
          <ColorPicker
            store={this.props.store}
            defaultValue={null}
            allowNull={true}
            onPick={(color) => {
              if (color == null) {
                this.clearMapping();
              } else {
                this.setValueMapping(color);
              }
            }}
            closePicker={() => {
              this.changeColorPickerState();
            }}
            parent={this}
          />
        </PopoverSurface>
      </Popover>
    );
  }

  private renderCurrentAttributeMapping(setMappingButton?: (e: HTMLElement) => void){
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const options = this.props.options;
    const mapping = parent.getAttributeMapping(attribute);
    if (!mapping) {
      if (options.defaultValue != undefined) {
        return this.renderValueEditor(options.defaultValue, setMappingButton);
      } else {
        let alwaysShowNoneAsValue = false;
        if (
          this.props.type == Specification.AttributeType.Number ||
          this.props.type == Specification.AttributeType.Enum ||
          this.props.type == Specification.AttributeType.Image
        ) {
          alwaysShowNoneAsValue = true;
        }
        if (this.state.showNoneAsValue || alwaysShowNoneAsValue) {
          return this.renderValueEditor(null, setMappingButton);
        } else {
          const onClick = () => {
            if (!mapping || (mapping as any).valueIndex == undefined) {
              this.initiateValueEditor();
            }
          };
          return (
            <EmptyMapping
              options={options}
              onClick={onClick.bind(this)}
              renderColorPicker={this.renderColorPicker.bind(this)}
              type={this.props.type}
            />
          );
        }
      }
    } else {
      switch (mapping.type) {
        case Specification.MappingType.value: {
          const valueMapping = mapping as Specification.ValueMapping;
          return this.renderValueEditor(valueMapping.value, setMappingButton);
        }
        case Specification.MappingType.text: {
          const textMapping = mapping as Specification.TextMapping;
          return (
            <FluentInputExpression
              key={`mapping-expression-${this.props.attribute}`}
              label={this.props.options.label}
              defaultValue={textMapping.textExpression}
              textExpression={true}
              value={textMapping.textExpression}
              validate={(value) =>
                parent.store.verifyUserExpressionWithTable(
                  value,
                  textMapping.table,
                  { textExpression: true, expectedTypes: ["string"] }
                )
              }
              allowNull={true}
              onEnter={(newValue) => {
                if (newValue == null || newValue.trim() == "") {
                  this.clearMapping();
                } else {
                  if (
                    Expression.parseTextExpression(newValue).isTrivialString()
                  ) {
                    this.props.parent.onEditMappingHandler(
                      this.props.attribute,
                      {
                        type: Specification.MappingType.value,
                        value: newValue,
                      } as Specification.ValueMapping
                    );
                  } else {
                    this.props.parent.onEditMappingHandler(
                      this.props.attribute,
                      {
                        type: Specification.MappingType.text,
                        table: textMapping.table,
                        textExpression: newValue,
                      } as Specification.TextMapping
                    );
                  }
                }
                return true;
              }}
            />
          );
        }
        case Specification.MappingType.scale: {
          const scaleMapping = mapping as Specification.ScaleMapping;
          const table = mapping ? (mapping as any).table : options.table;
          const builderProps = getMenuProps.bind(this)(
            parent,
            attribute,
            options
          );
          const mainMenuItems: IContextualMenuItem[] = this.director.buildFieldsMenu(
            builderProps.onClick,
            builderProps.defaultValue,
            parent.store,
            this,
            attribute,
            table,
            options.acceptKinds
          );

          if (scaleMapping.scale) {
            return (
              <React.Fragment 
                key={`mapping-scale-${this.props.attribute}`}
              >
                <FluentColumnLayout
                  style={{
                    justifyContent: "center",
                  }}
                >
                  {this.props.options.label ? (
                    <Label
                      style={{
                        flex: 1,
                      }}
                    >
                      {this.props.options.label}
                    </Label>
                  ) : null}
                    {this.director.menuRender(mainMenuItems, `mapping-scale-${this.props.attribute}`, scaleMapping, {
                      icon: React.createElement(ArrowTrendingRegular),
                    }, setMappingButton)}
                </FluentColumnLayout>
              </React.Fragment>
            );
          } else {
            return (
              <React.Fragment key={`mapping-no-scale-${this.props.attribute}`}>
                {this.props.options.label ? (
                  <Label>{this.props.options.label}</Label>
                ) : null}
                <Button
                  ref={(e) => (this.mappingButton = e)}
                  icon={<ArrowTrendingRegular />}
                >
                  {scaleMapping.expression}
                </Button>
              </React.Fragment>
            );
          }
        }
        case Specification.MappingType.expressionScale: {
          const scaleMapping = mapping as Specification.ScaleValueExpressionMapping;
          const table = mapping ? scaleMapping.table : options.table;
          const builderProps = getMenuProps.bind(this)(
            parent,
            attribute,
            options
          );
          const mainMenuItems: IContextualMenuItem[] = this.director.buildFieldsMenu(
            builderProps.onClick,
            builderProps.defaultValue,
            parent.store,
            this,
            attribute,
            table,
            options.acceptKinds
          );
          return (
            <React.Fragment key={`mapping-expression-scale-${this.props.attribute}`}>
              <FluentColumnLayout
                style={{
                  justifyContent: "center",
                }}
              >
                {this.props.options.label ? (
                  <Label
                    style={{
                      flex: 1,
                    }}
                  >
                    {this.props.options.label}
                  </Label>
                ) : null}
                  {this.director.menuRender(mainMenuItems, `mapping-expression-scale-${this.props.attribute}`,scaleMapping, {
                    icon: <ArrowTrendingRegular />,
                  }, setMappingButton)}
              </FluentColumnLayout>
            </React.Fragment>
          );
        }
        default: {
          return <span>(...)</span>;
        }
      }
    }
  }

  public render() {
    const parent = this.props.parent;
    const attribute = this.props.attribute;
    const options = this.props.options;
    const currentMapping = parent.getAttributeMapping(attribute);

    // If there is a mapping, also not having default or using auto
    const shouldShowBindData = parent.onMapDataHandler != null;
    const isDataMapping =
      currentMapping != null &&
      (currentMapping.type == "scale" || currentMapping.type == "value");
    const valueIndex = currentMapping && (currentMapping as any).valueIndex;

    if (this.props.options.openMapping) {
      setTimeout(() => {
        FluentMappingEditor.openEditor(
          (currentMapping as Specification.ScaleMapping)?.expression,
          true,
          this.mappingButton
        );
      }, 0);
    }

    const table = currentMapping
      ? (currentMapping as any).table
      : options.table;

    const builderProps = getMenuProps.bind(this)(parent, attribute, options);

    const mainMenuItems: IContextualMenuItem[] = this.director.buildFieldsMenu(
      builderProps.onClick,
      builderProps.defaultValue,
      parent.store,
      this,
      attribute,
      table,
      options.acceptKinds
    );
    const acceptTables = getDropzoneAcceptTables(
      this.props.parent as FluentUIWidgetManager,
      options.acceptLinksTable
    );

    const setMappingButton = (e) => (this.mappingButton = e);

    return (
      <div ref={(e) => (this.noneLabel = e)} key={`dz-div-${attribute}`}>
        <DropZoneView
          key={`dz-view-wrap--${attribute}`}
          filter={(data) => {
            if (
              acceptTables.length > 0 &&
              !acceptTables.includes(data.table?.name)
            ) {
              return false;
            }
            if (!shouldShowBindData) {
              return false;
            }
            if (data instanceof DragData.DataExpression) {
              return isKindAcceptable(data.metadata.kind, options.acceptKinds);
            } else {
              return false;
            }
          }}
          onDrop={(data: DragData.DataExpression, point, modifiers) => {
            if (!options.hints) {
              options.hints = {};
            }
            options.hints.newScale = modifiers.shiftKey;
            options.hints.scaleID = data.scaleID;

            const parsedExpression = Expression.parse(
              data.expression
            ) as FunctionCall;

            if (data.allowSelectValue && parsedExpression.name !== "get") {
              data.expression = `get(${data.expression}, 0)`;
            }
            // because original mapping allowed it
            if (parsedExpression.name === "get") {
              data.allowSelectValue = true;
            }
            this.mapData(data, {
              ...options.hints,
              allowSelectValue: data.allowSelectValue,
            });
          }}
          className="charticulator__widget-control-mapping-editor"
        >
          {parent.styledHorizontal(
            {
              alignItems: "flex-end",
            },
            [1, 0],
            this.renderCurrentAttributeMapping(setMappingButton),
            <div
              key={`dz-view-${attribute}`}
              style={{
                display: "flex",
                alignItems: "flex-end",
              }}
            >
              {isDataMapping ? (
                <Button
                  icon={<EraserRegular />}
                  title={strings.mappingEditor.remove}
                  onClick={() => {
                    if (parent.getAttributeMapping(attribute)) {
                      this.clearMapping();
                    }
                    this.setState({
                      ...this.state,
                      showNoneAsValue: false,
                    });
                  }}
                />
              ) : null}
              {(valueIndex === undefined || valueIndex === null) &&
              shouldShowBindData ? (
                this.director.menuRender(mainMenuItems, `dz-view-${attribute}`,null, {
                  icon: "general/bind-data",
                }, setMappingButton)
              ) : null}
              {valueIndex !== undefined && valueIndex !== null ? (
                <ToggleButton
                  icon={<LinkMultipleRegular />}
                  id="dataFieldValueSelection"
                  title={strings.mappingEditor.bindDataValue}
                  ref={(e) => (this.mappingButton = e)}
                  onClick={() => {
                    this.changeDataFieldValueSelectionState();
                  }}
                  checked={isDataMapping}
                ></ToggleButton>
              ) : null}
              {this.openDataFieldValueSelection()}
            </div>
          )}
        </DropZoneView>
      </div>
    );
  }

  public static menuKeyClick(derivedExpression: string) {
    setTimeout(() => {
      const aggContainer = document.querySelector("body :last-child.ms-Layer");
      const button: HTMLButtonElement = aggContainer?.querySelector(
        "button.ms-ContextualMenu-splitMenu"
      );
      if (button == null) {
        const derColumnsContainer = document.querySelector(
          "body :last-child.ms-Layer"
        );
        const derColumnsContainerXpath = `//ul//span[text()="${derivedExpression}"]`;
        const derMenuItem = document.evaluate(
          derColumnsContainerXpath,
          derColumnsContainer,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue as HTMLSpanElement;
        setTimeout(() => {
          derMenuItem?.click();
          setTimeout(() => {
            const aggContainer = document.querySelector(
              "body :last-child.ms-Layer"
            );
            const splitButton: HTMLButtonElement = aggContainer?.querySelector(
              "button.ms-ContextualMenu-splitMenu"
            );
            splitButton?.click();
          }, 100);
        }, 100);
      } else {
        button?.click();
      }
    }, 100);
  }

  public static openEditor(
    expressionString: string,
    clickOnButton: boolean,
    mappingButton: HTMLElement
  ) {
    setTimeout(() => {
      if (clickOnButton) {
        mappingButton?.scrollIntoView();
        mappingButton?.click();
      }
      setTimeout(() => {
        let expression: string = null;
        let expressionAggregation: string = null;
        let derivedExpression: string = null;
        if (expressionString != null) {
          const parsed = Expression.parse(expressionString);

          if (parsed instanceof Expression.FunctionCall) {
            expression = parsed.args[0].toString();
            expressionAggregation = parsed.name;

            //dataFieldValueSelection
            if (expressionAggregation.startsWith("get")) {
              return;
            }

            //derived columns
            if (expression.startsWith("date.")) {
              derivedExpression = type2DerivedColumns.date.find((item) =>
                expression.startsWith(item.function)
              )?.displayName;
            }
          }

          expression = expression?.split("`").join("");
          try {
            const aggContainer = document.querySelector(
              "body :last-child.fui-PopoverSurface"
            );
            // const xpath = `//button[contains(text(), "${expression}")]`;
            // const button = document.evaluate(
            //   xpath,
            //   aggContainer,
            //   null,
            //   XPathResult.FIRST_ORDERED_NODE_TYPE,
            //   null
            // ).singleNodeValue as HTMLSpanElement;
            let clicked = false;
            aggContainer.querySelectorAll("button").forEach((button) => {
              if (button.textContent === expression && !clicked) {
                button.click();
                clicked = true;
              }
            });

            if (!clicked) {
              const derSubXpath = `//ul//span[contains(text(), "${derivedExpression}")]`;
              const derElement = document.evaluate(
                derSubXpath,
                document,
                null,
                XPathResult.FIRST_ORDERED_NODE_TYPE,
                null
              ).singleNodeValue as HTMLSpanElement;
              setTimeout(() => {
                derElement?.click();
                FluentMappingEditor.menuKeyClick(derivedExpression);
              });
            }
          } catch (e) {
            console.log(e);
          }
        }
      }, 0);
    });
  }
}

export interface DataMappAndScaleEditorProps {
  attribute: string;
  defaultMapping: Specification.Mapping;
  options: Prototypes.Controls.MappingEditorOptions;
  parent: FluentMappingEditor;
  onClose: () => void;
  alignLeft?: boolean;
  plotSegment: ObjectClass;
}
export interface DataMappAndScaleEditorState {
  currentMapping: Specification.Mapping;
}

export class DataMappAndScaleEditor extends ContextedComponent<
  DataMappAndScaleEditorProps,
  DataMappAndScaleEditorState
> {
  public state = {
    currentMapping: this.props.defaultMapping,
  };

  private tokens: EventSubscription[];

  public componentDidMount() {
    this.tokens = [
      this.props.parent.updateEvents.addListener("update", () => {
        this.setState({
          currentMapping: this.props.parent.props.parent.getAttributeMapping(
            this.props.attribute
          ),
        });
      }),
    ];
  }

  public componentWillUnmount() {
    for (const t of this.tokens) {
      t.remove();
    }
  }

  public renderScaleEditor() {
    const mapping = this.state.currentMapping;
    if (mapping && mapping.type == "scale") {
      const scaleMapping = mapping as Specification.ScaleMapping;
      if (scaleMapping.scale) {
        const scaleObject = getById(
          this.store.chart.scales,
          scaleMapping.scale
        );
        return (
          <ScaleEditor
            scale={scaleObject}
            scaleMapping={scaleMapping}
            store={this.store}
            plotSegment={this.props.plotSegment}
          />
        );
      }
    }
    return null;
  }

  public renderDataPicker() {
    const options = this.props.options;
    let currentExpression: string = null;
    const mapping = this.state.currentMapping;

    if (mapping != null && mapping.type == "scale") {
      currentExpression = (mapping as Specification.ScaleMapping).expression;
    }

    return (
      <div>
        <DataFieldSelector
          key={`data-selector-${this.props.attribute}`}
          table={mapping ? (mapping as any).table : options.table}
          datasetStore={this.store}
          kinds={options.acceptKinds}
          useAggregation={true}
          defaultValue={
            currentExpression
              ? { table: options.table, expression: currentExpression }
              : null
          }
          nullDescription={strings.core.none}
          nullNotHighlightable={true}
          onChange={(value) => {
            if (value != null) {
              this.props.parent.mapData(
                new DragData.DataExpression(
                  this.store.getTable(value.table),
                  value.expression,
                  value.type,
                  value.metadata,
                  value.rawExpression
                ),
                options.hints
              );
            } else {
              this.props.parent.clearMapping();
              this.props.onClose();
            }
          }}
        />
      </div>
    );
  }

  public render() {
    const scaleElement = this.renderScaleEditor();
    if (scaleElement) {
      return (
        <div className="charticulator__data-mapping-and-scale-editor">
          <div
            className={
              this.props.alignLeft ? "el-scale-editor-left" : "el-scale-editor"
            }
          >
            {scaleElement}
          </div>
          <div className="el-data-picker">{this.renderDataPicker()}</div>
        </div>
      );
    } else {
      return (
        <div className="charticulator__data-mapping-and-scale-editor">
          <div className="el-data-picker">{this.renderDataPicker()}</div>
        </div>
      );
    }
  }
}

export function parentOfType(p: ObjectClass, typeSought: string) {
  while (p) {
    if (Prototypes.isType(p.object.classID, typeSought)) {
      return p;
    }
    p = p.parent;
  }
}

function getMenuProps(
  parent: Prototypes.Controls.WidgetManager & CharticulatorPropertyAccessors,
  attribute: string,
  options: Prototypes.Controls.MappingEditorOptions
) {
  const currentMapping = parent.getAttributeMapping(attribute);

  const table = currentMapping ? (currentMapping as any).table : options.table;

  const onClick = (value: DataFieldSelectorValue) => {
    if (value != null) {
      this.mapData(
        new DragData.DataExpression(
          this.props.store.getTable(value.table),
          value.expression,
          value.type,
          value.metadata,
          value.rawExpression
        ),
        options.hints
      );
    } else {
      this.clearMapping();
    }
  };

  const mapping = parent.getAttributeMapping(attribute);
  let currentExpression = null;

  if (mapping != null) {
    if (mapping.type == MappingType.text) {
      currentExpression = (mapping as Specification.TextMapping).textExpression;
    }
    if (mapping.type == MappingType.scale) {
      currentExpression = (mapping as Specification.ScaleMapping).expression;
    }
  }

  const defaultValue: IDefaultValue = currentExpression
    ? {
        table: options?.table ?? table,
        expression: currentExpression,
        type: mapping?.type,
      }
    : null;

  return {
    onClick,
    defaultValue,
  };
}
