// Onboarding tutorial logic
export interface OnboardingStep {
  id: string
  title: string
  content: string
  action?: string
  icon?: string
}

import { translate } from './i18n'
import { getPlatform, allowsAutoRedirect } from './platform'

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
    id: 'cashback-activation',
    title: translate('onboarding.cashbackActivationTitle'),
    content: translate('onboarding.cashbackActivationContent'),
    icon: '⚡'
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

/**
 * Get platform-specific onboarding options for cashback activation
 * @returns Array of option objects with id, label, and description
 */
export function getCashbackActivationOptions() {
  const supportsAuto = allowsAutoRedirect()
  
  const options = [
    {
      id: 'manual',
      label: translate('onboarding.askMeEachTime'),
      description: translate('onboarding.askMeEachTimeDescription')
    },
    {
      id: 'disabled',
      label: translate('onboarding.dontRemindMe'),
      description: translate('onboarding.dontRemindMeDescription')
    }
  ]
  
  if (supportsAuto) {
    options.unshift({
      id: 'auto',
      label: translate('onboarding.automaticWithCountdown'),
      description: translate('onboarding.automaticWithCountdownDescription')
    })
  }
  
  return options
}

/**
 * Apply cashback activation preference to user settings
 * @param optionId The selected option ID
 */
export async function applyCashbackActivationPreference(optionId: string): Promise<void> {
  try {
    const result = await chrome.storage.local.get('user')
    const user = result.user || { 
      totalEarnings: 0, 
      activationHistory: [], 
      settings: { 
        showCashbackPrompt: true, 
        showVoucherPrompt: true 
      } 
    }
    
    user.settings = user.settings || { showCashbackPrompt: true, showVoucherPrompt: true }
    
    // Track consent decision
    try {
      await chrome.runtime.sendMessage({
        type: 'ANALYTICS_TRACK',
        event: optionId === 'disabled' ? 'consent_declined' : 'consent_accepted',
        params: {
          option_id: optionId,
          platform: getPlatform(),
          show_reminders: optionId !== 'disabled',
          auto_activate: optionId === 'auto'
        }
      })
    } catch {}
    
    switch (optionId) {
      case 'auto':
        user.settings.showCashbackReminders = true
        user.settings.autoActivateOnlineCashback = true
        break
      case 'manual':
        user.settings.showCashbackReminders = true
        user.settings.autoActivateOnlineCashback = false
        break
      case 'disabled':
        user.settings.showCashbackReminders = false
        user.settings.autoActivateOnlineCashback = false
        break
    }
    
    await chrome.storage.local.set({ user })
  } catch (error) {
    console.error('Failed to apply cashback activation preference:', error)
  }
}

