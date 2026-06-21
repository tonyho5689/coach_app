import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Chip } from '../src/components/ui';
import { useApp } from '../src/context/AppContext';
import {
  ACTIVITY_LABELS,
  computeTargets,
  GOAL_LABELS,
} from '../src/nutrition';
import { colors, font, radius, spacing } from '../src/theme';
import {
  ActivityLevel,
  Goal,
  Sex,
  UserProfile,
} from '../src/types';

const RESTRICTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-free',
  'Dairy-free',
  'No pork',
  'No shellfish',
  'Keto',
  'Halal',
];

export default function Onboarding() {
  const router = useRouter();
  const { saveProfile } = useApp();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [age, setAge] = useState('29');
  const [sex, setSex] = useState<Sex>('male');
  const [heightCm, setHeightCm] = useState('178');
  const [weightKg, setWeightKg] = useState('80');
  const [goal, setGoal] = useState<Goal>('lose');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [restrictions, setRestrictions] = useState<string[]>([]);

  const totalSteps = 5;

  const toggleRestriction = (r: string) =>
    setRestrictions((cur) =>
      cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r],
    );

  const canNext = (): boolean => {
    if (step === 0) return name.trim().length > 0 && +age > 0 && +age < 120;
    if (step === 1) return +heightCm > 80 && +weightKg > 25;
    return true;
  };

  const finish = async () => {
    const a = parseInt(age, 10);
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    const targets = computeTargets(sex, w, h, a, activity, goal);
    const profile: UserProfile = {
      name: name.trim(),
      age: a,
      sex,
      heightCm: h,
      weightKg: w,
      goal,
      activityLevel: activity,
      dietaryRestrictions: restrictions,
      targets,
      createdAt: new Date().toISOString(),
    };
    await saveProfile(profile);
    router.replace('/(tabs)');
  };

  const next = () => {
    if (step < totalSteps - 1) setStep(step + 1);
    else finish();
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Progress bar */}
        <View style={styles.progressWrap}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSeg,
                { backgroundColor: i <= step ? colors.primary : colors.cardAlt },
              ]}
            />
          ))}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <Step
              title="Welcome to Coach"
              subtitle="Let's set up your profile so your coach knows your numbers."
            >
              <Label text="What's your name?" />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Alex"
                placeholderTextColor={colors.textDim}
                returnKeyType="done"
              />
              <Label text="Age" />
              <TextInput
                style={styles.input}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="29"
                placeholderTextColor={colors.textDim}
              />
              <Label text="Sex" />
              <View style={styles.row}>
                <Chip label="Male" selected={sex === 'male'} onPress={() => setSex('male')} />
                <Chip label="Female" selected={sex === 'female'} onPress={() => setSex('female')} />
              </View>
            </Step>
          )}

          {step === 1 && (
            <Step title="Your body" subtitle="Used to calculate your daily targets.">
              <Label text="Height (cm)" />
              <TextInput
                style={styles.input}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
              />
              <Label text="Weight (kg)" />
              <TextInput
                style={styles.input}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
              />
            </Step>
          )}

          {step === 2 && (
            <Step title="Your goal" subtitle="What are you working toward?">
              {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                <SelectRow
                  key={g}
                  label={GOAL_LABELS[g]}
                  selected={goal === g}
                  onPress={() => setGoal(g)}
                />
              ))}
            </Step>
          )}

          {step === 3 && (
            <Step
              title="Activity level"
              subtitle="How active are you on a typical week?"
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                <SelectRow
                  key={a}
                  label={ACTIVITY_LABELS[a]}
                  selected={activity === a}
                  onPress={() => setActivity(a)}
                />
              ))}
            </Step>
          )}

          {step === 4 && (
            <Step
              title="Dietary restrictions"
              subtitle="Optional — your coach will keep these in mind."
            >
              <View style={styles.wrap}>
                {RESTRICTIONS.map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    selected={restrictions.includes(r)}
                    onPress={() => toggleRestriction(r)}
                  />
                ))}
              </View>
              <View style={styles.previewCard}>
                <Text style={styles.previewTitle}>Your daily targets</Text>
                <TargetPreview
                  sex={sex}
                  weightKg={parseFloat(weightKg) || 80}
                  heightCm={parseFloat(heightCm) || 178}
                  age={parseInt(age, 10) || 29}
                  activity={activity}
                  goal={goal}
                />
              </View>
            </Step>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <Button label="Back" variant="ghost" onPress={back} style={{ flex: 1 }} />
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <Button
            label={step === totalSteps - 1 ? 'Finish' : 'Continue'}
            onPress={next}
            disabled={!canNext()}
            style={{ flex: 2 }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TargetPreview({
  sex,
  weightKg,
  heightCm,
  age,
  activity,
  goal,
}: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: ActivityLevel;
  goal: Goal;
}) {
  const t = computeTargets(sex, weightKg, heightCm, age, activity, goal);
  return (
    <View style={styles.targetRow}>
      <TargetCell value={`${t.calories}`} label="kcal" color={colors.calories} />
      <TargetCell value={`${t.protein}g`} label="protein" color={colors.protein} />
      <TargetCell value={`${t.carbs}g`} label="carbs" color={colors.carbs} />
      <TargetCell value={`${t.fat}g`} label="fat" color={colors.fat} />
    </View>
  );
}

function TargetCell({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color: string;
}) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={[styles.targetValue, { color }]}>{value}</Text>
      <Text style={styles.targetLabel}>{label}</Text>
    </View>
  );
}

function Step({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={{ gap: spacing.sm }}>{children}</View>
    </View>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

function SelectRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectRow, selected && styles.selectRowActive]}
    >
      <Text style={[styles.selectLabel, selected && { color: colors.primary }]}>
        {label}
      </Text>
      <View style={[styles.radio, selected && styles.radioActive]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  progressWrap: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  progressSeg: { flex: 1, height: 5, borderRadius: 3 },
  content: { padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.lg },
  title: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  subtitle: {
    color: colors.textMuted,
    fontSize: font.body,
    marginTop: 4,
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: font.h3,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  selectRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  selectLabel: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  previewCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  previewTitle: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  targetRow: { flexDirection: 'row' },
  targetValue: { fontSize: font.h3, fontWeight: '800' },
  targetLabel: { color: colors.textDim, fontSize: font.tiny, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
