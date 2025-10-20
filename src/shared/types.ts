// Shared types for cashback deals and amount formatting

export type AmountType = 'PERCENTAGE' | 'FIXED';

export type Deal = {
  id?: string | number;
  name?: string;
  rate?: number;           // percentage value like 6 (not 0.06) or fixed amount
  amountType?: AmountType; // default 'PERCENTAGE'
  currency?: string;       // ISO currency when FIXED
  description?: string;
  imageUrl?: string;
  dealUrl?: string;
  country?: string;
  usageType?: string;
  provider?: string;
  providerMerchantId?: string | number;
  providerReferenceId?: string | number;
  requireOptIn?: boolean;
  conditions?: { siteContents?: string[] };
  merchantId?: string | number;
  affiliateUrl?: string;
  clickId?: string | number;
};

export type PartnerLite = {
  domain: string;
  name: string;
  cashbackRate: number;
  voucherAvailable: boolean;
  dealUrl?: string;
  merchantImageUrl?: string;
  description?: string;
  categories?: Category[];
};

export type Category = {
  name: string;
  deals: Deal[];
  maxRate?: number;
};

export type AnonymousUser = {
  totalEarnings: number;
  activationHistory: ActivationRecord[];
  settings: {
    showCashbackPrompt: boolean;
    showVoucherPrompt: boolean;
    autoActivateOnlineCashback?: boolean;
  };
};

export type ActivationRecord = {
  domain?: string;
  dealId?: string | number;
  clickId?: string | number | null;
  conditions?: any | null;
  timestamp: number;
  partner?: string;
  status?: string;
  cashbackRate?: number;
  estimatedEarnings?: number;
};

export type IconState = 'neutral' | 'available' | 'active' | 'voucher' | 'error';

export type CheckoutInfo = {
  total: number;
  currency: string;
  merchant: string;
};

export type Partner = {
  domain: string;
  name: string;
  cashbackRate: number;
  voucherAvailable: boolean;
  dealUrl?: string;
  merchantImageUrl?: string;
  description?: string;
  categories?: Category[];
  logo?: string;
  vouchers?: any[];
  voucherProductUrl?: string;
};