import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useSubscriptions } from '@/lib/subscriptions-context';
import { formatAmount, CATEGORY_LABELS, type Subscription } from '@/lib/types';
import { differenceInDays, parseISO, format } from 'date-fns';

function ReminderCard({ sub, daysUntil, type }: { sub: Subscription; daysUntil: number; type: 'charge' | 'trial' }) {
  const isUrgent = daysUntil <= 2;
  const isTrial = type === 'trial';

  return (
    <View style={[styles.reminderCard, isUrgent && styles.urgentCard]}>
      <View style={[styles.iconContainer, { backgroundColor: isTrial ? Colors.warning + '20' : Colors.primary + '20' }]}>
        <Ionicons
          name={isTrial ? 'time' : 'card'}
          size={22}
          color={isTrial ? Colors.warning : Colors.primary}
        />
      </View>
      <View style={styles.reminderContent}>
        <View style={styles.reminderTop}>
          <Text style={styles.reminderName}>{sub.name}</Text>
          {isTrial && (
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>Trial</Text>
            </View>
          )}
        </View>
        <Text style={styles.reminderCategory}>{CATEGORY_LABELS[sub.category]}</Text>
        <View style={styles.reminderBottom}>
          <Text style={[styles.reminderDays, isUrgent && { color: Colors.danger }]}>
            {daysUntil === 0
              ? 'Today'
              : daysUntil === 1
              ? 'Tomorrow'
              : `In ${daysUntil} days`}
          </Text>
          <Text style={styles.reminderAmount}>{formatAmount(sub.amount, sub.currency)}</Text>
        </View>
        <Text style={styles.reminderDate}>
          {format(parseISO(isTrial ? sub.trialEndDate! : sub.nextBillingDate), 'MMM d, yyyy')}
        </Text>
      </View>
    </View>
  );
}

export default function RemindersScreen() {
  const insets = useSafeAreaInsets();
  const { subscriptions } = useSubscriptions();

  const reminders = useMemo(() => {
    const now = new Date();
    const items: { sub: Subscription; daysUntil: number; type: 'charge' | 'trial' }[] = [];

    subscriptions
      .filter(s => s.status === 'active')
      .forEach(s => {
        const chargeDate = parseISO(s.nextBillingDate);
        const chargeDays = differenceInDays(chargeDate, now);
        if (chargeDays >= 0 && chargeDays <= 30) {
          items.push({ sub: s, daysUntil: chargeDays, type: 'charge' });
        }

        if (s.trialEndDate) {
          const trialDate = parseISO(s.trialEndDate);
          const trialDays = differenceInDays(trialDate, now);
          if (trialDays >= 0 && trialDays <= 14) {
            items.push({ sub: s, daysUntil: trialDays, type: 'trial' });
          }
        }
      });

    return items.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [subscriptions]);

  const urgentReminders = useMemo(() => reminders.filter(r => r.daysUntil <= 3), [reminders]);
  const upcomingReminders = useMemo(() => reminders.filter(r => r.daysUntil > 3 && r.daysUntil <= 7), [reminders]);
  const laterReminders = useMemo(() => reminders.filter(r => r.daysUntil > 7), [reminders]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + webTopInset + 16,
            paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Reminders</Text>

        {reminders.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No upcoming reminders</Text>
            <Text style={styles.emptyText}>Your upcoming charges and trial endings will appear here</Text>
          </View>
        ) : (
          <>
            {urgentReminders.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.danger }]} />
                  <Text style={styles.sectionTitle}>Coming up soon</Text>
                </View>
                {urgentReminders.map((r, i) => (
                  <ReminderCard key={`${r.sub.id}-${r.type}-${i}`} {...r} />
                ))}
              </View>
            )}

            {upcomingReminders.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.warning }]} />
                  <Text style={styles.sectionTitle}>This week</Text>
                </View>
                {upcomingReminders.map((r, i) => (
                  <ReminderCard key={`${r.sub.id}-${r.type}-${i}`} {...r} />
                ))}
              </View>
            )}

            {laterReminders.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionDot, { backgroundColor: Colors.textMuted }]} />
                  <Text style={styles.sectionTitle}>Later</Text>
                </View>
                {laterReminders.map((r, i) => (
                  <ReminderCard key={`${r.sub.id}-${r.type}-${i}`} {...r} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
    marginBottom: 24,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  reminderCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  urgentCard: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.danger,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  reminderName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  trialBadge: {
    backgroundColor: Colors.warning + '30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  trialBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.warning,
  },
  reminderCategory: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  reminderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reminderDays: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
  },
  reminderAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  reminderDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
