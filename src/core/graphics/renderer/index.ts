// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

/**
 * See {@link ChartRenderer} for details
 *
 * @packageDocumentation
 * @preferred
 */

import { ReactElement } from "react";
import {
  getById,
  MultistringHashMap,
  Point,
  transpose,
  zipArray,
  ZoomInfo,
} from "../../common";
import * as Dataset from "../../dataset";
import * as Prototypes from "../../prototypes";
import * as Specification from "../../specification";
import { CartesianCoordinates, CoordinateSystem } from "../coordinate_system";
import { Element, Group, makeGroup, makeRect } from "../elements";

export function facetRows(
  rows: Dataset.Row[],
  indices: number[],
  columns?: string[]
): number[][] {
  if (columns == null) {
    return [indices];
  } else {
    const facets = new MultistringHashMap<number[]>();
    for (const index of indices) {
      const row = rows[index];
      const facetValues = columns.map((c) => <string>row[c]);
      if (facets.has(facetValues)) {
        facets.get(facetValues).push(index);
      } else {
        facets.set(facetValues, [index]);
      }
    }
    return Array.from(facets.values());
  }
}

export interface RenderEvents {
  afterRendered: () => void;
}

/**
 * The class is responsible for rendering the visual part of the chart (coordinates, elements such as glyph marks e.t.c).
 * The module calls methods {@link MarkClass.getGraphics} implemented in each marks (rect, image, text, symbol e.t.c)
 *
 */
export class ChartRenderer {
  constructor(
    private manager: Prototypes.ChartStateManager,
    private renderEvents?: RenderEvents
  ) {
    this.manager = manager;
  }

  /**
   * Render marks in a glyph
   * @returns an array of groups with the same size as glyph.marks
   */
  private renderGlyphMarks(
    plotSegment: Specification.PlotSegment,
    plotSegmentState: Specification.PlotSegmentState,
    coordinateSystem: CoordinateSystem,
    offset: Point,
    glyph: Specification.Glyph,
    state: Specification.GlyphState,
    glyphIndex: number
  ): Group[] {
    return zipArray(glyph.marks, state.marks).map(([mark, markState], markIndex) => {
      if (!mark.properties.visible) {
        return null;
      }
      const cls = this.manager.getMarkClass(markState);
      const markGraphics = cls.getGraphics(
        coordinateSystem,
        offset,
        glyphIndex,
        this.manager,
        state.emphasized
      );
      if (markGraphics != null) {
        if (markGraphics.key) {
          //ps:${plotSegment._id}-gl:${glyph._id-mi:${markIndex}-glyph:1-obj:h1dkom6xzog
          //ps:auvmancnohe-gl:8tbq6db1yst-mi:1-h1dkom6xzog-glyph:1-obj:h1dkom6xzog
          markGraphics.key = `ps:${plotSegment._id}-gl:${glyph._id}-${mark._id}-${markGraphics.key}`
        } else {
          console.log('no key at', markGraphics, cls);
          // g.key = `ps:${plotSegment._id}-${markIndex}`
        }
        markGraphics.selectable = {
          plotSegment,
          glyphIndex: glyphIndex,
          rowIndices: plotSegmentState.dataRowIndices[glyphIndex],
          enableTooltips: <boolean>cls.object.properties.enableTooltips,
          enableContextMenu: <boolean>cls.object.properties.enableContextMenu,
          enableSelection: <boolean>cls.object.properties.enableSelection,
        };
        const group = makeGroup([markGraphics]);
        group.key = `gl:${glyph._id}-mkst-gr:${markIndex}-${markGraphics.key}`;
        return group;
      } else {
        return null;
      }
    });
  }

