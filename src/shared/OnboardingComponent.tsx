import { useState, useEffect } from 'react'
import { translate, initLanguage } from './i18n'
import { ONBOARDING_STEPS, getCashbackActivationOptions, applyCashbackActivationPreference } from './onboarding'
import { getPlatform } from './platform'
import StepIndicator from './StepIndicator'

// Assets
const WS_LOGO = {
  yellow: chrome.runtime.getURL('public/icons/woolsocks _W_ yellow.png'),
}
const CHILLIN_GIRL = chrome.runtime.getURL('public/icons/Chillin girl.png')

interface OnboardingComponentProps {
  onComplete?: () => void
  variant?: 'popup' | 'options'
  cashbackOnly?: boolean
}

export default function OnboardingComponent({ onComplete, variant = 'popup', cashbackOnly = false }: OnboardingComponentProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    try { initLanguage() } catch {}
    // When used as settings (cashbackOnly), preselect from saved user settings
    if (cashbackOnly && typeof chrome !== 'undefined' && chrome.storage) {
      (async () => {
        try {
          const result = await chrome.storage.local.get('user')
          const user = result.user || { settings: {} }
          const showReminders = user?.settings?.showCashbackReminders !== false
          const autoActivate = user?.settings?.autoActivateOnlineCashback !== false
          if (!showReminders) {
            setSelectedOption('disabled')
          } else if (autoActivate) {
            setSelectedOption('auto')
          } else {
            setSelectedOption('manual')
          }
        } catch {}
      })()
    }
  }, [])

  const cashbackStepIndex = ONBOARDING_STEPS.findIndex(s => s.id === 'cashback-activation')
  const effectiveStepIndex = cashbackOnly ? cashbackStepIndex : currentStep
  const isLastStep = cashbackOnly ? true : effectiveStepIndex === ONBOARDING_STEPS.length - 1
  const isCashbackActivationStep = ONBOARDING_STEPS[effectiveStepIndex]?.id === 'cashback-activation'
  const cashbackOptions = isCashbackActivationStep ? getCashbackActivationOptions() : []

  const handleNext = async () => {
    if (isCashbackActivationStep && selectedOption) {
      setIsLoading(true)
      try {
        await applyCashbackActivationPreference(selectedOption)
        // Track consent shown event
        try {
          await chrome.runtime.sendMessage({
            type: 'ANALYTICS_TRACK',
            event: 'consent_shown',
            params: {
              platform: getPlatform(),
              step: 'cashback-activation'
            }
          })
        } catch {}
      } catch (error) {
        console.error('Failed to apply cashback activation preference:', error)
      }
      setIsLoading(false)
    }

    if (isLastStep) {
      // Mark onboarding as completed
      localStorage.setItem('woolsocks-onboarding-completed', 'true')
      onComplete?.()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleSkip = () => {
    if (isLastStep) {
      localStorage.setItem('woolsocks-onboarding-completed', 'true')
      onComplete?.()
    } else {
      setCurrentStep(currentStep + 1)
    }
  }

  const step = ONBOARDING_STEPS[effectiveStepIndex]
  if (!step) return null

  return (
    <div style={{
      width: '100%',
      maxWidth: variant === 'popup' ? '100%' : 600,
      margin: '0 auto',
      padding: variant === 'popup' ? 16 : 24,
      background: '#fff',
      borderRadius: variant === 'popup' ? 0 : 12,
      boxShadow: variant === 'popup' ? 'none' : '0 4px 12px rgba(0,0,0,0.1)',
      boxSizing: 'border-box'
    }}>
      {/* Step indicator moved below header to ensure visibility in popup */}

      {/* Step content */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        {/* Header illustration (replace thunder icon) */}
        {step.id === 'cashback-activation' ? (
          <div style={{ height: 16 }} />
        ) : (
          <div style={{
            fontSize: 32,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {step.id === 'welcome' ? (
              <img src={WS_LOGO.yellow} alt="Woolsocks" style={{ width: variant === 'popup' ? 48 : 64, height: variant === 'popup' ? 48 : 64, objectFit: 'contain' }} />
            ) : step.icon}
          </div>
        )}
        <h2 style={{
          fontSize: variant === 'popup' ? 18 : 24,
          fontWeight: 600,
          color: '#111827',
          margin: '0 0 12px 0',
          lineHeight: 1.3
        }}>
          {step.title}
        </h2>
        <p style={{
          fontSize: variant === 'popup' ? 14 : 16,
          color: '#6B7280',
          margin: 0,
          lineHeight: 1.5
        }}>
          {step.content}
        </p>
      </div>
      {!cashbackOnly && (
        <StepIndicator
          currentStep={currentStep}
          totalSteps={ONBOARDING_STEPS.length}
          onStepClick={(i) => setCurrentStep(i)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Cashback activation options */}
      {isCashbackActivationStep && (
        <div style={{ marginTop: 16, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cashbackOptions.map((option, idx) => {
            const selected = selectedOption === option.id
            const border = selected ? '2px solid #0084FF' : '1px solid #E5E7EB'
            return (
              <div
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                style={{
                  position: 'relative',
                  display: 'flex', alignItems: 'center', gap: 16,
                  border, borderRadius: 8, padding: 16, cursor: 'pointer',
                  background: selected ? '#E5F3FF' : '#FFFFFF'
                }}
              >
                {/* Radio */}
                <div style={{ width: 16, height: 16, borderRadius: 999, border: '2px solid #0084FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: selected ? '#0084FF' : 'transparent' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#0F0B1C', marginBottom: 4 }}>{option.label}</div>
                  <div style={{ fontSize: 13, color: '#6B7280' }}>{option.description}</div>
                </div>
                {/* Illustration only on first card */}
                {idx === 0 && (
                  <img src={CHILLIN_GIRL} alt="Illustration" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                )}
                {/* Recommended tag */}
                {idx === 0 && (
                  <div style={{ position: 'absolute', top: -10, left: 0 }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: 999,
                      background: selected ? '#0084FF' : '#E5F3FF',
                      color: selected ? '#FFFFFF' : '#0084FF',
                      fontSize: 12,
                      fontWeight: 600
                    }}>{translate('onboarding.recommended')}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: variant === 'popup' ? 8 : 12,
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {!cashbackOnly && !isLastStep && (
          <button
            onClick={handleSkip}
            style={{
              display: 'flex', height: 48, padding: 0, justifyContent: 'center', alignItems: 'center', gap: 8,
              border: 'none', borderRadius: 4, background: 'transparent',
              color: '#0084FF', fontSize: 14, fontWeight: 500,
              cursor: 'pointer', textAlign: 'center', flex: 1
            }}
          >
            {translate('onboarding.skip')}
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={isCashbackActivationStep && !selectedOption || isLoading}
          style={{
            display: 'flex', height: 48, padding: '12px 16px', justifyContent: 'center', alignItems: 'center', gap: 8,
            border: 'none', borderRadius: 4,
            background: (isCashbackActivationStep && !selectedOption) || isLoading ? '#9CA3AF' : '#211940',
            color: 'var(--action-button-fill-content-default, #FFF)',
            textAlign: 'center',
            fontFamily: 'Woolsocks',
            fontSize: 14,
            fontStyle: 'normal',
            fontWeight: 500,
            lineHeight: '140%',
            cursor: (isCashbackActivationStep && !selectedOption) || isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease', opacity: (isCashbackActivationStep && !selectedOption) || isLoading ? 0.6 : 1,
            flex: 1
          }}
        >
          {isLoading
            ? translate('onboarding.saving')
            : cashbackOnly
              ? translate('onboarding.savePreference')
              : (isLastStep ? translate('onboarding.finish') : translate('onboarding.next'))}
        </button>
      </div>
    </div>
  )
}
