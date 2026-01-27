import { BaseEdge as RFBaseEdge, EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { EdgeType, EDGE_TYPE_INFO } from '../../../types/core';

export interface TypedEdgeProps extends EdgeProps {
  edgeType: EdgeType;
}

export const BaseTypedEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  edgeType,
  label,
  selected,
}: TypedEdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const typeInfo = EDGE_TYPE_INFO[edgeType];

  // Build stroke dasharray based on stroke style
  let strokeDasharray: string | undefined;
  switch (typeInfo.strokeStyle) {
    case 'dashed':
      strokeDasharray = '8 4';
      break;
    case 'dotted':
      strokeDasharray = '2 4';
      break;
    default:
      strokeDasharray = undefined;
  }

  const edgeStyle = {
    ...style,
    stroke: typeInfo.color,
    strokeWidth: selected ? 3 : 2,
    strokeDasharray,
  };

  return (
    <>
      <RFBaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={edgeStyle}
      />
      {/* Animation overlay for delegation edges */}
      {typeInfo.animated && (
        <path
          id={`${id}-animated`}
          d={edgePath}
          fill="none"
          stroke={typeInfo.color}
          strokeWidth={2}
          strokeDasharray="5 5"
          className="react-flow__edge-path-animated"
          style={{
            animation: 'dash 0.5s linear infinite',
          }}
        />
      )}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              backgroundColor: typeInfo.color + '20',
              color: typeInfo.color,
              border: `1px solid ${typeInfo.color}40`,
            }}
            className={`
              px-2 py-0.5 text-xs font-medium rounded-full
              ${selected ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}
            `}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};
