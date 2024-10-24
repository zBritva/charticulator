// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import * as React from "react";

import { EventSubscription, Prototypes, Specification, uniqueID } from "../../../core";
import { Actions } from "../../actions";
import { EditableTextView, SVGImageIcon } from "../../components";

import { AppStore } from "../../stores";
import { FluentUIWidgetManager } from "./widgets/fluentui_manager";
import { ReservedMappingKeyNamePrefix } from "../../../core/prototypes/legends/categorical_legend";
import { strings } from "../../../strings";
import { AttributeMap } from "../../../core/specification";
import { ObjectClass } from "../../../core/prototypes";
import { EventType } from "./widgets/observer";
import { ScaleEditorWrapper } from "./panel_styles";
import { Button } from "@fluentui/react-button";
import * as R from "../../resources";
import { AddRegular, DeleteRegular } from "@fluentui/react-icons";
import { Dropdown, Option } from "@fluentui/react-components";

export interface ScaleEditorProps {
    scale: Specification.Scale;
    scaleMapping: Specification.ScaleMapping;
    store: AppStore;
    plotSegment: ObjectClass;
}

export const ScaleClassList = [
    "scale.categorical<string,image>",
    "scale.categorical<string,boolean>",
    "scale.linear<number,boolean>",
    "scale.categorical<string,color>",
    "scale.categorical<date,color>"
]

export const AdvancedScaleEditor: React.FC<ScaleEditorProps> = ({
    store
}) => {
    const chartManager = store.chartManager;

    const [scaleClass, setScaleClass] = React.useState<ObjectClass<Specification.AttributeMap, Specification.AttributeMap>>(null);

    const [scale, setScale] = React.useState<Specification.Scale>(null);

    var manager = React.useMemo(() => {
        const manager = new FluentUIWidgetManager(
            store,
            scaleClass,
            true
        );

        return manager;
    }, [scaleClass]);

    // todo: create react hook
    const [_, setUpdate] = React.useState(Math.random());
    React.useEffect(() => {
        var token = store.addListener(AppStore.EVENT_GRAPHICS, () => {
            setUpdate(Math.random());
        });

        return () => {
            token.remove();
        }
    }, []);

    return (
        <ScaleEditorWrapper className="scale-editor-view">
            <div className="attribute-editor">
                <section className="attribute-editor-element">
                    <div className="header">
                        <Dropdown
                            title="scale type"
                            value={scale.classID}
                            onOptionSelect={(_, { optionValue: classID }) => {
                                debugger;
                                const newScale = chartManager.createObject(
                                    classID
                                ) as Specification.Scale;

                                newScale.properties.name = chartManager.findUnusedName("Scale");

                                const scaleClass = chartManager.getClassById(
                                    newScale._id
                                ) as Prototypes.Scales.ScaleClass;

                                setScaleClass(scaleClass);
                                setScale(newScale);
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
                        <EditableTextView
                            text={scale ? scale.properties.name : "New scale name"}
                            onEdit={(newText) => {
                                if (scale) {
                                    new Actions.SetObjectProperty(
                                        scale,
                                        "name",
                                        null,
                                        newText,
                                        true
                                    ).dispatch(store.dispatcher);
                                }
                            }}
                        />
                    </div>
                    {manager.vertical(...scaleClass.getAttributePanelWidgets(manager))}
                    <div className="action-buttons">
                    </div>
                </section>
            </div>
        </ScaleEditorWrapper>
    );
} 