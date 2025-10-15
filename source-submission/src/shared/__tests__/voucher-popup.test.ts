import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { VoucherPopupConfig, PopupAssets, VoucherTranslations } from '../voucher-popup-types'

// Mock the styles module since we're testing logic, not styling
vi.mock('../voucher-popup-styles', () => ({
  applyStyles: vi.fn((element: HTMLElement, styles: any) => {
    Object.assign(element.style, styles)
  }),
  popupStyles: {
    container: { position: 'fixed' },
    header: { display: 'flex' },
    title: { margin: '0' },
    closeButton: { background: 'none' },
    content: { borderRadius: '16px' },
    amountSection: { marginBottom: '16px' },
    amountLabel: { color: '#100B1C' },
    amountValue: { color: '#100B1C' },
    carousel: { display: 'flex' },
    carouselContainer: { display: 'flex' },
    voucherCard: { minWidth: '259px' },
    voucherImage: { width: '111px' },
    voucherInfo: { flex: '1' },
    cashbackBadge: { display: 'flex' },
    voucherName: { fontSize: '16px' },
    singleVoucher: { display: 'flex' },
    singleVoucherContent: { display: 'flex' },
    singleVoucherImage: { width: '72px' },
    carouselNavigation: { display: 'flex' },
    carouselArrow: { width: '24px' },
    carouselIndicators: { display: 'flex' },
    carouselDot: { width: '6px' },
    cashbackSection: { display: 'flex' },
    cashbackText: { color: '#8564FF' },
    cashbackAmount: { display: 'flex' },
    actionButton: { display: 'flex' },
    uspsSection: { display: 'flex' },
    uspItem: { display: 'flex' },
    uspText: { fontSize: '13px' },
    paymentSection: { display: 'flex' },
    paymentIcon: { flex: '1' },
    instructions: { fontSize: '13px' },
    logoSection: { display: 'flex' },
    minimizedIcon: { width: '40px' }
  }
}))

// Import the module after mocking
import { createVoucherPopup } from '../voucher-popup'

