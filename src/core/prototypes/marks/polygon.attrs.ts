// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { AttributeMap } from "../../specification";
import { Color } from "../../common";
import { AttrBuilder } from "../attrs";
import { StrokeStyle } from "../common";

export const polygonAttributes: AttributeDescriptions = {
  ...AttrBuilder.line(),
  ...AttrBuilder.style({ fill: true }),
  ...AttrBuilder.gradientRotation(),
};

export interface PolygonElementAttributes extends AttributeMap {
  stroke: Color;
  fill: Color;
  fillStart: Color;
  fillStop: Color;
  gradientRotation: number;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
}

export interface PolygonElementProperties extends AttributeMap {
  strokeStyle: StrokeStyle;
  closed: boolean;
  pointsCount: number;
}