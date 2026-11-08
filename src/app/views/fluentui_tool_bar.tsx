/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as R from "../resources";

import { Actions, DragData } from "../actions";
import {
  DraggableElement,
  FluentToolButton,
  SVGImageIcon,
} from "../components";
import { MainReactContext } from "../context_component";

import { LinkCreationPanel } from "./panels/link_creator";
import { LegendCreationPanel } from "./panels/legend_creator";
import { AppStore } from "../stores";
import { strings } from "../../strings";
import { LayoutDirection, UndoRedoLocation } from "../main_view";
import { useContext } from "react";

import { Popover } from "@fluentui/react-popover";
import { PopoverSurface } from "@fluentui/react-popover";
import { MenuPopover } from "@fluentui/react-menu";
import { Menu } from "@fluentui/react-menu";
import { MenuItem } from "@fluentui/react-menu";
import { MenuList } from "@fluentui/react-menu";
import { MenuTrigger } from "@fluentui/react-menu";
import { PopoverTrigger } from "@fluentui/react-popover";
import { tokens, Toolbar, ToolbarButton, ToolbarDivider } from "@fluentui/react-components";

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
      <React.Fragment key="getGlyphToolItems">
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
              icon: "ElementRect",
              options: '{"shape":"rectangle"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.ellipse,
              icon: "ElementEllipse",
              options: '{"shape":"ellipse"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.triangle,
              icon: "ElementTriangle",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "mark.polygon",
              title: strings.toolbar.polygon,
              icon: "ElementPolygon",
              options: '{"closed":"true", "pointsCount": "3"}',
            }
          ]}
        />
        <ObjectButton
          invertIcon={props.darkTheme}
          classID="mark.symbol"
          title={strings.toolbar.symbol}
          icon="ElementSymbol"
        />

        <ObjectButton
          invertIcon={props.darkTheme}
          classID="mark.line"
          title={strings.toolbar.line}
          icon="ElementLine"
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
              icon: "ElementIcon",
            },
            {
              classID: "mark.image",
              title: strings.toolbar.image,
              icon: "ElementImage",
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
      </React.Fragment>
    ];
  };

  // eslint-disable-next-line max-lines-per-function
  const getChartToolItems = (labels: boolean = true) => {
    return [
      <React.Fragment key="getChartToolItems">
        <LinkButton invertIcon={props.darkTheme} label={true} />
        <LegendButton invertIcon={props.darkTheme} />
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
              icon: "PlotRegion",
              noDragging: true,
            },
            {
              classID: "plot-segment.line",
              title: strings.toolbar.line,
              icon: "ElementLine",
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
      </React.Fragment>,
    ];
  };

  const renderScaffoldButton = () => {
    return (
      <MultiObjectButton
        key={"saffoldButton"}
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
        key={"guidesButton"}
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


  const renderSaveEmbedded = () => {
    const hasUnsavedChanges = store.chartManager.hasUnsavedChanges();

    return (
      <FluentToolButton
        key={"saveEmbedded"}
        icon={<SVGImageIcon url={R.getSVGIcon("toolbar/save")} width={16} height={16} />}
        text={strings.menuBar.saveButton}
        disabled={!hasUnsavedChanges}
        title={strings.menuBar.save}
        onClick={() => {
          store.dispatcher.dispatch(new Actions.UpdatePlotSegments());
          store.dispatcher.dispatch(new Actions.UpdateDataAxis());
          store.dispatcher.dispatch(new Actions.Save());
        }}
      />
    );
  };

  // eslint-disable-next-line max-lines-per-function
  const getToolItems = (
    labels: boolean = true,
    innerWidth: number = window.innerWidth
  ) => {
    const isEmbeddedApp = store.editorType === EditorType.NestedEmbeddedApp;
    return (
      <React.Fragment key="toolItemsFragment">
        {isEmbeddedApp ? (
          <React.Fragment key={"saveEmbeddedFragment"}>
            {renderSaveEmbedded()}
            <span className={"charticulator__toolbar-horizontal-separator"} />
          </React.Fragment>
        ) : null
        }
        {props.undoRedoLocation === UndoRedoLocation.ToolBar ? (
          <>
            <FluentToolButton
              key={"undoButton"}
              invertIcon={props.darkTheme}
              title={strings.menuBar.undo}
              disabled={store.historyManager.statesBefore.length === 0}
              icon={"Undo"}
              onClick={() => new Actions.Undo().dispatch(store.dispatcher)}
            />
            <FluentToolButton
              key={"redoButton"}
              invertIcon={props.darkTheme}
              title={strings.menuBar.redo}
              disabled={store.historyManager.statesAfter.length === 0}
              icon={"Redo"}
              onClick={() => new Actions.Redo().dispatch(store.dispatcher)}
            />
            <span key={"separator1"} className={"charticulator__toolbar-horizontal-separator"} />
          </>
        ) : null}
        {labels && (
          <span
            key={"marksLabel"}
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
          key={"marksButton"}
          invertIcon={props.darkTheme}
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.rect",
              title: strings.toolbar.rectangle,
              icon: "ElementRect",
              options: '{"shape":"rectangle"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.ellipse,
              icon: "ElementEllipse",
              options: '{"shape":"ellipse"}',
            },
            {
              classID: "mark.rect",
              title: strings.toolbar.triangle,
              icon: "ElementTriangle",
              options: '{"shape":"triangle"}',
            },
            {
              classID: "mark.polygon",
              title: strings.toolbar.polygon,
              icon: "ElementPolygon",
              options: '{"closed":"true", "pointsCount": "3"}',
            },
          ]}
        />
        <ObjectButton
          key={"symbolMark"}
          invertIcon={props.darkTheme} classID="mark.symbol" title="Symbol" icon="ElementSymbol" />
        <ObjectButton
          key={"lineMark"}
          invertIcon={props.darkTheme} classID="mark.line" title="Line" icon="ElementLine" />
        <MultiObjectButton
          key={"textMarksButton"}
          invertIcon={props.darkTheme}
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.text",
              title: strings.toolbar.text,
              icon: "ElementText",
            },
            {
              classID: "mark.textbox",
              title: strings.toolbar.textbox,
              icon: "ElementTextbox",
            },
          ]}
        />
        <MultiObjectButton
          key={"imageMarksButton"}
          invertIcon={props.darkTheme}
          compact={props.layout === LayoutDirection.Vertical}
          tools={[
            {
              classID: "mark.icon",
              title: strings.toolbar.icon,
              icon: "ElementIcon",
            },
            {
              classID: "mark.image",
              title: strings.toolbar.image,
              icon: "ElementImage",
            },
          ]}
        />
        <span key={"separator2"} className={"charticulator__toolbar-horizontal-separator"} />
        <ObjectButton
          key={"dataAxis"}
          invertIcon={props.darkTheme}
          classID="mark.data-axis"
          title={strings.toolbar.dataAxis}
          icon="DataAxis"
        />
        <ObjectButton
          key={"nestedChart"}
          invertIcon={props.darkTheme}
          classID="mark.nested-chart"
          title={strings.toolbar.nestedChart}
          icon="NestedChart"
        />
        <LegendButton key={"legendButton"} invertIcon={props.darkTheme} />
        <span key={"separator3"} className={"charticulator__toolbar-horizontal-separator"} />
        <LinkButton key={"linkButton"} invertIcon={props.darkTheme} label={labels} />
        <span key={"separator4"} className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <span
            key={"guidesLabel"}
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
              key={"guideY"}
              invertIcon={props.darkTheme}
              classID="guide-y"
              title={strings.toolbar.guideY}
              icon="GuideXline"
            />
            <ObjectButton
              key={"guideX"}
              invertIcon={props.darkTheme}
              classID="guide-x"
              title={strings.toolbar.guideX}
              icon="GuideYline"
            />
            <ObjectButton
              key={"guideCoordinatorX"}
              invertIcon={props.darkTheme}
              classID="guide-coordinator-x"
              title={strings.toolbar.guideX}
              icon="GuideCoordinatorX"
            />
            <ObjectButton
              key={"guideCoordinatorY"}
              invertIcon={props.darkTheme}
              classID="guide-coordinator-y"
              title={strings.toolbar.guideY}
              icon="GuideCoordinatorY"
            />
            <ObjectButton
              key={"guideCoordinatorPolar"}
              invertIcon={props.darkTheme}
              classID="guide-coordinator-polar"
              title={strings.toolbar.guidePolar}
              icon="GuideCoordinatorPolar"
            />
          </>
        ) : (
          renderGuidesButton()
        )}
        <span key={"separator5"} className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <>
            <span
              key={"plotLabel"}
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
          key={"plotSegmentCartesian"}
          invertIcon={props.darkTheme}
          classID="plot-segment.cartesian"
          title={strings.toolbar.region2D}
          icon="PlotRegion"
          noDragging={true}
        />
        <ObjectButton
          key={"plotSegmentLine"}
          invertIcon={props.darkTheme}
          classID="plot-segment.line"
          title={strings.toolbar.line}
          icon="PlotSegmentLine"
          noDragging={true}
        />
        <span key={"separator6"} className={"charticulator__toolbar-horizontal-separator"} />
        {labels && (
          <span
            key={"scaffoldsLabel"}
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
              key={"scaffoldCartesianX"}
              darkTheme={props.darkTheme}
              type="cartesian-x"
              title={strings.toolbar.lineH}
              icon="ScaffoldXline"
              currentTool={store.currentTool}
            />
            <ScaffoldButton
              key={"scaffoldCartesianY"}
              darkTheme={props.darkTheme}
              type="cartesian-y"
              title={strings.toolbar.lineV}
              icon="ScaffoldYline"
              currentTool={store.currentTool}
            />
            <ScaffoldButton
              key={"scaffoldPolar"}
              darkTheme={props.darkTheme}
              type="polar"
              title={strings.toolbar.polar}
              icon="ScaffoldCircle"
              currentTool={store.currentTool}
            />
            <ScaffoldButton
              key={"scaffoldCurve"}
              darkTheme={props.darkTheme}
              type="curve"
              title={strings.toolbar.curve}
              icon="ScaffoldCurve"
              currentTool={store.currentTool}
            />
          </>
        ) : (
          renderScaffoldButton()
        )}
      </React.Fragment>
    );
  };

  let tooltipsItems: React.JSX.Element[] = [];
  if (store.editorType === "embedded") {
    const chartToolItems = getChartToolItems(props.toolbarLabels);
    const glyphToolItems = getGlyphToolItems(props.toolbarLabels);
    tooltipsItems = [...chartToolItems, ...glyphToolItems];
  } else {
    tooltipsItems = [getToolItems(props.toolbarLabels, innerWidth)];
  }

  return (
    <>
      <Toolbar
        aria-label="Editor toolbar"
        size="medium"
        style={{
          border: `2px solid ${tokens.colorNeutralBackground3}`,
          borderRadius: "8px",
          backgroundColor: tokens.colorNeutralBackground1
        }}
      >
        {tooltipsItems}
      </Toolbar>
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

export const ObjectButton: React.FC<ObjectButtonProps> = (props) => {
  const { store, dispatcher } = React.useContext(MainReactContext);
  const [, setRenderVersion] = React.useState(0);

  const getIsActive = React.useCallback(() => {
    return (
      store.currentTool == props.classID &&
      store.currentToolOptions == props.options
    );
  }, [store.currentTool, store.currentToolOptions, props.classID, props.options]);

  React.useEffect(() => {
    const token = store.addListener(AppStore.EVENT_CURRENT_TOOL, () => {
      setRenderVersion((value) => value + 1);
    });

    return () => {
      token.remove();
    };
  }, [store]);

  return (
    <>
      <DraggableElement
        dragData={
          props.noDragging
            ? undefined
            : props.onDrag
              ? props.onDrag
              : () => {
                return new DragData.ObjectType(props.classID, props.options);
              }
        }
        onDragStart={() => setRenderVersion((value) => value + 1)}
        onDragEnd={() => setRenderVersion((value) => value + 1)}
        renderDragElement={() => {
          return [
            <SVGImageIcon
              invert={props.invertIcon}
              url={getSVGIcon(props.icon)}
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
            typeof props.icon === "string" ? (
              <SVGImageIcon
                invert={props.invertIcon}
                url={R.getSVGIcon(props.icon)}
                width={20}
                height={20}
              />
            ) : (
              props.icon
            )
          }
          title={props.title}
          value={props.text}
          // toggle={getIsActive()}
          onClick={() => {
            dispatcher.dispatch(new Actions.SetCurrentTool(props.classID, props.options));
            if (props.onClick) {
              props.onClick();
            }
          }}
        />
      </DraggableElement>
    </>
  );
};

export const MultiObjectButton: React.FC<{
  compact?: boolean;
  tools: ObjectButtonProps[];
  invertIcon?: boolean;
}> = ({ tools, invertIcon }) => {
  const { store } = React.useContext(MainReactContext);
  const [currentSelection, setCurrentSelection] = React.useState<{
    classID: string;
    options: string;
  }>({
    classID: tools[0]?.classID ?? "",
    options: tools[0]?.options ?? "",
  });
  const [, setDragging] = React.useState(false);

  const getSelectedTool = React.useCallback(() => {
    for (const item of tools) {
      if (
        item.classID == currentSelection.classID &&
        item.options == currentSelection.options
      ) {
        return item;
      }
    }
    return tools[0];
  }, [currentSelection, tools]);

  React.useEffect(() => {
    const token = store.addListener(AppStore.EVENT_CURRENT_TOOL, () => {
      for (const item of tools) {
        if (
          store.currentTool == item.classID &&
          store.currentToolOptions == item.options
        ) {
          setCurrentSelection({
            classID: item.classID,
            options: item.options ?? "",
          });
          break;
        }
      }
    });

    return () => token.remove();
  }, [store, tools]);

  const currentTool = getSelectedTool();

  return (
    <DraggableElement
      dragData={() => {
        if (currentTool?.onDrag) {
          return currentTool.onDrag();
        }
        return new DragData.ObjectType(
          currentTool.classID,
          currentTool.options
        );
      }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      renderDragElement={() => {
        return [
          <SVGImageIcon
            key={`multi-object-button-drag-element-${currentTool.classID}-${currentTool.options}`}
            invert={invertIcon}
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
            key={`multi-object-button-toolbar-button-${currentTool.classID}-${currentTool.options}`}
            appearance="subtle"
            title={currentTool?.title}
            icon={
              <SVGImageIcon
                key={`multi-object-button-icon-${currentTool.classID}-${currentTool.options}`}
                invert={invertIcon}
                url={R.getSVGIcon(currentTool.icon)}
                height={20}
                width={20}
              ></SVGImageIcon>
            }
            onClick={() => {
              if (currentTool) {
                new Actions.SetCurrentTool(
                  currentTool.classID,
                  currentTool.options
                ).dispatch(store.dispatcher);
              }
            }}
          />
        </MenuTrigger>

        <MenuPopover>
          <MenuList>
            {tools.map((tool, index) => {
              return (
                <MenuItem
                  key={`multi-object-button-menu-item-${tool.classID}-${tool.options}-${index}`}
                  onClick={() => {
                    if (tool) {
                      new Actions.SetCurrentTool(
                        tool.classID,
                        tool.options
                      ).dispatch(store.dispatcher);
                    }
                  }}
                  icon={
                    <SVGImageIcon
                      invert={invertIcon}
                      key={`multi-object-button-menu-item-icon-${tool.classID}-${tool.options}-${index}`}
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
};

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
    <span id="linkCreator" key="linkCreator">
      <Popover
        open={isOpen}
        positioning={{
          positioningRef: button,
          position: "below",
        }}
      >
        <PopoverTrigger>
          <ToolbarButton
            ref={button.current}
            title={strings.toolbar.link}
            value={props.label ? strings.toolbar.link : ""}
            icon={
              <SVGImageIcon
                invert={props.invertIcon}
                url={R.getSVGIcon("LinkTool")}
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
}> = ({ invertIcon }) => {
  // const { store } = React.useContext(MainReactContext);
  const [isOpen, setOpen] = React.useState(false);

  React.useEffect(() => {
    return () => {
      setOpen(false);
    };
  }, [setOpen]);

  return (
    <span id="createLegend" key="createLegend">
      <Popover open={isOpen}>
        <PopoverTrigger>
          <ToolbarButton
            key="legendButton"
            title={strings.toolbar.legend}
            icon={
              <SVGImageIcon
                invert={invertIcon}
                url={"Legend"}
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
