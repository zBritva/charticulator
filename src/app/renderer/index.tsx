// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

import {
  Color,
  getColorConverter,
  Graphics,
  hexToRgb,
  shallowClone,
  uniqueID,
} from "../../core";
import { toSVGNumber } from "../utils";
import {
  ChartComponent,
  GlyphEventHandler,
} from "../../container/chart_component";
import { ColorFilter, NumberModifier } from "../../core/graphics";
import { ArrowType } from "../../core/prototypes/links";

// adapted from https://stackoverflow.com/a/20820649
// probably useful
// function desaturate(color: Color, amount: number) {
//   const { r, g, b } = color;
//   const l = 0.3 * r + 0.6 * g + 0.1 * b;
//   return {
//     r: Math.min(r + amount * (l - r), 255),
//     g: Math.min(g + amount * (l - g), 255),
//     b: Math.min(b + amount * (l - b), 255),
//   };
// }

const srgb2lab = getColorConverter("sRGB", "lab");
const lab2srgb = getColorConverter("lab", "sRGB");

function modifyNumber(value: number, modifier: NumberModifier) {
  if (modifier.set != null) {
    return modifier.set;
  } else {
    if (modifier.multiply != null) {
      value *= modifier.multiply;
    }
    if (modifier.add != null) {
      value += modifier.add;
    }
    if (modifier.pow != null) {
      value = Math.pow(value, modifier.pow);
    }
    return value;
  }
}

export function applyColorFilter(color: Color, colorFilter: ColorFilter) {
  let [L, A, B] = srgb2lab(color.r, color.g, color.b);
  if (colorFilter.saturation) {
    const s = Math.sqrt(A * A + B * B);
    const sPrime = modifyNumber(s, colorFilter.saturation);
    if (s == 0) {
      A = 0;
      B = 0;
    } else {
      A *= sPrime / s;
      B *= sPrime / s;
    }
  }
  if (colorFilter.lightness) {
    L = modifyNumber(L / 100, colorFilter.lightness) * 100;
  }
  const [r, g, b] = lab2srgb(L, A, B);
  return { r, g, b };
}

/**
 * Coverts {@Color} to `rgb(r,g,b)` string. Or coverts `#RRGGBB` fromat to `rgb(r,g,b)`}
 * @param color {@Color} object or color string in HEX format (`#RRGGBB`)
 */
export function renderColor(
  color: Color | string,
  colorFilter?: ColorFilter
): string {
  if (!color) {
    return `rgb(0,0,0)`;
  }
  if (typeof color === "string") {
    color = hexToRgb(color);
  }
  if (typeof color === "object") {
    if (colorFilter) {
      color = applyColorFilter(color, colorFilter);
    }
    return `rgb(${color.r.toFixed(0)},${color.g.toFixed(0)},${color.b.toFixed(
      0
    )})`;
  }
}

export function renderStyle(style: Graphics.Style): React.CSSProperties {
  if (style == null) {
    return {};
  }
  return {
    stroke: style.strokeColor
      ? renderColor(style.strokeColor, style.colorFilter)
      : "none",
    strokeOpacity: style.strokeOpacity != undefined ? style.strokeOpacity : 1,
    strokeWidth: style.strokeWidth != undefined ? style.strokeWidth : 1,
    strokeLinecap:
      style.strokeLinecap != undefined ? style.strokeLinecap : "round",
    strokeLinejoin:
      style.strokeLinejoin != undefined ? style.strokeLinejoin : "round",
    fill: style.fillColor
      ? renderColor(style.fillColor, style.colorFilter)
      : "none",
    fillOpacity: style.fillOpacity != undefined ? style.fillOpacity : 1,
    textAnchor: style.textAnchor != undefined ? style.textAnchor : "start",
    opacity: style.opacity != undefined ? style.opacity : 1,
    strokeDasharray:
      style.strokeDasharray != undefined ? style.strokeDasharray : null,
  };
}

