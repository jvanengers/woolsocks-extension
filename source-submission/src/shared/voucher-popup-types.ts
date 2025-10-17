// Type definitions for the voucher popup module

export interface Voucher {
  name: string
  cashbackRate: number
  imageUrl?: string
  url?: string
}

export interface PopupAssets {
  uspIconUrl?: string
  wsLogoUrl?: string
  externalIconUrl?: string
  paymentIconUrls?: string[]
}

export interface VoucherTranslations {
  purchaseAmount?: string
  cashbackText?: string
  cashbackSuffix?: string
  viewDetails?: string
  instructions?: string
  usps?: {
    instantDelivery: string
    cashbackOnPurchase: string
    useOnlineAtCheckout: string
  }
}

export interface VoucherPopupConfig {
  partner: any // Partner object from API
  checkoutTotal: number
  assets: PopupAssets
  translations: VoucherTranslations
}

export interface PopupState {
  selectedVoucherIndex: number
  position: { top?: string; bottom?: string; left?: string; right?: string }
  isMinimized: boolean
}

export interface StyleObject {
  [key: string]: string | number
}
