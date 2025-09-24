// Onboarding tutorial logic
export interface OnboardingStep {
  id: string
  title: string
  content: string
  action?: string
  icon?: string
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Woolsocks!',
    content: 'Never miss cashback again. This extension will help you earn money back on your online purchases.',
    icon: '🎉'
  },
  {
    id: 'cashback',
    title: 'Cashback Detection',
    content: 'When you visit partner sites like Amazon or Zalando, our icon will turn yellow to show cashback is available.',
    icon: '💰'
  },
  {
    id: 'activation',
    title: 'Activate Cashback',
    content: 'Click the extension icon or the popup to activate cashback. The icon turns green when active.',
    icon: '✅'
  },
  {
    id: 'vouchers',
    title: 'Gift Card Savings',
    content: 'At checkout, we\'ll suggest gift cards that give you instant cashback on your purchase.',
    icon: '🎁'
  },
  {
    id: 'settings',
    title: 'Customize Your Experience',
    content: 'Adjust notifications in settings. You can turn off popups but keep icon color changes.',
    icon: '⚙️'
  },
  {
    id: 'privacy',
    title: 'Your Privacy Matters',
    content: 'We only check the website you\'re on for deals. No browsing history or personal data is collected.',
    icon: '🔒'
  }
]

export function hasCompletedOnboarding(): boolean {
  return localStorage.getItem('woolsocks-onboarding-completed') === 'true'
}

export function markOnboardingComplete(): void {
  localStorage.setItem('woolsocks-onboarding-completed', 'true')
}

export function resetOnboarding(): void {
  localStorage.removeItem('woolsocks-onboarding-completed')
}
