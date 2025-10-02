// Shared types for the extension

export type Voucher =
  | {
      voucherId: string
      type: 'fixed'
      denomination: number
      currency: string
      cashbackRate: number
      available: boolean
      howToUse: string
      conditions: string
      validityDays: number
      imageUrl?: string
    }
  | {
      voucherId: string
      type: 'flex'
      minAmount: number
      maxAmount: number
      step?: number
      currency: string
      cashbackRate: number
      available: boolean
      howToUse: string
      conditions: string
      validityDays: number
      imageUrl?: string
    }

export interface Partner {
  domain: string
  name: string
  cashbackRate: number
  voucherAvailable: boolean
  vouchers: Voucher[]
  logo?: string
  voucherProductUrl?: string
  buildVoucherProductUrl?: (amount: number, currency?: string) => string
}

export interface ActivationRecord {
  partner: string
  timestamp: number
  cashbackRate: number
  estimatedEarnings: number
  status: 'active' | 'completed' | 'expired'
}

export interface AnonymousUser {
  totalEarnings: number
  activationHistory: ActivationRecord[]
  settings: {
    showCashbackPrompt: boolean
    showVoucherPrompt: boolean
    // QA toggle: when true, content script ignores dismissal cooldowns
    qaBypassVoucherDismissal?: boolean
  }
}

export interface CheckoutInfo {
  total: number
  currency: string
  merchant: string
  timestamp: number
}

export type IconState = 'neutral' | 'available' | 'active' | 'voucher' | 'error'

export interface CashbackPrompt {
  partner: Partner
  isVisible: boolean
  dismissed: boolean
}

export interface VoucherOffer {
  partner: Partner
  amount: number
  cashbackAmount: number
  isVisible: boolean
  dismissed: boolean
}

// Enhanced partner data with detailed deals and categories
export interface Deal {
  name: string
  rate: number
  description?: string
  imageUrl?: string
  dealUrl?: string
}

export interface Category {
  name: string
  iconUrl?: string
  deals: Deal[]
  maxRate?: number
}

export interface PartnerLite {
  domain: string
  name: string
  cashbackRate: number
  voucherAvailable: boolean
  dealUrl?: string
  voucherProductUrl?: string
  // Enhanced data
  categories?: Category[]
  merchantImageUrl?: string
  description?: string
  // Voucher data
  allVouchers?: Array<{
    url: string
    imageUrl?: string
    name?: string
    cashbackRate?: number
  }>
}

// MVP: Remote config cache structure
export interface PartnersCache {
  partners: PartnerLite[]
  toggles: Record<string, boolean>
  fetchedAt: number
  ttl: number
  etag?: string
  lastModified?: string
}
