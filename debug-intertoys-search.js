// Debug script to examine Intertoys search results
async function debugIntertoysSearch() {
  try {
    const searchUrl = `https://woolsocks.eu/cashback/search?query=intertoys`
    console.log(`Fetching: ${searchUrl}`)
    
    const response = await fetch(searchUrl, {
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
      console.log(`HTML length: ${html.length}`)
      
      // Look for Intertoys mentions
      const intertoysMentions = html.match(/intertoys[^<]*/gi)
      if (intertoysMentions) {
        console.log(`Found ${intertoysMentions.length} Intertoys mentions:`)
        intertoysMentions.slice(0, 5).forEach((mention, index) => {
          console.log(`  ${index + 1}. ${mention}`)
        })
      }
      
      // Look for cashback URLs
      const cashbackUrls = html.match(/href="(\/cashback\/[a-f0-9-]+)"/g)
      if (cashbackUrls) {
        console.log(`\nFound ${cashbackUrls.length} cashback URLs:`)
        cashbackUrls.slice(0, 5).forEach((url, index) => {
          console.log(`  ${index + 1}. ${url}`)
        })
      }
      
      // Look for the specific Intertoys cashback URL from the example
      const specificUrl = '8adecdca-d8c1-4aa0-8230-55a9e847ed99'
      const foundSpecific = html.includes(specificUrl)
      console.log(`\nSpecific Intertoys cashback URL found: ${foundSpecific}`)
      
      if (foundSpecific) {
        const urlIndex = html.indexOf(specificUrl)
        const contextStart = Math.max(0, urlIndex - 500)
        const contextEnd = Math.min(html.length, urlIndex + 500)
        const context = html.substring(contextStart, contextEnd)
        
        console.log('\nContext around Intertoys cashback URL:')
        console.log(context)
      }
      
      // Look for any links that might contain Intertoys
      const intertoysLinks = html.match(/href="[^"]*"[^>]*>[^<]*intertoys[^<]*/gi)
      if (intertoysLinks) {
        console.log(`\nFound ${intertoysLinks.length} Intertoys links:`)
        intertoysLinks.slice(0, 3).forEach((link, index) => {
          console.log(`  ${index + 1}. ${link}`)
        })
      }
      
    } else {
      console.log(`Failed: ${response.status}`)
    }
  } catch (error) {
    console.error('Error:', error)
  }
}

debugIntertoysSearch()
