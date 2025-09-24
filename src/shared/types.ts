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
}

export interface ActivationRecord {
  partner: string
  timestamp: number
  cashbackRate: number
  estimatedEarnings: number
  status: 'active' | 'completed' | 'expired'
}

export interface MockUser {
  isLoggedIn: boolean
  totalEarnings: number
  activationHistory: ActivationRecord[]
  settings: {
    showCashbackPrompt: boolean
    showVoucherPrompt: boolean
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
