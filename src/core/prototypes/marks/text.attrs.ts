// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { defaultFont, defaultFontSize } from "../../../app/stores/defaults";
import { Color } from "../../common";
import { AttributeMap, AttributeType } from "../../specification";
import * as SpecTypes from "../../specification/spec_types";
import { AttrBuilder } from "../attrs";
import { AttributeDescriptions } from "../object";

export const textAttributes: AttributeDescriptions = {
  ...AttrBuilder.point(),
  text: {
    name: "text",
    type: AttributeType.Text,
    solverExclude: true,
    defaultValue: "",
  },
  fontFamily: {
    name: "fontFamily",
    type: AttributeType.FontFamily,
    solverExclude: true,
    defaultValue: defaultFont,
  },
  fontSize: {
    name: "fontSize",
    type: AttributeType.Number,
    solverExclude: true,
    defaultRange: [0, 24],
    defaultValue: defaultFontSize,
  },
  color: {
    name: "color",
    type: AttributeType.Color,
    solverExclude: true,
    defaultValue: null,
  },
  backgroundColor: {
    name: "backgroundColor",
    type: AttributeType.Color,
    solverExclude: true,
    defaultValue: null,
  },
  backgroundColorFilterId: {
    name: "backgroundColorFilterId",
    type: AttributeType.Text,
    solverExclude: true,
    defaultValue: null,
  },
  outline: {
    name: "outline",
    type: AttributeType.Color,
    solverExclude: true,
    defaultValue: null,
  },
  ...AttrBuilder.opacity(),
  ...AttrBuilder.visible(),
};

export interface TextElementAttributes extends AttributeMap {
  x: number;
  y: number;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: Color;
  backgroundColor: Color;
  backgroundColorFilterId: string;
  outline: Color;
  opacity: number;
  visible: boolean;
}

export interface TextElementProperties extends AttributeMap {
  alignment: SpecTypes.TextAlignment;
  rotation: number;
  ignorePolarRotation: boolean;
}
