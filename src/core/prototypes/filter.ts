// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as SpecTypes from "../specification/spec_types";
import { ExpressionCache, Context } from "../expression";

export class CompiledFilter {
  constructor(filter: SpecTypes.Filter, cache: ExpressionCache) {
    if (filter.categories) {
      const expr = cache.parse(filter.categories.expression);
      const map = filter.categories.values;
      this.filter = (context) => {
        const val = expr.getStringValue(context);
        return (
          Object.prototype.hasOwnProperty.call(map, val) && map[val] == true
        );
      };
    } else if (filter.expression) {
      const expr = cache.parse(filter.expression);
      this.filter = (context) => {
        return <boolean>expr.getValue(context);
      };
    }
  }

  public filter: (context: Context) => boolean;
}
