// Internationalization (i18n) system for Woolsocks extension
// Supports multiple languages with fallback to English

export type Language = 'en' | 'nl' | 'de' | 'fr' | 'it' | 'es'

export interface Translations {
  // Voucher Panel
  voucher: {
    title: string
    purchaseAmount: string
    cashbackText: string
    cashbackSuffix: string
    viewDetails: string
    notNow: string
    usps: {
      instantDelivery: string
      cashbackOnPurchase: string
      useOnlineAtCheckout: string
    }
    instructions: string
    footer: string
  }
  
  // Notifications
  notifications: {
    cashbackActivated: string
    cashbackActivatedMessage: string
    error: string
  }
  
  // Icon titles
  icons: {
    noDeals: string
    cashbackAvailable: string
    cashbackActive: string
    voucherAvailable: string
    attentionNeeded: string
  }
  
  // Debug messages
  debug: {
    checkoutDetected: string
    partnerData: string
    noMerchant: string
    noVouchers: string
    showingOffer: string
    scriptInjected: string
  }
  // Additional UI sections are optional and may be missing in some locales; English will be used as fallback via translate()
  // Popup UI
  popup?: {
    checkingSession: string
    login: string
    dealsFor: string // e.g., Deals for {domain}
    onlineCashback: string
    autoActivation: string
    trackingActive: string
    vouchers: string
    payWithVouchers: string
    noDealsForSite: string
  }
  // Options page UI
  options?: {
    title: string
    sectionTitle: string
    checkingSession: string
    noActiveSession: string
    loginAtWs: string
    greeting: string // Hi {name} 👋
    cashbackSock: string
    refresh: string
    recentTransactions: string
    noRecentTransactions: string
    viewAllTransactions: string
    enabled: string
    disabled: string
    autoActivateOnlineCashback: string
    qaBypassTitle: string
    payoutToIban: string
    pending: string
  }
  // Onboarding copy
  onboarding?: {
    welcomeTitle: string
    welcomeContent: string
    cashbackTitle: string
    cashbackContent: string
    activationTitle: string
    activationContent: string
    vouchersTitle: string
    vouchersContent: string
    settingsTitle: string
    settingsContent: string
    privacyTitle: string
    privacyContent: string
  }
  // OC panel (content script) strings
  ocPanel?: {
    dealsFoundAt: string // Deals found at {host}
    settingUpFor: string // Setting up cashback tracking for {host}
    noDealsFound: string
    viewConditions: string
    signupLogin: string
    cashbackActive: string
    shopAndPayNormally: string
    acceptCookiesDisableAdblock: string
    earnRateCashback: string // Earn {rate}% cashback
  }
}

