import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MacroBar, ProgressRing, WeightChart } from '../../src/components/charts';
import { Card, SectionHeader, StatTile } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { mealsForDay, sumMeals } from '../../src/nutrition';
import { colors, font, radius, spacing } from '../../src/theme';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

// Consecutive-day streak based on days with any logged meal.
function computeStreak(mealDates: Set<string>): number {
  let streak = 0;
  const cursor = startOfDay(new Date());
  // Allow today to not yet be logged without breaking the streak.
  if (!mealDates.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (mealDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function Home() {
  const router = useRouter();
  const { profile, meals, workouts, weights } = useApp();
  const { width } = useWindowDimensions();

  const today = useMemo(() => mealsForDay(meals), [meals]);
  const totals = useMemo(() => sumMeals(today), [today]);

  const workoutsThisWeek = useMemo(() => {
    const weekStart = startOfDay(new Date());
    weekStart.setDate(weekStart.getDate() - 6);
    return workouts.filter((w) => new Date(w.timestamp) >= weekStart);
  }, [workouts]);

  const streak = useMemo(() => {
    const days = new Set(meals.map((m) => m.timestamp.slice(0, 10)));
    return computeStreak(days);
  }, [meals]);

  if (!profile) return null;
  const t = profile.targets;
  const calLeft = t.calories - totals.calories;
  const greeting = getGreeting();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{profile.name} 👋</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={18} color={colors.warn} />
            <Text style={styles.streakText}>{streak}d</Text>
          </View>
        </View>

        {/* Calories hero */}
        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <ProgressRing
              progress={totals.calories / t.calories}
              centerTop="EATEN"
              centerMain={`${totals.calories}`}
              centerSub={`/ ${t.calories} kcal`}
            />
            <View style={styles.heroSide}>
              <Text style={styles.heroSideLabel}>
                {calLeft >= 0 ? 'Remaining' : 'Over budget'}
              </Text>
              <Text
                style={[
                  styles.heroSideValue,
                  { color: calLeft >= 0 ? colors.primary : colors.danger },
                ]}
              >
                {Math.abs(calLeft)}
                <Text style={styles.heroSideUnit}> kcal</Text>
              </Text>
              <View style={styles.heroDivider} />
              <Text style={styles.heroSideLabel}>Today's meals</Text>
              <Text style={styles.heroSideValue}>
                {today.length}
                <Text style={styles.heroSideUnit}> logged</Text>
              </Text>
            </View>
          </View>
        </Card>

        {/* Macros */}
        <Card>
          <SectionHeader title="Macros today" />
          <MacroBar label="Protein" value={totals.protein} target={t.protein} color={colors.protein} />
          <MacroBar label="Carbs" value={totals.carbs} target={t.carbs} color={colors.carbs} />
          <MacroBar label="Fat" value={totals.fat} target={t.fat} color={colors.fat} />
        </Card>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatTile
            icon="barbell"
            label="Workouts / 7d"
            value={`${workoutsThisWeek.length}`}
            accent={colors.accent}
          />
          <StatTile
            icon="flame"
            label="Day streak"
            value={`${streak}`}
            accent={colors.warn}
          />
          <StatTile
            icon="trending-down"
            label="Weight"
            value={weights.length ? `${weights[weights.length - 1].weightKg}kg` : '—'}
            accent={colors.primary}
          />
        </View>

        {/* Weight trend */}
        <Card>
          <SectionHeader title="Weight trend" />
          <WeightChart data={weights} width={width - spacing.lg * 2 - spacing.lg * 2} />
        </Card>

        {/* Recent activity */}
        <Card>
          <SectionHeader title="Recent activity" />
          {[...meals.slice(0, 2), ...workouts.slice(0, 1)]
            .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
            .slice(0, 3)
            .map((item) => {
              const isMeal = 'calories' in item;
              return (
                <View key={item.id} style={styles.activityRow}>
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: isMeal ? colors.primarySoft : colors.accent + '22' },
                    ]}
                  >
                    <Ionicons
                      name={isMeal ? 'restaurant' : 'barbell'}
                      size={16}
                      color={isMeal ? colors.primary : colors.accent}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityName} numberOfLines={1}>
                      {isMeal ? (item as any).name : `${(item as any).exercise} · ${(item as any).reps} reps`}
                    </Text>
                    <Text style={styles.activityTime}>{timeAgo(item.timestamp)}</Text>
                  </View>
                  <Text style={styles.activityValue}>
                    {isMeal ? `${(item as any).calories} kcal` : `${(item as any).formScore}/100`}
                  </Text>
                </View>
              );
            })}
        </Card>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: { color: colors.textMuted, fontSize: font.body },
  name: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warn + '22',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  streakText: { color: colors.warn, fontWeight: '800', fontSize: font.body },
  heroCard: { paddingVertical: spacing.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroSide: { flex: 1, gap: 2 },
  heroSideLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '600' },
  heroSideValue: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  heroSideUnit: { color: colors.textDim, fontSize: font.small, fontWeight: '500' },
  heroDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityName: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  activityTime: { color: colors.textDim, fontSize: font.tiny },
  activityValue: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
});
