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
    myCashbackTransactions: string
    noRecentTransactions: string
    viewAllTransactions: string
    enabled: string
    disabled: string
    cacheManagement: string
    refreshData: string
    clearCache: string
    autoActivateOnlineCashback: string
    autoActivateOnlineCashbackDescription: string
    manualActivationDescription: string
    showCashbackReminders: string
    showCashbackRemindersDescription: string
    affiliateDisclosure: string
    qaBypassTitle: string
    payoutToIban: string
    pending: string
    // Transaction statuses
    statusConfirmed: string
    statusPending: string
    statusCancelled: string
    statusRejected: string
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
      settingsTitle?: string
      settingsContent?: string
      privacyTitle?: string
      privacyContent?: string
      cashbackActivationTitle: string
      cashbackActivationContent: string
      automaticWithCountdown: string
      automaticWithCountdownDescription: string
      askMeEachTime: string
      askMeEachTimeDescription: string
      dontRemindMe: string
      dontRemindMeDescription: string
      recommended: string
      skip: string
      next: string
      finish: string
      saving: string
      savePreference?: string
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
    countdownTitle: string // Auto-activating cashback in {seconds}...
    countdownCancel: string // Cancel
    activateNow: string // Activate cashback now
    // Manual activation banner (new keys)
    activateTitle?: string // e.g., Get 2.5% back now
    activateDescription?: string // e.g., Cashback on hema.nl
    activateCta?: string // e.g., Activate
  }
}

