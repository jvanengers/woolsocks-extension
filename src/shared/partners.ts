// Mock partner database with realistic data
import type { Partner } from './types'

export const PARTNERS: Partner[] = [
  {
    domain: 'amazon.nl',
    name: 'Amazon',
    cashbackRate: 3.0,
    voucherAvailable: true,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
    vouchers: [
      { voucherId: 'abcdefg123456', type: 'flex', minAmount: 5, maxAmount: 500, step: 5, currency: 'EUR', cashbackRate: 5.0, available: true, howToUse: 'Redeem at checkout by selecting Gift Card and entering the code.', conditions: 'Usable only on Amazon.nl for eligible products; cannot be used to buy other gift cards.', validityDays: 3650, imageUrl: 'https://images-na.ssl-images-amazon.com/images/I/61X8VhKjKBL._AC_SL1500_.jpg' },
    ],
  },
  {
    domain: 'amazon.de',
    name: 'Amazon',
    cashbackRate: 3.0,
    voucherAvailable: true,
    vouchers: [
      { voucherId: 'hjk987poi654', type: 'flex', minAmount: 5, maxAmount: 500, step: 5, currency: 'EUR', cashbackRate: 5.0, available: true, howToUse: 'Redeem at checkout by selecting Gift Cards and entering the code.', conditions: 'Valid on Amazon.de; not valid for certain restricted items or gift cards.', validityDays: 3650 },
    ],
  },
  {
    domain: 'zalando.nl',
    name: 'Zalando',
    cashbackRate: 2.5,
    voucherAvailable: true,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Zalando_201x_logo.svg',
    vouchers: [
      { voucherId: 'zyx321abc987', type: 'flex', minAmount: 5, maxAmount: 250, step: 5, currency: 'EUR', cashbackRate: 4.0, available: true, howToUse: 'Apply the code in the "Gift card or promo code" field at checkout.', conditions: 'Valid on Zalando.nl; not combinable with some promotions; cannot be exchanged for cash.', validityDays: 1095, imageUrl: 'https://www.cadeaubon.nl/sites/default/files/2021-11/zalando-1500px_0.jpg?v=w500' },
    ],
  },
  {
    domain: 'zalando.de',
    name: 'Zalando',
    cashbackRate: 2.5,
    voucherAvailable: true,
    vouchers: [
      { voucherId: 'pqr555lmn888', type: 'flex', minAmount: 5, maxAmount: 250, step: 5, currency: 'EUR', cashbackRate: 4.0, available: true, howToUse: 'Enter the gift code in the designated field during checkout.', conditions: 'Valid on Zalando.de; some brands excluded; non-refundable.', validityDays: 1095 },
    ],
  },
  {
    domain: 'bol.com',
    name: 'Bol.com',
    cashbackRate: 4.0,
    voucherAvailable: false,
    vouchers: [],
  },
  {
    domain: 'coolblue.nl',
    name: 'Coolblue',
    cashbackRate: 1.5,
    voucherAvailable: true,
    vouchers: [
      { voucherId: 'qqq111www222', type: 'fixed', denomination: 25, currency: 'EUR', cashbackRate: 3.0, available: true, howToUse: 'Use the code at Coolblue checkout in the gift card field.', conditions: 'Valid on Coolblue.nl; see site for category restrictions.', validityDays: 1825 },
      { voucherId: 'eee333rrr444', type: 'fixed', denomination: 50, currency: 'EUR', cashbackRate: 3.0, available: true, howToUse: 'Use the code at Coolblue checkout in the gift card field.', conditions: 'Valid on Coolblue.nl; see site for category restrictions.', validityDays: 1825 },
      { voucherId: 'ttt555yyy666', type: 'fixed', denomination: 100, currency: 'EUR', cashbackRate: 3.0, available: true, howToUse: 'Use the code at Coolblue checkout in the gift card field.', conditions: 'Valid on Coolblue.nl; see site for category restrictions.', validityDays: 1825 },
    ],
  },
  {
    domain: 'wehkamp.nl',
    name: 'Wehkamp',
    cashbackRate: 2.0,
    voucherAvailable: true,
    vouchers: [
      { voucherId: 'uio777asd000', type: 'fixed', denomination: 50, currency: 'EUR', cashbackRate: 3.5, available: true, howToUse: 'Enter the code on Wehkamp during checkout.', conditions: 'Valid on Wehkamp.nl; cannot be exchanged for cash.', validityDays: 730 },
      { voucherId: 'lkj888mnb999', type: 'fixed', denomination: 100, currency: 'EUR', cashbackRate: 3.5, available: true, howToUse: 'Enter the code on Wehkamp during checkout.', conditions: 'Valid on Wehkamp.nl; cannot be exchanged for cash.', validityDays: 730 },
    ],
  },
  {
    domain: 'mediamarkt.nl',
    name: 'MediaMarkt',
    cashbackRate: 1.0,
    voucherAvailable: true,
    logo: 'https://cdn2.downdetector.com/static/uploads/logo/Media-Markt-Emblem.png',
    vouchers: [
      { voucherId: 'bvc222cxz333', type: 'fixed', denomination: 25, currency: 'EUR', cashbackRate: 2.5, available: true, howToUse: 'Use the code in the gift card field on MediaMarkt.', conditions: 'Valid on MediaMarkt.nl; cannot purchase other gift cards.', validityDays: 1095, imageUrl: 'https://www.cadeaubon.nl/sites/default/files/2021-11/mediamarkt-1500px_6.jpg?v=w500' },
      { voucherId: 'ghj444dfg555', type: 'fixed', denomination: 50, currency: 'EUR', cashbackRate: 2.5, available: true, howToUse: 'Use the code in the gift card field on MediaMarkt.', conditions: 'Valid on MediaMarkt.nl; cannot purchase other gift cards.', validityDays: 1095, imageUrl: 'https://www.cadeaubon.nl/sites/default/files/2021-11/mediamarkt-1500px_6.jpg?v=w500' },
      { voucherId: 'vbn666rty777', type: 'fixed', denomination: 100, currency: 'EUR', cashbackRate: 2.5, available: true, howToUse: 'Use the code in the gift card field on MediaMarkt.', conditions: 'Valid on MediaMarkt.nl; cannot purchase other gift cards.', validityDays: 1095, imageUrl: 'https://www.cadeaubon.nl/sites/default/files/2021-11/mediamarkt-1500px_6.jpg?v=w500' },
      { voucherId: 'poi888qwe999', type: 'fixed', denomination: 250, currency: 'EUR', cashbackRate: 2.5, available: true, howToUse: 'Use the code in the gift card field on MediaMarkt.', conditions: 'Valid on MediaMarkt.nl; cannot purchase other gift cards.', validityDays: 1095, imageUrl: 'https://www.cadeaubon.nl/sites/default/files/2021-11/mediamarkt-1500px_6.jpg?v=w500' },
    ],
  },
  {
    domain: 'hunkemoller.com',
    name: 'Hunkemöller',
    cashbackRate: 3.5,
    voucherAvailable: false,
    vouchers: [],
  },
  {
    domain: 'ikea.nl',
    name: 'IKEA',
    cashbackRate: 1.0,
    voucherAvailable: true,
    vouchers: [
      { voucherId: 'wer123sdf456', type: 'flex', minAmount: 5, maxAmount: 500, step: 5, currency: 'EUR', cashbackRate: 2.0, available: true, howToUse: 'Redeem online at IKEA checkout.', conditions: 'Valid on IKEA.nl; in-store redemption rules may differ.', validityDays: 1825 },
    ],
  },
  {
    domain: 'action.com',
    name: 'Action',
    cashbackRate: 0.5,
    voucherAvailable: false,
    vouchers: [],
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
