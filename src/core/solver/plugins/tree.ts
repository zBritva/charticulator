// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ConstraintPlugin, ConstraintSolver, Variable } from "../abstract";

import { HierarchyRectangularNode } from "d3-hierarchy"

export interface TreePluginOptions {
}

export class TreePlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public x: Variable;
  public y: Variable;
  public x1: Variable;
  public y1: Variable;
  public x2: Variable;
  public y2: Variable;
  public root: HierarchyRectangularNode<unknown>;
  public xEnable: boolean;
  public yEnable: boolean;
  public getXYScale: () => { x: number; y: number };
  public options?: TreePluginOptions;
  public points: [Variable, Variable, number][];

  constructor(
    solver: ConstraintSolver,
    x1: Variable,
    y1: Variable,
    x2: Variable,
    y2: Variable,
    root: HierarchyRectangularNode<unknown>,
    points: [Variable, Variable, number][],
    options?: TreePluginOptions,
    getXYScale?: () => { x: number; y: number },
  ) {
    super();
    this.solver = solver;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.root = root;
    this.options = options;
    this.getXYScale = getXYScale;
    this.points = points;
  }

  public apply() {
    let xScale = 1;
    let yScale = 1;
    if (this.getXYScale != null) {
      const { x, y } = this.getXYScale();
      xScale = x;
      yScale = y;
    }

    return true;
  }
}
