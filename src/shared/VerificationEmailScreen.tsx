// Verification Email Screen Component
// Shows confirmation that verification email was sent

import { useState, useEffect } from 'react'

interface VerificationEmailScreenProps {
  email: string
  onClose: () => void
  onResend: () => Promise<void>
}

export default function VerificationEmailScreen({ email, onClose, onResend }: VerificationEmailScreenProps) {
  const [isResending, setIsResending] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return

    const timer = setInterval(() => {
      setCooldownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [cooldownSeconds])

  const handleResend = async () => {
    if (isResending || cooldownSeconds > 0) return

    setIsResending(true)
    setError(null)

    try {
      await onResend()
      // Set cooldown after successful resend
      setCooldownSeconds(60)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      minHeight: '300px',
      textAlign: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          background: 'none',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          color: '#9CA3AF',
          padding: '8px',
          lineHeight: 1,
        }}
        aria-label="Close"
      >
        ×
      </button>

      {/* Paper plane icon */}
      <div style={{
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: '#F3F4F6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
      }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
            stroke="#FDC408"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: '24px',
        fontWeight: 600,
        color: '#111827',
        marginBottom: '12px',
        marginTop: 0,
      }}>
        Inloglink wordt verzonden naar
      </h2>

      {/* Email address */}
      <p style={{
        fontSize: '16px',
        color: '#6B7280',
        marginBottom: '32px',
        marginTop: 0,
        wordBreak: 'break-word',
        maxWidth: '100%',
      }}>
        {email}
      </p>

      {/* Error message */}
      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: '#FEE2E2',
          border: '1px solid #FCA5A5',
          color: '#991B1B',
          fontSize: '14px',
          marginBottom: '16px',
          width: '100%',
          maxWidth: '320px',
        }}>
          {error}
        </div>
      )}

      {/* Resend button */}
      <button
        onClick={handleResend}
        disabled={isResending || cooldownSeconds > 0}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          maxWidth: '320px',
          height: '48px',
          padding: '0 24px',
          borderRadius: '4px',
          background: (isResending || cooldownSeconds > 0) ? '#D1D5DB' : '#211940',
          color: '#FFF',
          border: 'none',
          fontSize: '16px',
          fontWeight: 500,
          cursor: (isResending || cooldownSeconds > 0) ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s ease',
        }}
      >
        {isResending ? (
          'Versturen...'
        ) : cooldownSeconds > 0 ? (
          `Wacht ${cooldownSeconds}s`
        ) : (
          'Verstuur de link opnieuw'
        )}
      </button>

      {/* Instructions */}
      <p style={{
        fontSize: '14px',
        color: '#6B7280',
        marginTop: '24px',
        marginBottom: 0,
        lineHeight: 1.5,
        maxWidth: '320px',
      }}>
        Check je inbox en klik op de link om in te loggen. De link is 15 minuten geldig.
      </p>
    </div>
  )
}

