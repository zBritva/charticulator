// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";

import { classNames } from "../utils";
import { DraggableElement } from "./draggable";
import { SVGImageIcon } from "./icons";

import * as R from "../resources";
import { strings } from "../../strings";
import { Button } from "@fluentui/react-button";
import { ToolbarButton } from "@fluentui/react-toolbar";
import { Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogTrigger, DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer, Slot, tokens } from "@fluentui/react-components";
import { Dismiss24Regular } from "@fluentui/react-icons";
import { FileView, MainTabs } from "../views/file_view";
import { AbstractBackend } from "../backend/abstract";
import { AppStore } from "../stores";

export interface ToolButtonProps {
  icon?: string | React.JSX.Element;
  invertIcon?: boolean;
  text?: string;
  title?: string;
  onClick?: () => void;
  dragData?: () => any;
  active?: boolean;
  disabled?: boolean;
  compact?: boolean;
}

export class FluentToolButton extends React.Component<
  React.PropsWithChildren<ToolButtonProps>,
  { dragging: boolean }
> {
  constructor(props: ToolButtonProps) {
    super(props);
    this.state = {
      dragging: false,
    };
  }

  public render() {
    const onClick = () => {
      if (this.props.onClick) {
        this.props.onClick();
      }
    };

    if (this.props.dragData) {
      return (
        <DraggableElement
          dragData={this.props.dragData}
          onDragStart={() => this.setState({ dragging: true })}
          onDragEnd={() => this.setState({ dragging: false })}
          renderDragElement={() => {
            if (typeof this.props.icon === "string") {
              return [
                <SVGImageIcon url={this.props.icon} width={20} height={20} invert={this.props.invertIcon} />,
                { x: -16, y: -16 },
              ];
            } else {
              return [this.props.icon, { x: -16, y: -16 }];
            }
          }}
        >
          <ToolbarButton
            as="button"
            value={this.props.text}
            onClick={onClick}
            name={this.props.title}
            disabled={this.props.disabled}
            title={this.props.title}
            icon={
              typeof this.props.icon === "string" ? (
                <SVGImageIcon
                  invert={this.props.invertIcon}
                  url={R.getSVGIcon(this.props.icon)}
                  width={20}
                  height={20}
                />
              ) : (
                this.props.icon
              )
            }
          ></ToolbarButton>
        </DraggableElement>
      );
    } else {
      return (
        <ToolbarButton
          name={this.props.title}
          as="button"
          value={this.props.text}
          onClick={onClick}
          disabled={this.props.disabled}
          title={this.props.title}
          icon={
            typeof this.props.icon === "string" ? (
              <SVGImageIcon
                invert={this.props.invertIcon}
                url={R.getSVGIcon(this.props.icon)}
                width={20}
                height={20}
              />
            ) : (
              this.props.icon
            )
          }
        ></ToolbarButton>
      );
    }
  }
}

export interface ButtonProps {
  onClick?: () => void;
  stopPropagation?: boolean;
  disabled?: boolean;
}

export abstract class BaseButton<
  Props extends ButtonProps
> extends React.PureComponent<Props, Record<string, never>> {
  private doClick(e: React.MouseEvent<HTMLSpanElement>) {
    if (this.props.onClick) {
      this.props.onClick();
    }
    if (this.props.stopPropagation) {
      e.stopPropagation();
    }
  }
  protected _doClick = this.doClick.bind(this);
}

export interface AppButtonProps extends ButtonProps {
  name?: string;
  title: string;
  iconOnly?: boolean;
}


export interface AppButtonWithDialogProps extends AppButtonProps {
  store: AppStore;
  defaultTab: MainTabs;
  isEmbedded?: boolean;
  children?: React.ReactNode;
}

export function AppButtonWithDialog(props: AppButtonWithDialogProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { store, defaultTab, isEmbedded } = props;

  return (
    <>
      <AppButton
        {...props}
        onClick={() => setDrawerOpen(true)}
      />
      <OverlayDrawer
        open={drawerOpen}
        onOpenChange={(_, { open }) => setDrawerOpen(open)}
        style={{ width: `100%`, height: `100%` }}
      >
        <FileView
          backend={store.backend}
          defaultTab={defaultTab}
          store={store}
          disabledTabs={isEmbedded && store.backend != null ? [MainTabs.new, MainTabs.save, MainTabs.options, MainTabs.datasets, MainTabs.about] : []}
          onClose={() => setDrawerOpen(false)}
        />
      </OverlayDrawer>
    </>
  );
}

export class AppButton extends BaseButton<AppButtonProps> {
  public render() {
    return (
      <Button
        appearance="transparent"
        tabIndex={0}
        style={{
          // background: tokens.colorBrandBackground
        }}
        data-testid="appbutton"
        // className="charticulator__button-menu-app charticulator-title__button"
        title={this.props.title}
        onClick={this._doClick}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            this._doClick();
          }
        }}
      >
        <SVGImageIcon url={R.getSVGIcon("app-icon")} width={16} height={16} />
        {this.props.iconOnly ? null : <span className="el-text">{this.props.name || strings.app.name}</span>}
      </Button>
    );
  }
}

export interface IconButtonProps extends ButtonProps {
  url?: string;
  title?: string;
  text?: string;
}

export class MenuButton extends BaseButton<IconButtonProps> {
  public render() {
    const props = this.props;

    return (
      <>
        <Button
          icon={<SVGImageIcon url={props.url} />}
          title={props.title}
          onClick={this._doClick}
          appearance="transparent"
          className="charticulator__button-menu-fluent"
        >
          {props.text}
        </Button>
      </>
    );
  }
}

export interface FluentUiMenuButtonProps extends ButtonProps {
  icon?: Slot<'span'>;
  title?: string;
  text?: string;
}

export function FluentUIMenuButton(props: FluentUiMenuButtonProps) {
  return (
    <>
      <Button
        icon={props.icon}
        title={props.title}
        onClick={props.onClick}
        appearance="transparent"
      >
        {props.text}
      </Button>
    </>
  );
}
