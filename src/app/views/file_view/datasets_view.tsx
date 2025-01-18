/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { strings } from "../../../strings";
import { Actions } from "../../actions";
import { AppStore } from "../../stores";
import { DatasetDescription, getConfig } from "../../config";
import { SVGImageIcon } from "../../components";
import * as R from "../../resources";
import { Button, Input, tokens } from "@fluentui/react-components";

import {
  Dataset,
} from "../../../core";

import {
  TableType
} from "../../../core/dataset";
import { Link12Filled } from "@fluentui/react-icons";


interface DatasetsViewProps {
  store: AppStore;
  onClose: () => void;
}

export const DatasetsView: React.FC<DatasetsViewProps> = ({
  onClose,
  store
}) => {
  const externalDatasets = getConfig().ExternalDatasets;
  const [datasets, setDatasets] = React.useState<DatasetDescription[]>(null);
  const [currentDatasets, setCurrentDatasets] = React.useState<DatasetDescription[]>(datasets);

  React.useEffect(() => {
    (async () => {
      const resources = await fetch(externalDatasets.resourcesDescriptionUrl);
      const json = await resources.json();
      setDatasets(json);
      setCurrentDatasets(json);
    })();
  }, [externalDatasets]);

  const clickHandler = React.useCallback((dataset: DatasetDescription) => {
    Promise.all(
      dataset.tables.map((table, index) => {
        const loader = new Dataset.DatasetLoader();
        return loader
          .loadDSVFromURL(
            table.url,
            store.getLocaleFileFormat()
          )
          .then((r) => {
            r.name = table.name;
            r.displayName = table.name;
            r.type =
              index == 0
                ? TableType.Main
                : TableType.Links; // assumes there are two tables only
            return r;
          });
      })
    ).then((tables) => {
      const ds: Dataset.Dataset = {
        name: dataset.name,
        tables,
      };
      store.dispatcher.dispatch(
        new Actions.ImportDataset(ds)
      );
      onClose();
    });
  }, [store, onClose]);

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
      <h1 style={{
        color: tokens.colorNeutralForeground1
      }}>{strings.mainTabs.datasets}</h1>
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
            if (!data.value) {
              setCurrentDatasets([...datasets]);
            }
            const current = datasets.filter(d => d.name.includes(data.value));
            setCurrentDatasets(current);
          }}
        />
      </div>
      <ul className="chart-list" data-testid="dataset-list">
        {currentDatasets.map((dataset, index) => {
          return (
            <li
              data-testid={`dataset-list-${index}`}
              key={`${dataset.id}-${index}`}
              tabIndex={0}
              onClick={() => {
                clickHandler(dataset);
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  clickHandler(dataset);
                }
              }}
            >
              {dataset.thumbnail ? <div style={{
                background: tokens.colorNeutralBackground2
              }} className="thumbnail">
                <img style={{
                  background: "white"
                }} src={dataset.thumbnail as string} />
              </div> : null}
              <div className="description" onClick={() => clickHandler(dataset)}>
                <div className="name" onClick={(e) => e.stopPropagation()}>
                  <h3 style={{
                    color: tokens.colorNeutralForeground1
                  }}>{dataset.name}</h3>
                </div>
                <div style={{
                    color: tokens.colorNeutralForeground1
                  }} className="description2">
                  {dataset.description}
                </div>
                {dataset.author != null ? (
                  <div style={{
                    color: tokens.colorNeutralForeground1
                  }} className="author">
                    {strings.fileOpen.author}: {dataset.author.name}
                  </div>
                ) : null}
                <div className="footer">
                  <div className="actions">
                    {dataset.author?.contact ?
                      <Button
                        appearance="secondary"
                        icon={<Link12Filled />}
                        title={strings.fileImport.openUrl}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(dataset.author.contact, "_blank");
                        }}
                      /> : null}
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
