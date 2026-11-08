// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { default as Hammer } from "hammerjs";
import { ZoomInfo } from "../../../../core";
import { classNames } from "../../../utils";

export interface ResizeHandleViewProps {
  width: number;
  height: number;
  cx: number;
  cy: number;
  zoom: ZoomInfo;

  onResize: (width: number, height: number) => void;
}

export interface ResizeHandleViewState {
  dragging: boolean;
  newX1: number;
  newY1: number;
  newX2: number;
  newY2: number;
}

export class ResizeHandleView extends React.Component<
  React.PropsWithChildren<ResizeHandleViewProps>,
  ResizeHandleViewState
> {
  private container: React.RefObject<SVGGElement> = React.createRef();
  private lineX1: React.RefObject<SVGLineElement> = React.createRef();
  private lineX2: React.RefObject<SVGLineElement> = React.createRef();
  private lineY1: React.RefObject<SVGLineElement> = React.createRef();
  private lineY2: React.RefObject<SVGLineElement> = React.createRef();
  private cornerX1Y1: React.RefObject<SVGCircleElement> = React.createRef();
  private cornerX1Y2: React.RefObject<SVGCircleElement> = React.createRef();
  private cornerX2Y1: React.RefObject<SVGCircleElement> = React.createRef();
  private cornerX2Y2: React.RefObject<SVGCircleElement> = React.createRef();

  public state: ResizeHandleViewState = {
    dragging: false,
    newX1: this.props.cx - this.props.width / 2,
    newY1: this.props.cy - this.props.height / 2,
    newX2: this.props.cx + this.props.width / 2,
    newY2: this.props.cy + this.props.height / 2,
  };

  public hammer: HammerManager;

  public componentDidMount() {
    this.hammer = new Hammer(this.container.current);
    this.hammer.add(new Hammer.Pan());

    let oldWidth: number, oldHeight: number;
    let dXIntegrate: number, dYIntegrate: number;
    let dXLast: number, dYLast: number;

    let opX: number, opY: number;

    const compute = () => {
      let newWidth = oldWidth + dXIntegrate * opX * 2;
      let newHeight = oldHeight + dYIntegrate * opY * 2;
      if (newWidth < 50) {
        newWidth = 50;
      }
      if (newHeight < 50) {
        newHeight = 50;
      }
      return [newWidth, newHeight];
    };

    this.hammer.on("panstart", (e) => {
      let element = document.elementFromPoint(
        e.center.x - e.deltaX,
        e.center.y - e.deltaY
      );
      oldWidth = this.props.width;
      oldHeight = this.props.height;
      dXIntegrate = e.deltaX / this.props.zoom.scale;
      dXLast = e.deltaX;
      dYIntegrate = -e.deltaY / this.props.zoom.scale;
      dYLast = e.deltaY;
      opX = 0;
      opY = 0;
      while (element) {
        if (element == this.lineX1.current) {
          opX = -1;
        }
        if (element == this.lineX2.current) {
          opX = 1;
        }
        if (element == this.lineY1.current) {
          opY = -1;
        }
        if (element == this.lineY2.current) {
          opY = 1;
        }
        if (element == this.cornerX1Y1.current) {
          opX = -1;
          opY = -1;
        }
        if (element == this.cornerX1Y2.current) {
          opX = -1;
          opY = 1;
        }
        if (element == this.cornerX2Y1.current) {
          opX = 1;
          opY = -1;
        }
        if (element == this.cornerX2Y2.current) {
          opX = 1;
          opY = 1;
        }
        element = element.parentElement;
      }
      const [nW, nH] = compute();
      this.setState({
        dragging: true,
        newX1: this.props.cx - nW / 2,
        newY1: this.props.cy - nH / 2,
        newX2: this.props.cx + nW / 2,
        newY2: this.props.cy + nH / 2,
      });
    });

    this.hammer.on("pan", (e) => {
      dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
      dXLast = e.deltaX;
      dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
      dYLast = e.deltaY;
      const [nW, nH] = compute();
      this.setState({
        newX1: this.props.cx - nW / 2,
        newY1: this.props.cy - nH / 2,
        newX2: this.props.cx + nW / 2,
        newY2: this.props.cy + nH / 2,
      });
    });

    this.hammer.on("panend", (e) => {
      dXIntegrate += (e.deltaX - dXLast) / this.props.zoom.scale;
      dXLast = e.deltaX;
      dYIntegrate += -(e.deltaY - dYLast) / this.props.zoom.scale;
      dYLast = e.deltaY;
      const [nW, nH] = compute();
      this.setState({
        dragging: false,
      });
      this.props.onResize(nW, nH);
    });
  }

  public componentWillUnmount() {
    this.hammer.destroy();
  }

  // eslint-disable-next-line
  public render() {
    const fX = (x: number) =>
      x * this.props.zoom.scale + this.props.zoom.centerX;
    const fY = (y: number) =>
      -y * this.props.zoom.scale + this.props.zoom.centerY;
    const x1 = this.props.cx - this.props.width / 2;
    const y1 = this.props.cy - this.props.height / 2;
    const x2 = this.props.cx + this.props.width / 2;
    const y2 = this.props.cy + this.props.height / 2;
    return (
      <g
        className={classNames("handle", "handle-resize", [
          "active",
          this.state.dragging,
        ])}
        ref={this.container}
      >
        <g ref={this.lineY1} style={{ cursor: "ns-resize" }}>
          <line
            className="element-line handle-ghost"
            x1={fX(x1)}
            y1={fY(y1)}
            x2={fX(x2)}
            y2={fY(y1)}
          />

          <line
            className="element-line handle-highlight"
            x1={fX(x1)}
            y1={fY(y1)}
            x2={fX(x2)}
            y2={fY(y1)}
          />
        </g>
        <g ref={this.lineY2} style={{ cursor: "ns-resize" }}>
          <line
            className="element-line handle-ghost"
            x1={fX(x1)}
            y1={fY(y2)}
            x2={fX(x2)}
            y2={fY(y2)}
          />
          <line
            className="element-line handle-highlight"
            x1={fX(x1)}
            y1={fY(y2)}
            x2={fX(x2)}
            y2={fY(y2)}
          />
        </g>
        <g ref={this.lineX1} style={{ cursor: "ew-resize" }}>
          <line
            className="element-line handle-ghost"
            x1={fX(x1)}
            y1={fY(y1)}
            x2={fX(x1)}
            y2={fY(y2)}
          />
          <line
            className="element-line handle-highlight"
            x1={fX(x1)}
            y1={fY(y1)}
            x2={fX(x1)}
            y2={fY(y2)}
          />
        </g>
        <g ref={this.lineX2} style={{ cursor: "ew-resize" }}>
          <line
            className="element-line handle-ghost"
            x1={fX(x2)}
            y1={fY(y1)}
            x2={fX(x2)}
            y2={fY(y2)}
          />
          <line
            className="element-line handle-highlight"
            x1={fX(x2)}
            y1={fY(y1)}
            x2={fX(x2)}
            y2={fY(y2)}
          />
        </g>
        <circle
          className="element-shape handle-ghost"
          style={{ cursor: "nesw-resize" }}
          ref={this.cornerX1Y1}
          cx={fX(x1)}
          cy={fY(y1)}
          r={5}
        />
        <circle
          className="element-shape handle-ghost"
          style={{ cursor: "nwse-resize" }}
          ref={this.cornerX2Y1}
          cx={fX(x2)}
          cy={fY(y1)}
          r={5}
        />
        <circle
          className="element-shape handle-ghost"
          style={{ cursor: "nwse-resize" }}
          ref={this.cornerX1Y2}
          cx={fX(x1)}
          cy={fY(y2)}
          r={5}
        />
        <circle
          className="element-shape handle-ghost"
          style={{ cursor: "nesw-resize" }}
          ref={this.cornerX2Y2}
          cx={fX(x2)}
          cy={fY(y2)}
          r={5}
        />
        {this.state.dragging ? (
          <g>
            <line
              className="element-line handle-hint"
              x1={fX(this.state.newX1)}
              y1={fY(this.state.newY1)}
              x2={fX(this.state.newX2)}
              y2={fY(this.state.newY1)}
            />
            <line
              className="element-line handle-hint"
              x1={fX(this.state.newX1)}
              y1={fY(this.state.newY2)}
              x2={fX(this.state.newX2)}
              y2={fY(this.state.newY2)}
            />
            <line
              className="element-line handle-hint"
              x1={fX(this.state.newX1)}
              y1={fY(this.state.newY1)}
              x2={fX(this.state.newX1)}
              y2={fY(this.state.newY2)}
            />
            <line
              className="element-line handle-hint"
              x1={fX(this.state.newX2)}
              y1={fY(this.state.newY1)}
              x2={fX(this.state.newX2)}
              y2={fY(this.state.newY2)}
            />
          </g>
        ) : null}
      </g>
    );
  }
}
