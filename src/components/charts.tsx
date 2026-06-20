import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { colors, font } from '../theme';

// Circular progress ring with a centered value, used for calories.
export function ProgressRing({
  size = 150,
  strokeWidth = 14,
  progress, // 0..1 (can exceed 1; clamped for the arc)
  color = colors.primary,
  trackColor = colors.cardAlt,
  centerTop,
  centerMain,
  centerSub,
}: {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  trackColor?: string;
  centerTop?: string;
  centerMain: string;
  centerSub?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dash = circumference * clamped;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        {centerTop ? <Text style={styles.ringTop}>{centerTop}</Text> : null}
        <Text style={styles.ringMain}>{centerMain}</Text>
        {centerSub ? <Text style={styles.ringSub}>{centerSub}</Text> : null}
      </View>
    </View>
  );
}

export function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <View style={styles.macroRow}>
      <View style={styles.macroLabelRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroValue}>
          {Math.round(value)}
          <Text style={styles.macroTarget}> / {target}g</Text>
        </Text>
      </View>
      <View style={styles.macroTrack}>
        <View
          style={[
            styles.macroFill,
            { width: `${pct * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

// Simple line chart for the weight trend.
export function WeightChart({
  data,
  width = 300,
  height = 120,
}: {
  data: { date: string; weightKg: number }[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <View style={{ height, justifyContent: 'center' }}>
        <Text style={styles.chartEmpty}>Log more weigh-ins to see a trend.</Text>
      </View>
    );
  }
  const padX = 8;
  const padY = 16;
  const w = width - padX * 2;
  const h = height - padY * 2;
  const values = data.map((d) => d.weightKg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * w;
    const y = padY + (1 - (d.weightKg - min) / range) * h;
    return { x, y };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
  // Area fill path under the line.
  const area =
    `M ${points[0].x},${height - padY} ` +
    points.map((p) => `L ${p.x},${p.y}`).join(' ') +
    ` L ${points[points.length - 1].x},${height - padY} Z`;

  return (
    <View>
      <Svg width={width} height={height}>
        <Line
          x1={padX}
          y1={height - padY}
          x2={width - padX}
          y2={height - padY}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Path d={area} fill={colors.primary} opacity={0.12} />
        <Polyline
          points={polyline}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3} fill={colors.primary} />
        ))}
      </Svg>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>{values[0]}kg</Text>
        <Text style={styles.chartLabel}>{values[values.length - 1]}kg now</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTop: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600' },
  ringMain: { color: colors.text, fontSize: 30, fontWeight: '800' },
  ringSub: { color: colors.textMuted, fontSize: font.tiny },
  macroRow: { marginBottom: 12 },
  macroLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  macroLabel: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  macroValue: { color: colors.text, fontSize: font.small, fontWeight: '700' },
  macroTarget: { color: colors.textDim, fontWeight: '500' },
  macroTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardAlt,
    overflow: 'hidden',
  },
  macroFill: { height: 8, borderRadius: 4 },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartLabel: { color: colors.textDim, fontSize: font.tiny },
  chartEmpty: { color: colors.textDim, fontSize: font.small, textAlign: 'center' },
});