const translations: Record<Language, Translations> = {
  en: {
    voucher: {
      title: 'Voucher', // Test change for Lokalise sync
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
      myCashbackTransactions: 'My cashback transactions',
      noRecentTransactions: 'No recent transactions found.',
      viewAllTransactions: 'View all transactions',
      enabled: 'Enabled',
      disabled: 'Disabled',
      cacheManagement: 'Cache Management',
      refreshData: 'Refresh Data',
      clearCache: 'Clear Cache',
    autoActivateOnlineCashback: 'Auto-activate online cashback',
    autoActivateOnlineCashbackDescription: 'Automatically redirect through affiliate links with 3-second countdown',
    manualActivationDescription: 'Show activation button, you click when you want cashback',
    showCashbackReminders: 'Show cashback reminders',
    showCashbackRemindersDescription: 'Detect and show cashback opportunities on partner sites',
    affiliateDisclosure: 'We earn commission when you shop through our links',
    qaBypassTitle: 'QA: Always show voucher (ignore dismissals)',
    payoutToIban: 'Payout to IBAN',
    pending: 'Pending',
    // Transaction statuses
    statusConfirmed: 'Confirmed',
    statusPending: 'Pending',
    statusCancelled: 'Cancelled',
    statusRejected: 'Rejected',
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
      cashbackActivationTitle: 'Cashback Activation',
      cashbackActivationContent: 'How would you like to activate cashback when you visit partner stores?',
      automaticWithCountdown: 'Automatic',
      automaticWithCountdownDescription: 'Auto-redirect with 3-second countdown and cancel option',
      askMeEachTime: 'Ask me each time',
      askMeEachTimeDescription: 'Show activation button, I\'ll click when I want cashback',
      dontRemindMe: 'Don\'t remind me',
      dontRemindMeDescription: 'No cashback detection or reminders',
      recommended: 'Easiest!',
      skip: 'Skip',
      next: 'Next',
      finish: 'Finish',
      saving: 'Saving...',
      savePreference: 'Save my preference'
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
      countdownTitle: 'Auto-activating cashback in {seconds}...',
      countdownCancel: 'Cancel',
      activateNow: 'Activate cashback now',
      activateTitle: 'Get {rate} back now',
      activateDescription: 'Cashback on {host}',
      activateCta: 'Activate'
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
      myCashbackTransactions: 'Mijn cashbacktransacties',
      noRecentTransactions: 'Geen recente transacties gevonden.',
      viewAllTransactions: 'Bekijk alle transacties',
      enabled: 'Ingeschakeld',
      disabled: 'Uitgeschakeld',
      cacheManagement: 'Cache Beheer',
      refreshData: 'Gegevens Vernieuwen',
      clearCache: 'Cache Wissen',
      autoActivateOnlineCashback: 'Online cashback automatisch activeren',
      autoActivateOnlineCashbackDescription: 'Automatisch omleiden via affiliate links met 3-seconden aftelling',
      manualActivationDescription: 'Toon activatieknop, jij klikt wanneer je cashback wilt',
      showCashbackReminders: 'Cashback herinneringen tonen',
      showCashbackRemindersDescription: 'Detecteer en toon cashback mogelijkheden op partnersites',
      affiliateDisclosure: 'Wij verdienen commissie wanneer je via onze links winkelt',
      qaBypassTitle: 'QA: Toon voucher altijd (negeer sluiten)',
      payoutToIban: 'Uitbetaling naar IBAN',
      pending: 'In behandeling',
      // Transaction statuses
      statusConfirmed: 'Goedgekeurd',
      statusPending: 'In behandeling',
      statusCancelled: 'Geannuleerd',
      statusRejected: 'Afgewezen',
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
      cashbackActivationTitle: 'Cashback-activatie',
      cashbackActivationContent: 'Hoe wil je cashback activeren wanneer je partnersites bezoekt?',
      automaticWithCountdown: 'Automatisch',
      automaticWithCountdownDescription: 'Auto-omleiding met 3-seconden aftelling en annuleeroptie',
      askMeEachTime: 'Vraag me elke keer',
      askMeEachTimeDescription: 'Toon activatieknop, ik klik wanneer ik cashback wil',
      dontRemindMe: 'Herinner me niet',
      dontRemindMeDescription: 'Geen cashback-detectie of herinneringen',
      recommended: 'Makkelijkst!',
      skip: 'Overslaan',
      next: 'Volgende',
      finish: 'Voltooien',
      saving: 'Opslaan...',
      savePreference: 'Bewaar mijn voorkeur'
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
      countdownTitle: 'Cashback wordt automatisch geactiveerd over {seconds}...',
      countdownCancel: 'Annuleren',
      activateNow: 'Activeer cashback nu',
      activateTitle: 'Krijg nu {rate} terug',
      activateDescription: 'Cashback op {host}',
      activateCta: 'Activeer'
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
    popup: {
      checkingSession: 'Sitzung wird überprüft…',
      login: 'Anmelden',
      dealsFor: 'Angebote für {domain}',
      onlineCashback: 'Online-Cashback',
      autoActivation: 'Automatische Aktivierung',
      trackingActive: 'Cashback-Tracking aktiv!',
      vouchers: 'Gutscheine',
      payWithVouchers: 'Mit Gutscheinen bezahlen',
      noDealsForSite: 'Keine Angebote für diese Seite verfügbar',
    },
    options: {
      title: 'Einstellungen',
      sectionTitle: 'Einstellungen',
      checkingSession: 'Sitzung wird überprüft…',
      noActiveSession: 'Keine aktive Sitzung',
      loginAtWs: 'Bei Woolsocks anmelden',
      greeting: 'Hallo {name} 👋',
      cashbackSock: 'Cashback-Sock',
      refresh: 'Aktualisieren',
      recentTransactions: 'Letzte Transaktionen',
      myCashbackTransactions: 'Meine Cashback-Transaktionen',
      noRecentTransactions: 'Keine letzten Transaktionen',
      viewAllTransactions: 'Alle Transaktionen anzeigen',
      enabled: 'Aktiviert',
      disabled: 'Deaktiviert',
      cacheManagement: 'Cache-Verwaltung',
      refreshData: 'Daten Aktualisieren',
      clearCache: 'Cache Löschen',
      autoActivateOnlineCashback: 'Online-Cashback automatisch aktivieren',
      autoActivateOnlineCashbackDescription: 'Cashback automatisch aktivieren, wenn verfügbar',
      manualActivationDescription: 'Aktivierungsschaltfläche anzeigen, Sie klicken, wenn Sie Cashback möchten',
      showCashbackReminders: 'Cashback-Erinnerungen anzeigen',
      showCashbackRemindersDescription: 'Cashback-Möglichkeiten auf Partner-Websites erkennen und anzeigen',
      affiliateDisclosure: 'Wir verdienen Provision, wenn Sie über unsere Links einkaufen',
      qaBypassTitle: 'QA: Gutschein immer anzeigen (Schließen ignorieren)',
      payoutToIban: 'Auszahlung auf IBAN',
      pending: 'Ausstehend',
      // Transaction statuses
      statusConfirmed: 'Bestätigt',
      statusPending: 'Ausstehend',
      statusCancelled: 'Storniert',
      statusRejected: 'Abgelehnt',
    },
    onboarding: {
      welcomeTitle: 'Willkommen bei Woolsocks!',
      welcomeContent: 'Verpassen Sie nie wieder Cashback. Diese Erweiterung hilft Ihnen, Geld bei Ihren Online-Einkäufen zurückzuerhalten.',
      cashbackTitle: 'Cashback-Erkennung',
      cashbackContent: 'Wenn Sie Partnerseiten wie Amazon oder Zalando besuchen, wird unser Symbol gelb, um anzuzeigen, dass Cashback verfügbar ist.',
      activationTitle: 'Cashback aktivieren',
      activationContent: 'Klicken Sie auf das Erweiterungssymbol oder das Popup, um Cashback zu aktivieren. Das Symbol wird grün, wenn es aktiv ist.',
      vouchersTitle: 'Geschenkkarten-Ersparnisse',
      vouchersContent: 'An der Kasse schlagen wir Geschenkkarten vor, die Ihnen sofortiges Cashback auf Ihren Einkauf geben.',
      cashbackActivationTitle: 'Cashback-Aktivierung',
      cashbackActivationContent: 'Wie möchten Sie Cashback aktivieren, wenn Sie Partner-Shops besuchen?',
      automaticWithCountdown: 'Automatisch',
      automaticWithCountdownDescription: 'Auto-Weiterleitung mit 3-Sekunden-Countdown und Abbrechen-Option',
      askMeEachTime: 'Mich jedes Mal fragen',
      askMeEachTimeDescription: 'Aktivierungsschaltfläche anzeigen, ich klicke, wenn ich Cashback möchte',
      dontRemindMe: 'Mich nicht erinnern',
      dontRemindMeDescription: 'Keine Cashback-Erkennung oder Erinnerungen',
      recommended: 'Einfachste!',
      skip: 'Überspringen',
      next: 'Weiter',
      finish: 'Beenden',
      saving: 'Speichern...'
    },
    ocPanel: {
      dealsFoundAt: 'Angebote gefunden auf {host}',
      settingUpFor: 'Cashback-Tracking einrichten für {host}',
      noDealsFound: 'Keine Angebote gefunden',
      viewConditions: 'Bedingungen anzeigen',
      signupLogin: 'Registrieren / Anmelden',
      cashbackActive: 'Cashback aktiv!',
      shopAndPayNormally: 'Einkaufen und bezahlen wie gewohnt',
      acceptCookiesDisableAdblock: 'Alle Cookies akzeptieren und Adblocker deaktivieren',
      earnRateCashback: 'Verdienen Sie {rate}% Cashback',
      countdownTitle: 'Cashback wird automatisch aktiviert in {seconds}...',
      countdownCancel: 'Abbrechen',
      activateNow: 'Cashback jetzt aktivieren'
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
    popup: {
      checkingSession: 'Vérification de la session…',
      login: 'Se connecter',
      dealsFor: 'Offres pour {domain}',
      onlineCashback: 'Gagner du cashback en ligne chez {domain}',
      autoActivation: 'Activation automatique',
      trackingActive: 'Cashback actif',
      vouchers: 'Bons',
      payWithVouchers: 'Payer avec des bons chez {domain}',
      noDealsForSite: 'Aucune offre disponible pour ce site',
    },
    options: {
      title: 'Paramètres',
      sectionTitle: 'Paramètres',
      checkingSession: 'Vérification de la session…',
      noActiveSession: 'Aucune session active',
      loginAtWs: 'Se connecter à Woolsocks',
      greeting: 'Salut {name} 👋',
      cashbackSock: 'Chaussette Cashback',
      refresh: 'Actualiser',
      recentTransactions: 'Transactions récentes',
      myCashbackTransactions: 'Mes transactions de cashback',
      noRecentTransactions: 'Aucune transaction récente',
      viewAllTransactions: 'Voir toutes les transactions',
      enabled: 'Activé',
      disabled: 'Désactivé',
      cacheManagement: 'Gestion du Cache',
      refreshData: 'Actualiser les Données',
      clearCache: 'Vider le Cache',
      autoActivateOnlineCashback: 'Activer automatiquement le cashback en ligne',
      autoActivateOnlineCashbackDescription: 'Activer automatiquement le cashback quand disponible',
      manualActivationDescription: 'Afficher le bouton d\'activation, vous cliquez quand vous voulez du cashback',
      showCashbackReminders: 'Afficher les rappels de cashback',
      showCashbackRemindersDescription: 'Détecter et afficher les opportunités de cashback sur les sites partenaires',
      affiliateDisclosure: 'Nous gagnons une commission quand vous achetez via nos liens',
      qaBypassTitle: 'QA: Toujours afficher le bon (ignorer les fermetures)',
      payoutToIban: 'Paiement vers IBAN',
      pending: 'En attente',
      // Transaction statuses
      statusConfirmed: 'Confirmé',
      statusPending: 'En attente',
      statusCancelled: 'Annulé',
      statusRejected: 'Rejeté',
    },
    onboarding: {
      welcomeTitle: 'Bienvenue chez Woolsocks !',
      welcomeContent: 'Ne ratez plus jamais de cashback. Cette extension vous aide à récupérer de l\'argent sur vos achats en ligne.',
      cashbackTitle: 'Détection de cashback',
      cashbackContent: 'Lorsque vous visitez des sites partenaires comme Amazon ou Zalando, notre icône devient jaune pour indiquer que le cashback est disponible.',
      activationTitle: 'Activer le cashback',
      activationContent: 'Cliquez sur l\'icône de l\'extension ou la popup pour activer le cashback. L\'icône devient verte quand elle est active.',
      vouchersTitle: 'Économies avec les cartes cadeaux',
      vouchersContent: 'À la caisse, nous suggérons des cartes cadeaux qui vous donnent un cashback instantané sur votre achat.',
      cashbackActivationTitle: 'Activation du cashback',
      cashbackActivationContent: 'Comment souhaitez-vous activer le cashback lorsque vous visitez des magasins partenaires ?',
      automaticWithCountdown: 'Automatique',
      automaticWithCountdownDescription: 'Redirection automatique avec compte à rebours de 3 secondes et option d\'annulation',
      askMeEachTime: 'Me demander à chaque fois',
      askMeEachTimeDescription: 'Afficher le bouton d\'activation, je clique quand je veux du cashback',
      dontRemindMe: 'Ne pas me rappeler',
      dontRemindMeDescription: 'Aucune détection ou rappel de cashback',
      recommended: 'Plus facile !',
      skip: 'Passer',
      next: 'Suivant',
      finish: 'Terminer',
      saving: 'Enregistrement...'
    },
    ocPanel: {
      dealsFoundAt: 'Offres trouvées sur {host}',
      settingUpFor: 'Configuration du suivi cashback pour {host}',
      noDealsFound: 'Aucune offre trouvée',
      viewConditions: 'Voir les conditions',
      signupLogin: 'S\'inscrire / Se connecter',
      cashbackActive: 'Cashback actif !',
      shopAndPayNormally: 'Achetez et payez normalement',
      acceptCookiesDisableAdblock: 'Accepter tous les cookies et désactiver les bloqueurs de publicité',
      earnRateCashback: 'Gagnez {rate}% de cashback',
      countdownTitle: 'Activation automatique du cashback dans {seconds}...',
      countdownCancel: 'Annuler',
      activateNow: 'Activer le cashback maintenant'
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
    popup: {
      checkingSession: 'Controllo sessione…',
      login: 'Accedi',
      dealsFor: 'Offerte per {domain}',
      onlineCashback: 'Guadagna cashback online su {domain}',
      autoActivation: 'Attivazione automatica',
      trackingActive: 'Cashback attivo',
      vouchers: 'Voucher',
      payWithVouchers: 'Paga con voucher su {domain}',
      noDealsForSite: 'Nessuna offerta disponibile per questo sito',
    },
    options: {
      title: 'Impostazioni',
      sectionTitle: 'Impostazioni',
      checkingSession: 'Controllo sessione…',
      noActiveSession: 'Nessuna sessione attiva',
      loginAtWs: 'Accedi a Woolsocks',
      greeting: 'Ciao {name} 👋',
      cashbackSock: 'Calzino Cashback',
      refresh: 'Aggiorna',
      recentTransactions: 'Transazioni recenti',
      myCashbackTransactions: 'Le mie transazioni cashback',
      noRecentTransactions: 'Nessuna transazione recente',
      viewAllTransactions: 'Visualizza tutte le transazioni',
      enabled: 'Abilitato',
      disabled: 'Disabilitato',
      cacheManagement: 'Gestione Cache',
      refreshData: 'Aggiorna Dati',
      clearCache: 'Cancella Cache',
      autoActivateOnlineCashback: 'Attiva automaticamente il cashback online',
      autoActivateOnlineCashbackDescription: 'Attiva automaticamente il cashback quando disponibile',
      manualActivationDescription: 'Mostra il pulsante di attivazione, clicchi quando vuoi il cashback',
      showCashbackReminders: 'Mostra promemoria cashback',
      showCashbackRemindersDescription: 'Rileva e mostra le opportunità di cashback sui siti partner',
      affiliateDisclosure: 'Guadagniamo una commissione quando acquisti tramite i nostri link',
      qaBypassTitle: 'QA: Mostra sempre il voucher (ignora le chiusure)',
      payoutToIban: 'Pagamento a IBAN',
      pending: 'In sospeso',
      // Transaction statuses
      statusConfirmed: 'Confermato',
      statusPending: 'In sospeso',
      statusCancelled: 'Annullato',
      statusRejected: 'Rifiutato',
    },
    onboarding: {
      welcomeTitle: 'Benvenuto in Woolsocks!',
      welcomeContent: 'Non perdere mai più il cashback. Questa estensione ti aiuta a recuperare denaro sui tuoi acquisti online.',
      cashbackTitle: 'Rilevamento cashback',
      cashbackContent: 'Quando visiti siti partner come Amazon o Zalando, la nostra icona diventa gialla per indicare che il cashback è disponibile.',
      activationTitle: 'Attiva cashback',
      activationContent: 'Clicca sull\'icona dell\'estensione o sul popup per attivare il cashback. L\'icona diventa verde quando è attiva.',
      vouchersTitle: 'Risparmi con carte regalo',
      vouchersContent: 'Al checkout, suggeriamo carte regalo che ti danno cashback istantaneo sul tuo acquisto.',
      cashbackActivationTitle: 'Attivazione cashback',
      cashbackActivationContent: 'Come vorresti attivare il cashback quando visiti negozi partner?',
      automaticWithCountdown: 'Automatico',
      automaticWithCountdownDescription: 'Reindirizzamento automatico con countdown di 3 secondi e opzione di annullamento',
      askMeEachTime: 'Chiedimi ogni volta',
      askMeEachTimeDescription: 'Mostra il pulsante di attivazione, clicco quando voglio cashback',
      dontRemindMe: 'Non ricordarmelo',
      dontRemindMeDescription: 'Nessun rilevamento o promemoria cashback',
      recommended: 'Più facile!',
      skip: 'Salta',
      next: 'Avanti',
      finish: 'Termina',
      saving: 'Salvataggio...'
    },
    ocPanel: {
      dealsFoundAt: 'Offerte trovate su {host}',
      settingUpFor: 'Configurazione del monitoraggio cashback per {host}',
      noDealsFound: 'Nessuna offerta trovata',
      viewConditions: 'Visualizza condizioni',
      signupLogin: 'Registrati / Accedi',
      cashbackActive: 'Cashback attivo!',
      shopAndPayNormally: 'Acquista e paga normalmente',
      acceptCookiesDisableAdblock: 'Accetta tutti i cookie e disabilita i blocchi pubblicitari',
      earnRateCashback: 'Guadagna {rate}% di cashback',
      countdownTitle: 'Attivazione automatica cashback tra {seconds}...',
      countdownCancel: 'Annulla',
      activateNow: 'Attiva cashback ora'
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
    popup: {
      checkingSession: 'Verificando sesión…',
      login: 'Iniciar sesión',
      dealsFor: 'Ofertas para {domain}',
      onlineCashback: 'Gana cashback online en {domain}',
      autoActivation: 'Activación automática',
      trackingActive: 'Cashback activo',
      vouchers: 'Cupones',
      payWithVouchers: 'Pagar con cupones en {domain}',
      noDealsForSite: 'No hay ofertas disponibles para este sitio',
    },
    options: {
      title: 'Configuración',
      sectionTitle: 'Configuración',
      checkingSession: 'Verificando sesión…',
      noActiveSession: 'No hay sesión activa',
      loginAtWs: 'Iniciar sesión en Woolsocks',
      greeting: 'Hola {name} 👋',
      cashbackSock: 'Calcetín Cashback',
      refresh: 'Actualizar',
      recentTransactions: 'Transacciones recientes',
      myCashbackTransactions: 'Mis transacciones de cashback',
      noRecentTransactions: 'No hay transacciones recientes',
      viewAllTransactions: 'Ver todas las transacciones',
      enabled: 'Habilitado',
      disabled: 'Deshabilitado',
      cacheManagement: 'Gestión de Caché',
      refreshData: 'Actualizar Datos',
      clearCache: 'Limpiar Caché',
      autoActivateOnlineCashback: 'Activar automáticamente el cashback online',
      autoActivateOnlineCashbackDescription: 'Activar automáticamente el cashback cuando esté disponible',
      manualActivationDescription: 'Mostrar botón de activación, haces clic cuando quieres cashback',
      showCashbackReminders: 'Mostrar recordatorios de cashback',
      showCashbackRemindersDescription: 'Detectar y mostrar oportunidades de cashback en sitios socios',
      affiliateDisclosure: 'Ganamos una comisión cuando compras a través de nuestros enlaces',
      qaBypassTitle: 'QA: Mostrar siempre el cupón (ignorar cierres)',
      payoutToIban: 'Pago a IBAN',
      pending: 'Pendiente',
      // Transaction statuses
      statusConfirmed: 'Confirmado',
      statusPending: 'Pendiente',
      statusCancelled: 'Cancelado',
      statusRejected: 'Rechazado',
    },
    onboarding: {
      welcomeTitle: '¡Bienvenido a Woolsocks!',
      welcomeContent: 'Nunca más pierdas cashback. Esta extensión te ayuda a recuperar dinero en tus compras online.',
      cashbackTitle: 'Detección de cashback',
      cashbackContent: 'Cuando visites sitios socios como Amazon o Zalando, nuestro icono se volverá amarillo para mostrar que hay cashback disponible.',
      activationTitle: 'Activar cashback',
      activationContent: 'Haz clic en el icono de la extensión o en el popup para activar el cashback. El icono se vuelve verde cuando está activo.',
      vouchersTitle: 'Ahorros con tarjetas regalo',
      vouchersContent: 'En el checkout, sugerimos tarjetas regalo que te dan cashback instantáneo en tu compra.',
      cashbackActivationTitle: 'Activación de cashback',
      cashbackActivationContent: '¿Cómo te gustaría activar el cashback cuando visites tiendas socias?',
      automaticWithCountdown: 'Automático',
      automaticWithCountdownDescription: 'Redirección automática con cuenta regresiva de 3 segundos y opción de cancelar',
      askMeEachTime: 'Preguntarme cada vez',
      askMeEachTimeDescription: 'Mostrar botón de activación, hago clic cuando quiero cashback',
      dontRemindMe: 'No recordarme',
      dontRemindMeDescription: 'Sin detección o recordatorios de cashback',
      recommended: '¡Más fácil!',
      skip: 'Omitir',
      next: 'Siguiente',
      finish: 'Finalizar',
      saving: 'Guardando...'
    },
    ocPanel: {
      dealsFoundAt: 'Ofertas encontradas en {host}',
      settingUpFor: 'Configurando seguimiento de cashback para {host}',
      noDealsFound: 'No se encontraron ofertas',
      viewConditions: 'Ver condiciones',
      signupLogin: 'Registrarse / Iniciar sesión',
      cashbackActive: '¡Cashback activo!',
      shopAndPayNormally: 'Compra y paga normalmente',
      acceptCookiesDisableAdblock: 'Aceptar todas las cookies y desactivar bloqueadores de anuncios',
      earnRateCashback: 'Gana {rate}% de cashback',
      countdownTitle: 'Activación automática de cashback en {seconds}...',
      countdownCancel: 'Cancelar',
      activateNow: 'Activar cashback ahora'
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

// Translate transaction status
export function translateTransactionStatus(status: string | undefined | null): string {
  if (!status) return translate('options.statusPending')
  
  const normalizedStatus = status.toLowerCase()
  
  switch (normalizedStatus) {
    case 'confirmed':
      return translate('options.statusConfirmed')
    case 'pending':
      return translate('options.statusPending')
    case 'cancelled':
    case 'canceled':
      return translate('options.statusCancelled')
    case 'rejected':
      return translate('options.statusRejected')
    default:
      // For unknown statuses, return the original status or fallback to pending
      return status || translate('options.statusPending')
  }
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
        return
      }
    } catch (error) {
      console.warn('[i18n] Failed to load language preference:', error)
    }
  }
  // Fallback: use browser UI language if not logged in / no stored preference
  try {
    const navLang = (navigator.language || (navigator as any).userLanguage || 'en') as string
    const lang = normalizeLanguage(navLang)
    currentLanguage = lang
  } catch {}
}

