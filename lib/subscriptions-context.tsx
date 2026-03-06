import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createSubscription, deleteSubscription as deleteSubscriptionFromCloud, importSubscriptions, listSubscriptions, updateSubscription as updateSubscriptionInCloud } from '@/lib/subscriptions-repository';
import { Subscription } from '@/lib/types';

const STORAGE_KEY = 'subtrack_subscriptions';
const ONBOARDING_KEY = 'subtrack_onboarding_done';
const CLOUD_MIGRATION_KEY = 'subtrack_cloud_migration_done';

type SubscriptionAction = 'load' | 'save' | 'update' | 'delete';

interface SubscriptionsContextValue {
  subscriptions: Subscription[];
  isLoading: boolean;
  errorMessage: string | null;
  hasCompletedOnboarding: boolean;
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt'>) => Promise<void>;
  updateSubscription: (id: string, updates: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  reloadSubscriptions: () => Promise<void>;
}

const SubscriptionsContext = createContext<SubscriptionsContextValue | null>(null);

function getSubscriptionErrorMessage(error: unknown, action: SubscriptionAction): string {
  const message = error instanceof Error ? error.message : '';

  if (message.includes('Supabase is not configured')) {
    return 'Cloud memory is not configured yet. Add your Supabase URL and anon key, then reload the app.';
  }

  if (
    message.includes('Failed to fetch') ||
    message.includes('Network request failed') ||
    message.toLowerCase().includes('network')
  ) {
    if (action === 'load') {
      return 'Could not load subscriptions from the cloud. Check your internet connection and Supabase settings.';
    }

    if (action === 'delete') {
      return 'Could not delete the subscription from the cloud. Check your internet and try again.';
    }

    return 'Could not save your changes to the cloud. Check your internet and try again.';
  }

  switch (action) {
    case 'load':
      return 'Could not load subscriptions from the cloud. Check your Supabase project and try again.';
    case 'save':
      return 'Could not add this subscription to the cloud. Try again.';
    case 'update':
      return 'Could not update this subscription in the cloud. Try again.';
    case 'delete':
      return 'Could not delete this subscription from the cloud. Try again.';
  }
}

async function readLegacySubscriptions(): Promise<Subscription[]> {
  const subsData = await AsyncStorage.getItem(STORAGE_KEY);
  if (!subsData) {
    return [];
  }

  try {
    const parsed = JSON.parse(subsData) as unknown;
    return Array.isArray(parsed) ? (parsed as Subscription[]) : [];
  } catch {
    return [];
  }
}

export function SubscriptionsProvider({ children }: { children: ReactNode }) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  const syncSubscriptions = useCallback(async (allowMigration: boolean) => {
    let nextSubscriptions = await listSubscriptions();

    if (allowMigration) {
      const hasMigrated = await AsyncStorage.getItem(CLOUD_MIGRATION_KEY);

      if (hasMigrated !== 'true') {
        if (nextSubscriptions.length === 0) {
          const legacySubscriptions = await readLegacySubscriptions();

          if (legacySubscriptions.length > 0) {
            await importSubscriptions(legacySubscriptions);
            nextSubscriptions = await listSubscriptions();
            await AsyncStorage.removeItem(STORAGE_KEY);
          }
        }

        await AsyncStorage.setItem(CLOUD_MIGRATION_KEY, 'true');
      }
    }

    setSubscriptions(nextSubscriptions);
    setErrorMessage(null);
  }, []);

  const reloadSubscriptions = useCallback(async () => {
    setIsLoading(true);

    try {
      await syncSubscriptions(true);
    } catch (error) {
      setErrorMessage(getSubscriptionErrorMessage(error, 'load'));
    } finally {
      setIsLoading(false);
    }
  }, [syncSubscriptions]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const onboardingData = await AsyncStorage.getItem(ONBOARDING_KEY);
        setHasCompletedOnboarding(onboardingData === 'true');
        await syncSubscriptions(true);
      } catch (error) {
        setErrorMessage(getSubscriptionErrorMessage(error, 'load'));
      } finally {
        setIsLoading(false);
      }
    };

    void initialize();
  }, [syncSubscriptions]);

  const addSubscription = useCallback(async (sub: Omit<Subscription, 'id' | 'createdAt'>) => {
    const newSub: Subscription = {
      ...sub,
      id: Crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    try {
      const savedSubscription = await createSubscription(newSub);
      setSubscriptions((currentSubscriptions) => [...currentSubscriptions, savedSubscription]);
      setErrorMessage(null);
    } catch (error) {
      const message = getSubscriptionErrorMessage(error, 'save');
      setErrorMessage(message);
      throw new Error(message);
    }
  }, []);

  const updateSubscription = useCallback(async (id: string, updates: Partial<Subscription>) => {
    try {
      const savedSubscription = await updateSubscriptionInCloud(id, updates);
      setSubscriptions((currentSubscriptions) =>
        currentSubscriptions.map((subscription) =>
          subscription.id === id ? savedSubscription : subscription,
        ),
      );
      setErrorMessage(null);
    } catch (error) {
      const message = getSubscriptionErrorMessage(error, 'update');
      setErrorMessage(message);
      throw new Error(message);
    }
  }, []);

  const deleteSubscription = useCallback(async (id: string) => {
    try {
      await deleteSubscriptionFromCloud(id);
      setSubscriptions((currentSubscriptions) =>
        currentSubscriptions.filter((subscription) => subscription.id !== id),
      );
      setErrorMessage(null);
    } catch (error) {
      const message = getSubscriptionErrorMessage(error, 'delete');
      setErrorMessage(message);
      throw new Error(message);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    setHasCompletedOnboarding(true);
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  const value = useMemo(() => ({
    subscriptions,
    isLoading,
    errorMessage,
    hasCompletedOnboarding,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    completeOnboarding,
    reloadSubscriptions,
  }), [subscriptions, isLoading, errorMessage, hasCompletedOnboarding, addSubscription, updateSubscription, deleteSubscription, completeOnboarding, reloadSubscriptions]);

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
