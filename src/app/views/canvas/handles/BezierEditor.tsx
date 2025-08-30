/* eslint-disable max-lines-per-function */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Prototypes, Point, ZoomInfo } from "../../../../core";
import * as R from "../../../resources";

// The helper functions (getControlPoints, generatePathData) remain the same
// as the previous example. They are included here for completeness.
const TENSION = 0.4;

function getControlPoints(p0, p1, p2, p3) {
    //   const d1 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2));
    //   const d2 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    //   const d3 = Math.sqrt(Math.pow(p3.x - p2.x, 2) + Math.pow(p3.y - p2.y, 2));

    const cp1 = {
        x: p1.x + (TENSION * (p2.x - p0.x)) / 6,
        y: p1.y + (TENSION * (p2.y - p0.y)) / 6,
    };
    const cp2 = {
        x: p2.x - (TENSION * (p3.x - p1.x)) / 6,
        y: p2.y - (TENSION * (p3.y - p1.y)) / 6,
    };

    return [cp1, cp2];
}

function generatePathData(points) {
    if (points.length < 2) return '';
    let path = `M ${points[0].x} ${points[0].y}`;
    const extendedPoints = [points[0], ...points, points[points.length - 1]];
    for (let i = 1; i < extendedPoints.length - 2; i++) {
        const p0 = extendedPoints[i - 1];
        const p1 = extendedPoints[i];
        const p2 = extendedPoints[i + 1];
        const p3 = extendedPoints[i + 2];
        const [cp1, cp2] = getControlPoints(p0, p1, p2, p3);
        path += ` C ${cp1.x},${cp1.y} ${cp2.x},${cp2.y} ${p2.x},${p2.y}`;
    }
    return path;
}

export interface IBezierEditor {
    points: Point[];
    svgRef?: React.RefObject<SVGSVGElement>;
    onChange: (points: { x: number, y: number }[], pathData: string) => void;
    x: number;
    y: number;
    width: number;
    height: number;
    handle: Prototypes.Handles.InputCurve;
    zoom: ZoomInfo;
}

