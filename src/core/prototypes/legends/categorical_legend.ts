// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Color } from "../../common";
import * as Graphics from "../../graphics";

import { LegendClass, LegendProperties } from "./legend";
import { Controls } from "..";
import { strings } from "../../../strings";
import { CharticulatorPropertyAccessors } from "../../../app/views/panels/widgets/types";
import { OrientationType } from "./types";

export interface CategoricalLegendItem {
  type: "number" | "color" | "boolean" | "enum";
  label: string;
  value: number | Color | boolean | string;
}

export const ReservedMappingKeyNamePrefix = "reserved_";

export class CategoricalLegendClass extends LegendClass {
  public static classID: string = "legend.categorical";
  public static type: string = "legend";

  public static defaultProperties: LegendProperties = {
    ...LegendClass.defaultProperties,
    orientation: OrientationType.VERTICAL,
  };

  protected textMeasure = new Graphics.TextMeasurer();

  public getLegendItems(): CategoricalLegendItem[] {
    const scale = this.getScale();
    if (scale) {
      const [scaleObject] = scale;
      const mapping = <
        {
          [name: string]: Color;
        }
        >scaleObject.properties.mapping;
      const items: CategoricalLegendItem[] = [];
      for (const key in mapping) {
        if (
          Object.prototype.hasOwnProperty.call(mapping, key) &&
          !key.startsWith(ReservedMappingKeyNamePrefix)
        ) {
          switch (scaleObject.classID) {
            case "scale.categorical<string,boolean>":
              {
                items.push({
                  type: "boolean",
                  label: key,
                  value: mapping[key],
                });
              }
              break;
            case "scale.categorical<string,number>":
              {
                items.push({ type: "number", label: key, value: mapping[key] });
              }
              break;
            case "scale.categorical<string,color>":
              {
                items.push({ type: "color", label: key, value: mapping[key] });
              }
              break;
            case "scale.categorical<string,enum>":
              {
                items.push({ type: "enum", label: key, value: mapping[key] });
              }
              break;
          }
        }
      }
      if (this.object.properties.order) {
        if (this.object.properties.order.length != items.length) {
          return items;
        } else {
          return this.object.properties.order.map((orderItem) => {
            return {
              type: "color",
              label: orderItem,
              value: mapping[orderItem],
            };
          });
        }
      } else {
        return items;
      }
    } else {
      return [];
    }
  }

  public getLineHeight() {
    return this.object.properties.fontSize + 10;
  }

