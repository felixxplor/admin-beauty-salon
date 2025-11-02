import React, { useState, useEffect, useMemo } from 'react'
import {
  getVouchers,
  createVoucher,
  updateVoucher,
  cancelVoucher,
  redeemVoucher,
  getVoucherTransactions,
  getVoucherStats,
  generateVoucherCode,
} from '../services/apiVouchers'
import Spinner from '../ui/Spinner'
import { modalStyles, styles } from '../styles/VoucherStyles'
import { getClient, createClient } from '../services/apiClients'
import { getStaff } from '../services/apiStaff'
import supabase from '../services/supabase'

// Custom hook to fetch vouchers
const useVouchers = (filters) => {
  const [vouchers, setVouchers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchVouchers = async () => {
    try {
      setIsLoading(true)
      const data = await getVouchers(filters)
      setVouchers(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching vouchers:', err)
      setError(err)
      setVouchers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchVouchers()
  }, [JSON.stringify(filters)])

  return { vouchers, isLoading, error, refetch: fetchVouchers }
}

// Custom hook to fetch clients
const useClients = () => {
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true)
        const data = await getClient()
        setClients(data || [])
      } catch (err) {
        console.error('Error fetching clients:', err)
        setClients([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchClients()
  }, [])

  return { clients, isLoading }
}

// Custom hook to fetch staff
const useStaff = () => {
  const [staff, setStaff] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true)
        const data = await getStaff()
        setStaff(data || [])
      } catch (err) {
        console.error('Error fetching staff:', err)
        setStaff([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchStaff()
  }, [])

  return { staff, isLoading }
}

