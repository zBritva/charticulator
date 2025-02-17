// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { strings } from "../../../strings";
import { Actions } from "../../actions";
import { AppStore } from "../../stores";
import { ImportDataView } from "./import_data_view";
import { tokens } from "@fluentui/react-components";

interface FileViewNewProps {
  store: AppStore;
  onClose: () => void;
}

export class FileViewNew extends React.Component<
  React.PropsWithChildren<FileViewNewProps>,
  Record<string, unknown>
> {
  public render() {
    return (
      <section className="charticulator__file-view-content">
        <h1 style={{
                color: tokens.colorNeutralForeground1
              }}>{strings.mainTabs.new}</h1>
        <ImportDataView
          store={this.props.store}
          onConfirmImport={(dataset) => {
            this.props.store.dispatcher.dispatch(
              new Actions.ImportDataset(dataset)
            );
            this.props.onClose();
          }}
        />
      </section>
    );
  }
}