  public getLineWidth(): number {
    let width = 0;
    const items = this.getLegendItems();
    if (this.object.properties.orientation === OrientationType.HORIZONTAL) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const metrics = this.textMeasure.measure(item.label);
        width += 10 + metrics.width;
      }
    } else {
      width = (items[0] && this.textMeasure.measure(items[0].label).width) || 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const metrics = this.textMeasure.measure(item.label);
        if (10 + metrics.width > width) {
          width = 10 + metrics.width;
        }
      }
    }

    return width;
  }

  public getLegendSize(): [number, number] {
    const items = this.getLegendItems();
    if (
      this.object.properties.orientation === OrientationType.VERTICAL ||
      this.object.properties.orientation === undefined
    ) {
      return [
        this.getLineWidth() + this.getLineHeight(),
        items.length * this.getLineHeight(),
      ];
    } else {
      return [
        this.getLineWidth() + items.length * this.getLineHeight(),
        this.getLineHeight(),
      ];
    }
  }

  // eslint-disable-next-line
  public getGraphics(): Graphics.Element {
    const fontFamily = this.object.properties.fontFamily;
    const fontSize = this.object.properties.fontSize;
    const lineHeight = this.getLineHeight();
    this.textMeasure.setFontFamily(fontFamily);
    this.textMeasure.setFontSize(fontSize);

    const g = Graphics.makeGroup([]);
    g.key = `legend-root-g-${this.object._id}`;
    const items = this.getLegendItems();
    const horizontalGap = 10;
    let itemGroupOffset = 0;
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const metrics = this.textMeasure.measure(item.label);
      const offsets = Graphics.TextMeasurer.ComputeTextPosition(
        lineHeight,
        lineHeight / 2,
        metrics,
        "left",
        "middle",
        5,
        0
      );
      const textLabel = Graphics.makeText(
        offsets[0],
        offsets[1],
        item.label,
        fontFamily,
        fontSize,
        { fillColor: this.object.properties.textColor },
        undefined,
        `legend:${this.object._id}-label:${index}`
      );
      const gItem = Graphics.makeGroup([textLabel]);
      gItem.key = `legend-text-g-${this.object._id}-${index}`;
      switch (item.type) {
        case "color":
          {
            switch (this.object.properties.markerShape) {
              case "rectangle": {
                  const rect = Graphics.makeRect(8, 4, lineHeight, lineHeight - 4, {
                    fillColor: <Color>item.value,
                  })
                  rect.key = `legend-text-rect-${this.object._id}-${index}`;
                  gItem.elements.push(rect);
                }
                break;
              case "triangle": {
                  const polygon = 
                  Graphics.makePolygon(
                    [
                      {
                        x: lineHeight / 2 + 4,
                        y: lineHeight - 4,
                      },
                      {
                        x: 0 + 4 + 2,
                        y: 0 + 4,
                      },
                      {
                        x: lineHeight + 4 - 2,
                        y: 0 + 4,
                      },
                    ],
                    {
                      fillColor: <Color>item.value,
                    }
                  );
                  polygon.key = `legend-text-polygon-${this.object._id}-${index}`;
                  gItem.elements.push(polygon);
                }

                break;
              case "circle":
              default: {
                const circle = Graphics.makeCircle(
                  lineHeight / 2,
                  lineHeight / 2,
                  lineHeight / 3,
                  {
                    fillColor: <Color>item.value,
                  }
                );
                circle.key = `legend-text-circle-${this.object._id}-${index}`;
                gItem.elements.push(circle);
              }
            }
          }
          break;
        case "enum":
          {
            const figureHeight = this.object.properties.fontSize * this.object.properties.fontSize - 5;
            const figureVerticalShift = lineHeight / 2;

            switch (<string>item.value) {
              case 'cross': {
                gItem.elements.push(
                  Graphics.makeCross(10, figureVerticalShift, figureHeight, 0, `legend-i-${item.value}-${index}`, {
                    fillColor: this.object.properties.textColor,
                  })
                );
                break;
              }
              case "square": {
                gItem.elements.push(
                  Graphics.makeSquare(10, figureVerticalShift, figureHeight, 0, `legend-i-${item.value}-${index}`, {
                    fillColor: this.object.properties.textColor,
                  })
                );
                break;
              }
              case "diamond": {
                gItem.elements.push(
                  Graphics.makeDiamond(10, figureVerticalShift, figureHeight, 0, `legend-i-${item.value}-${index}`, {
                    fillColor: this.object.properties.textColor,
                  })
                );
                break;
              }
              case "star": {
                gItem.elements.push(
                  Graphics.makeStar(10, figureVerticalShift, figureHeight, 0, `legend-i-${item.value}-${index}`, {
                    fillColor: this.object.properties.textColor,
                  })
                );
                break;
              }
              case "triangle": {
                gItem.elements.push(
                  Graphics.makeTriangle(10, figureVerticalShift, figureHeight, 0, `legend-i-${item.value}-${index}`, {
                    fillColor: this.object.properties.textColor,
                  })
                );
                break;
              }
              case "wye": {
                gItem.elements.push(
                  Graphics.makeWye(10, figureVerticalShift, figureHeight, 0, `legend-i-${item.value}-${index}`, {
                    fillColor: this.object.properties.textColor,
                  })
                );
                break;
              }
              default:
                gItem.elements.push(
                  Graphics.makeCircleSymbol(10, figureVerticalShift, figureHeight, `legend-i-${item.value}-${index}`, {
                    fillColor: this.object.properties.textColor,
                  })
                );
            }
          }
          break;
      }
      if (this.object.properties.orientation === OrientationType.HORIZONTAL) {
        gItem.transform = {
          x: itemGroupOffset,
          y: 0,
          angle: 0,
        };
        itemGroupOffset += metrics.width + lineHeight + horizontalGap;
      } else {
        gItem.transform = {
          x: 0,
          y: lineHeight * (items.length - 1 - index),
          angle: 0,
        };
      }
      g.elements.push(gItem);
    }
    const { x1, y1 } = this.getLayoutBox();
    g.transform = { x: x1, y: y1, angle: 0 };
    return g;
  }

  public getLayoutBox(): { x1: number; y1: number; x2: number; y2: number } {
    if (
      this.object.properties.orientation === OrientationType.VERTICAL ||
      this.object.properties.orientation === undefined
    ) {
      return super.getLayoutBox();
    }

    const { x, y } = this.state.attributes;
    const [width, height] = this.getLegendSize();
    let x1: number, y1: number, x2: number, y2: number;
    switch (this.object.properties.alignX) {
      case "start":
        x1 = x;
        x2 = x + width;
        break;
      case "middle":
        x1 = x - width / 2;
        x2 = x + width / 2;
        break;
      case "end":
        x1 = x - width;
        x2 = x;
        break;
    }
    switch (this.object.properties.alignY) {
      case "start":
        y1 = y;
        y2 = y + height;
        break;
      case "middle":
        y1 = y - height / 2;
        y2 = y + height / 2;
        break;
      case "end":
        y1 = y - height;
        y2 = y;
        break;
    }
    return { x1, y1, x2, y2 };
  }

  public getAttributePanelWidgets(
    manager: Controls.WidgetManager & CharticulatorPropertyAccessors
  ): Controls.Widget[] {
    const widgets = super.getAttributePanelWidgets(manager);

    return [
      ...widgets,
      manager.verticalGroup(
        {
          header: strings.objects.legend.categoricalLegend,
        },
        [
          manager.inputSelect(
            { property: "orientation" },
            {
              type: "radio",
              showLabel: false,
              icons: ["GripperBarVertical", "GripperBarHorizontal"],
              labels: [
                strings.objects.legend.vertical,
                strings.objects.legend.horizontal,
              ],
              options: [OrientationType.VERTICAL, OrientationType.HORIZONTAL],
              label: strings.objects.legend.orientation,
              searchSection: strings.objects.legend.categoricalLegend,
            }
          ),
        ]
      ),
    ];
  }

  // private getScaleEditor(
  //   manager: Controls.WidgetManager & CharticulatorPropertyAccessors
  // ) {
  //   const scale = this?.getScale();
  //   if (scale) {
  //     return manager.vertical(
  //       manager.label(strings.objects.colors, {
  //         addMargins: true,
  //       }),
  //       manager.horizontal(
  //         [1],
  //         manager.scaleEditor(
  //           "mappingOptions",
  //           strings.objects.legend.editColors
  //         )
  //       )
  //     );
  //   }
  //   return null;
  // }
}
