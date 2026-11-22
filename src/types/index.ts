export interface User {
  id: string | number;
  email: string;
  full_name: string;
  phone?: string;
  country?: string;
  role: 'user' | 'admin';
  referral_code: string;
  is_verified: number;
  two_factor_enabled?: number;
  status: 'active' | 'suspended' | 'restricted';
  created_at?: string;
}

export interface WalletBalances {
  [currency: string]: {
    available: number;
    locked: number;
    total: number;
  };
}

export interface Transaction {
  id: string | number;
  transaction_ref: string;
  type: 'deposit' | 'withdrawal' | 'investment_open' | 'investment_return' | 'investment_principal_return' | 'referral_bonus' | 'balance_credit' | 'balance_debit' | 'fee';
  currency: string;
  amount: number;
  fee: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  related_id?: string;
  created_at: string;
}

export interface Deposit {
  id: string | number;
  user_id: string | number;
  currency: 'BTC' | 'USDT';
  network: string;
  deposit_address: string;
  amount: number;
  tx_hash: string;
  proof_note?: string;
  proof_image?: string;
  status: 'pending' | 'verifying' | 'confirmed' | 'rejected';
  admin_note?: string;
  verified_at?: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface Withdrawal {
  id: string | number;
  user_id: string | number;
  currency: 'BTC' | 'USDT';
  network: string;
  destination_address: string;
  amount: number;
  fee: number;
  net_amount: number;
  status: 'pending' | 'under_review' | 'approved' | 'processing' | 'completed' | 'rejected';
  admin_note?: string;
  payout_tx_hash?: string;
  created_at: string;
  updated_at?: string;
  user_name?: string;
  user_email?: string;
}

export interface InvestmentPlan {
  id: string | number;
  name: string;
  slug: string;
  tagline?: string;
  min_amount: number;
  max_amount: number;
  duration_days: number;
  daily_roi: number;
  total_roi: number;
  risk_tier: 'Conservative' | 'Moderate' | 'Aggressive' | 'Institutional';
  management_fee: number;
  return_method: string;
  description: string;
  capital_returned: number;
  is_active: number;
}

export interface InvestmentPosition {
  id: string | number;
  user_id: string | number;
  plan_id: string | number;
  plan_name: string;
  duration_days: number;
  risk_tier: string;
  daily_roi: number;
  capital_amount: number;
  currency: string;
  daily_return: number;
  total_earned: number;
  start_date: string;
  maturity_date: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
}

export interface KYCRecord {
  id: string | number;
  user_id: string | number;
  full_legal_name: string;
  date_of_birth: string;
  residential_address: string;
  city: string;
  country: string;
  postal_code: string;
  id_type: 'passport' | 'national_id' | 'drivers_license';
  id_number: string;
  id_expiry?: string;
  id_front_path?: string;
  id_back_path?: string;
  address_proof_path?: string;
  selfie_path?: string;
  status: 'not_submitted' | 'pending' | 'verified' | 'rejected' | 'additional_info_required';
  admin_note?: string;
  reviewed_at?: string;
  created_at?: string;
  user_name?: string;
  user_email?: string;
}

export interface CryptoMarketCoin {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
  total_volume: number;
  market_cap: number;
  sparkline_in_7d?: number[];
}

export interface NotificationItem {
  id: string | number;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info' | 'security';
  is_read: number;
  link?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string | number;
  user_id?: string;
  ticket_code: string;
  subject: string;
  category: string;
  priority: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  message_count?: number;
  user_name?: string;
  user_email?: string;
}

export interface SupportMessage {
  id: string | number;
  ticket_id: string | number;
  sender_role: 'user' | 'admin';
  sender_name: string;
  message: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: string | number;
  admin_id: string | number;
  admin_email: string;
  action: string;
  target_type: string;
  target_id?: string;
  details?: string;
  created_at: string;
}
