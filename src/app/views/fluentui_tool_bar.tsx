/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as R from "../resources";

import { EventSubscription } from "../../core";
import { Actions, DragData } from "../actions";
import {
  DraggableElement,
  FluentToolButton,
  SVGImageIcon,
} from "../components";
import { ContextedComponent, MainReactContext } from "../context_component";

import { LinkCreationPanel } from "./panels/link_creator";
import { LegendCreationPanel } from "./panels/legend_creator";
import { AppStore } from "../stores";
import { strings } from "../../strings";
import { LayoutDirection, UndoRedoLocation } from "../main_view";
import { useContext } from "react";

import { ToolbarButton } from "@fluentui/react-toolbar";
import { Popover } from "@fluentui/react-popover";
import { PopoverSurface } from "@fluentui/react-popover";
import { MenuPopover } from "@fluentui/react-menu";
import { Menu } from "@fluentui/react-menu";
import { MenuItem } from "@fluentui/react-menu";
import { MenuList } from "@fluentui/react-menu";
import { MenuTrigger } from "@fluentui/react-menu";
import { PopoverTrigger } from "@fluentui/react-popover";

import { getSVGIcon } from "../resources";
import { EditorType } from "../stores/app_store";
import { useState } from "react";
import { useEffect } from "react";

const minWidthToColapseButtons = Object.freeze({
  guides: 1090,
  plotSegments: 1120,
  scaffolds: 1211,
});

