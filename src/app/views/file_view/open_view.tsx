// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as FileSaver from "file-saver";
import * as React from "react";
import * as R from "../../resources";

import { ItemDescription } from "../../backend/abstract";
import { EditableTextView, SVGImageIcon } from "../../components";
import { Actions } from "../../actions";
import { showOpenFileDialog, readFileAsString } from "../../utils";
import { strings } from "../../../strings";
import { AppStore } from "../../stores";
import { Button, ToggleButton, Input } from "@fluentui/react-components";

import {
  ArrowDownloadRegular,
  CopyRegular,
  DeleteFilled,
  OpenRegular,
} from "@fluentui/react-icons";

export interface FileViewOpenState {
  chartList: ItemDescription[];
  chartCount: number;
  currentChartList: ItemDescription[];
  displayPrivate: boolean;
  displayPublic: boolean;
  filterText: string;
}

export class FileViewOpen extends React.Component<
  React.PropsWithChildren<{
    onClose: () => void;
    store: AppStore;
  }>,
  FileViewOpenState
> {
  public state: FileViewOpenState = {
    chartList: [],
    chartCount: 0,
    currentChartList: [],
    displayPrivate: true,
    displayPublic: true,
    filterText: ""
  };

  public componentDidMount() {
    this.updateChartList();
  }

  public updateChartList() {
    const store = this.props.store;
    store.backend.list("chart", "timeCreated", 0, 1000).then((result) => {
      this.setState({
        chartList: result.items,
        chartCount: result.totalCount
      }, () => this.applyUserFilter());
    });
  }

  public applyUserFilter() {
    this.setState({
      currentChartList: this.state.chartList
        .filter(chart => this.state.displayPublic || chart.source !== "cdn")
        .filter(chart => this.state.displayPrivate || chart.source !== "indexed")
        .filter(chart => this.state.filterText == "" || chart.metadata.name.includes(this.state.filterText))
    })
  }

  // eslint-disable-next-line
  public renderChartList() {
    const store = this.props.store;
    const backend = store.backend;

    if (this.state.currentChartList == null) {
      return (
        <p className="loading-indicator">
          <SVGImageIcon url={R.getSVGIcon("loading")} /> {strings.app.loading}
        </p>
      );
    } else {
      if (this.state.chartCount == 0) {
        return <p>{strings.fileOpen.noChart}</p>;
      } else {
        return (
          <ul className="chart-list">
            {/* eslint-disable-next-line */}
            {this.state.currentChartList.map((chart) => {
              return (
                <li
                  key={chart.id}
                  tabIndex={0}
                  onClick={() => {
                    this.props.store.dispatcher.dispatch(
                      new Actions.Open(chart.id, (error) => {
                        if (error) {
                          // TODO: add error reporting
                        } else {
                          this.props.onClose();
                        }
                      })
                    );
                  }}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      this.props.store.dispatcher.dispatch(
                        new Actions.Open(chart.id, (error) => {
                          if (error) {
                            // TODO: add error reporting
                          } else {
                            this.props.onClose();
                          }
                        })
                      );
                    }
                  }}
                >
                  <div className="thumbnail">
                    <img src={chart.metadata.thumbnail as string} />
                  </div>
                  <div className="description">
                    <div className="name" onClick={(e) => e.stopPropagation()}>
                      <EditableTextView
                        text={chart.metadata.name}
                        onEdit={(newText) => {
                          backend.get(chart.id).then((chart) => {
                            chart.metadata.name = newText;
                            backend
                              .put(chart.id, chart.data, chart.metadata)
                              .then(() => {
                                this.updateChartList();
                              });
                          });
                        }}
                      />
                    </div>
                    <div className="metadata">{chart.metadata.dataset}</div>
                    {chart.author != null ? (
                      <div className="author">
                        {chart.author.name}
                      </div>
                    ) : null}
                    <div className="footer">
                      <div className="metadata">
                        {new Date(chart.metadata.timeCreated).toLocaleString()}
                      </div>
                      <div className="actions">
                        <Button
                          disabled={!chart.metadata.allowDelete}
                          appearance="subtle"
                          icon={<DeleteFilled />}
                          title={strings.fileOpen.delete}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              confirm(
                                strings.fileOpen.deleteConfirmation(
                                  chart.metadata.name
                                )
                              )
                            ) {
                              backend.delete(chart.id).then(() => {
                                this.updateChartList();
                              });
                            }
                          }}
                        />
                        <Button
                          appearance="subtle"
                          icon={<CopyRegular />}
                          title={strings.fileOpen.copy}
                          onClick={(e) => {
                            e.stopPropagation();
                            backend.get(chart.id).then((chart) => {
                              backend
                                .create("chart", chart.data, chart.metadata)
                                .then(() => {
                                  this.updateChartList();
                                });
                            });
                          }}
                        />
                        <Button
                          appearance="subtle"
                          icon={<ArrowDownloadRegular />}
                          title={strings.fileOpen.download}
                          onClick={(e) => {
                            e.stopPropagation();
                            backend.get(chart.id).then((chart) => {
                              const blob = new Blob([
                                JSON.stringify(chart.data, null, 2),
                              ]);
                              FileSaver.saveAs(
                                blob,
                                chart.metadata.name.replace(
                                  // eslint-disable-next-line
                                  /[^0-9a-zA-Z\ \.\-\_]+/g,
                                  "_"
                                ) + ".chart"
                              );
                            });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        );
      }
    }
  }

  public render() {
    return (
      <section className="charticulator__file-view-content is-fix-width">
        <h1>{strings.mainTabs.open}</h1>
        <div style={{
            marginBottom: "12px",
            display: "flex",
            flexDirection: "row"
          }}>
          <Button
            style={{
              minWidth: "130px"
            }}
            data-testid="fileOpenButton"
            icon={<OpenRegular />}
            title={strings.fileOpen.open}
            onClick={async () => {
              const file = await showOpenFileDialog(["chart"]);
              const str = await readFileAsString(file);
              const data = JSON.parse(str);
              this.props.store.dispatcher.dispatch(
                new Actions.Load(data.state)
              );
              this.props.onClose();
            }}
          >
            {strings.fileOpen.open}
          </Button>
          <Input
            style={{
              marginLeft: "5px"
            }}
            placeholder={strings.fileOpen.filterText}
            onChange={(e, data) => {
              this.setState({
                filterText: data.value
              }, () => this.applyUserFilter());
            }}
          />
          <ToggleButton
            style={{
              marginLeft: "5px"
            }}
            checked={this.state.displayPrivate}
            onClick={() => {
              this.setState((prev) => {
                return {
                  displayPrivate: !prev.displayPrivate
                }
              }, () => this.applyUserFilter())
            }}>
            {strings.fileOpen.private}
          </ToggleButton>
          <ToggleButton
            style={{
              marginLeft: "5px"
            }}
            checked={this.state.displayPublic}
            onClick={() => {
              this.setState((prev) => {
                return {
                  displayPublic: !prev.displayPublic
                }
              }, () => this.applyUserFilter())
            }}>
            {strings.fileOpen.public}
          </ToggleButton>
        </div>

        {this.renderChartList()}
      </section>
    );
  }
}
