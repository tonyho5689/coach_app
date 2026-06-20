import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { useApp } from '../../src/context/AppContext';
import {
  AdvisorContext,
  askAdvisor,
  buildGroundingFacts,
} from '../../src/llm';
import { mealsForDay, sumMeals } from '../../src/nutrition';
import { colors, font, radius, spacing } from '../../src/theme';
import { ChatMessage } from '../../src/types';

const SUGGESTIONS = [
  'What should I eat for dinner?',
  "How's my week going?",
  'Am I hitting my protein target?',
  'What should I train next?',
];

export default function Advisor() {
  const { profile, meals, workouts, weights, chat, appendChat } = useApp();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [showGrounding, setShowGrounding] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  const ctx = useMemo<AdvisorContext | null>(() => {
    if (!profile) return null;
    const todayMeals = mealsForDay(meals);
    return {
      profile,
      todayMeals,
      recentMeals: meals.slice(0, 12),
      recentWorkouts: workouts.slice(0, 8),
      weights,
      todayTotals: sumMeals(todayMeals),
    };
  }, [profile, meals, workouts, weights]);

  const groundingFacts = useMemo(
    () => (ctx ? buildGroundingFacts(ctx) : []),
    [ctx],
  );

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || !ctx || thinking) return;
    setInput('');
    const userMsg: ChatMessage = {
      id: Math.random().toString(36).slice(2, 10),
      role: 'user',
      text: q,
      timestamp: new Date().toISOString(),
    };
    await appendChat(userMsg);
    setThinking(true);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    try {
      const reply = await askAdvisor(q, ctx, chat);
      const botMsg: ChatMessage = {
        id: Math.random().toString(36).slice(2, 10),
        role: 'assistant',
        text: reply,
        timestamp: new Date().toISOString(),
        grounding: groundingFacts,
      };
      await appendChat(botMsg);
    } finally {
      setThinking(false);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    }
  };

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Coach Advisor</Text>
            <Text style={styles.headerSub}>Demo · knows your data</Text>
          </View>
          <Pressable onPress={() => setShowGrounding((s) => !s)} style={styles.groundingToggle}>
            <Ionicons
              name={showGrounding ? 'eye' : 'eye-off'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
        </View>

        {/* Grounding panel — makes the data access visible */}
        {showGrounding ? (
          <View style={styles.groundingPanel}>
            <View style={styles.groundingHeader}>
              <Ionicons name="link" size={13} color={colors.primary} />
              <Text style={styles.groundingTitle}>What Coach can see right now</Text>
            </View>
            <View style={styles.groundingFacts}>
              {groundingFacts.map((f, i) => (
                <View key={i} style={styles.factChip}>
                  <Text style={styles.factText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {chat.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {thinking ? (
            <View style={[styles.bubble, styles.botBubble, styles.thinkingBubble]}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.thinkingText}>Coach is checking your data…</Text>
            </View>
          ) : null}

          {chat.length <= 1 ? (
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestion} onPress={() => send(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach anything…"
            placeholderTextColor={colors.textDim}
            multiline
            onSubmitEditing={() => send(input)}
          />
          <Pressable
            style={[styles.sendBtn, { opacity: input.trim() && !thinking ? 1 : 0.4 }]}
            onPress={() => send(input)}
            disabled={!input.trim() || thinking}
          >
            <Ionicons name="arrow-up" size={20} color="#04231A" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && { justifyContent: 'flex-end' }]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.bubbleText, isUser && { color: '#04231A' }]}>
          {message.text}
        </Text>
        {!isUser && message.grounding?.length ? (
          <View style={styles.bubbleGrounding}>
            <Ionicons name="link" size={11} color={colors.textDim} />
            <Text style={styles.bubbleGroundingText} numberOfLines={1}>
              Grounded in {message.grounding.length} facts from your log
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontSize: font.h3, fontWeight: '800' },
  headerSub: { color: colors.primary, fontSize: font.tiny, fontWeight: '600' },
  groundingToggle: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundingPanel: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groundingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  groundingTitle: { color: colors.primary, fontSize: font.tiny, fontWeight: '800', letterSpacing: 0.5 },
  groundingFacts: { gap: 6 },
  factChip: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: colors.primary,
  },
  factText: { color: colors.textMuted, fontSize: font.tiny },
  messages: { padding: spacing.lg, gap: spacing.md },
  bubbleRow: { flexDirection: 'row' },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, padding: spacing.md },
  userBubble: { backgroundColor: colors.primary, borderTopRightRadius: 4 },
  botBubble: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopLeftRadius: 4,
  },
  bubbleText: { color: colors.text, fontSize: font.body, lineHeight: 21 },
  bubbleGrounding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bubbleGroundingText: { color: colors.textDim, fontSize: font.tiny, flex: 1 },
  thinkingBubble: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thinkingText: { color: colors.textMuted, fontSize: font.small },
  suggestions: { gap: spacing.sm, marginTop: spacing.md },
  suggestion: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignSelf: 'flex-start',
  },
  suggestionText: { color: colors.text, fontSize: font.small, fontWeight: '600' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: font.body,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
