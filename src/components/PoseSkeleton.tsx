import React from 'react';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../theme';
import { ExerciseType } from '../types';

// A lightweight simulated pose skeleton. `phase` 0..1 interpolates between the
// "up" and "down" position of the rep so the figure visibly moves while a rep
// counter ticks. This is a placeholder for a real pose-estimation model.
export function PoseSkeleton({
  exercise,
  phase,
  width,
  height,
}: {
  exercise: ExerciseType;
  phase: number; // 0 = up, 1 = down
  width: number;
  height: number;
}) {
  const cx = width / 2;
  const stroke = colors.primary;
  const joint = colors.accent;

  // Joint coordinates for "up" and "down", lerped by phase.
  const lerp = (a: number, b: number) => a + (b - a) * phase;

  let pts: Record<string, [number, number]>;

  if (exercise === 'squats') {
    const top = height * 0.2;
    const hipUp = height * 0.5;
    const hipDown = height * 0.62;
    const kneeUp = height * 0.72;
    const kneeDown = height * 0.78;
    const ankle = height * 0.9;
    const hipY = lerp(hipUp, hipDown);
    const kneeY = lerp(kneeUp, kneeDown);
    const kneeSpread = lerp(26, 40);
    pts = {
      head: [cx, top],
      neck: [cx, top + 26],
      hip: [cx, hipY],
      kneeL: [cx - kneeSpread, kneeY],
      kneeR: [cx + kneeSpread, kneeY],
      ankleL: [cx - 24, ankle],
      ankleR: [cx + 24, ankle],
      handL: [cx - 30, lerp(top + 50, top + 70)],
      handR: [cx + 30, lerp(top + 50, top + 70)],
    };
    return (
      <Skeleton
        pts={pts}
        bones={[
          ['head', 'neck'],
          ['neck', 'hip'],
          ['neck', 'handL'],
          ['neck', 'handR'],
          ['hip', 'kneeL'],
          ['hip', 'kneeR'],
          ['kneeL', 'ankleL'],
          ['kneeR', 'ankleR'],
        ]}
        width={width}
        height={height}
        stroke={stroke}
        joint={joint}
      />
    );
  }

  // Push-ups: a horizontal body that lowers toward the ground.
  const bodyY = lerp(height * 0.45, height * 0.6);
  const headX = width * 0.78;
  const footX = width * 0.18;
  const elbowY = lerp(height * 0.6, height * 0.74);
  pts = {
    head: [headX, bodyY - 6],
    shoulder: [headX - 50, bodyY],
    hip: [cx - 10, bodyY + 6],
    foot: [footX, bodyY + 14],
    handL: [headX - 40, height * 0.86],
    elbow: [headX - 45, elbowY],
  };
  return (
    <Skeleton
      pts={pts}
      bones={[
        ['head', 'shoulder'],
        ['shoulder', 'hip'],
        ['hip', 'foot'],
        ['shoulder', 'elbow'],
        ['elbow', 'handL'],
      ]}
      width={width}
      height={height}
      stroke={stroke}
      joint={joint}
    />
  );
}

function Skeleton({
  pts,
  bones,
  width,
  height,
  stroke,
  joint,
}: {
  pts: Record<string, [number, number]>;
  bones: [string, string][];
  width: number;
  height: number;
  stroke: string;
  joint: string;
}) {
  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }}>
      {bones.map(([a, b], i) => (
        <Line
          key={i}
          x1={pts[a][0]}
          y1={pts[a][1]}
          x2={pts[b][0]}
          y2={pts[b][1]}
          stroke={stroke}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.9}
        />
      ))}
      {Object.entries(pts).map(([k, [x, y]]) => (
        <Circle
          key={k}
          cx={x}
          cy={y}
          r={k === 'head' ? 14 : 6}
          fill={k === 'head' ? 'none' : joint}
          stroke={k === 'head' ? stroke : 'none'}
          strokeWidth={k === 'head' ? 4 : 0}
        />
      ))}
    </Svg>
  );
}
