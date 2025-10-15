// Main voucher popup module
import type { 
  VoucherPopupConfig, 
  Voucher, 
  PopupState, 
  VoucherTranslations,
  PopupAssets 
} from './voucher-popup-types'
import { applyStyles, popupStyles } from './voucher-popup-styles'

// Global state for the popup
let currentPopupState: PopupState = {
  selectedVoucherIndex: 0,
  position: { bottom: '20px', right: '20px' },
  isMinimized: false
}

export function createVoucherPopup(config: VoucherPopupConfig): HTMLElement {
  console.log('[WS] Creating voucher popup with config:', config)
  
  // Remove existing popup
  const existing = document.getElementById('woolsocks-voucher-prompt')
  if (existing) {
    try { existing.remove() } catch {}
  }

  // Collect vouchers
  const vouchers = collectVouchers(config.partner)
  const hasMultipleVouchers = vouchers.length > 1
  const best = vouchers[0] || { name: 'Default Voucher', cashbackRate: 0 }
  
  // Create main container
  const popup = document.createElement('div')
  popup.id = 'woolsocks-voucher-prompt'
  applyStyles(popup, popupStyles.container)

  // Create content
  const content = createPopupContent(config, vouchers, hasMultipleVouchers, best)
  popup.appendChild(content)

  // Attach behaviors
  attachDragBehavior(popup)
  attachMinimizeBehavior(popup, config)
  attachCarouselBehavior(popup, vouchers, hasMultipleVouchers, config)
  attachActionButtonBehavior(popup, vouchers, hasMultipleVouchers, config)

  // Animate in
  setTimeout(() => {
    applyStyles(popup, { opacity: '1', transform: 'translateY(0) scale(1)' })
  }, 100)

  console.log('[WS] Popup created successfully')
  return popup
}

function collectVouchers(partner: any): Voucher[] {
  const collected: Voucher[] = []
  
  const normalizeImageUrl = (url: string | undefined): string | undefined => {
    if (!url || typeof url !== 'string') return undefined
    try {
      return url.replace(/^http:/i, 'https:')
    } catch {
      return undefined
    }
  }

  const voucherCategory = Array.isArray(partner.categories)
    ? partner.categories.find((c: any) => /voucher/i.test(String(c?.name || '')))
    : null

  if (voucherCategory && Array.isArray(voucherCategory.deals)) {
    for (const deal of voucherCategory.deals) {
      collected.push({
        name: deal?.name || '',
        cashbackRate: typeof deal?.rate === 'number' ? deal.rate : 0,
        imageUrl: normalizeImageUrl(deal?.imageUrl),
        url: deal?.dealUrl
      })
    }
  } else if (Array.isArray(partner.allVouchers)) {
    for (const voucher of partner.allVouchers) {
      collected.push({
        name: voucher.name,
        cashbackRate: voucher.cashbackRate,
        imageUrl: normalizeImageUrl(voucher.imageUrl),
        url: voucher.url
      })
    }
  } else if (partner.voucherProductUrl) {
    collected.push({
      name: (partner.name || '') + ' Voucher',
      cashbackRate: partner.cashbackRate || 0,
      imageUrl: normalizeImageUrl(partner.merchantImageUrl),
      url: partner.voucherProductUrl
    })
  }

  return collected
    .filter(v => typeof v.cashbackRate === 'number' && v.cashbackRate > 0)
    .sort((a, b) => (b.cashbackRate || 0) - (a.cashbackRate || 0))
}

