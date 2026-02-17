import React, { useMemo, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscriptions } from '@/lib/subscriptions-context';
import { getMonthlyAmount, getYearlyAmount, formatAmount, CATEGORY_LABELS, CURRENCY_SYMBOLS, type Category, type Subscription } from '@/lib/types';
import { format, differenceInDays, parseISO } from 'date-fns';

function StatCard({ title, value, subtitle, icon, color }: { title: string; value: string; subtitle?: string; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon as any} size={18} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle ? <Text style={styles.statSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function UpcomingItem({ sub }: { sub: Subscription }) {
  const daysUntil = differenceInDays(parseISO(sub.nextBillingDate), new Date());
  const isUrgent = daysUntil <= 3;

  return (
    <View style={styles.upcomingItem}>
      <View style={[styles.categoryDot, { backgroundColor: Colors.categoryColors[sub.category] || Colors.textMuted }]} />
      <View style={styles.upcomingInfo}>
        <Text style={styles.upcomingName}>{sub.name}</Text>
        <Text style={styles.upcomingDate}>
          {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil} days`}
        </Text>
      </View>
      <Text style={[styles.upcomingAmount, isUrgent && { color: Colors.warning }]}>
        {formatAmount(sub.amount, sub.currency)}
      </Text>
    </View>
  );
}

function TopSubscriptionItem({ sub, rank }: { sub: Subscription; rank: number }) {
  const monthly = getMonthlyAmount(sub.amount, sub.billingCycle);
  return (
    <View style={styles.topItem}>
      <Text style={styles.topRank}>{rank}</Text>
      <View style={[styles.categoryDot, { backgroundColor: Colors.categoryColors[sub.category] || Colors.textMuted }]} />
      <View style={styles.topInfo}>
        <Text style={styles.topName}>{sub.name}</Text>
        <Text style={styles.topCategory}>{CATEGORY_LABELS[sub.category]}</Text>
      </View>
      <Text style={styles.topAmount}>{formatAmount(monthly, sub.currency)}/mo</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { subscriptions, isLoading, hasCompletedOnboarding } = useSubscriptions();

  useEffect(() => {
    if (!isLoading && !hasCompletedOnboarding) {
      router.replace('/onboarding');
    }
  }, [isLoading, hasCompletedOnboarding]);

  const activeSubs = useMemo(() => subscriptions.filter(s => s.status === 'active'), [subscriptions]);

  const totalMonthly = useMemo(() => {
    return activeSubs.reduce((sum, s) => sum + getMonthlyAmount(s.amount, s.billingCycle), 0);
  }, [activeSubs]);

  const totalYearly = useMemo(() => {
    return activeSubs.reduce((sum, s) => sum + getYearlyAmount(s.amount, s.billingCycle), 0);
  }, [activeSubs]);

  const mainCurrency = useMemo(() => {
    if (activeSubs.length === 0) return 'RUB' as const;
    const counts: Record<string, number> = {};
    activeSubs.forEach(s => { counts[s.currency] = (counts[s.currency] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as 'RUB' | 'USD' | 'EUR';
  }, [activeSubs]);

  const upcomingSubs = useMemo(() => {
    return activeSubs
      .filter(s => {
        const days = differenceInDays(parseISO(s.nextBillingDate), new Date());
        return days >= 0 && days <= 14;
      })
      .sort((a, b) => parseISO(a.nextBillingDate).getTime() - parseISO(b.nextBillingDate).getTime())
      .slice(0, 5);
  }, [activeSubs]);

  const topSubs = useMemo(() => {
    return [...activeSubs]
      .sort((a, b) => getMonthlyAmount(b.amount, b.billingCycle) - getMonthlyAmount(a.amount, a.billingCycle))
      .slice(0, 5);
  }, [activeSubs]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

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
        <View style={styles.header}>
          <Text style={styles.greeting}>SubTrack</Text>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/add-subscription');
            }}
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="add" size={24} color={Colors.white} />
          </Pressable>
        </View>

        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroLabel}>Monthly spending</Text>
          <Text style={styles.heroAmount}>{formatAmount(Math.round(totalMonthly), mainCurrency)}</Text>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Yearly</Text>
              <Text style={styles.heroStatValue}>{formatAmount(Math.round(totalYearly), mainCurrency)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>Active</Text>
              <Text style={styles.heroStatValue}>{activeSubs.length}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsRow}>
          <StatCard
            title="Subscriptions"
            value={String(subscriptions.length)}
            subtitle={`${activeSubs.length} active`}
            icon="layers"
            color={Colors.info}
          />
          <StatCard
            title="Daily cost"
            value={formatAmount(Math.round(totalMonthly / 30), mainCurrency)}
            icon="today"
            color={Colors.accent}
          />
        </View>

        {upcomingSubs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming charges</Text>
            <View style={styles.sectionCard}>
              {upcomingSubs.map((sub) => (
                <UpcomingItem key={sub.id} sub={sub} />
              ))}
            </View>
          </View>
        )}

        {topSubs.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Most expensive</Text>
            <View style={styles.sectionCard}>
              {topSubs.map((sub, i) => (
                <TopSubscriptionItem key={sub.id} sub={sub} rank={i + 1} />
              ))}
            </View>
          </View>
        )}

        {subscriptions.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No subscriptions yet</Text>
            <Text style={styles.emptyText}>Add your first subscription to start tracking your spending</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/add-subscription');
              }}
              style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.8 }]}
            >
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.emptyButtonText}>Add subscription</Text>
            </Pressable>
          </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  heroLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  heroAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 40,
    color: Colors.white,
    marginBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: {
    flex: 1,
  },
  heroStatLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 2,
  },
  heroStatValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.white,
  },
  heroDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  statTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.text,
  },
  statSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    overflow: 'hidden',
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  categoryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text,
  },
  upcomingDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  upcomingAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.text,
  },
  topItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topRank: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.textMuted,
    width: 20,
  },
  topInfo: {
    flex: 1,
  },
  topName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.text,
  },
  topCategory: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  topAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.accent,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: Colors.white,
  },
});
