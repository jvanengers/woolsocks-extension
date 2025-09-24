// Mock partner database with realistic data
import { Partner } from './types'

export const PARTNERS: Partner[] = [
  {
    domain: 'amazon.nl',
    name: 'Amazon',
    cashbackRate: 3.0,
    voucherAvailable: true,
    voucherDenominations: [25, 50, 100, 200],
    voucherCashbackRate: 5.0,
  },
  {
    domain: 'amazon.de',
    name: 'Amazon',
    cashbackRate: 3.0,
    voucherAvailable: true,
    voucherDenominations: [25, 50, 100, 200],
    voucherCashbackRate: 5.0,
  },
  {
    domain: 'zalando.nl',
    name: 'Zalando',
    cashbackRate: 2.5,
    voucherAvailable: true,
    voucherDenominations: [50, 100, 150],
    voucherCashbackRate: 4.0,
  },
  {
    domain: 'bol.com',
    name: 'Bol.com',
    cashbackRate: 4.0,
    voucherAvailable: false,
    voucherDenominations: [],
    voucherCashbackRate: 0,
  },
  {
    domain: 'coolblue.nl',
    name: 'Coolblue',
    cashbackRate: 1.5,
    voucherAvailable: true,
    voucherDenominations: [25, 50, 100],
    voucherCashbackRate: 3.0,
  },
  {
    domain: 'wehkamp.nl',
    name: 'Wehkamp',
    cashbackRate: 2.0,
    voucherAvailable: true,
    voucherDenominations: [50, 100],
    voucherCashbackRate: 3.5,
  },
  {
    domain: 'mediamarkt.nl',
    name: 'MediaMarkt',
    cashbackRate: 1.0,
    voucherAvailable: true,
    voucherDenominations: [25, 50, 100, 250],
    voucherCashbackRate: 2.5,
  },
  {
    domain: 'hunkemoller.com',
    name: 'Hunkemöller',
    cashbackRate: 3.5,
    voucherAvailable: false,
    voucherDenominations: [],
    voucherCashbackRate: 0,
  },
  {
    domain: 'ikea.nl',
    name: 'IKEA',
    cashbackRate: 1.0,
    voucherAvailable: true,
    voucherDenominations: [25, 50, 100],
    voucherCashbackRate: 2.0,
  },
  {
    domain: 'action.com',
    name: 'Action',
    cashbackRate: 0.5,
    voucherAvailable: false,
    voucherDenominations: [],
    voucherCashbackRate: 0,
  },
]

export function findPartnerByDomain(domain: string): Partner | null {
  return PARTNERS.find(partner => 
    domain.includes(partner.domain) || partner.domain.includes(domain)
  ) || null
}

export function findPartnerByHostname(hostname: string): Partner | null {
  return PARTNERS.find(partner => 
    hostname === partner.domain || hostname.endsWith('.' + partner.domain)
  ) || null
}

export function generateVoucherCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result.match(/.{1,4}/g)?.join('-') || result
}
