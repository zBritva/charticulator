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
import { ContextedComponent, MainContextInterface } from "../context_component";
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

interface HelpButtonProps {
  hideReportIssues: boolean;
  handlers: MenuBarHandlers;
}

export class HelpButton extends React.Component<
  React.PropsWithChildren<HelpButtonProps>,
  Record<string, unknown>
> {
  public render() {
    const contactUsLinkProps: React.AnchorHTMLAttributes<HTMLAnchorElement> = {
      onClick: this.props.handlers?.onContactUsLink,
    };
    if (!contactUsLinkProps.onClick) {
      contactUsLinkProps.href =
        getConfig().ContactUsHref || "https://www.linkedin.com/in/ilfat-galiev/";
    }
    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/help")}
        title={strings.menuBar.help}
        ref="helpButton"
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
                        onClick={this.props.handlers?.onGettingStartedClick}
                      >
                        {strings.help.gettingStarted}
                      </a>
                    </div>
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://ilfat-galiev.im/docs/category/gallery"
                        onClick={this.props.handlers?.onGalleryClick}
                      >
                        {strings.help.gallery}
                      </a>
                    </div>
                    {this.props.hideReportIssues ? null : (
                      <div className="el-item">
                        <a
                          target="_blank"
                          href="https://github.com/zbritva/charticulator/issues/new"
                          onClick={this.props.handlers?.onIssuesClick}
                        >
                          {strings.help.issues}
                        </a>
                      </div>
                    )}
                    <div className="el-item">
                      <a
                        target="_blank"
                        href="https://ilfat-galiev.im/"
                        onClick={this.props.handlers?.onHomeClick}
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
                        onClick={this.props.handlers?.onAboutClick}
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
              anchor: ReactDOM.findDOMNode(this.refs.helpButton) as Element,
              alignX: PopupAlignment.EndInner,
            }
          );
        }}
      />
    );
  }
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
  handlers: MenuBarHandlers;
  tabButtons?: MenubarTabButton[];
}

export class MenuBar extends ContextedComponent<
  MenuBarProps,
  {
    showSaveDialog: boolean;
  }
