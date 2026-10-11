// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as globals from "./globals";

import {
  ErrorBoundary,
  FloatingPanel,
  MinimizablePane,
  MinimizablePanelView,
  MessagePanel,
  TelemetryRecorder,
  TelemetryContext,
} from "./components";
import { DragStateView, PopupContainer } from "./controllers";
import { AppStore } from "./stores";
import {
  AttributePanel,
  ChartEditorView,
  DatasetView,
  MarkEditorView,
} from "./views";
import { MenuBar, MenuBarHandlers, MenubarTabButton } from "./views/menubar";
import { ObjectListEditor } from "./views/panels/object_list_editor";
import { ScalesPanel } from "./views/panels/scales_panel";
import { strings } from "../strings";
import { FluentUIToolbar } from "./views/fluentui_tool_bar";
import { FluentProvider, Theme, tokens } from "@fluentui/react-components";
import { ConstraintsPanel } from "./views/panels/constraints_panel";
import { Color } from "../core";

export enum UndoRedoLocation {
  MenuBar = "menubar",
  ToolBar = "toolbar",
}

export enum PositionsLeftRight {
  Left = "left",
  Right = "right",
}

export enum PositionsLeftRightTop {
  Left = "left",
  Right = "right",
  Top = "top",
}

export enum LayoutDirection {
  Vertical = "vertical",
  Horizontal = "horizontal",
}

export interface MainViewConfig {
  ColumnsPosition: PositionsLeftRight;
  EditorPanelsPosition: PositionsLeftRight;
  ToolbarPosition: PositionsLeftRightTop;
  MenuBarButtons: PositionsLeftRight;
  MenuBarSaveButtons: PositionsLeftRight;
  Name?: string;
  AppButtonName?: string;
  ToolbarLabels: boolean;
  UndoRedoLocation: UndoRedoLocation;
}

export interface MainViewProps {
  store: AppStore;
  backgroundColor?: Color;
  viewConfiguration: MainViewConfig;
  menuBarHandlers?: MenuBarHandlers;
  telemetry?: TelemetryRecorder;
  tabButtons?: MenubarTabButton[];
  theme?: Partial<Theme>;
  darkTheme?: boolean;
  onSwitchTheme?: (darkTheme: boolean) => void;
}

export interface MainViewState {
  constraintsViewMaximized: boolean;
  glyphViewMaximized: boolean;
  layersViewMaximized: boolean;
  attributeViewMaximized: boolean;
  scaleViewMaximized: boolean;
  currentFocusComponentIndex: number;
}


