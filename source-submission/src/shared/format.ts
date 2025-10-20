// Cashback formatting utilities

import type { Deal } from './types';

/**
 * Format cashback amount based on type (percentage or fixed amount)
 * @param deal - The deal containing rate, amountType, and currency
 * @param locale - Locale for currency formatting (e.g., 'nl-NL', 'en-US')
 * @returns Formatted string like "6%" or "€5.00"
 */
export function formatCashback(deal: Deal, locale: string = 'nl-NL'): string {
  const amountType = deal.amountType || 'PERCENTAGE';
  const rate = deal.rate || 0;
  
  if (amountType === 'FIXED') {
    const currency = deal.currency || 'EUR';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(rate);
  }
  
  return `${rate}%`;
}
