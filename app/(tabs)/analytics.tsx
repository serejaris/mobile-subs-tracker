import React, { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useSubscriptions } from '@/lib/subscriptions-context';
import { getMonthlyAmountInCurrency, getYearlyAmountInCurrency, formatAmount, getDisplayCurrency, CATEGORY_LABELS, type Category } from '@/lib/types';
import Svg, { Circle, G } from 'react-native-svg';

interface CategoryData {
  category: Category;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  count: number;
}

function DonutChart({ data, total, currency }: { data: CategoryData[]; total: number; currency: 'RUB' | 'USD' | 'EUR' }) {
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativePercentage = 0;

  return (
    <View style={styles.chartContainer}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.surface}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <G rotation="-90" origin={`${center}, ${center}`}>
          {data.map((item, index) => {
            const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
            cumulativePercentage += item.percentage;

            return (
              <Circle
                key={item.category}
                cx={center}
                cy={center}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </G>
      </Svg>
      <View style={styles.chartCenter}>
        <Text style={styles.chartTotal}>{formatAmount(Math.round(total), currency)}</Text>
        <Text style={styles.chartLabel}>per month</Text>
      </View>
    </View>
  );
}

function CategoryRow({ item, displayCurrency }: { item: CategoryData; displayCurrency: 'RUB' | 'USD' | 'EUR' }) {
  return (
    <View style={styles.catRow}>
      <View style={[styles.catDot, { backgroundColor: item.color }]} />
      <View style={styles.catInfo}>
        <Text style={styles.catName}>{item.label}</Text>
        <Text style={styles.catCount}>{item.count} {item.count === 1 ? 'subscription' : 'subscriptions'}</Text>
      </View>
      <View style={styles.catRight}>
        <Text style={styles.catAmount}>{formatAmount(Math.round(item.amount), displayCurrency)}</Text>
        <Text style={styles.catPercent}>{item.percentage.toFixed(0)}%</Text>
      </View>
    </View>
  );
}

function InsightCard({ icon, title, description, color }: { icon: string; title: string; description: string; color: string }) {
  return (
    <View style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.insightContent}>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightDesc}>{description}</Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const { subscriptions } = useSubscriptions();
  const activeSubs = useMemo(() => subscriptions.filter(s => s.status === 'active'), [subscriptions]);

  const mainCurrency = useMemo(() => getDisplayCurrency(activeSubs), [activeSubs]);

  const totalMonthly = useMemo(() => {
    return activeSubs.reduce((sum, s) => sum + getMonthlyAmountInCurrency(s.amount, s.billingCycle, s.currency, mainCurrency), 0);
  }, [activeSubs, mainCurrency]);

  const categoryData = useMemo((): CategoryData[] => {
    const map = new Map<Category, { amount: number; count: number }>();
    activeSubs.forEach(s => {
      const monthly = getMonthlyAmountInCurrency(s.amount, s.billingCycle, s.currency, mainCurrency);
      const existing = map.get(s.category) || { amount: 0, count: 0 };
      map.set(s.category, { amount: existing.amount + monthly, count: existing.count + 1 });
    });

    return Array.from(map.entries())
      .map(([category, { amount, count }]) => ({
        category,
        label: CATEGORY_LABELS[category],
        amount,
        percentage: totalMonthly > 0 ? (amount / totalMonthly) * 100 : 0,
        color: Colors.categoryColors[category] || Colors.textMuted,
        count,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [activeSubs, totalMonthly, mainCurrency]);

  const insights = useMemo(() => {
    const result: { icon: string; title: string; description: string; color: string }[] = [];

    if (activeSubs.length === 0) return result;

    const sorted = [...activeSubs].sort((a, b) =>
      getMonthlyAmountInCurrency(b.amount, b.billingCycle, b.currency, mainCurrency) -
      getMonthlyAmountInCurrency(a.amount, a.billingCycle, a.currency, mainCurrency)
    );
    const mostExpensive = sorted[0];
    if (mostExpensive) {
      const monthlyAmount = getMonthlyAmountInCurrency(mostExpensive.amount, mostExpensive.billingCycle, mostExpensive.currency, mainCurrency);
      const pct = totalMonthly > 0 ? ((monthlyAmount / totalMonthly) * 100).toFixed(0) : '0';
      result.push({
        icon: 'trending-up',
        title: `${mostExpensive.name} is your biggest expense`,
        description: `It takes up ${pct}% of your total monthly spending (${formatAmount(Math.round(monthlyAmount), mainCurrency)}/mo)`,
        color: Colors.warning,
      });
    }

    const catCounts = new Map<Category, string[]>();
    activeSubs.forEach(s => {
      const existing = catCounts.get(s.category) || [];
      existing.push(s.name);
      catCounts.set(s.category, existing);
    });
    const duplicateCats = Array.from(catCounts.entries()).filter(([_, names]) => names.length >= 2);
    if (duplicateCats.length > 0) {
      const [cat, names] = duplicateCats[0];
      result.push({
        icon: 'copy',
        title: `${names.length} services in ${CATEGORY_LABELS[cat]}`,
        description: `You have ${names.join(', ')} in the same category. Consider if you need all of them.`,
        color: Colors.info,
      });
    }

    const yearlyTotal = activeSubs.reduce((sum, s) => sum + getYearlyAmountInCurrency(s.amount, s.billingCycle, s.currency, mainCurrency), 0);
    result.push({
      icon: 'calendar',
      title: `${formatAmount(Math.round(yearlyTotal), mainCurrency)} per year`,
      description: 'That\'s your total annual spending on subscriptions. Look for yearly plans that could save you money.',
      color: Colors.success,
    });

    const weeklyEquivalent = totalMonthly / 4.33;
    result.push({
      icon: 'wallet',
      title: `${formatAmount(Math.round(weeklyEquivalent), mainCurrency)} per week`,
      description: 'Your weekly subscription cost. Think of it as a recurring weekly purchase.',
      color: Colors.primary,
    });

    return result;
  }, [activeSubs, totalMonthly, mainCurrency]);

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
        <Text style={styles.title}>Analytics</Text>

        {activeSubs.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="pie-chart-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptyText}>Add active subscriptions to see your spending analytics</Text>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spending by category</Text>
              <View style={styles.chartCard}>
                <DonutChart data={categoryData} total={totalMonthly} currency={mainCurrency} />
                <View style={styles.catList}>
                  {categoryData.map(item => (
                    <CategoryRow key={item.category} item={item} displayCurrency={mainCurrency} />
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Insights</Text>
              {insights.map((insight, i) => (
                <InsightCard key={i} {...insight} />
              ))}
            </View>
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
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    marginBottom: 14,
  },
  chartCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  chartContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  chartTotal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: Colors.text,
  },
  chartLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  catList: {
    width: '100%',
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  catDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  catInfo: {
    flex: 1,
  },
  catName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.text,
  },
  catCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  catRight: {
    alignItems: 'flex-end',
  },
  catAmount: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  catPercent: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    gap: 14,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  insightDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