// The main component updated with Hammer.js
// eslint-disable-next-line no-empty-pattern
export function BezierEditor({ handle, zoom, height, width, x, y, onChange, points: initialPoints }: IBezierEditor) {


    const fX = (x: number) =>
        x * zoom.scale + zoom.centerX;
    const fY = (y: number) =>
        -y * zoom.scale + zoom.centerY;
    const transformPoint = (p: Point) => {
        const scaler = Math.abs(handle.x2 - handle.x1) / 2;
        const x = p.x * scaler + (handle.x1 + handle.x2) / 2;
        const y = p.y * scaler + (handle.y1 + handle.y2) / 2;
        return {
            x: fX(x),
            y: fY(y),
        };
    };

    const [draggingIndex, setDraggingIndex] = useState(null);
    const svgRef = useRef<SVGRectElement>(null);

    const getPoint = useCallback((x: number, y: number): Point => {
        const bbox = svgRef.current.getBoundingClientRect();
        x -= bbox.left;
        y -= bbox.top + bbox.height;
        x /= zoom.scale;
        y /= -zoom.scale;
        // Scale x, y
        const w = Math.abs(handle.x2 - handle.x1);
        const h = Math.abs(handle.y2 - handle.y1);
        return {
            x: (x - w / 2) / (w / 2),
            y: (y - h / 2) / (w / 2),
        };
    }, [handle, zoom])

    const [points, setPoints] = useState<Point[]>(initialPoints);

    // useEffect(() => {
    //     setPoints([
    //         {
    //             x: -.5,
    //             y: -.5,
    //         },
    //         {
    //             x: -.25,
    //             y: -.25,
    //         },
    //         {
    //             x: 0,
    //             y: 0,
    //         },
    //         {
    //             x: .25,
    //             y: .25,
    //         },
    //         {
    //             x: .5,
    //             y: .5,
    //         }
    //     ]);
    // }, [])

    const handleMouseDown = (index) => {
        setDraggingIndex(index);
    };

    const handleMouseUp = useCallback(() => {
        setDraggingIndex(null);
    }, []);

    const handleMouseMove = useCallback((event) => {
        if (draggingIndex === null || !svgRef.current) return;

        // const svgRect = svgRef.current.getBoundingClientRect();
        // const newX = event.clientX - svgRect.left;
        // const newY = event.clientY - svgRect.top;
        console.log('mousemove', event.x, event.y, getPoint(event.x, event.y))
        const newPoint = getPoint(event.x, event.y);

        setPoints((prevPoints) => {
            const newPoints = [...prevPoints];
            newPoints[draggingIndex] = newPoint;
            return newPoints;
        });
        // onChange(points.map(transformPoint));
    }, [draggingIndex, getPoint, setPoints]);

    // Attach global mouse listeners for smoother dragging
    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const pathData = generatePathData(points.map(transformPoint));

    const renderBezierControlAddButton = (x: number, y: number) => {
        const margin = 2;
        const cx = x - 16 - margin;
        const cy = y + 16 + margin;
        return (
            <g
                className="handle-button"
                onClick={() => {
                    setPoints((prevPoints) => {
                        const newPoints = [...prevPoints];
                        newPoints.push({ x: 0, y: 0 });
                        return newPoints;
                    });
                }}
            >
                <rect x={cx - 16} y={cy - 16} width={32} height={32} />
                <image
                    xlinkHref={R.getSVGIcon("general/plus")}
                    x={cx - 12}
                    y={cy - 12}
                    width={24}
                    height={24}
                />
            </g>
        );
    }

    const renderBezierControlRemoveButton = (x: number, y: number) => {
        const margin = 2;
        const cx = x - 16 - margin;
        const cy = y + 16 + margin;
        return (
            <g
                className="handle-button"
                onClick={() => {
                    setPoints((prevPoints) => {
                        const newPoints = [...prevPoints];
                        newPoints.pop();
                        return newPoints;
                    });
                }}
            >
                <rect x={cx - 16} y={cy - 16} width={32} height={32} />
                <image
                    xlinkHref={R.getSVGIcon("general/minus")}
                    x={cx - 12}
                    y={cy - 12}
                    width={24}
                    height={24}
                />
            </g>
        );
    }

    const renderBezierControlCloseButton = (x: number, y: number) => {
        const margin = 2;
        const cx = x - 16 - margin;
        const cy = y + 16 + margin;
        return (
            <g
                className="handle-button"
                onClick={() => {
                    const pathData = generatePathData(points.map(transformPoint));
                    onChange(points, pathData);
                }}
            >
                <rect x={cx - 16} y={cy - 16} width={32} height={32} />
                <image
                    xlinkHref={R.getSVGIcon("Cross")}
                    x={cx - 12}
                    y={cy - 12}
                    width={24}
                    height={24}
                />
            </g>
        );
    }

    return (
        <>
            {renderBezierControlAddButton(
                Math.max(fX(handle.x1), fX(handle.x2)),
                Math.min(fY(handle.y1), fY(handle.y2)) + 38
            )}
            {renderBezierControlRemoveButton(
                Math.max(fX(handle.x1), fX(handle.x2)),
                Math.min(fY(handle.y1), fY(handle.y2)) + 38 * 2
            )}
            {renderBezierControlCloseButton(
                Math.max(fX(handle.x1), fX(handle.x2)),
                Math.min(fY(handle.y1), fY(handle.y2))
            )}
            <path className='editor-curve' d={pathData} fill="none" stroke="#2563eb" strokeWidth="3" />

            <g
                className='editor-control-circles'
                ref={svgRef}
                x={x}
                y={y}
                width={width}
                height={height}
                stroke='red'
                fill='none'
                strokeWidth='3'>
                {/* The Bezier Curve Path */}

                {/* The Draggable Anchor Points */}
                <circle
                    className='editor-anchor-point'
                    key={`point-0`}
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#fff"
                    stroke={'green'}
                    strokeWidth="2"
                />
                <circle
                    className='editor-anchor-point'
                    key={`point-1`}
                    cx={x + width}
                    cy={y + height}
                    r="4"
                    fill="#fff"
                    stroke={'green'}
                    strokeWidth="2"
                />
                {points.map((point, index) => {
                    const pt = transformPoint(point);
                    return (
                        <>
                            <circle
                                className='editor-anchor-point'
                                key={`point-${index}-${point.x}-${point.y}`}
                                cx={pt.x}
                                cy={pt.y}
                                r="4"
                                fill="#fff"
                                stroke={points.length - 1 === index ? 'red' : '#ccc'}
                                strokeWidth="2"
                                style={{ cursor: 'grab' }}
                                // Mouse/Touch events are now handled by Hammer on the parent SVG
                                onMouseDown={() => handleMouseDown(index)}
                            />
                        </>
                    );
                })}
            </g>
        </>
    );
}

export default BezierEditor;