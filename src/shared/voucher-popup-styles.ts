// Styles for the voucher popup module
import type { StyleObject } from './voucher-popup-types'

export function applyStyles(element: HTMLElement, styles: StyleObject): void {
  Object.entries(styles).forEach(([key, value]) => {
    if (typeof value === 'number') {
      // Convert numbers to pixel values for most CSS properties
      const pixelProperties = ['width', 'height', 'top', 'left', 'right', 'bottom', 'margin', 'padding', 'borderRadius', 'fontSize', 'lineHeight']
      if (pixelProperties.some(prop => key.includes(prop))) {
        ;(element.style as any)[key] = `${value}px`
      } else {
        ;(element.style as any)[key] = String(value)
      }
    } else {
      ;(element.style as any)[key] = String(value)
    }
  })
}

export const popupStyles = {
  container: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '380px',
    maxHeight: '80vh',
    overflowY: 'auto',
    borderRadius: '16px',
    border: '4px solid var(--brand, #FDC408)',
    background: 'var(--brand, #FDC408)',
    boxShadow: '-2px 2px 4px rgba(0, 0, 0, 0.08)',
    zIndex: '2147483647',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    opacity: '0',
    transform: 'translateY(10px) scale(0.95)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    cursor: 'move'
  } as StyleObject,

  minimized: {
    width: '60px',
    height: '60px',
    padding: '0',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  } as StyleObject,

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  } as StyleObject,

  title: {
    margin: '0',
    fontSize: '16px',
    fontWeight: '700',
    color: '#100B1C'
  } as StyleObject,

  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#0F0B1C',
    lineHeight: '1'
  } as StyleObject,

  content: {
    borderRadius: '16px',
    background: 'var(--bg-main, #F5F5F6)',
    padding: '16px'
  } as StyleObject,

  amountSection: {
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  } as StyleObject,

  amountLabel: {
    color: '#100B1C',
    textAlign: 'center',
    fontFeatureSettings: '"liga" off, "clig" off',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    fontSize: '12px',
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: '145%',
    letterSpacing: '0.15px'
  } as StyleObject,

  amountValue: {
    color: '#100B1C',
    textAlign: 'center',
    fontFeatureSettings: '"liga" off, "clig" off',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    fontSize: '16px',
    fontStyle: 'normal',
    fontWeight: '700',
    lineHeight: '145%'
  } as StyleObject,

  carousel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px'
  } as StyleObject,

  carouselContainer: {
    display: 'flex',
    gap: '8px',
    overflowX: 'hidden',
    scrollBehavior: 'smooth',
    padding: '8px 0'
  } as StyleObject,

  voucherCard: {
    minWidth: '259px',
    background: 'white',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    cursor: 'pointer',
    transition: 'transform 0.2s ease'
  } as StyleObject,

  voucherImage: {
    width: '111px',
    height: '74px',
    borderRadius: '8px',
    background: '#F3F4F6',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } as StyleObject,

  voucherInfo: {
    flex: '1',
    minWidth: '0'
  } as StyleObject,

  cashbackBadge: {
    display: 'flex',
    padding: '2px 4px',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '8px',
    borderRadius: '4px',
    background: '#ECEBED',
    fontSize: '13px',
    color: '#6B7280',
    marginBottom: '2px',
    width: 'fit-content'
  } as StyleObject,

  voucherName: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  } as StyleObject,

  singleVoucher: {
    display: 'flex',
    padding: '16px',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '16px',
    borderRadius: '8px',
    background: 'var(--bg-neutral, #FFF)',
    marginBottom: '16px'
  } as StyleObject,

  singleVoucherContent: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    width: '100%'
  } as StyleObject,

  singleVoucherImage: {
    width: '72px',
    height: '48px',
    borderRadius: '8px',
    background: '#F3F4F6',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  } as StyleObject,

  carouselNavigation: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  } as StyleObject,

  carouselArrow: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  } as StyleObject,

  carouselIndicators: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4px'
  } as StyleObject,

  carouselDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  } as StyleObject,

  cashbackSection: {
    display: 'flex',
    width: '310px',
    height: '43px',
    padding: '8px 16px',
    justifyContent: 'center',
    alignItems: 'baseline',
    gap: '4px',
    marginBottom: '16px'
  } as StyleObject,

  cashbackText: {
    color: '#8564FF',
    textAlign: 'center',
    fontFeatureSettings: '"liga" off, "clig" off',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    fontSize: '16px',
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: '145%'
  } as StyleObject,

  cashbackAmount: {
    display: 'flex',
    padding: '2px 4px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '6px',
    background: '#8564FF',
    color: '#FFF',
    textAlign: 'center',
    fontFeatureSettings: '"liga" off, "clig" off',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    fontSize: '16px',
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: '145%'
  } as StyleObject,

  actionButton: {
    display: 'flex',
    width: '100%',
    height: '48px',
    padding: '0 16px 0 24px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    borderRadius: '4px',
    background: 'var(--action-button-fill-bg-default, #211940)',
    color: 'var(--action-button-fill-content-default, #FFF)',
    border: 'none',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
    fontSize: '16px',
    fontStyle: 'normal',
    fontWeight: '500',
    lineHeight: '140%',
    textAlign: 'center',
    fontFeatureSettings: '"liga" off, "clig" off',
    cursor: 'pointer'
  } as StyleObject,

  uspsSection: {
    display: 'flex',
    width: '100%',
    padding: '16px',
    boxSizing: 'border-box',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: '8px',
    borderRadius: '8px',
    border: '1px solid var(--semantic-green-75, #B0F6D7)',
    background: 'rgba(255, 255, 255, 0.50)',
    margin: '12px 0'
  } as StyleObject,

  uspItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  } as StyleObject,

  uspText: {
    fontSize: '13px',
    color: '#111827'
  } as StyleObject,

  paymentSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    margin: '6px 0 14px',
    width: '100%'
  } as StyleObject,

  paymentIcon: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '0'
  } as StyleObject,

  instructions: {
    fontSize: '13px',
    color: '#3A2B00',
    opacity: '0.9',
    textAlign: 'center',
    lineHeight: '1.4',
    margin: '6px 0 10px'
  } as StyleObject,

  logoSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: '8px'
  } as StyleObject,

  minimizedIcon: {
    width: '40px',
    height: '40px',
    background: '#211940',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold'
  } as StyleObject
}
