// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import { AppStore } from "./stores";
import { Action } from "./actions/actions";
import { strings } from "../strings";

export interface MainContextInterface {
  store: AppStore;
  dispatcher: AppStore["dispatcher"];
}

export const MainReactContext = React.createContext<MainContextInterface>({} as MainContextInterface);


export class ContextedComponent<TProps, TState> extends React.Component<
  React.PropsWithChildren<TProps>,
  TState
> {
  static contextType = MainReactContext;
  declare context: React.ContextType<typeof MainReactContext>;

  public dispatch(action: Action) {
    this.context.store?.dispatcher.dispatch(action);
  }

  public get store(): AppStore {
    return this.context.store;
  }
}