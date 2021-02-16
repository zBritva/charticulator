// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import {
  Dataset,
  deepClone,
  Expression,
  getById,
  getByName,
  Prototypes,
  setField,
  Solver,
  Specification,
  zipArray,
  uniqueID,
  Scale,
  MessageType,
  compareMarkAttributeNames,
} from "../../core";
import { BaseStore } from "../../core/store/base";
import { CharticulatorWorker } from "../../worker";
import { Actions, DragData } from "../actions";
import { AbstractBackend } from "../backend/abstract";
import { IndexedDBBackend } from "../backend/indexed_db";
import { ChartTemplateBuilder, ExportTemplateTarget } from "../template";
import {
  renderDataURLToPNG,
  b64EncodeUnicode,
  stringToDataURL,
} from "../utils";
import {
  renderChartToLocalString,
  renderChartToString,
} from "../views/canvas/chart_display";
import {
  ActionHandlerRegistry,
  registerActionHandlers,
} from "./action_handlers";
import { createDefaultChart } from "./defaults";
import { HistoryManager } from "./history_manager";
import { Migrator } from "./migrator";
import {
  ChartElementSelection,
  GlyphSelection,
  MarkSelection,
  Selection,
} from "./selection";
import { LocaleFileFormat } from "../../core/dataset/dsv_parser";
import { TableType } from "../../core/dataset";
import { TextExpression, ValueType } from "../../core/expression/classes";
import {
  AttributeType,
  DataKind,
  DataType,
  DataValue,
  Mapping,
  ScaleMapping,
  ValueMapping,
} from "../../core/specification";
import { RenderEvents } from "../../core/graphics";
import { OrderMode } from "../../core/specification/types";

export interface ChartStoreStateSolverStatus {
  solving: boolean;
}

export interface SelectionState {
  selection?: {
    type: string;
    chartElementID?: string;
    glyphID?: string;
    markID?: string;
    glyphIndex?: number;
  };
  currentGlyphID?: string;
}

export interface AppStoreState {
  version: string;
  originDataset?: Dataset.Dataset;
  dataset: Dataset.Dataset;
  chart: Specification.Chart;
  chartState: Specification.ChartState;
}

export class AppStore extends BaseStore {
  public static EVENT_IS_NESTED_EDITOR = "is-nested-editor";
  public static EVENT_NESTED_EDITOR_EDIT = "nested-editor-edit";

  /** Fires when the dataset changes */
  public static EVENT_DATASET = "dataset";
  /** Fires when the chart state changes */
  public static EVENT_GRAPHICS = "graphics";
  /** Fires when the selection changes */
  public static EVENT_SELECTION = "selection";
  /** Fires when the current tool changes */
  public static EVENT_CURRENT_TOOL = "current-tool";
  /** Fires when solver status changes */
  public static EVENT_SOLVER_STATUS = "solver-status";
  /** Fires when the chart was saved */
  public static EVENT_SAVECHART = "savechart";

  /** The WebWorker for solving constraints */
  public readonly worker: CharticulatorWorker;

  /** Is this app a nested chart editor? */
  public editorType: "chart" | "nested" | "embedded" = "chart";
  /** Should we disable the FileView */
  public disableFileView: boolean = false;

  /** The dataset created on import */
  public originDataset: Dataset.Dataset;
  /** The current dataset */
  public dataset: Dataset.Dataset;
  /** The current chart */
  public chart: Specification.Chart;
  /** The current chart state */
  public chartState: Specification.ChartState;
  /** Rendering Events */
  public renderEvents?: RenderEvents;

  public currentSelection: Selection;
  public currentAttributeFocus: string;
  public currentGlyph: Specification.Glyph;
  protected selectedGlyphIndex: { [id: string]: number } = {};
  protected localeFileFormat: LocaleFileFormat = {
    delimiter: ",",
    numberFormat: {
      remove: ",",
      decimal: ".",
    },
    currency: '["$", ""]',
    group: "[3]",
  };
  public currentTool: string;
  public currentToolOptions: string;

  public chartManager: Prototypes.ChartStateManager;

  public solverStatus: ChartStoreStateSolverStatus;

  /** Manages the history of states */
  public historyManager: HistoryManager<AppStoreState>;

  /** The backend that manages data */
  public backend: AbstractBackend;
  /** The id of the currently editing chart */
  public currentChartID: string;

  public actionHandlers = new ActionHandlerRegistry<AppStore, Actions.Action>();

  private propertyExportName = new Map<string, string>();

  public messageState: Map<MessageType | string, string>;

  constructor(worker: CharticulatorWorker, dataset: Dataset.Dataset) {
    super(null);

    /** Register action handlers */
    registerActionHandlers(this.actionHandlers);

    this.worker = worker;

    this.backend = new IndexedDBBackend();

    this.historyManager = new HistoryManager<AppStoreState>();

    this.dataset = dataset;

    this.newChartEmpty();
    this.solveConstraintsAndUpdateGraphics();

    this.messageState = new Map();

    this.registerExportTemplateTarget(
      "Charticulator Template",
      (template: Specification.Template.ChartTemplate) => {
        return {
          getProperties: () => [
            {
              displayName: "Name",
              name: "name",
              type: "string",
              default: template.specification.properties?.name || "template",
            },
          ],
          getFileName: (props: { name: string }) => `${props.name}.tmplt`,
          generate: () => {
            return new Promise<string>((resolve, reject) => {
              const r = b64EncodeUnicode(JSON.stringify(template, null, 2));
              resolve(r);
            });
          },
        };
      }
    );
  }

