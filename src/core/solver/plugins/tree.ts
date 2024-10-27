// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { getRandom } from "../..";
import { ConstraintPlugin, ConstraintSolver, Variable } from "../abstract";

import { treemap } from "d3-hierarchy"

interface NodeType {
  x?: number;
  y?: number;
}

export interface TreePluginOptions {
}

export class TreePlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public x1: Variable;
  public y1: Variable;
  public x2: Variable;
  public y2: Variable;
  public points: [Variable, Variable, Variable, Variable, Variable, Variable][];
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
    points: [Variable, Variable, Variable, Variable, Variable, Variable][],
    options?: TreePluginOptions
  ) {
    super();
    this.solver = solver;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.points = points;
    this.options = options;
  }

  public apply() {
    const x1 = this.solver.getValue(this.x1);
    const x2 = this.solver.getValue(this.x2);
    const y1 = this.solver.getValue(this.y1);
    const y2 = this.solver.getValue(this.y2);
    const nodes = this.points.map(() => {
      const x = getRandom(x1, x2);
      const y = getRandom(y1, y2);
      // Use forceSimulation's default initialization
      return <NodeType>{
        x,
        y,
      };
    });

    for (let i = 0; i < nodes.length; i++) {
      // if (this.options.horizontal) {
      //   this.solver.setValue(this.points[i][0], nodes[i].x);
      // }
      // if (this.options.vertical) {
      //   this.solver.setValue(this.points[i][1], nodes[i].y);
      // }
    }
    return true;
  }
}
