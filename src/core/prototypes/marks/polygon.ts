/* eslint-disable max-lines-per-function */
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
  AttributeDescription,
  AttributeDescriptions,
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
    closed: true,
    pointsCount: 3,
  };

  public static defaultMappingValues: Partial<PolygonElementAttributes> = {
    stroke: { r: 0, g: 0, b: 0 },
    fill: { r: 17, g: 141, b: 255 },
    fillStart: { r: 17, g: 141, b: 255 },
    fillStop: { r: 255, g: 255, b: 255 },
    strokeWidth: 1,
    opacity: 1,
    visible: true,
  };

  public _attributes = polygonAttributes;

  public get attributes() {
    const attributes = {
      ...this._attributes,
    }

    const dynamic = (new Array(this.object.properties.pointsCount))
      .fill(0)
      .map((_, i) => `x${i + 1}`)
      .concat((new Array(this.object.properties.pointsCount))
        .fill(0).map((_, i) => `y${i + 1}`));

    const dynamicXY = dynamic.map((key) => {
      return <AttributeDescription>{
        name: key,
        type: Specification.AttributeType.Number,
      }
    });

    dynamic.pop();
    const dynamicD = dynamicXY.map((key) => {
      return <AttributeDescription>{
        name: `d${key}`,
        type: Specification.AttributeType.Number,
      }
    });

    for (const attr of dynamicXY) {
      attributes[attr.name] = attr;
    }

    for (const attr of dynamicD) {
      attributes[attr.name] = attr;
    }

    return attributes;
  }

  public set attributes(value) {
    this._attributes = value;
  }

  public _attributeNames = Object.keys(polygonAttributes);

  public set attributeNames(value: string[]) {
    this.attributeNames = value;
  }

  public get attributeNames(): string[] {
    return Object.keys(this.state.attributes);
  }

  // Initialize the state of an element so that everything has a valid value
  public initializeState(): void {
    super.initializeState();

    const attrs = this.state.attributes;

    const pointsCount = this.object.properties.pointsCount;

    for (let i = 1; i <= pointsCount; i++) {
      attrs[`x${i}`] = 0;
      attrs[`y${i}`] = 0;
    }

    attrs.stroke = { r: 0, g: 0, b: 0 };
    attrs.strokeWidth = 1;
    attrs.opacity = 1;
    attrs.visible = true;
    attrs.fill = { r: 200, g: 200, b: 200 };
    attrs.fillStart = { r: 200, g: 200, b: 200 };
    attrs.fillStop = { r: 255, g: 255, b: 255 };
    attrs.gradientRotation = 0;
  }

  /** Get link anchors for this mark */
  public getLinkAnchors(mode: "begin" | "end"): LinkAnchor.Description[] {
    const attrs = this.state.attributes;

    const keys = Object.keys(attrs).filter((key) => key.startsWith("x"));
    const points = keys.map((x, index) => [attrs[`x${index + 1}`] as number, attrs[`y${index + 1}`] as number]);

    return [
      ...points.map(([x, y, index]) => {
        return {
          element: this.object._id,
          points: [
            {
              x: x,
              y: y,
              xAttribute: `x${index + 1}`,
              yAttribute: `y${index + 1}`,
              direction: { x: mode == "begin" ? 1 : -1, y: 0 },
            },
          ],
        }
      })
    ];
  }

  /** Get intrinsic constraints between attributes (e.g., x2 - x1 = width for rectangles) */
  public buildConstraints(solver: ConstraintSolver): void {
    return;
    // const xkeys = Object.keys(this.state.attributes).filter((key) => key.startsWith("x"));
    // const xi = xkeys.map((x, index) => `x${index + 1}`);
    // const dxi = xkeys.map((x, index) => `dx${index + 1}`);
    // dxi.pop();

    // const ykeys = Object.keys(this.state.attributes).filter((key) => key.startsWith("y"));
    // const yi = ykeys.map((x, index) => `y${index + 1}`);
    // const dyi = ykeys.map((x, index) => `dy${index + 1}`);
    // dyi.pop();

    // console.log('xi', xi);
    // console.log('yi', yi);
    // console.log('dxi', dxi);
    // console.log('dyi', dyi);

    // const xivariable = solver.attrs(
    //   this.state.attributes,
    //   xi
    // );

    // const yivariable = solver.attrs(
    //   this.state.attributes,
    //   yi
    // );

    // const dxivariable = solver.attrs(
    //   this.state.attributes,
    //   dxi
    // );

    // const dyivariable = solver.attrs(
    //   this.state.attributes,
    //   dyi
    // );

    // for (let attributeIndex = 0; attributeIndex < dxivariable.length; attributeIndex++) {
    //   const dx = dxivariable[attributeIndex];
    //   const x1 = xivariable[attributeIndex];
    //   const x2 = xivariable[attributeIndex + 1];

    //   // dx = x2 - x1
    //   solver.addLinear(
    //     ConstraintStrength.HARD,
    //     0,
    //     [[1, dx]],
    //     [
    //       [1, x2],
    //       [-1, x1],
    //     ]
    //   );
    // }
    // for (let attributeIndex = 0; attributeIndex < dyivariable.length; attributeIndex++) {
    //   const dy = dyivariable[attributeIndex];
    //   const y1 = yivariable[attributeIndex];
    //   const y2 = yivariable[attributeIndex + 1];

    //   // dx = x2 - x1
    //   solver.addLinear(
    //     ConstraintStrength.HARD,
    //     0,
    //     [[1, dy]],
    //     [
    //       [1, y2],
    //       [-1, y1],
    //     ]
    //   );
    // }
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
    // const points = zipArray(attrs.pointsX, attrs.pointsY);
    const keys = Object.keys(attrs).filter((key) => key.startsWith("x"));
    const points: [x: number, y: number][] = keys.map((x, index) => [attrs[`x${index + 1}`] as number, attrs[`y${index + 1}`] as number]);

    debugger;
    if (this.object.properties.closed) {
      const path = helper.polygon(
        points,
        `polygon-${glyphIndex}-${this.object._id}`,
        {
          fillColor: attrs.fill,
          fillStartColor: attrs.fillStart,
          fillStopColor: attrs.fillStop,
          strokeColor: attrs.stroke,
          strokeOpacity: attrs.opacity,
          strokeWidth: attrs.strokeWidth,
          strokeDasharray: strokeStyleToDashArray(
            this.object.properties.strokeStyle
          ),
          ...this.generateEmphasisStyle(emphasize),
        },
        this.object.properties.closed
      )

      path.style = {
        strokeColor: attrs.stroke,
        strokeWidth: attrs.strokeWidth,
        strokeLinejoin: "miter",
        strokeDasharray: strokeStyleToDashArray(this.object.properties.strokeStyle),
        fillColor: attrs.fill,
        fillStartColor: attrs.fillStart,
        fillStopColor: attrs.fillStop,
        gradientRotation: attrs.gradientRotation,
        opacity: attrs.opacity,
        ...this.generateEmphasisStyle(emphasize),
      };

      return path;
    } else {
      const polygon = Graphics.makeGroup(lines);
      polygon.key = `polygon-${glyphIndex}-${this.object._id}`;
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

    // Calculate average point of points
    const averageX = points.reduce((sum, [x, y]) => sum + x, 0) / points.length;
    const averageY = points.reduce((sum, [x, y]) => sum + y, 0) / points.length;

    return <BoundingBox.Rectangle>{
      type: "rectangle",
      cx: averageX,
      cy: averageY,
      width: max(points.map(([x, y]) => x)) - Math.min(...points.map(([x, y]) => x)),
      height: max(points.map(([x, y]) => y)) - Math.min(...points.map(([x, y]) => y)),
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
          <SnappingGuides.Axis>{ type: "x", value: x, attribute: `x${index + 1}` },
          <SnappingGuides.Axis>{ type: "y", value: y, attribute: `y${index + 1}` },
        ]
      }),
      // <SnappingGuides.Axis>{ type: "x", value: cx, attribute: "cx" },
      // <SnappingGuides.Axis>{ type: "y", value: cy, attribute: "cy" },
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
          // manager.mappingEditor(strings.objects.line.xSpan, "dx", {
          //   hints: { autoRange: true, startWithZero: "always" },
          //   acceptKinds: [Specification.DataKind.Numerical],
          //   defaultAuto: true,
          //   searchSection: strings.toolbar.line,
          // }),
          // manager.mappingEditor(strings.objects.line.ySpan, "dy", {
          //   hints: { autoRange: true, startWithZero: "always" },
          //   acceptKinds: [Specification.DataKind.Numerical],
          //   defaultAuto: true,
          //   searchSection: strings.toolbar.line,
          // }),
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
          manager.inputBoolean(
            {
              property: "closed",
            },
            {
              headerLabel: strings.objects.closed,
              type: "checkbox",
            }
          ),
          manager.mappingEditor(strings.objects.fill, "fill", {
            searchSection: strings.objects.style,
          }),
          this.object.mappings.fill == null
            ? manager.mappingEditor(
              strings.objects.gradientStart,
              "fillStart",
              {
                searchSection: strings.objects.style,
              }
            )
            : null,
          this.object.mappings.fill == null
            ? manager.mappingEditor(strings.objects.gradientStop, "fillStop", {
              searchSection: strings.objects.style,
            })
            : null,
          this.object.mappings.fill == null
            ? manager.mappingEditor(
              strings.objects.gradientRotation,
              "gradientRotation",
              {
                hints: { rangeNumber: [0, 360] },
                defaultValue: 0,
                numberOptions: {
                  showSlider: false,
                  showUpdown: true,
                  minimum: 0,
                  maximum: 360,
                  step: 1,
                  updownTick: 1,
                },
                searchSection: strings.objects.style,
              }
            )
            : null,
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