const path_commands: { [name: string]: (args: number[]) => string } = {
  M: (args: number[]) => `M ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
  L: (args: number[]) => `L ${toSVGNumber(args[0])},${toSVGNumber(-args[1])}`,
  C: (args: number[]) =>
    `C ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(
      args[2]
    )},${toSVGNumber(-args[3])},${toSVGNumber(args[4])},${toSVGNumber(
      -args[5]
    )}`,
  Q: (args: number[]) =>
    `Q ${toSVGNumber(args[0])},${toSVGNumber(-args[1])},${toSVGNumber(
      args[2]
    )},${toSVGNumber(-args[3])}`,
  A: (args: number[]) =>
    `A ${toSVGNumber(args[0])},${toSVGNumber(args[1])},${toSVGNumber(
      args[2]
    )},${toSVGNumber(args[3])},${toSVGNumber(args[4])},${toSVGNumber(
      args[5]
    )},${toSVGNumber(-args[6])}`,
  Z: () => `Z`,
};

export function renderSVGPath(cmds: { cmd: string; args: number[] }[]) {
  return cmds.map((x) => path_commands[x.cmd](x.args)).join(" ");
}

export function renderTransform(transform: Graphics.RigidTransform): string {
  if (!transform) {
    return null;
  }
  if (Math.abs(transform.angle) < 1e-7) {
    return `translate(${toSVGNumber(transform.x)},${toSVGNumber(
      -transform.y
    )})`;
  } else {
    return `translate(${toSVGNumber(transform.x)},${toSVGNumber(
      -transform.y
    )}) rotate(${toSVGNumber(-transform.angle)})`;
  }
}

export interface DataSelection {
  isSelected(table: string, rowIndices: number[]): boolean;
}

export type GraphicalElementEventHandler = (
  element: Graphics.Element["selectable"],
  event: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }
) => any;

export interface RenderGraphicalElementSVGOptions {
  noStyle?: boolean;
  styleOverride?: Graphics.Style;
  className?: string;
  key?: string;
  chartComponentSync?: boolean;
  externalResourceResolver?: (url: string) => string;
  /** Called when a glyph is clicked */
  onClick?: GraphicalElementEventHandler;
  /** Called when the mouse enters a glyph */
  onMouseEnter?: GraphicalElementEventHandler;
  /** Called when the mouse leaves a glyph */
  onMouseLeave?: GraphicalElementEventHandler;
  /** Called when a glyph context menu is clicked */
  onContextMenu?: GraphicalElementEventHandler;

  selection?: DataSelection;
}

class TextOnPath extends React.PureComponent<{
  text: string;
  style: React.CSSProperties;
  align: "start" | "middle" | "end";
  cmds: any;
  key: string;
}> {
  private pathID: string = uniqueID();

  public render() {
    return (
      <g key={`defs-${this.props.key}`}>
        <defs key={`defs-${this.props.key}`}>
          <path
            id={this.pathID}
            fill="none"
            stroke="red"
            d={renderSVGPath(this.props.cmds)}
          />
        </defs>
        <text key={`t-${this.props.key}`} style={{ ...this.props.style, textAnchor: this.props.align }}>
          <textPath
            href={`#${this.pathID}`}
            startOffset={
              this.props.align == "start"
                ? "0%"
                : this.props.align == "middle"
                ? "50%"
                : "100%"
            }
          >
            {this.props.text}
          </textPath>
        </text>
      </g>
    );
  }
}

