// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { AttributeDescriptions } from "../object";
import { AttributeMap } from "../../specification/index";
import * as SpecTypes from "../../specification/spec_types";
import { AttrBuilder } from "../attrs";

export const iconAttributes: AttributeDescriptions = {
  ...AttrBuilder.point(),
  ...AttrBuilder.number("size", false, {
    defaultRange: [0, 3600],
    defaultValue: 400,
  }),
  ...AttrBuilder.opacity(),
  ...AttrBuilder.visible(),
  ...AttrBuilder.image(),
};

export interface IconElementAttributes extends AttributeMap {
  x: number;
  y: number;
  size: number;
  opacity: number;
  visible: boolean;
  image: SpecTypes.Image;
}

export interface IconElementProperties extends AttributeMap {
  alignment: SpecTypes.TextAlignment;
  rotation: number;
}
