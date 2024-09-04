/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable max-lines-per-function */
// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import * as React from "react";
import * as R from "../../resources";

import { indexOf, Prototypes, Specification, uniqueID, zipArray } from "../../../core";

import { AppStore } from "../../stores";
import {
    IObject,
} from "../../../core/specification";
import { Button, Dropdown, Input, Label, Option } from "@fluentui/react-components";
import { SVGImageIcon } from "../../components/icons";
import { Actions } from "../../actions";
import { strings } from "../../../strings";

interface ChartObjectWithState {
    persistent: boolean;
    parent: IObject<Specification.ObjectProperties>;
    element: Specification.Element<Specification.ObjectProperties>;
    attributes: Specification.AttributeMap;
}

export const ConstraintsPanel: React.FC<{
    store: AppStore;
}> = ({ store }) => {

    const [constraints, setConstraints]: [Specification.ObjectConstraint[], React.Dispatch<React.SetStateAction<Specification.ObjectConstraint[]>>] = React.useState([]);
    const tokens = React.useRef([]);
    // eslint-disable-next-line powerbi-visuals/insecure-random
    const [_, forceUpdate] = React.useState(Math.random());

    React.useEffect(() => {
        tokens.current = [
            store.addListener(AppStore.EVENT_GRAPHICS, () => {
                // eslint-disable-next-line powerbi-visuals/insecure-random
                const glyphConstraints: Specification.ObjectConstraint[] = store.chartManager.chart.glyphs.flatMap((glyph) => glyph.constraints.map((constraint) => ({
                    ...constraint,
                    parentObjectID: glyph._id,
                    parentObjectType: "glyph"
                })));
                const generalConstraints: Specification.ObjectConstraint[] = store.chartManager.chart.constraints.map((constraint) => ({
                    ...constraint,
                    parentObjectID: store.chartManager.chart._id,
                    parentObjectType: "chart"
                }));
                setConstraints([].concat(glyphConstraints, generalConstraints))
            }),
            store.addListener(AppStore.EVENT_SAVECHART, () => {
                // eslint-disable-next-line powerbi-visuals/insecure-random
                forceUpdate(Math.random());
            })
        ];
        return () => {
            tokens.current.forEach((token) => token.remove());
        };
    }, [store]);

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
            <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-around"
            }}>
                <Button
                    size="small"
                    appearance="primary"
                    onClick={() => {
                        store.dispatcher.dispatch(
                            new Actions.UpdateConstraints(constraints)
                        );
                    }}
                    style={{
                        flex: 1,
                        marginRight: "5px"
                    }}>
                    {strings.constraints.save}
                </Button>
                <Button
                    size="small"
                    appearance="secondary"
                    onClick={() => {
                    const newConstraints = [...constraints];
                    setConstraints([
                        {
                            _id: uniqueID(),
                            type: "snap",
                            parentObjectID: store.chartManager.chart._id,
                            parentObjectType: "chart",
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
                }}
                style={{
                    flex: 1
                }}>
                    {strings.constraints.add}
                </Button>
            </div>
            <h3>{strings.constraints.constraints}</h3>
            {
                (constraints.map((constraint) => {
                    const element = Prototypes.findObjectById(store.chart, constraint.attributes.element);
                    const target = Prototypes.findObjectById(store.chart, constraint.attributes.targetElement);

                    const chartObjects = zipArray(
                        store.chart.elements,
                        store.chartState.elements
                    ).map(([element, elementState]) => {
                        return {
                            persistent: true,
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
                            persistent: true,
                            parent: element.glyph,
                            element: element.mark,
                            attributes: elementState.mark.attributes
                        } as ChartObjectWithState
                    });

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
                            const newConstraints = [...constraints];
                            const index = newConstraints.findIndex(c => c._id === constraint._id);
                            newConstraints[index] = constraint;
                            setConstraints(newConstraints);
                        }}
                        onRemove={() => {
                            const newConstraints = [...constraints];
                            const index = newConstraints.findIndex(c => c._id === constraint._id);
                            newConstraints.splice(index, 1);
                            setConstraints(newConstraints);
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
    constraint: Specification.ObjectConstraint,
    elementWithState: ChartObjectWithState,
    targetWithState: ChartObjectWithState
    onConstraintChange: (constraint: Specification.ObjectConstraint) => void;
    onRemove: (constraint: Specification.ObjectConstraint) => void;
}> = ({ parents, objects, constraint, elementWithState, targetWithState, onConstraintChange, onRemove }) => {

    return (
        <div style={{
            border: "2px solid #ccc",
            padding: "5px",
            borderRadius: "5px",
            display: "flex",
            flexDirection: "column",
            justifyItems: "start",
            marginBottom: "5px"
        }}>
            <h4>{`${elementWithState ? elementWithState.element.properties.name : ""}.${constraint.attributes.attribute} = ${targetWithState ? targetWithState.element.properties.name : ""}.${constraint.attributes.targetAttribute}`}</h4>
            <Label>{strings.constraints.parentObject}</Label>
            <Dropdown
                disabled={elementWithState?.persistent}
                title="Place where the constraint is defined"
                value={parents.find(p => p._id === constraint.parentObjectID)?.properties.name}
                selectedOptions={[elementWithState?.parent._id]}
                onOptionSelect={(_, { optionValue: value }) => {
                    const newConstraint = { ...constraint };
                    newConstraint.parentObjectID = value;
                    onConstraintChange(newConstraint);
                }}
            >
                {parents
                    .map((parent) => {
                        return {
                            key: parent._id,
                            type: parent.classID,
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
            <Label>{strings.constraints.type}</Label>
            <Dropdown
                title={strings.constraints.type}
                disabled={true}
                value={constraint.type}
                // selectedOptions={[constraint.type]}
                selectedOptions={["snap"]}
                onOptionSelect={(_, { optionValue: value }) => {
                    const newConstraint = { ...constraint };
                    newConstraint.type = value as Specification.ConstraintType;
                    onConstraintChange(newConstraint);
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
            <Label>{strings.constraints.gap}</Label>
            <Input
                type="number"
                value={constraint.attributes.gap.toString()}
                onChange={(input, { value }) => {
                    const newConstraint = { ...constraint };
                    newConstraint.attributes.gap = parseFloat(value);
                    onConstraintChange(newConstraint);
                }}
            />
            <Label>{strings.constraints.element}</Label>
            <Dropdown
                title="Element"
                value={objects.find(o => o.element._id === constraint.attributes.element)?.element.properties.name}
                selectedOptions={[constraint.attributes.element]}
                onOptionSelect={(_, { optionValue: value }) => {
                    const newConstraint = { ...constraint };
                    newConstraint.attributes.element = value;
                    onConstraintChange(newConstraint);
                }}
            >
                {objects.filter(o => o.parent._id === constraint.parentObjectID)
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
            <Label>{strings.constraints.elementAttribute}</Label>
            <Dropdown
                title={strings.constraints.elementAttribute}
                value={constraint.attributes.attribute}
                selectedOptions={[constraint.attributes.attribute]}
                onOptionSelect={(_, { optionValue: value }) => {
                    const newConstraint = { ...constraint };
                    newConstraint.attributes.attribute = value;
                    onConstraintChange(newConstraint);
                }}
            >
                {elementWithState && Object.keys(elementWithState?.attributes)
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
            <Label>{strings.constraints.target}</Label>
            <Dropdown
                title={strings.constraints.target}
                value={objects.find(o => o.element._id === constraint.attributes.targetElement)?.element.properties.name}
                selectedOptions={[constraint.attributes.targetElement]}
                onOptionSelect={(_, { optionValue: value }) => {
                    const newConstraint = { ...constraint };
                    newConstraint.attributes.targetElement = value;
                    onConstraintChange(newConstraint);
                }}
            >
                {objects.filter(o => o.parent._id === constraint.parentObjectID)
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
            <Label>{strings.constraints.targetAttribute}</Label>
            <Dropdown
                title={strings.constraints.targetAttribute}
                value={constraint.attributes.targetAttribute}
                selectedOptions={[constraint.attributes.targetAttribute]}
                onOptionSelect={(_, { optionValue: value }) => {
                    const newConstraint = { ...constraint };
                    newConstraint.attributes.targetAttribute = value;
                    onConstraintChange(newConstraint);
                }}
            >
                {targetWithState && Object.keys(targetWithState?.attributes)
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
            <div style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "stretch",
                marginTop: "5px"
            }}>
                <Button
                    size="small"
                    appearance="secondary"
                    style={{
                        flex: 1
                    }}
                    onClick={() => {
                        onRemove(constraint);
                    }}>
                    {strings.constraints.remove}
                </Button>
            </div>
        </div>
    );
} 
