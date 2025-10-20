// Tests for cashback formatting and mapping functionality

import { describe, it, expect } from 'vitest'
import { formatCashback } from '../shared/format'
import { Deal } from '../shared/types'

describe('formatCashback', () => {
  it('formats percentage cashback correctly', () => {
    const deal: Deal = {
      id: '1',
      name: 'Test Deal',
      rate: 6,
      amountType: 'PERCENTAGE'
    }
    
    expect(formatCashback(deal)).toBe('6%')
    expect(formatCashback(deal, 'en-US')).toBe('6%')
  })

  it('formats fixed amount cashback correctly', () => {
    const deal: Deal = {
      id: '1',
      name: 'Test Deal',
      rate: 5,
      amountType: 'FIXED',
      currency: 'EUR'
    }
    
    expect(formatCashback(deal, 'nl-NL')).toBe('€\u00A05,00')
    expect(formatCashback(deal, 'en-US')).toBe('€5.00')
  })

  it('defaults to EUR for fixed amounts without currency', () => {
    const deal: Deal = {
      id: '1',
      name: 'Test Deal',
      rate: 27.5,
      amountType: 'FIXED'
    }
    
    expect(formatCashback(deal, 'nl-NL')).toBe('€\u00A027,50')
  })

  it('defaults to PERCENTAGE when amountType is undefined', () => {
    const deal: Deal = {
      id: '1',
      name: 'Test Deal',
      rate: 4
    }
    
    expect(formatCashback(deal)).toBe('4%')
  })

  it('handles zero rates correctly', () => {
    const percentageDeal: Deal = {
      id: '1',
      name: 'Test Deal',
      rate: 0,
      amountType: 'PERCENTAGE'
    }
    
    const fixedDeal: Deal = {
      id: '2',
      name: 'Test Deal',
      rate: 0,
      amountType: 'FIXED',
      currency: 'EUR'
    }
    
    expect(formatCashback(percentageDeal)).toBe('0%')
    expect(formatCashback(fixedDeal, 'nl-NL')).toBe('€\u00A00,00')
  })
})

describe('API mapping scenarios', () => {
  it('maps merchants-overview API response correctly', () => {
    // Simulate the merchants-overview API response structure
    const apiResponse = {
      cashbackAmount: {
        amount: {
          value: 600,
          currency: 'EUR',
          scalingFactor: 2
        },
        amountType: 'FIXED' as const
      }
    }
    
    // This simulates the toRate function logic
    const value = apiResponse.cashbackAmount.amount.value
    const scale = apiResponse.cashbackAmount.amount.scalingFactor
    const rate = value / Math.pow(10, scale)
    
    const deal: Deal = {
      rate,
      amountType: apiResponse.cashbackAmount.amountType,
      currency: apiResponse.cashbackAmount.amount.currency
    }
    
    expect(rate).toBe(6) // 600 / 10^2
    expect(formatCashback(deal, 'nl-NL')).toBe('€\u00A06,00')
  })

  it('maps merchant detail API response correctly', () => {
    // Simulate the merchant detail API response structure
    const apiResponse = {
      cashbackType: 'money' as const,
      cashBack: 27.5,
      currencyCode: 'EUR'
    }
    
    const amountType = apiResponse.cashbackType === 'money' ? 'FIXED' : 'PERCENTAGE'
    
    const deal: Deal = {
      rate: apiResponse.cashBack,
      amountType,
      currency: apiResponse.currencyCode
    }
    
    expect(amountType).toBe('FIXED')
    expect(formatCashback(deal, 'nl-NL')).toBe('€\u00A027,50')
  })

  it('maps percentage merchant detail API response correctly', () => {
    // Simulate the merchant detail API response structure for percentage
    const apiResponse = {
      cashbackType: 'percent' as const,
      cashBack: 6,
      currencyCode: 'EUR'
    }
    
    const amountType = apiResponse.cashbackType === 'money' ? 'FIXED' : 'PERCENTAGE'
    
    const deal: Deal = {
      rate: apiResponse.cashBack,
      amountType,
      currency: apiResponse.currencyCode
    }
    
    expect(amountType).toBe('PERCENTAGE')
    expect(formatCashback(deal)).toBe('6%')
  })
})
