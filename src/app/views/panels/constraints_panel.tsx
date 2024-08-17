/* eslint-disable no-debugger */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { EventSubscription, indexOf, Prototypes, Specification, zipArray } from "../../../core";

import { AppStore } from "../../stores";
import { ContextedComponent } from "../../context_component";
import {
    Element,
    IObject,
} from "../../../core/specification";
import { Button, Dropdown, Input, Label, Option } from "@fluentui/react-components";
import { SVGImageIcon } from "../../components/icons";
import glyph from "src/app/stores/action_handlers/glyph";

interface ObjectConstraint extends Specification.Constraint {
    objectID: string;
    objectType: string;
}

interface ChartObjectWithState {
    parent: IObject<Specification.ObjectProperties>;
    element: Specification.Element<Specification.ObjectProperties>;
    attributes: Specification.AttributeMap;
}

export const ConstraintsPanel: React.FC<{
    store: AppStore;
}> = ({ store }) => {
    const glyphConstraints: ObjectConstraint[] = store.chartManager.chart.glyphs.flatMap((glyph) => glyph.constraints.map((constraint) => ({
        ...constraint,
        objectID: glyph._id,
        objectType: "glyph"
    })));
    const generalConstraints: ObjectConstraint[] = store.chartManager.chart.constraints.map((constraint) => ({
        ...constraint,
        objectID: store.chartManager.chart._id,
        objectType: "chart"
    }));
    debugger;
    const [constraints, setConstraints]: [ObjectConstraint[], React.Dispatch<React.SetStateAction<ObjectConstraint[]>>] = React.useState([].concat(glyphConstraints, generalConstraints));
    const [tokens, setToken] = React.useState([]);
    // eslint-disable-next-line powerbi-visuals/insecure-random
    const [_, forceUpdate] = React.useState(Math.random());

    React.useEffect(() => {
        setToken([
            store.addListener(AppStore.EVENT_GRAPHICS, () => {
                // eslint-disable-next-line powerbi-visuals/insecure-random
                forceUpdate(Math.random());
            }),
            store.addListener(AppStore.EVENT_SELECTION, () => {
                // eslint-disable-next-line powerbi-visuals/insecure-random
                forceUpdate(Math.random());
            }),
            store.addListener(AppStore.EVENT_SAVECHART, () => {
                // eslint-disable-next-line powerbi-visuals/insecure-random
                forceUpdate(Math.random());
            })
        ]);
        return () => {
            tokens.forEach((token) => token.remove());
        };
    }, [tokens, store, forceUpdate]);

    const getGlyphState = React.useCallback((glyph: Specification.Glyph) => {
        const chartStore = store;
        // Find the plot segment's index
        const layoutIndex = indexOf(
            chartStore.chart.elements,
            (e) =>
                Prototypes.isType(e.classID, "plot-segment") &&
                (e as Specification.PlotSegment).glyph == glyph._id
        );

        if (layoutIndex == -1) {
            // Cannot find plot segment, return null
            return null;
        } else {
            // Find the selected glyph
            const plotSegmentState = chartStore.chartState.elements[
                layoutIndex
            ] as Specification.PlotSegmentState;

            const glyphIndex = chartStore.getSelectedGlyphIndex(
                chartStore.chart.elements[layoutIndex]._id
            );

            // If found, use the glyph, otherwise fallback to the first glyph
            if (glyphIndex < 0) {
                return plotSegmentState.glyphs[0];
            } else {
                return plotSegmentState.glyphs[glyphIndex];
            }
        }
    }, [store]);

    return (
        <div style={{
            width: "100%",
            height: "100%",
            overflowY: "scroll"
        }} className="charticulator__object-list-editor charticulator__object-constraints">
            <Button onClick={() => {
                const newConstraints = [...constraints];
                setConstraints([
                    {
                        type: "snap",
                        objectID: store.chartManager.chart._id,
                        objectType: "chart",
                        attributes: {
                            element: "",
                            attribute: "",
                            targetElement: "",
                            targetAttribute: "",
                            gap: 0
                        }
                    },
                    ...newConstraints
                ]);
            }}>
                Add constraint
            </Button>
            <h3>Constraints</h3>
            {
                (constraints.map((constraint) => {
                    const element = Prototypes.findObjectById(store.chart, constraint.attributes.element);
                    const target = Prototypes.findObjectById(store.chart, constraint.attributes.targetElement);

                    const chartObjects = zipArray(
                        store.chart.elements,
                        store.chartState.elements
                    ).map(([element, elementState]) => {
                        return {
                            parent: store.chart,
                            element: element,
                            attributes: elementState.attributes
                        } as ChartObjectWithState
                    });

                    const marks = store.chart.glyphs.filter(glyph => getGlyphState(glyph)).flatMap((glyph) => glyph.marks.map((mark) => ({ glyph, mark })));
                    const markStates = store.chart.glyphs.filter(glyph => getGlyphState(glyph)).flatMap((glyph) => getGlyphState(glyph).marks.map((mark) => ({ glyph, mark })));

                    const glyphObjects = zipArray(
                        marks,
                        markStates
                    ).map(([element, elementState]) => {
                        return {
                            parent: element.glyph,
                            element: element.mark,
                            attributes: elementState.mark.attributes
                        } as ChartObjectWithState
                    });

                    debugger;
                    const objects = chartObjects.concat(glyphObjects);

                    const elementObject = objects.find(o => element && o.element._id === element._id);
                    const targetObject = objects.find(o => target && o.element._id === target._id);

                    return (<ConstraintView
                        key={`${constraint.type}-${constraint.attributes.element}-${constraint.attributes.targetElement}-${constraint.attributes.attribute}-${constraint.attributes.targetAttribute}-${constraint.attributes.gap}`}
                        parents={[
                            store.chart,
                            ...store.chart.glyphs
                        ]}
                        objects={objects}
                        constraint={constraint}
                        elementWithState={elementObject}
                        targetWithState={targetObject}
                        onConstraintChange={(constraint) => {
                            debugger;
                            // const newConstraints = [...constraints];
                            // const index = constraints.indexOf(constraint);
                            // constraints[index] = constraint;
                            // setConstraints(newConstraints);
                        }}
                    />);
                }))
            }
        </div>
    );
}