// Payment Modal for Vouchers
const VoucherPaymentModal = ({
  isOpen,
  onClose,
  voucherData,
  onSuccess,
  serialPort,
  setSerialPort,
}) => {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [message, setMessage] = useState({ type: '', text: '' })
  const [isProcessing, setIsProcessing] = useState(false)

  const totalAmount = parseFloat(voucherData?.amount || 0)
  const change =
    paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) - totalAmount : 0

  useEffect(() => {
    if (isOpen) {
      setCashReceived('')
      setMessage({ type: '', text: '' })
      setPaymentMethod('cash')
    }
  }, [isOpen])

  const openCashDrawer = async () => {
    try {
      let port = serialPort

      if (!port) {
        port = await navigator.serial.requestPort()
        setSerialPort(port)
      }

      if (!port.readable || !port.writable) {
        await port.open({ baudRate: 9600 })
      }

      const writer = port.writable.getWriter()
      const command = new Uint8Array([27, 112, 0, 25, 250])

      await writer.write(command)
      writer.releaseLock()

      return { success: true }
    } catch (error) {
      console.error('Cash drawer error:', error)
      setSerialPort(null)
      return { success: false, error: error.message }
    }
  }

  const processPayment = async () => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived)
      if (!received || received < totalAmount) {
        setMessage({ type: 'error', text: 'Insufficient cash received' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        return
      }
    }

    setIsProcessing(true)

    try {
      // Open cash drawer for cash payments
      if (paymentMethod === 'cash') {
        const drawerResult = await openCashDrawer()
        if (!drawerResult.success) {
          console.error('Failed to open cash drawer:', drawerResult.error)
        }
      }

      // Create the voucher first
      const newVoucher = await createVoucher({
        code: voucherData.code,
        clientId: voucherData.clientId || null,
        amount: voucherData.amount,
        notes: voucherData.notes || '',
        issuedBy: voucherData.staffId,
      })

      if (!newVoucher) {
        throw new Error('Failed to create voucher')
      }

      // Log transaction
      const transactionData = {
        items: [
          {
            name: `Gift Voucher ${voucherData.code}`,
            quantity: 1,
            regularPrice: totalAmount,
          },
        ],
        subtotal: totalAmount,
        discount_type: null,
        discount_value: 0,
        discount_amount: 0,
        total: totalAmount,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change_given: paymentMethod === 'cash' ? change : null,
        timestamp: new Date().toISOString(),
        user_id: 'current_user_id',
        staff: voucherData.staffId,
        notes: `Voucher purchase - Code: ${voucherData.code}${
          voucherData.clientName ? ` - Client: ${voucherData.clientName}` : ''
        }${voucherData.staffName ? ` - Staff: ${voucherData.staffName}` : ''}`,
      }

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData])

      if (transactionError) {
        console.error('Transaction logging error:', transactionError)
      }

      // Log cash drawer
      if (paymentMethod === 'cash') {
        await supabase.from('cash_drawer_logs').insert([
          {
            action: 'drawer_opened',
            user_id: 'current_user_id',
            timestamp: new Date().toISOString(),
            amount: totalAmount,
            status: 'success',
            metadata: {
              voucher_id: newVoucher.id,
              voucher_code: voucherData.code,
              payment_method: paymentMethod,
              staff_id: voucherData.staffId,
              staff_name: voucherData.staffName,
            },
          },
        ])
      }

      // Update voucher with payment info
      await updateVoucher(newVoucher.id, {
        clientId: voucherData.clientId || null,
        notes: `${
          voucherData.notes || ''
        } [Paid ${paymentMethod} - ${new Date().toLocaleDateString()}]`.trim(),
        status: 'active',
      })

      setMessage({ type: 'success', text: 'Payment completed successfully!' })

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (error) {
      console.error('Payment error:', error)
      setMessage({ type: 'error', text: error.message || 'Payment failed. Please try again.' })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={{ ...modalStyles.modal, maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.modalHeader}>
          <h2 style={modalStyles.modalTitle}>Complete Payment</h2>
          {serialPort && (
            <div
              style={{
                fontSize: '12px',
                color: '#10B981',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#ECFDF5',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '10px' }}>🟢</span> Drawer Connected
            </div>
          )}
        </div>

        {message.text && (
          <div
            style={
              message.type === 'success' ? modalStyles.successMessage : modalStyles.errorMessage
            }
          >
            {message.text}
          </div>
        )}

        {/* Voucher Summary */}
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#6b7280' }}>Voucher Code:</span>
            <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{voucherData?.code}</span>
          </div>
          {voucherData?.clientName && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#6b7280' }}>Client:</span>
              <span style={{ fontWeight: '500' }}>{voucherData.clientName}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: '#6b7280' }}>Staff:</span>
            <span style={{ fontWeight: '500' }}>{voucherData?.staffName}</span>
          </div>
        </div>

        {/* Total Amount */}
        <div
          style={{
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '2px solid #3b82f6',
          }}
        >
          <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '4px' }}>
            Total Amount
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e40af' }}>
            ${totalAmount.toFixed(2)}
          </div>
        </div>

        {/* Payment Method Selection */}
        <div style={modalStyles.formGroup}>
          <label style={modalStyles.label}>Payment Method</label>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            {['cash', 'card', 'eftpos'].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: paymentMethod === method ? '2px solid #007bff' : '2px solid #e5e7eb',
                  backgroundColor: paymentMethod === method ? '#eff6ff' : 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: paymentMethod === method ? '600' : '500',
                  color: paymentMethod === method ? '#007bff' : '#374151',
                  transition: 'all 0.2s',
                }}
              >
                {method === 'cash' && '💵 Cash'}
                {method === 'card' && '💳 Card'}
                {method === 'eftpos' && '💰 EFTPOS'}
              </button>
            ))}
          </div>
        </div>

        {/* Cash Amount Input */}
        {paymentMethod === 'cash' && (
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Cash Received ($)</label>
            <input
              type="number"
              step="0.01"
              min={totalAmount}
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              style={modalStyles.input}
              placeholder="Enter amount received"
              autoFocus
            />
            {cashReceived && parseFloat(cashReceived) >= totalAmount && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#d1fae5',
                  borderRadius: '6px',
                }}
              >
                <div style={{ fontSize: '14px', color: '#065f46', fontWeight: '600' }}>
                  Change: ${change.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div style={modalStyles.buttonGroup}>
          <button
            type="button"
            onClick={onClose}
            style={modalStyles.cancelButton}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={processPayment}
            style={{
              ...modalStyles.submitButton,
              backgroundColor: '#059669',
              ...(isProcessing ? modalStyles.submitButtonDisabled : {}),
            }}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : '💰 Pay & Complete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Create/Edit Voucher Modal
const VoucherModal = ({ isOpen, onClose, voucher, onSuccess, onPayAndComplete }) => {
  const [formData, setFormData] = useState({
    clientId: '',
    amount: '',
    notes: '',
    code: '',
    staffId: '',
    walkInName: '',
    walkInPhone: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const { clients } = useClients()
  const { staff } = useStaff()

  useEffect(() => {
    if (voucher) {
      setFormData({
        clientId: voucher.client_id || '',
        amount: voucher.amount || '',
        notes: voucher.notes || '',
        code: voucher.code || '',
        staffId: voucher.issued_by || '',
        walkInName: '',
        walkInPhone: '',
      })
    } else {
      setFormData({
        clientId: '',
        amount: '',
        notes: '',
        code: generateVoucherCode(),
        staffId: '',
        walkInName: '',
        walkInPhone: '',
      })
    }
  }, [voucher, isOpen])

  const handleSubmit = async (e, payNow = false) => {
    e.preventDefault()
    setError(null)

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (!formData.staffId && !voucher) {
      setError('Please select a staff member')
      return
    }

    try {
      setIsSubmitting(true)

      let clientId = formData.clientId
      let clientName = null

      // Get client name for display
      if (clientId) {
        const selectedClient = clients.find((c) => c.id === parseInt(clientId))
        clientName = selectedClient?.fullName || selectedClient?.phone || selectedClient?.email
      }

      // If walk-in client info provided, create new client
      if (!clientId && (formData.walkInName || formData.walkInPhone)) {
        try {
          const newClient = await createClient({
            fullName: formData.walkInName || null,
            phone: formData.walkInPhone || null,
            email: null,
          })
          clientId = newClient.id
          clientName = formData.walkInName || formData.walkInPhone
        } catch (err) {
          console.error('Error creating client:', err)
          setError('Failed to create walk-in client')
          return
        }
      }

      if (voucher) {
        // Update existing voucher
        await updateVoucher(voucher.id, {
          clientId: clientId || null,
          notes: formData.notes,
          status: voucher.status,
        })
        onSuccess()
        onClose()
      } else {
        // For new vouchers
        if (payNow) {
          // Get staff name
          const selectedStaff = staff.find((s) => s.id === parseInt(formData.staffId))
          const staffName = selectedStaff?.name || 'Unknown'

          // Prepare data for payment modal
          const voucherDataForPayment = {
            code: formData.code,
            amount: formData.amount,
            notes: formData.notes,
            clientId: clientId || null,
            clientName: clientName,
            staffId: formData.staffId,
            staffName: staffName,
          }

          // Close this modal and open payment modal
          onClose()
          onPayAndComplete(voucherDataForPayment)
        } else {
          // Create without payment
          await createVoucher({
            code: formData.code,
            clientId: clientId || null,
            amount: formData.amount,
            notes: formData.notes,
            issuedBy: formData.staffId,
          })
          onSuccess()
          onClose()
        }
      }
    } catch (err) {
      console.error('Error saving voucher:', err)
      setError(err.message || 'Failed to save voucher')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const isWalkIn = !formData.clientId && (formData.walkInName || formData.walkInPhone)

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.modalHeader}>
          <h2 style={modalStyles.modalTitle}>{voucher ? 'Edit Voucher' : 'Create New Voucher'}</h2>
          <p style={modalStyles.modalSubtitle}>
            {voucher ? 'Update voucher details' : 'Issue a new voucher with 1 year expiration'}
          </p>
        </div>

        {error && <div style={modalStyles.errorMessage}>{error}</div>}

        <form onSubmit={(e) => handleSubmit(e, false)}>
          {/* Voucher Code */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Voucher Code * (5 characters)</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => {
                const value = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, '')
                  .slice(0, 5)
                setFormData({ ...formData, code: value })
              }}
              style={{
                ...modalStyles.input,
                ...(voucher ? modalStyles.readOnlyField : {}),
                fontFamily: 'monospace',
                fontSize: '16px',
                letterSpacing: '2px',
              }}
              disabled={!!voucher}
              required
              maxLength={5}
              placeholder="ABC12"
            />
          </div>

          {/* Amount */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              style={{
                ...modalStyles.input,
                ...(voucher ? modalStyles.readOnlyField : {}),
              }}
              disabled={!!voucher}
              required
            />
          </div>

          {/* Staff Selection */}
          {!voucher && (
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Staff Member *</label>
              <select
                value={formData.staffId}
                onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                style={modalStyles.input}
                required
              >
                <option value="">-- Select Staff --</option>
                {staff.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Client Section */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Client (Optional)</label>
            <select
              value={formData.clientId}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  clientId: e.target.value,
                  walkInName: '',
                  walkInPhone: '',
                })
              }}
              style={modalStyles.input}
            >
              <option value="">-- Select Existing Client or Add Walk-in --</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.fullName || client.email || client.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Walk-in Client Fields */}
          {!formData.clientId && !voucher && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  marginBottom: '12px',
                  color: '#0c4a6e',
                }}
              >
                🚶 Walk-in Client (Optional)
              </div>

              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Name</label>
                <input
                  type="text"
                  value={formData.walkInName}
                  onChange={(e) => setFormData({ ...formData, walkInName: e.target.value })}
                  style={modalStyles.input}
                  placeholder="Enter client name"
                />
              </div>

              <div style={modalStyles.formGroup}>
                <label style={modalStyles.label}>Phone Number</label>
                <input
                  type="tel"
                  value={formData.walkInPhone}
                  onChange={(e) => setFormData({ ...formData, walkInPhone: e.target.value })}
                  style={modalStyles.input}
                  placeholder="Enter phone number"
                />
              </div>

              {isWalkIn && (
                <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '8px' }}>
                  ℹ️ A new client will be created with this information
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={modalStyles.textarea}
              placeholder="Add any notes about this voucher..."
            />
          </div>

          {!voucher && (
            <div style={modalStyles.infoBox}>
              <p style={modalStyles.infoText}>ℹ️ This voucher will expire 1 year from today.</p>
            </div>
          )}

          <div style={modalStyles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            {!voucher && (
              <>
                <button
                  type="submit"
                  style={{
                    ...modalStyles.submitButton,
                    ...(isSubmitting ? modalStyles.submitButtonDisabled : {}),
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create Voucher'}
                </button>

                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  style={{
                    ...modalStyles.submitButton,
                    backgroundColor: '#059669',
                    ...(isSubmitting ? modalStyles.submitButtonDisabled : {}),
                  }}
                  disabled={isSubmitting}
                >
                  💰 Pay & Complete
                </button>
              </>
            )}

            {voucher && (
              <button
                type="submit"
                style={{
                  ...modalStyles.submitButton,
                  ...(isSubmitting ? modalStyles.submitButtonDisabled : {}),
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update Voucher'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

// Redeem Voucher Modal
const RedeemModal = ({ isOpen, onClose, voucher, onSuccess }) => {
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (isOpen && voucher) {
      setAmount('')
      setNotes('')
      setError(null)
    }
  }, [isOpen, voucher])

  const handleRedeem = async (e) => {
    e.preventDefault()
    setError(null)

    const redeemAmount = parseFloat(amount)
    if (!redeemAmount || redeemAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    if (redeemAmount > parseFloat(voucher.balance)) {
      setError('Amount exceeds voucher balance')
      return
    }

    try {
      setIsSubmitting(true)
      await redeemVoucher(voucher.id, redeemAmount, null, null, notes, null)
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error redeeming voucher:', err)
      setError(err.message || 'Failed to redeem voucher')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !voucher) return null

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.modalHeader}>
          <h2 style={modalStyles.modalTitle}>Redeem Voucher</h2>
          <p style={modalStyles.modalSubtitle}>
            Voucher Code: <strong style={{ fontFamily: 'monospace' }}>{voucher.code}</strong>
          </p>
        </div>

        {error && <div style={modalStyles.errorMessage}>{error}</div>}

        <div style={modalStyles.infoBox}>
          <p style={modalStyles.infoText}>
            Current Balance: <strong>${parseFloat(voucher.balance).toFixed(2)}</strong>
          </p>
        </div>

        <form onSubmit={handleRedeem}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Redemption Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={voucher.balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={modalStyles.input}
              required
              autoFocus
            />
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={modalStyles.textarea}
              placeholder="Add notes about this redemption..."
            />
          </div>

          <div style={modalStyles.buttonGroup}>
            <button
              type="button"
              onClick={onClose}
              style={modalStyles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...modalStyles.submitButton,
                ...(isSubmitting ? modalStyles.submitButtonDisabled : {}),
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : 'Redeem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Voucher Detail Modal
const VoucherDetailModal = ({ isOpen, onClose, voucher }) => {
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen && voucher) {
      fetchTransactions()
    }
  }, [isOpen, voucher])

  const fetchTransactions = async () => {
    try {
      setIsLoading(true)
      const data = await getVoucherTransactions(voucher.id)
      setTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setTransactions([])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !voucher) return null

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = new Date(voucher.expiry_date) < new Date()

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.modalHeader}>
          <h2 style={modalStyles.modalTitle}>Voucher Details</h2>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={modalStyles.codeDisplay}>{voucher.code}</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Original Amount
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>
              ${parseFloat(voucher.amount).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Current Balance
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#007bff' }}>
              ${parseFloat(voucher.balance).toFixed(2)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Issue Date
            </div>
            <div style={{ fontSize: '14px' }}>{formatDate(voucher.issue_date)}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Expiry Date
            </div>
            <div style={{ fontSize: '14px', color: isExpired ? '#dc2626' : '#374151' }}>
              {formatDate(voucher.expiry_date)}
              {isExpired && ' (Expired)'}
            </div>
          </div>
        </div>

        {voucher.client && (
          <div
            style={{
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Issued To</div>
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {voucher.client.fullName || voucher.client.email || voucher.client.phone}
            </div>
          </div>
        )}

        {voucher.notes && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Notes</div>
            <div style={{ fontSize: '14px', color: '#374151' }}>{voucher.notes}</div>
          </div>
        )}

        <div style={{ marginTop: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
            Transaction History
          </h3>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
          ) : transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
              No transactions yet
            </div>
          ) : (
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {transactions.map((txn) => (
                <div
                  key={txn.id}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500' }}>
                      {txn.transaction_type === 'redemption' ? '💰' : '🔄'}{' '}
                      {txn.transaction_type.charAt(0).toUpperCase() + txn.transaction_type.slice(1)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {formatDateTime(txn.created_at)}
                    </div>
                    {txn.notes && (
                      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                        {txn.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                      -${parseFloat(txn.amount).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Balance: ${parseFloat(txn.balance_after).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={modalStyles.buttonGroup}>
          <button onClick={onClose} style={modalStyles.cancelButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Vouchers Page Component
const VouchersPage = () => {
  const [filters, setFilters] = useState({
    status: '',
    search: '',
  })
  const [stats, setStats] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isRedeemModalOpen, setIsRedeemModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [voucherDataForPayment, setVoucherDataForPayment] = useState(null)
  const [serialPort, setSerialPort] = useState(null)

  const { vouchers, isLoading, refetch } = useVouchers(filters)

  useEffect(() => {
    fetchStats()
  }, [vouchers])

  const fetchStats = async () => {
    try {
      const statsData = await getVoucherStats()
      setStats(statsData)
    } catch (err) {
      console.error('Error fetching stats:', err)
    }
  }

  const handlePayAndComplete = (voucherData) => {
    setVoucherDataForPayment(voucherData)
    setIsPaymentModalOpen(true)
  }

  const handleViewDetails = (voucher) => {
    setSelectedVoucher(voucher)
    setIsDetailModalOpen(true)
  }

  const handleRedeem = (voucher) => {
    setSelectedVoucher(voucher)
    setIsRedeemModalOpen(true)
  }

  const handleCancelVoucher = async (voucher) => {
    if (
      !window.confirm(
        `Are you sure you want to cancel voucher ${voucher.code}? This action cannot be undone.`
      )
    ) {
      return
    }

    try {
      await cancelVoucher(voucher.id, 'Cancelled by user')
      refetch()
      fetchStats()
    } catch (err) {
      console.error('Error cancelling voucher:', err)
      alert('Failed to cancel voucher')
    }
  }

  const getStatusBadge = (status) => {
    const statusStyles = {
      active: styles.badgeActive,
      redeemed: styles.badgeRedeemed,
      expired: styles.badgeExpired,
      cancelled: styles.badgeCancelled,
    }

    return (
      <span style={{ ...styles.badge, ...statusStyles[status] }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading && !vouchers.length) {
    return <Spinner />
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Vouchers</h1>
        <div style={styles.headerActions}>
          <button onClick={() => setIsCreateModalOpen(true)} style={styles.primaryButton}>
            + Create Voucher
          </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Vouchers</div>
            <div style={styles.statValue}>{stats.total}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Active</div>
            <div style={styles.statValue}>{stats.active}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Value</div>
            <div style={styles.statValue}>${stats.totalValue.toFixed(2)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Outstanding Balance</div>
            <div style={styles.statValue}>${stats.totalBalance.toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={styles.filterBar}>
        <input
          type="text"
          placeholder="Search by code or notes..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={styles.searchInput}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          style={styles.select}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="redeemed">Redeemed</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Vouchers Table */}
      {vouchers.length === 0 ? (
        <div style={{ ...styles.table, padding: 0 }}>
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>🎟️</div>
            <div style={styles.emptyStateTitle}>No vouchers found</div>
            <div style={styles.emptyStateText}>
              {filters.search || filters.status
                ? 'Try adjusting your filters'
                : 'Create your first voucher to get started'}
            </div>
          </div>
        </div>
      ) : (
        <table style={styles.table}>
          <thead style={styles.tableHeader}>
            <tr>
              <th style={styles.tableHeaderCell}>Code</th>
              <th style={styles.tableHeaderCell}>Client</th>
              <th style={styles.tableHeaderCell}>Amount</th>
              <th style={styles.tableHeaderCell}>Balance</th>
              <th style={styles.tableHeaderCell}>Issue Date</th>
              <th style={styles.tableHeaderCell}>Expiry Date</th>
              <th style={styles.tableHeaderCell}>Status</th>
              <th style={styles.tableHeaderCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((voucher) => (
              <tr
                key={voucher.id}
                style={styles.tableRow}
                onClick={() => handleViewDetails(voucher)}
              >
                <td style={{ ...styles.tableCell, fontWeight: '600', fontFamily: 'monospace' }}>
                  {voucher.code}
                </td>
                <td style={styles.tableCell}>
                  {voucher.client?.fullName ||
                    voucher.client?.email ||
                    voucher.client?.phone ||
                    'Not assigned'}
                </td>
                <td style={styles.tableCell}>${parseFloat(voucher.amount).toFixed(2)}</td>
                <td style={{ ...styles.tableCell, fontWeight: '600', color: '#007bff' }}>
                  ${parseFloat(voucher.balance).toFixed(2)}
                </td>
                <td style={styles.tableCell}>{formatDate(voucher.issue_date)}</td>
                <td style={styles.tableCell}>{formatDate(voucher.expiry_date)}</td>
                <td style={styles.tableCell}>{getStatusBadge(voucher.status)}</td>
                <td style={styles.tableCell} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.actionButtons}>
                    {voucher.status === 'active' && voucher.balance > 0 && (
                      <button
                        onClick={() => handleRedeem(voucher)}
                        style={{
                          ...styles.iconButton,
                          backgroundColor: '#d1fae5',
                          color: '#065f46',
                        }}
                      >
                        Redeem
                      </button>
                    )}
                    {voucher.status === 'active' && (
                      <button
                        onClick={() => handleCancelVoucher(voucher)}
                        style={{
                          ...styles.iconButton,
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modals */}
      <VoucherModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          refetch()
          fetchStats()
        }}
        onPayAndComplete={handlePayAndComplete}
      />

      <VoucherPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false)
          setVoucherDataForPayment(null)
        }}
        voucherData={voucherDataForPayment}
        onSuccess={() => {
          refetch()
          fetchStats()
        }}
        serialPort={serialPort}
        setSerialPort={setSerialPort}
      />

      <RedeemModal
        isOpen={isRedeemModalOpen}
        onClose={() => {
          setIsRedeemModalOpen(false)
          setSelectedVoucher(null)
        }}
        voucher={selectedVoucher}
        onSuccess={() => {
          refetch()
          fetchStats()
        }}
      />

      <VoucherDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          setSelectedVoucher(null)
        }}
        voucher={selectedVoucher}
      />
    </div>
  )
}

export default VouchersPage