function createPopupContent(
  config: VoucherPopupConfig, 
  vouchers: Voucher[], 
  hasMultipleVouchers: boolean, 
  best: Voucher
): HTMLElement {
  const { partner, checkoutTotal, assets, translations } = config
  
  // Create main content container
  const content = document.createElement('div')
  content.style.padding = '16px'

  // Header
  const header = createHeader(partner.name, translations)
  content.appendChild(header)

  // Main content area
  const mainContent = document.createElement('div')
  applyStyles(mainContent, popupStyles.content)

  // Amount section
  const amountSection = createAmountSection(checkoutTotal, translations)
  mainContent.appendChild(amountSection)

  // Voucher section (carousel or single)
  const voucherSection = hasMultipleVouchers 
    ? createCarouselSection(vouchers, assets)
    : createSingleVoucherSection(best, assets)
  mainContent.appendChild(voucherSection)

  // Cashback section
  const cashbackSection = createCashbackSection(
    checkoutTotal, 
    vouchers[currentPopupState.selectedVoucherIndex] || best, 
    translations
  )
  mainContent.appendChild(cashbackSection)

  // Action button
  const actionButton = createActionButton(translations, assets.externalIconUrl)
  mainContent.appendChild(actionButton)

  content.appendChild(mainContent)

  // USPs section
  const uspsSection = createUspsSection(vouchers[currentPopupState.selectedVoucherIndex] || best, assets)
  content.appendChild(uspsSection)

  // Payment methods
  const paymentSection = createPaymentSection(assets)
  content.appendChild(paymentSection)

  // Instructions
  const instructions = createInstructions(translations)
  content.appendChild(instructions)

  // Logo
  if (assets.wsLogoUrl) {
    const logoSection = createLogoSection(assets.wsLogoUrl)
    content.appendChild(logoSection)
  }

  return content
}

function createHeader(partnerName: string, _translations: VoucherTranslations): HTMLElement {
  const header = document.createElement('div')
  applyStyles(header, popupStyles.header)

  const title = document.createElement('h3')
  applyStyles(title, popupStyles.title)
  title.textContent = partnerName

  const closeButton = document.createElement('button')
  applyStyles(closeButton, popupStyles.closeButton)
  closeButton.id = 'ws-close'
  closeButton.innerHTML = '×'

  header.appendChild(title)
  header.appendChild(closeButton)
  return header
}

function createAmountSection(amount: number, translations: VoucherTranslations): HTMLElement {
  const section = document.createElement('div')
  applyStyles(section, popupStyles.amountSection)

  const label = document.createElement('div')
  applyStyles(label, popupStyles.amountLabel)
  label.textContent = translations.purchaseAmount || 'Purchase amount'

  const value = document.createElement('div')
  applyStyles(value, popupStyles.amountValue)
  value.textContent = `€${amount.toFixed(2)}`

  section.appendChild(label)
  section.appendChild(value)
  return section
}

function createCarouselSection(vouchers: Voucher[], assets: PopupAssets): HTMLElement {
  const section = document.createElement('div')
  applyStyles(section, popupStyles.carousel)

  const carousel = document.createElement('div')
  carousel.id = 'voucher-carousel'
  applyStyles(carousel, popupStyles.carouselContainer)

  vouchers.forEach((voucher, index) => {
    const card = createVoucherCard(voucher, index, assets)
    carousel.appendChild(card)
  })

  const navigation = createCarouselNavigation(vouchers.length)
  
  section.appendChild(carousel)
  section.appendChild(navigation)
  return section
}

function createSingleVoucherSection(voucher: Voucher, assets: PopupAssets): HTMLElement {
  const section = document.createElement('div')
  applyStyles(section, popupStyles.singleVoucher)

  const content = document.createElement('div')
  applyStyles(content, popupStyles.singleVoucherContent)

  const imageContainer = document.createElement('div')
  applyStyles(imageContainer, popupStyles.singleVoucherImage)
  
  if (voucher.imageUrl) {
    const img = document.createElement('img')
    img.src = voucher.imageUrl
    img.alt = voucher.name
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = 'contain'
    img.onerror = () => {
      img.style.display = 'none'
      const fallback = document.createElement('div')
      fallback.style.display = 'flex'
      fallback.style.width = '100%'
      fallback.style.height = '100%'
      fallback.style.alignItems = 'center'
      fallback.style.justifyContent = 'center'
      fallback.style.background = '#F3F4F6'
      fallback.style.borderRadius = '8px'
      fallback.style.fontSize = '12px'
      fallback.style.color = '#666'
      fallback.textContent = 'Voucher'
      imageContainer.appendChild(fallback)
    }
    imageContainer.appendChild(img)
  } else if (assets.wsLogoUrl) {
    const img = document.createElement('img')
    img.src = assets.wsLogoUrl
    img.alt = voucher.name
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = 'contain'
    imageContainer.appendChild(img)
  } else {
    const fallback = document.createElement('div')
    fallback.style.fontSize = '12px'
    fallback.style.color = '#666'
    fallback.textContent = 'Voucher'
    imageContainer.appendChild(fallback)
  }

  const info = document.createElement('div')
  applyStyles(info, popupStyles.voucherInfo)

  const badge = document.createElement('div')
  applyStyles(badge, popupStyles.cashbackBadge)
  badge.textContent = `${voucher.cashbackRate}% cashback`

  const name = document.createElement('div')
  applyStyles(name, popupStyles.voucherName)
  name.textContent = voucher.name

  info.appendChild(badge)
  info.appendChild(name)
  content.appendChild(imageContainer)
  content.appendChild(info)
  section.appendChild(content)
  return section
}

