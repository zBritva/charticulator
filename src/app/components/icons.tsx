// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { getFluentIcon } from "../resources/fluentui_icons";

export class SVGImageIcon extends React.PureComponent<
  { url: string; width?: number; height?: number; invert?: boolean },
  Record<string, never>
> {
  public render() {
    const style: React.CSSProperties = {};
    style.width = (this.props.width ?? 20) + "px";
    style.height = (this.props.height ?? 20) + "px";
    const FluentUIIcon = getFluentIcon(this.props.url);
    if (FluentUIIcon) {
      return (<>
        <div style={style}>
          <FluentUIIcon />
        </div>
      </>);
    }
    if (this.props.url) {
      style.backgroundImage = `url(${this.props.url})`;
      return (
        <span
          className={`el-svg-icon svg-image-icon ${this.props.invert ? "inverted-icon" : ""}`}
          style={style}
          onDragStart={() => false}
        />
      );
    } else {
      return <span className="el-svg-icon svg-image-icon" />;
    }
  }
}
