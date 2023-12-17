// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { Prototypes } from "../../../../core";
import { PanelMode } from "../../../../core/prototypes/controls";

import { strings } from "../../../../strings";
// import * as R from "../../../resources";

import { FluentUIFilterEditor } from "./fluentui_filter_editor";
import { CharticulatorPropertyAccessors } from "./types";
import { Button } from "@fluentui/react-button";
import { Popover } from "@fluentui/react-popover";
import { PopoverSurface } from "@fluentui/react-popover";
import { PopoverTrigger } from "@fluentui/react-popover";

// import { SVGImageIcon } from "../../../components";
import { FilterRegular } from "@fluentui/react-icons";

export const FilterPanel: React.FC<{
  text: string;
  options: Prototypes.Controls.FilterEditorOptions;
  manager: Prototypes.Controls.WidgetManager & CharticulatorPropertyAccessors;
}> = ({ text, options, manager }) => {
  const [isOpen, setOpen] = React.useState(false);

  switch (options.mode) {
    case PanelMode.Button:
      if (options.value) {
        if (options.value.categories) {
          text = strings.filter.filterBy + options.value.categories.expression;
        }
        if (options.value.expression) {
          text = strings.filter.filterBy + options.value.expression;
        }
      }
      return (
        <>
          <Popover>
            {/* <FluentButton marginTop={"0px"}> */}
            <PopoverTrigger disableButtonEnhancement>
              <Button
                id="filterTarget"
                // text={text}
                // iconProps={{
                //   iconName: "Filter",
                // }}
                // icon={<SVGImageIcon url={R.getSVGIcon("Filter")} />}
                icon={<FilterRegular />}
                onClick={() => {
                  setOpen(!isOpen);
                }}
                // styles={{
                //   root: {
                //     minWidth: "unset",
                //     ...defultComponentsHeight,
                //   },
                // }}
              >
                {text}
              </Button>
            </PopoverTrigger>
            {/* </FluentButton> */}
            {/* {isOpen ? (
              <Callout
                onDismiss={() => setOpen(false)}
                target="#filterTarget"
                directionalHint={DirectionalHint.topCenter}
              >
                <FluentUIFilterEditor
                  manager={manager}
                  value={options.value}
                  options={options}
                />
              </Callout>
            ) : null} */}
            <PopoverSurface>
              <FluentUIFilterEditor
                manager={manager}
                value={options.value}
                options={options}
              />
            </PopoverSurface>
          </Popover>
        </>
      );
    case PanelMode.Panel:
      return (
        <FluentUIFilterEditor
          manager={manager}
          value={options.value}
          options={options}
        />
      );
  }
};
