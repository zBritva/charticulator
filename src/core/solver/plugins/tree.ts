// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ConstraintPlugin, ConstraintSolver, Variable } from "../abstract";

import { HierarchyRectangularNode } from "d3-hierarchy"

export interface TreePluginOptions {
}

export class TreePlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public x1: Variable;
  public y1: Variable;
  public x2: Variable;
  public y2: Variable;
  public root: HierarchyRectangularNode<unknown>;
  public xEnable: boolean;
  public yEnable: boolean;
  public getXYScale: () => { x: number; y: number };
  public options?: TreePluginOptions;

  constructor(
    solver: ConstraintSolver,
    x1: Variable,
    y1: Variable,
    x2: Variable,
    y2: Variable,
    root: HierarchyRectangularNode<unknown>,
    options?: TreePluginOptions
  ) {
    super();
    this.solver = solver;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.root = root;
    this.options = options;
  }

  public apply() {
    // const x1 = this.solver.getValue(this.x1);
    // const x2 = this.solver.getValue(this.x2);
    // const y1 = this.solver.getValue(this.y1);
    // const y2 = this.solver.getValue(this.y2);
    this.root.leaves().forEach((leave) => {
      debugger;
      const data = leave.data as any;
      const glyphState = data.glyphState;
      const x = this.solver.attr(glyphState.attributes, "x");
      const y = this.solver.attr(glyphState.attributes, "y");
      const x1 = this.solver.attr(glyphState.attributes, "x1");
      const y1 = this.solver.attr(glyphState.attributes, "y1");

      this.solver.setValue(x, leave.x0);
      this.solver.setValue(y, leave.y0);
      this.solver.setValue(x1, leave.x1);
      this.solver.setValue(y1, leave.y1);
    });

    return true;
  }
}