export const MainView = function ({ store, backgroundColor, viewConfiguration, menuBarHandlers, telemetry, tabButtons, theme, darkTheme, onSwitchTheme }: MainViewProps) {
  let viewConf: MainViewConfig;

  if (!viewConfiguration) {
    viewConf = {
      ColumnsPosition: PositionsLeftRight.Left,
      EditorPanelsPosition: PositionsLeftRight.Left,
      ToolbarPosition: PositionsLeftRightTop.Top,
      MenuBarButtons: PositionsLeftRight.Left,
      MenuBarSaveButtons: PositionsLeftRight.Left,
      ToolbarLabels: true,
      UndoRedoLocation: UndoRedoLocation.MenuBar,
    };
  } else {
    viewConf = viewConfiguration;
  }

  const [state, setState] = React.useState<MainViewState>({
    constraintsViewMaximized: false,
    glyphViewMaximized: false,
    layersViewMaximized: false,
    attributeViewMaximized: false,
    scaleViewMaximized: false,
    currentFocusComponentIndex: 0,
  });

  store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate());

  const shortcutKeyHandler = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === "F6") {
      const focusableComponents = getFocusableComponents();
      let newIndex = state.currentFocusComponentIndex;
      focusableComponents[newIndex].setAttribute("tabIndex", null);
      if (e.shiftKey) {
        newIndex = state.currentFocusComponentIndex - 1;
      } else {
        newIndex = state.currentFocusComponentIndex + 1;
      }
      if (newIndex >= focusableComponents.length) {
        newIndex = 0;
      }
      if (newIndex < 0) {
        newIndex = focusableComponents.length - 1;
      }
      this.setState({
        currentFocusComponentIndex: newIndex,
      });
      focusableComponents[newIndex].setAttribute("tabIndex", "0");
      focusableComponents[newIndex].focus();
    }
  }

  React.useEffect(() => {
    document.addEventListener("keydown", shortcutKeyHandler.bind(this));

    return () => {
      document.removeEventListener("keydown", shortcutKeyHandler);
    }
  }, []);

  function getFocusableComponents() {
    return document.querySelectorAll<HTMLElement>(
      ".charticulator__menu-bar,.charticulator__toolbar-horizontal,.minimizable-pane,.charticulator__floating-panel"
    );
  }

  // eslint-disable-next-line
  const toolBarCreator = (config: {
    undoRedoLocation: UndoRedoLocation;
    layout: LayoutDirection;
    toolbarLabels: boolean;
  }) => {
    return (
      <div style={{
        background: tokens.colorNeutralBackground1
      }} className={`charticulator__panel-editor-toolbar-${config.layout}`}>
        <FluentUIToolbar
          darkTheme={darkTheme}
          toolbarLabels={config.toolbarLabels}
          undoRedoLocation={config.undoRedoLocation}
          layout={config.layout}
        />
      </div>
    );
  };

  const datasetPanel = () => {
    return (
      <div
        style={{
          background: tokens.colorNeutralBackground1
        }}
        className="charticulator__panel charticulator__panel-dataset">
        <MinimizablePanelView
          title={strings.mainView.datasetPanelTitle}
          width={'200px'}
        >
          <MinimizablePane
            title={strings.mainView.datasetPanelTitle}
            scroll={true}
            hideHeader={true}
          >
            <ErrorBoundary telemetryRecorder={telemetry}>
              <DatasetView store={store} />
            </ErrorBoundary>
          </MinimizablePane>
          {state.scaleViewMaximized ? null : (
            <MinimizablePane
              title={strings.mainView.scalesPanelTitle}
              scroll={true}
              onMaximize={() => this.setState({ scaleViewMaximized: true })}
            >
              <ErrorBoundary telemetryRecorder={telemetry}>
                <ScalesPanel store={store} />
              </ErrorBoundary>
            </MinimizablePane>
          )}
        </MinimizablePanelView>
      </div>
    );
  };

  const editorPanels = () => {
    return (
      <div
        className="charticulator__panel-editor-panel charticulator__panel-editor-panel-panes"
        style={{
          display:
            state.glyphViewMaximized &&
              state.attributeViewMaximized &&
              state.layersViewMaximized
              ? "none"
              : undefined,
          background: tokens.colorNeutralBackground1
        }}
      >
        <MinimizablePanelView
          title={strings.mainView.properties}
          width="326px"
        >
          {state.glyphViewMaximized ? null : (
            <MinimizablePane
              title={strings.mainView.glyphPaneltitle}
              scroll={false}
              onMaximize={() => this.setState({ glyphViewMaximized: true })}
            >
              <ErrorBoundary telemetryRecorder={telemetry}>
                <MarkEditorView height={300} />
              </ErrorBoundary>
            </MinimizablePane>
          )}
          {state.layersViewMaximized ? null : (
            <MinimizablePane
              title={strings.mainView.layersPanelTitle}
              scroll={true}
              onMaximize={() => this.setState({ layersViewMaximized: true })}
            >
              <ErrorBoundary telemetryRecorder={telemetry}>
                <ObjectListEditor />
              </ErrorBoundary>
            </MinimizablePane>
          )}
          {state.attributeViewMaximized ? null : (
            <MinimizablePane
              title={strings.mainView.attributesPaneltitle}
              scroll={true}
              onMaximize={() =>
                this.setState({ attributeViewMaximized: true })
              }
            >
              <ErrorBoundary telemetryRecorder={telemetry}>
                <AttributePanel store={store} />
              </ErrorBoundary>
            </MinimizablePane>
          )}
        </MinimizablePanelView>
      </div>
    );
  };

  const constraintsPanels = () => {
    return (
      <div
        className="charticulator__panel-editor-panel charticulator__panel-editor-panel-panes"
        style={{
          display:
            state.constraintsViewMaximized
              ? "none"
              : undefined,
          background: tokens.colorNeutralBackground1
        }}
      >
        <MinimizablePanelView
          title={strings.mainView.constraints}
          width="326px"
          open={false}
        >
          <ErrorBoundary telemetryRecorder={telemetry}>
            <div style={{
              height: '100%',
              display: 'flex',
              width: '100%',
            }}>
              <ConstraintsPanel store={store} />
            </div>
          </ErrorBoundary>
        </MinimizablePanelView>
      </div>
    );
  };

  const chartPanel = () => {
    return (
      <div style={{
        background: tokens.colorNeutralBackground1
      }} className="charticulator__panel-editor-panel charticulator__panel-editor-panel-chart">
        <ErrorBoundary telemetryRecorder={telemetry}>
          <ChartEditorView store={store} />
        </ErrorBoundary>
      </div>
    );
  };

  return (
    <div
      className="charticulator__application"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <FluentProvider theme={theme}>
        <TelemetryContext.Provider value={telemetry}>
          <MenuBar
            darkTheme={darkTheme}
            onSwitchTheme={onSwitchTheme}
            alignButtons={viewConf.MenuBarButtons}
            alignSaveButton={viewConf.MenuBarSaveButtons}
            undoRedoLocation={viewConf.UndoRedoLocation}
            name={viewConf.Name}
            appButtonName={viewConf.AppButtonName}
            // ref={(e) => (this.refMenuBar = e)}
            handlers={menuBarHandlers}
            tabButtons={tabButtons}
          />
          {viewConf.ToolbarPosition ==
            PositionsLeftRightTop.Top &&
            toolBarCreator({
              layout: LayoutDirection.Horizontal,
              toolbarLabels: viewConf.ToolbarLabels,
              undoRedoLocation: viewConf.UndoRedoLocation,
            })}
          <section className="charticulator__panel-container">
            {viewConf.ColumnsPosition ==
              PositionsLeftRight.Left && datasetPanel()}
            <div className="charticulator__panel charticulator__panel-editor">
              <div className="charticulator__panel-editor-panel-container">
                {viewConf.EditorPanelsPosition ==
                  PositionsLeftRight.Left && editorPanels()}
                {viewConf.EditorPanelsPosition ==
                  PositionsLeftRight.Left && constraintsPanels()}
                {viewConf.ToolbarPosition ==
                  PositionsLeftRightTop.Left &&
                  toolBarCreator({
                    layout: LayoutDirection.Vertical,
                    toolbarLabels: viewConf.ToolbarLabels,
                    undoRedoLocation: viewConf.UndoRedoLocation,
                  })}
                {chartPanel()}
                {viewConf.ToolbarPosition ==
                  PositionsLeftRightTop.Right &&
                  toolBarCreator({
                    layout: LayoutDirection.Vertical,
                    toolbarLabels: viewConf.ToolbarLabels,
                    undoRedoLocation: viewConf.UndoRedoLocation,
                  })}
                {viewConf.EditorPanelsPosition ==
                  PositionsLeftRight.Right && editorPanels()}
                {viewConf.EditorPanelsPosition ==
                  PositionsLeftRight.Right && constraintsPanels()}
              </div>
            </div>
            {viewConf.ColumnsPosition ==
              PositionsLeftRight.Right && datasetPanel()}
          </section>
          <div className="charticulator__floating-panels">
            {state.glyphViewMaximized ? (
              <FloatingPanel
                peerGroup="panels"
                title={strings.mainView.glyphPaneltitle}
                onClose={() => this.setState({ glyphViewMaximized: false })}
              >
                <ErrorBoundary telemetryRecorder={telemetry}>
                  <MarkEditorView />
                </ErrorBoundary>
              </FloatingPanel>
            ) : null}
            {state.layersViewMaximized ? (
              <FloatingPanel
                scroll={true}
                peerGroup="panels"
                title={strings.mainView.layersPanelTitle}
                onClose={() => this.setState({ layersViewMaximized: false })}
              >
                <ErrorBoundary telemetryRecorder={telemetry}>
                  <ObjectListEditor />
                </ErrorBoundary>
              </FloatingPanel>
            ) : null}
            {state.attributeViewMaximized ? (
              <FloatingPanel
                scroll={true}
                peerGroup="panels"
                title={strings.mainView.attributesPaneltitle}
                onClose={() =>
                  this.setState({ attributeViewMaximized: false })
                }
              >
                <ErrorBoundary telemetryRecorder={telemetry}>
                  <AttributePanel store={store} />
                </ErrorBoundary>
                <PopupContainer controller={globals.popupController} />
              </FloatingPanel>
            ) : null}
            {store.messageState.size ? (
              <div className="charticulator__floating-panels_errors">
                <FloatingPanel
                  floatInCenter={true}
                  scroll={true}
                  peerGroup="messages"
                  title={strings.mainView.errorsPanelTitle}
                  closeButtonIcon={"ChromeClose"}
                  height={200}
                  width={350}
                >
                  <ErrorBoundary telemetryRecorder={telemetry}>
                    <MessagePanel store={store} />
                  </ErrorBoundary>
                </FloatingPanel>
              </div>
            ) : null}
            {state.scaleViewMaximized ? (
              <FloatingPanel
                scroll={true}
                peerGroup="panels"
                title={strings.mainView.scalesPanelTitle}
                onClose={() => this.setState({ scaleViewMaximized: false })}
              >
                <ErrorBoundary telemetryRecorder={telemetry}>
                  <ScalesPanel store={store} />
                </ErrorBoundary>
              </FloatingPanel>
            ) : null}
          </div>
          <PopupContainer controller={globals.popupController} />
          {store.messageState.size ? (
            <div className="charticulator__floating-panels_errors">
              <FloatingPanel
                floatInCenter={true}
                scroll={true}
                peerGroup="messages"
                title={strings.mainView.errorsPanelTitle}
                closeButtonIcon={"general/cross"}
                height={200}
                width={350}
              >
                <ErrorBoundary telemetryRecorder={telemetry}>
                  <MessagePanel store={store} />
                </ErrorBoundary>
              </FloatingPanel>
            </div>
          ) : null}
          <DragStateView controller={globals.dragController} />
        </TelemetryContext.Provider>
      </FluentProvider>
    </div>
  );
}
