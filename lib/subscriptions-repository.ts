import { type Category, type BillingCycle, type Currency, type Subscription, type SubscriptionStatus } from "@/lib/types";
import { requireSupabase } from "@/lib/supabase";

interface SubscriptionRow {
  id: string;
  name: string;
  amount: number | string;
  currency: Currency;
  billing_cycle: BillingCycle;
  next_billing_date: string;
  category: Category;
  status: SubscriptionStatus;
  note: string | null;
  created_at: string;
  trial_end_date: string | null;
}

type CreateSubscriptionInput = Omit<Subscription, "createdAt"> & {
  createdAt?: string;
};

function mapRowToSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    currency: row.currency,
    billingCycle: row.billing_cycle,
    nextBillingDate: row.next_billing_date,
    category: row.category,
    status: row.status,
    note: row.note ?? "",
    createdAt: row.created_at,
    ...(row.trial_end_date ? { trialEndDate: row.trial_end_date } : {}),
  };
}

function mapSubscriptionToRow(subscription: CreateSubscriptionInput): SubscriptionRow {
  return {
    id: subscription.id,
    name: subscription.name,
    amount: subscription.amount,
    currency: subscription.currency,
    billing_cycle: subscription.billingCycle,
    next_billing_date: subscription.nextBillingDate,
    category: subscription.category,
    status: subscription.status,
    note: subscription.note,
    created_at: subscription.createdAt ?? new Date().toISOString(),
    trial_end_date: subscription.trialEndDate ?? null,
  };
}

function mapSubscriptionUpdatesToRow(updates: Partial<Subscription>): Partial<SubscriptionRow> {
  const row: Partial<SubscriptionRow> = {};

  if (updates.name !== undefined) row.name = updates.name;
  if (updates.amount !== undefined) row.amount = updates.amount;
  if (updates.currency !== undefined) row.currency = updates.currency;
  if (updates.billingCycle !== undefined) row.billing_cycle = updates.billingCycle;
  if (updates.nextBillingDate !== undefined) row.next_billing_date = updates.nextBillingDate;
  if (updates.category !== undefined) row.category = updates.category;
  if (updates.status !== undefined) row.status = updates.status;
  if (updates.note !== undefined) row.note = updates.note;
  if (updates.createdAt !== undefined) row.created_at = updates.createdAt;
  if (updates.trialEndDate !== undefined) row.trial_end_date = updates.trialEndDate ?? null;

  return row;
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as SubscriptionRow[]).map(mapRowToSubscription);
}

export async function createSubscription(subscription: CreateSubscriptionInput): Promise<Subscription> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert(mapSubscriptionToRow(subscription))
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapRowToSubscription(data as SubscriptionRow);
}

export async function updateSubscription(
  id: string,
  updates: Partial<Subscription>,
): Promise<Subscription> {
  const supabase = requireSupabase();
  const payload = mapSubscriptionUpdatesToRow(updates);
  const { data, error } = await supabase
    .from("subscriptions")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapRowToSubscription(data as SubscriptionRow);
}

export async function deleteSubscription(id: string): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function importSubscriptions(subscriptions: Subscription[]): Promise<void> {
  if (subscriptions.length === 0) {
    return;
  }

  const supabase = requireSupabase();
  const rows = subscriptions.map(mapSubscriptionToRow);
  const { error } = await supabase
    .from("subscriptions")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    throw error;
  }
}