const translations: Record<Language, Translations> = {
  en: {
    voucher: {
      title: 'Voucher',
      purchaseAmount: 'Purchase amount',
      cashbackText: "You'll get ",
      cashbackSuffix: ' of cashback',
      viewDetails: 'View voucher details',
      notNow: 'Not now',
      usps: {
        instantDelivery: 'Instant delivery',
        cashbackOnPurchase: '% cashback on purchase',
        useOnlineAtCheckout: 'Use online at checkout',
      },
      instructions: 'Buy the voucher at Woolsocks.eu and put the vouchercode in the field at checkout.',
      footer: 'Woolsocks - the money app',
    },
    notifications: {
      cashbackActivated: 'Cashback Activated!',
      cashbackActivatedMessage: "You'll earn {rate}% cashback on {partner} purchases",
      error: 'Error',
    },
    icons: {
      noDeals: 'No deals on this site',
      cashbackAvailable: 'Cashback available — click to activate',
      cashbackActive: 'Cashback activated',
      voucherAvailable: 'Voucher deal available',
      attentionNeeded: 'Attention needed',
    },
    debug: {
      checkoutDetected: 'Checkout detected for merchant: {merchant}',
      partnerData: 'Partner data:',
      noMerchant: 'No merchant found in Woolsocks system for: {merchant}',
      noVouchers: 'No vouchers available for merchant: {name}',
      showingOffer: 'Showing voucher offer for {name} with {rate}% cashback',
      scriptInjected: 'Universal checkout script injected for tab {tabId} on {hostname}',
    },
    popup: {
      checkingSession: 'Checking session…',
      login: 'Login',
      dealsFor: 'Deals for {domain}',
      onlineCashback: 'Online cashback',
      autoActivation: 'Auto-activation',
      trackingActive: 'Cashback tracking active!',
      vouchers: 'Vouchers',
      payWithVouchers: 'Pay with vouchers',
      noDealsForSite: 'No deals available for this site',
    },
    options: {
      title: 'Woolsocks',
      sectionTitle: 'Options',
      checkingSession: 'Checking session…',
      noActiveSession: 'No active session found.',
      loginAtWs: 'Login at Woolsocks.eu',
      greeting: 'Hi {name} 👋',
      cashbackSock: 'Cashback sock',
      refresh: 'Refresh',
      recentTransactions: 'Recent transactions',
      noRecentTransactions: 'No recent transactions found.',
      viewAllTransactions: 'View all transactions',
      enabled: 'Enabled',
      disabled: 'Disabled',
      autoActivateOnlineCashback: 'Auto-activate online cashback',
      qaBypassTitle: 'QA: Always show voucher (ignore dismissals)',
      payoutToIban: 'Payout to IBAN',
      pending: 'Pending',
    },
    onboarding: {
      welcomeTitle: 'Welcome to Woolsocks!',
      welcomeContent: 'Never miss cashback again. This extension will help you earn money back on your online purchases.',
      cashbackTitle: 'Cashback Detection',
      cashbackContent: 'When you visit partner sites like Amazon or Zalando, our icon will turn yellow to show cashback is available.',
      activationTitle: 'Activate Cashback',
      activationContent: 'Click the extension icon or the popup to activate cashback. The icon turns green when active.',
      vouchersTitle: 'Gift Card Savings',
      vouchersContent: "At checkout, we'll suggest gift cards that give you instant cashback on your purchase.",
      settingsTitle: 'Customize Your Experience',
      settingsContent: 'Adjust notifications in settings. You can turn off popups but keep icon color changes.',
      privacyTitle: 'Your Privacy Matters',
      privacyContent: "We only check the website you're on for deals. No browsing history or personal data is collected.",
    },
    ocPanel: {
      dealsFoundAt: 'Deals found at {host}',
      settingUpFor: 'Setting up cashback tracking for {host}',
      noDealsFound: 'No deals found',
      viewConditions: 'View conditions',
      signupLogin: 'Signup / Login',
      cashbackActive: 'Cashback active!',
      shopAndPayNormally: 'Shop and pay like you do normally',
      acceptCookiesDisableAdblock: 'Accept all cookies and disable adblockers',
      earnRateCashback: 'Earn {rate}% cashback',
    },
  },
  
  nl: {
    voucher: {
      title: 'Voucher',
      purchaseAmount: 'Aankoopbedrag',
      cashbackText: 'Je krijgt ',
      cashbackSuffix: ' cashback',
      viewDetails: 'Bekijk voucher details',
      notNow: 'Niet nu',
      usps: {
        instantDelivery: 'Direct geleverd',
        cashbackOnPurchase: '% cashback bij aankoop',
        useOnlineAtCheckout: 'Online gebruiken bij het afrekenen',
      },
      instructions: 'Koop de voucher bij Woolsocks.eu en vul de vouchercode in bij het afrekenen.',
      footer: 'Woolsocks - de geld app',
    },
    notifications: {
      cashbackActivated: 'Cashback geactiveerd!',
      cashbackActivatedMessage: 'Je verdient {rate}% cashback bij {partner} aankopen',
      error: 'Fout',
    },
    icons: {
      noDeals: 'Geen deals op deze site',
      cashbackAvailable: 'Cashback beschikbaar — klik om te activeren',
      cashbackActive: 'Cashback geactiveerd',
      voucherAvailable: 'Voucher deal beschikbaar',
      attentionNeeded: 'Aandacht nodig',
    },
    debug: {
      checkoutDetected: 'Checkout gedetecteerd voor merchant: {merchant}',
      partnerData: 'Partner gegevens:',
      noMerchant: 'Geen merchant gevonden in Woolsocks systeem voor: {merchant}',
      noVouchers: 'Geen vouchers beschikbaar voor merchant: {name}',
      showingOffer: 'Toon voucher aanbieding voor {name} met {rate}% cashback',
      scriptInjected: 'Universeel checkout script geïnjecteerd voor tab {tabId} op {hostname}',
    },
    popup: {
      checkingSession: 'Sessie controleren…',
      login: 'Inloggen',
      dealsFor: 'Deals voor {domain}',
      onlineCashback: 'Online cashback',
      autoActivation: 'Automatisch activeren',
      trackingActive: 'Cashback-tracking actief!',
      vouchers: 'Cadeaukaarten',
      payWithVouchers: 'Betaal met cadeaukaarten',
      noDealsForSite: 'Geen deals beschikbaar voor deze site',
    },
    options: {
      title: 'Woolsocks',
      sectionTitle: 'Opties',
      checkingSession: 'Sessie controleren…',
      noActiveSession: 'Geen actieve sessie gevonden.',
      loginAtWs: 'Inloggen op Woolsocks.eu',
      greeting: 'Hoi {name} 👋',
      cashbackSock: 'Cashbacksock',
      refresh: 'Vernieuwen',
      recentTransactions: 'Recente transacties',
      noRecentTransactions: 'Geen recente transacties gevonden.',
      viewAllTransactions: 'Bekijk alle transacties',
      enabled: 'Ingeschakeld',
      disabled: 'Uitgeschakeld',
      autoActivateOnlineCashback: 'Online cashback automatisch activeren',
      qaBypassTitle: 'QA: Toon voucher altijd (negeer sluiten)',
      payoutToIban: 'Uitbetaling naar IBAN',
      pending: 'In behandeling',
    },
    onboarding: {
      welcomeTitle: 'Welkom bij Woolsocks!',
      welcomeContent: 'Mis nooit meer cashback. Deze extensie helpt je geld terug te verdienen op je online aankopen.',
      cashbackTitle: 'Cashback-detectie',
      cashbackContent: 'Wanneer je partnersites zoals Amazon of Zalando bezoekt, kleurt ons icoon geel om aan te geven dat er cashback beschikbaar is.',
      activationTitle: 'Cashback activeren',
      activationContent: 'Klik op het extensie-icoon of de popup om cashback te activeren. Het icoon wordt groen wanneer actief.',
      vouchersTitle: 'Besparen met cadeaubonnen',
      vouchersContent: 'Bij het afrekenen stellen we cadeaubonnen voor die je direct cashback geven op je aankoop.',
      settingsTitle: 'Pas je ervaring aan',
      settingsContent: 'Stel meldingen in bij instellingen. Je kunt pop-ups uitzetten maar de icoonkleur behouden.',
      privacyTitle: 'Jouw privacy is belangrijk',
      privacyContent: 'We controleren alleen de website waarop je je bevindt op deals. Geen browsegeschiedenis of persoonlijke gegevens worden verzameld.',
    },
    ocPanel: {
      dealsFoundAt: 'Deals gevonden op {host}',
      settingUpFor: 'Cashback-tracking instellen voor {host}',
      noDealsFound: 'Geen deals gevonden',
      viewConditions: 'Voorwaarden bekijken',
      signupLogin: 'Registreren / Inloggen',
      cashbackActive: 'Cashback actief!',
      shopAndPayNormally: 'Winkel en betaal zoals je normaal doet',
      acceptCookiesDisableAdblock: 'Accepteer alle cookies en schakel adblockers uit',
      earnRateCashback: 'Verdien {rate}% cashback',
    },
  },
  
  de: {
    voucher: {
      title: 'Gutschein',
      purchaseAmount: 'Kaufbetrag',
      cashbackText: 'Sie erhalten ',
      cashbackSuffix: ' Cashback',
      viewDetails: 'Gutschein-Details anzeigen',
      notNow: 'Nicht jetzt',
      usps: {
        instantDelivery: 'Sofortige Lieferung',
        cashbackOnPurchase: '% Cashback beim Kauf',
        useOnlineAtCheckout: 'Online an der Kasse verwenden',
      },
      instructions: 'Kaufen Sie den Gutschein bei Woolsocks.eu und geben Sie den Gutscheincode an der Kasse ein.',
      footer: 'Woolsocks - die Geld-App',
    },
    notifications: {
      cashbackActivated: 'Cashback aktiviert!',
      cashbackActivatedMessage: 'Sie verdienen {rate}% Cashback bei {partner} Einkäufen',
      error: 'Fehler',
    },
    icons: {
      noDeals: 'Keine Angebote auf dieser Seite',
      cashbackAvailable: 'Cashback verfügbar — klicken Sie zum Aktivieren',
      cashbackActive: 'Cashback aktiviert',
      voucherAvailable: 'Gutschein-Deal verfügbar',
      attentionNeeded: 'Aufmerksamkeit erforderlich',
    },
    debug: {
      checkoutDetected: 'Checkout erkannt für Händler: {merchant}',
      partnerData: 'Partner-Daten:',
      noMerchant: 'Kein Händler im Woolsocks-System gefunden für: {merchant}',
      noVouchers: 'Keine Gutscheine verfügbar für Händler: {name}',
      showingOffer: 'Zeige Gutscheinangebot für {name} mit {rate}% Cashback',
      scriptInjected: 'Universelles Checkout-Skript injiziert für Tab {tabId} auf {hostname}',
    },
  },
  
  fr: {
    voucher: {
      title: 'Bon',
      purchaseAmount: 'Montant d\'achat',
      cashbackText: 'Vous obtenez ',
      cashbackSuffix: ' de cashback',
      viewDetails: 'Voir les détails du bon',
      notNow: 'Pas maintenant',
      usps: {
        instantDelivery: 'Livraison instantanée',
        cashbackOnPurchase: '% de cashback sur l\'achat',
        useOnlineAtCheckout: 'Utiliser en ligne lors du paiement',
      },
      instructions: 'Achetez le bon sur Woolsocks.eu et entrez le code du bon lors du paiement.',
      footer: 'Woolsocks - l\'application argent',
    },
    notifications: {
      cashbackActivated: 'Cashback activé!',
      cashbackActivatedMessage: 'Vous gagnerez {rate}% de cashback sur les achats {partner}',
      error: 'Erreur',
    },
    icons: {
      noDeals: 'Aucune offre sur ce site',
      cashbackAvailable: 'Cashback disponible — cliquez pour activer',
      cashbackActive: 'Cashback activé',
      voucherAvailable: 'Offre de bon disponible',
      attentionNeeded: 'Attention nécessaire',
    },
    debug: {
      checkoutDetected: 'Paiement détecté pour le marchand: {merchant}',
      partnerData: 'Données du partenaire:',
      noMerchant: 'Aucun marchand trouvé dans le système Woolsocks pour: {merchant}',
      noVouchers: 'Aucun bon disponible pour le marchand: {name}',
      showingOffer: 'Affichage de l\'offre de bon pour {name} avec {rate}% de cashback',
      scriptInjected: 'Script de paiement universel injecté pour l\'onglet {tabId} sur {hostname}',
    },
  },
  
  it: {
    voucher: {
      title: 'Voucher',
      purchaseAmount: 'Importo dell\'acquisto',
      cashbackText: 'Riceverai ',
      cashbackSuffix: ' di cashback',
      viewDetails: 'Visualizza dettagli voucher',
      notNow: 'Non ora',
      usps: {
        instantDelivery: 'Consegna istantanea',
        cashbackOnPurchase: '% di cashback sull\'acquisto',
        useOnlineAtCheckout: 'Usa online al momento del pagamento',
      },
      instructions: 'Acquista il voucher su Woolsocks.eu e inserisci il codice voucher al momento del pagamento.',
      footer: 'Woolsocks - l\'app del denaro',
    },
    notifications: {
      cashbackActivated: 'Cashback attivato!',
      cashbackActivatedMessage: 'Guadagnerai {rate}% di cashback sugli acquisti {partner}',
      error: 'Errore',
    },
    icons: {
      noDeals: 'Nessuna offerta su questo sito',
      cashbackAvailable: 'Cashback disponibile — clicca per attivare',
      cashbackActive: 'Cashback attivato',
      voucherAvailable: 'Offerta voucher disponibile',
      attentionNeeded: 'Attenzione richiesta',
    },
    debug: {
      checkoutDetected: 'Checkout rilevato per il commerciante: {merchant}',
      partnerData: 'Dati del partner:',
      noMerchant: 'Nessun commerciante trovato nel sistema Woolsocks per: {merchant}',
      noVouchers: 'Nessun voucher disponibile per il commerciante: {name}',
      showingOffer: 'Visualizzazione offerta voucher per {name} con {rate}% di cashback',
      scriptInjected: 'Script di checkout universale iniettato per la scheda {tabId} su {hostname}',
    },
  },
  
  es: {
    voucher: {
      title: 'Cupón',
      purchaseAmount: 'Importe de la compra',
      cashbackText: 'Recibirás ',
      cashbackSuffix: ' de cashback',
      viewDetails: 'Ver detalles del cupón',
      notNow: 'Ahora no',
      usps: {
        instantDelivery: 'Entrega instantánea',
        cashbackOnPurchase: '% de cashback en la compra',
        useOnlineAtCheckout: 'Usar online al pagar',
      },
      instructions: 'Compra el cupón en Woolsocks.eu e introduce el código del cupón al pagar.',
      footer: 'Woolsocks - la app del dinero',
    },
    notifications: {
      cashbackActivated: '¡Cashback activado!',
      cashbackActivatedMessage: 'Ganarás {rate}% de cashback en compras de {partner}',
      error: 'Error',
    },
    icons: {
      noDeals: 'No hay ofertas en este sitio',
      cashbackAvailable: 'Cashback disponible — haz clic para activar',
      cashbackActive: 'Cashback activado',
      voucherAvailable: 'Oferta de cupón disponible',
      attentionNeeded: 'Atención necesaria',
    },
    debug: {
      checkoutDetected: 'Checkout detectado para el comerciante: {merchant}',
      partnerData: 'Datos del socio:',
      noMerchant: 'No se encontró comerciante en el sistema Woolsocks para: {merchant}',
      noVouchers: 'No hay cupones disponibles para el comerciante: {name}',
      showingOffer: 'Mostrando oferta de cupón para {name} con {rate}% de cashback',
      scriptInjected: 'Script de checkout universal inyectado para la pestaña {tabId} en {hostname}',
    },
  },
}

