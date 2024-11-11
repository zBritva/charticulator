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
import { Actions } from "../../actions";
import { Expression, FunctionCall, StringValue } from "../../../core/expression";

export interface ScaleEditorProps {
    store: AppStore;
    // scale for editing
    scale: Specification.Scale<Specification.ObjectProperties>,
    onScaleChange: (
        scale: Specification.Scale<Specification.ObjectProperties>,
        scaleClass: Prototypes.Scales.ScaleClass<Specification.AttributeMap, Specification.AttributeMap>,
        domainSourceTable: string,
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

    const scaleExpression = editing && editing.expression ? Expression.Parse(editing.expression) as FunctionCall : null;
    const scaleExpressionColumn = scaleExpression?.args[0] as StringValue;
    const scaleExpressionTable = store.dataset.tables.find(t => !t.columns.find(c => c.name == scaleExpressionColumn?.value))?.name

    // todo load current column from expression
    const [domainSourceTable, setDomainSourceTable] = React.useState<string>(scaleExpressionTable);
    const [domainSourceColumn, setDomainSourceColumn] = React.useState<string>(scaleExpressionColumn?.value);

    const table = React.useMemo(() => {
        if (!domainSourceTable && store.dataset.tables.length > 1) {
            return null;
        }
        if (!domainSourceTable && store.dataset.tables.length == 1) {
            const tableName = store.dataset.tables[0].name;
            const table = store.chartManager.dataflow.getTable(
                tableName
            );
            setDomainSourceTable(tableName);
    
            return table;
        } else {
            const tableName = store.dataset.tables.find(
                (t) => t.name == domainSourceTable
            ).name;
            const table = store.chartManager.dataflow.getTable(
                tableName
            );
    
            return table;
        }
    }, [store, domainSourceTable]);

    const values = React.useMemo(() => {
        if (!table || !domainSourceColumn) {
            return null;
        }
        let expression = '';
        if (domainSourceColumn.split(" ").length > 1) {
            expression = "`" + domainSourceColumn + "`";
        } else {
            expression = `first(${domainSourceColumn})`;
        }
        
        const values = chartManager.getGroupedExpressionVector(
            table.name,
            null, // groupBy, no glyph context
            expression
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
                expression: `first(${domainSourceColumn})`,
                autoRange: true,
                newScale: true,
                reuseRange: false
            })
        }
        if (!editing) {
            chartManager.removeScale(newScale);
        }

        return [newScale, scaleClass];
    }, [scaleClassName, values, chartManager, editing, domainSourceColumn]);
    onScaleChange(scale, scaleClass, domainSourceTable, domainSourceColumn, table);

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
                disabled={!!editing}
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
            <Label>{strings.scaleEditor.domainSourceTable}</Label>
            <Dropdown
                value={domainSourceTable}
                onOptionSelect={(_, { optionValue: tableName }) => setDomainSourceTable(tableName)}
            >
                {store.dataset.tables.map(table => {
                    return (<Option key={table.name} text={table.displayName} value={table.name}>
                        {table.displayName}
                    </Option>);
                })}
            </Dropdown>
            <Label>{strings.scaleEditor.domainSourceColumn}</Label>
            <Dropdown
                value={domainSourceColumn}
                onOptionSelect={(_, { optionValue: columnName }) => setDomainSourceColumn(columnName)}
            >
                {table?.columns.map(col => {
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