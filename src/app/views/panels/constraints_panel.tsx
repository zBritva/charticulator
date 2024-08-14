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
} from "../../../core/specification";
import { Button, Dropdown, Input, Label, Option } from "@fluentui/react-components";
import { SVGImageIcon } from "../../components/icons";

export class ConstraintsPanel extends ContextedComponent<
    {
        store: AppStore;
    },
    {
        constraints: Specification.Constraint[];
    }
> {
    public mappingButton: Element;
    private tokens: EventSubscription[];
    chartState: any;

    constructor(props: { store: AppStore }) {
        super(props, null);
        const generalConstraints = props.store.chart.constraints;
        const glyphConstraints = props.store.chart.glyphs.flatMap((glyph) => glyph.constraints);
        this.state = {
            constraints: generalConstraints.concat(glyphConstraints),
        };
    }

    public componentDidMount() {
        this.tokens = [
            this.store.addListener(AppStore.EVENT_GRAPHICS, () => this.forceUpdate()),
            this.store.addListener(AppStore.EVENT_SELECTION, () =>
                this.forceUpdate()
            ),
            this.store.addListener(AppStore.EVENT_SAVECHART, () =>
                this.forceUpdate()
            ),
        ];
    }

    public componentWillUnmount() {
        this.tokens.forEach((token) => token.remove());
        this.tokens = [];
    }

    public renderUnexpectedState(message: string) {
        return (
            <div className="attribute-editor charticulator__widget-container">
                <div className="attribute-editor-unexpected">{message}</div>
            </div>
        );
    }

    private getPropertyDisplayName(name: string) {
        return name[0].toUpperCase() + name.slice(1);
    }

    public getGlyphState(glyph: Specification.Glyph) {
        const chartStore = this.store;
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
    }

    // eslint-disable-next-line
    public render(): any {
        const store = this.props.store;

        return (
            <div style={{
                width: "100%",
                height: "100%",
                overflowY: "scroll"
            }} className="charticulator__object-list-editor charticulator__object-constraints">
                <Button onClick={() => {
                    const constraints = [...this.state.constraints];
                    this.setState({
                        constraints: [
                            {
                                type: "snap",
                                attributes: {
                                    element: "",
                                    attribute: "",
                                    targetElement: "",
                                    targetAttribute: "",
                                    gap: 0
                                }
                            },
                            ...constraints
                        ]
                    });
                }}>
                    Add constraint
                </Button>
                <h3>Constraints</h3>
                {
                    this.state.constraints.map((constraint) => {
                        const element = Prototypes.findObjectById(store.chart, constraint.attributes.element);
                        const target = Prototypes.findObjectById(store.chart, constraint.attributes.targetElement);

                        const chartObjects = zipArray(
                            this.props.store.chart.elements,
                            this.props.store.chartState.elements
                        ).map(([element, elementState]) => {
                            return {
                                element: element,
                                attributes: elementState.attributes
                            }
                        });

                        // TODO for each all glyphs
                        const glyphObjects = zipArray(
                            this.props.store.chart.glyphs[0].marks,
                            this.getGlyphState(this.props.store.chart.glyphs[0]).marks
                        ).map(([element, elementState]) => {
                            return {
                                element: element,
                                attributes: elementState.attributes
                            }
                        });

                        const objects = chartObjects.concat(glyphObjects);

                        let elementObject = chartObjects.find(o => element && o.element._id === element._id);
                        let targetObject = chartObjects.find(o => target && o.element._id === target._id);

                        if (elementObject === undefined) {
                            elementObject = glyphObjects.find(o => element && o.element._id === element._id);
                        }
                        if (targetObject === undefined) {
                            targetObject = glyphObjects.find(o => target && o.element._id === target._id);
                        }

                        const elementAttributes = elementObject ? elementObject.attributes : {};
                        const targetAttributes = targetObject ?  targetObject.attributes : {};
                        debugger;

                        return (
                            <div style={{
                                border: "2px solid #ccc",
                                padding: "5px",
                                borderRadius: "5px",
                                display: "flex",
                                flexDirection: "column",
                                justifyItems: "start"
                            }}>
                                <h4>{`${element ? element.properties.name : ""}.${constraint.attributes.attribute} = ${target ? target.properties.name : ""}.${constraint.attributes.targetAttribute}`}</h4>
                                <Label>Type</Label>
                                <Dropdown
                                    title="Type"
                                    value={constraint.type}
                                    selectedOptions={[constraint.type]}
                                    onOptionSelect={(_, { optionValue: value }) => {
                                        debugger;
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
                                    onChange={(value) => {
                                        debugger;
                                    }}
                                />
                                <Label>Element</Label>
                                <Dropdown
                                    title="Element"
                                    value={element?.properties?.name}
                                    selectedOptions={[constraint.attributes.element]}
                                    onOptionSelect={(_, { optionValue: value }) => {
                                        debugger;
                                    }}
                                >
                                    {objects
                                        .map((object) => {
                                            return {
                                                key: object.element._id,
                                                text: object.element.properties.name,
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
                                    {Object.keys(elementAttributes)
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
                                    value={target?.properties?.name}
                                    selectedOptions={[constraint.attributes.targetElement]}
                                    onOptionSelect={(_, { optionValue: value }) => {
                                        debugger;
                                    }}
                                >
                                    {objects
                                        .map((object) => {
                                            return {
                                                key: object.element._id,
                                                text: object.element.properties.name,
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
                                    {Object.keys(targetAttributes)
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
                    })
                }
            </div>
        );
    }
}