function createVoucherCard(voucher: Voucher, index: number, assets: PopupAssets): HTMLElement {
  const card = document.createElement('div')
  card.className = 'voucher-card'
  card.dataset.index = index.toString()
  applyStyles(card, popupStyles.voucherCard)

  const imageContainer = document.createElement('div')
  applyStyles(imageContainer, popupStyles.voucherImage)

  if (voucher.imageUrl) {
    const img = document.createElement('img')
    img.src = voucher.imageUrl
    img.alt = voucher.name
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = 'contain'
    img.onerror = () => {
      img.style.display = 'none'
      const fallback = document.createElement('div')
      fallback.style.display = 'flex'
      fallback.style.width = '100%'
      fallback.style.height = '100%'
      fallback.style.alignItems = 'center'
      fallback.style.justifyContent = 'center'
      fallback.style.background = '#F3F4F6'
      fallback.style.borderRadius = '8px'
      fallback.style.fontSize = '12px'
      fallback.style.color = '#666'
      fallback.textContent = 'Voucher'
      imageContainer.appendChild(fallback)
    }
    imageContainer.appendChild(img)
  } else if (assets.wsLogoUrl) {
    const img = document.createElement('img')
    img.src = assets.wsLogoUrl
    img.alt = voucher.name
    img.style.width = '100%'
    img.style.height = '100%'
    img.style.objectFit = 'contain'
    imageContainer.appendChild(img)
  } else {
    const fallback = document.createElement('div')
    fallback.style.fontSize = '12px'
    fallback.style.color = '#666'
    fallback.textContent = 'Voucher'
    imageContainer.appendChild(fallback)
  }

  const info = document.createElement('div')
  applyStyles(info, popupStyles.voucherInfo)

  const badge = document.createElement('div')
  applyStyles(badge, popupStyles.cashbackBadge)
  badge.textContent = `${voucher.cashbackRate}% cashback`

  const name = document.createElement('div')
  applyStyles(name, popupStyles.voucherName)
  name.textContent = voucher.name

  info.appendChild(badge)
  info.appendChild(name)
  card.appendChild(imageContainer)
  card.appendChild(info)
  return card
}

function createCarouselNavigation(voucherCount: number): HTMLElement {
  const navigation = document.createElement('div')
  applyStyles(navigation, popupStyles.carouselNavigation)

  const leftArrow = document.createElement('div')
  leftArrow.id = 'carousel-left-arrow'
  leftArrow.className = 'carousel-arrow'
  applyStyles(leftArrow, { ...popupStyles.carouselArrow, opacity: '0.5' })
  leftArrow.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M15 18L9 12L15 6" stroke="#0F0B1C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `

  const indicators = document.createElement('div')
  indicators.id = 'carousel-indicators'
  applyStyles(indicators, popupStyles.carouselIndicators)

  for (let i = 0; i < voucherCount; i++) {
    const dot = document.createElement('div')
    dot.className = 'carousel-dot'
    dot.dataset.index = i.toString()
    applyStyles(dot, {
      ...popupStyles.carouselDot,
      borderRadius: i === 0 ? '3px' : '50%',
      background: i === 0 ? '#0F0B1C' : '#D1D5DB'
    })
    indicators.appendChild(dot)
  }

  const rightArrow = document.createElement('div')
  rightArrow.id = 'carousel-right-arrow'
  rightArrow.className = 'carousel-arrow'
  applyStyles(rightArrow, popupStyles.carouselArrow)
  rightArrow.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M9 18L15 12L9 6" stroke="#0F0B1C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `

  navigation.appendChild(leftArrow)
  navigation.appendChild(indicators)
  navigation.appendChild(rightArrow)
  return navigation
}

