export type SubscriptionStatus = 'active' | 'paused' | 'expired';

export type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type Currency = 'RUB' | 'USD' | 'EUR';

export type Category =
  | 'streaming'
  | 'music'
  | 'gaming'
  | 'productivity'
  | 'cloud'
  | 'fitness'
  | 'news'
  | 'education'
  | 'shopping'
  | 'finance'
  | 'social'
  | 'other';

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: Currency;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  category: Category;
  status: SubscriptionStatus;
  note: string;
  createdAt: string;
  trialEndDate?: string;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  streaming: 'Streaming',
  music: 'Music',
  gaming: 'Gaming',
  productivity: 'Productivity',
  cloud: 'Cloud',
  fitness: 'Fitness',
  news: 'News',
  education: 'Education',
  shopping: 'Shopping',
  finance: 'Finance',
  social: 'Social',
  other: 'Other',
};

export const CYCLE_LABELS: Record<BillingCycle, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  RUB: '\u20BD',
  USD: '$',
  EUR: '\u20AC',
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  expired: 'Expired',
};

export function getMonthlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly': return amount * 4.33;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
  }
}

export function getYearlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly': return amount * 52;
    case 'monthly': return amount * 12;
    case 'quarterly': return amount * 4;
    case 'yearly': return amount;
  }
}

export function formatAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (currency === 'USD' || currency === 'EUR') {
    return `${symbol}${formatted}`;
  }
  return `${formatted} ${symbol}`;
}
