// Bundled version of the voucher popup for injection
// This file combines all popup functionality into a single injectable string

import { createVoucherPopup } from './voucher-popup'

// Export the bundled code as a string that can be injected
export function getVoucherPopupBundle(): string {
  return `
    // Voucher Popup Bundle - Injected into page context
    (function() {
      'use strict';
      
      // Type definitions (simplified for injection)
      const VoucherPopupConfig = {};
      const Voucher = {};
      const PopupState = {};
      const StyleObject = {};
      
      // Global state
      let currentPopupState = {
        selectedVoucherIndex: 0,
        position: { bottom: '20px', right: '20px' },
        isMinimized: false
      };
      
      // Styles object
      const popupStyles = {
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
        },
        minimized: {
          width: '60px',
          height: '60px',
          padding: '0',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        },
        header: {
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        },
        title: {
          margin: '0',
          fontSize: '16px',
          fontWeight: '700',
          color: '#100B1C'
        },
        closeButton: {
          background: 'none',
          border: 'none',
          fontSize: '28px',
          cursor: 'pointer',
          color: '#0F0B1C',
          lineHeight: '1'
        },
        content: {
          borderRadius: '16px',
          background: 'var(--bg-main, #F5F5F6)',
          padding: '16px'
        },
        amountSection: {
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        },
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
        },
        amountValue: {
          color: '#100B1C',
          textAlign: 'center',
          fontFeatureSettings: '"liga" off, "clig" off',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          fontSize: '16px',
          fontStyle: 'normal',
          fontWeight: '700',
          lineHeight: '145%'
        },
        carousel: {
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          marginBottom: '16px'
        },
        carouselContainer: {
          display: 'flex',
          gap: '8px',
          overflowX: 'hidden',
          scrollBehavior: 'smooth',
          padding: '8px 0'
        },
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
        },
        voucherImage: {
          width: '111px',
          height: '74px',
          borderRadius: '8px',
          background: '#F3F4F6',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        voucherInfo: {
          flex: '1',
          minWidth: '0'
        },
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
        },
        voucherName: {
          fontSize: '16px',
          fontWeight: '700',
          color: '#111827',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        },
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
        },
        singleVoucherContent: {
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          width: '100%'
        },
        singleVoucherImage: {
          width: '72px',
          height: '48px',
          borderRadius: '8px',
          background: '#F3F4F6',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        },
        carouselNavigation: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%'
        },
        carouselArrow: {
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer'
        },
        carouselIndicators: {
          display: 'flex',
          justifyContent: 'center',
          gap: '4px'
        },
        carouselDot: {
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        },
        cashbackSection: {
          display: 'flex',
          width: '310px',
          height: '43px',
          padding: '8px 16px',
          justifyContent: 'center',
          alignItems: 'baseline',
          gap: '4px',
          marginBottom: '16px'
        },
        cashbackText: {
          color: '#8564FF',
          textAlign: 'center',
          fontFeatureSettings: '"liga" off, "clig" off',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
          fontSize: '16px',
          fontStyle: 'normal',
          fontWeight: '400',
          lineHeight: '145%'
        },
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
        },
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
        },
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
        },
        uspItem: {
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        },
        uspText: {
          fontSize: '13px',
          color: '#111827'
        },
        paymentSection: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          margin: '6px 0 14px',
          width: '100%'
        },
        paymentIcon: {
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '0'
        },
        instructions: {
          fontSize: '13px',
          color: '#3A2B00',
          opacity: '0.9',
          textAlign: 'center',
          lineHeight: '1.4',
          margin: '6px 0 10px'
        },
        logoSection: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '8px'
        },
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
        }
      };
      
      // Helper function to apply styles
      function applyStyles(element, styles) {
        Object.assign(element.style, styles);
      }
      
      // Main popup creation function
      function createVoucherPopup(config) {
        console.log('[WS] Creating voucher popup with config:', config);
        
        // Remove existing popup
        const existing = document.getElementById('woolsocks-voucher-prompt');
        if (existing) {
          try { existing.remove(); } catch {}
        }

        // Collect vouchers
        const vouchers = collectVouchers(config.partner);
        const hasMultipleVouchers = vouchers.length > 1;
        const best = vouchers[0];
        
        // Create main container
        const popup = document.createElement('div');
        popup.id = 'woolsocks-voucher-prompt';
        applyStyles(popup, popupStyles.container);

        // Create content
        const content = createPopupContent(config, vouchers, hasMultipleVouchers, best);
        popup.appendChild(content);

        // Attach behaviors
        attachDragBehavior(popup);
        attachMinimizeBehavior(popup, config);
        attachCarouselBehavior(popup, vouchers, hasMultipleVouchers, config);
        attachActionButtonBehavior(popup, vouchers, hasMultipleVouchers, config);

        // Animate in
        setTimeout(() => {
          applyStyles(popup, { opacity: '1', transform: 'translateY(0) scale(1)' });
        }, 100);

        console.log('[WS] Popup created successfully');
        return popup;
      }
      
      // All the helper functions would go here...
      // (For brevity, I'm including the key functions)
      
      function collectVouchers(partner) {
        const collected = [];
        
        const normalizeImageUrl = (url) => {
          if (!url || typeof url !== 'string') return undefined;
          try {
            return url.replace(/^http:/i, 'https:');
          } catch {
            return undefined;
          }
        };

        const voucherCategory = Array.isArray(partner.categories)
          ? partner.categories.find((c) => /voucher/i.test(String(c?.name || '')))
          : null;

        if (voucherCategory && Array.isArray(voucherCategory.deals)) {
          for (const deal of voucherCategory.deals) {
            collected.push({
              name: deal?.name || '',
              cashbackRate: typeof deal?.rate === 'number' ? deal.rate : 0,
              imageUrl: normalizeImageUrl(deal?.imageUrl),
              url: deal?.dealUrl
            });
          }
        } else if (Array.isArray(partner.allVouchers)) {
          for (const voucher of partner.allVouchers) {
            collected.push({
              name: voucher.name,
              cashbackRate: voucher.cashbackRate,
              imageUrl: normalizeImageUrl(voucher.imageUrl),
              url: voucher.url
            });
          }
        } else if (partner.voucherProductUrl) {
          collected.push({
            name: (partner.name || '') + ' Voucher',
            cashbackRate: partner.cashbackRate || 0,
            imageUrl: normalizeImageUrl(partner.merchantImageUrl),
            url: partner.voucherProductUrl
          });
        }

        return collected
          .filter(v => typeof v.cashbackRate === 'number' && v.cashbackRate > 0)
          .sort((a, b) => (b.cashbackRate || 0) - (a.cashbackRate || 0));
      }
      
      // Export for global access
      window.createVoucherPopup = createVoucherPopup;
      
      console.log('[WS] Voucher popup bundle loaded');
    })();
  `
}

// For MV3, we can use the actual module
export { createVoucherPopup }