function createCashbackSection(amount: number, voucher: Voucher, translations: VoucherTranslations): HTMLElement {
  const section = document.createElement('div')
  applyStyles(section, popupStyles.cashbackSection)

  const text = document.createElement('span')
  applyStyles(text, popupStyles.cashbackText)
  text.textContent = translations.cashbackText || "You'll get"

  const amountElement = document.createElement('span')
  amountElement.id = 'cashback-amount'
  applyStyles(amountElement, popupStyles.cashbackAmount)
  amountElement.textContent = `€${(amount * voucher.cashbackRate / 100).toFixed(2)}`

  const suffix = document.createElement('span')
  applyStyles(suffix, popupStyles.cashbackText)
  suffix.textContent = translations.cashbackSuffix || 'of cashback'

  section.appendChild(text)
  section.appendChild(amountElement)
  section.appendChild(suffix)
  return section
}

function createActionButton(translations: VoucherTranslations, externalIconUrl?: string): HTMLElement {
  const button = document.createElement('button')
  button.id = 'ws-use-voucher'
  applyStyles(button, popupStyles.actionButton)

  const text = document.createElement('span')
  text.textContent = translations.viewDetails || 'View voucher details'
  button.appendChild(text)

  if (externalIconUrl) {
    const icon = document.createElement('img')
    icon.src = externalIconUrl
    icon.alt = 'open'
    icon.style.width = '20px'
    icon.style.height = '20px'
    icon.style.display = 'block'
    button.appendChild(icon)
  }

  return button
}

function createUspsSection(voucher: Voucher, assets: PopupAssets): HTMLElement {
  const section = document.createElement('div')
  applyStyles(section, popupStyles.uspsSection)

  const usps = [
    { text: 'Instant delivery' },
    ...(Number.isFinite(voucher.cashbackRate) && voucher.cashbackRate > 0 
      ? [{ text: `${voucher.cashbackRate}% cashback on purchase` }] 
      : []),
    { text: 'Use online at checkout' }
  ]

  usps.forEach(usp => {
    const item = document.createElement('div')
    applyStyles(item, popupStyles.uspItem)

    if (assets.uspIconUrl) {
      const icon = document.createElement('img')
      icon.src = assets.uspIconUrl
      icon.alt = 'check'
      icon.style.width = '16px'
      icon.style.height = '16px'
      icon.style.display = 'block'
      item.appendChild(icon)
    }

    const text = document.createElement('span')
    applyStyles(text, popupStyles.uspText)
    text.textContent = usp.text
    item.appendChild(text)

    section.appendChild(item)
  })

  return section
}

function createPaymentSection(assets: PopupAssets): HTMLElement {
  const section = document.createElement('div')
  applyStyles(section, popupStyles.paymentSection)

  const paymentIconUrls = (assets.paymentIconUrls || []).filter(Boolean)
  paymentIconUrls.forEach(src => {
    const container = document.createElement('div')
    applyStyles(container, popupStyles.paymentIcon)

    const img = document.createElement('img')
    img.src = src
    img.alt = 'payment'
    img.style.height = '36px'
    img.style.width = 'auto'
    img.style.display = 'block'
    img.style.maxWidth = '100%'
    img.style.objectFit = 'contain'

    container.appendChild(img)
    section.appendChild(container)
  })

  return section
}

function createInstructions(translations: VoucherTranslations): HTMLElement {
  const instructions = document.createElement('div')
  applyStyles(instructions, popupStyles.instructions)
  instructions.textContent = translations.instructions || 'Buy the voucher at Woolsocks.eu and put the vouchercode in the field at checkout.'
  return instructions
}

function createLogoSection(wsLogoUrl: string): HTMLElement {
  const section = document.createElement('div')
  applyStyles(section, popupStyles.logoSection)

  const img = document.createElement('img')
  img.src = wsLogoUrl
  img.alt = 'Woolsocks'
  img.style.height = '36px'
  img.style.width = 'auto'
  img.style.display = 'block'

  section.appendChild(img)
  return section
}

