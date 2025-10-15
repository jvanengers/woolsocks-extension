import { describe, it, expect, beforeEach } from 'vitest'
import { applyStyles, popupStyles } from '../voucher-popup-styles'

describe('Voucher Popup Styles', () => {
  let testElement: HTMLElement

  beforeEach(() => {
    testElement = document.createElement('div')
  })

  describe('applyStyles', () => {
    it('should apply styles to an element', () => {
      const styles = {
        position: 'fixed',
        top: '20px',
        left: '20px',
        backgroundColor: 'red',
        fontSize: '16px'
      }

      applyStyles(testElement, styles)

      expect(testElement.style.position).toBe('fixed')
      expect(testElement.style.top).toBe('20px')
      expect(testElement.style.left).toBe('20px')
      expect(testElement.style.backgroundColor).toBe('red')
      expect(testElement.style.fontSize).toBe('16px')
    })

    it('should handle empty styles object', () => {
      applyStyles(testElement, {})
      
      // Should not throw and element should remain unchanged
      expect(testElement.style.position).toBe('')
    })

    it('should override existing styles', () => {
      // Set initial styles
      testElement.style.position = 'absolute'
      testElement.style.top = '10px'

      const newStyles = {
        position: 'fixed',
        top: '20px'
      }

      applyStyles(testElement, newStyles)

      expect(testElement.style.position).toBe('fixed')
      expect(testElement.style.top).toBe('20px')
    })

    it('should handle numeric values', () => {
      const styles = {
        width: 100,
        height: 200,
        zIndex: 999
      }

      applyStyles(testElement, styles)

      expect(testElement.style.width).toBe('100px')
      expect(testElement.style.height).toBe('200px')
      expect(testElement.style.zIndex).toBe('999')
    })

    it('should handle CSS custom properties', () => {
      const styles = {
        '--custom-color': '#ff0000',
        '--custom-size': '20px'
      }

      applyStyles(testElement, styles)

      expect((testElement.style as any)['--custom-color']).toBe('#ff0000')
      expect((testElement.style as any)['--custom-size']).toBe('20px')
    })
  })

  describe('popupStyles', () => {
    it('should have all required style objects', () => {
      expect(popupStyles.container).toBeDefined()
      expect(popupStyles.minimized).toBeDefined()
      expect(popupStyles.header).toBeDefined()
      expect(popupStyles.title).toBeDefined()
      expect(popupStyles.closeButton).toBeDefined()
      expect(popupStyles.content).toBeDefined()
      expect(popupStyles.amountSection).toBeDefined()
      expect(popupStyles.amountLabel).toBeDefined()
      expect(popupStyles.amountValue).toBeDefined()
      expect(popupStyles.carousel).toBeDefined()
      expect(popupStyles.carouselContainer).toBeDefined()
      expect(popupStyles.voucherCard).toBeDefined()
      expect(popupStyles.voucherImage).toBeDefined()
      expect(popupStyles.voucherInfo).toBeDefined()
      expect(popupStyles.cashbackBadge).toBeDefined()
      expect(popupStyles.voucherName).toBeDefined()
      expect(popupStyles.singleVoucher).toBeDefined()
      expect(popupStyles.singleVoucherContent).toBeDefined()
      expect(popupStyles.singleVoucherImage).toBeDefined()
      expect(popupStyles.carouselNavigation).toBeDefined()
      expect(popupStyles.carouselArrow).toBeDefined()
      expect(popupStyles.carouselIndicators).toBeDefined()
      expect(popupStyles.carouselDot).toBeDefined()
      expect(popupStyles.cashbackSection).toBeDefined()
      expect(popupStyles.cashbackText).toBeDefined()
      expect(popupStyles.cashbackAmount).toBeDefined()
      expect(popupStyles.actionButton).toBeDefined()
      expect(popupStyles.uspsSection).toBeDefined()
      expect(popupStyles.uspItem).toBeDefined()
      expect(popupStyles.uspText).toBeDefined()
      expect(popupStyles.paymentSection).toBeDefined()
      expect(popupStyles.paymentIcon).toBeDefined()
      expect(popupStyles.instructions).toBeDefined()
      expect(popupStyles.logoSection).toBeDefined()
      expect(popupStyles.minimizedIcon).toBeDefined()
    })

    it('should have container styles with required properties', () => {
      const containerStyles = popupStyles.container
      
      expect(containerStyles.position).toBe('fixed')
      expect(containerStyles.bottom).toBe('20px')
      expect(containerStyles.right).toBe('20px')
      expect(containerStyles.width).toBe('380px')
      expect(containerStyles.zIndex).toBe('2147483647')
    })

    it('should have minimized styles with required properties', () => {
      const minimizedStyles = popupStyles.minimized
      
      expect(minimizedStyles.width).toBe('60px')
      expect(minimizedStyles.height).toBe('60px')
      expect(minimizedStyles.borderRadius).toBe('50%')
      expect(minimizedStyles.display).toBe('flex')
    })

    it('should have carousel styles with required properties', () => {
      const carouselStyles = popupStyles.carousel
      const carouselContainerStyles = popupStyles.carouselContainer
      const voucherCardStyles = popupStyles.voucherCard
      
      expect(carouselStyles.display).toBe('flex')
      expect(carouselStyles.flexDirection).toBe('column')
      
      expect(carouselContainerStyles.display).toBe('flex')
      expect(carouselContainerStyles.overflowX).toBe('hidden')
      
      expect(voucherCardStyles.minWidth).toBe('259px')
      expect(voucherCardStyles.background).toBe('white')
      expect(voucherCardStyles.borderRadius).toBe('8px')
    })

    it('should have proper typography styles', () => {
      const titleStyles = popupStyles.title
      const amountLabelStyles = popupStyles.amountLabel
      const amountValueStyles = popupStyles.amountValue
      
      expect(titleStyles.fontSize).toBe('16px')
      expect(titleStyles.fontWeight).toBe('700')
      
      expect(amountLabelStyles.fontSize).toBe('12px')
      expect(amountLabelStyles.fontWeight).toBe('400')
      
      expect(amountValueStyles.fontSize).toBe('16px')
      expect(amountValueStyles.fontWeight).toBe('700')
    })

    it('should have proper color scheme', () => {
      const titleStyles = popupStyles.title
      const amountLabelStyles = popupStyles.amountLabel
      const cashbackTextStyles = popupStyles.cashbackText
      
      expect(titleStyles.color).toBe('#100B1C')
      expect(amountLabelStyles.color).toBe('#100B1C')
      expect(cashbackTextStyles.color).toBe('#8564FF')
    })

    it('should have proper spacing and layout', () => {
      const headerStyles = popupStyles.header
      const amountSectionStyles = popupStyles.amountSection
      const carouselStyles = popupStyles.carousel
      
      expect(headerStyles.display).toBe('flex')
      expect(headerStyles.justifyContent).toBe('space-between')
      expect(headerStyles.marginBottom).toBe('16px')
      
      expect(amountSectionStyles.marginBottom).toBe('16px')
      expect(amountSectionStyles.display).toBe('flex')
      expect(amountSectionStyles.flexDirection).toBe('column')
      
      expect(carouselStyles.gap).toBe('8px')
    })

    it('should have proper button styles', () => {
      const closeButtonStyles = popupStyles.closeButton
      const actionButtonStyles = popupStyles.actionButton
      
      expect(closeButtonStyles.background).toBe('none')
      expect(closeButtonStyles.border).toBe('none')
      expect(closeButtonStyles.cursor).toBe('pointer')
      
      expect(actionButtonStyles.display).toBe('flex')
      expect(actionButtonStyles.width).toBe('100%')
      expect(actionButtonStyles.height).toBe('48px')
      expect(actionButtonStyles.cursor).toBe('pointer')
    })

    it('should have proper image styles', () => {
      const voucherImageStyles = popupStyles.voucherImage
      const singleVoucherImageStyles = popupStyles.singleVoucherImage
      
      expect(voucherImageStyles.width).toBe('111px')
      expect(voucherImageStyles.height).toBe('74px')
      expect(voucherImageStyles.borderRadius).toBe('8px')
      
      expect(singleVoucherImageStyles.width).toBe('72px')
      expect(singleVoucherImageStyles.height).toBe('48px')
    })

    it('should have proper carousel navigation styles', () => {
      const carouselArrowStyles = popupStyles.carouselArrow
      const carouselDotStyles = popupStyles.carouselDot
      
      expect(carouselArrowStyles.width).toBe('24px')
      expect(carouselArrowStyles.height).toBe('24px')
      expect(carouselArrowStyles.cursor).toBe('pointer')
      
      expect(carouselDotStyles.width).toBe('6px')
      expect(carouselDotStyles.height).toBe('6px')
      expect(carouselDotStyles.cursor).toBe('pointer')
    })
  })

  describe('Style Integration', () => {
    it('should apply container styles correctly', () => {
      applyStyles(testElement, popupStyles.container)
      
      expect(testElement.style.position).toBe('fixed')
      expect(testElement.style.bottom).toBe('20px')
      expect(testElement.style.right).toBe('20px')
      expect(testElement.style.width).toBe('380px')
      expect(testElement.style.maxHeight).toBe('80vh')
      expect(testElement.style.borderRadius).toBe('16px')
      expect(testElement.style.zIndex).toBe('2147483647')
    })

    it('should apply minimized styles correctly', () => {
      applyStyles(testElement, popupStyles.minimized)
      
      expect(testElement.style.width).toBe('60px')
      expect(testElement.style.height).toBe('60px')
      expect(testElement.style.padding).toBe('0px')
      expect(testElement.style.borderRadius).toBe('50%')
      expect(testElement.style.display).toBe('flex')
      expect(testElement.style.alignItems).toBe('center')
      expect(testElement.style.justifyContent).toBe('center')
      expect(testElement.style.cursor).toBe('pointer')
    })

    it('should apply carousel styles correctly', () => {
      applyStyles(testElement, popupStyles.carousel)
      
      expect(testElement.style.display).toBe('flex')
      expect(testElement.style.flexDirection).toBe('column')
      expect(testElement.style.gap).toBe('8px')
      expect(testElement.style.marginBottom).toBe('16px')
    })

    it('should apply voucher card styles correctly', () => {
      applyStyles(testElement, popupStyles.voucherCard)
      
      expect(testElement.style.minWidth).toBe('259px')
      expect(testElement.style.background).toBe('white')
      expect(testElement.style.borderRadius).toBe('8px')
      expect(testElement.style.padding).toBe('16px')
      expect(testElement.style.display).toBe('flex')
      expect(testElement.style.gap).toBe('16px')
      expect(testElement.style.alignItems).toBe('flex-start')
      expect(testElement.style.cursor).toBe('pointer')
    })
  })
})
