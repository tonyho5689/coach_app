import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  EmptyState,
  Pill,
  ScreenTitle,
  SectionHeader,
} from '../../src/components/ui';
import { useApp } from '../../src/context/AppContext';
import { analyzeMealImage, hasApiKey, MealAnalysis } from '../../src/llm';
import { mealsForDay, noteForMeal, sumMeals } from '../../src/nutrition';
import { colors, font, radius, spacing } from '../../src/theme';
import { Meal } from '../../src/types';

export default function Meals() {
  const { profile, meals, addMeal, deleteMeal } = useApp();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<(MealAnalysis & { imageUri?: string }) | null>(null);

  const todayTotals = useMemo(() => sumMeals(mealsForDay(meals)), [meals]);

  const capture = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission needed',
        `Please allow ${fromCamera ? 'camera' : 'photo library'} access to log a meal.`,
      );
      return;
    }
    const opts: ImagePicker.ImagePickerOptions = {
      quality: 0.5,
      base64: true,
      allowsEditing: true,
      aspect: [4, 3],
    };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets?.length) return;

    const asset = res.assets[0];
    setResult(null);
    setAnalyzing(true);
    try {
      const analysis = await analyzeMealImage(asset.base64 ?? undefined, profile);
      setResult({ ...analysis, imageUri: asset.uri });
    } finally {
      setAnalyzing(false);
    }
  };

  const saveResult = async () => {
    if (!result || !profile) return;
    const meal: Meal = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      name: result.name,
      imageUri: result.imageUri,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      note: noteForMeal(result, profile),
      source: result.source,
    };
    await addMeal(meal);
    setResult(null);
  };

  const confirmDelete = (id: string) =>
    Alert.alert('Delete meal?', 'This will remove it from your history.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMeal(id) },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenTitle
          title="Meals"
          subtitle={`${todayTotals.calories} kcal today · ${todayTotals.protein}g protein`}
        />

        {/* Capture card */}
        <Card>
          <View style={styles.captureHeader}>
            <Ionicons name="camera" size={20} color={colors.primary} />
            <Text style={styles.captureTitle}>Log a meal</Text>
            <Pill
              label={hasApiKey() ? 'AI vision' : 'Demo mode'}
              color={hasApiKey() ? colors.primary : colors.textMuted}
            />
          </View>
          <Text style={styles.captureHint}>
            Snap or pick a photo and Coach estimates the nutrition.
          </Text>
          <View style={styles.captureButtons}>
            <Button
              label="Photograph"
              icon="camera"
              onPress={() => capture(true)}
              loading={analyzing}
              style={{ flex: 1 }}
            />
            <Button
              label="Library"
              icon="images"
              variant="secondary"
              onPress={() => capture(false)}
              disabled={analyzing}
              style={{ flex: 1 }}
            />
          </View>
          {analyzing ? (
            <Text style={styles.analyzing}>Analyzing your meal…</Text>
          ) : null}
        </Card>

        {/* Result preview */}
        {result ? (
          <Card style={{ borderColor: colors.primary }}>
            <SectionHeader title="Estimated nutrition" />
            {result.imageUri ? (
              <Image source={{ uri: result.imageUri }} style={styles.resultImage} />
            ) : null}
            <Text style={styles.resultName}>{result.name}</Text>
            <View style={styles.macroPills}>
              <MacroChip label="Calories" value={`${result.calories}`} color={colors.calories} />
              <MacroChip label="Protein" value={`${result.protein}g`} color={colors.protein} />
              <MacroChip label="Carbs" value={`${result.carbs}g`} color={colors.carbs} />
              <MacroChip label="Fat" value={`${result.fat}g`} color={colors.fat} />
            </View>
            {profile ? (
              <View style={styles.noteBox}>
                <Ionicons name="bulb" size={15} color={colors.warn} />
                <Text style={styles.noteText}>{noteForMeal(result, profile)}</Text>
              </View>
            ) : null}
            <View style={styles.resultActions}>
              <Button
                label="Discard"
                variant="ghost"
                onPress={() => setResult(null)}
                style={{ flex: 1 }}
              />
              <Button label="Save to log" icon="checkmark" onPress={saveResult} style={{ flex: 2 }} />
            </View>
          </Card>
        ) : null}

        {/* History */}
        <SectionHeader title="Meal history" />
        {meals.length === 0 ? (
          <Card>
            <EmptyState icon="restaurant-outline" text="No meals logged yet. Snap your first one above!" />
          </Card>
        ) : (
          meals.map((m) => (
            <Pressable key={m.id} onLongPress={() => confirmDelete(m.id)}>
              <Card style={styles.mealCard}>
                {m.imageUri ? (
                  <Image source={{ uri: m.imageUri }} style={styles.mealThumb} />
                ) : (
                  <View style={[styles.mealThumb, styles.mealThumbPlaceholder]}>
                    <Ionicons name="restaurant" size={20} color={colors.textDim} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.mealMacros}>
                    P{m.protein} · C{m.carbs} · F{m.fat}
                  </Text>
                  <Text style={styles.mealTime}>{formatWhen(m.timestamp)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.mealCals}>{m.calories}</Text>
                  <Text style={styles.mealCalsUnit}>kcal</Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}
        <Text style={styles.hint}>Tip: long-press a meal to delete it.</Text>
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.macroChip}>
      <Text style={[styles.macroChipValue, { color }]}>{value}</Text>
      <Text style={styles.macroChipLabel}>{label}</Text>
    </View>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  captureHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  captureTitle: { color: colors.text, fontSize: font.h3, fontWeight: '700', flex: 1 },
  captureHint: { color: colors.textMuted, fontSize: font.small, marginVertical: spacing.md },
  captureButtons: { flexDirection: 'row', gap: spacing.md },
  analyzing: { color: colors.primary, fontSize: font.small, marginTop: spacing.md, textAlign: 'center' },
  resultImage: { width: '100%', height: 160, borderRadius: radius.md, marginBottom: spacing.md },
  resultName: { color: colors.text, fontSize: font.h3, fontWeight: '700', marginBottom: spacing.md },
  macroPills: { flexDirection: 'row', gap: spacing.sm },
  macroChip: {
    flex: 1,
    backgroundColor: colors.cardAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  macroChipValue: { fontSize: font.h3, fontWeight: '800' },
  macroChipLabel: { color: colors.textDim, fontSize: font.tiny, marginTop: 2 },
  noteBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.warn + '14',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
  noteText: { color: colors.text, fontSize: font.small, flex: 1, lineHeight: 19 },
  resultActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  mealCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  mealThumb: { width: 52, height: 52, borderRadius: radius.md },
  mealThumbPlaceholder: {
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealName: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  mealMacros: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  mealTime: { color: colors.textDim, fontSize: font.tiny, marginTop: 2 },
  mealCals: { color: colors.primary, fontSize: font.h3, fontWeight: '800' },
  mealCalsUnit: { color: colors.textDim, fontSize: font.tiny },
  hint: { color: colors.textDim, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.sm },
});
