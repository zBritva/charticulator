// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { FluentColumnLayout } from "./fluentui_customized_components";
import { strings } from "../../../../../strings";
import { Prototypes, Specification } from "../../../../../core";
import { ColorFillRegular } from "@fluentui/react-icons";
``
import { Button } from "@fluentui/react-button";
import { Input } from "@fluentui/react-input";
import { Label } from "@fluentui/react-label";
import { Popover, PopoverSurface, PopoverTrigger } from "@fluentui/react-components";
import { ColorPicker } from "../../../../components/fluentui_color_picker";
import { AppStore } from "../../../../stores";

interface EmptyMappingProps {
  onClick: () => void;
  options: Prototypes.Controls.MappingEditorOptions;
  type: Specification.AttributeType;
  isColorPickerOpen: boolean;
  changeColorPickerState: () => void;
  clearMapping: () => void;
  setValueMapping: (value: Specification.AttributeValue) => void;
  store: AppStore;
}

export const EmptyMapping = ({
  onClick,
  options,
  store,
  type,
  isColorPickerOpen,
  changeColorPickerState,
  clearMapping,
  setValueMapping
}: EmptyMappingProps): JSX.Element => {
  return <>
    <Popover open={isColorPickerOpen}>
      <>
        {
          (type === Specification.AttributeType.Color) ?
            (
              <>
                <div className="el-color-value">
                  <FluentColumnLayout
                    id={`empty-mapping-column-${options.label.replace(/\s/g, "_")}`}
                    style={{
                      flex: 1,
                      width: "100%",
                    }}
                  >
                    <Label id={`empty-mapping-label-${options.label.replace(/\s/g, "_")}`}>{options.label}</Label>
                    <PopoverTrigger>
                      <Input
                        id={`empty-mapping-${options.label.replace(/\s/g, "_")}`}
                        placeholder={strings.core.none}
                        type="text"
                        onClick={onClick}
                      />
                    </PopoverTrigger>
                  </FluentColumnLayout>
                  <EmptyColorButton onClick={onClick} />
                </div>
              </>
            )
            : (options.defaultAuto) ?
              (
                <>
                  <FluentColumnLayout>
                    <Label id={`empty-mapping-label-${options.label.replace(/\s/g, "_")}`}>{options.label}</Label>
                    <PopoverTrigger>
                      <Input
                        id={`id_${options.label.replace(/\s/g, "_")}`}
                        placeholder={strings.core.auto}
                        onClick={onClick}
                      />
                    </PopoverTrigger>
                  </FluentColumnLayout>
                </>
              )
              :
              (
                <>
                  <FluentColumnLayout id={`empty-mapping-column-${options.label.replace(/\s/g, "_")}`}>
                    <Label id={`empty-mapping-label-${options.label.replace(/\s/g, "_")}`}>{options.label}</Label>
                    <PopoverTrigger>
                      <Input
                        id={`empty-mapping-${options.label.replace(/\s/g, "_")}`}
                        placeholder={strings.core.none}
                        onClick={onClick}
                      />
                    </PopoverTrigger>
                  </FluentColumnLayout>
                </>
              )
        }
      </>
      <PopoverSurface>
        <ColorPicker
          store={store}
          defaultValue={null}
          allowNull={true}
          onPick={(color) => {
            if (color == null) {
              clearMapping();
            } else {
              setValueMapping(color);
            }
          }}
          closePicker={() => {
            changeColorPickerState();
          }}
          parent={this}
        />
        <Button onClick={() => changeColorPickerState()}>{strings.scaleEditor.close}</Button>
      </PopoverSurface>
    </Popover>
  </>;
};

interface EmptyColorButtonProps {
  onClick: () => void;
  styles?: {
    marginTop?: string;
  };
}

export const EmptyColorButton = ({
  onClick,
}: EmptyColorButtonProps): JSX.Element => {
  return (
    <Button
      icon={<ColorFillRegular />}
      onClick={onClick}
      title={strings.mappingEditor.chooseColor}
    />
  );
};
