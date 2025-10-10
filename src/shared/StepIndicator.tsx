import React from 'react'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  onStepClick?: (index: number) => void
  style?: React.CSSProperties
}

export default function StepIndicator({ currentStep, totalSteps, onStepClick, style }: StepIndicatorProps) {
  const items = Array.from({ length: Math.max(0, totalSteps) })
  return (
    <div
      role="list"
      aria-label="Steps"
      style={{
        display: 'flex',
        gap: 5,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 6,
        marginTop: 8,
        ...style,
      }}
    >
      {items.map((_, i) => {
        const active = i === currentStep
        const baseStyle: React.CSSProperties = active
          ? {
              width: 15,
              height: 6,
              borderRadius: 2,
              background: '#0F0B1C',
              transition: 'all 180ms ease',
            }
          : {
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'rgba(15, 11, 28, 0.10)',
              transition: 'all 180ms ease',
            }

        const asButton = !!onStepClick
        const common: React.CSSProperties = { display: 'inline-block' }
        if (!asButton) {
          return <div key={i} role="listitem" aria-current={active ? 'step' : undefined} style={{ ...baseStyle, ...common }} />
        }
        return (
          <button
            key={i}
            role="listitem"
            aria-current={active ? 'step' : undefined}
            aria-label={`Step ${i + 1}`}
            onClick={() => onStepClick?.(i)}
            style={{
              appearance: 'none',
              border: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
              cursor: 'pointer',
              ...common,
            }}
          >
            <span aria-hidden='true' style={baseStyle} />
          </button>
        )
      })}
    </div>
  )
}