> {
  protected editor: EventSubscription;
  protected graphics: EventSubscription;
  private popupController: PopupController = new PopupController();

  constructor(props: MenuBarProps, context: MainContextInterface) {
    super(props, context);
    this.state = {
      showSaveDialog: false,
    };
  }

  public componentDidMount() {
    window.addEventListener("keydown", this.onKeyDown);
    this.editor = this.context.store.addListener(
      AppStore.EVENT_IS_NESTED_EDITOR,
      () => this.forceUpdate()
    );
    this.graphics = this.context.store.addListener(
      AppStore.EVENT_GRAPHICS,
      () => this.forceUpdate()
    );
  }

  public componentWillUnmount() {
    window.removeEventListener("keydown", this.onKeyDown);
    this.editor.remove();
    this.graphics.remove();
  }

  public keyboardMap: { [name: string]: string } = {
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

  public onKeyDown = (e: KeyboardEvent) => {
    if (e.target == document.body) {
      let prefix = "";
      if (e.shiftKey) {
        prefix = "shift-" + prefix;
      }
      if (e.ctrlKey || e.metaKey) {
        prefix = "ctrl-" + prefix;
      }
      const name = `${prefix}${e.key}`.toLowerCase();
      if (this.keyboardMap[name]) {
        const command = this.keyboardMap[name];
        switch (command) {
          case "new":
            {
              this.showFileModalWindow(MainTabs.open, this.context.store.editorType === EditorType.Embedded);
            }
            break;
          case "open":
            {
              this.showFileModalWindow(MainTabs.open, this.context.store.editorType === EditorType.Embedded);
            }
            break;
          case "save":
            {
              if (
                this.context.store.editorType == EditorType.Nested ||
                this.context.store.editorType == EditorType.Embedded ||
                this.context.store.editorType == EditorType.NestedEmbedded
              ) {
                this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
              } else {
                if (this.context.store.currentChartID) {
                  this.dispatch(new Actions.Save());
                } else {
                  this.showFileModalWindow(MainTabs.open, false);
                }
              }
            }
            break;
          case "export":
            {
              this.showFileModalWindow(MainTabs.export, this.context.store.editorType === EditorType.Embedded);
            }
            break;
          case "undo":
            {
              new Actions.Undo().dispatch(this.context.store.dispatcher);
            }
            break;
          case "redo":
            {
              new Actions.Redo().dispatch(this.context.store.dispatcher);
            }
            break;
          case "delete":
            {
              this.store.deleteSelection();
            }
            break;
          case "escape":
            {
              this.store.handleEscapeKey();
            }
            break;
        }
        e.preventDefault();
      }
    }
  };
  public hideFileModalWindow() {
    globals.popupController.reset();
  }

  public showFileModalWindow(defaultTab: MainTabs = MainTabs.open, isEmbedded: boolean) {
    if (this.context.store.disableFileView) {
      return;
    }
    globals.popupController.showModal(
      (context) => {
        return (
          <ModalView context={context}>
            <FileView
              backend={this.context.store.backend}
              defaultTab={defaultTab}
              store={this.context.store}
              disabledTabs={isEmbedded && this.context.store.backend != null ? [MainTabs.new, MainTabs.save, MainTabs.options, MainTabs.datasets, MainTabs.about] : []}
              onClose={() => context.close()}
            />
          </ModalView>
        );
      },
      { anchor: null }
    );
  }

  public renderSaveNested() {
    return (
      <>
        <Dialog
          // dialogContentProps={{
          //   title: strings.dialogs.saveChanges.saveChangesTitle,
          //   subText: strings.dialogs.saveChanges.saveChanges("chart"),
          // }}
          open={this.state.showSaveDialog}
          // minWidth="80%"
        >
          {/* <DialogTitle>
            {strings.dialogs.saveChanges.saveChangesTitle}
          </DialogTitle> */}
          <DialogActions>
            <Button
              // styles={primaryButtonStyles}
              onClick={() => {
                this.setState({
                  showSaveDialog: false,
                });
                this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
                setTimeout(() =>
                  this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_CLOSE)
                );
              }}
              // text={strings.menuBar.saveButton}
            >
              {strings.menuBar.saveButton}
            </Button>
            <Button
              onClick={() => {
                this.setState({
                  showSaveDialog: false,
                });
                this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_CLOSE);
              }}
              // text={strings.menuBar.dontSaveButton}
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
            this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);

            this.setState({
              showSaveDialog: false,
            });
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/cross")}
          text={strings.menuBar.closeNested}
          title={strings.menuBar.closeNested}
          onClick={() => {
            if (this.store.chartManager.hasUnsavedChanges()) {
              this.setState({
                showSaveDialog: true,
              });
            } else {
              this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_CLOSE);
              this.setState({
                showSaveDialog: false,
              });
            }
          }}
        />
        <span className="charticulator__menu-bar-separator" />
      </>
    );
  }

  // eslint-disable-next-line
  public renderImportButton(props: MenuBarProps) {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/import-template")}
          text=""
          title={strings.menuBar.importTemplate}
          onClick={
            props.handlers?.onImportTemplateClick ||
            // eslint-disable-next-line
            (() => {
              const inputElement = document.createElement("input");
              inputElement.type = "file";
              let file = null;
              inputElement.accept = ["tmplt", "json"]
                .map((x) => "." + x)
                .join(",");
              // eslint-disable-next-line
              inputElement.onchange = () => {
                if (inputElement.files.length == 1) {
                  file = inputElement.files[0];
                  if (file) {
                    // eslint-disable-next-line
                    readFileAsString(file).then((str) => {
                      const template = JSON.parse(
                        str
                      ) as Specification.Template.ChartTemplate;
                      
                      this.store.dispatcher.dispatch(
                        new Actions.ImportTemplate(template, (unmappedColumns, tableMapping, datasetTables, tables, resolve) => {
                          this.popupController.showModal(
                            (context) => {
                              return (
                                <ModalView context={context}>
                                  <div onClick={(e) => e.stopPropagation()}>
                                    <FileViewImport
                                      mode={MappingMode.ImportTemplate}
                                      tables={tables}
                                      datasetTables={datasetTables}
                                      tableMapping={tableMapping}
                                      unmappedColumns={unmappedColumns}
                                      format={this.store.getLocaleFileFormat()}
                                      onSave={(mapping, tableMapping, datasetTables) => {
                                        resolve(mapping, tableMapping, datasetTables);
                                        context.close();
                                      }}
                                      onClose={() => {
                                        context.close();
                                      }}
                                      onImportDataClick={() => {}}
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
  }

  public renderExportButton(props: MenuBarProps) {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/export-template")}
          text=""
          title={strings.menuBar.exportTemplate}
          onClick={
            props.handlers?.onExportTemplateClick ||
            (() => {
              const template = deepClone(this.store.buildChartTemplate());
              const target = this.store.createExportTemplateTarget(
                strings.menuBar.defaultTemplateName,
                template
              );
              const targetProperties: { [name: string]: string } = {};
              for (const property of target.getProperties()) {
                targetProperties[property.name] =
                  this.store.getPropertyExportName(property.name) ||
                  property.default;
              }

              this.dispatch(
                new Actions.ExportTemplate("", target, targetProperties)
              );
            })
          }
        />
      </>
    );
  }

  public renderSponsorButton(props: MenuBarProps) {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/support-dev")}
          text="DONATE"
          title={strings.menuBar.supportDev}
          onClick={
            props.handlers?.onSupportDevClick || (() => window.open("https://github.com/sponsors/zBritva", "_blank"))
          }
        />
      </>
    );
  }

  public renderCopyToClipboard(props: MenuBarProps) {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("Copy")}
          text=""
          title={strings.menuBar.copyTemplate}
          onClick={props.handlers?.onCopyToClipboardClick}
        />
      </>
    );
  }

  public renderSaveEmbedded() {
    const hasUnsavedChanges = this.store.chartManager.hasUnsavedChanges();

    return (
      <MenuButton
        url={R.getSVGIcon("toolbar/save")}
        text={strings.menuBar.saveButton}
        disabled={!hasUnsavedChanges}
        title={strings.menuBar.save}
        onClick={() => {
          this.context.store.dispatcher.dispatch(
            new Actions.UpdatePlotSegments()
          );
          this.context.store.dispatcher.dispatch(new Actions.UpdateDataAxis());
          this.context.store.emit(AppStore.EVENT_NESTED_EDITOR_EDIT);
        }}
      />
    );
  }

  public renderDelete() {
    return <DeleteDialog context={this.context} />;
  }

  public renderNewOpenSave() {
    return (
      <>
        <MenuButton
          url={R.getSVGIcon("toolbar/new")}
          title={strings.menuBar.new}
          onClick={() => {
            this.showFileModalWindow(MainTabs.new, this.context.store.editorType === EditorType.Embedded);
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/open")}
          title={strings.menuBar.open}
          onClick={() => {
            this.showFileModalWindow(MainTabs.open, this.context.store.editorType === EditorType.Embedded);
          }}
        />
        <MenuButton
          url={R.getSVGIcon("toolbar/save")}
          title={strings.menuBar.save}
          text={strings.menuBar.saveButton}
          onClick={() => {
            if (this.context.store.currentChartID) {
              this.dispatch(new Actions.Save());
            } else {
              this.showFileModalWindow(MainTabs.save, this.context.store.editorType === EditorType.Embedded);
            }
          }}
        />
        {this.renderImportButton(this.props)}
        <MenuButton
          url={R.getSVGIcon("toolbar/export")}
          title={strings.menuBar.export}
          onClick={() => {
            this.showFileModalWindow(MainTabs.export, this.context.store.editorType === EditorType.Embedded);
          }}
        />
      </>
    );
  }

  public toolbarButtons(props: MenuBarProps) {
    return (
      <>
        <span className="charticulator__menu-bar-separator" />
        {/* {this.renderSponsorButton(props)} */}
        <span className="charticulator__menu-bar-separator" />
        {this.context.store.editorType === EditorType.Chart
          ? this.renderNewOpenSave()
          : null}
        {this.context.store.editorType === EditorType.Embedded &&
        props.alignSaveButton === props.alignButtons
          ? this.renderSaveEmbedded()
          : null}
        {/* {this.context.store.editorType === EditorType.Embedded ||
        this.context.store.editorType === EditorType.NestedEmbedded ? (
          <>
            <span className="charticulator__menu-bar-separator" />
            {this.renderImportButton(props)}
            {this.renderExportButton(props)}
            {this.renderCopyToClipboard(props)}
          </>
        ) : null} */}
        <span className="charticulator__menu-bar-separator" />
        {this.props.undoRedoLocation === UndoRedoLocation.MenuBar ? (
          <>
            <MenuButton
              url={R.getSVGIcon("Undo")}
              title={strings.menuBar.undo}
              disabled={
                this.context.store.historyManager.statesBefore.length === 0
              }
              onClick={() =>
                new Actions.Undo().dispatch(this.context.store.dispatcher)
              }
            />
            <MenuButton
              url={R.getSVGIcon("Redo")}
              title={strings.menuBar.redo}
              disabled={
                this.context.store.historyManager.statesAfter.length === 0
              }
              onClick={() =>
                new Actions.Redo().dispatch(this.context.store.dispatcher)
              }
            />
          </>
        ) : null}
        <span className="charticulator__menu-bar-separator" />
        {this.renderDelete()}
      </>
    );
  }

  public toolbarTabButtons(props: MenuBarProps) {
    return (
      <>
        {props.tabButtons?.map((button) => {
          return (
            <>
              <span className="charticulator__menu-bar-separator" />
              <MenuButton
                url={R.getSVGIcon(button.icon)}
                title={button.tooltip}
                onClick={button.onClick}
                text={button.text}
                disabled={!button.active}
              />
            </>
          );
        })}
      </>
    );
  }

  public render() {
    return (
      <>
        <PopupContainer controller={this.popupController} />
        <section className="charticulator__menu-bar">
          <div className="charticulator__menu-bar-left">
            <AppButton
              name={this.props.name}
              title={strings.menuBar.home}
              iconOnly={this.context.store.editorType === EditorType.Embedded}
              onClick={() => this.showFileModalWindow(MainTabs.open, this.context.store.editorType === EditorType.Embedded)}
            />
            {this.props.alignButtons === PositionsLeftRight.Left ? (
              <>
                <span className="charticulator__menu-bar-separator" />
                {this.toolbarButtons(this.props)}
              </>
            ) : null}
            {this.context.store.editorType === EditorType.Embedded &&
            this.props.alignSaveButton == PositionsLeftRight.Left &&
            this.props.alignSaveButton !== this.props.alignButtons
              ? this.renderSaveEmbedded()
              : null}
            {this.context.store.editorType === EditorType.Embedded &&
            this.props.tabButtons
              ? this.toolbarTabButtons(this.props)
              : null}
            {this.context.store.editorType === EditorType.Nested ||
            this.context.store.editorType === EditorType.NestedEmbedded
              ? this.renderSaveNested()
              : null}
          </div>
          <div className="charticulator__menu-bar-center el-text">
            <p
              className={classNames("charticulator__menu-bar-center", [
                "nested-chart",
                this.context.store.editorType === EditorType.NestedEmbedded,
              ])}
            >
              {`${this.context.store.chart?.properties.name}${
                this.context.store.editorType === EditorType.Embedded ||
                this.context.store.editorType === EditorType.NestedEmbedded
                  ? " - " + this.props.name || strings.app.name
                  : ""
              }`}
            </p>
          </div>
          <div className="charticulator__menu-bar-right">
            {this.props.alignButtons === PositionsLeftRight.Right ? (
              <>
                {this.toolbarButtons(this.props)}
                <span className="charticulator__menu-bar-separator" />
              </>
            ) : null}
            {(this.context.store.editorType === EditorType.Embedded ||
              this.context.store.editorType === EditorType.NestedEmbedded) &&
            this.props.alignSaveButton == PositionsLeftRight.Right &&
            this.props.alignSaveButton !== this.props.alignButtons
              ? this.renderSaveEmbedded()
              : null}
            <HelpButton
              handlers={this.props.handlers}
              hideReportIssues={false}
            />
          </div>
        </section>
      </>
    );
  }
}
