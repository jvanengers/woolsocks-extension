// Debug script to test Zalando voucher scraping
async function debugZalandoVouchers() {
  try {
    console.log('=== DEBUG: Zalando Voucher Scraping ===')
    
    // Test the Zalando merchant page
    const merchantName = 'Zalando'
    const merchantUrls = [
      `https://woolsocks.eu/nl/cashback/ff80dbbf-2b3b-44d3-a8ff-d0e786c36e8c`,
      `https://woolsocks.eu/nl/cashback/${encodeURIComponent(merchantName.toLowerCase())}`,
      `https://woolsocks.eu/cashback/${encodeURIComponent(merchantName.toLowerCase())}`,
      `https://woolsocks.eu/nl/cashback/${encodeURIComponent(merchantName)}`,
      `https://woolsocks.eu/cashback/${encodeURIComponent(merchantName)}`
    ]
    
    for (const url of merchantUrls) {
      console.log(`\n--- Testing URL: ${url} ---`)
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'nl-NL,nl;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache'
          }
        })
        
        if (response.ok) {
          const html = await response.text()
          console.log(`✅ Response OK (${response.status})`)
          
          // Check if this is the right merchant page
          const merchantInAnyContext = merchantUrls.some(testUrl => {
            const testName = testUrl.split('/').pop()?.toLowerCase() || ''
            return html.toLowerCase().includes(testName) || 
                   html.toLowerCase().includes(merchantName.toLowerCase())
          })
          
          if (merchantInAnyContext) {
            console.log('✅ Found merchant context')
            
            // Look for voucher section
            const vouchersSection = html.match(/Vouchers\s*\|\s*cashback\s*of\s*pay\s*later[\s\S]*?(?=<h[1-6]|$)/i)
            
            if (vouchersSection && vouchersSection[0]) {
              console.log('✅ Found vouchers section')
              console.log('Vouchers section length:', vouchersSection[0].length)
              
              // Look for voucher URLs
              const voucherUrls = vouchersSection[0].match(/href="(\/nl\/giftcards-shop\/products\/[a-z0-9-]+)"/g) || []
              console.log(`Found ${voucherUrls.length} voucher URLs:`, voucherUrls)
              
              // Extract voucher details
              const vouchers = []
              for (const urlMatch of voucherUrls) {
                const urlMatchResult = urlMatch.match(/href="([^"]+)"/)
                if (!urlMatchResult) continue
                
                let url = urlMatchResult[1]
                if (url.startsWith('/')) {
                  url = `https://woolsocks.eu${url}`
                }
                
                const urlIndex = vouchersSection[0].indexOf(urlMatch)
                const contextStart = Math.max(0, urlIndex - 500)
                const contextEnd = Math.min(vouchersSection[0].length, urlIndex + 500)
                const context = vouchersSection[0].substring(contextStart, contextEnd)
                
                // Look for image
                let imageUrl = null
                const imagePatterns = [
                  /src="([^"]*\/[^"]*\.(?:jpg|jpeg|png|webp|svg)[^"]*)"/i,
                  /data-src="([^"]*\/[^"]*\.(?:jpg|jpeg|png|webp|svg)[^"]*)"/i,
                  /background-image:\s*url\(['"]?([^'"]*\/[^"]*\.(?:jpg|jpeg|png|webp|svg)[^'"]*)['"]?\)/i
                ]
                
                for (const pattern of imagePatterns) {
                  const match = context.match(pattern)
                  if (match) {
                    imageUrl = match[1]
                    if (imageUrl.startsWith('/')) {
                      imageUrl = `https://woolsocks.eu${imageUrl}`
                    } else if (!imageUrl.startsWith('http')) {
                      imageUrl = `https://woolsocks.eu/${imageUrl}`
                    }
                    break
                  }
                }
                
                // Look for name - updated patterns based on actual HTML structure
                let voucherName = null
                const namePatterns = [
                  /<span[^>]*>([^<]*Zalando[^<]*)<\/span>/i,
                  /<span[^>]*>([^<]*fashioncheque[^<]*)<\/span>/i,
                  /<span[^>]*>([^<]*Woolsocks All-in-One[^<]*)<\/span>/i,
                  /<span[^>]*>([^<]*All-in-One[^<]*)<\/span>/i,
                  /<span[^>]*>([^<]*Woolsocks[^<]*)<\/span>/i,
                  /<[^>]*>([^<]*zalando[^<]*)<\/[^>]*>/i,
                  /<[^>]*>([^<]*fashioncheque[^<]*)<\/[^>]*>/i,
                  /<[^>]*>([^<]*all-in-one[^<]*)<\/[^>]*>/i,
                  /<[^>]*>([^<]*woolsocks[^<]*)<\/[^>]*>/i
                ]
                
                for (const pattern of namePatterns) {
                  const nameMatch = context.match(pattern)
                  if (nameMatch) {
                    voucherName = nameMatch[1] || nameMatch[0]
                    voucherName = voucherName.replace(/\s+image$/, '').trim()
                    break
                  }
                }
                
                // Look for cashback rate
                let cashbackRate = null
                const ratePatterns = [
                  /(\d+(?:\.\d+)?)\s*%/,
                  /(\d+(?:\.\d+)?)%\s*cashback/i,
                  /cashback\s*(\d+(?:\.\d+)?)%/i
                ]
                
                for (const pattern of ratePatterns) {
                  const rateMatch = context.match(pattern)
                  if (rateMatch) {
                    cashbackRate = parseFloat(rateMatch[1])
                    break
                  }
                }
                
                // Skip autorewards and coin-related entries
                if (voucherName && (
                  voucherName.toLowerCase().includes('coin') ||
                  voucherName.toLowerCase().includes('autorewards') ||
                  voucherName.toLowerCase().includes('bespaar') ||
                  voucherName.toLowerCase().includes('op al je aankopen')
                )) {
                  console.log(`❌ Skipping autorewards/coin entry: ${voucherName}`)
                  continue
                }
                
                if (cashbackRate === 2.0 || (voucherName && voucherName.toLowerCase().includes('coin'))) {
                  console.log(`❌ Skipping autorewards/coin entry with ${cashbackRate}% rate: ${voucherName}`)
                  continue
                }
                
                const voucher = {
                  url,
                  imageUrl,
                  name: voucherName,
                  cashbackRate
                }
                
                vouchers.push(voucher)
                console.log(`✅ Found voucher:`, voucher)
              }
              
              console.log(`\n=== FINAL RESULT ===`)
              console.log(`Total vouchers found: ${vouchers.length}`)
              vouchers.forEach((v, i) => {
                console.log(`${i + 1}. ${v.name || 'Unknown'} - ${v.cashbackRate || 'Unknown'}% - ${v.url}`)
              })
              
              return vouchers
            } else {
              console.log('❌ No vouchers section found')
            }
          } else {
            console.log('❌ No merchant context found')
          }
        } else {
          console.log(`❌ Response failed: ${response.status}`)
        }
      } catch (error) {
        console.log(`❌ Error fetching ${url}:`, error.message)
      }
    }
    
    console.log('\n=== No vouchers found in any URL ===')
    return []
    
  } catch (error) {
    console.error('Debug error:', error)
    return []
  }
}

// Run the debug function
debugZalandoVouchers().then(vouchers => {
  console.log('\n=== DEBUG COMPLETE ===')
  console.log('Vouchers found:', vouchers.length)
  if (vouchers.length > 0) {
    console.log('Expected: 3 vouchers (Zalando 12%, fashioncheque 5%, Woolsocks All-in-One 4%)')
    console.log('Actual vouchers:')
    vouchers.forEach((v, i) => {
      console.log(`${i + 1}. ${v.name || 'Unknown'} - ${v.cashbackRate || 'Unknown'}%`)
    })
  }
}).catch(console.error)
