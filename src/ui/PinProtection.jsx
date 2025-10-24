import React, { useState, useEffect } from 'react'
import { Lock, AlertCircle } from 'lucide-react'

const PinProtection = ({ children, onUnlock }) => {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isUnlocked, setIsUnlocked] = useState(false)

  // Set your PIN here (in production, store this securely in environment variables or database)
  const CORRECT_PIN = '6868' //

  useEffect(() => {
    // Check if already unlocked in this session
    const unlocked = sessionStorage.getItem('transactionsUnlocked')
    if (unlocked === 'true') {
      setIsUnlocked(true)
      if (onUnlock) onUnlock()
    }
  }, [onUnlock])

  const handlePinSubmit = (e) => {
    e.preventDefault()

    if (pin === CORRECT_PIN) {
      setIsUnlocked(true)
      sessionStorage.setItem('transactionsUnlocked', 'true')
      setError('')
      if (onUnlock) onUnlock()
    } else {
      setError('Incorrect PIN. Please try again.')
      setPin('')

      // Clear error after 3 seconds
      setTimeout(() => setError(''), 3000)
    }
  }

  const handlePinChange = (e) => {
    const value = e.target.value
    // Only allow numbers and limit to 4 digits
    if (/^\d*$/.test(value) && value.length <= 6) {
      setPin(value)
      setError('')
    }
  }

  if (isUnlocked) {
    return children
  }

  return (
    <div style={styles.container}>
      <div style={styles.pinCard}>
        {/* Lock Icon */}
        <div style={styles.lockIcon}>
          <Lock size={48} color="#3B82F6" />
        </div>

        {/* Title */}
        <h2 style={styles.title}>Protected Page</h2>
        <p style={styles.subtitle}>Enter PIN to access Transactions</p>

        {/* PIN Form */}
        <form onSubmit={handlePinSubmit} style={styles.form}>
          <div style={styles.pinInputContainer}>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={handlePinChange}
              placeholder="Enter PIN"
              autoFocus
              style={{
                ...styles.pinInput,
                ...(error ? styles.pinInputError : {}),
              }}
              maxLength={6}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div style={styles.errorMessage}>
              <AlertCircle size={16} />
              <span style={{ marginLeft: '8px' }}>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button type="submit" style={styles.submitButton} disabled={pin.length === 0}>
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    padding: '24px',
  },
  pinCard: {
    backgroundColor: 'white',
    padding: '48px 40px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center',
  },
  lockIcon: {
    width: '80px',
    height: '80px',
    backgroundColor: '#EFF6FF',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1F2937',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: '0 0 32px 0',
  },
  form: {
    width: '100%',
  },
  pinInputContainer: {
    marginBottom: '16px',
  },
  pinInput: {
    width: '100%',
    padding: '16px',
    fontSize: '24px',
    fontWeight: '600',
    textAlign: 'center',
    border: '2px solid #E5E7EB',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s',
    letterSpacing: '8px',
  },
  pinInputError: {
    borderColor: '#EF4444',
    animation: 'shake 0.5s',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px',
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  hint: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginTop: '24px',
    fontStyle: 'italic',
  },
}

export default PinProtection
