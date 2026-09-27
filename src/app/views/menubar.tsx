// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as globals from "../globals";
import * as R from "../resources";

import { Dialog, DialogActions } from "@fluentui/react-dialog";
import { Button } from "@fluentui/react-button";

import { deepClone, EventSubscription } from "../../core";
import { Actions } from "../actions";
import { AppButton, MenuButton } from "../components";
import { MainReactContext } from "../context_component";
import {
  ModalView,
  PopupAlignment,
  PopupContainer,
  PopupController,
  PopupView,
} from "../controllers";

import { FileView, MainTabs } from "./file_view";
import { AppStore } from "../stores";
import { classNames, readFileAsString } from "../utils";
import {
  Specification,
} from "../../container";
import { FileViewImport, MappingMode } from "./file_view/import_view";
import { strings } from "../../strings";
import { PositionsLeftRight, UndoRedoLocation } from "../main_view";
import { getConfig } from "../config";
import { EditorType } from "../stores/app_store";
import { DeleteDialog } from "./panels/delete_dialog";
import { Label, Switch, tokens } from "@fluentui/react-components";

declare let CHARTICULATOR_PACKAGE: {
  version: string;
  buildTimestamp: number;
  revision: string;
};

interface HelpButtonProps {
  hideReportIssues: boolean;
  handlers: MenuBarHandlers;
}

export function HelpButton(props: React.PropsWithChildren<HelpButtonProps>) {
  const helpButtonRef = React.useRef<any>(null);
  const contactUsLinkProps: React.AnchorHTMLAttributes<HTMLAnchorElement> = {
    onClick: props.handlers?.onContactUsLink,
  };

  if (!contactUsLinkProps.onClick) {
    contactUsLinkProps.href =
      getConfig().ContactUsHref || "https://www.linkedin.com/in/ilfat-galiev/";
  }

  return (
    <>
      <div ref={helpButtonRef} />
      <MenuButton
        url={R.getSVGIcon("toolbar/help")}
        title={strings.menuBar.help}
        ref={helpButtonRef}
        onClick={() => {
          globals.popupController.popupAt(
            (context) => {
              return (
                <PopupView
                  context={context}
                  className="charticulator__menu-popup"
                >
                  <div
                    className="charticulator__menu-dropdown"
                    onClick={() => context.close()}
                  >
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://ilfat-galiev.im/docs/charticulator/intro/"
                        onClick={props.handlers?.onGettingStartedClick}
                      >
                        {strings.help.gettingStarted}
                      </a>
                    </div>
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://ilfat-galiev.im/docs/category/gallery"
                        onClick={props.handlers?.onGalleryClick}
                      >
                        {strings.help.gallery}
                      </a>
                    </div>
                    {!props.hideReportIssues ? (
                      <div className="el-item">
                        <a
                          target="_blank"
                          href="https://github.com/zbritva/charticulator/issues/new"
                          onClick={props.handlers?.onIssuesClick}
                        >
                          {strings.help.issues}
                        </a>
                      </div>
                    ) : null}
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://ilfat-galiev.im/"
                        onClick={props.handlers?.onHomeClick}
                      >
                        {strings.help.home}
                      </a>
                    </div>
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://www.linkedin.com/in/ilfat-galiev/"
                        onClick={contactUsLinkProps.onClick}
                      >
                        {strings.help.contact}
                      </a>
                    </div>
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://ilfat-galiev.im/pages/about"
                        onClick={props.handlers?.onAboutClick}
                      >
                        {strings.help.aboutMeUs}
                      </a>
                    </div>
                    <div className="el-item-version">
                      {strings.help.version(CHARTICULATOR_PACKAGE.version)}
                    </div>
                  </div>
                </PopupView>
              );
            },
            {
              anchor: helpButtonRef.current as Element,
              alignX: PopupAlignment.EndInner,
            }
          );
        }}
      />
    </>
  );
}

export interface MenuBarHandlers {
  onContactUsLink?: () => void;
  onImportTemplateClick?: () => void;
  onExportTemplateClick?: () => void;
  onSupportDevClick?: () => void;
  onCopyToClipboardClick?: () => void;
  onGettingStartedClick?: () => void;
  onGalleryClick?: () => void;
  onIssuesClick?: () => void;
  onHomeClick?: () => void;
  onAboutClick?: () => void;
}

export interface MenubarTabButton {
  icon: string;
  tooltip: string;
  text: string;
  active: boolean;
  onClick: () => void;
}

