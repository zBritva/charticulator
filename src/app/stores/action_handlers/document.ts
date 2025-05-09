// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as FileSaver from "file-saver";
import { saveAs } from "file-saver";
import { deepClone, uniqueID } from "../../../core";
import { Actions } from "../../actions";
import {
  renderDataURLToPNG,
  stringToDataURL,
  convertColumns,
} from "../../utils";
import { AppStore, EditorType } from "../app_store";
import { Migrator } from "../migrator";
import { ActionHandlerRegistry } from "./registry";
import { getConfig } from "../../config";
import { ChartTemplateBuilder } from "../../../template";
import {
  NestedEditorEventType,
  NestedEditorMessage,
  NestedEditorMessageType,
} from "../../application";
import { ChartTemplate, Dataset, Specification } from "../../../container";
import { TableType } from "../../../core/dataset";

declare let CHARTICULATOR_PACKAGE: {
  version: string;
  buildTimestamp: number;
  revision: string;
};

/** Handlers for document-level actions such as Load, Save, Import, Export, Undo/Redo, Reset */
// eslint-disable-next-line
export default function (REG: ActionHandlerRegistry<AppStore, Actions.Action>) {
  // eslint-disable-next-line
  REG.add(Actions.Export, function (action) {
    (async () => {
      // Export as vector graphics
      if (action.type == "svg") {
        const svg = await this.renderLocalSVG();
        const blob = new Blob([svg], { type: "image/svg;charset=utf-8" });
        if (this.onExportTemplateCallback != null) {
          if (this.onExportTemplateCallback(action.type, blob))
          {
            return;
          }
        }
        saveAs(blob, "charticulator.svg", true);
      }
      // Export as bitmaps
      if (action.type == "png" || action.type == "jpeg") {
        const svgDataURL = stringToDataURL(
          "image/svg+xml",
          await this.renderLocalSVG()
        );
        renderDataURLToPNG(svgDataURL, {
          mode: "scale",
          scale: action.options.scale || 2,
          background: "#ffffff",
        }).then((png) => {
          png.toBlob((blob) => {
            if (this.onExportTemplateCallback != null) {
              if (this.onExportTemplateCallback(action.type, blob))
              {
                return;
              }
            }
            saveAs(
              blob,
              "charticulator." + (action.type == "png" ? "png" : "jpg"),
              true
            );
          }, "image/" + action.type);
        });
      }
      // Export as interactive HTML
      if (action.type == "html") {
        let containerScriptText = ""
        if (this.ContainerScriptText) {
          containerScriptText = this.ContainerScriptText;
        } else {
          containerScriptText = await (
            await fetch(getConfig().ContainerURL)
          ).text();
        }

        const htmlString = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Charticulator HTML Export</title>
            <script type="text/javascript">${containerScriptText}</script>
            <style type="text/css">
              #container {
                display: block;
                position: absolute;
                left: 0; right: 0; top: 0; bottom: 0;
              }
            </style>
          </head>
          <body>
            <div id="container"></div>
            <script type="text/javascript">
              CharticulatorContainer.initialize().then(function() {
                const currentChart = ${JSON.stringify(this.chart)};
                const dataset = ${JSON.stringify(this.dataset)};

                const container = new CharticulatorContainer.ChartContainer({ chart: currentChart }, dataset);
                const width = document.getElementById("container").getBoundingClientRect().width;
                const height = document.getElementById("container").getBoundingClientRect().height;
                container.mount("container", width, height);
                window.addEventListener("resize", function() {
                  container.resize(
                    document.getElementById("container").getBoundingClientRect().width,
                    document.getElementById("container").getBoundingClientRect().height
                  );
                });
              });
            </script>
          </body>
          </html>
        `;
        const blob = new Blob([htmlString]);

        if (this.onExportTemplateCallback != null) {
          if (this.onExportTemplateCallback(action.type, blob))
          {
            return;
          }
        }
        saveAs(blob, "charticulator.html", true);
      }
    })();
  });

  REG.add(Actions.ExportTemplate, function (this, action) {
    action.target.generate(action.properties).then((base64) => {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);

      const blob = new Blob([byteArray], {
        type: "application/x-binary",
      });
      if (this.onExportTemplateCallback != null) {
        this.emit(AppStore.EVENT_EXPORT_TEMPLATE, base64);
        if (this.onExportTemplateCallback("json", blob))
        {
          return;
        }
      }
      FileSaver.saveAs(
        blob,
        action.target.getFileName
          ? action.target.getFileName(action.properties)
          : "charticulator." + action.target.getFileExtension(action.properties)
      );
    });
  });

  REG.add(Actions.Save, function (action) {
    this.backendSaveChart()
      .then(() => {
        if (action.onFinish) {
          action.onFinish();
        }
      })
      .catch((error: Error) => {
        if (action.onFinish) {
          action.onFinish(error);
        }
      });
  });

  REG.add(Actions.SaveAs, function (action) {
    this.backendSaveChartAs(action.saveAs)
      .then(() => {
        if (action.onFinish) {
          action.onFinish();
        }
      })
      .catch((error: Error) => {
        if (action.onFinish) {
          action.onFinish(error);
        }
      });
  });

  REG.add(Actions.DeleteScale, function (action) {
    this.saveHistory();
    this.deleteChartScale(action.scaleID);
    this.solveConstraintsAndUpdateGraphics(true);
  });

  REG.add(Actions.Open, function (action) {
    this.backendOpenChart(action.id)
      .then(() => {
        if (action.onFinish) {
          action.onFinish();
        }
      })
      .catch((error: Error) => {
        if (action.onFinish) {
          action.onFinish(error);
        }
      });
  });

  REG.add(Actions.Load, function (action) {
    this.historyManager.clear();
    const state = new Migrator().migrate(
      action.projectData,
      CHARTICULATOR_PACKAGE.version
    );
    this.loadState(state);
  });

  REG.add(Actions.ImportDataset, function (action) {
    this.currentChartID = null;
    this.dataset = action.dataset;
    this.originDataset = deepClone(this.dataset);
    this.historyManager.clear();
    this.newChartEmpty();
    this.emit(AppStore.EVENT_DATASET);
    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.ImportChartAndDataset, function (action) {
    this.importChartAndDataset(action);
  });

  REG.add(Actions.ImportTemplate, function (action) {
    const data = action.template;
    const mappingCallback = action.mappingCallback;

    let unmappedColumns: Specification.Template.Column[] = [];
    data.tables[0].columns.forEach((column) => {
      unmappedColumns = unmappedColumns.concat(
        this.checkColumnsMapping(
          column,
          TableType.Main,
          this.dataset
        )
      );
    });
    if (data.tables[1]) {
      data.tables[1].columns.forEach((column) => {
        unmappedColumns = unmappedColumns.concat(
          this.checkColumnsMapping(
            column,
            TableType.Links,
            this.dataset
          )
        );
      });
    }

    data.tables[0].type = TableType.Main;
    if (data.tables[1]) {
      data.tables[1].type = TableType.Links;
    }

    const tableMapping = new Map<string, string>();
    tableMapping.set(
      data.tables[0].name,
      this.dataset.tables[0].name
    );
    if (data.tables[1] && this.dataset.tables[1]) {
      tableMapping.set(
        data.tables[1].name,
        this.dataset.tables[1].name
      );
    }

    const loadTemplateIntoState = (
      tableMapping: Map<string, string>,
      columnMapping: Map<string, string>,
      datasetTable: Dataset.Table[]
    ) => {
      const template = new ChartTemplate(data);

      for (const table of template.getDatasetSchema()) {
        template.assignTable(
          table.name,
          tableMapping.get(table.name) || table.name
        );
        for (const column of table.columns) {
          template.assignColumn(
            table.name,
            column.name,
            columnMapping.get(column.name) || column.name
          );
        }
      }

      const newDataset: Dataset.Dataset = {
        ...this.dataset,
        tables: datasetTable
      };

      const instance = template.instantiate(
        newDataset,
        false // no scale inference
      );

      this.importChartAndDataset(new Actions.ImportChartAndDataset(
        instance.chart,
        newDataset,
        {}
      ))

      this.replaceDataset(new Actions.ReplaceDataset(newDataset));
    };

    if (unmappedColumns.length > 0) {
      mappingCallback(unmappedColumns, tableMapping, this.dataset.tables, data.tables, (mapping, tableMapping, datasetTable) => {
        loadTemplateIntoState(
          tableMapping,
          mapping,
          datasetTable
        );
      });
    } else {
      loadTemplateIntoState(tableMapping, new Map(), this.dataset.tables);
    }
  });

  REG.add(Actions.UpdatePlotSegments, function () {
    this.updatePlotSegments();
    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.UpdateDataAxis, function () {
    this.updateDataAxes();
    this.updateScales();
    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.ReplaceDataset, function (action) {
    this.replaceDataset(action);
  });

  REG.add(Actions.ConvertColumnDataType, function (action) {
    this.saveHistory();

    const table = this.dataset.tables.find(
      (table) => table.name === action.tableName
    );
    if (!table) {
      return;
    }

    const column = table.columns.find(
      (column) => column.name === action.column
    );
    if (!column) {
      return;
    }

    let originTable = undefined;
    if (this.originDataset) {
      originTable = this.originDataset.tables.find(
        (table) => table.name === action.tableName
      );
      let originColumn = originTable.columns.find(
        (column) => column.name === action.column
      );
      if (originColumn.metadata.rawColumnName) {
        originColumn = originTable.columns.find(
          (column) => column.name === originColumn.metadata.rawColumnName
        );
      }
    }

    const result = convertColumns(table, column, originTable || table, action.type);
    if (result) {
      this.messageState.set("columnConvertError", result);
    }

    this.updatePlotSegments();
    this.updateDataAxes();
    this.updateScales();
    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_SELECTION);
  });

  REG.add(Actions.Undo, function () {
    const state = this.historyManager.undo(this.saveDecoupledState());
    if (state) {
      const ss = this.saveSelectionState();
      this.loadState(state);
      this.loadSelectionState(ss);
    }
  });

  REG.add(Actions.Redo, function () {
    const state = this.historyManager.redo(this.saveDecoupledState());
    if (state) {
      const ss = this.saveSelectionState();
      this.loadState(state);
      this.loadSelectionState(ss);
    }
  });

  REG.add(Actions.Reset, function () {
    this.saveHistory();

    this.currentSelection = null;
    this.currentTool = null;
    this.emit(AppStore.EVENT_SELECTION);
    this.emit(AppStore.EVENT_CURRENT_TOOL);

    this.newChartEmpty();

    this.solveConstraintsAndUpdateGraphics();
  });

  REG.add(Actions.OpenNestedEditor, function ({ options, object, property }) {
    this.emit(AppStore.EVENT_OPEN_NESTED_EDITOR, options, object, property);
    const editorID = uniqueID();
    // don't open nested editor if the current editor is embedded
    let newWindow = null;
    if (this.editorType == EditorType.Chart || this.editorType == EditorType.Nested) {
      newWindow = window.open(
        "index.html#!nestedEditor=" + editorID,
        "nested_chart_" + options.specification._id
      );
    }
    const listener = (e: MessageEvent) => {
      if (e.origin != document.location.origin) {
        return;
      }
      const data = <NestedEditorMessage>e.data;
      if (data.id == editorID) {
        switch (data.type) {
          case NestedEditorMessageType.Initialized:
            {
              const builder = new ChartTemplateBuilder(
                options.specification,
                options.dataset,
                this.chartManager,
                CHARTICULATOR_PACKAGE.version
              );

              const template = builder.build();
              newWindow?.postMessage(
                {
                  id: editorID,
                  type: NestedEditorEventType.Load,
                  specification: options.specification,
                  dataset: options.dataset,
                  width: options.width,
                  template,
                  height: options.height,
                  filterCondition: options.filterCondition,
                },
                document.location.origin
              );
            }
            break;
          case NestedEditorMessageType.Save:
            {
              this.setProperty({
                object,
                property: property.property,
                field: property.field,
                value: data.specification,
                noUpdateState: property.noUpdateState,
                noComputeLayout: property.noComputeLayout,
              });
            }
            break;
        }
      }
    };
    window.addEventListener("message", listener);
  });

  REG.add(Actions.SearchUpdated, function (action) {
    this.searchString = action.searchString;
    this.emit(AppStore.EVENT_GRAPHICS);
  });

  REG.add(Actions.ExpandOrCollapsePanelsUpdated, function (action) {
    this.collapseOrExpandPanelsType = action.type;
    this.emit(AppStore.EVENT_GRAPHICS);
  });

  REG.add(Actions.UpdateConstraints, function ({ constraints }) {
    this.saveHistory();

    this.chartManager.chart.constraints = [];

    const glyphs = this.chartManager.chart.glyphs;

    glyphs.forEach((glyph) => {
      glyph.constraints = [];
    });

    constraints.forEach((constraint) => {
      if (constraint.parentObjectType === "chart") {
        this.chartManager.chart.constraints.push(constraint);
      }
      if (constraint.parentObjectType === "glyph") {
        const glyph = this.chartManager.chart.glyphs.find(
          (glyph) => glyph._id === constraint.parentObjectID
        );
        if (glyph) {
          glyph.constraints.push(constraint);
        }
      }
    });

    this.solveConstraintsAndUpdateGraphics();
    this.emit(AppStore.EVENT_GRAPHICS);
  });
}

