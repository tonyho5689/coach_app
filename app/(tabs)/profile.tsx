import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, ScreenTitle, SectionHeader } from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import {
  ACTIVITY_LABELS,
  computeTargets,
  GOAL_LABELS,
} from '../../src/nutrition';
import { colors, font, radius, spacing } from '../../src/theme';
import { ActivityLevel, Goal, Sex } from '../../src/types';

export default function Profile() {
  const router = useRouter();
  const { profile, saveProfile, addWeight, resetAll } = useApp();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile?.name ?? '');
  const [age, setAge] = useState(String(profile?.age ?? ''));
  const [sex, setSex] = useState<Sex>(profile?.sex ?? 'male');
  const [heightCm, setHeightCm] = useState(String(profile?.heightCm ?? ''));
  const [weightKg, setWeightKg] = useState(String(profile?.weightKg ?? ''));
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? 'maintain');
  const [activity, setActivity] = useState<ActivityLevel>(
    profile?.activityLevel ?? 'moderate',
  );
  const [restrictions, setRestrictions] = useState<string[]>(
    profile?.dietaryRestrictions ?? [],
  );

  if (!profile) return null;

  const save = async () => {
    const a = parseInt(age, 10);
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!name.trim() || !a || !h || !w) {
      Alert.alert('Missing info', 'Please fill in all fields with valid values.');
      return;
    }
    const targets = computeTargets(sex, w, h, a, activity, goal);
    const weightChanged = w !== profile.weightKg;
    await saveProfile({
      ...profile,
      name: name.trim(),
      age: a,
      sex,
      heightCm: h,
      weightKg: w,
      goal,
      activityLevel: activity,
      dietaryRestrictions: restrictions,
      targets,
    });
    // Record a weigh-in if weight changed so the trend chart updates.
    if (weightChanged) {
      await addWeight({ date: new Date().toISOString().slice(0, 10), weightKg: w });
    }
    setEditing(false);
  };

  const toggleRestriction = (r: string) =>
    setRestrictions((cur) =>
      cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r],
    );

  const confirmReset = () =>
    Alert.alert(
      'Reset all data?',
      'This clears your profile, meals, and workouts, and re-seeds the demo on next launch.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetAll();
            router.replace('/onboarding');
          },
        },
      ],
    );

  const bmi = profile.weightKg / Math.pow(profile.heightCm / 100, 2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenTitle title="Profile" subtitle="Your body, goals & targets" />

          {/* Identity card */}
          <Card style={{ alignItems: 'center' }}>
            <View style={styles.bigAvatar}>
              <Text style={styles.bigAvatarText}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileMeta}>
              {profile.age}y · {profile.sex} · {profile.heightCm}cm
            </Text>
            <View style={styles.goalPill}>
              <Ionicons name="flag" size={13} color={colors.primary} />
              <Text style={styles.goalPillText}>{GOAL_LABELS[profile.goal]}</Text>
            </View>
          </Card>

          {/* Targets */}
          <Card>
            <SectionHeader title="Daily targets" />
            <View style={styles.targetGrid}>
              <Target value={`${profile.targets.calories}`} label="kcal" color={colors.calories} />
              <Target value={`${profile.targets.protein}g`} label="protein" color={colors.protein} />
              <Target value={`${profile.targets.carbs}g`} label="carbs" color={colors.carbs} />
              <Target value={`${profile.targets.fat}g`} label="fat" color={colors.fat} />
            </View>
            <View style={styles.bmiRow}>
              <Text style={styles.bmiLabel}>BMI</Text>
              <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
              <Text style={styles.bmiNote}>{bmiCategory(bmi)}</Text>
            </View>
          </Card>

          {!editing ? (
            <>
              <Card>
                <SectionHeader title="Details" />
                <DetailRow label="Weight" value={`${profile.weightKg} kg`} />
                <DetailRow label="Activity" value={ACTIVITY_LABELS[profile.activityLevel]} />
                <DetailRow
                  label="Restrictions"
                  value={profile.dietaryRestrictions.join(', ') || 'None'}
                />
              </Card>
              <Button label="Edit profile" icon="create" onPress={() => setEditing(true)} />
              <Button label="Reset all data" icon="trash" variant="ghost" onPress={confirmReset} />
            </>
          ) : (
            <Card>
              <SectionHeader title="Edit profile" />
              <Field label="Name" value={name} onChange={setName} />
              <Field label="Age" value={age} onChange={setAge} keyboard="number-pad" />
              <Text style={styles.fieldLabel}>Sex</Text>
              <View style={styles.row}>
                <Chip label="Male" selected={sex === 'male'} onPress={() => setSex('male')} />
                <Chip label="Female" selected={sex === 'female'} onPress={() => setSex('female')} />
              </View>
              <Field label="Height (cm)" value={heightCm} onChange={setHeightCm} keyboard="decimal-pad" />
              <Field label="Weight (kg)" value={weightKg} onChange={setWeightKg} keyboard="decimal-pad" />

              <Text style={styles.fieldLabel}>Goal</Text>
              <View style={styles.wrap}>
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                  <Chip key={g} label={GOAL_LABELS[g]} selected={goal === g} onPress={() => setGoal(g)} />
                ))}
              </View>

              <Text style={styles.fieldLabel}>Activity</Text>
              <View style={styles.wrap}>
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                  <Chip
                    key={a}
                    label={a}
                    selected={activity === a}
                    onPress={() => setActivity(a)}
                  />
                ))}
              </View>

              <Text style={styles.fieldLabel}>Dietary restrictions</Text>
              <View style={styles.wrap}>
                {['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'No pork', 'No shellfish', 'Keto', 'Halal'].map(
                  (r) => (
                    <Chip
                      key={r}
                      label={r}
                      selected={restrictions.includes(r)}
                      onPress={() => toggleRestriction(r)}
                    />
                  ),
                )}
              </View>

              <View style={styles.editActions}>
                <Button label="Cancel" variant="ghost" onPress={() => setEditing(false)} style={{ flex: 1 }} />
                <Button label="Save" icon="checkmark" onPress={save} style={{ flex: 2 }} />
              </View>
            </Card>
          )}
          <View style={{ height: spacing.xl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Target({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.targetValue, { color }]}>{value}</Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  keyboard,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboard?: 'number-pad' | 'decimal-pad';
}) {
  return (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboard ?? 'default'}
        placeholderTextColor={colors.textDim}
      />
    </>
  );
}

function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Healthy';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  bigAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  bigAvatarText: { color: colors.primary, fontSize: 32, fontWeight: '900' },
  profileName: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  profileMeta: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  goalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  goalPillText: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  targetGrid: { flexDirection: 'row' },
  targetValue: { fontSize: font.h2, fontWeight: '800' },
  targetLabel: { color: colors.textDim, fontSize: font.tiny, marginTop: 2 },
  bmiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bmiLabel: { color: colors.textMuted, fontSize: font.small, fontWeight: '600' },
  bmiValue: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  bmiNote: { color: colors.textDim, fontSize: font.small },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  detailLabel: { color: colors.textMuted, fontSize: font.small },
  detailValue: { color: colors.text, fontSize: font.small, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  editActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
});
