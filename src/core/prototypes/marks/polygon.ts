/* eslint-disable no-debugger */
/* eslint-disable @typescript-eslint/no-unused-vars */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Color, Point, rgbToHex, zipArray } from "../../common";
import { ConstraintSolver, ConstraintStrength } from "../../solver";
import * as Specification from "../../specification";
import { DataKind, MappingType } from "../../specification";
import {
  PolygonElementAttributes,
  PolygonElementProperties,
  polygonAttributes,
} from "./polygon.attrs";

import {
  BoundingBox,
  Controls,
  DropZones,
  Handles,
  LinkAnchor,
  ObjectClass,
  ObjectClassMetadata,
  SnappingGuides,
  strokeStyleToDashArray,
  TemplateParameters,
} from "../common";

import * as Graphics from "../../graphics";
import { EmphasizableMarkClass } from "./emphasis";
import { ChartStateManager } from "../state";
import { strings } from "../../../strings";
import { max } from "d3-array";

export { PolygonElementAttributes, PolygonElementProperties };

export class PolygonElementClass extends EmphasizableMarkClass<
  PolygonElementProperties,
  PolygonElementAttributes
> {
  public static classID = "mark.polygon";
  public static type = "mark";

  public static metadata: ObjectClassMetadata = {
    displayName: "Polygon",
    iconPath: "Polygon",
    creatingInteraction: {
      type: "line-polygon",
      mapping: {
        x1: "x1",
        y1: "y1",
        x2: "x2",
        y2: "y2",
        x3: "x3",
        y3: "y3"
        ///....
      },
    },
  };

  public static defaultProperties: Partial<PolygonElementProperties> = {
    ...ObjectClass.defaultProperties,
    strokeStyle: "solid",
    visible: true,
  };

  public static defaultMappingValues: Partial<PolygonElementAttributes> = {
    stroke: { r: 0, g: 0, b: 0 },
    strokeWidth: 1,
    opacity: 1,
    visible: true,
  };

  public attributes = polygonAttributes;
  public attributeNames = Object.keys(polygonAttributes);

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    super.initializeState();

    const attrs = this.state.attributes;
    // attrs.pointsX = new Proxy([0], {
    //   get: (target, name) => {
    //     if (typeof name === "string" && Number.isInteger(+name)) {
    //       return attrs[`x${(+name) + 1}`];
    //     } else
    //     if (typeof name === "string" && name === "length") {
    //       return Object.keys(attrs).filter((key) => key.startsWith("x")).length;
    //     }
    //     else {
    //       return target[name];
    //     }
    //   },
    //   set: (target, name, value) => {
    //     if (typeof name === "string" && Number.isInteger(+name)) {
    //       attrs[`x${(+name) + 1}`] = value;
    //       return true;
    //     } else {
    //       target[name] = value;
    //     }
    //     return false;
    //   }
    // });
    // attrs.pointsY = 
    // new Proxy([0], {
    //   get: (target, name) => {
    //     if (typeof name === "string" && Number.isInteger(+name)) {
    //       return attrs[`y${(+name) + 1}`]
    //     } else
    //     if (typeof name === "string" && name === "length") {
    //       return Object.keys(attrs).filter((key) => key.startsWith("y")).length;
    //     }
    //     else {
    //       return target[name];
    //     }
    //   },
    //   set: (target, name, value) => {
    //     if (typeof name === "string") {
    //       attrs[`y${(+name) + 1}`] = value;
    //       return true;
    //     }
    //     return false;
    //   }
    // });
    attrs.dx1 = 0;
    attrs.dy1 = 0;
    attrs.dx2 = 0;
    attrs.dy2 = 0;
    attrs.dx3 = 0;
    attrs.dy3 = 0;
    attrs.stroke = { r: 0, g: 0, b: 0 };
    attrs.strokeWidth = 1;
    attrs.opacity = 1;
    attrs.visible = true;
    attrs.closed = true;
  }

  /** Get link anchors for this mark */
  public getLinkAnchors(mode: "begin" | "end"): LinkAnchor.Description[] {
    const attrs = this.state.attributes;

    const keys = Object.keys(attrs).filter((key) => key.startsWith("x"));
    const points = keys.map((x, index) => [attrs[`x${index + 1}`] as number, attrs[`y${index + 1}`] as number]);

    return [
      ...points.map(([x, y]) => {
        return {
          element: this.object._id,
          points: [
            {
              x: x,
              y: y,
              xAttribute: "x1",
              yAttribute: "y1",
              direction: { x: mode == "begin" ? 1 : -1, y: 0 },
            },
          ],
        }
      })
    ];
  }

  /** Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
  public buildConstraints(solver: ConstraintSolver): void {
    debugger;
    const xkeys = Object.keys(this.attributes).filter((key) => key.startsWith("x"));
    const xi = xkeys.map((x, index) => `x${index + 1}`);
    const dxi = xkeys.map((x, index) => `dx${index + 1}`);

    const ykeys = Object.keys(this.attributes).filter((key) => key.startsWith("y"));
    const yi = ykeys.map((x, index) => `y${index + 1}`);
    const dyi = ykeys.map((x, index) => `dy${index + 1}`);

    const xivariable = solver.attrs(
      this.state.attributes,
      xi
    );

    const yivariable = solver.attrs(
      this.state.attributes,
      yi
    );
    
    const dxivariable = solver.attrs(
      this.state.attributes,
      dxi
    );
    
    const dyivariable = solver.attrs(
      this.state.attributes,
      dyi
    );

    for (let attributeIndex = 0; attributeIndex < xivariable.length - 1; attributeIndex++) {
      const dx = dxivariable[attributeIndex];
      const x1 = xivariable[attributeIndex];
      const x2 = xivariable[attributeIndex + 1];
      
      // dx = x2 - x1
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[1, dx]],
        [
          [1, x2],
          [-1, x1],
        ]
      );
    }
    for (let attributeIndex = 0; attributeIndex < yivariable.length - 1; attributeIndex++) {
      const dy = dyivariable[attributeIndex];
      const y1 = yivariable[attributeIndex];
      const y2 = yivariable[attributeIndex + 1];
      
      // dx = x2 - x1
      solver.addLinear(
        ConstraintStrength.HARD,
        0,
        [[1, dy]],
        [
          [1, y2],
          [-1, y1],
        ]
      );
    }
  }

  /** Get the graphical element from the element */
  public getGraphics(
    cs: Graphics.CoordinateSystem,
    offset: Point,
    // eslint-disable-next-line
    glyphIndex = 0,
    // eslint-disable-next-line
    manager: ChartStateManager,
    emphasize?: boolean
  ): Graphics.Element {
    const attrs = this.state.attributes;
    if (!attrs.visible || !this.object.properties.visible) {
      return null;
    }
    const helper = new Graphics.CoordinateSystemHelper(cs);

    const lines = [];
    const polygon = Graphics.makeGroup(lines);
    polygon.key = `polygon-${glyphIndex}-${this.object._id}`;
    // const points = zipArray(attrs.pointsX, attrs.pointsY);
    const keys = Object.keys(attrs).filter((key) => key.startsWith("x"));
    const points = keys.map((x, index) => [attrs[`x${index + 1}`] as number, attrs[`y${index + 1}`] as number]);

    if (this.object.properties.closed) {
      points.push(points[0]);
    }

    for (let index = 0; index < points.length - 1; index++) {
      const x = points[index][0];
      const y = points[index][1];
      const x2 = points[index + 1][0];
      const y2 = points[index + 1][1];
      const part = helper.line(
        x + offset.x,
        y + offset.y,
        x2 + offset.x,
        y2 + offset.y,
        {
          strokeColor: attrs.stroke,
          strokeOpacity: attrs.opacity,
          strokeWidth: attrs.strokeWidth,
          strokeDasharray: strokeStyleToDashArray(
            this.object.properties.strokeStyle
          ),
          ...this.generateEmphasisStyle(emphasize),
        },
        `polygon-${glyphIndex}-${this.object._id}-${x}-${y}-${x2}-${y2}-${index}`
      );
      lines.push(part);
    }

    return polygon;
  }

  /** Get DropZones given current state */
  public getDropZones(): DropZones.Description[] {
    const attrs = <PolygonElementAttributes>this.state.attributes;
    const { x1, y1, x2, y2 } = attrs;
    const cx = x1;
    const cy = y1;
    return [
      // <DropZones.Line>{
      //   type: "line",
      //   p1: { x: x2, y: cy },
      //   p2: { x: x1, y: cy },
      //   title: "dx",
      //   accept: {
      //     kind: DataKind.Numerical,
      //     table: (this.parent as RectangleGlyph).object.table,
      //   },
      //   dropAction: {
      //     scaleInference: {
      //       attribute: "dx",
      //       attributeType: "number",
      //       hints: { autoRange: true, startWithZero: "always" },
      //     },
      //   },
      // },
      // <DropZones.Line>{
      //   type: "line",
      //   p1: { x: cx, y: y1 },
      //   p2: { x: cx, y: y2 },
      //   title: "dy",
      //   accept: {
      //     kind: DataKind.Numerical,
      //     table: (this.parent as RectangleGlyph).object.table,
      //   },
      //   dropAction: {
      //     scaleInference: {
      //       attribute: "dy",
      //       attributeType: "number",
      //       hints: { autoRange: true, startWithZero: "always" },
      //     },
      //   },
      // },
    ];
  }

  /** Get bounding rectangle given current state */
  public getHandles(): Handles.Description[] {
    const attrs = <PolygonElementAttributes>this.state.attributes;

    const xkeys = Object.keys(attrs).filter((key) => key.startsWith("x"));
    const ykeys = Object.keys(attrs).filter((key) => key.startsWith("y"));

    const points = zipArray(xkeys, ykeys).map(([x, y], index) => [attrs[x], attrs[y]]);

    return [
      ...points.map(([x, y], index) => {
        return (<Handles.Point>{
          type: "point",
          x: x,
          y: y,
          actions: [
            { type: "attribute", source: "x", attribute: `x${index + 1}` },
            { type: "attribute", source: "y", attribute: `y${index + 1}` },
          ],
        });
      })
    ];
  }

  public getBoundingBox(): BoundingBox.Description {
    const attrs = <PolygonElementAttributes>this.state.attributes;
    const keys = Object.keys(attrs).filter((key) => key.startsWith("x"));
    const points = keys.map((x, index) => [attrs[`x${index + 1}`] as number, attrs[`y${index + 1}`] as number]);

    // TODO repalce by rect bounding box
    return <BoundingBox.Circle>{
      type: "circle",
      cx: attrs.cx,
      cy: attrs.cy,
      radius: max(points, (p) => Math.sqrt(p[0] * p[0] + p[1] * p[1])),
    };
  }

  public getSnappingGuides(): SnappingGuides.Description[] {
    const attrs = <PolygonElementAttributes>this.state.attributes;

    const { cx, cy } = attrs;
    const keys = Object.keys(attrs).filter((key) => key.startsWith("x"));
    const points = keys.map((x, index) => [attrs[`x${index + 1}`] as number, attrs[`y${index + 1}`] as number]);

    return [
      ...points.flatMap(([x, y], index) => {
        return [
          <SnappingGuides.Axis>{ type: "x", value: x, attribute: `x[${index}]` },
          <SnappingGuides.Axis>{ type: "y", value: y, attribute: `y[${index}]` },
        ]
      }),
      <SnappingGuides.Axis>{ type: "x", value: cx, attribute: "cx" },
      <SnappingGuides.Axis>{ type: "y", value: cy, attribute: "cy" },
    ];
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager
  ): Controls.Widget[] {
    const parentWidgets = super.getAttributePanelWidgets(manager);
    return [
      manager.verticalGroup(
        {
          header: strings.toolbar.line,
        },
        [
          manager.mappingEditor(strings.objects.line.xSpan, "dx", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [Specification.DataKind.Numerical],
            defaultAuto: true,
            searchSection: strings.toolbar.line,
          }),
          manager.mappingEditor(strings.objects.line.ySpan, "dy", {
            hints: { autoRange: true, startWithZero: "always" },
            acceptKinds: [Specification.DataKind.Numerical],
            defaultAuto: true,
            searchSection: strings.toolbar.line,
          }),
          manager.mappingEditor(
            strings.objects.visibleOn.visibility,
            "visible",
            {
              defaultValue: true,
              searchSection: strings.toolbar.line,
            }
          ),
        ]
      ),
      manager.verticalGroup(
        {
          header: strings.objects.style,
        },
        [
          manager.mappingEditor(strings.objects.stroke, "stroke", {
            searchSection: strings.objects.style,
          }),
          manager.mappingEditor(strings.objects.strokeWidth, "strokeWidth", {
            hints: { rangeNumber: [0, 5] },
            defaultValue: 1,
            numberOptions: {
              showSlider: true,
              sliderRange: [0, 10],
              minimum: 0,
            },
            searchSection: strings.objects.style,
          }),
          manager.inputSelect(
            { property: "strokeStyle" },
            {
              type: "dropdown",
              showLabel: true,
              icons: ["stroke/solid", "stroke/dashed", "stroke/dotted"],
              isLocalIcons: true,
              labels: [
                strings.objects.links.solid,
                strings.objects.links.dashed,
                strings.objects.links.dotted,
              ],
              options: ["solid", "dashed", "dotted"],
              label: strings.objects.line.lineStyle,
              searchSection: strings.objects.style,
            }
          ),
          manager.mappingEditor(strings.objects.opacity, "opacity", {
            hints: { rangeNumber: [0, 1] },
            defaultValue: 1,
            numberOptions: {
              showSlider: true,
              minimum: 0,
              maximum: 1,
              step: 0.1,
            },
            searchSection: strings.objects.style,
          }),
        ]
      ),
    ].concat(parentWidgets);
  }

  public getTemplateParameters(): TemplateParameters {
    const properties: Specification.Template.Property[] = [];
    if (
      this.object.mappings.visible &&
      this.object.mappings.visible.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "visible",
        },
        type: Specification.AttributeType.Boolean,
        default: this.state.attributes.visible,
      });
    }
    if (
      this.object.mappings.stroke &&
      this.object.mappings.stroke.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "stroke",
        },
        type: Specification.AttributeType.Color,
        default:
          this.state.attributes.stroke &&
          rgbToHex(<Color>this.state.attributes.stroke),
      });
    }
    if (
      this.object.mappings.strokeWidth &&
      this.object.mappings.strokeWidth.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "strokeWidth",
        },
        type: Specification.AttributeType.Number,
        default: this.state.attributes.strokeWidth,
      });
      properties.push({
        objectID: this.object._id,
        target: {
          property: "strokeStyle",
        },
        type: Specification.AttributeType.Enum,
        default: this.object.properties.strokeStyle,
      });
    }
    if (
      this.object.mappings.opacity &&
      this.object.mappings.opacity.type === MappingType.value
    ) {
      properties.push({
        objectID: this.object._id,
        target: {
          attribute: "opacity",
        },
        type: Specification.AttributeType.Number,
        default: this.state.attributes.opacity,
      });
    }
    return {
      properties,
    };
  }
}
