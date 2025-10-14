import { describe, it, expect } from 'vitest'
import type { 
  Voucher, 
  PopupAssets, 
  VoucherTranslations, 
  VoucherPopupConfig, 
  PopupState, 
  StyleObject 
} from '../voucher-popup-types'

describe('Voucher Popup Types', () => {
  describe('Voucher interface', () => {
    it('should accept valid voucher object', () => {
      const voucher: Voucher = {
        name: 'Test Voucher',
        cashbackRate: 5,
        imageUrl: 'https://test.com/image.jpg',
        url: 'https://test.com/voucher'
      }

      expect(voucher.name).toBe('Test Voucher')
      expect(voucher.cashbackRate).toBe(5)
      expect(voucher.imageUrl).toBe('https://test.com/image.jpg')
      expect(voucher.url).toBe('https://test.com/voucher')
    })

    it('should accept voucher with only required fields', () => {
      const voucher: Voucher = {
        name: 'Minimal Voucher',
        cashbackRate: 3
      }

      expect(voucher.name).toBe('Minimal Voucher')
      expect(voucher.cashbackRate).toBe(3)
      expect(voucher.imageUrl).toBeUndefined()
      expect(voucher.url).toBeUndefined()
    })

    it('should accept voucher with zero cashback rate', () => {
      const voucher: Voucher = {
        name: 'Zero Cashback Voucher',
        cashbackRate: 0
      }

      expect(voucher.cashbackRate).toBe(0)
    })

    it('should accept voucher with high cashback rate', () => {
      const voucher: Voucher = {
        name: 'High Cashback Voucher',
        cashbackRate: 15.5
      }

      expect(voucher.cashbackRate).toBe(15.5)
    })
  })

  describe('PopupAssets interface', () => {
    it('should accept complete assets object', () => {
      const assets: PopupAssets = {
        uspIconUrl: 'https://test.com/usp-icon.png',
        wsLogoUrl: 'https://test.com/ws-logo.png',
        externalIconUrl: 'https://test.com/external-icon.png',
        paymentIconUrls: [
          'https://test.com/visa.png',
          'https://test.com/mastercard.png',
          'https://test.com/paypal.png'
        ]
      }

      expect(assets.uspIconUrl).toBe('https://test.com/usp-icon.png')
      expect(assets.wsLogoUrl).toBe('https://test.com/ws-logo.png')
      expect(assets.externalIconUrl).toBe('https://test.com/external-icon.png')
      expect(assets.paymentIconUrls).toHaveLength(3)
    })

    it('should accept empty assets object', () => {
      const assets: PopupAssets = {}

      expect(assets.uspIconUrl).toBeUndefined()
      expect(assets.wsLogoUrl).toBeUndefined()
      expect(assets.externalIconUrl).toBeUndefined()
      expect(assets.paymentIconUrls).toBeUndefined()
    })

    it('should accept assets with only some fields', () => {
      const assets: PopupAssets = {
        wsLogoUrl: 'https://test.com/ws-logo.png',
        paymentIconUrls: ['https://test.com/visa.png']
      }

      expect(assets.wsLogoUrl).toBe('https://test.com/ws-logo.png')
      expect(assets.paymentIconUrls).toHaveLength(1)
      expect(assets.uspIconUrl).toBeUndefined()
      expect(assets.externalIconUrl).toBeUndefined()
    })

    it('should accept empty payment icon URLs array', () => {
      const assets: PopupAssets = {
        paymentIconUrls: []
      }

      expect(assets.paymentIconUrls).toHaveLength(0)
    })
  })

  describe('VoucherTranslations interface', () => {
    it('should accept complete translations object', () => {
      const translations: VoucherTranslations = {
        purchaseAmount: 'Purchase amount',
        cashbackText: "You'll get",
        cashbackSuffix: 'of cashback',
        viewDetails: 'View voucher details',
        instructions: 'Buy the voucher at Woolsocks.eu and put the vouchercode in the field at checkout.'
      }

      expect(translations.purchaseAmount).toBe('Purchase amount')
      expect(translations.cashbackText).toBe("You'll get")
      expect(translations.cashbackSuffix).toBe('of cashback')
      expect(translations.viewDetails).toBe('View voucher details')
      expect(translations.instructions).toBe('Buy the voucher at Woolsocks.eu and put the vouchercode in the field at checkout.')
    })

    it('should accept empty translations object', () => {
      const translations: VoucherTranslations = {}

      expect(translations.purchaseAmount).toBeUndefined()
      expect(translations.cashbackText).toBeUndefined()
      expect(translations.cashbackSuffix).toBeUndefined()
      expect(translations.viewDetails).toBeUndefined()
      expect(translations.instructions).toBeUndefined()
    })

    it('should accept translations with only some fields', () => {
      const translations: VoucherTranslations = {
        purchaseAmount: 'Purchase amount',
        viewDetails: 'View voucher details'
      }

      expect(translations.purchaseAmount).toBe('Purchase amount')
      expect(translations.viewDetails).toBe('View voucher details')
      expect(translations.cashbackText).toBeUndefined()
      expect(translations.cashbackSuffix).toBeUndefined()
      expect(translations.instructions).toBeUndefined()
    })

    it('should accept empty string translations', () => {
      const translations: VoucherTranslations = {
        purchaseAmount: '',
        cashbackText: '',
        cashbackSuffix: '',
        viewDetails: '',
        instructions: ''
      }

      expect(translations.purchaseAmount).toBe('')
      expect(translations.cashbackText).toBe('')
      expect(translations.cashbackSuffix).toBe('')
      expect(translations.viewDetails).toBe('')
      expect(translations.instructions).toBe('')
    })
  })

  describe('VoucherPopupConfig interface', () => {
    it('should accept complete config object', () => {
      const partner = { name: 'Test Store', cashbackRate: 4 }
      const assets: PopupAssets = { wsLogoUrl: 'https://test.com/logo.png' }
      const translations: VoucherTranslations = { purchaseAmount: 'Purchase amount' }

      const config: VoucherPopupConfig = {
        partner,
        checkoutTotal: 100.50,
        assets,
        translations
      }

      expect(config.partner).toBe(partner)
      expect(config.checkoutTotal).toBe(100.50)
      expect(config.assets).toBe(assets)
      expect(config.translations).toBe(translations)
    })

    it('should accept config with zero checkout total', () => {
      const config: VoucherPopupConfig = {
        partner: { name: 'Test Store' },
        checkoutTotal: 0,
        assets: {},
        translations: {}
      }

      expect(config.checkoutTotal).toBe(0)
    })

    it('should accept config with large checkout total', () => {
      const config: VoucherPopupConfig = {
        partner: { name: 'Test Store' },
        checkoutTotal: 9999.99,
        assets: {},
        translations: {}
      }

      expect(config.checkoutTotal).toBe(9999.99)
    })

    it('should accept config with negative checkout total', () => {
      const config: VoucherPopupConfig = {
        partner: { name: 'Test Store' },
        checkoutTotal: -50.25,
        assets: {},
        translations: {}
      }

      expect(config.checkoutTotal).toBe(-50.25)
    })
  })

  describe('PopupState interface', () => {
    it('should accept complete state object', () => {
      const state: PopupState = {
        selectedVoucherIndex: 2,
        position: {
          top: '20px',
          bottom: 'auto',
          left: 'auto',
          right: '20px'
        },
        isMinimized: true
      }

      expect(state.selectedVoucherIndex).toBe(2)
      expect(state.position.top).toBe('20px')
      expect(state.position.bottom).toBe('auto')
      expect(state.position.left).toBe('auto')
      expect(state.position.right).toBe('20px')
      expect(state.isMinimized).toBe(true)
    })

    it('should accept state with only required fields', () => {
      const state: PopupState = {
        selectedVoucherIndex: 0,
        position: {},
        isMinimized: false
      }

      expect(state.selectedVoucherIndex).toBe(0)
      expect(state.position).toEqual({})
      expect(state.isMinimized).toBe(false)
    })

    it('should accept state with partial position', () => {
      const state: PopupState = {
        selectedVoucherIndex: 1,
        position: {
          bottom: '20px',
          right: '20px'
        },
        isMinimized: false
      }

      expect(state.selectedVoucherIndex).toBe(1)
      expect(state.position.bottom).toBe('20px')
      expect(state.position.right).toBe('20px')
      expect(state.position.top).toBeUndefined()
      expect(state.position.left).toBeUndefined()
      expect(state.isMinimized).toBe(false)
    })

    it('should accept state with negative voucher index', () => {
      const state: PopupState = {
        selectedVoucherIndex: -1,
        position: {},
        isMinimized: false
      }

      expect(state.selectedVoucherIndex).toBe(-1)
    })

    it('should accept state with large voucher index', () => {
      const state: PopupState = {
        selectedVoucherIndex: 999,
        position: {},
        isMinimized: false
      }

      expect(state.selectedVoucherIndex).toBe(999)
    })
  })

  describe('StyleObject interface', () => {
    it('should accept style object with string values', () => {
      const styles: StyleObject = {
        position: 'fixed',
        top: '20px',
        left: '20px',
        backgroundColor: 'red',
        fontSize: '16px'
      }

      expect(styles.position).toBe('fixed')
      expect(styles.top).toBe('20px')
      expect(styles.left).toBe('20px')
      expect(styles.backgroundColor).toBe('red')
      expect(styles.fontSize).toBe('16px')
    })

    it('should accept style object with numeric values', () => {
      const styles: StyleObject = {
        width: 100,
        height: 200,
        zIndex: 999,
        opacity: 0.5
      }

      expect(styles.width).toBe(100)
      expect(styles.height).toBe(200)
      expect(styles.zIndex).toBe(999)
      expect(styles.opacity).toBe(0.5)
    })

    it('should accept style object with mixed string and numeric values', () => {
      const styles: StyleObject = {
        position: 'absolute',
        top: 10,
        left: '20px',
        width: 300,
        height: '200px',
        zIndex: 1000
      }

      expect(styles.position).toBe('absolute')
      expect(styles.top).toBe(10)
      expect(styles.left).toBe('20px')
      expect(styles.width).toBe(300)
      expect(styles.height).toBe('200px')
      expect(styles.zIndex).toBe(1000)
    })

    it('should accept empty style object', () => {
      const styles: StyleObject = {}

      expect(Object.keys(styles)).toHaveLength(0)
    })

    it('should accept style object with CSS custom properties', () => {
      const styles: StyleObject = {
        '--custom-color': '#ff0000',
        '--custom-size': '20px',
        '--custom-number': 42
      }

      expect(styles['--custom-color']).toBe('#ff0000')
      expect(styles['--custom-size']).toBe('20px')
      expect(styles['--custom-number']).toBe(42)
    })

    it('should accept style object with vendor prefixes', () => {
      const styles: StyleObject = {
        WebkitTransform: 'rotate(45deg)',
        MozTransform: 'rotate(45deg)',
        msTransform: 'rotate(45deg)',
        transform: 'rotate(45deg)'
      }

      expect(styles.WebkitTransform).toBe('rotate(45deg)')
      expect(styles.MozTransform).toBe('rotate(45deg)')
      expect(styles.msTransform).toBe('rotate(45deg)')
      expect(styles.transform).toBe('rotate(45deg)')
    })
  })

  describe('Type Compatibility', () => {
    it('should allow VoucherPopupConfig to be created with all interfaces', () => {
      const voucher: Voucher = {
        name: 'Test Voucher',
        cashbackRate: 5,
        imageUrl: 'https://test.com/image.jpg',
        url: 'https://test.com/voucher'
      }

      const assets: PopupAssets = {
        uspIconUrl: 'https://test.com/usp-icon.png',
        wsLogoUrl: 'https://test.com/ws-logo.png',
        externalIconUrl: 'https://test.com/external-icon.png',
        paymentIconUrls: ['https://test.com/visa.png']
      }

      const translations: VoucherTranslations = {
        purchaseAmount: 'Purchase amount',
        cashbackText: "You'll get",
        cashbackSuffix: 'of cashback',
        viewDetails: 'View voucher details',
        instructions: 'Buy the voucher at Woolsocks.eu and put the vouchercode in the field at checkout.'
      }

      const config: VoucherPopupConfig = {
        partner: { name: 'Test Store', cashbackRate: 4, vouchers: [voucher] },
        checkoutTotal: 100,
        assets,
        translations
      }

      expect(config).toBeDefined()
      expect(config.partner.name).toBe('Test Store')
      expect(config.checkoutTotal).toBe(100)
      expect(config.assets).toBe(assets)
      expect(config.translations).toBe(translations)
    })

    it('should allow PopupState to be created with StyleObject', () => {
      const position: StyleObject = {
        top: '20px',
        right: '20px'
      }

      const state: PopupState = {
        selectedVoucherIndex: 0,
        position: {
          top: position.top as string,
          right: position.right as string
        },
        isMinimized: false
      }

      expect(state.position.top).toBe('20px')
      expect(state.position.right).toBe('20px')
    })
  })
})
