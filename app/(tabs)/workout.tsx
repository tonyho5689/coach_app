import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PoseSkeleton } from '../../src/components/PoseSkeleton';
import {
  Button,
  Card,
  EmptyState,
  ScreenTitle,
  SectionHeader,
} from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { colors, font, radius, spacing } from '../../src/theme';
import { ExerciseType, Workout } from '../../src/types';

type Phase = 'select' | 'active' | 'result';

const REP_MS = 2200; // simulated cadence per rep

const EXERCISES: { id: ExerciseType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'squats', label: 'Squats', icon: 'body' },
  { id: 'pushups', label: 'Push-ups', icon: 'fitness' },
];

const TIPS: Record<ExerciseType, string[]> = {
  squats: [
    'Drive through your heels and keep your chest up.',
    'Aim for hips below knees for full depth.',
    'Keep knees tracking over your toes.',
  ],
  pushups: [
    'Brace your core so your hips don’t sag.',
    'Lower until elbows reach 90° for full range.',
    'Tuck elbows ~45° to protect your shoulders.',
  ],
};

export default function WorkoutTab() {
  const { workouts, addWorkout } = useApp();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase] = useState<Phase>('select');
  const [exercise, setExercise] = useState<ExerciseType>('squats');
  const [reps, setReps] = useState(0);
  const [posePhase, setPosePhase] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [lastResult, setLastResult] = useState<Workout | null>(null);

  const startRef = useRef(0);
  const camW = width - spacing.lg * 2;
  const camH = Math.round(camW * 1.2);

  // Drive the simulated rep counter + skeleton animation while active.
  useEffect(() => {
    if (phase !== 'active') return;
    startRef.current = Date.now();
    setReps(0);
    setElapsed(0);
    const interval = setInterval(() => {
      const dt = Date.now() - startRef.current;
      setElapsed(Math.floor(dt / 1000));
      const t = (dt % REP_MS) / REP_MS;
      // Triangle wave 0->1->0 for a down/up motion.
      setPosePhase(t < 0.5 ? t * 2 : (1 - t) * 2);
      setReps(Math.floor(dt / REP_MS));
    }, 50);
    return () => clearInterval(interval);
  }, [phase]);

  const begin = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        // Still allow a camera-less simulated session.
      }
    }
    setPhase('active');
  };

  const finish = async () => {
    const duration = Math.max(1, Math.floor((Date.now() - startRef.current) / 1000));
    // Form score: simulated, weighted by consistency (reps vs duration).
    const cadence = reps > 0 ? duration / reps : REP_MS / 1000;
    const cadenceScore = Math.max(0, 100 - Math.abs(cadence - REP_MS / 1000) * 18);
    const score = Math.round(Math.min(98, 70 + reps * 0.6 + cadenceScore * 0.15));
    const allTips = TIPS[exercise];
    const tips = [allTips[reps % allTips.length], allTips[(reps + 1) % allTips.length]];
    const w: Workout = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      exercise,
      reps,
      durationSec: duration,
      formScore: score,
      tips,
    };
    await addWorkout(w);
    setLastResult(w);
    setPhase('result');
  };

  // ---- Active camera session ----
  if (phase === 'active') {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.content}>
          <ScreenTitle title={exercise === 'squats' ? 'Squats' : 'Push-ups'} subtitle="Move into frame and start repping" />
          <View style={[styles.camWrap, { width: camW, height: camH }]}>
            {permission?.granted ? (
              <CameraView style={StyleSheet.absoluteFill} facing="front" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.camFallback]}>
                <Ionicons name="videocam-off" size={28} color={colors.textDim} />
                <Text style={styles.camFallbackText}>
                  Camera off — running a simulated session
                </Text>
              </View>
            )}
            {/* Pose skeleton overlay */}
            <PoseSkeleton exercise={exercise} phase={posePhase} width={camW} height={camH} />
            {/* Rep counter HUD */}
            <View style={styles.hud}>
              <Text style={styles.hudReps}>{reps}</Text>
              <Text style={styles.hudLabel}>REPS</Text>
            </View>
            <View style={styles.hudTimer}>
              <Ionicons name="time-outline" size={14} color={colors.white} />
              <Text style={styles.hudTimerText}>{formatDuration(elapsed)}</Text>
            </View>
            <View style={styles.trackingBadge}>
              <View style={styles.trackingDot} />
              <Text style={styles.trackingText}>Tracking pose</Text>
            </View>
          </View>
          <Button label="Finish workout" icon="stop-circle" variant="danger" onPress={finish} />
        </View>
      </SafeAreaView>
    );
  }

  // ---- Result screen ----
  if (phase === 'result' && lastResult) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenTitle title="Workout complete 🎉" subtitle="Nice work — here's your breakdown" />
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <Text style={styles.scoreLabel}>FORM SCORE</Text>
            <Text style={[styles.scoreValue, { color: scoreColor(lastResult.formScore) }]}>
              {lastResult.formScore}
              <Text style={styles.scoreMax}>/100</Text>
            </Text>
            <View style={styles.resultStats}>
              <ResultStat value={`${lastResult.reps}`} label="reps" />
              <ResultStat value={formatDuration(lastResult.durationSec)} label="time" />
              <ResultStat
                value={lastResult.exercise === 'squats' ? 'Squats' : 'Push-ups'}
                label="exercise"
              />
            </View>
          </Card>
          <Card>
            <SectionHeader title="Coach tips" />
            {lastResult.tips.map((tip, i) => (
              <View key={i} style={styles.tipRow}>
                <Ionicons name="bulb" size={16} color={colors.warn} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </Card>
          <Button label="Done" icon="checkmark" onPress={() => setPhase('select')} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- Exercise selection + history ----
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle title="Workout" subtitle="Pick an exercise and let Coach count your reps" />
        <View style={styles.exerciseGrid}>
          {EXERCISES.map((ex) => (
            <Pressable
              key={ex.id}
              onPress={() => setExercise(ex.id)}
              style={[styles.exerciseCard, exercise === ex.id && styles.exerciseCardActive]}
            >
              <Ionicons
                name={ex.icon}
                size={32}
                color={exercise === ex.id ? colors.primary : colors.textMuted}
              />
              <Text
                style={[styles.exerciseLabel, exercise === ex.id && { color: colors.primary }]}
              >
                {ex.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Button label="Start workout" icon="play" onPress={begin} />

        <SectionHeader title="Workout history" />
        {workouts.length === 0 ? (
          <Card>
            <EmptyState icon="barbell-outline" text="No workouts yet. Start your first session above!" />
          </Card>
        ) : (
          workouts.map((w) => (
            <Card key={w.id} style={styles.historyCard}>
              <View style={[styles.historyIcon, { backgroundColor: colors.accent + '22' }]}>
                <Ionicons
                  name={w.exercise === 'squats' ? 'body' : 'fitness'}
                  size={20}
                  color={colors.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyName}>
                  {w.exercise === 'squats' ? 'Squats' : 'Push-ups'} · {w.reps} reps
                </Text>
                <Text style={styles.historyMeta}>
                  {formatDuration(w.durationSec)} · {formatWhen(w.timestamp)}
                </Text>
              </View>
              <View style={[styles.scoreBadge, { backgroundColor: scoreColor(w.formScore) + '22' }]}>
                <Text style={[styles.scoreBadgeText, { color: scoreColor(w.formScore) }]}>
                  {w.formScore}
                </Text>
              </View>
            </Card>
          ))
        )}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={styles.resultStatValue}>{value}</Text>
      <Text style={styles.resultStatLabel}>{label}</Text>
    </View>
  );
}

function scoreColor(score: number): string {
  if (score >= 85) return colors.primary;
  if (score >= 70) return colors.warn;
  return colors.danger;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  exerciseGrid: { flexDirection: 'row', gap: spacing.md },
  exerciseCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  exerciseCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  exerciseLabel: { color: colors.textMuted, fontSize: font.body, fontWeight: '700' },
  camWrap: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  camFallback: { alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.bgElevated },
  camFallbackText: { color: colors.textDim, fontSize: font.small, paddingHorizontal: spacing.xl, textAlign: 'center' },
  hud: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  hudReps: { color: colors.white, fontSize: 40, fontWeight: '900', lineHeight: 44 },
  hudLabel: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', letterSpacing: 2 },
  hudTimer: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  hudTimerText: { color: colors.white, fontSize: font.small, fontWeight: '700' },
  trackingBadge: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  trackingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  trackingText: { color: colors.white, fontSize: font.tiny, fontWeight: '600' },
  scoreLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '800', letterSpacing: 2 },
  scoreValue: { fontSize: 64, fontWeight: '900' },
  scoreMax: { fontSize: font.h2, color: colors.textDim, fontWeight: '700' },
  resultStats: { flexDirection: 'row', marginTop: spacing.lg, width: '100%' },
  resultStatValue: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  resultStatLabel: { color: colors.textDim, fontSize: font.tiny, marginTop: 2 },
  tipRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingVertical: 6 },
  tipText: { color: colors.text, fontSize: font.small, flex: 1, lineHeight: 20 },
  historyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  historyIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  historyName: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  historyMeta: { color: colors.textDim, fontSize: font.tiny, marginTop: 2 },
  scoreBadge: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  scoreBadgeText: { fontSize: font.h3, fontWeight: '800' },
});