function attachDragBehavior(popup: HTMLElement): void {
  let isDragging = false
  let startX = 0
  let startY = 0
  let initialX = 0
  let initialY = 0

  popup.addEventListener('mousedown', (e) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'BUTTON' || target.closest('button')) return

    isDragging = true
    startX = e.clientX
    startY = e.clientY

    const rect = popup.getBoundingClientRect()
    initialX = rect.left
    initialY = rect.top

    popup.style.transition = 'opacity 0.3s ease'
    popup.style.cursor = 'grabbing'
  })

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return

    const deltaX = e.clientX - startX
    const deltaY = e.clientY - startY

    const newX = initialX + deltaX
    const newY = initialY + deltaY

    popup.style.top = 'auto'
    popup.style.bottom = 'auto'
    popup.style.left = 'auto'
    popup.style.right = 'auto'

    popup.style.left = newX + 'px'
    popup.style.top = newY + 'px'
  })

  document.addEventListener('mouseup', () => {
    if (!isDragging) return
    isDragging = false
    popup.style.cursor = 'move'

    const rect = popup.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    const isLeft = centerX < viewportWidth / 2
    const isTop = centerY < viewportHeight / 2

    popup.style.transition = 'top 0.3s ease, bottom 0.3s ease, left 0.3s ease, right 0.3s ease, opacity 0.3s ease, transform 0.3s ease'

    popup.style.top = 'auto'
    popup.style.bottom = 'auto'
    popup.style.left = 'auto'
    popup.style.right = 'auto'

    if (isTop) {
      popup.style.top = '20px'
    } else {
      popup.style.bottom = '20px'
    }

    if (isLeft) {
      popup.style.left = '20px'
    } else {
      popup.style.right = '20px'
    }

    // Update state
    currentPopupState.position = {
      [isTop ? 'top' : 'bottom']: '20px',
      [isLeft ? 'left' : 'right']: '20px'
    }
  })
}

function attachMinimizeBehavior(popup: HTMLElement, config: VoucherPopupConfig): void {
  const closeButton = popup.querySelector('#ws-close')
  if (!closeButton) return

  closeButton.addEventListener('click', () => {
    minimizePopup(popup, config)
  })
}

function minimizePopup(popup: HTMLElement, config: VoucherPopupConfig): void {
  // Store current state
  currentPopupState.isMinimized = true
  popup.dataset.popupState = JSON.stringify(currentPopupState)
  popup.dataset.minimized = 'true'

  // Apply minimized styles
  applyStyles(popup, popupStyles.minimized)
  popup.innerHTML = `
    <div style="width: 40px; height: 40px; background: #211940; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold;">W</div>
  `

  // Add click to expand
  popup.addEventListener('click', () => {
    expandPopup(popup, config)
  })
}

function expandPopup(popup: HTMLElement, config: VoucherPopupConfig): void {
  // Restore state
  const stateData = popup.dataset.popupState
  if (stateData) {
    currentPopupState = { ...currentPopupState, ...JSON.parse(stateData) }
  }
  currentPopupState.isMinimized = false
  popup.dataset.minimized = 'false'

  // Remove click listener (we'll re-add it after recreating content)

  // Recreate the popup content
  const vouchers = collectVouchers(config.partner)
  const hasMultipleVouchers = vouchers.length > 1
  const best = vouchers[0]

  // Restore container styles
  applyStyles(popup, popupStyles.container)
  
  // Restore position
  if (currentPopupState.position.top) {
    popup.style.top = currentPopupState.position.top
  }
  if (currentPopupState.position.bottom) {
    popup.style.bottom = currentPopupState.position.bottom
  }
  if (currentPopupState.position.left) {
    popup.style.left = currentPopupState.position.left
  }
  if (currentPopupState.position.right) {
    popup.style.right = currentPopupState.position.right
  }

  // Recreate content
  const content = createPopupContent(config, vouchers, hasMultipleVouchers, best)
  popup.innerHTML = ''
  popup.appendChild(content)

  // Reattach behaviors
  attachDragBehavior(popup)
  attachMinimizeBehavior(popup, config)
  attachCarouselBehavior(popup, vouchers, hasMultipleVouchers, config)
  attachActionButtonBehavior(popup, vouchers, hasMultipleVouchers, config)

  // Restore carousel position
  if (hasMultipleVouchers) {
    updateCarouselPosition(popup, currentPopupState.selectedVoucherIndex, vouchers, config)
  }
}

