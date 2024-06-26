// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { CSSProperties, useCallback, useMemo, useState } from "react";
import { AppStore } from "../../../../../app/stores";
import { getRandomNumber } from "../../../../../core";
import { Label } from "@fluentui/react-label";
import { Button } from "@fluentui/react-button";
import { SVGImageIcon } from "../../../../components";
import * as R from "../../../../resources";

interface CollapsiblePanelProps {
  widgets: JSX.Element[];
  header?: string;
  styles?: CSSProperties;
  store?: AppStore;
}

//Needs to handle tab index in plot segment
export const CustomCollapsiblePanel = ({
  widgets,
  header,
  styles,
}: CollapsiblePanelProps): JSX.Element => {
  const [collapsed] = useState(false);
  const [calloutVisible, setCalloutVisible] = useState(false);

  const renderAttributes = useMemo(() => {
    return !collapsed
      ? widgets
          .filter((w) => (Array.isArray(w) ? w?.[0] != null : w != null))
          .map((widget, idx) => {
            if (Array.isArray(widget)) {
              return widget.map((item, innerIdx) => (
                <div key={`inner-widget-${innerIdx}`}>{item}</div>
              ));
            }
            return <div key={`widget-${idx}`}>{widget}</div>;
          })
      : null;
  }, [widgets, collapsed]);

  const panelHeader = header ?? "";

  const calloutId = `calloutId-${getRandomNumber()}`;

  const onContextMenu = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setCalloutVisible(!calloutVisible);
    },
    [calloutVisible]
  );

  return (
    <div key={`panel-${panelHeader}`}>
      <div id={calloutId} onContextMenu={(e) => onContextMenu(e)}>
        {/* <PanelHeader
          header={panelHeader}
          setCollapsed={setCollapsed}
          collapsed={collapsed}
          key={`panelHeader-${panelHeader}`}
        /> */}
      </div>
      <div style={styles} key={`panelWidgets-${panelHeader}`}>
        {renderAttributes}
      </div>
      {/* <ContextMenuCallout
        store={store}
        calloutId={calloutId}
        hideCallout={(value) => setCalloutVisible(value)}
        calloutVisible={calloutVisible}
      /> */}
    </div>
  );
};

interface PanelHeaderProps {
  header: string;
  collapsed: boolean;
  setCollapsed: (value: boolean) => void;
}

export const PanelHeader = ({
  header,
  setCollapsed,
  collapsed,
}: PanelHeaderProps): JSX.Element => {
  return (
    <div onClick={() => setCollapsed(!collapsed)}>
      <Button
        // iconProps={{
        //   iconName: collapsed ? "ChevronRight" : "ChevronDown",
        //   styles: {
        //     root: {
        //       fontSize: "unset",
        //       height: 12,
        //     },
        //   },
        // }}
        icon={
          <SVGImageIcon
            url={R.getSVGIcon(collapsed ? "ChevronRight" : "ChevronDown")}
          />
        }
        // styles={PanelHeaderStyles}
        onClick={() => {
          setCollapsed(!collapsed);
        }}
      />
      <Label>{header}</Label>
    </div>
  );
};
