import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscriptions } from '@/lib/subscriptions-context';
import { CATEGORY_LABELS, CYCLE_LABELS, type Category, type BillingCycle, type Currency, type SubscriptionStatus } from '@/lib/types';
import { format, addMonths } from 'date-fns';

const CURRENCIES: { key: Currency; label: string }[] = [
  { key: 'RUB', label: 'RUB \u20BD' },
  { key: 'USD', label: 'USD $' },
  { key: 'EUR', label: 'EUR \u20AC' },
];

const CYCLES: { key: BillingCycle; label: string }[] = [
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'quarterly', label: 'Quarterly' },
];

const CATEGORIES: { key: Category; label: string }[] = Object.entries(CATEGORY_LABELS).map(
  ([key, label]) => ({ key: key as Category, label })
);

export default function AddSubscriptionScreen() {
  const { addSubscription } = useSubscriptions();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<Currency>('RUB');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState<Category>('streaming');
  const [note, setNote] = useState('');
  const [isTrial, setIsTrial] = useState(false);
  const [saving, setSaving] = useState(false);

  const nextBillingDate = format(addMonths(new Date(), 1), 'yyyy-MM-dd');

  const isValid = name.trim().length > 0 && parseFloat(amount) > 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await addSubscription({
      name: name.trim(),
      amount: parseFloat(amount),
      currency,
      billingCycle,
      nextBillingDate,
      category,
      status: 'active',
      note: note.trim(),
      ...(isTrial ? { trialEndDate: format(addMonths(new Date(), 0.5), 'yyyy-MM-dd') } : {}),
    });

    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>New subscription</Text>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Netflix, Spotify..."
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Currency</Text>
            <View style={styles.chipRow}>
              {CURRENCIES.map(c => (
                <Pressable
                  key={c.key}
                  onPress={() => { Haptics.selectionAsync(); setCurrency(c.key); }}
                  style={[styles.chip, currency === c.key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, currency === c.key && styles.chipTextActive]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Billing cycle</Text>
          <View style={styles.chipRow}>
            {CYCLES.map(c => (
              <Pressable
                key={c.key}
                onPress={() => { Haptics.selectionAsync(); setBillingCycle(c.key); }}
                style={[styles.chip, billingCycle === c.key && styles.chipActive]}
              >
                <Text style={[styles.chipText, billingCycle === c.key && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(c => (
              <Pressable
                key={c.key}
                onPress={() => { Haptics.selectionAsync(); setCategory(c.key); }}
                style={[styles.categoryChip, category === c.key && { backgroundColor: Colors.categoryColors[c.key] + '30', borderColor: Colors.categoryColors[c.key] }]}
              >
                <View style={[styles.catColorDot, { backgroundColor: Colors.categoryColors[c.key] }]} />
                <Text style={[styles.categoryChipText, category === c.key && { color: Colors.text }]}>{c.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={() => { Haptics.selectionAsync(); setIsTrial(!isTrial); }}
          style={styles.toggleRow}
        >
          <View style={styles.toggleLeft}>
            <Ionicons name="time-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.toggleLabel}>Trial period</Text>
          </View>
          <View style={[styles.toggle, isTrial && styles.toggleActive]}>
            <View style={[styles.toggleKnob, isTrial && styles.toggleKnobActive]} />
          </View>
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.label}>Note</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional note..."
            placeholderTextColor={Colors.textMuted}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />
        </View>

        <Pressable
          onPress={handleSave}
          disabled={!isValid || saving}
          style={({ pressed }) => [
            styles.saveButton,
            (!isValid || saving) && styles.saveButtonDisabled,
            pressed && isValid && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
        >
          <Ionicons name="checkmark" size={20} color={Colors.white} />
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Add subscription'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  form: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  catColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.textMuted,
  },
  toggleKnobActive: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-end',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    padding: 16,
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.surface,
    opacity: 0.5,
  },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.white,
  },
});