function attachCarouselBehavior(
  popup: HTMLElement, 
  vouchers: Voucher[], 
  hasMultipleVouchers: boolean, 
  config: VoucherPopupConfig
): void {
  if (!hasMultipleVouchers) return

  const carousel = popup.querySelector('#voucher-carousel') as HTMLElement
  const leftArrow = popup.querySelector('#carousel-left-arrow') as HTMLElement
  const rightArrow = popup.querySelector('#carousel-right-arrow') as HTMLElement
  const dots = popup.querySelectorAll('.carousel-dot')
  const cards = popup.querySelectorAll('.voucher-card')

  if (!carousel || !leftArrow || !rightArrow) return

  const maxIndex = vouchers.length - 1

  const updateCarousel = () => {
    const translateX = -currentPopupState.selectedVoucherIndex * 267 // 259px card + 8px gap
    carousel.style.transform = `translateX(${translateX}px)`

    // Update dots
    dots.forEach((dot, index) => {
      const dotElement = dot as HTMLElement
      if (index === currentPopupState.selectedVoucherIndex) {
        applyStyles(dotElement, { background: '#0F0B1C', borderRadius: '3px' })
      } else {
        applyStyles(dotElement, { background: '#D1D5DB', borderRadius: '50%' })
      }
    })

    // Update arrows
    leftArrow.style.opacity = currentPopupState.selectedVoucherIndex === 0 ? '0.5' : '1'
    rightArrow.style.opacity = currentPopupState.selectedVoucherIndex === maxIndex ? '0.5' : '1'

    // Update cashback amount
    const selectedVoucher = vouchers[currentPopupState.selectedVoucherIndex]
    const newAmount = (config.checkoutTotal * selectedVoucher.cashbackRate / 100).toFixed(2)
    const cashbackElement = popup.querySelector('#cashback-amount') as HTMLElement
    if (cashbackElement) {
      cashbackElement.textContent = `€${newAmount}`
    }
  }

  leftArrow.addEventListener('click', () => {
    if (currentPopupState.selectedVoucherIndex > 0) {
      currentPopupState.selectedVoucherIndex--
      updateCarousel()
    }
  })

  rightArrow.addEventListener('click', () => {
    if (currentPopupState.selectedVoucherIndex < maxIndex) {
      currentPopupState.selectedVoucherIndex++
      updateCarousel()
    }
  })

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      currentPopupState.selectedVoucherIndex = index
      updateCarousel()
    })
  })

  cards.forEach((card, index) => {
    card.addEventListener('click', () => {
      currentPopupState.selectedVoucherIndex = index
      updateCarousel()
    })
  })
}

function updateCarouselPosition(
  popup: HTMLElement, 
  index: number, 
  vouchers: Voucher[], 
  config: VoucherPopupConfig
): void {
  const carousel = popup.querySelector('#voucher-carousel') as HTMLElement
  const dots = popup.querySelectorAll('.carousel-dot')
  const leftArrow = popup.querySelector('#carousel-left-arrow') as HTMLElement
  const rightArrow = popup.querySelector('#carousel-right-arrow') as HTMLElement

  if (!carousel) return

  const translateX = -index * 267
  carousel.style.transform = `translateX(${translateX}px)`

  // Update dots
  dots.forEach((dot, i) => {
    const dotElement = dot as HTMLElement
    if (i === index) {
      applyStyles(dotElement, { background: '#0F0B1C', borderRadius: '3px' })
    } else {
      applyStyles(dotElement, { background: '#D1D5DB', borderRadius: '50%' })
    }
  })

  // Update arrows
  if (leftArrow) {
    leftArrow.style.opacity = index === 0 ? '0.5' : '1'
  }
  if (rightArrow) {
    rightArrow.style.opacity = index === vouchers.length - 1 ? '0.5' : '1'
  }

  // Update cashback amount
  const selectedVoucher = vouchers[index]
  const newAmount = (config.checkoutTotal * selectedVoucher.cashbackRate / 100).toFixed(2)
  const cashbackElement = popup.querySelector('#cashback-amount') as HTMLElement
  if (cashbackElement) {
    cashbackElement.textContent = `€${newAmount}`
  }
}

function attachActionButtonBehavior(
  popup: HTMLElement, 
  vouchers: Voucher[], 
  hasMultipleVouchers: boolean, 
  config: VoucherPopupConfig
): void {
  const button = popup.querySelector('#ws-use-voucher')
  if (!button) return

  button.addEventListener('click', () => {
    const selectedVoucher = hasMultipleVouchers 
      ? vouchers[currentPopupState.selectedVoucherIndex] 
      : vouchers[0]
    
    const url = selectedVoucher?.url || config.partner.voucherProductUrl || config.partner.url
    if (url) {
      window.open(url, '_blank')
    } else {
      window.open('https://woolsocks.eu/vouchers', '_blank')
    }
  })
}

// Export for global access when injected
;(window as any).createVoucherPopup = createVoucherPopup
