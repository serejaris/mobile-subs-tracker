import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Subscription, SubscriptionStatus } from './types';

const STORAGE_KEY = 'subtrack_subscriptions';
const ONBOARDING_KEY = 'subtrack_onboarding_done';

interface SubscriptionsContextValue {
  subscriptions: Subscription[];
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt'>) => Promise<void>;
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

const SubscriptionsContext = createContext<SubscriptionsContextValue | null>(null);

export function SubscriptionsProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subsData, onboardingData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);
      if (subsData) {
        setSubscriptions(JSON.parse(subsData));
      }
      setHasCompletedOnboarding(onboardingData === 'true');
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSubscriptions = async (subs: Subscription[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
    } catch (e) {
      console.error('Failed to save:', e);
    }
  };

  const addSubscription = useCallback(async (sub: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSub: Subscription = {
      ...sub,
      id: Crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...subscriptions, newSub];
    setSubscriptions(updated);
    await saveSubscriptions(updated);
  }, [subscriptions]);

  const updateSubscription = useCallback(async (id: string, updates: Partial<Subscription>) => {
    const updated = subscriptions.map(s => s.id === id ? { ...s, ...updates } : s);
    setSubscriptions(updated);
    await saveSubscriptions(updated);
  }, [subscriptions]);

  const deleteSubscription = useCallback(async (id: string) => {
    const updated = subscriptions.filter(s => s.id !== id);
    setSubscriptions(updated);
    await saveSubscriptions(updated);
  }, [subscriptions]);

  const completeOnboarding = useCallback(async () => {
    setHasCompletedOnboarding(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const value = useMemo(() => ({
    subscriptions,
    isLoading,
    hasCompletedOnboarding,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    completeOnboarding,
  }), [subscriptions, isLoading, hasCompletedOnboarding, addSubscription, updateSubscription, deleteSubscription, completeOnboarding]);

  return (
    <SubscriptionsContext.Provider value={value}>
      {children}
    </SubscriptionsContext.Provider>
  );
}

export function useSubscriptions() {
  const context = useContext(SubscriptionsContext);
  if (!context) {
    throw new Error('useSubscriptions must be used within SubscriptionsProvider');
  }
  return context;
}
