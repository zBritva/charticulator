/* eslint-disable powerbi-visuals/insecure-random */
/* eslint-disable max-lines-per-function */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Prototypes, Point, ZoomInfo } from "../../../../core";
import * as R from "../../../resources";

// The helper functions (getControlPoints, generatePathData) remain the same
// as the previous example. They are included here for completeness.

function generatePathData(points) {
    if (!points || points.length < 4) {
        return '';
    }

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i += 3) {
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[i + 2];
        if (p3) { // Ensure all points for a segment exist
            path += ` C ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`;
        }
    }
    return path;
}

export interface IBezierEditor {
    points: Point[];
    svgRef?: React.RefObject<SVGSVGElement>;
    onChange: (points: { x: number, y: number }[], pathData: string, curve: Point[][]) => void;
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

    // TODO segments
    const [points, setPoints] = useState<Point[]>(initialPoints);
    const [symmetrical, setSymmetrical] = useState(true);

    useEffect(() => {
        if (initialPoints.length <= 4) {
            const extendedPoints = [...initialPoints]
            for (let i = 0; i < 4 - initialPoints.length; i++) {
                extendedPoints.push({
                    x: Math.random(),
                    y: Math.random(),
                });
            }
            setPoints(extendedPoints);
            return;
        }
    }, [])

    const handleMouseDown = (index) => {
        setDraggingIndex(index);
    };

    const handleMouseUp = useCallback(() => {
        setDraggingIndex(null);
    }, []);

    const handleMouseMove = useCallback((event) => {
        if (draggingIndex === null || !svgRef.current) return;

        console.log('mousemove', event.x, event.y, getPoint(event.x, event.y))
        const newPoint = getPoint(event.x, event.y);

        const newPoints = [...points];

        const oldPoint = newPoints[draggingIndex];

        newPoints[draggingIndex] = { x: newPoint.x, y: newPoint.y };

        if (symmetrical && draggingIndex % 3 !== 0) {
            let anchorIndex;
            let siblingIndex;

            // If dragging a 'right' control point (like P2, P5)
            if ((draggingIndex + 1) % 3 === 0) {
                anchorIndex = draggingIndex + 1;
                siblingIndex = draggingIndex + 2;
            }
            // If dragging a 'left' control point (like P1, P4)
            if ((draggingIndex - 1) % 3 === 0) {
                anchorIndex = draggingIndex - 1;
                siblingIndex = draggingIndex - 2;
            }

            if (siblingIndex >= 0 && siblingIndex < newPoints.length) {
                const anchorPoint = newPoints[anchorIndex];
                const draggedPoint = newPoints[draggingIndex];

                // Reflect the sibling point through the anchor
                const dx = anchorPoint.x - draggedPoint.x;
                const dy = anchorPoint.y - draggedPoint.y;

                newPoints[siblingIndex] = { x: anchorPoint.x + dx, y: anchorPoint.y + dy };
            }
        }

        // if dragging anchor point 
        if ((draggingIndex) % 3 === 0) {
            const dx = newPoints[draggingIndex].x - oldPoint.x;
            const dy = newPoints[draggingIndex].y - oldPoint.y;

            if (draggingIndex !== points.length - 1) {
                newPoints[draggingIndex + 1] = { x: newPoints[draggingIndex + 1].x + dx, y: newPoints[draggingIndex + 1].y + dy };
            }
            if (draggingIndex !== 0) {
                newPoints[draggingIndex - 1] = { x: newPoints[draggingIndex - 1].x + dx, y: newPoints[draggingIndex - 1].y + dy };
            }
        }

        setPoints(newPoints);
    }, [draggingIndex, getPoint, setPoints, symmetrical, points]);

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
                        newPoints.push({ x: Math.random(), y: Math.random() });
                        newPoints.push({ x: Math.random(), y: Math.random() });
                        newPoints.push({ x: Math.random(), y: Math.random() });
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
                    if (points.length <= 4) {
                        return;
                    }
                    setPoints((prevPoints) => {
                        const newPoints = [...prevPoints];
                        newPoints.pop();
                        newPoints.pop();
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
                    let doubledPoint = [];
                    if (points.length > 4) {
                        // double anchor points
                        doubledPoint = points.flatMap((point, index) => {
                            if (index === 0 || index === points.length - 1) {
                                return point;
                            }
                            if ((index) % 3 === 0) {
                                return [
                                    point,
                                    point
                                ]
                            }

                            return point;
                        });
                    } else {
                        doubledPoint = points;
                    }

                    const chunks: Point[][] = [];
                    const chunkSize = 4;
                    for (let i = 0; i < doubledPoint.length; i += chunkSize) {
                        const chunk = doubledPoint.slice(i, i + chunkSize);
                        if (chunk.length == 4) {
                            chunks.push(chunk)
                        }  
                    }

                    onChange(points, pathData, chunks);
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

    const renderBezierControlSymmetryButton = (x: number, y: number) => {
        const margin = 2;
        const cx = x - 16 - margin;
        const cy = y + 16 + margin;
        return (
            <g
                className="handle-button"
                onClick={() => {
                    setSymmetrical((prev) => !prev);
                }}
            >
                <rect x={cx - 16} y={cy - 16} width={32} height={32} />
                <image
                    xlinkHref={symmetrical ? R.getSVGIcon("Cross") : R.getSVGIcon("general/bind-data")}
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
            {/* ADD SYmmetrical checkbox */}
            {renderBezierControlSymmetryButton(
                Math.max(fX(handle.x1), fX(handle.x2)),
                Math.min(fY(handle.y1), fY(handle.y2)) + 38 * 3
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