// Debug script to test checkout detection on any website
// Run this in the DevTools Console (F12) on a checkout/cart page

(async () => {
  console.log('🔍 Woolsocks Checkout Detection Debugger\n');
  
  const hostname = window.location.hostname;
  const url = window.location.href;
  const pathname = window.location.pathname;
  
  console.log('📍 Current Page:');
  console.log('  Hostname:', hostname);
  console.log('  URL:', url);
  console.log('  Pathname:', pathname);
  console.log('');
  
  // Check if script is injected
  console.log('💉 Script Injection Check:');
  const wsCleanup = window.__woolsocksCleanup;
  console.log('  Content script loaded:', !!wsCleanup ? '✅ YES' : '❌ NO');
  console.log('');
  
  // Check URL patterns
  console.log('🔗 URL Pattern Check:');
  const urlKeywords = ['checkout', 'cart', 'basket', 'bag', 'order', 'payment', 'betalen', 'kassa', 'winkelmand', 'winkelwagen'];
  urlKeywords.forEach(kw => {
    if (pathname.includes(kw)) {
      console.log(`  ✅ Found "${kw}" in path`);
    }
  });
  
  // Check DOM elements
  console.log('');
  console.log('🎯 DOM Element Check:');
  const checkoutSelectors = [
    '[class*="checkout"]',
    '[class*="cart"]',
    '[class*="order"]',
    '[class*="total"]',
    '[id*="checkout"]',
    '[id*="cart"]'
  ];
  
  checkoutSelectors.forEach(sel => {
    const found = document.querySelectorAll(sel).length;
    if (found > 0) {
      console.log(`  ✅ ${sel}: ${found} elements`);
    }
  });
  
  // Check for total amount
  console.log('');
  console.log('💰 Total Amount Detection:');
  
  const totalSelectors = [
    '[class*="total"]',
    '[id*="total"]',
    '[data-testid*="total"]'
  ];
  
  let foundAmounts = [];
  
  totalSelectors.forEach(sel => {
    const elements = document.querySelectorAll(sel);
    elements.forEach(el => {
      const text = el.textContent || '';
      const euroMatch = text.match(/€\s*([\d.,]+)/);
      if (euroMatch) {
        foundAmounts.push({
          selector: sel,
          text: text.trim().substring(0, 50),
          amount: euroMatch[0]
        });
      }
    });
  });
  
  if (foundAmounts.length > 0) {
    console.log('  ✅ Found amounts:');
    foundAmounts.slice(0, 5).forEach(item => {
      console.log(`    ${item.amount} - "${item.text}"`);
    });
  } else {
    console.log('  ❌ No amounts found with standard selectors');
    
    // Try body text search
    const bodyText = document.body.textContent || '';
    const allEuros = bodyText.match(/€\s*[\d.,]+/g);
    if (allEuros) {
      console.log(`  ℹ️  Found ${allEuros.length} € amounts in page text:`, allEuros.slice(0, 5));
    }
  }
  
  // Check if voucher was dismissed
  console.log('');
  console.log('🚫 Dismissal Check:');
  try {
    const raw = window.localStorage.getItem('__wsVoucherDismissals');
    if (raw) {
      const map = JSON.parse(raw);
      const until = map[hostname];
      if (until && Date.now() < until) {
        const remaining = Math.round((until - Date.now()) / 1000);
        console.log(`  ⏳ Voucher dismissed for ${remaining}s`);
      } else {
        console.log('  ✅ Not dismissed');
      }
    } else {
      console.log('  ✅ Not dismissed');
    }
  } catch (e) {
    console.log('  ✅ Not dismissed');
  }
  
  // Test API merchant lookup
  console.log('');
  console.log('🔌 API Merchant Lookup:');
  try {
    const resp = await chrome.runtime.sendMessage({ 
      type: 'CHECK_MERCHANT_SUPPORT', 
      hostname: hostname 
    });
    console.log('  Response:', resp);
    
    if (resp.supported) {
      console.log('  ✅ Merchant supported');
      console.log('  Partner name:', resp.partner?.name);
      console.log('  Voucher available:', resp.partner?.voucherAvailable ? '✅ YES' : '❌ NO');
      console.log('  Cashback rate:', resp.partner?.cashbackRate + '%');
    } else {
      console.log('  ❌ Merchant not found in Woolsocks database');
    }
  } catch (e) {
    console.log('  ❌ Error:', e.message);
  }
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 SUMMARY - What needs to be ✅ for voucher to show:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  1. Content script loaded: ' + (!!wsCleanup ? '✅' : '❌'));
  console.log('  2. Checkout URL detected: ' + (urlKeywords.some(k => pathname.includes(k)) ? '✅' : '❌'));
  console.log('  3. Total amount found: ' + (foundAmounts.length > 0 ? '✅' : '❌'));
  console.log('  4. Not dismissed: ✅ (check above)');
  console.log('  5. Merchant supported: ⏳ (check API response above)');
  console.log('  6. Has vouchers: ⏳ (check voucherAvailable above)');
  console.log('');
  console.log('💡 Next Steps:');
  console.log('  - If script not loaded (❌): Check CSP errors in Console');
  console.log('  - If checkout not detected (❌): Add custom detector for this site');
  console.log('  - If amount not found (❌): Inspect DOM to find correct selector');
  console.log('  - If merchant not supported (❌): Check Woolsocks backend');
  console.log('  - If no vouchers (❌): Add vouchers to this merchant in backend');
})();
