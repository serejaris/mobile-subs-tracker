import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { formatAmount, getDisplayCurrency, getMonthlyAmountInCurrency, type Subscription, type Currency } from '@/lib/types';
import { useSubscriptions } from '@/lib/subscriptions-context';
import { apiRequest } from '@/lib/query-client';

type CoachState = 'loading' | 'success' | 'empty' | 'error' | 'stale';
type Confidence = 'Высокая' | 'Средняя';
type Impact = 'low' | 'medium' | 'high' | 'risk';

interface CoachInsight {
  id: string;
  title: string;
  reason: string;
  savings: number;
  confidence: Confidence;
  impact: Impact;
}

const STALE_TTL_HOURS = 12;
const REQUIRED_SUBSCRIPTIONS = 3;
const HOURS_IN_MS = 60 * 60 * 1000;

const IMPACT_COLOR_MAP: Record<Impact, string> = {
  low: Colors.info,
  medium: Colors.warning,
  high: Colors.success,
  risk: Colors.danger,
};

function getHoursAgo(date: Date): number {
  return Math.max(1, Math.floor((Date.now() - date.getTime()) / HOURS_IN_MS));
}

function isStale(date: Date): boolean {
  return Date.now() - date.getTime() > STALE_TTL_HOURS * HOURS_IN_MS;
}

function getInsightSavingsText(amount: number, currency: Currency): string {
  return `до ${formatAmount(Math.max(1, Math.round(amount)), currency)}/мес`;
}

function getSummaryText(insights: CoachInsight[], currency: Currency): string {
  const maxSavings = insights.reduce((max, item) => Math.max(max, item.savings), 0);
  return `Потенциал экономии ${getInsightSavingsText(maxSavings, currency)}`;
}

function getDaysUntilBilling(nextBillingDate: string): number {
  const now = new Date();
  const nextDate = new Date(nextBillingDate);
  if (Number.isNaN(nextDate.getTime())) return Number.POSITIVE_INFINITY;

  const diffMs = nextDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000));
}

function generateInsights(activeSubs: Subscription[], currency: Currency): CoachInsight[] {
  if (activeSubs.length === 0) return [];

  const monthlyValues = activeSubs.map((subscription) => ({
    subscription,
    monthly: getMonthlyAmountInCurrency(
      subscription.amount,
      subscription.billingCycle,
      subscription.currency,
      currency,
    ),
  }));

  const totalMonthly = monthlyValues.reduce((sum, item) => sum + item.monthly, 0);
  const sortedByCost = [...monthlyValues].sort((a, b) => b.monthly - a.monthly);

  const insights: CoachInsight[] = [];

  const byCategory = new Map<string, typeof monthlyValues>();
  monthlyValues.forEach((item) => {
    const existing = byCategory.get(item.subscription.category) ?? [];
    existing.push(item);
    byCategory.set(item.subscription.category, existing);
  });

  const duplicateCategory = Array.from(byCategory.values()).find((items) => items.length >= 2);
  if (duplicateCategory) {
    const sortedDuplicates = [...duplicateCategory].sort((a, b) => a.monthly - b.monthly);
    const potential = sortedDuplicates[0].monthly;
    insights.push({
      id: 'duplicates',
      title: 'Проверьте дублирующиеся сервисы',
      reason: 'В одной категории у вас несколько подписок. Возможно, часть функций пересекается.',
      savings: potential,
      confidence: 'Высокая',
      impact: 'high',
    });
  }

  const expensive = sortedByCost[0];
  if (expensive) {
    const share = totalMonthly > 0 ? (expensive.monthly / totalMonthly) * 100 : 0;
    const potential = expensive.monthly * 0.35;
    insights.push({
      id: 'expensive',
      title: `Проверьте ценность ${expensive.subscription.name}`,
      reason: `${expensive.subscription.name} занимает около ${Math.round(share)}% ежемесячных расходов. Возможно, есть более выгодный тариф.`,
      savings: potential,
      confidence: share >= 30 ? 'Высокая' : 'Средняя',
      impact: share >= 30 ? 'high' : 'medium',
    });
  }

  const soonestCharge = sortedByCost.find((item) => getDaysUntilBilling(item.subscription.nextBillingDate) <= 7);
  if (soonestCharge) {
    const daysLeft = Math.max(0, getDaysUntilBilling(soonestCharge.subscription.nextBillingDate));
    insights.push({
      id: 'upcoming-charge',
      title: 'Ближайшее списание уже скоро',
      reason: `${soonestCharge.subscription.name} спишется примерно через ${daysLeft} дн. Если сервис не нужен, возможно, стоит пересмотреть его заранее.`,
      savings: soonestCharge.monthly,
      confidence: 'Средняя',
      impact: 'risk',
    });
  }

  const yearlySubscriptions = monthlyValues.filter((item) => item.subscription.billingCycle === 'yearly');
  if (yearlySubscriptions.length > 0) {
    const avgYearly = yearlySubscriptions.reduce((sum, item) => sum + item.monthly, 0) / yearlySubscriptions.length;
    insights.push({
      id: 'yearly-plan-check',
      title: 'Сверьте годовые и помесячные тарифы',
      reason: 'По части сервисов тарифы и условия меняются. Возможно, переход между циклами даст дополнительную экономию.',
      savings: avgYearly * 0.2,
      confidence: 'Средняя',
      impact: 'low',
    });
  }

  if (insights.length < 3) {
    const fallbackPotential = totalMonthly * 0.12;
    insights.push({
      id: 'fallback-review',
      title: 'Пересмотрите редко используемые подписки',
      reason: 'Даже небольшая оптимизация нескольких сервисов, скорее всего, снизит ваш ежемесячный расход.',
      savings: fallbackPotential,
      confidence: 'Средняя',
      impact: 'medium',
    });
  }

  return insights
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 5);
}

