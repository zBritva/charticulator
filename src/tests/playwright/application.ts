// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Application } from "../../app/index";
const workerBundle = require("raw-loader?esModule=false!../../../dist/scripts/worker.bundle.js");

export function createAppInstance() {
  const blob = new Blob([workerBundle], { type: "application/javascript" });
  const workerScript = URL.createObjectURL(blob);
  const container = document.createElement("div");
  container.id = "container";
  document.querySelector("body").appendChild(container);
  
  const application = new Application();
  application
    .initialize(
      {
        localization: {
          currency: "$",
          thousandsDelimiter: ",",
          decimalDelimiter: ".",
          billionsFormat: "billions",
        },
        LegalNotices: {
          privacyStatementHTML: ""
        },
        WorkerURL: "",
        ContainerURL: "",
        CorsPolicy: {
          TargetOrigins: "",
          Embedded: false
        },
        Backend: "indexed",
        CDNBackend: undefined,
        MainView: undefined
      },
      "container",
      {
        workerScriptContent: workerScript,
      },
      {
        currency: "$",
        thousandsDelimiter: ",",
        decimalDelimiter: ".",
        billionsFormat: "giga",
      },
      true
    )
    .then(() => {
    });

  return application;
}