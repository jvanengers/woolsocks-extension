// Onboarding tutorial logic
export interface OnboardingStep {
  id: string
  title: string
  content: string
  action?: string
  icon?: string
}

import { translate } from './i18n'

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: translate('onboarding.welcomeTitle'),
    content: translate('onboarding.welcomeContent'),
    icon: '🎉'
  },
  {
    id: 'cashback',
    title: translate('onboarding.cashbackTitle'),
    content: translate('onboarding.cashbackContent'),
    icon: '💰'
  },
  {
    id: 'activation',
    title: translate('onboarding.activationTitle'),
    content: translate('onboarding.activationContent'),
    icon: '✅'
  },
  {
    id: 'vouchers',
    title: translate('onboarding.vouchersTitle'),
    content: translate('onboarding.vouchersContent'),
    icon: '🎁'
  },
  {
    id: 'settings',
    title: translate('onboarding.settingsTitle'),
    content: translate('onboarding.settingsContent'),
    icon: '⚙️'
  },
  {
    id: 'privacy',
    title: translate('onboarding.privacyTitle'),
    content: translate('onboarding.privacyContent'),
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

