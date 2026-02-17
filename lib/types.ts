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

export const EXCHANGE_RATES: Record<Currency, Record<Currency, number>> = {
  RUB: { RUB: 1, USD: 0.011, EUR: 0.010 },
  USD: { RUB: 92, USD: 1, EUR: 0.92 },
  EUR: { RUB: 100, USD: 1.09, EUR: 1 },
};

export function convertCurrency(amount: number, from: Currency, to: Currency): number {
  if (from === to) return amount;
  return amount * EXCHANGE_RATES[from][to];
}

export function getMonthlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly': return amount * 4.33;
    case 'monthly': return amount;
    case 'quarterly': return amount / 3;
    case 'yearly': return amount / 12;
  }
}

export function getMonthlyAmountInCurrency(amount: number, cycle: BillingCycle, from: Currency, to: Currency): number {
  return convertCurrency(getMonthlyAmount(amount, cycle), from, to);
}

export function getYearlyAmount(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case 'weekly': return amount * 52;
    case 'monthly': return amount * 12;
    case 'quarterly': return amount * 4;
    case 'yearly': return amount;
  }
}

export function getYearlyAmountInCurrency(amount: number, cycle: BillingCycle, from: Currency, to: Currency): number {
  return convertCurrency(getYearlyAmount(amount, cycle), from, to);
}

export function formatAmount(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  if (currency === 'USD' || currency === 'EUR') {
    return `${symbol}${formatted}`;
  }
  return `${formatted} ${symbol}`;
}

export function getDisplayCurrency(subscriptions: { currency: Currency }[]): Currency {
  if (subscriptions.length === 0) return 'RUB';
  const counts: Record<string, number> = {};
  subscriptions.forEach(s => { counts[s.currency] = (counts[s.currency] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as Currency;
}