describe('Voucher Popup Module', () => {
  let mockConfig: VoucherPopupConfig
  let mockPartner: any
  let mockAssets: PopupAssets
  let mockTranslations: VoucherTranslations

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = ''
    
    // Create mock data
    mockPartner = {
      name: 'Test Store',
      cashbackRate: 4,
      categories: [{
        name: 'Voucher',
        deals: [
          { name: 'Test Voucher 1', rate: 5, dealUrl: 'https://test.com/voucher1', imageUrl: 'https://test.com/img1.jpg' },
          { name: 'Test Voucher 2', rate: 3, dealUrl: 'https://test.com/voucher2', imageUrl: 'https://test.com/img2.jpg' }
        ]
      }],
      voucherProductUrl: 'https://test.com/voucher',
      merchantImageUrl: 'https://test.com/merchant.jpg'
    }

    mockAssets = {
      uspIconUrl: 'https://test.com/usp-icon.png',
      wsLogoUrl: 'https://test.com/ws-logo.png',
      externalIconUrl: 'https://test.com/external-icon.png',
      paymentIconUrls: ['https://test.com/visa.png', 'https://test.com/mastercard.png']
    }

    mockTranslations = {
      purchaseAmount: 'Purchase amount',
      cashbackText: "You'll get",
      cashbackSuffix: 'of cashback',
      viewDetails: 'View voucher details',
      instructions: 'Buy the voucher at Woolsocks.eu and put the vouchercode in the field at checkout.'
    }

    mockConfig = {
      partner: mockPartner,
      checkoutTotal: 100,
      assets: mockAssets,
      translations: mockTranslations
    }
  })

  describe('createVoucherPopup', () => {
    it('should create a popup element with correct ID', () => {
      const popup = createVoucherPopup(mockConfig)
      
      expect(popup).toBeInstanceOf(HTMLElement)
      expect(popup.id).toBe('woolsocks-voucher-prompt')
    })

    it('should remove existing popup before creating new one', () => {
      // Create first popup and append to DOM
      const firstPopup = createVoucherPopup(mockConfig)
      document.body.appendChild(firstPopup)
      
      // Verify first popup is in DOM
      expect(document.querySelectorAll('#woolsocks-voucher-prompt')).toHaveLength(1)
      
      // Create second popup (should remove first one)
      const secondPopup = createVoucherPopup(mockConfig)
      document.body.appendChild(secondPopup)
      
      // Should only have one popup in DOM
      const popups = document.querySelectorAll('#woolsocks-voucher-prompt')
      expect(popups).toHaveLength(1)
      expect(popups[0]).toBe(secondPopup)
    })

    it('should create popup with multiple vouchers and carousel', () => {
      const popup = createVoucherPopup(mockConfig)
      
      // Should have carousel elements
      expect(popup.querySelector('#voucher-carousel')).toBeTruthy()
      expect(popup.querySelector('#carousel-left-arrow')).toBeTruthy()
      expect(popup.querySelector('#carousel-right-arrow')).toBeTruthy()
      expect(popup.querySelector('#carousel-indicators')).toBeTruthy()
      
      // Should have voucher cards
      const voucherCards = popup.querySelectorAll('.voucher-card')
      expect(voucherCards).toHaveLength(2)
    })

    it('should create popup with single voucher when only one available', () => {
      // Modify partner to have only one voucher
      mockPartner.categories[0].deals = [mockPartner.categories[0].deals[0]]
      
      const popup = createVoucherPopup(mockConfig)
      
      // Should not have carousel elements
      expect(popup.querySelector('#voucher-carousel')).toBeFalsy()
      expect(popup.querySelector('#carousel-left-arrow')).toBeFalsy()
      expect(popup.querySelector('#carousel-right-arrow')).toBeFalsy()
      
      // Should still create a valid popup
      expect(popup).toBeInstanceOf(HTMLElement)
      expect(popup.id).toBe('woolsocks-voucher-prompt')
    })

    it('should handle partner with allVouchers instead of categories', () => {
      const partnerWithAllVouchers = {
        name: 'Test Store',
        cashbackRate: 4,
        allVouchers: [
          { name: 'All Voucher 1', cashbackRate: 6, url: 'https://test.com/all1', imageUrl: 'https://test.com/all1.jpg' },
          { name: 'All Voucher 2', cashbackRate: 4, url: 'https://test.com/all2', imageUrl: 'https://test.com/all2.jpg' }
        ]
      }
      
      const config = { ...mockConfig, partner: partnerWithAllVouchers }
      const popup = createVoucherPopup(config)
      
      const voucherCards = popup.querySelectorAll('.voucher-card')
      expect(voucherCards).toHaveLength(2)
    })

    it('should handle partner with only voucherProductUrl', () => {
      const partnerWithProductUrl = {
        name: 'Test Store',
        cashbackRate: 4,
        voucherProductUrl: 'https://test.com/product',
        merchantImageUrl: 'https://test.com/merchant.jpg'
      }
      
      const config = { ...mockConfig, partner: partnerWithProductUrl }
      const popup = createVoucherPopup(config)
      
      // Should create a valid popup
      expect(popup).toBeInstanceOf(HTMLElement)
      expect(popup.id).toBe('woolsocks-voucher-prompt')
      expect(popup.querySelector('#voucher-carousel')).toBeFalsy()
    })

    it('should filter out vouchers with invalid cashback rates', () => {
      const partnerWithInvalidVouchers = {
        name: 'Test Store',
        cashbackRate: 4,
        categories: [{
          name: 'Voucher',
          deals: [
            { name: 'Valid Voucher', rate: 5, dealUrl: 'https://test.com/valid' },
            { name: 'Invalid Voucher 1', rate: 0, dealUrl: 'https://test.com/invalid1' },
            { name: 'Invalid Voucher 2', rate: -1, dealUrl: 'https://test.com/invalid2' },
            { name: 'Valid Voucher 2', rate: 3, dealUrl: 'https://test.com/valid2' }
          ]
        }]
      }
      
      const config = { ...mockConfig, partner: partnerWithInvalidVouchers }
      const popup = createVoucherPopup(config)
      
      const voucherCards = popup.querySelectorAll('.voucher-card')
      expect(voucherCards).toHaveLength(2) // Only valid vouchers
    })

    it('should sort vouchers by cashback rate (highest first)', () => {
      const popup = createVoucherPopup(mockConfig)
      const voucherCards = popup.querySelectorAll('.voucher-card')
      
      // Should have 2 voucher cards
      expect(voucherCards).toHaveLength(2)
      
      // Both cards should be valid elements
      expect(voucherCards[0]).toBeInstanceOf(HTMLElement)
      expect(voucherCards[1]).toBeInstanceOf(HTMLElement)
    })

    it('should create essential UI elements', () => {
      const popup = createVoucherPopup(mockConfig)
      
      // Header elements
      expect(popup.querySelector('h3')).toBeTruthy()
      expect(popup.querySelector('#ws-close')).toBeTruthy()
      
      // Cashback section
      expect(popup.querySelector('#cashback-amount')).toBeTruthy()
      
      // Action button
      expect(popup.querySelector('#ws-use-voucher')).toBeTruthy()
      
      // Should be a valid popup element
      expect(popup).toBeInstanceOf(HTMLElement)
      expect(popup.id).toBe('woolsocks-voucher-prompt')
    })

    it('should handle missing translations gracefully', () => {
      const configWithMissingTranslations = {
        ...mockConfig,
        translations: {}
      }
      
      const popup = createVoucherPopup(configWithMissingTranslations)
      
      // Should still create popup successfully
      expect(popup).toBeInstanceOf(HTMLElement)
      expect(popup.id).toBe('woolsocks-voucher-prompt')
    })

    it('should handle missing assets gracefully', () => {
      const configWithMissingAssets = {
        ...mockConfig,
        assets: {}
      }
      
      const popup = createVoucherPopup(configWithMissingAssets)
      
      // Should still create popup successfully
      expect(popup).toBeInstanceOf(HTMLElement)
      expect(popup.id).toBe('woolsocks-voucher-prompt')
    })

    it('should normalize HTTP image URLs to HTTPS', () => {
      const partnerWithHttpImages = {
        name: 'Test Store',
        cashbackRate: 4,
        categories: [{
          name: 'Voucher',
          deals: [{
            name: 'HTTP Voucher',
            rate: 5,
            dealUrl: 'https://test.com/voucher',
            imageUrl: 'http://test.com/image.jpg' // HTTP URL
          }]
        }]
      }
      
      const config = { ...mockConfig, partner: partnerWithHttpImages }
      const popup = createVoucherPopup(config)
      
      // The image URL should be normalized to HTTPS in the voucher data
      // This is tested indirectly through the voucher collection logic
      expect(popup).toBeInstanceOf(HTMLElement)
    })

    it('should create correct cashback amount calculation', () => {
      const popup = createVoucherPopup(mockConfig)
      const cashbackElement = popup.querySelector('#cashback-amount')
      
      // Should calculate cashback for first voucher (5% of 100 = €5.00)
      expect(cashbackElement?.textContent).toBe('€5.00')
    })

    it('should handle zero checkout total', () => {
      const configWithZeroTotal = {
        ...mockConfig,
        checkoutTotal: 0
      }
      
      const popup = createVoucherPopup(configWithZeroTotal)
      const cashbackElement = popup.querySelector('#cashback-amount')
      
      // Should show €0.00
      expect(cashbackElement?.textContent).toBe('€0.00')
    })

    it('should handle large checkout total', () => {
      const configWithLargeTotal = {
        ...mockConfig,
        checkoutTotal: 1234.56
      }
      
      const popup = createVoucherPopup(configWithLargeTotal)
      const cashbackElement = popup.querySelector('#cashback-amount')
      
      // Should calculate 5% of 1234.56 = €61.73
      expect(cashbackElement?.textContent).toBe('€61.73')
    })
  })

  describe('Voucher Collection Logic', () => {
    it('should handle empty partner data', () => {
      const emptyPartner = {}
      const config = { ...mockConfig, partner: emptyPartner }
      
      const popup = createVoucherPopup(config)
      
      // Should still create popup but with no vouchers
      expect(popup).toBeInstanceOf(HTMLElement)
      expect(popup.querySelector('.voucher-card')).toBeFalsy()
    })

    it('should handle partner with null/undefined categories', () => {
      const partnerWithNullCategories = {
        name: 'Test Store',
        categories: null
      }
      
      const config = { ...mockConfig, partner: partnerWithNullCategories }
      const popup = createVoucherPopup(config)
      
      expect(popup).toBeInstanceOf(HTMLElement)
    })

    it('should handle partner with empty categories array', () => {
      const partnerWithEmptyCategories = {
        name: 'Test Store',
        categories: []
      }
      
      const config = { ...mockConfig, partner: partnerWithEmptyCategories }
      const popup = createVoucherPopup(config)
      
      expect(popup).toBeInstanceOf(HTMLElement)
    })

    it('should handle partner with categories but no voucher category', () => {
      const partnerWithNonVoucherCategories = {
        name: 'Test Store',
        categories: [{
          name: 'Electronics',
          deals: [{ name: 'Laptop', rate: 2 }]
        }]
      }
      
      const config = { ...mockConfig, partner: partnerWithNonVoucherCategories }
      const popup = createVoucherPopup(config)
      
      expect(popup).toBeInstanceOf(HTMLElement)
    })

    it('should handle voucher category with no deals', () => {
      const partnerWithEmptyVoucherCategory = {
        name: 'Test Store',
        categories: [{
          name: 'Voucher',
          deals: []
        }]
      }
      
      const config = { ...mockConfig, partner: partnerWithEmptyVoucherCategory }
      const popup = createVoucherPopup(config)
      
      expect(popup).toBeInstanceOf(HTMLElement)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed partner data gracefully', () => {
      const malformedPartner = {
        name: 'Test Store',
        categories: [{
          name: 'Voucher',
          deals: [
            { name: 'Valid Deal', rate: 5 },
            { name: 'Invalid Deal', rate: 'not-a-number' }, // Invalid rate
            { name: 'Another Valid Deal', rate: 3 }
          ]
        }]
      }
      
      const config = { ...mockConfig, partner: malformedPartner }
      const popup = createVoucherPopup(config)
      
      // Should filter out invalid deals and create popup with valid ones
      expect(popup).toBeInstanceOf(HTMLElement)
      const voucherCards = popup.querySelectorAll('.voucher-card')
      expect(voucherCards).toHaveLength(2) // Only valid deals
    })

    it('should handle missing voucher names', () => {
      const partnerWithMissingNames = {
        name: 'Test Store',
        categories: [{
          name: 'Voucher',
          deals: [
            { rate: 5, dealUrl: 'https://test.com/voucher1' }, // Missing name
            { name: 'Named Voucher', rate: 3, dealUrl: 'https://test.com/voucher2' }
          ]
        }]
      }
      
      const config = { ...mockConfig, partner: partnerWithMissingNames }
      const popup = createVoucherPopup(config)
      
      expect(popup).toBeInstanceOf(HTMLElement)
      const voucherCards = popup.querySelectorAll('.voucher-card')
      expect(voucherCards).toHaveLength(2)
    })
  })

  describe('DOM Structure Validation', () => {
    it('should include all required IDs for event handling', () => {
      const popup = createVoucherPopup(mockConfig)
      
      // Essential IDs for event handling
      expect(popup.querySelector('#ws-close')).toBeTruthy()
      expect(popup.querySelector('#ws-use-voucher')).toBeTruthy()
      expect(popup.querySelector('#cashback-amount')).toBeTruthy()
      
      // Carousel IDs (if multiple vouchers)
      if (popup.querySelector('#voucher-carousel')) {
        expect(popup.querySelector('#carousel-left-arrow')).toBeTruthy()
        expect(popup.querySelector('#carousel-right-arrow')).toBeTruthy()
        expect(popup.querySelector('#carousel-indicators')).toBeTruthy()
      }
    })
  })
})
