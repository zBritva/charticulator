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

export interface ScaleEditorProps {
    store: AppStore;
    onScaleChange: (scale: Specification.Scale<Specification.ObjectProperties>, scaleClass: Prototypes.Scales.ScaleClass<Specification.AttributeMap, Specification.AttributeMap>) => void;
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
    onScaleChange
}) => {
    const chartManager = store.chartManager;

    const [scaleClassName, setScaleClass] = React.useState<string>(null);

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
        const newScale = chartManager.createObject(
            scaleClassName
        ) as Specification.Scale;

        newScale.properties.name = chartManager.findUnusedName("Scale");
        chartManager.addScale(newScale);
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
        chartManager.removeScale(newScale);

        return [newScale, scaleClass];
    }, [scaleClassName, values, chartManager]);
    onScaleChange(scale, scaleClass);

    const manager = React.useMemo(() => {
        if (!scaleClass) {
            return null;
        }
        const manager = new FluentUIWidgetManager(
            store,
            scaleClass,
            true
        );

        return manager;
    }, [scaleClass, store]);

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