export const FluentUIToolbar: React.FC<{
  layout: LayoutDirection;
  undoRedoLocation: UndoRedoLocation;
  toolbarLabels: boolean;
  darkTheme?: boolean;
}> = (props) => {
  const { store } = useContext(MainReactContext);
  const [innerWidth, setInnerWidth] = useState(window.innerWidth);

  const resizeListener = () => {
    setInnerWidth(window.innerWidth);
  };

  useEffect(() => {
    setInnerWidth(window.innerWidth);
    window.addEventListener("resize", resizeListener);
    return () => {
      window.removeEventListener("resize", resizeListener);
    };
  }, [setInnerWidth]);

  const getGlyphToolItems = (labels: boolean = true) => {
    return [
      <>
        <>
          <span className={"charticulator__toolbar-horizontal-separator"} />
          {labels && (
            <span
              className={
                props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {strings.toolbar.marks}
            </span>
          )}
          <MultiObjectButton
            invertIcon={props.darkTheme}
            compact={props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.rect",
                title: strings.toolbar.rectangle,
                icon: "RectangleShape",
                options: '{"shape":"rectangle"}',
              },
              {
                classID: "mark.rect",
                title: strings.toolbar.ellipse,
                icon: "Ellipse",
                options: '{"shape":"ellipse"}',
              },
              {
                classID: "mark.rect",
                title: strings.toolbar.triangle,
                icon: "TriangleShape",
                options: '{"shape":"triangle"}',
              },
              {
                classID: "mark.polygon",
                title: strings.toolbar.polygon,
                icon: "Polygon",
                options: '{"closed":"true", "pointsCount": "3"}',
              }
            ]}
          />
          <ObjectButton
            invertIcon={props.darkTheme}
            classID="mark.symbol"
            title={strings.toolbar.symbol}
            icon="Shapes"
          />

          <ObjectButton
            invertIcon={props.darkTheme}
            classID="mark.line"
            title={strings.toolbar.line}
            icon="Line"
          />
          <MultiObjectButton
            invertIcon={props.darkTheme}
            compact={props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.text",
                title: strings.toolbar.text,
                icon: "FontColorA",
              },
              {
                classID: "mark.textbox",
                title: strings.toolbar.textbox,
                icon: "TextField",
              },
            ]}
          />
          <MultiObjectButton
            invertIcon={props.darkTheme}
            compact={props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "mark.icon",
                title: strings.toolbar.icon,
                icon: "ImagePixel",
              },
              {
                classID: "mark.image",
                title: strings.toolbar.image,
                icon: "FileImage",
              },
            ]}
          />
          <ObjectButton
            invertIcon={props.darkTheme}
            classID="mark.data-axis"
            title={strings.toolbar.dataAxis}
            icon="mark/data-axis"
          />
          {store.editorType === EditorType.Embedded ? (
            <ObjectButton
              invertIcon={props.darkTheme}
              classID="mark.nested-chart"
              title={strings.toolbar.nestedChart}
              icon="BarChartVerticalFilter"
            />
          ) : null}
          {props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
            <>
              <span className={"charticulator__toolbar-horizontal-separator"} />
              <FluentToolButton
                invertIcon={props.darkTheme}
                title={strings.menuBar.undo}
                disabled={store.historyManager.statesBefore.length === 0}
                icon="Undo"
                onClick={() => new Actions.Undo().dispatch(store.dispatcher)}
              />
              <FluentToolButton
                invertIcon={props.darkTheme}
                title={strings.menuBar.redo}
                disabled={store.historyManager.statesAfter.length === 0}
                icon="Redo"
                onClick={() => new Actions.Redo().dispatch(store.dispatcher)}
              />
            </>
          ) : null}
        </>
      </>,
    ];
  };

  // eslint-disable-next-line max-lines-per-function
  const getChartToolItems = (labels: boolean = true) => {
    return [
      <>
        <LinkButton invertIcon={props.darkTheme} label={true} />
        <LegendButton invertIcon={props.darkTheme}/>
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.guides}
          </span>
        )}
        <MultiObjectButton
          invertIcon={props.darkTheme}
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "guide-y",
              title: strings.toolbar.guideY,
              icon: "guide/x",
              options: '{"shape":"rectangle"}',
            },
            {
              classID: "guide-x",
              title: strings.toolbar.guideX,
              icon: "guide/y",
              options: '{"shape":"ellipse"}',
            },
            {
              classID: "guide-coordinator-x",
              title: strings.toolbar.guideX,
              icon: "guide/coordinator-x",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "guide-coordinator-y",
              title: strings.toolbar.guideY,
              icon: "guide/coordinator-y",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "guide-coordinator-polar",
              title: strings.toolbar.guidePolar,
              icon: "guide-coordinator-polar",
              options: "",
            },
          ]}
        />
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <>
            <span
              className={
                props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {props.layout === LayoutDirection.Vertical
                ? strings.toolbar.plot
                : strings.toolbar.plotSegments}
            </span>
          </>
        )}
        <MultiObjectButton
          invertIcon={props.darkTheme}
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "plot-segment.cartesian",
              title: strings.toolbar.region2D,
              icon: "BorderDot",
              noDragging: true,
            },
            {
              classID: "plot-segment.line",
              title: strings.toolbar.line,
              icon: "Line",
              noDragging: true,
            },
          ]}
        />
        <>
          <span className={"charticulator__toolbar-horizontal-separator"} />
          {labels && (
            <span
              className={
                props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {strings.toolbar.scaffolds}
            </span>
          )}
          <MultiObjectButton
            invertIcon={props.darkTheme}
            compact={props.layout === LayoutDirection.Vertical}
            tools={[
              {
                classID: "scaffold/cartesian-x",
                title: strings.toolbar.lineH,
                icon: "scaffold/cartesian-x",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("cartesian-x"),
              },
              {
                classID: "scaffold/cartesian-y",
                title: strings.toolbar.lineV,
                icon: "scaffold/cartesian-y",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("cartesian-y"),
              },
              {
                classID: "scaffold/circle",
                title: strings.toolbar.polar,
                icon: "scaffold/circle",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("polar"),
              },
              {
                classID: "scaffold/curve",
                title: strings.toolbar.curve,
                icon: "scaffold/curve",
                onClick: () => null,
                onDrag: () => new DragData.ScaffoldType("curve"),
              },
            ]}
          />
        </>
      </>,
    ];
  };

  const renderScaffoldButton = () => {
    return (
      <MultiObjectButton
        invertIcon={props.darkTheme}
        compact={props.layout === LayoutDirection.Vertical}
        tools={[
          {
            classID: "scaffold/cartesian-x",
            title: strings.toolbar.lineH,
            icon: "scaffold/cartesian-x",
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("cartesian-x"),
          },
          {
            classID: "scaffold/cartesian-y",
            title: strings.toolbar.lineV,
            icon: "scaffold/cartesian-y",
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("cartesian-y"),
          },
          {
            classID: "scaffold/circle",
            title: strings.toolbar.polar,
            icon: "scaffold/circle",
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("polar"),
          },
          {
            classID: "scaffold/curve",
            title: strings.toolbar.curve,
            icon: "scaffold/curve",
            onClick: () => null,
            onDrag: () => new DragData.ScaffoldType("curve"),
          },
        ]}
      />
    );
  };

  const renderGuidesButton = () => {
    return (
      <MultiObjectButton
        invertIcon={props.darkTheme}
        compact={props.layout === LayoutDirection.Vertical}
        tools={[
          {
            classID: "guide-y",
            title: strings.toolbar.guideY,
            icon: "guide/x",
          },
          {
            classID: "guide-x",
            title: strings.toolbar.guideX,
            icon: "guide/y",
            options: "",
          },
          {
            classID: "guide-coordinator-x",
            title: strings.toolbar.guideX,
            icon: "CharticulatorGuideX",
            options: "",
          },
          {
            classID: "guide-coordinator-y",
            title: strings.toolbar.guideY,
            icon: "CharticulatorGuideY",
            options: "",
          },
          {
            classID: "guide-coordinator-polar",
            title: strings.toolbar.guidePolar,
            icon: "CharticulatorGuideCoordinator",
            options: "",
          },
        ]}
      />
    );
  };

  // eslint-disable-next-line max-lines-per-function
  const getToolItems = (
    labels: boolean = true,
    innerWidth: number = window.innerWidth
  ) => {
    return (
      <>
        {props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
          <>
            <FluentToolButton
              invertIcon={props.darkTheme}
              title={strings.menuBar.undo}
              disabled={store.historyManager.statesBefore.length === 0}
              icon={"Undo"}
              onClick={() => new Actions.Undo().dispatch(store.dispatcher)}
            />
            <FluentToolButton
              invertIcon={props.darkTheme}
              title={strings.menuBar.redo}
              disabled={store.historyManager.statesAfter.length === 0}
              icon={"Redo"}
              onClick={() => new Actions.Redo().dispatch(store.dispatcher)}
            />
            <span className={"charticulator__toolbar-horizontal-separator"} />
          </>
        ) : null}
        {labels && (
          <span
            className={
              props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.marks}
          </span>
        )}
        <MultiObjectButton
          invertIcon={props.darkTheme}
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.rect",
              title: strings.toolbar.rectangle,
              icon: "RectangleShape",
              options: '{"shape":"rectangle"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.ellipse,
              icon: "Ellipse",
              options: '{"shape":"ellipse"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.triangle,
              icon: "TriangleShape",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "mark.polygon",
              title: strings.toolbar.polygon,
              icon: "Polygon",
              options: '{"closed":"true", "pointsCount": "3"}',
            },
          ]}
        />
        <ObjectButton
          invertIcon={props.darkTheme} classID="mark.symbol" title="Symbol" icon="Shapes" />
        <ObjectButton
          invertIcon={props.darkTheme} classID="mark.line" title="Line" icon="Line" />
        <MultiObjectButton
          invertIcon={props.darkTheme}
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.text",
              title: strings.toolbar.text,
              icon: "FontColorA",
            },
            {
              classID: "mark.textbox",
              title: strings.toolbar.textbox,
              icon: "TextField",
            },
          ]}
        />
        <MultiObjectButton
          invertIcon={props.darkTheme}
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.icon",
              title: strings.toolbar.icon,
              icon: "ImagePixel",
            },
            {
              classID: "mark.image",
              title: strings.toolbar.image,
              icon: "FileImage",
            },
          ]}
        />
        <span className={"charticulator__toolbar-horizontal-separator"} />
        <ObjectButton
          invertIcon={props.darkTheme}
          classID="mark.data-axis"
          title={strings.toolbar.dataAxis}
          icon="mark/data-axis"
        />
        <ObjectButton
          invertIcon={props.darkTheme}
          classID="mark.nested-chart"
          title={strings.toolbar.nestedChart}
          icon="BarChartVerticalFilter"
        />
        <LegendButton invertIcon={props.darkTheme} />
        <span className={"charticulator__toolbar-horizontal-separator"} />
        <LinkButton invertIcon={props.darkTheme} label={labels} />
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.guides}
          </span>
        )}
        {innerWidth > minWidthToColapseButtons.guides ? (
          <>
            <ObjectButton
              invertIcon={props.darkTheme}
              classID="guide-y"
              title={strings.toolbar.guideY}
              icon="guide/x"
            />
            <ObjectButton
              invertIcon={props.darkTheme}
              classID="guide-x"
              title={strings.toolbar.guideX}
              icon="guide/y"
            />
            <ObjectButton
              invertIcon={props.darkTheme}
              classID="guide-coordinator-x"
              title={strings.toolbar.guideX}
              icon="guide/coordinator-x"
            />
            <ObjectButton
              invertIcon={props.darkTheme}
              classID="guide-coordinator-y"
              title={strings.toolbar.guideY}
              icon="guide/coordinator-y"
            />
            <ObjectButton
              invertIcon={props.darkTheme}
              classID="guide-coordinator-polar"
              title={strings.toolbar.guidePolar}
              icon="guide/coordinator-polar"
            />
          </>
        ) : (
          renderGuidesButton()
        )}
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <>
            <span
              className={
                props.layout === LayoutDirection.Vertical
                  ? "charticulator__toolbar-vertical-label"
                  : "charticulator__toolbar-label"
              }
            >
              {props.layout === LayoutDirection.Vertical
                ? strings.toolbar.plot
                : strings.toolbar.plotSegments}
            </span>
          </>
        )}
        <ObjectButton
          invertIcon={props.darkTheme}
          classID="plot-segment.cartesian"
          title={strings.toolbar.region2D}
          icon="BorderDot"
          noDragging={true}
        />
        <ObjectButton
          invertIcon={props.darkTheme}
          classID="plot-segment.line"
          title={strings.toolbar.line}
          icon="Line"
          noDragging={true}
        />
        <span className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <span
            className={
              props.layout === LayoutDirection.Vertical
                ? "charticulator__toolbar-vertical-label"
                : "charticulator__toolbar-label"
            }
          >
            {strings.toolbar.scaffolds}
          </span>
        )}
        {innerWidth > minWidthToColapseButtons.scaffolds ? (
          <>
            <ScaffoldButton
              darkTheme={props.darkTheme}
              type="cartesian-x"
              title={strings.toolbar.lineH}
              icon="scaffold/cartesian-x"
              currentTool={store.currentTool}
            />
            <ScaffoldButton
              darkTheme={props.darkTheme}
              type="cartesian-y"
              title={strings.toolbar.lineV}
              icon="scaffold/cartesian-y"
              currentTool={store.currentTool}
            />
            <ScaffoldButton
              darkTheme={props.darkTheme}
              type="polar"
              title={strings.toolbar.polar}
              icon="scaffold/circle"
              currentTool={store.currentTool}
            />
            <ScaffoldButton
              darkTheme={props.darkTheme}
              type="curve"
              title={strings.toolbar.curve}
              icon="scaffold/curve"
              currentTool={store.currentTool}
            />
          </>
        ) : (
          renderScaffoldButton()
        )}
      </>
    );
  };

  let tooltipsItems = [];
  if (store.editorType === "embedded") {
    const chartToolItems = getChartToolItems(props.toolbarLabels);
    const glyphToolItems = getGlyphToolItems(props.toolbarLabels);
    tooltipsItems = [...chartToolItems, ...glyphToolItems];
  } else {
    tooltipsItems = [getToolItems(props.toolbarLabels, innerWidth)];
  }
  return (
    <>
      <div
        className={
          props.layout === LayoutDirection.Vertical
            ? "charticulator__toolbar-vertical"
            : "charticulator__toolbar-horizontal"
        }
      >
        <div className="charticulator__toolbar-buttons-align-left">
          {tooltipsItems.map((item, index) => {
            return (
              <React.Fragment key={index}>
                <div
                  key={index}
                  className={
                    props.layout === LayoutDirection.Vertical
                      ? "charticulator__toolbar-vertical-group"
                      : "charticulator__toolbar-horizontal-group"
                  }
                >
                  {item}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </>
  );
};

export interface ObjectButtonProps {
  invertIcon?: boolean;
  title: string;
  text?: string;
  classID: string;
  icon: string;
  options?: string;
  noDragging?: boolean;
  onClick?: () => void;
  onDrag?: () => any;
  compact?: boolean;
}

export class ObjectButton extends ContextedComponent<
  ObjectButtonProps,
  Record<string, unknown>
> {
  public token: EventSubscription;

  public getIsActive() {
    return (
      this.store.currentTool == this.props.classID &&
      this.store.currentToolOptions == this.props.options
    );
  }

  public componentDidMount() {
    this.token = this.context.store.addListener(
      AppStore.EVENT_CURRENT_TOOL,
      () => {
        this.forceUpdate();
      }
    );
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    return (
      <>
        <DraggableElement
          dragData={
            this.props.noDragging
              ? null
              : this.props.onDrag
                ? this.props.onDrag
                : () => {
                  return new DragData.ObjectType(
                    this.props.classID,
                    this.props.options
                  );
                }
          }
          onDragStart={() => this.setState({ dragging: true })}
          onDragEnd={() => this.setState({ dragging: false })}
          renderDragElement={() => {
            return [
              <SVGImageIcon
                invert={this.props.invertIcon}
                url={getSVGIcon(this.props.icon)}
                width={32}
                height={32}
              />,
              { x: -16, y: -16 },
            ];
          }}
        >
          <ToolbarButton
            appearance="subtle"
            icon={
              typeof this.props.icon === "string" ? (
                <SVGImageIcon
                  invert={this.props.invertIcon}
                  url={R.getSVGIcon(this.props.icon)}
                  width={20}
                  height={20}
                />
              ) : (
                this.props.icon
              )
            }
            title={this.props.title}
            value={this.props.text}
            // toggle={this.getIsActive()}
            onClick={() => {
              this.dispatch(
                new Actions.SetCurrentTool(
                  this.props.classID,
                  this.props.options
                )
              );
              if (this.props.onClick) {
                this.props.onClick();
              }
            }}
          />
        </DraggableElement>
      </>
    );
  }
}

export class MultiObjectButton extends ContextedComponent<
  {
    compact?: boolean;
    tools: ObjectButtonProps[];
    invertIcon?: boolean;
  },
  {
    currentSelection: {
      classID: string;
      options: string;
    };
    dragging: boolean;
  }
> {
  public state = {
    currentSelection: {
      classID: this.props.tools[0].classID,
      options: this.props.tools[0].options,
    },
    dragging: false,
  };
  public token: EventSubscription;

  public isActive() {
    const store = this.store;
    for (const item of this.props.tools) {
      if (
        item.classID == store.currentTool &&
        item.options == store.currentToolOptions
      ) {
        return true;
      }
    }
    return false;
  }

  public getSelectedTool() {
    for (const item of this.props.tools) {
      if (
        item.classID == this.state.currentSelection.classID &&
        item.options == this.state.currentSelection.options
      ) {
        return item;
      }
    }
    return this.props.tools[0];
  }

  public componentDidMount() {
    this.token = this.store.addListener(AppStore.EVENT_CURRENT_TOOL, () => {
      for (const item of this.props.tools) {
        // If the tool is within the tools defined here, we update the current selection
        if (
          this.store.currentTool == item.classID &&
          this.store.currentToolOptions == item.options
        ) {
          this.setState({
            currentSelection: {
              classID: item.classID,
              options: item.options,
            },
          });
          break;
        }
      }
      this.forceUpdate();
    });
  }

  public componentWillUnmount() {
    this.token.remove();
  }

  public render() {
    const currentTool = this.getSelectedTool();

    return (
      <DraggableElement
        dragData={() => {
          if (currentTool?.onDrag) {
            return currentTool?.onDrag();
          }
          return new DragData.ObjectType(
            currentTool.classID,
            currentTool.options
          );
        }}
        onDragStart={() => this.setState({ dragging: true })}
        onDragEnd={() => this.setState({ dragging: false })}
        renderDragElement={() => {
          return [
            <SVGImageIcon
              invert={this.props.invertIcon}
              url={R.getSVGIcon(currentTool.icon)}
              height={20}
              width={20}
              aria-hidden="true"
            />,
            { x: 16, y: 16 },
          ];
        }}
      >
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <ToolbarButton
              appearance="subtle"
              icon={
                <SVGImageIcon
                  invert={this.props.invertIcon}
                  url={R.getSVGIcon(currentTool.icon)}
                  height={20}
                  width={20}
                ></SVGImageIcon>
              }
              onClick={() => {
                if (currentTool) {
                  this.dispatch(
                    new Actions.SetCurrentTool(
                      currentTool.classID,
                      currentTool.options
                    )
                  );
                }
              }}
            />
          </MenuTrigger>

          <MenuPopover>
            <MenuList>
              {this.props.tools.map((tool, index) => {
                return (
                  <MenuItem
                    key={`menu-${index}`}
                    onClick={() => {
                      if (tool) {
                        this.dispatch(
                          new Actions.SetCurrentTool(tool.classID, tool.options)
                        );
                      }
                    }}
                    icon={
                      <SVGImageIcon
                        invert={this.props.invertIcon}
                        key={`icon-${index}`}
                        url={R.getSVGIcon(tool.icon)}
                        height={20}
                        width={20}
                      ></SVGImageIcon>
                    }
                  >
                    {tool.title}{" "}
                  </MenuItem>
                );
              })}
            </MenuList>
          </MenuPopover>
        </Menu>
      </DraggableElement>
    );
  }
}

export const ScaffoldButton: React.FC<{
  currentTool: string;
  title: string;
  type: string;
  icon: string;
  darkTheme?: boolean;
}> = (props) => {
  return (
    <FluentToolButton
      icon={props.icon}
      invertIcon={props.darkTheme}
      active={props.currentTool == props.type}
      title={props.title}
      onClick={() => {
        // this.dispatch(new Actions.SetCurrentTool(this.props.type));
      }}
      dragData={() => {
        return new DragData.ScaffoldType(props.type);
      }}
    />
  );
};

export const LinkButton: React.FC<{
  label: boolean;
  invertIcon?: boolean;
}> = (props) => {
  // const { store } = React.useContext(MainReactContext);
  const [isOpen, openDialog] = React.useState(false);

  const button = React.useRef();

  return (
    <span id="linkCreator">
      <Popover
        open={isOpen}
        positioning={{
          positioningRef: button,
          position: "below",
        }}
      >
        <PopoverTrigger>
          <ToolbarButton
            ref={button}
            title={strings.toolbar.link}
            value={props.label ? strings.toolbar.link : ""}
            icon={
              <SVGImageIcon
                invert={props.invertIcon}
                url={R.getSVGIcon("CharticulatorLine")}
                height={20}
                width={20}
              />
            }
            // checked={store.currentTool == "link"}
            onClick={() => {
              openDialog(!isOpen);
            }}
          />
        </PopoverTrigger>
        <PopoverSurface>
          <LinkCreationPanel onFinish={() => openDialog(false)} />
        </PopoverSurface>
      </Popover>
    </span>
  );
};

export const LegendButton: React.FC<{
  invertIcon?: boolean;
}> = ({invertIcon}) => {
  // const { store } = React.useContext(MainReactContext);
  const [isOpen, setOpen] = React.useState(false);

  React.useEffect(() => {
    return () => {
      setOpen(false);
    };
  }, [setOpen]);

  return (
    <span id="createLegend">
      <Popover open={isOpen}>
        <PopoverTrigger>
          <ToolbarButton
            title={strings.toolbar.legend}
            icon={
              <SVGImageIcon
                invert={invertIcon}
                url={R.getSVGIcon("CharticulatorLegend")}
                height={20}
                width={20}
              />
            }
            onClick={() => {
              setOpen(!isOpen);
            }}
          />
        </PopoverTrigger>
        <PopoverSurface>
          <LegendCreationPanel onFinish={() => setOpen(false)} />
        </PopoverSurface>
      </Popover>
    </span>
  );
};

export class CheckboxButton extends React.Component<
  React.PropsWithChildren<{
    value: boolean;
    text?: string;
    onChange?: (v: boolean) => void;
  }>,
  Record<string, unknown>
> {
  public render() {
    return (
      <span
        className="charticulator__toolbar-checkbox"
        onClick={() => {
          const nv = !this.props.value;
          if (this.props.onChange) {
            this.props.onChange(nv);
          }
        }}
      >
        <SVGImageIcon
          url={R.getSVGIcon(
            this.props.value ? "checkbox/checked" : "checkbox/empty"
          )}
        />
        <span className="el-label">{this.props.text}</span>
      </span>
    );
  }
}