export interface MenuBarProps {
  undoRedoLocation: UndoRedoLocation;
  alignButtons: PositionsLeftRight;
  alignSaveButton: PositionsLeftRight;
  name?: string;
  appButtonName?: string;
  handlers: MenuBarHandlers;
  tabButtons?: MenubarTabButton[];
  onSwitchTheme?: (type: boolean) => void;
  darkTheme: boolean;
}

export function MenuBar(props: MenuBarProps) {
  const context = React.useContext(MainReactContext);
  const store = context.store;
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [, forceUpdate] = React.useState(0);
  const popupController = React.useRef(new PopupController());

  const dispatch = (action: { dispatch: (dispatcher: any) => void }) => {
    action.dispatch(store.dispatcher);
  };

  const keyboardMap: { [name: string]: string } = {
    "ctrl-z": "undo",
    "ctrl-y": "redo",
    "ctrl-s": "save",
    "ctrl-shift-s": "export",
    "ctrl-n": "new",
    "ctrl-o": "open",
    backspace: "delete",
    delete: "delete",
    escape: "escape",
  };

  const hideFileModalWindow = () => {
    globals.popupController.reset();
  };

  const showFileModalWindow = (defaultTab: MainTabs = MainTabs.open, isEmbedded: boolean) => {
    if (store.disableFileView) {
      return;
    }
    globals.popupController.showModal(
      (modalContext) => {
        return (
          <ModalView context={modalContext}>
            <FileView
              backend={store.backend}
              defaultTab={defaultTab}
              store={store}
              disabledTabs={isEmbedded && store.backend != null ? [MainTabs.new, MainTabs.save, MainTabs.options, MainTabs.datasets, MainTabs.about] : []}
              onClose={() => modalContext.close()}
            />
          </ModalView>
        );
      },
      { anchor: null }
    );
  };

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target == document.body) {
        let prefix = "";
        if (e.shiftKey) {
          prefix = "shift-" + prefix;
        }
        if (e.ctrlKey || e.metaKey) {
          prefix = "ctrl-" + prefix;
        }
        const name = `${prefix}${e.key}`.toLowerCase();
        if (keyboardMap[name]) {
          const command = keyboardMap[name];
          switch (command) {
            case "new":
              showFileModalWindow(MainTabs.open, store.editorType === EditorType.Embedded);
              break;
            case "open":
              showFileModalWindow(MainTabs.open, store.editorType === EditorType.Embedded);
              break;
            case "save":
              if (
                store.editorType == EditorType.Nested ||
                store.editorType == EditorType.Embedded ||
                store.editorType == EditorType.NestedEmbedded
              ) {
                store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
              } else {
                if (store.currentChartID) {
                  dispatch(new Actions.Save());
                } else {
                  showFileModalWindow(MainTabs.open, false);
                }
              }
              break;
            case "export":
              showFileModalWindow(MainTabs.export, store.editorType === EditorType.Embedded);
              break;
            case "undo":
              new Actions.Undo().dispatch(store.dispatcher);
              break;
            case "redo":
              new Actions.Redo().dispatch(store.dispatcher);
              break;
            case "delete":
              store.deleteSelection();
              break;
            case "escape":
              store.handleEscapeKey();
              break;
          }
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const editor = store.addListener(AppStore.EVENT_IS_NESTED_EDITOR, () => forceUpdate((value) => value + 1));
    const graphics = store.addListener(AppStore.EVENT_GRAPHICS, () => forceUpdate((value) => value + 1));

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      editor.remove();
      graphics.remove();
    };
  }, [store]);

  const renderSaveNested = () => {
    return (
      <>
        <Dialog
          open={showSaveDialog}
        >
          <DialogActions>
            <Button
              onClick={() => {
                setShowSaveDialog(false);
                store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
                setTimeout(() => store.emit(AppStore.EVENT_NESTED_EDITOR_CLOSE));
              }}
            >
              {strings.menuBar.saveButton}
            </Button>
            <Button
              onClick={() => {
                setShowSaveDialog(false);
                store.emit(AppStore.EVENT_NESTED_EDITOR_CLOSE);
              }}
            >
              {strings.menuBar.dontSaveButton}
            </Button>
          </DialogActions>
        </Dialog>
        <MenuButton
          url={R.getSVGIcon("toolbar/save")}
          text={strings.menuBar.saveNested}
          title={strings.menuBar.save}
          onClick={() => {
            store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
            setShowSaveDialog(false);
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/cross")}
          text={strings.menuBar.closeNested}
          title={strings.menuBar.closeNested}
          onClick={() => {
            if (store.chartManager.hasUnsavedChanges()) {
              setShowSaveDialog(true);
            } else {
              store.emit(AppStore.EVENT_NESTED_EDITOR_CLOSE);
              setShowSaveDialog(false);
            }
          }}
        />
        <span className="charticulator__menu-bar-separator" />
      </>
    );
  };

  const renderImportButton = (menuProps: MenuBarProps) => {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/import-template")}
          text=""
          title={strings.menuBar.importTemplate}
          onClick={
            menuProps.handlers?.onImportTemplateClick ||
            (() => {
              const inputElement = document.createElement("input");
              inputElement.type = "file";
              let file = null;
              inputElement.accept = ["tmplt", "json"]
                .map((x) => "." + x)
                .join(",");
              inputElement.onchange = () => {
                if (inputElement.files.length == 1) {
                  file = inputElement.files[0];
                  if (file) {
                    readFileAsString(file).then((str) => {
                      const template = JSON.parse(str) as Specification.Template.ChartTemplate;

                      store.dispatcher.dispatch(
                        new Actions.ImportTemplate(template, (unmappedColumns, tableMapping, datasetTables, tables, resolve) => {
                          popupController.current.showModal(
                            (modalContext) => {
                              return (
                                <ModalView context={modalContext}>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <FileViewImport
                                      mode={MappingMode.ImportTemplate}
                                      tables={tables}
                                      datasetTables={datasetTables}
                                      tableMapping={tableMapping}
                                      unmappedColumns={unmappedColumns}
                                      format={store.getLocaleFileFormat()}
                                      onSave={(mapping, tableMapping, datasetTables) => {
                                        resolve(mapping, tableMapping, datasetTables);
                                        modalContext.close();
                                      }}
                                      onClose={() => {
                                        modalContext.close();
                                      }}
                                      onImportDataClick={() => { }}
                                    />
                                  </div>
                                </ModalView>
                              );
                            },
                            { anchor: null }
                          );
                        })
                      );
                    });
                  }
                }
              };
              inputElement.click();
            })
          }
        />
      </>
    );
  };

  const renderExportButton = (menuProps: MenuBarProps) => {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/export-template")}
          text=""
          title={strings.menuBar.exportTemplate}
          onClick={
            menuProps.handlers?.onExportTemplateClick ||
            (() => {
              const template = deepClone(store.buildChartTemplate());
              const target = store.createExportTemplateTarget(
                strings.menuBar.defaultTemplateName,
                template
              );
              const targetProperties: { [name: string]: string } = {};
              for (const property of target.getProperties()) {
                targetProperties[property.name] =
                  store.getPropertyExportName(property.name) ||
                  property.default;
              }

              dispatch(new Actions.ExportTemplate("", target, targetProperties));
            })
          }
        />
      </>
    );
  };

  const renderSponsorButton = (menuProps: MenuBarProps) => {
    return (
      <>
        <div className="el-text">
          <p style={{ marginLeft: "5px" }}>
            {strings.menuBar.supportDev}
          </p>
        </div>
        <MenuButton
          url={R.getSVGIcon("toolbar/support-dev")}
          text="STRIPE"
          title={strings.menuBar.supportDev}
          onClick={
            menuProps.handlers?.onSupportDevClick || (() => window.open("https://donate.stripe.com/aFa00jfvgeYMg6K3RDgUM02", "_blank"))
          }
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/support-dev")}
          text="GITHUB"
          title={strings.menuBar.supportDev}
          onClick={
            menuProps.handlers?.onSupportDevClick || (() => window.open("https://github.com/sponsors/aveirun", "_blank"))
          }
        />
      </>
    );
  };

  const renderCopyToClipboard = (menuProps: MenuBarProps) => {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("Copy")}
          text=""
          title={strings.menuBar.copyTemplate}
          onClick={menuProps.handlers?.onCopyToClipboardClick}
        />
      </>
    );
  };

  const renderSaveEmbedded = () => {
    const hasUnsavedChanges = store.chartManager.hasUnsavedChanges();

    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/save")}
        text={strings.menuBar.saveButton}
        disabled={!hasUnsavedChanges}
        title={strings.menuBar.save}
        onClick={() => {
          store.dispatcher.dispatch(new Actions.UpdatePlotSegments());
          store.dispatcher.dispatch(new Actions.UpdateDataAxis());
          store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
        }}
      />
    );
  };

  const renderDelete = () => <DeleteDialog context={context} />;

  const renderNewOpenSave = () => {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/new")}
          title={strings.menuBar.new}
          onClick={() => {
            showFileModalWindow(MainTabs.new, store.editorType === EditorType.Embedded);
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/open")}
          title={strings.menuBar.open}
          onClick={() => {
            showFileModalWindow(MainTabs.open, store.editorType === EditorType.Embedded);
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/save")}
          title={strings.menuBar.save}
          text={strings.menuBar.saveButton}
          onClick={() => {
            if (store.currentChartID) {
              dispatch(new Actions.Save());
            } else {
              showFileModalWindow(MainTabs.save, store.editorType === EditorType.Embedded);
            }
          }}
        />
        {renderImportButton(props)}
        <MenuButton
          url={R.getSVGIcon("toolbar/export")}
          title={strings.menuBar.export}
          onClick={() => {
            showFileModalWindow(MainTabs.export, store.editorType === EditorType.Embedded);
          }}
        />
      </>
    );
  };

  const toolbarButtons = (menuProps: MenuBarProps) => {
    return (
      <>
        <span className="charticulator__menu-bar-separator" />
        {renderSponsorButton(menuProps)}
        <span className="charticulator__menu-bar-separator" />
        {store.editorType === EditorType.Chart ? renderNewOpenSave() : null}
        {store.editorType === EditorType.Embedded &&
          menuProps.alignSaveButton === menuProps.alignButtons
          ? renderSaveEmbedded()
          : null}
        <span className="charticulator__menu-bar-separator" />
        {props.undoRedoLocation === UndoRedoLocation.MenuBar ? (
          <>
            <MenuButton
              url={R.getSVGIcon("Undo")}
              title={strings.menuBar.undo}
              disabled={store.historyManager.statesBefore.length === 0}
              onClick={() => new Actions.Undo().dispatch(store.dispatcher)}
            />
            <MenuButton
              url={R.getSVGIcon("Redo")}
              title={strings.menuBar.redo}
              disabled={store.historyManager.statesAfter.length === 0}
              onClick={() => new Actions.Redo().dispatch(store.dispatcher)}
            />
          </>
        ) : null}
        <span className="charticulator__menu-bar-separator" />
        {renderDelete()}
      </>
    );
  };

  const toolbarTabButtons = (menuProps: MenuBarProps) => {
    return (
      <>
        {menuProps.tabButtons?.map((button) => {
          return (
            <React.Fragment key={button.text || button.tooltip || button.icon}>
              <span className="charticulator__menu-bar-separator" />
              <MenuButton
                url={R.getSVGIcon(button.icon)}
                title={button.tooltip}
                onClick={button.onClick}
                text={button.text}
                disabled={!button.active}
              />
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <>
      <PopupContainer controller={popupController.current} />
      <section style={{
        background: tokens.colorBrandBackground
      }} className="charticulator__menu-bar">
        <div className="charticulator__menu-bar-left">
          <AppButton
            name={props.appButtonName}
            title={strings.menuBar.home}
            onClick={() => showFileModalWindow(MainTabs.open, store.editorType === EditorType.Embedded)}
          />
          {props.alignButtons === PositionsLeftRight.Left ? (
            <>
              <span className="charticulator__menu-bar-separator" />
              {toolbarButtons(props)}
            </>
          ) : null}
          {store.editorType === EditorType.Embedded &&
            props.alignSaveButton == PositionsLeftRight.Left &&
            props.alignSaveButton !== props.alignButtons
            ? renderSaveEmbedded()
            : null}
          {store.editorType === EditorType.Embedded && props.tabButtons ? toolbarTabButtons(props) : null}
          {(store.editorType === EditorType.Nested || store.editorType === EditorType.NestedEmbedded) ? renderSaveNested() : null}
        </div>
        <div className="charticulator__menu-bar-center el-text">
          <p
            className={classNames("charticulator__menu-bar-center", [
              "nested-chart",
              store.editorType === EditorType.NestedEmbedded,
            ])}
          >
            {`${store.chart?.properties.name}${store.editorType === EditorType.Embedded ||
              store.editorType === EditorType.NestedEmbedded
              ? " - " + props.name || strings.app.name
              : ""
              }`}
          </p>
        </div>
        <div className="charticulator__menu-bar-right">
          {props.alignButtons === PositionsLeftRight.Right ? (
            <>
              {toolbarButtons(props)}
              <span className="charticulator__menu-bar-separator" />
            </>
          ) : null}
          {store.editorType === EditorType.Chart ? (
            <>
              <Label>Dark</Label>
              <Switch
                title="Preview"
                value={props.darkTheme ? 1 : 0}
                onChange={(_e, data) => {
                  props.onSwitchTheme?.(data.checked);
                }}
              />
            </>
          ) : null}
          {(store.editorType === EditorType.Embedded || store.editorType === EditorType.NestedEmbedded) &&
            props.alignSaveButton == PositionsLeftRight.Right &&
            props.alignSaveButton !== props.alignButtons
            ? renderSaveEmbedded()
            : null}
          <HelpButton handlers={props.handlers} hideReportIssues={false} />
        </div>
      </section>
    </>
  );
}
