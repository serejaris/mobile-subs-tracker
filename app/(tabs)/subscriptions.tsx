import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Text, View, FlatList, Pressable, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useSubscriptions } from '@/lib/subscriptions-context';
import { formatAmount, getMonthlyAmount, getMonthlyAmountInCurrency, getDisplayCurrency, CATEGORY_LABELS, CYCLE_LABELS, STATUS_LABELS, type Subscription, type SubscriptionStatus, type Category } from '@/lib/types';

function SubscriptionCard({ item, onPress }: { item: Subscription; onPress: () => void }) {
  const monthly = getMonthlyAmount(item.amount, item.billingCycle);
  const isActive = item.status === 'active';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
    >
      <View style={[styles.cardDot, { backgroundColor: Colors.categoryColors[item.category] || Colors.textMuted }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardAmount}>{formatAmount(item.amount, item.currency)}</Text>
        </View>
        <View style={styles.cardBottom}>
          <View style={styles.cardTags}>
            <View style={[styles.tag, !isActive && { backgroundColor: Colors.surface }]}>
              <Text style={[styles.tagText, !isActive && { color: Colors.textMuted }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>
            <Text style={styles.cardCategory}>{CATEGORY_LABELS[item.category]}</Text>
            <Text style={styles.cardCycle}>{CYCLE_LABELS[item.billingCycle]}</Text>
          </View>
          <Text style={styles.cardMonthly}>{formatAmount(Math.round(monthly), item.currency)}/mo</Text>
        </View>
      </View>
    </Pressable>
  );
}

const STATUS_FILTERS: { key: SubscriptionStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'expired', label: 'Expired' },
];

const CATEGORIES: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  ...Object.entries(CATEGORY_LABELS).map(([key, label]) => ({ key: key as Category, label })),
];

export default function SubscriptionsScreen() {
  const insets = useSafeAreaInsets();
  const { subscriptions } = useSubscriptions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');

  const displayCurrency = useMemo(() => getDisplayCurrency(subscriptions), [subscriptions]);

  const filtered = useMemo(() => {
    return subscriptions.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && s.category !== categoryFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) =>
      getMonthlyAmountInCurrency(b.amount, b.billingCycle, b.currency, displayCurrency) -
      getMonthlyAmountInCurrency(a.amount, a.billingCycle, a.currency, displayCurrency)
    );
  }, [subscriptions, statusFilter, categoryFilter, search, displayCurrency]);

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const renderItem = useCallback(({ item }: { item: Subscription }) => (
    <SubscriptionCard
      item={item}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/edit-subscription', params: { id: item.id } });
      }}
    />
  ), []);

  const ListHeader = useMemo(() => (
    <View>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 16 }]}>
        <Text style={styles.title}>Subscriptions</Text>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/add-subscription');
          }}
          style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="add" size={24} color={Colors.white} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search subscriptions..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={STATUS_FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.filterRow}
        scrollEnabled={false}
        renderItem={({ item: f }) => (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setStatusFilter(f.key);
            }}
            style={[styles.filterChip, statusFilter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, statusFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        )}
      />

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item: f }) => (
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setCategoryFilter(f.key);
            }}
            style={[styles.filterChip, categoryFilter === f.key && styles.filterChipActive]}
          >
            {f.key !== 'all' && (
              <View style={[styles.filterDot, { backgroundColor: Colors.categoryColors[f.key] || Colors.textMuted }]} />
            )}
            <Text style={[styles.filterChipText, categoryFilter === f.key && styles.filterChipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        )}
      />
    </View>
  ), [insets.top, search, statusFilter, categoryFilter, webTopInset]);

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === 'web' ? 34 + 84 : 100 },
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No subscriptions found</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: Colors.text,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.text,
    padding: 0,
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  filterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  list: {
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardDot: {
    width: 4,
    borderRadius: 2,
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  cardAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: Colors.primary,
  },
  cardCategory: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardCycle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.textMuted,
  },
  cardMonthly: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.textSecondary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.textMuted,
  },
});
