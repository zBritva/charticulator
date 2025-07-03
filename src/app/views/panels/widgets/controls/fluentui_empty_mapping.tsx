// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";
import { FluentColumnLayout } from "./fluentui_customized_components";
import { strings } from "../../../../../strings";
import { Prototypes, Specification } from "../../../../../core";
import { ColorFillRegular } from "@fluentui/react-icons";

import { Button } from "@fluentui/react-button";
import { Input } from "@fluentui/react-input";
import { Label } from "@fluentui/react-label";
interface EmptyMappingProps {
  renderColorPicker: (trigger: JSX.Element) => JSX.Element;
  onClick: () => void;
  options: Prototypes.Controls.MappingEditorOptions;
  type: Specification.AttributeType;
}

export const EmptyMapping = ({
  renderColorPicker,
  onClick,
  options,
  type,
}: EmptyMappingProps): JSX.Element => {
  const render = () => {
    const trigger = type === Specification.AttributeType.Color ? (
      <EmptyColorInput onClick={onClick} label={options.label} />
    ) : (
      <>
        <FluentColumnLayout>
          <Label>{options.label}</Label>
          <Input
            id={`id_${options.label.replace(/\s/g, "_")}`}
            placeholder={strings.core.auto}
            onClick={onClick}
          />
        </FluentColumnLayout>
      </>
    )

    if (options.defaultAuto) {
      return (
        <>
          {renderColorPicker(trigger)}
        </>
      );
    } else {
      const trigger = type === Specification.AttributeType.Color ? (
        <EmptyColorInput onClick={onClick} label={options.label} />
      ) : (
        <FluentColumnLayout id={`empty-mapping-column-${options.label.replace(/\s/g, "_")}`}>
          <Label id={`empty-mapping-label-${options.label.replace(/\s/g, "_")}`}>{options.label}</Label>
          <Input
            id={`empty-mapping-${options.label.replace(/\s/g, "_")}`}
            placeholder={strings.core.none}
            onClick={onClick}
          />
        </FluentColumnLayout>
      )
      return (
        <>
          {renderColorPicker(trigger)}
        </>
      );
    }
  };

  return <>{render()}</>;
};

interface EmptyColorInputProps {
  label: string;
  onClick: () => void;
}

const EmptyColorInput = ({
  label,
  onClick,
}: EmptyColorInputProps): JSX.Element => {
  return (
    <div className="el-color-value">
      <FluentColumnLayout
        id={`empty-mapping-column-${label.replace(/\s/g, "_")}`}
        style={{
          flex: 1,
          width: "100%",
        }}
      >
        <Label id={`empty-mapping-label-${label.replace(/\s/g, "_")}`}>{label}</Label>
        <Input
          id={`empty-mapping-${label.replace(/\s/g, "_")}`}
          placeholder={strings.core.none}
          type="text"
          onClick={onClick}
        />
      </FluentColumnLayout>
      <EmptyColorButton onClick={onClick} />
    </div>
  );
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
