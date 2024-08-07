// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as globals from "../../../../globals";

import {
  Color,
  colorFromHTMLColor,
  ColorGradient,
  colorToHTMLColorHEX,
  parseColorOrThrowException,
} from "../../../../../core";
import { GradientView } from "../../../../components";
import { PopupView } from "../../../../controllers/popup_controller";
import { ColorPicker } from "../../../../components/fluentui_color_picker";

import { AppStore } from "../../../../stores";

import { Input } from "@fluentui/react-input";
import { Popover } from "@fluentui/react-popover";
import { PopoverTrigger } from "@fluentui/react-popover";
import { PopoverSurface } from "@fluentui/react-popover";
import { Label } from "@fluentui/react-label";

import { FluentColumnLayout } from "./fluentui_customized_components";
import { strings } from "../../../../../strings";
import { FluentUIGradientPicker } from "../../../../components/fluent_ui_gradient_picker";
import { EmptyColorButton } from "./fluentui_empty_mapping";

export interface InputColorProps {
  defaultValue: Color;
  allowNull?: boolean;
  label?: string;
  onEnter: (value: Color) => boolean;
  store?: AppStore;
  noDefaultMargin?: boolean;
  labelKey?: string; //key for color picker
  width?: number;
  underline?: boolean;
  stopPropagation?: boolean;
  pickerBeforeTextField?: boolean;
  styles?: {
    marginTop?: string;
  };
}

const ID_PREFIX = "id_";

interface FluentInputColorState {
  open: boolean;
  color: string;
  value: string;
}

export class FluentInputColor extends React.Component<
  React.PropsWithChildren<InputColorProps>,
  FluentInputColorState
> {
  constructor(props: InputColorProps) {
    super(props);
    let hex: string = "";
    if (this.props.defaultValue) {
      hex = colorToHTMLColorHEX(this.props.defaultValue);
    }
    this.state = { open: false, color: hex, value: hex };
  }

  public componentWillReceiveProps(nextProps: Readonly<InputColorProps>) {
    let hex: string = "";
    if (nextProps.defaultValue) {
      hex = colorToHTMLColorHEX(nextProps.defaultValue);
    }
    if (hex !== this.state.value) {
      this.setState({
        value: hex,
      });
    }
  }

  private renderPicker(): JSX.Element {
    let hex: string = "";
    if (this.props.defaultValue) {
      hex = colorToHTMLColorHEX(this.props.defaultValue);
    }
    const pickerId = this.props.labelKey.replace(/\W/g, "_");
    return (
      <span
        className="el-color-display"
        style={{
          backgroundColor: hex == "" ? "transparent" : hex,
          marginTop: this.props.noDefaultMargin ? 0 : null,
          marginRight: 5,
        }}
        id={ID_PREFIX + pickerId}
        onClick={() => {
          this.setState({ open: !this.state.open });
        }}
      />
    );
  }

  private renderEmptyColorPicker(): JSX.Element {
    const pickerId = this.props.labelKey.replace(/\W/g, "_");
    return (
      <span id={ID_PREFIX + pickerId}>
        <EmptyColorButton
          onClick={() => {
            this.setState({ open: !this.state.open });
          }}
          styles={this.props.styles}
        />
      </span>
    );
  }

  /* eslint-disable max-lines-per-function */
  public render() {
    let hex: string = "";
    if (this.props.defaultValue) {
      hex = colorToHTMLColorHEX(this.props.defaultValue);
    }
    const picker: JSX.Element = this.renderPicker();
    const emptyPicker: JSX.Element = this.renderEmptyColorPicker();
    return (
      <span className="charticulator__widget-control-input-color">
        {this.props.pickerBeforeTextField && (hex == "" ? emptyPicker : picker)}
        <>
          <FluentColumnLayout
            style={{
              flex: 1,
            }}
          >
            <Label>{this.props.label}</Label>
            <Input
              onChange={(event, { value: newValue }) => {
                newValue = newValue.trim();
                if (newValue == "") {
                  if (this.props.allowNull) {
                    return this.props.onEnter(null);
                  } else {
                    return false;
                  }
                }
                this.setState({
                  value: newValue,
                });
                try {
                  const color = parseColorOrThrowException(newValue);
                  if (color) {
                    return this.props.onEnter(color);
                  } else {
                    return false;
                  }
                } catch (ex) {
                  //ignore
                }
              }}
              placeholder={this.props.allowNull ? strings.core.none : ""}
              value={this.state.value}
              onKeyDown={(e) => {
                if (this.props.stopPropagation) {
                  e.stopPropagation();
                }
              }}
            />
          </FluentColumnLayout>
        </>
        <Popover open={this.state.open}>
          <PopoverTrigger>
            {!this.props.pickerBeforeTextField &&
              (hex == "" ? emptyPicker : picker)}
          </PopoverTrigger>
          <PopoverSurface>
            <ColorPicker
              store={this.props.store}
              allowNull={true}
              onPick={(color) => {
                if (color == null) {
                  this.props.onEnter(null);
                } else {
                  this.props.onEnter(color);
                }
              }}
              defaultValue={colorFromHTMLColor(hex)}
              parent={this}
              closePicker={() => {
                this.setState({ open: !this.state.open });
              }}
            />
          </PopoverSurface>
        </Popover>
      </span>
    );
  }
}

export interface InputColorGradientProps {
  defaultValue: ColorGradient;
  onEnter: (value: ColorGradient) => boolean;
}

export class InputColorGradient extends React.Component<
  React.PropsWithChildren<InputColorGradientProps>,
  Record<string, unknown>
> {
  public render() {
    let colorButton: HTMLSpanElement;
    return (
      <span className="charticulator__widget-control-input-color-gradient">
        <span
          className="el-color-gradient-display"
          ref={(e) => (colorButton = e)}
          onClick={() => {
            globals.popupController.popupAt(
              (context) => {
                return (
                  <PopupView context={context}>
                    <FluentUIGradientPicker
                      defaultValue={this.props.defaultValue}
                      onPick={(gradient) => {
                        this.props.onEnter(gradient);
                      }}
                    />
                  </PopupView>
                );
              },
              { anchor: colorButton }
            );
          }}
        >
          <GradientView gradient={this.props.defaultValue} />
        </span>
      </span>
    );
  }
}
