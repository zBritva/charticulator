/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";

import { Prototypes, Specification } from "../../../core";
// import { Actions } from "../../actions";

import { AppStore } from "../../stores";
import { FluentUIWidgetManager } from "./widgets/fluentui_manager";
import { strings } from "../../../strings";
// import { AddRegular, DeleteRegular } from "@fluentui/react-icons";
import { Dropdown, Input, Label, Option } from "@fluentui/react-components";
import { FluentColumnLayout } from "./widgets/controls/fluentui_customized_components";
import { TableType } from "../../../core/dataset";
import { Actions } from "../../actions";

export interface ScaleEditorProps {
    store: AppStore;
    // scale for editing
    scale: Specification.Scale<Specification.ObjectProperties>,
    onScaleChange: (
        scale: Specification.Scale<Specification.ObjectProperties>,
        scaleClass: Prototypes.Scales.ScaleClass<Specification.AttributeMap, Specification.AttributeMap>,
        domainSourceColumn: string,
        table: Prototypes.Dataflow.DataflowTable
    ) => void;
}

export const ScaleClassList = [
    "scale.categorical<string,color>",
    "scale.categorical<string,image>",
    "scale.categorical<date,color>",
    "scale.categorical<string,boolean>",
    "scale.categorical<string,number>",
    "scale.categorical<string,enum>",
    "scale.linear<number,number>",
    "scale.linear<number,color>",
    "scale.linear<number,boolean>",
]

export const AdvancedScaleEditor: React.FC<ScaleEditorProps> = ({
    store,
    scale: editing,
    onScaleChange
}) => {
    const chartManager = store.chartManager;

    const [scaleClassName, setScaleClass] = React.useState<string>(editing?.classID);

    // todo load current column from expression
    const [domainSourceColumn, setDomainSourceColumn] = React.useState<string>(null);

    const table = React.useMemo(() => {
        const tableName = store.dataset.tables.find(
            (t) => t.type === TableType.Main
        ).name;
        const table = store.chartManager.dataflow.getTable(
            tableName
        );

        return table;
    }, [store]);

    const values = React.useMemo(() => {
        if (!table || !domainSourceColumn) {
            return null;
        }
        const values = chartManager.getGroupedExpressionVector(
            table.name,
            null, // groupBy, no glyph context
            `first(${domainSourceColumn})`
          ) as number[] | string[];

          return values;
    }, [chartManager, domainSourceColumn, table]);

    const [scale, scaleClass] = React.useMemo(() => {
        if (!scaleClassName) {
            return [null, null];
        }
        const newScale = editing ? editing : chartManager.createObject(
            scaleClassName
        ) as Specification.Scale;

        if (!editing) {
            newScale.properties.name = chartManager.findUnusedName("Scale");
            chartManager.addScale(newScale);
        }
        const scaleClass = chartManager.getClassById(
            newScale._id
        ) as Prototypes.Scales.ScaleClass;
        if (values) {
            scaleClass.inferParameters(values, {
                autoRange: true,
                newScale: true,
                reuseRange: false
            })
        }
        if (!editing) {
            chartManager.removeScale(newScale);
        }

        return [newScale, scaleClass];
    }, [scaleClassName, values, chartManager, editing]);
    onScaleChange(scale, scaleClass, domainSourceColumn, table);

    const manager = React.useMemo(() => {
        if (!scaleClass) {
            return null;
        }
        const manager = new FluentUIWidgetManager(
            store,
            scaleClass,
            true
        );
        manager.onEditMappingHandler = (
            attribute: string,
            mapping: Specification.Mapping
          ) => {
            new Actions.SetScaleAttribute(scale, attribute, mapping).dispatch(
              store.dispatcher
            );
          };

        return manager;
    }, [scaleClass, store, scale]);

    // todo: create react hook
    // eslint-disable-next-line powerbi-visuals/insecure-random, @typescript-eslint/no-unused-vars
    const [_, setUpdate] = React.useState(Math.random());
    React.useEffect(() => {
        const token = store.addListener(AppStore.EVENT_GRAPHICS, () => {
            // eslint-disable-next-line powerbi-visuals/insecure-random
            setUpdate(Math.random());
        });

        return () => {
            token.remove();
        }
    }, [setUpdate, store]);

    return (
        <FluentColumnLayout>
            <Label>{strings.scaleEditor.type}</Label>
            <Dropdown
                title={strings.scaleEditor.type}
                value={scale?.classID}
                onOptionSelect={(_, { optionValue: scaleClassName }) => {
                    setScaleClass(scaleClassName);
                }}
            >
                {
                    ScaleClassList.map(className => {
                        return (
                            <Option text={className} value={className} key={className}>
                                {className}
                            </Option>);
                    })
                }
            </Dropdown>
            <Label>{strings.scaleEditor.domainSourceColumn}</Label>
            <Dropdown
                value={domainSourceColumn}
                onOptionSelect={(_, { optionValue: columnName }) => setDomainSourceColumn(columnName)}
            >
                {table.columns.map(col => {
                    return (<Option key={col.name} text={col.displayName} value={col.displayName}>
                        {col.displayName}
                    </Option>);
                })}
            </Dropdown>
            <Label>{strings.scaleEditor.name}</Label>
            <Input
                value={scale ? scale.properties.name : ""}
                onChange={(_, { value }) => {
                    if (scale) {
                        scale.properties.name = value;
                    }
                }}
            />
            {scaleClass ? manager.vertical(...scaleClass.getAttributePanelWidgets(manager)) : null}
        </FluentColumnLayout>
    );
} 