// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { ConstraintPlugin, ConstraintSolver, Variable } from "../abstract";

interface NodeType {
  x?: number;
  y?: number;
}

export interface IPoint {
  x: number;
  y: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CloudPluginOptions {}

export class CloudPlugin extends ConstraintPlugin {
  public solver: ConstraintSolver;
  public x1: Variable;
  public y1: Variable;
  public x2: Variable;
  public y2: Variable;
  public x: number;
  public y: number;
  public points: [Variable, Variable, Variable, Variable, number, number][];
  public xEnable: boolean;
  public yEnable: boolean;
  public getXYScale: () => { x: number; y: number };
  public options?: CloudPluginOptions;

  constructor(
    solver: ConstraintSolver,
    x1: Variable,
    y1: Variable,
    x2: Variable,
    y2: Variable,
    x: number,
    y: number,
    points: [Variable, Variable, Variable, Variable, number, number][],
    axisOnly?: "x" | "y",
    options?: CloudPluginOptions
  ) {
    super();
    this.solver = solver;
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.x = x;
    this.y = y;
    this.points = points;
    this.xEnable = axisOnly == null || axisOnly == "x";
    this.yEnable = axisOnly == null || axisOnly == "y";
    this.options = options;
  }

  public apply() {
    const x1 = this.solver.getValue(this.x1);
    const x2 = this.solver.getValue(this.x2);
    const y1 = this.solver.getValue(this.y1);
    const y2 = this.solver.getValue(this.y2);
    let value = 0;
    const positionedSquares: [
      Variable,
      Variable,
      Variable,
      Variable,
      number,
      number
    ][] = [];
    this.points.forEach((unpositioned) => {
      let unpositionedSquareX1 = this.solver.getValue(unpositioned[0]);
      let unpositionedSquareY1 = this.solver.getValue(unpositioned[1]);
      let unpositionedSquareX2 = this.solver.getValue(unpositioned[2]);
      let unpositionedSquareY2 = this.solver.getValue(unpositioned[3]);

      let hasIntersect = true;

      while (hasIntersect) {
        const point = this.archimedeanSpiral(
          Math.abs(x1 - x2),
          Math.abs(y1 - y2),
          value
        );
        unpositionedSquareX1 = point.x + this.x - unpositioned[4] / 2;
        unpositionedSquareY1 = point.y + this.y - unpositioned[5] / 2;
        unpositionedSquareX2 = point.x + this.x + unpositioned[4] / 2;
        unpositionedSquareY2 = point.y + this.y + unpositioned[5] / 2;

        hasIntersect =
          positionedSquares.find((positioned) => {
            const positionedSquareX1 = this.solver.getValue(positioned[0]);
            const positionedSquareY1 = this.solver.getValue(positioned[1]);
            const positionedSquareX2 = this.solver.getValue(positioned[2]);
            const positionedSquareY2 = this.solver.getValue(positioned[3]);
            return this.isIntersect(
              {
                p1: {
                  x: unpositionedSquareX1,
                  y: unpositionedSquareY1,
                },
                p2: {
                  x: unpositionedSquareX2,
                  y: unpositionedSquareY2,
                },
              },
              {
                p1: {
                  x: positionedSquareX1,
                  y: positionedSquareY1,
                },
                p2: {
                  x: positionedSquareX2,
                  y: positionedSquareY2,
                },
              }
            );
          }) != undefined;
        value++;
      }

      this.solver.setValue(unpositioned[0], unpositionedSquareX1);
      this.solver.setValue(unpositioned[1], unpositionedSquareY1);
      this.solver.setValue(unpositioned[2], unpositionedSquareX2);
      this.solver.setValue(unpositioned[3], unpositionedSquareY2);

      positionedSquares.push(unpositioned);
    });

    // for (let i = 0; i < nodes.length; i++) {
    //   if (this.options.horizontal) {
    //     this.solver.setValue(this.points[i][0], nodes[i].x);
    //   }
    //   if (this.options.vertical) {
    //     this.solver.setValue(this.points[i][1], nodes[i].y);
    //   }
    // }

    // const point = this.archimedeanSpiral(Math.abs(x1 - x2), Math.abs(y1 - y2), value);

    // positionedSquares.find(squares => {
    //   const positionedSquareX = this.solver.getValue(squares[0]);
    //   const positionedSquareY = this.solver.getValue(squares[1]);

    // });
    // for (let i = 0; i < nodes.length; i++) {
    //   if (this.options.horizontal) {
    //     this.solver.setValue(this.points[i][0], nodes[i].x);
    //   }
    //   if (this.options.vertical) {
    //     this.solver.setValue(this.points[i][1], nodes[i].y);
    //   }
    // }
    return true;
  }

  private static ArchimedeanFactor: number = 0.1;

  private archimedeanSpiral(
    width: number,
    height: number,
    value: number
  ): IPoint {
    const ratio: number = width / height;

    value = value * CloudPlugin.ArchimedeanFactor;

    return {
      x: ratio * value * Math.cos(value),
      y: value * Math.sin(value),
    };
  }

  private isIntersect(
    rectangle1: {
      p1: IPoint;
      p2: IPoint;
    },
    rectangle2: {
      p1: IPoint;
      p2: IPoint;
    }
  ): boolean {
    // const r1xc = (rectangle1.p1.x + rectangle1.p2.x) / 2;
    // const r1yc = (rectangle1.p1.y + rectangle1.p2.y) / 2;
    // const r1d = Math.sqrt(Math.pow(rectangle1.p2.x - rectangle1.p1.x, 2) + Math.pow(rectangle1.p2.y - rectangle1.p1.y, 2));

    // const r2xc = (rectangle2.p1.x + rectangle2.p2.x) / 2;
    // const r2yc = (rectangle2.p1.y + rectangle2.p2.y) / 2;
    // const r2d = Math.sqrt(Math.pow(rectangle2.p2.x - rectangle2.p1.x, 2) + Math.pow(rectangle2.p2.y - rectangle2.p1.y, 2));

    // const d = Math.sqrt(Math.pow(r2xc - r1xc, 2) + Math.pow(r1yc - r2yc, 2));

    // return (r2d / 2 + r1d / 2) > d;

    if (
      rectangle1.p1.x > rectangle2.p1.x &&
      rectangle1.p1.x < rectangle2.p2.x &&
      ((rectangle1.p1.y > rectangle2.p1.y &&
        rectangle1.p1.y < rectangle2.p2.y) ||
        (rectangle1.p2.y > rectangle2.p1.y &&
          rectangle1.p2.y < rectangle2.p2.y))
    ) {
      return true;
    }

    if (
      rectangle1.p2.x > rectangle2.p1.x &&
      rectangle1.p2.x < rectangle2.p2.x &&
      ((rectangle1.p1.y > rectangle2.p1.y &&
        rectangle1.p1.y < rectangle2.p2.y) ||
        (rectangle1.p2.y > rectangle2.p1.y &&
          rectangle1.p2.y < rectangle2.p2.y))
    ) {
      return true;
    }

    return false;

    // return (
    //   (rectangle1.p1.x < rectangle2.p2.x &&
    //     rectangle1.p1.x > rectangle2.p1.x) ||
    //   (rectangle1.p2.x < rectangle2.p2.x &&
    //     rectangle1.p2.x > rectangle2.p1.x) ||
    //   (rectangle1.p1.y < rectangle2.p2.y &&
    //     rectangle1.p1.y > rectangle2.p1.y) ||
    //   (rectangle1.p2.y < rectangle2.p2.y && rectangle1.p2.y > rectangle2.p1.y)
    // );
  }
}
