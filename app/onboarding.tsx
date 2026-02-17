import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscriptions } from '@/lib/subscriptions-context';
import { CATEGORY_LABELS, type Category, type BillingCycle, type Currency, formatAmount, getMonthlyAmount } from '@/lib/types';
import { format, addMonths } from 'date-fns';

interface QuickSub {
  name: string;
  amount: string;
  currency: Currency;
  billingCycle: BillingCycle;
  category: Category;
}

const POPULAR_SUBS: { name: string; amount: number; currency: Currency; cycle: BillingCycle; category: Category }[] = [
  { name: 'Netflix', amount: 999, currency: 'RUB', cycle: 'monthly', category: 'streaming' },
  { name: 'Spotify', amount: 199, currency: 'RUB', cycle: 'monthly', category: 'music' },
  { name: 'YouTube Premium', amount: 399, currency: 'RUB', cycle: 'monthly', category: 'streaming' },
  { name: 'iCloud+', amount: 99, currency: 'RUB', cycle: 'monthly', category: 'cloud' },
  { name: 'Yandex Plus', amount: 399, currency: 'RUB', cycle: 'monthly', category: 'streaming' },
  { name: 'ChatGPT Plus', amount: 20, currency: 'USD', cycle: 'monthly', category: 'productivity' },
  { name: 'Notion', amount: 10, currency: 'USD', cycle: 'monthly', category: 'productivity' },
  { name: 'Telegram Premium', amount: 299, currency: 'RUB', cycle: 'monthly', category: 'social' },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { addSubscription, completeOnboarding } = useSubscriptions();
  const [step, setStep] = useState(0);
  const [selectedSubs, setSelectedSubs] = useState<Set<number>>(new Set());
  const [customSubs, setCustomSubs] = useState<QuickSub[]>([]);
  const [saving, setSaving] = useState(false);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const togglePopularSub = (index: number) => {
    Haptics.selectionAsync();
    const next = new Set(selectedSubs);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedSubs(next);
  };

  const totalSelected = selectedSubs.size + customSubs.length;

  const totalMonthly = () => {
    let total = 0;
    selectedSubs.forEach(i => {
      const s = POPULAR_SUBS[i];
      total += getMonthlyAmount(s.amount, s.cycle);
    });
    return total;
  };

  const handleFinish = async () => {
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const promises: Promise<void>[] = [];

    selectedSubs.forEach(i => {
      const s = POPULAR_SUBS[i];
      promises.push(
        addSubscription({
          name: s.name,
          amount: s.amount,
          currency: s.currency,
          billingCycle: s.cycle,
          nextBillingDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
          category: s.category,
          status: 'active',
          note: '',
        })
      );
    });

    await Promise.all(promises);
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  if (step === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.welcomeContent}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryDark]}
            style={styles.welcomeIcon}
          >
            <Ionicons name="layers" size={48} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.welcomeTitle}>Welcome to SubTrack</Text>
          <Text style={styles.welcomeSubtitle}>
            Track all your subscriptions in one place. See where your money goes and find savings.
          </Text>
          <View style={styles.featureList}>
            {[
              { icon: 'bar-chart', text: 'Spending analytics by category' },
              { icon: 'notifications', text: 'Charge reminders' },
              { icon: 'bulb', text: 'Smart insights to save money' },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon as any} size={20} color={Colors.primary} />
                </View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={[styles.bottomActions, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setStep(1); }}
            style={({ pressed }) => [styles.primaryButton, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
            <Ionicons name="arrow-forward" size={20} color={Colors.white} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => setStep(0)}>
          <Ionicons name="arrow-back" size={24} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerTitle}>Add subscriptions</Text>
        <Pressable onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Text style={styles.stepSubtitle}>Select the services you use</Text>

      <ScrollView style={styles.subsList} contentContainerStyle={styles.subsListContent} showsVerticalScrollIndicator={false}>
        {POPULAR_SUBS.map((sub, i) => {
          const isSelected = selectedSubs.has(i);
          return (
            <Pressable
              key={i}
              onPress={() => togglePopularSub(i)}
              style={[styles.subOption, isSelected && styles.subOptionSelected]}
            >
              <View style={[styles.subDot, { backgroundColor: Colors.categoryColors[sub.category] }]} />
              <View style={styles.subInfo}>
                <Text style={styles.subName}>{sub.name}</Text>
                <Text style={styles.subMeta}>{CATEGORY_LABELS[sub.category]}</Text>
              </View>
              <Text style={styles.subPrice}>{formatAmount(sub.amount, sub.currency)}/mo</Text>
              <View style={[styles.checkCircle, isSelected && styles.checkCircleActive]}>
                {isSelected && <Ionicons name="checkmark" size={16} color={Colors.white} />}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {totalSelected > 0 && (
        <View style={styles.selectionBanner}>
          <Text style={styles.selectionText}>
            {totalSelected} selected
          </Text>
          <Text style={styles.selectionAmount}>
            ~{formatAmount(Math.round(totalMonthly()), 'RUB')}/mo
          </Text>
        </View>
      )}

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 16) }]}>
        <Pressable
          onPress={handleFinish}
          disabled={saving}
          style={({ pressed }) => [
            styles.primaryButton,
            totalSelected === 0 && { backgroundColor: Colors.surface },
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Setting up...' : totalSelected > 0 ? 'Continue' : 'Start empty'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcomeIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 30,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  featureList: {
    width: '100%',
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
  },
  primaryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  skipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.textSecondary,
  },
  stepSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  subsList: {
    flex: 1,
  },
  subsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  subOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  subDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  subInfo: {
    flex: 1,
  },
  subName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  subMeta: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subPrice: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 12,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkCircleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 14,
  },
  selectionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  selectionAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.primary,
  },
});