function renderEndSVGArrow(element: Graphics.Path) {
  let arrowElement;
  switch (element.endArrowType) {
    case ArrowType.NO_ARROW:
      return;
    case ArrowType.DIAMOND_ARROW:
      arrowElement = (
        <path
          key={`DA-${element.key}`}
          d="M 5 0 L 10 5 L 5 10 L 0 5 z"
          fill={renderColor(
            element.style.strokeColor,
            element.style.colorFilter
          )}
        />
      );
      break;
    case ArrowType.OVAL_ARROW:
      arrowElement = (
        <circle
          key={`OA-${element.key}`}
          cx="5"
          cy="5"
          r="5"
          fill={renderColor(
            element.style.strokeColor,
            element.style.colorFilter
          )}
        />
      );
      break;
    case ArrowType.ARROW:
    default:
      arrowElement = (
        <path
          key={`A-${element.key}`}
          d="M 0 0 L 10 5 L 0 10 z"
          fill={renderColor(
            element.style.strokeColor,
            element.style.colorFilter
          )}
        />
      );
      break;
  }
  return (
    <marker
      key={`marker-${element.key}`}
      id={element.style.endArrowColorId}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerUnits="strokeWidth"
      markerWidth="10"
      markerHeight="10"
      orient="auto"
    >
      {arrowElement}
    </marker>
  );
}

function renderStartSVGArrow(element: Graphics.Path) {
  let arrowElement;
  switch (element.beginArrowType) {
    case ArrowType.NO_ARROW:
      return;
    case ArrowType.DIAMOND_ARROW:
      arrowElement = (
        <path
          key={`DA-${element.key}-E`}
          d="M 5 0 L 10 5 L 5 10 L 0 5 z"
          fill={renderColor(
            element.style.strokeColor,
            element.style.colorFilter
          )}
        />
      );
      break;
    case ArrowType.OVAL_ARROW:
      arrowElement = (
        <circle
          key={`OA-${element.key}-E`}
          cx="5"
          cy="5"
          r="5"
          fill={renderColor(
            element.style.strokeColor,
            element.style.colorFilter
          )}
        />
      );
      break;
    case ArrowType.ARROW:
    default:
      arrowElement = (
        <path
          key={`A-${element.key}-E`}
          d="M 10 0 L 10 10 L 0 5 z"
          fill={renderColor(
            element.style.strokeColor,
            element.style.colorFilter
          )}
        />
      );
      break;
  }

  return (
    <marker
      key={`marker-${element.key}-E`}
      id={element.style.startArrowColorId}
      viewBox="0 0 10 10"
      refX="1"
      refY="5"
      markerUnits="strokeWidth"
      markerWidth="10"
      markerHeight="10"
      orient="auto"
    >
      {arrowElement}
    </marker>
  );
}

export function renderSVGDefs(element: Graphics.Element): JSX.Element {
  if (!element) {
    return null;
  }
  switch (element.type) {
    case "text": {
      const text = element as Graphics.Text;
      if (text.style?.backgroundColor) {
        return (
          <filter
            key={`filter-${text.style.backgroundColorId}`}
            x="0"
            y="0"
            width="1"
            height="1"
            id={text.style.backgroundColorId}
          >
            <feFlood
              floodColor={renderColor(
                text.style.backgroundColor,
                text.style.colorFilter
              )}
              result="bg"
              flood-opacity="0"
            />
            <feMerge>
              <feMergeNode in="bg" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        );
      } else {
        return null;
      }
    }
    case "path": {
      const path = element as Graphics.Path;
      return (
        <>
          {renderEndSVGArrow(path)}
          {renderStartSVGArrow(path)}
        </>
      );
    }

    case "group": {
      const group = element as Graphics.Group;
      return (
        <>
          {group.elements?.map((x, idx) => {
            return (
              <React.Fragment key={`SVGDefs-${idx}`}>
                {renderSVGDefs(x)}
              </React.Fragment>
            );
          })}
        </>
      );
    }
  }
}

export function rotateGradient(rotation: number) {
  if (!rotation === undefined) {
    return {
      x1: 0,
      x2: 100,
      y1: 0,
      y2: 0,
    };
  }
  const pi = rotation * (Math.PI / 180);
  const coords = {
    x1: Math.round(50 + Math.sin(pi) * 50),
    y1: Math.round(50 + Math.cos(pi) * 50),
    x2: Math.round(50 + Math.sin(pi + Math.PI) * 50),
    y2: Math.round(50 + Math.cos(pi + Math.PI) * 50),
  };

  return coords;
}