  public setPropertyExportName(propertyName: string, value: string) {
    this.propertyExportName.set(`${propertyName}`, value);
  }

  public getPropertyExportName(propertyName: string) {
    return this.propertyExportName.get(`${propertyName}`);
  }

  public saveState(): AppStoreState {
    return {
      version: CHARTICULATOR_PACKAGE.version,
      dataset: this.dataset,
      chart: this.chart,
      chartState: this.chartState,
    };
  }

  public saveDecoupledState(): AppStoreState {
    const state = this.saveState();
    return deepClone(state);
  }

  public loadState(state: AppStoreState) {
    this.currentSelection = null;
    this.selectedGlyphIndex = {};

    this.dataset = state.dataset;
    this.originDataset = state.dataset;
    this.chart = state.chart;
    this.chartState = state.chartState;

    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.dataset,
      this.chartState
    );

    this.emit(AppStore.EVENT_DATASET);
    this.emit(AppStore.EVENT_GRAPHICS);
    this.emit(AppStore.EVENT_SELECTION);
  }

  public saveHistory() {
    this.historyManager.addState(this.saveDecoupledState());
  }

  public renderSVG() {
    const svg =
      '<?xml version="1.0" standalone="no"?>' +
      renderChartToString(this.dataset, this.chart, this.chartState);
    return svg;
  }

  public async renderLocalSVG() {
    const svg = await renderChartToLocalString(
      this.dataset,
      this.chart,
      this.chartState
    );
    return '<?xml version="1.0" standalone="no"?>' + svg;
  }

  public handleAction(action: Actions.Action) {
    this.actionHandlers.handleAction(this, action);
  }

  public async backendOpenChart(id: string) {
    const chart = await this.backend.get(id);
    this.currentChartID = id;
    this.historyManager.clear();
    const state = new Migrator().migrate(
      chart.data.state,
      CHARTICULATOR_PACKAGE.version
    );
    this.loadState(state);
  }

  // removes unused scale objecs
  private updateChartState() {
    function hasMappedProperty(
      mappings: Specification.Mappings,
      scaleId: string
    ) {
      for (const map in mappings) {
        if (mappings[map].type === "scale") {
          if ((mappings[map] as any).scale === scaleId) {
            return true;
          }
        }
      }
      return false;
    }
    const chart = this.chart;

    function scaleFilter(scale: any) {
      return !(
        chart.elements.find((element: any) => {
          const mappings = (element as Specification.Object).mappings;
          if (mappings) {
            return hasMappedProperty(mappings, scale._id);
          }
          return false;
        }) != null ||
        chart.glyphs.find((glyph) => {
          return (
            glyph.marks.find((mark) => {
              const mappings = (mark as Specification.Object).mappings;
              if (mappings) {
                return hasMappedProperty(mappings, scale._id);
              }
              return false;
            }) != null
          );
        })
      );
    }

    chart.scales
      .filter(scaleFilter)
      .forEach((scale) => this.chartManager.removeScale(scale));

    chart.scaleMappings = chart.scaleMappings.filter((scaleMapping) =>
      chart.scales.find((scale) => scale._id === scaleMapping.scale)
    );
  }

  public async backendSaveChart() {
    if (this.currentChartID != null) {
      const chart = await this.backend.get(this.currentChartID);
      this.updateChartState();
      chart.data.state = this.saveState();
      const svg = stringToDataURL("image/svg+xml", await this.renderLocalSVG());
      const png = await renderDataURLToPNG(svg, {
        mode: "thumbnail",
        thumbnail: [200, 150],
      });
      chart.metadata.thumbnail = png.toDataURL();
      await this.backend.put(chart.id, chart.data, chart.metadata);
      this.emit(AppStore.EVENT_SAVECHART);
    }
  }

  public async backendSaveChartAs(name: string) {
    this.updateChartState();
    const state = this.saveState();
    const svg = stringToDataURL("image/svg+xml", await this.renderLocalSVG());
    const png = await renderDataURLToPNG(svg, {
      mode: "thumbnail",
      thumbnail: [200, 150],
    });
    const id = await this.backend.create(
      "chart",
      {
        state,
        name,
      },
      {
        name,
        dataset: this.dataset.name,
        thumbnail: png.toDataURL(),
      }
    );
    this.currentChartID = id;
    this.emit(AppStore.EVENT_SAVECHART);
    return id;
  }

  public setupNestedEditor(
    callback: (newSpecification: Specification.Chart) => void,
    type: "nested" | "embedded"
  ) {
    this.editorType = type;
    this.disableFileView = true;
    this.emit(AppStore.EVENT_IS_NESTED_EDITOR);
    this.addListener(AppStore.EVENT_NESTED_EDITOR_EDIT, () => {
      callback(this.chart);
    });
  }

  private registeredExportTemplateTargets = new Map<
    string,
    (template: Specification.Template.ChartTemplate) => ExportTemplateTarget
  >();

  public registerExportTemplateTarget(
    name: string,
    ctor: (
      template: Specification.Template.ChartTemplate
    ) => ExportTemplateTarget
  ) {
    this.registeredExportTemplateTargets.set(name, ctor);
  }

  public unregisterExportTemplateTarget(name: string) {
    this.registeredExportTemplateTargets.delete(name);
  }

  public listExportTemplateTargets(): string[] {
    const r: string[] = [];
    this.registeredExportTemplateTargets.forEach((x, i) => {
      r.push(i);
    });
    return r;
  }

  public createExportTemplateTarget(
    name: string,
    template: Specification.Template.ChartTemplate
  ): ExportTemplateTarget {
    return this.registeredExportTemplateTargets.get(name)(template);
  }

  public getTable(name: string): Dataset.Table {
    if (this.dataset != null) {
      return this.dataset.tables.filter((d) => d.name == name)[0];
    } else {
      return null;
    }
  }

  public getTables(): Dataset.Table[] {
    return this.dataset.tables;
  }

  public getColumnVector(
    table: Dataset.Table,
    columnName: string
  ): Dataset.DataValue[] {
    return table.rows.map((d) => d[columnName]);
  }

  public saveSelectionState(): SelectionState {
    const selection: SelectionState = {};
    if (this.currentSelection instanceof ChartElementSelection) {
      selection.selection = {
        type: "chart-element",
        chartElementID: this.currentSelection.chartElement._id,
      };
    }
    if (this.currentSelection instanceof GlyphSelection) {
      selection.selection = {
        type: "glyph",
        glyphID: this.currentSelection.glyph._id,
      };
    }
    if (this.currentSelection instanceof MarkSelection) {
      selection.selection = {
        type: "mark",
        glyphID: this.currentSelection.glyph._id,
        markID: this.currentSelection.mark._id,
      };
    }
    if (this.currentGlyph) {
      selection.currentGlyphID = this.currentGlyph._id;
    }
    return selection;
  }

  public loadSelectionState(selectionState: SelectionState) {
    if (selectionState == null) {
      return;
    }
    const selection = selectionState.selection;
    if (selection != null) {
      if (selection.type == "chart-element") {
        const chartElement = getById(
          this.chart.elements,
          selection.chartElementID
        );
        if (chartElement) {
          this.currentSelection = new ChartElementSelection(chartElement);
        }
      }
      if (selection.type == "glyph") {
        const glyphID = selection.glyphID;
        const glyph = getById(this.chart.glyphs, glyphID);
        const plotSegment = getById(
          this.chart.elements,
          selection.chartElementID
        ) as Specification.PlotSegment;
        if (plotSegment && glyph) {
          this.currentSelection = new GlyphSelection(plotSegment, glyph);
          this.currentGlyph = glyph;
        }
      }
      if (selection.type == "mark") {
        const glyphID = selection.glyphID;
        const markID = selection.markID;
        const glyph = getById(this.chart.glyphs, glyphID);
        const plotSegment = getById(
          this.chart.elements,
          selection.chartElementID
        ) as Specification.PlotSegment;
        if (plotSegment && glyph) {
          const mark = getById(glyph.marks, markID);
          if (mark) {
            this.currentSelection = new MarkSelection(plotSegment, glyph, mark);
            this.currentGlyph = glyph;
          }
        }
      }
    }
    if (selectionState.currentGlyphID) {
      const glyph = getById(this.chart.glyphs, selectionState.currentGlyphID);
      if (glyph) {
        this.currentGlyph = glyph;
      }
    }
    this.emit(AppStore.EVENT_SELECTION);
  }

  public setSelectedGlyphIndex(plotSegmentID: string, glyphIndex: number) {
    this.selectedGlyphIndex[plotSegmentID] = glyphIndex;
  }

  public getSelectedGlyphIndex(plotSegmentID: string) {
    const plotSegment = this.chartManager.getClassById(
      plotSegmentID
    ) as Prototypes.PlotSegments.PlotSegmentClass;
    if (!plotSegment) {
      return 0;
    }
    if (this.selectedGlyphIndex.hasOwnProperty(plotSegmentID)) {
      const idx = this.selectedGlyphIndex[plotSegmentID];
      if (idx >= plotSegment.state.dataRowIndices.length) {
        this.selectedGlyphIndex[plotSegmentID] = 0;
        return 0;
      } else {
        return idx;
      }
    } else {
      this.selectedGlyphIndex[plotSegmentID] = 0;
      return 0;
    }
  }

  public getMarkIndex(mark: Specification.Glyph) {
    return this.chart.glyphs.indexOf(mark);
  }

  public forAllGlyph(
    glyph: Specification.Glyph,
    callback: (
      glyphState: Specification.GlyphState,
      plotSegment: Specification.PlotSegment,
      plotSegmentState: Specification.PlotSegmentState
    ) => void
  ) {
    for (const [element, elementState] of zipArray(
      this.chart.elements,
      this.chartState.elements
    )) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = element as Specification.PlotSegment;
        const plotSegmentState = elementState as Specification.PlotSegmentState;
        if (plotSegment.glyph == glyph._id) {
          for (const glyphState of plotSegmentState.glyphs) {
            callback(glyphState, plotSegment, plotSegmentState);
          }
        }
      }
    }
  }

  public preSolveValues: Array<
    [Solver.ConstraintStrength, Specification.AttributeMap, string, number]
  > = [];
  public addPresolveValue(
    strength: Solver.ConstraintStrength,
    state: Specification.AttributeMap,
    attr: string,
    value: number
  ) {
    this.preSolveValues.push([strength, state, attr, value]);
  }

  /** Given the current selection, find a reasonable plot segment for a glyph */
  public findPlotSegmentForGlyph(glyph: Specification.Glyph) {
    if (
      this.currentSelection instanceof MarkSelection ||
      this.currentSelection instanceof GlyphSelection
    ) {
      if (this.currentSelection.glyph == glyph) {
        return this.currentSelection.plotSegment;
      }
    }
    if (this.currentSelection instanceof ChartElementSelection) {
      if (
        Prototypes.isType(
          this.currentSelection.chartElement.classID,
          "plot-segment"
        )
      ) {
        const plotSegment = this.currentSelection
          .chartElement as Specification.PlotSegment;
        if (plotSegment.glyph == glyph._id) {
          return plotSegment;
        }
      }
    }
    for (const elem of this.chart.elements) {
      if (Prototypes.isType(elem.classID, "plot-segment")) {
        const plotSegment = elem as Specification.PlotSegment;
        if (plotSegment.glyph == glyph._id) {
          return plotSegment;
        }
      }
    }
  }

  public scaleInference(
    context: { glyph?: Specification.Glyph; chart?: { table: string } },
    expression: string,
    valueType: Specification.DataType,
    valueKind: Specification.DataKind,
    outputType: Specification.AttributeType,
    hints: Prototypes.DataMappingHints = {},
    markAttribute?: string
  ): string {
    // Figure out the source table
    let tableName: string = null;
    if (context.glyph) {
      tableName = context.glyph.table;
    }
    if (context.chart) {
      tableName = context.chart.table;
    }
    // Figure out the groupBy
    let groupBy: Specification.Types.GroupBy = null;
    if (context.glyph) {
      // Find plot segments that use the glyph.
      this.chartManager.enumeratePlotSegments((cls) => {
        if (cls.object.glyph == context.glyph._id) {
          groupBy = cls.object.groupBy;
        }
      });
    }
    let table = this.getTable(tableName);

    // If there is an existing scale on the same column in the table, return that one
    if (!hints.newScale) {
      const getExpressionUnit = (expr: string) => {
        const parsed = Expression.parse(expr);
        // In the case of an aggregation function
        if (parsed instanceof Expression.FunctionCall) {
          const args0 = parsed.args[0];
          if (args0 instanceof Expression.Variable) {
            const column = getByName(table.columns, args0.name);
            if (column) {
              return column.metadata.unit;
            }
          }
        }
        return null; // unit is unknown
      };

      const findScale = (mappings: Specification.Mappings) => {
        for (const name in mappings) {
          if (!mappings.hasOwnProperty(name)) {
            continue;
          }
          if (mappings[name].type == "scale") {
            const scaleMapping = mappings[name] as Specification.ScaleMapping;
            if (scaleMapping.scale != null) {
              if (
                scaleMapping.expression == expression &&
                (compareMarkAttributeNames(
                  markAttribute,
                  scaleMapping.attribute
                ) ||
                  !markAttribute ||
                  !scaleMapping.attribute)
              ) {
                const scaleObject = getById(
                  this.chart.scales,
                  scaleMapping.scale
                );
                if (scaleObject.outputType == outputType) {
                  return scaleMapping.scale;
                }
              }
              // TODO: Fix this part
              if (
                getExpressionUnit(scaleMapping.expression) ==
                  getExpressionUnit(expression) &&
                getExpressionUnit(scaleMapping.expression) != null
              ) {
                const scaleObject = getById(
                  this.chart.scales,
                  scaleMapping.scale
                );
                if (scaleObject.outputType == outputType) {
                  return scaleMapping.scale;
                }
              }
            }
          }
        }
        return null;
      };

      for (const element of this.chart.elements) {
        if (Prototypes.isType(element.classID, "plot-segment")) {
          const plotSegment = element as Specification.PlotSegment;
          if (plotSegment.table != table.name) {
            continue;
          }
          const glyph = getById(this.chart.glyphs, plotSegment.glyph);
          if (!glyph) {
            continue;
          }
          for (const element of glyph.marks) {
            const foundScale = findScale(element.mappings);
            if (foundScale) {
              return foundScale;
            }
          }
        } else {
          const foundScale = findScale(element.mappings);
          if (foundScale) {
            return foundScale;
          }
        }
      }
      if (this.chart.scaleMappings) {
        for (const scaleMapping of this.chart.scaleMappings) {
          if (
            scaleMapping.expression == expression &&
            ((scaleMapping.attribute &&
              compareMarkAttributeNames(
                scaleMapping.attribute,
                markAttribute
              )) ||
              !scaleMapping.attribute)
          ) {
            const scaleObject = getById(this.chart.scales, scaleMapping.scale);
            if (scaleObject && scaleObject.outputType == outputType) {
              return scaleMapping.scale;
            }
          }
        }
      }
    }
    // Infer a new scale for this item
    const scaleClassID = Prototypes.Scales.inferScaleType(
      valueType,
      valueKind,
      outputType
    );

    if (scaleClassID != null) {
      const newScale = this.chartManager.createObject(
        scaleClassID
      ) as Specification.Scale;
      newScale.properties.name = this.chartManager.findUnusedName("Scale");
      newScale.inputType = valueType;
      newScale.outputType = outputType;
      this.chartManager.addScale(newScale);
      const scaleClass = this.chartManager.getClassById(
        newScale._id
      ) as Prototypes.Scales.ScaleClass;

      const parentMainTable = this.getTables().find(
        (table) => table.type === TableType.ParentMain
      );
      if (parentMainTable) {
        table = parentMainTable;
      }

      scaleClass.inferParameters(
        this.chartManager.getGroupedExpressionVector(
          table.name,
          groupBy,
          expression
        ) as Specification.DataValue[],
        hints
      );

      return newScale._id;
    } else {
      return null;
    }
  }

  public isLegendExistForScale(scale: string) {
    // See if we already have a legend
    for (const element of this.chart.elements) {
      if (Prototypes.isType(element.classID, "legend")) {
        if (element.properties.scale == scale) {
          return true;
        }
      }
    }
    return false;
  }

  public toggleLegendForScale(
    scale: string,
    mapping: Specification.ScaleMapping
  ) {
    const scaleObject = getById(this.chartManager.chart.scales, scale);
    // See if we already have a legend
    for (const element of this.chart.elements) {
      if (Prototypes.isType(element.classID, "legend")) {
        if (element.properties.scale == scale) {
          this.chartManager.removeChartElement(element);
          return;
        }
      }
    }
    let newLegend = null;
    // Categorical-color scale
    if (scaleObject.classID == "scale.categorical<string,color>") {
      if (
        mapping &&
        mapping.valueIndex !== undefined &&
        mapping.valueIndex !== null
      ) {
        newLegend = this.chartManager.createObject(
          `legend.custom`
        ) as Specification.ChartElement;
      } else {
        newLegend = this.chartManager.createObject(
          `legend.categorical`
        ) as Specification.ChartElement;
      }
      newLegend.properties.scale = scale;
      newLegend.mappings.x = {
        type: "parent",
        parentAttribute: "x2",
      } as Specification.ParentMapping;
      newLegend.mappings.y = {
        type: "parent",
        parentAttribute: "y2",
      } as Specification.ParentMapping;
      this.chartManager.chart.mappings.marginRight = {
        type: "value",
        value: 100,
      } as Specification.ValueMapping;
    }
    // Numerical-color scale
    if (
      scaleObject.classID == "scale.linear<number,color>" ||
      scaleObject.classID == "scale.linear<integer,color>"
    ) {
      newLegend = this.chartManager.createObject(
        `legend.numerical-color`
      ) as Specification.ChartElement;
      newLegend.properties.scale = scale;
      newLegend.mappings.x = {
        type: "parent",
        parentAttribute: "x2",
      } as Specification.ParentMapping;
      newLegend.mappings.y = {
        type: "parent",
        parentAttribute: "y2",
      } as Specification.ParentMapping;
      this.chartManager.chart.mappings.marginRight = {
        type: "value",
        value: 100,
      } as Specification.ValueMapping;
    }
    // Numerical-number scale
    if (
      scaleObject.classID == "scale.linear<number,number>" ||
      scaleObject.classID == "scale.linear<integer,number>"
    ) {
      newLegend = this.chartManager.createObject(
        `legend.numerical-number`
      ) as Specification.ChartElement;
      newLegend.properties.scale = scale;
      newLegend.mappings.x1 = {
        type: "parent",
        parentAttribute: "x1",
      } as Specification.ParentMapping;
      newLegend.mappings.y1 = {
        type: "parent",
        parentAttribute: "y1",
      } as Specification.ParentMapping;
      newLegend.mappings.x2 = {
        type: "parent",
        parentAttribute: "x1",
      } as Specification.ParentMapping;
      newLegend.mappings.y2 = {
        type: "parent",
        parentAttribute: "y2",
      } as Specification.ParentMapping;
    }

    const mappingOptions = {
      type: "scale",
      table: mapping.table,
      expression: mapping.expression,
      valueType: mapping.valueType,
      scale: scaleObject._id,
      allowSelectValue:
        mapping &&
        mapping.valueIndex !== undefined &&
        mapping.valueIndex !== null,
    } as Specification.ScaleMapping;

    newLegend.mappings.mappingOptions = mappingOptions;

    this.chartManager.addChartElement(newLegend);
  }

  public getRepresentativeGlyphState(glyph: Specification.Glyph) {
    // Is there a plot segment using this glyph?
    for (const element of this.chart.elements) {
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = element as Specification.PlotSegment;
        if (plotSegment.glyph == glyph._id) {
          const state = this.chartManager.getClassById(plotSegment._id)
            .state as Specification.PlotSegmentState;
          return state.glyphs[0];
        }
      }
    }
    return null;
  }

  public solveConstraintsAndUpdateGraphics(mappingOnly: boolean = false) {
    this.solveConstraintsInWorker(mappingOnly).then(() => {
      this.emit(AppStore.EVENT_GRAPHICS);
    });
  }

  public async solveConstraintsInWorker(mappingOnly: boolean = false) {
    this.solverStatus = {
      solving: true,
    };
    this.emit(AppStore.EVENT_SOLVER_STATUS);

    await this.worker.solveChartConstraints(
      this.chart,
      this.chartState,
      this.dataset,
      this.preSolveValues,
      mappingOnly
    );
    this.preSolveValues = [];

    this.solverStatus = {
      solving: false,
    };
    this.emit(AppStore.EVENT_SOLVER_STATUS);
  }

  public newChartEmpty() {
    this.currentSelection = null;
    this.selectedGlyphIndex = {};
    this.currentTool = null;
    this.currentToolOptions = null;

    this.chart = createDefaultChart(this.dataset);
    this.chartManager = new Prototypes.ChartStateManager(
      this.chart,
      this.dataset
    );
    this.chartState = this.chartManager.chartState;
  }

  public deleteSelection() {
    const sel = this.currentSelection;
    this.currentSelection = null;
    this.emit(AppStore.EVENT_SELECTION);
    if (sel instanceof ChartElementSelection) {
      new Actions.DeleteChartElement(sel.chartElement).dispatch(
        this.dispatcher
      );
    }
    if (sel instanceof MarkSelection) {
      new Actions.RemoveMarkFromGlyph(sel.glyph, sel.mark).dispatch(
        this.dispatcher
      );
    }
    if (sel instanceof GlyphSelection) {
      new Actions.RemoveGlyph(sel.glyph).dispatch(this.dispatcher);
    }
  }

  public handleEscapeKey() {
    if (this.currentTool) {
      this.currentTool = null;
      this.emit(AppStore.EVENT_CURRENT_TOOL);
      return;
    }
    if (this.currentSelection) {
      new Actions.ClearSelection().dispatch(this.dispatcher);
    }
  }

  public getClosestSnappingGuide(point: { x: number; y: number }) {
    const chartClass = this.chartManager.getChartClass(
      this.chartManager.chartState
    );
    const boundsGuides = chartClass.getSnappingGuides();
    let chartGuides = boundsGuides.map((bounds) => {
      return {
        element: null,
        guide: bounds,
      };
    });
    const elements = this.chartManager.chart.elements;
    const elementStates = this.chartManager.chartState.elements;
    zipArray(elements, elementStates).forEach(
      (
        [layout, layoutState]: [
          Specification.ChartElement,
          Specification.ChartElementState
        ],
        index
      ) => {
        const layoutClass = this.chartManager.getChartElementClass(layoutState);
        chartGuides = chartGuides.concat(
          layoutClass.getSnappingGuides().map((bounds) => {
            return {
              element: layout,
              guide: bounds,
            };
          })
        );
      }
    );

    let minYDistance = null;
    let minXDistance = null;
    let minYGuide = null;
    let minXGuide = null;
    for (const g of chartGuides) {
      const guide = g.guide as Prototypes.SnappingGuides.Axis;
      // Find closest point
      if (guide.type == "y") {
        const dY = Math.abs(guide.value - point.y);
        if (dY < minYDistance || minYDistance == null) {
          minYDistance = dY;
          minYGuide = g;
        }
      } else if (guide.type == "x") {
        const dX = Math.abs(guide.value - point.x);
        if (dX < minXDistance || minXDistance == null) {
          minXDistance = dX;
          minXGuide = g;
        }
      }
    }

    return [minXGuide, minYGuide];
  }

  public buildChartTemplate(): Specification.Template.ChartTemplate {
    const builder = new ChartTemplateBuilder(
      this.chart,
      this.dataset,
      this.chartManager
    );
    const template = builder.build();
    return template;
  }

  public verifyUserExpressionWithTable(
    inputString: string,
    table: string,
    options: Expression.VerifyUserExpressionOptions = {}
  ) {
    if (table != null) {
      const dfTable = this.chartManager.dataflow.getTable(table);
      const rowIterator = function* () {
        for (let i = 0; i < dfTable.rows.length; i++) {
          yield dfTable.getRowContext(i);
        }
      };
      return Expression.verifyUserExpression(inputString, {
        data: rowIterator(),
        ...options,
      });
    } else {
      return Expression.verifyUserExpression(inputString, {
        ...options,
      });
    }
  }

  public updateScales() {
    try {
      const updatedScales: string[] = [];
      const updateScalesInternal = (
        scaleId: string,
        mappings: Specification.Guide<Specification.ObjectProperties>[],
        context: { glyph: Specification.Glyph; chart: Specification.Chart }
      ) => {
        if (updatedScales.find((scale) => scale === scaleId)) {
          return;
        }
        const scale = Prototypes.findObjectById(
          this.chart,
          scaleId
        ) as Specification.Scale;
        const filteredMappings = mappings
          .flatMap((el) => {
            return Object.keys(el.mappings).map((key) => {
              return {
                element: el,
                key,
                mapping: el.mappings[key],
              };
            });
          })
          .filter(
            (mapping) =>
              mapping.mapping.type === "scale" &&
              (mapping.mapping as ScaleMapping).scale === scaleId
          ) as {
          element: Specification.Element<Specification.ObjectProperties>;
          key: string;
          mapping: ScaleMapping;
        }[];

        // Figure out the groupBy
        let groupBy: Specification.Types.GroupBy = null;
        if (context.glyph) {
          // Find plot segments that use the glyph.
          this.chartManager.enumeratePlotSegments((cls) => {
            if (cls.object.glyph == context.glyph._id) {
              groupBy = cls.object.groupBy;
            }
          });
        }

        filteredMappings.forEach((mapping) => {
          const scaleClass = this.chartManager.getClassById(
            scaleId
          ) as Prototypes.Scales.ScaleClass;

          let values: any = [];
          let newScale = true;
          let reuseRange = false;
          let extendScale = true;

          // special case for legend to draw column names
          if (mapping.element.classID === "legend.custom") {
            const table = this.chartManager.dataflow.getTable(
              mapping.mapping.table
            );
            const parsedExpression = this.chartManager.dataflow.cache.parse(
              mapping.mapping.expression
            );
            values = parsedExpression.getValue(table) as ValueType[];
            newScale = true;
            extendScale = false;
            reuseRange = false;
          } else {
            if (scale.classID == "scale.categorical<string,color>") {
              newScale = true;
              extendScale = true;
              reuseRange = true;
            } else {
              newScale = false;
              extendScale = true;
              reuseRange = true;
            }
            values = this.chartManager.getGroupedExpressionVector(
              mapping.mapping.table,
              groupBy,
              mapping.mapping.expression
            );
          }
          scaleClass.inferParameters(values as any, {
            newScale,
            reuseRange,
            extendScale,
            rangeNumber: [
              (scale.mappings.rangeMin as ValueMapping)?.value as number,
              (scale.mappings.rangeMax as ValueMapping)?.value as number,
            ],
          });
          updatedScales.push(scaleId);
        });
      };

      const chartElements = this.chart.elements;

      const legendScales = chartElements
        .filter((el) => Prototypes.isType(el.classID, "legend"))
        .flatMap((el) => {
          return el.properties.scale as string;
        });

      legendScales.forEach((scale) => {
        updateScalesInternal(scale, chartElements, {
          chart: this.chart,
          glyph: null,
        });
        this.chart.glyphs.forEach((gl) =>
          updateScalesInternal(scale, gl.marks, {
            chart: this.chart,
            glyph: gl,
          })
        );
      });
    } catch (ex) {
      console.error("Updating of scales failed with error", ex);
    }
  }

  public updatePlotSegments() {
    // Get plot segments to update with new data
    const plotSegments: Specification.PlotSegment[] = this.chart.elements.filter(
      (element) => Prototypes.isType(element.classID, "plot-segment")
    ) as Specification.PlotSegment[];
    plotSegments.forEach((plot) => {
      const table = this.dataset.tables.find(
        (table) => table.name === plot.table
      );

      // xData
      const xDataProperty: any = plot.properties.xData;
      if (xDataProperty) {
        const xData = new DragData.DataExpression(
          table,
          xDataProperty.expression,
          xDataProperty.valueType,
          {
            kind:
              xDataProperty.type === "numerical" &&
              xDataProperty.numericalMode === "temporal"
                ? DataKind.Temporal
                : xDataProperty.type,
            orderMode: xDataProperty.orderMode
              ? xDataProperty.orderMode
              : xDataProperty.valueType === "string"
              ? "order"
              : null,
            order: xDataProperty.order,
          },
          xDataProperty.rawColumnExpr
        );

        this.bindDataToAxis({
          property: "xData",
          dataExpression: xData,
          object: plot,
          appendToProperty: null,
          type: null, // TODO get type for column, from current dataset
          numericalMode: xDataProperty.numericalMode,
        });
      }

      // yData
      const yDataProperty: any = plot.properties.yData;
      if (yDataProperty) {
        const yData = new DragData.DataExpression(
          table,
          yDataProperty.expression,
          yDataProperty.valueType,
          {
            kind:
              yDataProperty.type === "numerical" &&
              yDataProperty.numericalMode === "temporal"
                ? DataKind.Temporal
                : yDataProperty.type,
            orderMode: yDataProperty.orderMode
              ? yDataProperty.orderMode
              : yDataProperty.valueType === "string"
              ? "order"
              : null,
            order: yDataProperty.order,
          },
          yDataProperty.rawColumnExpr
        );

        this.bindDataToAxis({
          property: "yData",
          dataExpression: yData,
          object: plot,
          appendToProperty: null,
          type: null, // TODO get type for column, from current dataset
          numericalMode: yDataProperty.numericalMode,
        });
      }

      const axis: any = plot.properties.axis;
      if (axis) {
        const axisData = new DragData.DataExpression(
          table,
          axis.expression,
          axis.valueType,
          {
            kind:
              axis.type === "numerical" && axis.numericalMode === "temporal"
                ? DataKind.Temporal
                : axis.type,
            orderMode: axis.orderMode
              ? axis.orderMode
              : axis.valueType === "string"
              ? "order"
              : null,
            order: axis.order,
          },
          axis.rawColumnExpr
        );

        this.bindDataToAxis({
          property: "axis",
          dataExpression: axisData,
          object: plot,
          appendToProperty: null,
          type: null, // TODO get type for column, from current dataset
          numericalMode: axis.numericalMode,
        });
      }
    });
  }

  private getBindingByDataKind(kind: DataKind) {
    switch (kind) {
      case DataKind.Numerical:
        return "numerical";
      case DataKind.Temporal:
      case DataKind.Ordinal:
      case DataKind.Categorical:
        return "categorical";
    }
  }

  public bindDataToAxis(options: {
    object: Specification.Object;
    property?: string;
    appendToProperty?: string;
    dataExpression: DragData.DataExpression;
    type?: "default" | "numerical" | "categorical";
    numericalMode?: "linear" | "logarithmic" | "temporal";
  }) {
    this.saveHistory();
    const { object, property, appendToProperty, dataExpression } = options;
    let groupExpression = dataExpression.expression;
    let valueType = dataExpression.valueType;
    const propertyValue = object.properties[options.property] as any;
    const type = dataExpression.type
      ? options.type
      : this.getBindingByDataKind(options.dataExpression.metadata.kind);
    const rawColumnExpression = dataExpression.rawColumnExpression;
    if (
      rawColumnExpression &&
      dataExpression.valueType !== DataType.Date &&
      (options.dataExpression.metadata.kind === DataKind.Ordinal ||
        options.dataExpression.metadata.kind === DataKind.Categorical)
    ) {
      groupExpression = rawColumnExpression;
      valueType = DataType.String;
    }

    let dataBinding: Specification.Types.AxisDataBinding = {
      type: options.type || type,
      // Don't change current expression (use current expression), if user appends data expression ()
      expression:
        appendToProperty === "dataExpressions" && propertyValue
          ? ((propertyValue as any).expression as string)
          : groupExpression,
      rawExpression: dataExpression.rawColumnExpression,
      valueType,
      gapRatio: propertyValue?.gapRatio || 0.1,
      visible: true,
      side: propertyValue?.side || "default",
      style: deepClone(Prototypes.PlotSegments.defaultAxisStyle),
      numericalMode: options.numericalMode,
      dataKind: dataExpression.metadata.kind,
      order: dataExpression.metadata.order,
      orderMode: dataExpression.metadata.orderMode,
      autoDomainMax: true,
      autoDomainMin: true,
    };

    let expressions = [groupExpression];

    if (appendToProperty) {
      if (object.properties[appendToProperty] == null) {
        object.properties[appendToProperty] = [
          { name: uniqueID(), expression: groupExpression },
        ];
      } else {
        (object.properties[appendToProperty] as any[]).push({
          name: uniqueID(),
          expression: groupExpression,
        });
      }
      expressions = (object.properties[appendToProperty] as any[]).map(
        (x) => x.expression
      );
      if (object.properties[property] == null) {
        object.properties[property] = dataBinding;
      } else {
        dataBinding = object.properties[
          property
        ] as Specification.Types.AxisDataBinding;
      }
    } else {
      object.properties[property] = dataBinding;
    }

    const groupBy: Specification.Types.GroupBy = this.getGroupingExpression(
      object
    );
    let values: ValueType[] = [];
    if (
      appendToProperty == "dataExpressions" &&
      dataBinding.domainMax !== undefined &&
      dataBinding.domainMin !== undefined
    ) {
      // save current range of scale if user adds data
      values = values.concat(dataBinding.domainMax, dataBinding.domainMin);
    }
    for (const expr of expressions) {
      const r = this.chartManager.getGroupedExpressionVector(
        dataExpression.table.name,
        groupBy,
        expr
      );
      values = values.concat(r);
    }

    if (dataExpression.metadata) {
      switch (dataExpression.metadata.kind) {
        case Specification.DataKind.Categorical:
        case Specification.DataKind.Ordinal:
          {
            dataBinding.type = "categorical";
            dataBinding.valueType = dataExpression.valueType;
            dataBinding.categories = this.getCategoriesForDataBinding(
              dataExpression.metadata,
              values
            );
          }

          break;
        case Specification.DataKind.Numerical:
          {
            const scale = new Scale.LinearScale();
            scale.inferParameters(values as number[]);
            dataBinding.domainMin = scale.domainMin;
            dataBinding.domainMax = scale.domainMax;
            dataBinding.type = "numerical";
            dataBinding.numericalMode = "linear";
          }
          break;
        case Specification.DataKind.Temporal:
          {
            const scale = new Scale.DateScale();
            scale.inferParameters(values as number[], false);
            dataBinding.domainMin = scale.domainMin;
            dataBinding.domainMax = scale.domainMax;
            dataBinding.type = "numerical";
            dataBinding.numericalMode = "temporal";
            dataBinding.categories = this.getCategoriesForDataBinding(
              dataExpression.metadata,
              values
            );
          }
          break;
      }
    }

    // Adjust sublayout option if current option is not available
    const props = object.properties as Prototypes.PlotSegments.Region2DProperties;
    if (props.sublayout) {
      if (
        props.sublayout.type == "dodge-x" ||
        props.sublayout.type == "dodge-y" ||
        props.sublayout.type == "grid"
      ) {
        if (props.xData && props.xData.type == "numerical") {
          props.sublayout.type = "overlap";
        }
        if (props.yData && props.yData.type == "numerical") {
          props.sublayout.type = "overlap";
        }
      }
    }
  }

  public getCategoriesForDataBinding(
    metadata: Dataset.ColumnMetadata,
    values: ValueType[]
  ) {
    let categories: string[];
    if (metadata.order) {
      categories = metadata.order.slice();
    } else {
      const scale = new Scale.CategoricalScale();
      let orderMode: OrderMode = OrderMode.alphabetically;
      if (metadata.orderMode) {
        orderMode = metadata.orderMode;
      }
      scale.inferParameters(values as string[], orderMode);
      categories = new Array<string>(scale.length);
      scale.domain.forEach(
        (index: any, x: any) => (categories[index] = x.toString())
      );
    }
    return categories;
  }

  public getGroupingExpression(
    object: Specification.Object<Specification.ObjectProperties>
  ) {
    let groupBy: Specification.Types.GroupBy = null;
    if (Prototypes.isType(object.classID, "plot-segment")) {
      groupBy = (object as Specification.PlotSegment).groupBy;
    } else {
      // Find groupBy for data-driven guide
      if (Prototypes.isType(object.classID, "mark")) {
        for (const glyph of this.chart.glyphs) {
          if (glyph.marks.indexOf(object) >= 0) {
            // Found the glyph
            this.chartManager.enumeratePlotSegments((cls) => {
              if (cls.object.glyph == glyph._id) {
                groupBy = cls.object.groupBy;
              }
            });
          }
        }
      }
    }
    return groupBy;
  }

  public getLocaleFileFormat(): LocaleFileFormat {
    return this.localeFileFormat;
  }

  public setLocaleFileFormat(value: LocaleFileFormat) {
    this.localeFileFormat = value;
  }

  public checkColumnsMapping(
    column: Specification.Template.Column,
    tableType: TableType,
    dataset: Dataset.Dataset
  ): Specification.Template.Column[] {
    const unmappedColumns: Specification.Template.Column[] = [];
    const dataTable = dataset.tables.find((t) => t.type === tableType);
    const found = dataTable.columns.find((c) => c.name === column.name);
    if (!found) {
      unmappedColumns.push(column);
    }
    return unmappedColumns;
  }
}