function LoadingCard() {
  return (
    <View style={styles.loadingCard}>
      <View style={styles.loadingTopRow}>
        <View style={styles.loadingPill} />
        <View style={[styles.loadingPill, styles.loadingPillSmall]} />
      </View>
      <View style={styles.loadingLine} />
      <View style={[styles.loadingLine, styles.loadingLineShort]} />
    </View>
  );
}

function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const isHigh = confidence === 'Высокая';

  return (
    <View style={[styles.confidenceBadge, isHigh ? styles.confidenceHigh : styles.confidenceMedium]}>
      <Text style={[styles.confidenceText, isHigh ? styles.confidenceHighText : styles.confidenceMediumText]}>
        {confidence}
      </Text>
    </View>
  );
}

function InsightCard({ insight, currency }: { insight: CoachInsight; currency: Currency }) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightHeader}>
        <ConfidenceBadge confidence={insight.confidence} />
        <Text style={styles.insightSavings}>{getInsightSavingsText(insight.savings, currency)}</Text>
      </View>
      <View style={styles.insightBody}>
        <View style={[styles.impactDot, { backgroundColor: IMPACT_COLOR_MAP[insight.impact] }]} />
        <View style={styles.insightTextWrap}>
          <Text style={styles.insightTitle}>{insight.title}</Text>
          <Text style={styles.insightReason}>{insight.reason}</Text>
        </View>
      </View>
    </View>
  );
}

function EmptyBlock() {
  return (
    <View style={styles.stateCard}>
      <Ionicons name="analytics-outline" size={28} color={Colors.textMuted} />
      <Text style={styles.stateTitle}>Недостаточно данных</Text>
      <Text style={styles.stateText}>Добавьте больше подписок/платежей.</Text>
    </View>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.stateCard}>
      <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
      <Text style={styles.stateTitle}>Не удалось получить советы</Text>
      <Text style={styles.stateText}>Попробовать снова.</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}>
        <Text style={styles.retryButtonText}>Повторить</Text>
      </Pressable>
    </View>
  );
}

const VALID_STATES: CoachState[] = ['loading', 'success', 'empty', 'error', 'stale'];

interface AiCoachResponse {
  insights?: CoachInsight[];
  summary?: string;
  model?: string;
  generatedAt?: string;
}

function parseForcedState(state?: string | string[]): CoachState | null {
  const value = Array.isArray(state) ? state[0] : state;
  if (!value) return null;
  return VALID_STATES.includes(value as CoachState) ? (value as CoachState) : null;
}

