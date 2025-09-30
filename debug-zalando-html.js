// Debug script to examine the actual HTML structure of Zalando vouchers
async function debugZalandoHTML() {
  try {
    console.log('=== DEBUG: Zalando HTML Structure ===')
    
    const url = 'https://woolsocks.eu/nl/cashback/ff80dbbf-2b3b-44d3-a8ff-d0e786c36e8c'
    
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
      
      // Find the vouchers section
      const vouchersSection = html.match(/Vouchers\s*\|\s*cashback\s*of\s*pay\s*later[\s\S]*?(?=<h[1-6]|$)/i)
      
      if (vouchersSection && vouchersSection[0]) {
        console.log('=== VOUCHERS SECTION HTML ===')
        console.log(vouchersSection[0])
        console.log('\n=== END VOUCHERS SECTION ===')
        
        // Look for any href patterns
        const allHrefs = vouchersSection[0].match(/href="[^"]*"/g) || []
        console.log('\n=== ALL HREFS IN SECTION ===')
        allHrefs.forEach((href, i) => {
          console.log(`${i + 1}. ${href}`)
        })
        
        // Look for giftcard patterns
        const giftcardHrefs = vouchersSection[0].match(/href="[^"]*giftcard[^"]*"/gi) || []
        console.log('\n=== GIFTCARD HREFS ===')
        giftcardHrefs.forEach((href, i) => {
          console.log(`${i + 1}. ${href}`)
        })
        
        // Look for product patterns
        const productHrefs = vouchersSection[0].match(/href="[^"]*product[^"]*"/gi) || []
        console.log('\n=== PRODUCT HREFS ===')
        productHrefs.forEach((href, i) => {
          console.log(`${i + 1}. ${href}`)
        })
        
        // Look for any /nl/ patterns
        const nlHrefs = vouchersSection[0].match(/href="[^"]*\/nl\/[^"]*"/gi) || []
        console.log('\n=== /NL/ HREFS ===')
        nlHrefs.forEach((href, i) => {
          console.log(`${i + 1}. ${href}`)
        })
        
      } else {
        console.log('❌ No vouchers section found')
      }
    } else {
      console.log(`❌ Response failed: ${response.status}`)
    }
    
  } catch (error) {
    console.error('Debug error:', error)
  }
}

// Run the debug function
debugZalandoHTML().catch(console.error)