// Normalize API language code to our Language type
function normalizeLanguage(apiLang: string | undefined | null): Language {
  if (!apiLang) return 'en'
  
  const normalized = apiLang.toLowerCase().trim()
  
  if (normalized === 'nl' || normalized.startsWith('nl-')) return 'nl'
  if (normalized === 'de' || normalized.startsWith('de-')) return 'de'
  if (normalized === 'fr' || normalized.startsWith('fr-')) return 'fr'
  if (normalized === 'it' || normalized.startsWith('it-')) return 'it'
  if (normalized === 'es' || normalized.startsWith('es-')) return 'es'
  if (normalized === 'en' || normalized.startsWith('en-')) return 'en'
  
  return 'en' // Default fallback
}

// Current language (will be set from API on startup)
let currentLanguage: Language = 'en'

// Get translations for current language
export function t(): Translations {
  return translations[currentLanguage]
}

// Get specific translation with variable substitution
export function translate(key: string, variables?: Record<string, string | number>): string {
  const keys = key.split('.')
  let value: any = translations[currentLanguage]
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Fallback to English if key not found
      value = translations.en
      for (const k2 of keys) {
        if (value && typeof value === 'object' && k2 in value) {
          value = value[k2]
        } else {
          return key // Return key if not found
        }
      }
      break
    }
  }
  
  if (typeof value !== 'string') return key
  
  // Replace variables like {merchant}, {rate}, etc.
  if (variables) {
    Object.keys(variables).forEach(varKey => {
      value = value.replace(new RegExp(`\\{${varKey}\\}`, 'g'), String(variables[varKey]))
    })
  }
  
  return value
}

// Set language preference
export function setLanguage(lang: Language): void {
  currentLanguage = lang
  // Store in chrome storage for persistence
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ language: lang })
  }
}

// Get current language
export function getLanguage(): Language {
  return currentLanguage
}

// Set language from API response
export function setLanguageFromAPI(apiLang: string | undefined | null): Language {
  const lang = normalizeLanguage(apiLang)
  currentLanguage = lang
  
  // Store in chrome storage for persistence
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ language: lang }).catch(() => {})
  }
  
  return lang
}

// Initialize language from storage (fallback only)
export async function initLanguage(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    try {
      const result = await chrome.storage.local.get('language')
      if (result.language && result.language in translations) {
        currentLanguage = result.language as Language
      }
    } catch (error) {
      console.warn('[i18n] Failed to load language preference:', error)
    }
  }
}