export default function AiCoachScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ state?: string | string[] }>();
  const { subscriptions } = useSubscriptions();

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [insights, setInsights] = useState<CoachInsight[]>([]);
  const [summary, setSummary] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>(() => new Date(Date.now() - 5 * HOURS_IN_MS));

  const activeSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.status === 'active'),
    [subscriptions],
  );

  const currency = useMemo(() => getDisplayCurrency(activeSubscriptions), [activeSubscriptions]);
  const fallbackInsights = useMemo(
    () => generateInsights(activeSubscriptions, currency),
    [activeSubscriptions, currency],
  );

  const forcedState = parseForcedState(params.state);

  const fetchInsights = useCallback(async () => {
    if (forcedState) {
      setIsLoading(false);
      return;
    }

    if (activeSubscriptions.length < REQUIRED_SUBSCRIPTIONS) {
      setIsLoading(false);
      setHasError(false);
      setInsights([]);
      setSummary('');
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('POST', '/api/ai-coach/insights', {
        subscriptions: activeSubscriptions,
      });

      const payload = (await response.json()) as AiCoachResponse;
      const nextInsights = Array.isArray(payload.insights) ? payload.insights : [];

      setInsights(nextInsights);
      setSummary(typeof payload.summary === 'string' ? payload.summary.trim() : '');
      setHasError(false);

      if (payload.generatedAt) {
        const parsedGeneratedAt = new Date(payload.generatedAt);
        if (!Number.isNaN(parsedGeneratedAt.getTime())) {
          setLastUpdatedAt(parsedGeneratedAt);
        } else {
          setLastUpdatedAt(new Date());
        }
      } else {
        setLastUpdatedAt(new Date());
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [activeSubscriptions, forcedState]);

  useEffect(() => {
    void fetchInsights();
  }, [fetchInsights]);

  const resolvedState: CoachState = useMemo(() => {
    if (forcedState) return forcedState;
    if (isLoading) return 'loading';
    if (activeSubscriptions.length < REQUIRED_SUBSCRIPTIONS) return 'empty';
    if (hasError && insights.length === 0) return 'error';
    if (hasError && insights.length > 0) return 'stale';
    if (insights.length === 0) return 'empty';
    if (isStale(lastUpdatedAt)) return 'stale';
    return 'success';
  }, [activeSubscriptions.length, forcedState, hasError, insights.length, isLoading, lastUpdatedAt]);

  const handleRetry = () => {
    void fetchInsights();
  };

  const handleRefresh = () => {
    void fetchInsights();
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const showInsights = resolvedState === 'success' || resolvedState === 'stale';

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + webTopInset + 16,
            paddingBottom: Platform.OS === 'web' ? 34 + 84 : Math.max(insets.bottom + 96, 100),
          },
        ]}
      >
        <View style={styles.headerWrap}>
          <Text style={styles.title}>AI Coach</Text>
          <Text style={styles.subtitle}>Советы на основе ваших подписок</Text>
        </View>

        {resolvedState === 'loading' ? (
          <>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryOverline}>Анализ</Text>
              <Text style={styles.summaryTitle}>Анализируем траты…</Text>
              <View style={styles.loadingIndicatorRow}>
                <ActivityIndicator color={Colors.white} size="small" />
                <Text style={styles.loadingText}>Готовим персональные советы</Text>
              </View>
            </LinearGradient>

            <View style={styles.list}>
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </View>
          </>
        ) : null}

        {resolvedState === 'empty' ? <EmptyBlock /> : null}
        {resolvedState === 'error' ? <ErrorBlock onRetry={handleRetry} /> : null}

        {showInsights ? (
          <>
            {resolvedState === 'stale' ? (
              <View style={styles.staleBanner}>
                <View>
                  <Text style={styles.staleTitle}>Советы обновлены {getHoursAgo(lastUpdatedAt)} часов назад</Text>
                  <Text style={styles.staleText}>Данные могут быть неактуальны</Text>
                </View>
                <Pressable onPress={handleRefresh} style={({ pressed }) => [styles.refreshButton, pressed && styles.refreshButtonPressed]}>
                  <Text style={styles.refreshButtonText}>Обновить</Text>
                </Pressable>
              </View>
            ) : null}

            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.summaryCard}
            >
              <Text style={styles.summaryOverline}>Главный инсайт</Text>
              <Text style={styles.summaryTitle}>{summary || getSummaryText(insights.length > 0 ? insights : fallbackInsights, currency)}</Text>
            </LinearGradient>

            <View style={styles.list}>
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} currency={currency} />
              ))}
            </View>

            <Text style={styles.footerNote}>Советы информационные, финальное решение за вами.</Text>
          </>
        ) : null}
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
    gap: 16,
  },
  headerWrap: {
    gap: 4,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    gap: 8,
  },
  summaryOverline: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.white,
    opacity: 0.8,
  },
  summaryTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: Colors.white,
    lineHeight: 28,
  },
  loadingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  loadingText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.white,
    opacity: 0.9,
  },
  list: {
    gap: 12,
  },
  loadingCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  loadingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  loadingPill: {
    width: 94,
    height: 20,
    borderRadius: 20,
    backgroundColor: Colors.surface,
  },
  loadingPillSmall: {
    width: 70,
  },
  loadingLine: {
    height: 12,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  loadingLineShort: {
    width: '76%',
  },
  staleBanner: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  staleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.text,
  },
  staleText: {
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(13,148,136,0.15)',
  },
  refreshButtonPressed: {
    opacity: 0.82,
  },
  refreshButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  stateCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 220,
  },
  stateTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  stateText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 6,
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.white,
  },
  insightCard: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confidenceHigh: {
    backgroundColor: 'rgba(34,197,94,0.15)',
  },
  confidenceMedium: {
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  confidenceText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  confidenceHighText: {
    color: Colors.success,
  },
  confidenceMediumText: {
    color: Colors.warning,
  },
  insightSavings: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
  },
  insightBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  impactDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  insightTextWrap: {
    flex: 1,
    gap: 4,
  },
  insightTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
  },
  insightReason: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  footerNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
});
