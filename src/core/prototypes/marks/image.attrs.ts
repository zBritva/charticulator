// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { AttributeMap, ObjectProperties } from "../../specification";
import * as SpecTypes from "../../specification/spec_types";
import { Color } from "../../common";
import { AttrBuilder } from "../attrs";

export const imageAttributes: AttributeDescriptions = {
  ...AttrBuilder.line(),
  ...AttrBuilder.center(),
  ...AttrBuilder.size(),
  ...AttrBuilder.style({ fill: true }),
  ...AttrBuilder.image(),
};

export interface ImageElementAttributes extends AttributeMap {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
  stroke: Color;
  fill: Color;
  strokeWidth: number;
  opacity: number;
  visible: boolean;
  image: SpecTypes.Image;
}

export interface ImageElementProperties extends ObjectProperties {
  imageMode: "letterbox" | "stretch";
  paddingX: number;
  paddingY: number;
  alignX: "start" | "middle" | "end";
  alignY: "start" | "middle" | "end";
}