const ConstraintView: React.FC<{
    parents: IObject<Specification.ObjectProperties>[];
    objects: {
        parent: Specification.ChartElement<Specification.ObjectProperties>;
        element: Specification.ChartElement<Specification.ObjectProperties>;
        attributes: Specification.AttributeMap;
    }[],
    constraint: ObjectConstraint,
    elementWithState: ChartObjectWithState,
    targetWithState: ChartObjectWithState
    onConstraintChange: (constraint: ObjectConstraint) => void;
}> = ({ parents, objects, constraint, elementWithState, targetWithState }) => {
    return (
        <div style={{
            border: "2px solid #ccc",
            padding: "5px",
            borderRadius: "5px",
            display: "flex",
            flexDirection: "column",
            justifyItems: "start"
        }}>
            <h4>{`${targetWithState ? targetWithState.element.properties.name : ""}.${constraint.attributes.attribute} = ${targetWithState ? targetWithState.element.properties.name : ""}.${constraint.attributes.targetAttribute}`}</h4>
            <Label>Parent object</Label>
            <Dropdown
                title="Place where the constraint is defined"
                value={elementWithState.parent.properties.name}
                selectedOptions={[elementWithState.parent.properties.name]}
                onOptionSelect={(_, { optionValue: value }) => {
                    constraint.objectID = value;
                }}
            >
                {parents
                    .map((parent) => {
                        return {
                            key: parent._id,
                            text: parent.properties.name
                        };
                    })
                    .map((o) => {
                        return (
                            <Option text={o.text} value={o.key} key={o.key}>
                                {o.text}
                            </Option>
                        );
                    })}
            </Dropdown>
            <Label>Constraint type</Label>
            <Dropdown
                title="Type"
                value={constraint.type}
                selectedOptions={[constraint.type]}
                onOptionSelect={(_, { optionValue: value }) => {
                    constraint.type = value;
                }}
            >
                {["snap", "move", "property", "value-mapping"]
                    .map((type) => {
                        return {
                            key: type,
                            text: type
                        };
                    })
                    .map((o) => {
                        return (
                            <Option text={o.text} value={o.key} key={o.key}>
                                {o.text}
                            </Option>
                        );
                    })}
            </Dropdown>
            <Label>Gap</Label>
            <Input
                type="number"
                value={constraint.attributes.gap.toString()}
                onChange={(input, { value }) => {
                    constraint.attributes.gap = parseFloat(value);
                }}
            />
            <Label>Element</Label>
            <Dropdown
                title="Element"
                value={targetWithState?.element.properties?.name}
                selectedOptions={[constraint.attributes.element]}
                onOptionSelect={(_, { optionValue: value }) => {
                    debugger;
                }}
            >
                {objects
                    .map((object) => {
                        return {
                            key: object.element._id,
                            text: `${object.parent.properties.name}:${object.element.properties.name}`,
                            iconPath: Prototypes.ObjectClasses.GetMetadata(object.element.classID).iconPath
                        };
                    })
                    .map((o) => {
                        return (
                            <Option text={o.text} value={o.key} key={o.key}>
                                {typeof o.iconPath === "string" ? (
                                    <SVGImageIcon url={R.getSVGIcon(o.iconPath)} />
                                ) : (
                                    o.iconPath
                                )}
                                {o.text}
                            </Option>
                        );
                    })}
            </Dropdown>
            <Label>Element attribute</Label>
            <Dropdown
                title="Element attribute"
                value={constraint.attributes.attribute}
                selectedOptions={[constraint.attributes.attribute]}
                onOptionSelect={(_, { optionValue: value }) => {
                    debugger;
                }}
            >
                {Object.keys(targetWithState.attributes)
                    .map((key) => {
                        return {
                            key: key,
                            text: key
                        };
                    })
                    .map((o) => {
                        return (
                            <Option text={o.text} value={o.key} key={o.key}>
                                {o.text}
                            </Option>
                        );
                    })}
            </Dropdown>
            <Label>Target</Label>
            <Dropdown
                title="Target"
                value={targetWithState?.element.properties?.name}
                selectedOptions={[constraint.attributes.targetElement]}
                onOptionSelect={(_, { optionValue: value }) => {
                    debugger;
                }}
            >
                {objects
                    .map((object) => {
                        return {
                            key: object.element._id,
                            text: `${object.parent.properties.name}:${object.element.properties.name}`,
                            iconPath: Prototypes.ObjectClasses.GetMetadata(object.element.classID).iconPath
                        };
                    })
                    .map((o) => {
                        return (
                            <Option text={o.text} value={o.key} key={o.key}>
                                {typeof o.iconPath === "string" ? (
                                    <SVGImageIcon height={16} width={16} url={R.getSVGIcon(o.iconPath)} />
                                ) : (
                                    o.iconPath
                                )}
                                {o.text}
                            </Option>
                        );
                    })}
            </Dropdown>
            <Label>Target attribute</Label>
            <Dropdown
                title="Target attribute"
                value={constraint.attributes.attribute}
                selectedOptions={[constraint.attributes.attribute]}
                onOptionSelect={(_, { optionValue: value }) => {
                    debugger;
                }}
            >
                {Object.keys(targetWithState.attributes)
                    .map((key) => {
                        return {
                            key: key,
                            text: key
                        };
                    })
                    .map((o) => {
                        return (
                            <Option text={o.text} value={o.key} key={o.key}>
                                {o.text}
                            </Option>
                        );
                    })}
            </Dropdown>
            {/* <pre>{JSON.stringify(constraint.attributes, null, " ")}</pre> */}
        </div>
    );
} 
