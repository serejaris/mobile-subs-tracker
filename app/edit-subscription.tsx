import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscriptions } from '@/lib/subscriptions-context';
import { CATEGORY_LABELS, CYCLE_LABELS, STATUS_LABELS, type Category, type BillingCycle, type Currency, type SubscriptionStatus } from '@/lib/types';

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

const STATUSES: { key: SubscriptionStatus; label: string; color: string }[] = [
  { key: 'active', label: 'Active', color: Colors.success },
  { key: 'paused', label: 'Paused', color: Colors.warning },
  { key: 'expired', label: 'Expired', color: Colors.danger },
];

const CATEGORIES: { key: Category; label: string }[] = Object.entries(CATEGORY_LABELS).map(
  ([key, label]) => ({ key: key as Category, label })
);

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { subscriptions, updateSubscription, deleteSubscription } = useSubscriptions();

  const sub = useMemo(() => subscriptions.find(s => s.id === id), [subscriptions, id]);

  const [name, setName] = useState(sub?.name || '');
  const [amount, setAmount] = useState(sub?.amount?.toString() || '');
  const [currency, setCurrency] = useState<Currency>(sub?.currency || 'RUB');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(sub?.billingCycle || 'monthly');
  const [category, setCategory] = useState<Category>(sub?.category || 'streaming');
  const [status, setStatus] = useState<SubscriptionStatus>(sub?.status || 'active');
  const [note, setNote] = useState(sub?.note || '');
  const [saving, setSaving] = useState(false);

  if (!sub) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Subscription not found</Text>
        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backLinkText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const isValid = name.trim().length > 0 && parseFloat(amount) > 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    await updateSubscription(id, {
      name: name.trim(),
      amount: parseFloat(amount),
      currency,
      billingCycle,
      category,
      status,
      note: note.trim(),
    });

    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete subscription',
      `Are you sure you want to delete "${sub.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteSubscription(id);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit subscription</Text>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={Colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
        <View style={styles.field}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textMuted}
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
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipRow}>
            {STATUSES.map(s => (
              <Pressable
                key={s.key}
                onPress={() => { Haptics.selectionAsync(); setStatus(s.key); }}
                style={[styles.chip, status === s.key && { backgroundColor: s.color + '20', borderColor: s.color }]}
              >
                <Text style={[styles.chipText, status === s.key && { color: s.color }]}>{s.label}</Text>
              </Pressable>
            ))}
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
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
        </Pressable>

        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.danger} />
          <Text style={styles.deleteButtonText}>Delete subscription</Text>
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.danger + '40',
  },
  deleteButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.danger,
  },
  errorText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.textMuted,
  },
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.primary,
  },
});
