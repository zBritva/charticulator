/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { strings } from "../../../strings";
import { Actions } from "../../actions";
import { AppStore } from "../../stores";
import { getConfig } from "../../config";
import { EditableTextView, SVGImageIcon } from "../../components";
import * as R from "../../resources";
import { Input } from "@fluentui/react-components";

interface DatasetsViewProps {
  store: AppStore;
  onClose: () => void;
}

export const DatasetsView: React.FC<DatasetsViewProps> = ({
  onClose,
  store
}) => {
  const externalDatasets = getConfig().ExternalDatasets;

  const [datasets, setDatasets] = React.useState<any[]>(null);

  React.useEffect(() => {
    (async () => {
      const resources = await fetch(externalDatasets.resourcesDescriptionUrl);
      const json = await resources.json();
      setDatasets(json);
    })();
  }, [externalDatasets]);

  if (!externalDatasets || !externalDatasets.resourcesDescriptionUrl) {
    return <p>Dataset list is not set in configuration</p>
  }

  if (datasets == null) {
    return (
      <p className="loading-indicator">
        <SVGImageIcon url={R.getSVGIcon("loading")} /> {strings.app.loading}
      </p>
    );
  }

  return (
    <section className="charticulator__file-view-content is-fix-width">
      <h1>{strings.mainTabs.datasets}</h1>
      <div style={{
        marginBottom: "12px",
        display: "flex",
        flexDirection: "row"
      }}>
        <Input
          style={{
            marginLeft: "5px"
          }}
          placeholder={strings.fileOpen.filterText}
          onChange={(e, data) => {

          }}
        />
      </div>
      <ul className="chart-list">
        {datasets.map((dataset, index) => {
          // return (<>
          //   <p>{dataset.name}</p>
          //   <p>Description: {dataset.description}</p>
          //   <p>Tables: {dataset.tables.length}</p>
          // </>)
          return (
            <li
              key={`${dataset.id}-${index}`}
              tabIndex={0}
              onClick={() => {
                // store.dispatcher.dispatch(
                // new Actions.Open(chart.id, (error) => {
                //   if (error) {
                //     // TODO: add error reporting
                //   } else {
                //     this.props.onClose();
                //   }
                // })
                // );
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  // this.props.store.dispatcher.dispatch(
                  //   new Actions.Open(chart.id, (error) => {
                  //     if (error) {
                  //       // TODO: add error reporting
                  //     } else {
                  //       this.props.onClose();
                  //     }
                  //   })
                  // );
                }
              }}
            >
              {dataset.thumbnail ? <div className="thumbnail">
                <img src={dataset.thumbnail as string} />
              </div> : null}
              <div className="description">
                <div className="name" onClick={(e) => e.stopPropagation()}>
                  <h3>{dataset.name}</h3>
                </div>
                <div className="description2" onClick={(e) => e.stopPropagation()}>
                  {dataset.description}
                </div>
                {/* <div className="metadata">
                {strings.fileOpen.dataset}: {dataset.metadata.dataset}
              </div> */}
                {dataset.author != null ? (
                  <div className="author">
                    {strings.fileOpen.author}: {dataset.author.name}
                  </div>
                ) : null}
                <div className="footer">
                  {/* <div className="metadata">
                  {new Date(chart.metadata.timeCreated).toLocaleString()}
                </div> */}
                  <div className="actions">

                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
