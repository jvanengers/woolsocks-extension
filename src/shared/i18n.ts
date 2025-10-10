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
    debug: {
      checkoutDetected: 'Checkout detected for merchant: %1$s',
      noMerchant: 'No merchant found in Woolsocks system for: %1$s',
      noVouchers: 'No vouchers available for merchant: %1$s',
      partnerData: 'Partner data:',
      scriptInjected: 'Universal checkout script injected for tab %1$s on %1$s',
      showingOffer: 'Showing voucher offer for %1$s with %1$s% cashback'
    },
    icons: {
      attentionNeeded: 'Attention needed',
      cashbackActive: 'Cashback activated',
      cashbackAvailable: 'Cashback available — click to activate',
      noDeals: 'No deals on this site',
      voucherAvailable: 'Voucher deal available'
    },
    notifications: {
      cashbackActivated: 'Cashback Activated!',
      cashbackActivatedMessage: 'You\'ll earn %1$s% cashback on %1$s purchases',
      error: 'Error'
    },
    ocPanel: {
      acceptCookiesDisableAdblock: 'Accept all cookies and disable adblockers',
      activateCta: 'Activate',
      activateDescription: 'Cashback on %1$s',
      activateNow: 'Activate cashback now',
      activateTitle: 'Get %1$s back now',
      cashbackActive: 'Cashback active!',
      countdownCancel: 'Cancel',
      countdownTitle: 'Auto-activating cashback in %1$s...',
      dealsFoundAt: 'Deals found at %1$s',
      earnRateCashback: 'Earn %1$s% cashback',
      noDealsFound: 'No deals found',
      settingUpFor: 'Setting up cashback tracking for %1$s',
      shopAndPayNormally: 'Shop and pay like you do normally',
      signupLogin: 'Signup / Login',
      viewConditions: 'View conditions'
    },
    onboarding: {
      activationContent: 'Click the extension icon or the popup to activate cashback. The icon turns green when active.',
      activationTitle: 'Activate Cashback',
      askMeEachTime: 'Ask me each time',
      askMeEachTimeDescription: 'Show activation button, I\\\'ll click when I want cashback',
      automaticWithCountdown: 'Automatic',
      automaticWithCountdownDescription: 'Auto-redirect with 3-second countdown and cancel option',
      cashbackActivationContent: 'How would you like to activate cashback when you visit partner stores?',
      cashbackActivationTitle: 'Cashback Activation',
      cashbackContent: 'When you visit partner sites like Amazon or Zalando, our icon will turn yellow to show cashback is available.',
      cashbackTitle: 'Cashback Detection',
      dontRemindMe: 'Don\\\'t remind me',
      dontRemindMeDescription: 'No cashback detection or reminders',
      finish: 'Finish',
      next: 'Next',
      privacyContent: 'We only check the website you\'re on for deals. No browsing history or personal data is collected.',
      privacyTitle: 'Your Privacy Matters',
      recommended: 'Easiest!',
      savePreference: 'Save my preference',
      saving: 'Saving...',
      settingsContent: 'Adjust notifications in settings. You can turn off popups but keep icon color changes.',
      settingsTitle: 'Customize Your Experience',
      skip: 'Skip',
      vouchersContent: 'At checkout, we\'ll suggest gift cards that give you instant cashback on your purchase.',
      vouchersTitle: 'Gift Card Savings',
      welcomeContent: 'Never miss cashback again. This extension will help you earn money back on your online purchases.',
      welcomeTitle: 'Welcome to Woolsocks!'
    },
    options: {
      affiliateDisclosure: 'We earn commission when you shop through our links',
      autoActivateOnlineCashback: 'Auto-activate online cashback',
      autoActivateOnlineCashbackDescription: 'Automatically redirect through affiliate links with 3-second countdown',
      cacheManagement: 'Cache Management',
      cashbackSock: 'Cashback sock',
      checkingSession: 'Checking session…',
      clearCache: 'Clear Cache',
      disabled: 'Disabled',
      enabled: 'Enabled',
      greeting: 'Hi %1$s 👋',
      loginAtWs: 'Login at Woolsocks.eu',
      manualActivationDescription: 'Show activation button, you click when you want cashback',
      myCashbackTransactions: 'My cashback transactions',
      noActiveSession: 'No active session found.',
      noRecentTransactions: 'No recent transactions found.',
      payoutToIban: 'Payout to IBAN',
      pending: 'Pending',
      qaBypassTitle: 'QA: Always show voucher (ignore dismissals)',
      recentTransactions: 'Recent transactions',
      refresh: 'Refresh',
      refreshData: 'Refresh Data',
      sectionTitle: 'Options',
      showCashbackReminders: 'Show cashback reminders',
      showCashbackRemindersDescription: 'Detect and show cashback opportunities on partner sites',
      statusCancelled: 'Cancelled',
      statusConfirmed: 'Confirmed',
      statusPending: 'Pending',
      statusRejected: 'Rejected',
      title: 'Woolsocks',
      viewAllTransactions: 'View all transactions'
    },
    popup: {
      autoActivation: 'Auto-activation',
      checkingSession: 'Checking session…',
      dealsFor: 'Deals for %1$s',
      login: 'Login',
      noDealsForSite: 'No deals available for this site',
      onlineCashback: 'Online cashback',
      payWithVouchers: 'Pay with vouchers',
      trackingActive: 'Cashback tracking active!',
      vouchers: 'Vouchers'
    },
    voucher: {
      cashbackSuffix: ' of cashback',
      cashbackText: 'You\'ll get ',
      footer: 'Woolsocks - the money app',
      instructions: 'Buy the voucher at Woolsocks.eu and put the vouchercode in the field at checkout.',
      notNow: 'Not now',
      purchaseAmount: 'Purchase amount',
      title: 'Voucher',
      usps: {
        cashbackOnPurchase: '% cashback on purchase',
        instantDelivery: 'Instant delivery',
        useOnlineAtCheckout: 'Use online at checkout'
      },
      viewDetails: 'View voucher details'
    }
  },
  nl: {
    debug: {
      checkoutDetected: 'Checkout gedetecteerd voor merchant: %1$s',
      noMerchant: 'Geen merchant gevonden in Woolsocks systeem voor: %1$s',
      noVouchers: 'Geen vouchers beschikbaar voor merchant: %1$s',
      partnerData: 'Partner gegevens:',
      scriptInjected: 'Universeel checkout script geïnjecteerd voor tab %1$s op %1$s',
      showingOffer: 'Toon voucher aanbieding voor %1$s met %1$s% cashback'
    },
    icons: {
      attentionNeeded: 'Aandacht nodig',
      cashbackActive: 'Cashback geactiveerd',
      cashbackAvailable: 'Cashback beschikbaar — klik om te activeren',
      noDeals: 'Geen deals op deze site',
      voucherAvailable: 'Voucher deal beschikbaar'
    },
    notifications: {
      cashbackActivated: 'Cashback geactiveerd!',
      cashbackActivatedMessage: 'Je verdient %1$s% cashback bij %1$s aankopen',
      error: 'Fout'
    },
    ocPanel: {
      acceptCookiesDisableAdblock: 'Accepteer alle cookies en schakel adblockers uit',
      activateCta: 'Activeer',
      activateDescription: 'Cashback op %1$s',
      activateNow: 'Activeer cashback nu',
      activateTitle: 'Krijg nu %1$s terug',
      cashbackActive: 'Cashback actief!',
      countdownCancel: 'Annuleren',
      countdownTitle: 'Cashback wordt automatisch geactiveerd over %1$s...',
      dealsFoundAt: 'Deals gevonden op %1$s',
      earnRateCashback: 'Verdien %1$s% cashback',
      noDealsFound: 'Geen deals gevonden',
      settingUpFor: 'Cashback-tracking instellen voor %1$s',
      shopAndPayNormally: 'Winkel en betaal zoals je normaal doet',
      signupLogin: 'Registreren / Inloggen',
      viewConditions: 'Voorwaarden bekijken'
    },
    onboarding: {
      activationContent: 'Klik op het extensie-icoon of de popup om cashback te activeren. Het icoon wordt groen wanneer actief.',
      activationTitle: 'Cashback activeren',
      askMeEachTime: 'Vraag me elke keer',
      askMeEachTimeDescription: 'Toon activatieknop, ik klik wanneer ik cashback wil',
      automaticWithCountdown: 'Automatisch',
      automaticWithCountdownDescription: 'Auto-omleiding met 3-seconden aftelling en annuleeroptie',
      cashbackActivationContent: 'Hoe wil je cashback activeren wanneer je partnersites bezoekt?',
      cashbackActivationTitle: 'Cashback-activatie',
      cashbackContent: 'Wanneer je partnersites zoals Amazon of Zalando bezoekt, kleurt ons icoon geel om aan te geven dat er cashback beschikbaar is.',
      cashbackTitle: 'Cashback-detectie',
      dontRemindMe: 'Herinner me niet',
      dontRemindMeDescription: 'Geen cashback-detectie of herinneringen',
      finish: 'Voltooien',
      next: 'Volgende',
      privacyContent: 'We controleren alleen de website waarop je je bevindt op deals. Geen browsegeschiedenis of persoonlijke gegevens worden verzameld.',
      privacyTitle: 'Jouw privacy is belangrijk',
      recommended: 'Makkelijkst!',
      savePreference: 'Bewaar mijn voorkeur',
      saving: 'Opslaan...',
      settingsContent: 'Stel meldingen in bij instellingen. Je kunt pop-ups uitzetten maar de icoonkleur behouden.',
      settingsTitle: 'Pas je ervaring aan',
      skip: 'Overslaan',
      vouchersContent: 'Bij het afrekenen stellen we cadeaubonnen voor die je direct cashback geven op je aankoop.',
      vouchersTitle: 'Besparen met cadeaubonnen',
      welcomeContent: 'Mis nooit meer cashback. Deze extensie helpt je geld terug te verdienen op je online aankopen.',
      welcomeTitle: 'Welkom bij Woolsocks!'
    },
    options: {
      affiliateDisclosure: 'Wij verdienen commissie wanneer je via onze links winkelt',
      autoActivateOnlineCashback: 'Online cashback automatisch activeren',
      autoActivateOnlineCashbackDescription: 'Automatisch omleiden via affiliate links met 3-seconden aftelling',
      cacheManagement: 'Cache Beheer',
      cashbackSock: 'Cashbacksock',
      checkingSession: 'Sessie controleren…',
      clearCache: 'Cache Wissen',
      disabled: 'Uitgeschakeld',
      enabled: 'Ingeschakeld',
      greeting: 'Hoi %1$s 👋',
      loginAtWs: 'Inloggen op Woolsocks.eu',
      manualActivationDescription: 'Toon activatieknop, jij klikt wanneer je cashback wilt',
      myCashbackTransactions: 'Mijn cashbacktransacties',
      noActiveSession: 'Geen actieve sessie gevonden.',
      noRecentTransactions: 'Geen recente transacties gevonden.',
      payoutToIban: 'Uitbetaling naar IBAN',
      pending: 'In behandeling',
      qaBypassTitle: 'QA: Toon voucher altijd (negeer sluiten)',
      recentTransactions: 'Recente transacties',
      refresh: 'Vernieuwen',
      refreshData: 'Gegevens Vernieuwen',
      sectionTitle: 'Opties',
      showCashbackReminders: 'Cashback herinneringen tonen',
      showCashbackRemindersDescription: 'Detecteer en toon cashback mogelijkheden op partnersites',
      statusCancelled: 'Geannuleerd',
      statusConfirmed: 'Goedgekeurd',
      statusPending: 'In behandeling',
      statusRejected: 'Afgewezen',
      title: 'Woolsocks',
      viewAllTransactions: 'Bekijk alle transacties'
    },
    popup: {
      autoActivation: 'Automatisch activeren',
      checkingSession: 'Sessie controleren…',
      dealsFor: 'Deals voor %1$s',
      login: 'Inloggen',
      noDealsForSite: 'Geen deals beschikbaar voor deze site',
      onlineCashback: 'Online cashback',
      payWithVouchers: 'Betaal met cadeaukaarten',
      trackingActive: 'Cashback-tracking actief!',
      vouchers: 'Cadeaukaarten'
    },
    voucher: {
      cashbackSuffix: ' cashback',
      cashbackText: 'Je krijgt ',
      footer: 'Woolsocks - de geld app',
      instructions: 'Koop de voucher bij Woolsocks.eu en vul de vouchercode in bij het afrekenen.',
      notNow: 'Niet nu',
      purchaseAmount: 'Aankoopbedrag',
      title: 'Voucher',
      usps: {
        cashbackOnPurchase: '% cashback bij aankoop',
        instantDelivery: 'Direct geleverd',
        useOnlineAtCheckout: 'Online gebruiken bij het afrekenen'
      },
      viewDetails: 'Bekijk voucher details'
    }
  },
  de: {
    debug: {
      checkoutDetected: 'Checkout erkannt für Händler: %1$s',
      noMerchant: 'Kein Händler im Woolsocks-System gefunden für: %1$s',
      noVouchers: 'Keine Gutscheine verfügbar für Händler: %1$s',
      partnerData: 'Partner-Daten:',
      scriptInjected: 'Universelles Checkout-Skript injiziert für Tab %1$s auf %1$s',
      showingOffer: 'Zeige Gutscheinangebot für %1$s mit %1$s% Cashback'
    },
    icons: {
      attentionNeeded: 'Aufmerksamkeit erforderlich',
      cashbackActive: 'Cashback aktiviert',
      cashbackAvailable: 'Cashback verfügbar — klicken Sie zum Aktivieren',
      noDeals: 'Keine Angebote auf dieser Seite',
      voucherAvailable: 'Gutschein-Deal verfügbar'
    },
    notifications: {
      cashbackActivated: 'Cashback aktiviert!',
      cashbackActivatedMessage: 'Sie verdienen %1$s% Cashback bei %1$s Einkäufen',
      error: 'Fehler'
    },
    ocPanel: {
      acceptCookiesDisableAdblock: 'Alle Cookies akzeptieren und Adblocker deaktivieren',
      activateNow: 'Cashback jetzt aktivieren',
      cashbackActive: 'Cashback aktiv!',
      countdownCancel: 'Abbrechen',
      countdownTitle: 'Cashback wird automatisch aktiviert in %1$s...',
      dealsFoundAt: 'Angebote gefunden auf %1$s',
      earnRateCashback: 'Verdienen Sie %1$s% Cashback',
      noDealsFound: 'Keine Angebote gefunden',
      settingUpFor: 'Cashback-Tracking einrichten für %1$s',
      shopAndPayNormally: 'Einkaufen und bezahlen wie gewohnt',
      signupLogin: 'Registrieren / Anmelden',
      viewConditions: 'Bedingungen anzeigen'
    },
    onboarding: {
      activationContent: 'Klicken Sie auf das Erweiterungssymbol oder das Popup, um Cashback zu aktivieren. Das Symbol wird grün, wenn es aktiv ist.',
      activationTitle: 'Cashback aktivieren',
      askMeEachTime: 'Mich jedes Mal fragen',
      askMeEachTimeDescription: 'Aktivierungsschaltfläche anzeigen, ich klicke, wenn ich Cashback möchte',
      automaticWithCountdown: 'Automatisch',
      automaticWithCountdownDescription: 'Auto-Weiterleitung mit 3-Sekunden-Countdown und Abbrechen-Option',
      cashbackActivationContent: 'Wie möchten Sie Cashback aktivieren, wenn Sie Partner-Shops besuchen?',
      cashbackActivationTitle: 'Cashback-Aktivierung',
      cashbackContent: 'Wenn Sie Partnerseiten wie Amazon oder Zalando besuchen, wird unser Symbol gelb, um anzuzeigen, dass Cashback verfügbar ist.',
      cashbackTitle: 'Cashback-Erkennung',
      dontRemindMe: 'Mich nicht erinnern',
      dontRemindMeDescription: 'Keine Cashback-Erkennung oder Erinnerungen',
      finish: 'Beenden',
      next: 'Weiter',
      recommended: 'Einfachste!',
      saving: 'Speichern...',
      skip: 'Überspringen',
      vouchersContent: 'An der Kasse schlagen wir Geschenkkarten vor, die Ihnen sofortiges Cashback auf Ihren Einkauf geben.',
      vouchersTitle: 'Geschenkkarten-Ersparnisse',
      welcomeContent: 'Verpassen Sie nie wieder Cashback. Diese Erweiterung hilft Ihnen, Geld bei Ihren Online-Einkäufen zurückzuerhalten.',
      welcomeTitle: 'Willkommen bei Woolsocks!'
    },
    options: {
      affiliateDisclosure: 'Wir verdienen Provision, wenn Sie über unsere Links einkaufen',
      autoActivateOnlineCashback: 'Online-Cashback automatisch aktivieren',
      autoActivateOnlineCashbackDescription: 'Cashback automatisch aktivieren, wenn verfügbar',
      cacheManagement: 'Cache-Verwaltung',
      cashbackSock: 'Cashback-Sock',
      checkingSession: 'Sitzung wird überprüft…',
      clearCache: 'Cache Löschen',
      disabled: 'Deaktiviert',
      enabled: 'Aktiviert',
      greeting: 'Hallo %1$s 👋',
      loginAtWs: 'Bei Woolsocks anmelden',
      manualActivationDescription: 'Aktivierungsschaltfläche anzeigen, Sie klicken, wenn Sie Cashback möchten',
      myCashbackTransactions: 'Meine Cashback-Transaktionen',
      noActiveSession: 'Keine aktive Sitzung',
      noRecentTransactions: 'Keine letzten Transaktionen',
      payoutToIban: 'Auszahlung auf IBAN',
      pending: 'Ausstehend',
      qaBypassTitle: 'QA: Gutschein immer anzeigen (Schließen ignorieren)',
      recentTransactions: 'Letzte Transaktionen',
      refresh: 'Aktualisieren',
      refreshData: 'Daten Aktualisieren',
      sectionTitle: 'Einstellungen',
      showCashbackReminders: 'Cashback-Erinnerungen anzeigen',
      showCashbackRemindersDescription: 'Cashback-Möglichkeiten auf Partner-Websites erkennen und anzeigen',
      statusCancelled: 'Storniert',
      statusConfirmed: 'Bestätigt',
      statusPending: 'Ausstehend',
      statusRejected: 'Abgelehnt',
      title: 'Einstellungen',
      viewAllTransactions: 'Alle Transaktionen anzeigen'
    },
    popup: {
      autoActivation: 'Automatische Aktivierung',
      checkingSession: 'Sitzung wird überprüft…',
      dealsFor: 'Angebote für %1$s',
      login: 'Anmelden',
      noDealsForSite: 'Keine Angebote für diese Seite verfügbar',
      onlineCashback: 'Online-Cashback',
      payWithVouchers: 'Mit Gutscheinen bezahlen',
      trackingActive: 'Cashback-Tracking aktiv!',
      vouchers: 'Gutscheine'
    },
    voucher: {
      cashbackSuffix: ' Cashback',
      cashbackText: 'Sie erhalten ',
      footer: 'Woolsocks - die Geld-App',
      instructions: 'Kaufen Sie den Gutschein bei Woolsocks.eu und geben Sie den Gutscheincode an der Kasse ein.',
      notNow: 'Nicht jetzt',
      purchaseAmount: 'Kaufbetrag',
      title: 'Gutschein',
      usps: {
        cashbackOnPurchase: '% Cashback beim Kauf',
        instantDelivery: 'Sofortige Lieferung',
        useOnlineAtCheckout: 'Online an der Kasse verwenden'
      },
      viewDetails: 'Gutschein-Details anzeigen'
    }
  },
  fr: {
    debug: {
      checkoutDetected: 'Paiement détecté pour le marchand: %1$s',
      noMerchant: 'Aucun marchand trouvé dans le système Woolsocks pour: %1$s',
      noVouchers: 'Aucun bon disponible pour le marchand: %1$s',
      partnerData: 'Données du partenaire:',
      scriptInjected: 'Script de paiement universel injecté pour l\\\'onglet %1$s sur %1$s',
      showingOffer: 'Affichage de l\\\'offre de bon pour %1$s avec %1$s% de cashback'
    },
    icons: {
      attentionNeeded: 'Attention nécessaire',
      cashbackActive: 'Cashback activé',
      cashbackAvailable: 'Cashback disponible — cliquez pour activer',
      noDeals: 'Aucune offre sur ce site',
      voucherAvailable: 'Offre de bon disponible'
    },
    notifications: {
      cashbackActivated: 'Cashback activé!',
      cashbackActivatedMessage: 'Vous gagnerez %1$s% de cashback sur les achats %1$s',
      error: 'Erreur'
    },
    ocPanel: {
      acceptCookiesDisableAdblock: 'Accepter tous les cookies et désactiver les bloqueurs de publicité',
      activateNow: 'Activer le cashback maintenant',
      cashbackActive: 'Cashback actif !',
      countdownCancel: 'Annuler',
      countdownTitle: 'Activation automatique du cashback dans %1$s...',
      dealsFoundAt: 'Offres trouvées sur %1$s',
      earnRateCashback: 'Gagnez %1$s% de cashback',
      noDealsFound: 'Aucune offre trouvée',
      settingUpFor: 'Configuration du suivi cashback pour %1$s',
      shopAndPayNormally: 'Achetez et payez normalement',
      signupLogin: 'S\\\'inscrire / Se connecter',
      viewConditions: 'Voir les conditions'
    },
    onboarding: {
      activationContent: 'Cliquez sur l\\\'icône de l\\\'extension ou la popup pour activer le cashback. L\\\'icône devient verte quand elle est active.',
      activationTitle: 'Activer le cashback',
      askMeEachTime: 'Me demander à chaque fois',
      askMeEachTimeDescription: 'Afficher le bouton d\\\'activation, je clique quand je veux du cashback',
      automaticWithCountdown: 'Automatique',
      automaticWithCountdownDescription: 'Redirection automatique avec compte à rebours de 3 secondes et option d\\\'annulation',
      cashbackActivationContent: 'Comment souhaitez-vous activer le cashback lorsque vous visitez des magasins partenaires ?',
      cashbackActivationTitle: 'Activation du cashback',
      cashbackContent: 'Lorsque vous visitez des sites partenaires comme Amazon ou Zalando, notre icône devient jaune pour indiquer que le cashback est disponible.',
      cashbackTitle: 'Détection de cashback',
      dontRemindMe: 'Ne pas me rappeler',
      dontRemindMeDescription: 'Aucune détection ou rappel de cashback',
      finish: 'Terminer',
      next: 'Suivant',
      recommended: 'Plus facile !',
      saving: 'Enregistrement...',
      skip: 'Passer',
      vouchersContent: 'À la caisse, nous suggérons des cartes cadeaux qui vous donnent un cashback instantané sur votre achat.',
      vouchersTitle: 'Économies avec les cartes cadeaux',
      welcomeContent: 'Ne ratez plus jamais de cashback. Cette extension vous aide à récupérer de l\\\'argent sur vos achats en ligne.',
      welcomeTitle: 'Bienvenue chez Woolsocks !'
    },
    options: {
      affiliateDisclosure: 'Nous gagnons une commission quand vous achetez via nos liens',
      autoActivateOnlineCashback: 'Activer automatiquement le cashback en ligne',
      autoActivateOnlineCashbackDescription: 'Activer automatiquement le cashback quand disponible',
      cacheManagement: 'Gestion du Cache',
      cashbackSock: 'Chaussette Cashback',
      checkingSession: 'Vérification de la session…',
      clearCache: 'Vider le Cache',
      disabled: 'Désactivé',
      enabled: 'Activé',
      greeting: 'Salut %1$s 👋',
      loginAtWs: 'Se connecter à Woolsocks',
      manualActivationDescription: 'Afficher le bouton d\\\'activation, vous cliquez quand vous voulez du cashback',
      myCashbackTransactions: 'Mes transactions de cashback',
      noActiveSession: 'Aucune session active',
      noRecentTransactions: 'Aucune transaction récente',
      payoutToIban: 'Paiement vers IBAN',
      pending: 'En attente',
      qaBypassTitle: 'QA: Toujours afficher le bon (ignorer les fermetures)',
      recentTransactions: 'Transactions récentes',
      refresh: 'Actualiser',
      refreshData: 'Actualiser les Données',
      sectionTitle: 'Paramètres',
      showCashbackReminders: 'Afficher les rappels de cashback',
      showCashbackRemindersDescription: 'Détecter et afficher les opportunités de cashback sur les sites partenaires',
      statusCancelled: 'Annulé',
      statusConfirmed: 'Confirmé',
      statusPending: 'En attente',
      statusRejected: 'Rejeté',
      title: 'Paramètres',
      viewAllTransactions: 'Voir toutes les transactions'
    },
    popup: {
      autoActivation: 'Activation automatique',
      checkingSession: 'Vérification de la session…',
      dealsFor: 'Offres pour %1$s',
      login: 'Se connecter',
      noDealsForSite: 'Aucune offre disponible pour ce site',
      onlineCashback: 'Gagner du cashback en ligne chez %1$s',
      payWithVouchers: 'Payer avec des bons chez %1$s',
      trackingActive: 'Cashback actif',
      vouchers: 'Bons'
    },
    voucher: {
      cashbackSuffix: ' de cashback',
      cashbackText: 'Vous obtenez ',
      footer: 'Woolsocks - l\\\'application argent',
      instructions: 'Achetez le bon sur Woolsocks.eu et entrez le code du bon lors du paiement.',
      notNow: 'Pas maintenant',
      purchaseAmount: 'Montant d\\\'achat',
      title: 'Bon',
      usps: {
        cashbackOnPurchase: '% de cashback sur l\\\'achat',
        instantDelivery: 'Livraison instantanée',
        useOnlineAtCheckout: 'Utiliser en ligne lors du paiement'
      },
      viewDetails: 'Voir les détails du bon'
    }
  },
  it: {
    debug: {
      checkoutDetected: 'Checkout rilevato per il commerciante: %1$s',
      noMerchant: 'Nessun commerciante trovato nel sistema Woolsocks per: %1$s',
      noVouchers: 'Nessun voucher disponibile per il commerciante: %1$s',
      partnerData: 'Dati del partner:',
      scriptInjected: 'Script di checkout universale iniettato per la scheda %1$s su %1$s',
      showingOffer: 'Visualizzazione offerta voucher per %1$s con %1$s% di cashback'
    },
    icons: {
      attentionNeeded: 'Attenzione richiesta',
      cashbackActive: 'Cashback attivato',
      cashbackAvailable: 'Cashback disponibile — clicca per attivare',
      noDeals: 'Nessuna offerta su questo sito',
      voucherAvailable: 'Offerta voucher disponibile'
    },
    notifications: {
      cashbackActivated: 'Cashback attivato!',
      cashbackActivatedMessage: 'Guadagnerai %1$s% di cashback sugli acquisti %1$s',
      error: 'Errore'
    },
    ocPanel: {
      acceptCookiesDisableAdblock: 'Accetta tutti i cookie e disabilita i blocchi pubblicitari',
      activateNow: 'Attiva cashback ora',
      cashbackActive: 'Cashback attivo!',
      countdownCancel: 'Annulla',
      countdownTitle: 'Attivazione automatica cashback tra %1$s...',
      dealsFoundAt: 'Offerte trovate su %1$s',
      earnRateCashback: 'Guadagna %1$s% di cashback',
      noDealsFound: 'Nessuna offerta trovata',
      settingUpFor: 'Configurazione del monitoraggio cashback per %1$s',
      shopAndPayNormally: 'Acquista e paga normalmente',
      signupLogin: 'Registrati / Accedi',
      viewConditions: 'Visualizza condizioni'
    },
    onboarding: {
      activationContent: 'Clicca sull\\\'icona dell\\\'estensione o sul popup per attivare il cashback. L\\\'icona diventa verde quando è attiva.',
      activationTitle: 'Attiva cashback',
      askMeEachTime: 'Chiedimi ogni volta',
      askMeEachTimeDescription: 'Mostra il pulsante di attivazione, clicco quando voglio cashback',
      automaticWithCountdown: 'Automatico',
      automaticWithCountdownDescription: 'Reindirizzamento automatico con countdown di 3 secondi e opzione di annullamento',
      cashbackActivationContent: 'Come vorresti attivare il cashback quando visiti negozi partner?',
      cashbackActivationTitle: 'Attivazione cashback',
      cashbackContent: 'Quando visiti siti partner come Amazon o Zalando, la nostra icona diventa gialla per indicare che il cashback è disponibile.',
      cashbackTitle: 'Rilevamento cashback',
      dontRemindMe: 'Non ricordarmelo',
      dontRemindMeDescription: 'Nessun rilevamento o promemoria cashback',
      finish: 'Termina',
      next: 'Avanti',
      recommended: 'Più facile!',
      saving: 'Salvataggio...',
      skip: 'Salta',
      vouchersContent: 'Al checkout, suggeriamo carte regalo che ti danno cashback istantaneo sul tuo acquisto.',
      vouchersTitle: 'Risparmi con carte regalo',
      welcomeContent: 'Non perdere mai più il cashback. Questa estensione ti aiuta a recuperare denaro sui tuoi acquisti online.',
      welcomeTitle: 'Benvenuto in Woolsocks!'
    },
    options: {
      affiliateDisclosure: 'Guadagniamo una commissione quando acquisti tramite i nostri link',
      autoActivateOnlineCashback: 'Attiva automaticamente il cashback online',
      autoActivateOnlineCashbackDescription: 'Attiva automaticamente il cashback quando disponibile',
      cacheManagement: 'Gestione Cache',
      cashbackSock: 'Calzino Cashback',
      checkingSession: 'Controllo sessione…',
      clearCache: 'Cancella Cache',
      disabled: 'Disabilitato',
      enabled: 'Abilitato',
      greeting: 'Ciao %1$s 👋',
      loginAtWs: 'Accedi a Woolsocks',
      manualActivationDescription: 'Mostra il pulsante di attivazione, clicchi quando vuoi il cashback',
      myCashbackTransactions: 'Le mie transazioni cashback',
      noActiveSession: 'Nessuna sessione attiva',
      noRecentTransactions: 'Nessuna transazione recente',
      payoutToIban: 'Pagamento a IBAN',
      pending: 'In sospeso',
      qaBypassTitle: 'QA: Mostra sempre il voucher (ignora le chiusure)',
      recentTransactions: 'Transazioni recenti',
      refresh: 'Aggiorna',
      refreshData: 'Aggiorna Dati',
      sectionTitle: 'Impostazioni',
      showCashbackReminders: 'Mostra promemoria cashback',
      showCashbackRemindersDescription: 'Rileva e mostra le opportunità di cashback sui siti partner',
      statusCancelled: 'Annullato',
      statusConfirmed: 'Confermato',
      statusPending: 'In sospeso',
      statusRejected: 'Rifiutato',
      title: 'Impostazioni',
      viewAllTransactions: 'Visualizza tutte le transazioni'
    },
    popup: {
      autoActivation: 'Attivazione automatica',
      checkingSession: 'Controllo sessione…',
      dealsFor: 'Offerte per %1$s',
      login: 'Accedi',
      noDealsForSite: 'Nessuna offerta disponibile per questo sito',
      onlineCashback: 'Guadagna cashback online su %1$s',
      payWithVouchers: 'Paga con voucher su %1$s',
      trackingActive: 'Cashback attivo',
      vouchers: 'Voucher'
    },
    voucher: {
      cashbackSuffix: ' di cashback',
      cashbackText: 'Riceverai ',
      footer: 'Woolsocks - l\\\'app del denaro',
      instructions: 'Acquista il voucher su Woolsocks.eu e inserisci il codice voucher al momento del pagamento.',
      notNow: 'Non ora',
      purchaseAmount: 'Importo dell\\\'acquisto',
      title: 'Voucher',
      usps: {
        cashbackOnPurchase: '% di cashback sull\\\'acquisto',
        instantDelivery: 'Consegna istantanea',
        useOnlineAtCheckout: 'Usa online al momento del pagamento'
      },
      viewDetails: 'Visualizza dettagli voucher'
    }
  },
  es: {
    debug: {
      checkoutDetected: 'Checkout detectado para el comerciante: {merchant}',
      noMerchant: 'No se encontró comerciante en el sistema Woolsocks para: {merchant}',
      noVouchers: 'No hay cupones disponibles para el comerciante: {name}',
      partnerData: 'Datos del socio:',
      scriptInjected: 'Script de checkout universal inyectado para la pestaña {tabId} en {hostname}',
      showingOffer: 'Mostrando oferta de cupón para {name} con {rate}% de cashback'
    },
    icons: {
      attentionNeeded: 'Atención necesaria',
      cashbackActive: 'Cashback activado',
      cashbackAvailable: 'Cashback disponible — haz clic para activar',
      noDeals: 'No hay ofertas en este sitio',
      voucherAvailable: 'Oferta de cupón disponible'
    },
    notifications: {
      cashbackActivated: '¡Cashback activado!',
      cashbackActivatedMessage: 'Ganarás {rate}% de cashback en compras de {partner}',
      error: 'Error'
    },
    ocPanel: {
      acceptCookiesDisableAdblock: 'Aceptar todas las cookies y desactivar bloqueadores de anuncios',
      activateNow: 'Activar cashback ahora',
      cashbackActive: '¡Cashback activo!',
      countdownCancel: 'Cancelar',
      countdownTitle: 'Activación automática de cashback en {seconds}...',
      dealsFoundAt: 'Ofertas encontradas en {host}',
      earnRateCashback: 'Gana {rate}% de cashback',
      noDealsFound: 'No se encontraron ofertas',
      settingUpFor: 'Configurando seguimiento de cashback para {host}',
      shopAndPayNormally: 'Compra y paga normalmente',
      signupLogin: 'Registrarse / Iniciar sesión',
      viewConditions: 'Ver condiciones'
    },
    onboarding: {
      activationContent: 'Haz clic en el icono de la extensión o en el popup para activar el cashback. El icono se vuelve verde cuando está activo.',
      activationTitle: 'Activar cashback',
      askMeEachTime: 'Preguntarme cada vez',
      askMeEachTimeDescription: 'Mostrar botón de activación, hago clic cuando quiero cashback',
      automaticWithCountdown: 'Automático',
      automaticWithCountdownDescription: 'Redirección automática con cuenta regresiva de 3 segundos y opción de cancelar',
      cashbackActivationContent: '¿Cómo te gustaría activar el cashback cuando visites tiendas socias?',
      cashbackActivationTitle: 'Activación de cashback',
      cashbackContent: 'Cuando visites sitios socios como Amazon o Zalando, nuestro icono se volverá amarillo para mostrar que hay cashback disponible.',
      cashbackTitle: 'Detección de cashback',
      dontRemindMe: 'No recordarme',
      dontRemindMeDescription: 'Sin detección o recordatorios de cashback',
      finish: 'Finalizar',
      next: 'Siguiente',
      recommended: '¡Más fácil!',
      saving: 'Guardando...',
      skip: 'Omitir',
      vouchersContent: 'En el checkout, sugerimos tarjetas regalo que te dan cashback instantáneo en tu compra.',
      vouchersTitle: 'Ahorros con tarjetas regalo',
      welcomeContent: 'Nunca más pierdas cashback. Esta extensión te ayuda a recuperar dinero en tus compras online.',
      welcomeTitle: '¡Bienvenido a Woolsocks!'
    },
    options: {
      affiliateDisclosure: 'Ganamos una comisión cuando compras a través de nuestros enlaces',
      autoActivateOnlineCashback: 'Activar automáticamente el cashback online',
      autoActivateOnlineCashbackDescription: 'Activar automáticamente el cashback cuando esté disponible',
      cacheManagement: 'Gestión de Caché',
      cashbackSock: 'Calcetín Cashback',
      checkingSession: 'Verificando sesión…',
      clearCache: 'Limpiar Caché',
      disabled: 'Deshabilitado',
      enabled: 'Habilitado',
      greeting: 'Hola {name} 👋',
      loginAtWs: 'Iniciar sesión en Woolsocks',
      manualActivationDescription: 'Mostrar botón de activación, haces clic cuando quieres cashback',
      myCashbackTransactions: 'Mis transacciones de cashback',
      noActiveSession: 'No hay sesión activa',
      noRecentTransactions: 'No hay transacciones recientes',
      payoutToIban: 'Pago a IBAN',
      pending: 'Pendiente',
      qaBypassTitle: 'QA: Mostrar siempre el cupón (ignorar cierres)',
      recentTransactions: 'Transacciones recientes',
      refresh: 'Actualizar',
      refreshData: 'Actualizar Datos',
      sectionTitle: 'Configuración',
      showCashbackReminders: 'Mostrar recordatorios de cashback',
      showCashbackRemindersDescription: 'Detectar y mostrar oportunidades de cashback en sitios socios',
      statusCancelled: 'Cancelado',
      statusConfirmed: 'Confirmado',
      statusPending: 'Pendiente',
      statusRejected: 'Rechazado',
      title: 'Configuración',
      viewAllTransactions: 'Ver todas las transacciones'
    },
    popup: {
      autoActivation: 'Activación automática',
      checkingSession: 'Verificando sesión…',
      dealsFor: 'Ofertas para {domain}',
      login: 'Iniciar sesión',
      noDealsForSite: 'No hay ofertas disponibles para este sitio',
      onlineCashback: 'Gana cashback online en {domain}',
      payWithVouchers: 'Pagar con cupones en {domain}',
      trackingActive: 'Cashback activo',
      vouchers: 'Cupones'
    },
    voucher: {
      cashbackSuffix: ' de cashback',
      cashbackText: 'Recibirás ',
      footer: 'Woolsocks - la app del dinero',
      instructions: 'Compra el cupón en Woolsocks.eu e introduce el código del cupón al pagar.',
      notNow: 'Ahora no',
      purchaseAmount: 'Importe de la compra',
      title: 'Cupón',
      usps: {
        cashbackOnPurchase: '% de cashback en la compra',
        instantDelivery: 'Entrega instantánea',
        useOnlineAtCheckout: 'Usar online al pagar'
      },
      viewDetails: 'Ver detalles del cupón'
    }
  }
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

