// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { CharticulatorWorkerInterface } from ".";
import {
  CharticulatorCoreConfig,
  initialize,
  Specification,
  Dataset,
  Solver,
  Prototypes
 } from "../core";
import { WorkerHostProcess } from "./communication";

export class CharticulatorWorkerProcess
  extends WorkerHostProcess
  implements CharticulatorWorkerInterface {
  constructor() {
    super();
    this.registerRPC("initialize", this.initialize.bind(this));
    this.registerRPC(
      "solveChartConstraints",
      this.solveChartConstraints.bind(this)
    );
  }

  public async initialize(config: CharticulatorCoreConfig) {
    await initialize({
      ...config,
      localization: {
        currency: "$",
        thousandsDelimiter: ",",
        decimalDelimiter: ".",
        billionsFormat: "billions",
      },
    });
  }

  public solveChartConstraints(
    chart: Specification.Chart,
    chartState: Specification.ChartState,
    dataset: Dataset.Dataset,
    preSolveValues: [
      Solver.ConstraintStrength,
      Specification.AttributeMap,
      string,
      number
    ][] = null,
    mappingOnly: boolean = false
  ) {
    if (preSolveValues != null && preSolveValues.length > 0) {
      return this.doSolveChartConstraints(
        chart,
        chartState,
        dataset,
        (solver) => {
          for (const [strength, attrs, attr, value] of preSolveValues) {
            solver.solver.addEqualToConstant(
              strength,
              solver.solver.attr(attrs, attr),
              value
            );
          }
        },
        mappingOnly
      );
    }
    return this.doSolveChartConstraints(
      chart,
      chartState,
      dataset,
      null,
      mappingOnly
    );
  }
  public doSolveChartConstraints(
    chart: Specification.Chart,
    chartState: Specification.ChartState,
    dataset: Dataset.Dataset,
    additional: (solver: Solver.ChartConstraintSolver) => void = null,
    mappingOnly: boolean = false
  ) {
    const chartManager = new Prototypes.ChartStateManager(
      chart,
      dataset,
      chartState
    );
    chartManager.solveConstraints(additional, mappingOnly);
    return chartState;
  }
}

new CharticulatorWorkerProcess();
