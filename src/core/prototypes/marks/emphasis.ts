// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Style } from "../../graphics";
import { MarkClass } from "./mark";
import { ObjectClass } from "../object";
import { ObjectState, EmphasisMethod, AttributeMap } from "../../specification";
import { Specification } from "../../../container";

export const DEFAULT_EMPHASIS_STROKE_COLOR = { r: 255, g: 0, b: 0 };
export const DEFAULT_EMPHASIS_STROKE_WIDTH = 1;
export const DEFAULT_POWER_BI_OPACITY = 0.4;
/**
 * Represents a mark class that is emphasizable
 */
export abstract class EmphasizableMarkClass<
  PropertiesType extends AttributeMap = AttributeMap,
  AttributesType extends AttributeMap = AttributeMap
> extends MarkClass<PropertiesType, AttributesType> {
  private defaultMethod: EmphasisMethod;
  constructor(
    parent: ObjectClass,
    object: Specification.IObject<PropertiesType>,
    state: ObjectState<AttributesType>,
    defaultMethod = EmphasisMethod.Saturation
  ) {
    super(parent, object, state);

    this.defaultMethod = defaultMethod;
  }

  /**
   * Generates styling info for styling emphasized marks
   * @param emphasize If true, emphasis will be applied.
   */
  protected generateEmphasisStyle(emphasize?: boolean): Style {
    // If emphasize is undefined (or true), we use full saturation
    const style = <Style>{
      saturation: 1,
    };

    // only if emphasize is explicitly false to we use saturation of .7
    const method = this.object.properties.emphasisMethod || this.defaultMethod;
    if (method === EmphasisMethod.Saturation && emphasize === false) {
      const opacity = this.state.attributes?.opacity;
      if ((opacity as number) > DEFAULT_POWER_BI_OPACITY || !opacity) {
        style.opacity = DEFAULT_POWER_BI_OPACITY;
      }
    }

    if (method === EmphasisMethod.Outline && emphasize) {
      style.strokeColor = DEFAULT_EMPHASIS_STROKE_COLOR;
      style.strokeWidth = DEFAULT_EMPHASIS_STROKE_WIDTH;
    }

    return style;
  }
}