/** The method renders all chart elements in SVG document */
// eslint-disable-next-line
export function renderGraphicalElementSVG(
  element: Graphics.Element,
  options?: RenderGraphicalElementSVGOptions
): JSX.Element {
  if (!element) {
    return null;
  }

  if (!options) {
    options = {};
  }

  const style = options.noStyle
    ? null
    : renderStyle(options.styleOverride || element.style);

  // OnClick event handler
  const mouseEvents: {
    onClick?: (e: React.MouseEvent<Element>) => void;
    onMouseEnter?: (e: React.MouseEvent<Element>) => void;
    onMouseLeave?: (e: React.MouseEvent<Element>) => void;
    onContextMenu?: (e: React.MouseEvent<Element>) => void;
    onMouseDown?: (e: React.MouseEvent<Element>) => void;
    onMouseUp?: (e: React.MouseEvent<Element>) => void;
    onWheel?: (e: React.MouseEvent<Element>) => void;
    onMouseMove?: (e: React.MouseEvent<Element>) => void;
  } = {};
  if (element.selectable) {
    style.cursor = "pointer";
    style.pointerEvents = "all";
    if (options.onClick) {
      mouseEvents.onClick = (e: React.MouseEvent<Element>) => {
        e.stopPropagation();
        if (
          element.selectable.enableSelection ||
          element.selectable.enableSelection === undefined
        ) {
          options.onClick(element.selectable, e.nativeEvent);
        }
      };
    }
    if (options.onMouseEnter) {
      mouseEvents.onMouseEnter = (e: React.MouseEvent<Element>) => {
        if (
          element.selectable.enableTooltips ||
          element.selectable.enableTooltips === undefined
        ) {
          options.onMouseEnter(element.selectable, e.nativeEvent);
        }
      };
    }
    if (options.onMouseLeave) {
      mouseEvents.onMouseLeave = (e: React.MouseEvent<Element>) => {
        if (
          element.selectable.enableTooltips ||
          element.selectable.enableTooltips === undefined
        ) {
          options.onMouseLeave(element.selectable, e.nativeEvent);
        }
      };
    }
    if (options.onContextMenu) {
      mouseEvents.onContextMenu = (e: React.MouseEvent<Element>) => {
        e.stopPropagation();
        if (
          element.selectable.enableContextMenu ||
          element.selectable.enableContextMenu === undefined
        ) {
          options.onContextMenu(element.selectable, e.nativeEvent);
        }
      };
    }
  }

  if (element.interactable) {
    if (element.interactable.onClick) {
      mouseEvents.onClick = element.interactable.onClick;
    }
    if (element.interactable.onMousedown) {
      mouseEvents.onMouseDown = element.interactable.onMousedown;
    }
    if (element.interactable.onMouseup) {
      mouseEvents.onMouseUp = element.interactable.onMouseup;
    }
    if (element.interactable.onMousewheel) {
      mouseEvents.onWheel = element.interactable.onMousewheel;
    }
    if (element.interactable.onMousemove) {
      mouseEvents.onMouseMove = element.interactable.onMousemove;
    }
  }

  switch (element.type) {
    case "rect": {
      const rect = element as Graphics.Rect;

      const gradientID: string = uniqueID();
      const rotation = rotateGradient(rect.style.gradientRotation);

      // if gradient color was set, override color value by ID of gradient
      if (
        rect.style.fillColor == null &&
        rect.style.fillStartColor &&
        rect.style.fillStopColor
      ) {
        style.fill = `url(#${gradientID})`;
      }

      return (
        <g key={`g-${element.key || options.key}`}>
          <defs key={`defs-${element.key || options.key}`}>
            {rect.style.fillColor == null &&
            rect.style.fillStartColor &&
            rect.style.fillStopColor ? (
              <linearGradient
                key={`gradient-${gradientID}`}
                id={gradientID}
                x1={`${rotation.x1}%`}
                y1={`${rotation.y1}%`}
                x2={`${rotation.x2}%`}
                y2={`${rotation.y2}%`}
              >
                <stop
                  key={gradientID + "offset0"}
                  offset="0%"
                  style={{
                    stopColor: renderColor(rect.style.fillStartColor),
                    stopOpacity: 1,
                  }}
                />
                <stop
                  key={gradientID + "offset100"}
                  offset="100%"
                  style={{
                    stopColor: renderColor(rect.style.fillStopColor),
                    stopOpacity: 1,
                  }}
                />
              </linearGradient>
            ) : null}
          </defs>
          <rect
            data-key={element.key || options.key}
            key={element.key || options.key}
            {...mouseEvents}
            className={options.className || null}
            style={style}
            x={Math.min(rect.x1, rect.x2)}
            y={-Math.max(rect.y1, rect.y2)}
            width={Math.abs(rect.x1 - rect.x2)}
            height={Math.abs(rect.y1 - rect.y2)}
            rx={rect.rx}
            ry={rect.ry}
            transform={`rotate(${rect.rotation ?? 0})`}
          />
        </g>
      );
    }
    case "circle": {
      const circle = element as Graphics.Circle;
      return (
        <circle
          data-key={element.key || options.key}
          key={element.key || options.key}
          {...mouseEvents}
          className={options.className || null}
          style={style}
          cx={circle.cx}
          cy={-circle.cy}
          r={circle.r}
        />
      );
    }
    case "ellipse": {
      const ellipse = element as Graphics.Ellipse;

      const gradientID: string = uniqueID();
      const rotation = rotateGradient(ellipse.style.gradientRotation);

      // if gradient color was set, override color value by ID of gradient
      if (
        ellipse.style.fillColor == null &&
        ellipse.style.fillStartColor &&
        ellipse.style.fillStopColor
      ) {
        style.fill = `url(#${gradientID})`;
      }

      return (
        <g key={`g-${element.key || options.key}`}>
          <defs key={`defs-${element.key || options.key}`}>
            {ellipse.style.fillColor == null &&
            ellipse.style.fillStartColor &&
            ellipse.style.fillStopColor ? (
              <linearGradient
                key={`gradient-${gradientID}`}
                id={gradientID}
                x1={`${rotation.x1}%`}
                y1={`${rotation.y1}%`}
                x2={`${rotation.x2}%`}
                y2={`${rotation.y2}%`}
              >
                <stop
                  offset="0%"
                  style={{
                    stopColor: renderColor(ellipse.style.fillStartColor),
                    stopOpacity: 1,
                  }}
                />
                <stop
                  offset="100%"
                  style={{
                    stopColor: renderColor(ellipse.style.fillStopColor),
                    stopOpacity: 1,
                  }}
                />
              </linearGradient>
            ) : null}
          </defs>
          <ellipse
            data-key={element.key || options.key}
            key={element.key || options.key}
            {...mouseEvents}
            className={options.className || null}
            style={style}
            cx={(ellipse.x1 + ellipse.x2) / 2}
            cy={-(ellipse.y1 + ellipse.y2) / 2}
            rx={Math.abs(ellipse.x1 - ellipse.x2) / 2}
            ry={Math.abs(ellipse.y1 - ellipse.y2) / 2}
          />
        </g>
      );
    }
    case "line": {
      const line = element as Graphics.Line;
      return (
        <line
          data-key={element.key || options.key}
          key={element.key || options.key}
          {...mouseEvents}
          className={options.className || null}
          style={style}
          x1={line.x1}
          y1={-line.y1}
          x2={line.x2}
          y2={-line.y2}
        />
      );
    }
    case "polygon": {
      const polygon = element as Graphics.Polygon;
      return (
        <polygon
          data-key={element.key || options.key}
          key={element.key || options.key}
          {...mouseEvents}
          className={options.className || null}
          style={style}
          points={polygon.points
            .map((p) => `${toSVGNumber(p.x)},${toSVGNumber(-p.y)}`)
            .join(" ")}
        />
      );
    }
    case "path": {
      const path = element as Graphics.Path;
      const d = renderSVGPath(path.cmds);
      const markerStart =
        path.beginArrowType != ArrowType.NO_ARROW
          ? `url(#${path.style.startArrowColorId})`
          : null;
      const markerEnd =
        path.endArrowType != ArrowType.NO_ARROW
          ? `url(#${path.style.endArrowColorId})`
          : null;

      const gradientID: string = uniqueID();
      const rotation = rotateGradient(path.style.gradientRotation);

      // if gradient color was set, override color value by ID of gradient
      if (
        path.style.fillColor == null &&
        path.style.fillStartColor != null && 
        path.style.fillStopColor != null 
      ) {
        style.fill = `url(#${gradientID})`;
      }
      if (
        path.style.strokeColor != null &&
        path.style.fillStartColor != null && 
        path.style.fillStopColor != null 
      ) {
        style.stroke = `url(#${gradientID})`;
      }

      return (
        <g key={`g-${element.key || options.key}`}>
          <defs key={`defs-${element.key || options.key}`}>
            {
            path.style.fillStartColor &&
            path.style.fillStopColor ? (
              <linearGradient
                // gradientUnits="userSpaceOnUse"
                key={`gradient-${gradientID}`}
                id={gradientID}
                x1={`${rotation.x1}%`}
                y1={`${rotation.y1}%`}
                x2={`${rotation.x2}%`}
                y2={`${rotation.y2}%`}
              >
                <stop
                  offset="0%"
                  style={{
                    stopColor: renderColor(path.style.fillStartColor),
                    stopOpacity: 1,
                  }}
                />
                <stop
                  offset="100%"
                  style={{
                    stopColor: renderColor(path.style.fillStopColor),
                    stopOpacity: 1,
                  }}
                />
              </linearGradient>
            ) : null}
          </defs>
          <path
            data-key={element.key || options.key}
            key={element.key || options.key}
            {...mouseEvents}
            className={options.className || null}
            style={style}
            d={d}
            transform={path.transform}
            markerEnd={markerEnd}
            markerStart={markerStart}
          />
        </g>
      );
    }
    case "text-on-path": {
      const text = element as Graphics.TextOnPath;
      style.fontFamily = text.fontFamily;
      style.fontSize = text.fontSize + "px";
      return (
        <TextOnPath
          key={text.key}
          text={text.text}
          style={style}
          cmds={text.pathCmds}
          align={text.align}
        />
      );
    }
    case "text": {
      const text = element as Graphics.Text;
      style.fontFamily = text.fontFamily;
      style.fontSize = text.fontSize + "px";
      const filter = text.style?.backgroundColor
        ? `url(#${text.style.backgroundColorId})`
        : null;
      if (style.stroke != "none") {
        const style2 = shallowClone(style);
        style2.fill = style.stroke;
        const e1 = (
          <text
            data-key={text.key}
            key={text.key}
            {...mouseEvents}
            className={options.className || null}
            style={style2}
            x={text.cx}
            y={-text.cy}
            filter={filter}
          >
            {text.text}
          </text>
        );
        style.stroke = "none";
        const e2 = (
          <text
            data-key={text.key}
            key={text.key}
            {...mouseEvents}
            className={options.className || null}
            style={style}
            x={text.cx}
            y={-text.cy}
          >
            {text.text}
          </text>
        );
        return (
          <g key={element.key} data-key={element.key}>
            {e1}
            {e2}
          </g>
        );
      } else {
        return (
          <text
            data-key={element.key}
            key={element.key}
            {...mouseEvents}
            className={options.className || null}
            style={style}
            x={text.cx}
            y={-text.cy}
            filter={filter}
          >
            {text.text}
          </text>
        );
      }
    }
    case "image": {
      const image = element as Graphics.Image;
      let preserveAspectRatio = null;
      switch (image.mode) {
        case "letterbox":
          preserveAspectRatio = "meet";
          break;
        case "stretch":
          preserveAspectRatio = "none";
          break;
      }
      return (
        <image
          data-key={element.key || options.key}
          key={element.key || options.key}
          {...mouseEvents}
          className={options.className || null}
          style={style}
          preserveAspectRatio={preserveAspectRatio}
          xlinkHref={
            options.externalResourceResolver
              ? options.externalResourceResolver(image.src)
              : image.src
          }
          x={image.x}
          y={-image.y - image.height}
          width={image.width}
          height={image.height}
        />
      );
    }
    case "chart-container": {
      const component = element as Graphics.ChartContainerElement;
      const subSelection = options.selection
        ? {
            isSelected: (table: string, rowIndices: number[]) => {
              // Get parent row indices from component row indices
              const parentRowIndices = rowIndices.map(
                (x) => component.selectable.rowIndices[x]
              );
              // Query the selection with parent row indices
              return options.selection.isSelected(
                component.selectable.plotSegment.table,
                parentRowIndices
              );
            },
          }
        : null;

      const convertEventHandler = (
        handler: GraphicalElementEventHandler
      ): GlyphEventHandler => {
        if (!handler) {
          return null;
        }
        return (s, parameters) => {
          if (s == null) {
            // Clicked inside the ChartComponent but not on a glyph,
            // in this case we select the whole thing
            handler(component.selectable, parameters);
          } else {
            // Clicked on a glyph of ChartComponent (or a sub-component)
            // in this case we translate the component's rowIndices its parent's
            handler(
              {
                plotSegment: component.selectable.plotSegment,
                glyphIndex: component.selectable.glyphIndex,
                rowIndices: s.rowIndices.map(
                  (i) => component.selectable.rowIndices[i]
                ),
              },
              parameters
            );
          }
        };
      };

      return (
        <ChartComponent
          key={element.key || options.key}
          chart={component.chart}
          dataset={component.dataset}
          width={component.width}
          height={component.height}
          rootElement="g"
          sync={options.chartComponentSync}
          selection={subSelection}
          onGlyphClick={convertEventHandler(options.onClick)}
          onGlyphMouseEnter={convertEventHandler(options.onMouseEnter)}
          onGlyphMouseLeave={convertEventHandler(options.onMouseLeave)}
          rendererOptions={{
            chartComponentSync: options.chartComponentSync,
            externalResourceResolver: options.externalResourceResolver,
          }}
        />
      );
    }
    case "group": {
      const group = element as Graphics.Group;
      return (
        <g
          transform={renderTransform(group.transform)}
          key={element.key || options.key}
          style={{
            opacity:
              group.style && group.style.opacity != null
                ? group.style.opacity
                : 1,
          }}
          {...mouseEvents}
        >
          {group.elements.map((x, index) => {
            return renderGraphicalElementSVG(x, {
              key: `m-${(x && x.key) || (options && options.key) || group.key}-${index}`,
              chartComponentSync: options.chartComponentSync,
              externalResourceResolver: options.externalResourceResolver,
              onClick: options.onClick,
              onMouseEnter: options.onMouseEnter,
              onMouseLeave: options.onMouseLeave,
              onContextMenu: options.onContextMenu,
              selection: options.selection,
            });
          })}
        </g>
      );
    }
  }
}

export class GraphicalElementDisplay extends React.PureComponent<
  { element: Graphics.Element },
  Record<string, never>
> {
  public render() {
    return renderGraphicalElementSVG(this.props.element);
  }
}