  /**
   * Method calls getGraphics method of {@link Mark} objects to get graphical representation of element
   * @param dataset Dataset of charticulator
   * @param chart Chart object
   * @param chartState State of chart and chart elements
   */
  // eslint-disable-next-line
  private renderChart(
    dataset: Dataset.Dataset,
    chart: Specification.Chart,
    chartState: Specification.ChartState
  ): Group {
    const graphics: Element[] = [];

    // Chart background
    const bg = this.manager.getChartClass(chartState).getBackgroundGraphics();
    if (bg) {
      graphics.push(bg);
    }

    const linkGroup = makeGroup([]);
    linkGroup.key = `linkGroup-${chart._id}`;
    graphics.push(linkGroup);

    const elementsAndStates = zipArray(chart.elements, chartState.elements);

    // Render layout graphics
    for (const [element, elementState] of elementsAndStates) {
      if (!element.properties.visible) {
        continue;
      }
      // Render marks if this is a plot segment
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegment = <Specification.PlotSegment>element;
        const plotSegmentState = <Specification.PlotSegmentState>elementState;
        const mark = getById(chart.glyphs, plotSegment.glyph);
        const plotSegmentClass = this.manager.getPlotSegmentClass(
          plotSegmentState
        );
        const coordinateSystem = plotSegmentClass.getCoordinateSystem();
        // Render glyphs
        const glyphArrays: Group[][] = [];
        for (const [
          glyphIndex,
          glyphState,
        ] of plotSegmentState.glyphs.entries()) {
          const anchorX = <number>glyphState.marks[0].attributes.x;
          const anchorY = <number>glyphState.marks[0].attributes.y;
          const offsetX = <number>glyphState.attributes.x - anchorX;
          const offsetY = <number>glyphState.attributes.y - anchorY;
          const g = this.renderGlyphMarks(
            plotSegment,
            plotSegmentState,
            coordinateSystem,
            { x: offsetX, y: offsetY },
            mark,
            glyphState,
            glyphIndex
          );
          if (g !== null) {
            glyphArrays.push(g);
          }
        }
        // Transpose glyphArrays so each mark is in a layer
        const glyphElements = transpose(glyphArrays).map((x) => makeGroup(x));
        const gGlyphs = makeGroup(glyphElements);
        gGlyphs.key = `glyphs-of-${plotSegment._id}`;
        gGlyphs.transform = coordinateSystem.getBaseTransform();
        const g = plotSegmentClass.getPlotSegmentGraphics(
          gGlyphs,
          this.manager
        );
        // render plotsegment background elements
        const gBackgroundElements = makeGroup([]);
        const plotSegmentBackgroundElements = plotSegmentClass.getPlotSegmentBackgroundGraphics(
          this.manager
        );
        if (plotSegmentBackgroundElements) {
          gBackgroundElements.key = `bg-ps-${plotSegmentBackgroundElements.key}`;
        }
        gBackgroundElements.elements.push(plotSegmentBackgroundElements);
        const gElement = makeGroup([]);
        gElement.key = `warpper-${element._id}`
        gElement.elements.push(gBackgroundElements);
        gElement.elements.push(g);
        graphics.push(gElement);
      } else if (Prototypes.isType(element.classID, "mark")) {
        const cs = new CartesianCoordinates({ x: 0, y: 0 });
        const gElement = makeGroup([]);
        const elementClass = this.manager.getMarkClass(elementState);
        const markGraphics = elementClass.getGraphics(
          cs,
          { x: 0, y: 0 },
          null,
          this.manager
          );
        gElement.key = `mw-${markGraphics.key}`;
        gElement.elements.push(markGraphics);
        graphics.push(gElement);
      } else {
        const gElement = makeGroup([]);
        const elementClass = this.manager.getChartElementClass(elementState);
        const elementGraphic = elementClass.getGraphics(this.manager);
        gElement.key = `ew-${elementGraphic}`;
        gElement.elements.push(elementGraphic);
        graphics.push(gElement);
      }
    }

    const chartEventHandlerRect = makeRect(
      <number>chartState.attributes.x1,
      <number>chartState.attributes.y1,
      <number>chartState.attributes.x2,
      <number>chartState.attributes.y2,
      {
        fillColor: null,
        opacity: 1,
      }
    );
    chartEventHandlerRect.key = `chartEventHandlerRect-${chart._id}`;

    // don't need to handle other events by chart.
    if (chart.properties.enableContextMenu) {
      chartEventHandlerRect.selectable = {
        plotSegment: null,
        glyphIndex: null,
        rowIndices: null,
        enableTooltips: false,
        enableContextMenu:
          chart.properties.enableContextMenu !== undefined
            ? <boolean>chart.properties.enableContextMenu
            : true,
        enableSelection: false,
      };
    }

    return makeGroup([chartEventHandlerRect, ...graphics]);
  }

  public renderControls(
    chart: Specification.Chart,
    chartState: Specification.ChartState,
    zoom: ZoomInfo
  ) {
    const elementsAndStates = zipArray(chart.elements, chartState.elements);

    let controls: ReactElement<any>[] = [];

    // Render control graphics
    for (const [element, elementState] of elementsAndStates) {
      if (!element.properties.visible) {
        continue;
      }
      // Render plotsegment controls
      if (Prototypes.isType(element.classID, "plot-segment")) {
        const plotSegmentState = <Specification.PlotSegmentState>elementState;
        const plotSegmentClass = this.manager.getPlotSegmentClass(
          plotSegmentState
        );
        const plotSegmentBackgroundControlElements = plotSegmentClass.renderControls(
          this.manager,
          zoom
        );

        controls = controls.concat(plotSegmentBackgroundControlElements);
      }
    }

    return controls;
  }

  public render(): Group {
    const group = this.renderChart(
      this.manager.dataset,
      this.manager.chart,
      this.manager.chartState
    );
    group.key= `chart-${this.manager.chart._id}`
    if (this.renderEvents?.afterRendered) {
      this.renderEvents.afterRendered();
    }
    return group;
  }
}

export * from "./text_measurer";
