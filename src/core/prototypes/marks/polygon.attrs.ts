// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { AttributeMap } from "../../specification";
import { Color } from "../../common";
import { AttrBuilder } from "../attrs";
import { StrokeStyle } from "../common";

export const polygonAttributes: AttributeDescriptions = {
  ...AttrBuilder.line(),
  ...AttrBuilder.center(),
  ...AttrBuilder.dXdY(),
  ...AttrBuilder.style(),
};

export interface PolygonElementAttributes extends AttributeMap {
  // pointsX: number[];
  // pointsY: number[];
  cx: number;
  cy: number;
  stroke: Color;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
}

export interface PolygonElementProperties extends AttributeMap {
  strokeStyle: StrokeStyle;
  closed: boolean;
}
