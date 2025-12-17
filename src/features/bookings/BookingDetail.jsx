import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import Spinner from '../../ui/Spinner'
import { deleteBooking, getBooking, updateBooking } from '../../services/apiBookings'
import { modalStyles, styles } from '../../styles/BookingDetailStyles'
import { getStaff } from '../../services/apiStaff'
import { getServices } from '../../services/apiServices'
import supabase from '../../services/supabase'

// Custom hook to use the getStaff function
const useStaff = () => {
  const [staff, setStaff] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true)
        const staffData = await getStaff()
        setStaff(staffData || [])
      } catch (err) {
        console.error('Error loading staff:', err)
        setError(err)
        setStaff([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchStaff()
  }, [])

  return { staff, isLoading, error }
}

// Custom hook to use the getServices function
const useServices = () => {
  const [services, setServices] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    const fetchServices = async () => {
      try {
        setIsLoading(true)
        const servicesData = await getServices()
        setServices(servicesData || [])
      } catch (err) {
        console.error('Error loading services:', err)
        setError(err)
        setServices([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [])

  return { services, isLoading, error }
}

// Custom hook to fetch booking details
const useBookingDetail = (bookingId) => {
  const [booking, setBooking] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchBooking = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const bookingData = await getBooking(bookingId)
      setBooking(bookingData)
    } catch (err) {
      console.error('Error loading booking:', err)
      setError(err)
    } finally {
      setIsLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    if (bookingId) {
      fetchBooking()
    }
  }, [fetchBooking, bookingId])

  return { booking, isLoading, error, refetch: fetchBooking }
}

// Edit Booking Modal Component
const EditBookingModal = ({ isOpen, onClose, booking, onBookingUpdated }) => {
  const [formData, setFormData] = useState({
    numClients: 1,
    status: 'confirmed',
    notes: '',
    startTime: '',
    endTime: '',
    totalPrice: '0',
    selectedServiceIds: [],
    staffId: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')

  // Fetch services and staff
  const { services, isLoading: servicesLoading } = useServices()
  const { staff, isLoading: staffLoading } = useStaff()

  // Filter services based on search term
  const filteredServices = useMemo(() => {
    if (!services) return []
    if (!serviceSearchTerm.trim()) return services

    const searchLower = serviceSearchTerm.toLowerCase()
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(searchLower) ||
        service.category?.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower)
    )
  }, [services, serviceSearchTerm])

  // Calculate total duration and price based on selected services - FIXED FOR "+" HANDLING
  const selectedServicesInfo = useMemo(() => {
    if (!services || formData.selectedServiceIds.length === 0) {
      return { totalDuration: 0, totalPrice: '0', serviceNames: [] }
    }

    const selectedServices = services.filter((service) =>
      formData.selectedServiceIds.includes(service.id.toString())
    )

    const totalDuration = selectedServices.reduce(
      (sum, service) => sum + (service.duration || 0),
      0
    )

    // Handle "+" suffix in prices (prices are stored as text like "20+")
    let totalPriceNum = 0
    let hasPlus = false
    let hasNonNumeric = false

    selectedServices.forEach((service) => {
      // regularPrice and discount are TEXT fields that may contain "+", "POA", etc.
      const regularPriceStr = service.regularPrice ? String(service.regularPrice) : '0'
      const discountStr = service.discount ? String(service.discount) : '0'

      // Check if any price has "+" suffix
      if (regularPriceStr.includes('+')) {
        hasPlus = true
      }

      // Extract numeric values by removing "+"
      const regularPriceNum = parseFloat(regularPriceStr.replace('+', ''))
      const discountNum = parseFloat(discountStr.replace('+', ''))

      // Check if parsing resulted in valid numbers
      if (isNaN(regularPriceNum) || isNaN(discountNum)) {
        hasNonNumeric = true
      } else {
        totalPriceNum += regularPriceNum - discountNum
      }
    })

    // Return total price as text with "+" if any service had it
    let totalPrice
    if (hasNonNumeric) {
      totalPrice = 'POA' // Price on application
    } else if (hasPlus) {
      totalPrice = `${totalPriceNum}+`
    } else {
      totalPrice = `${totalPriceNum}`
    }

    const serviceNames = selectedServices.map((service) => service.name)

    return { totalDuration, totalPrice, serviceNames }
  }, [services, formData.selectedServiceIds])

  // Calculate end time based on start time and total duration
  const calculateEndTime = (startTime, durationInMinutes) => {
    if (!startTime || !durationInMinutes) return ''

    const startDate = new Date(startTime)
    const endDate = new Date(startDate.getTime() + durationInMinutes * 60000)

    // Format to datetime-local format
    const year = endDate.getFullYear()
    const month = String(endDate.getMonth() + 1).padStart(2, '0')
    const day = String(endDate.getDate()).padStart(2, '0')
    const hours = String(endDate.getHours()).padStart(2, '0')
    const minutes = String(endDate.getMinutes()).padStart(2, '0')

    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  useEffect(() => {
    if (booking && services) {
      const toLocalDateTimeString = (timestamp) => {
        if (!timestamp) return ''

        // Parse "YYYY-MM-DD HH:MM:SS" manually - NO timezone conversion!
        const match = timestamp.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/)

        if (match) {
          const [_, year, month, day, hours, minutes] = match
          return `${year}-${month}-${day}T${hours}:${minutes}`
        }

        // Fallback
        const dateMatch = timestamp.match(/(\d{4})-(\d{2})-(\d{2})/)
        const timeMatch = timestamp.match(/(\d{2}):(\d{2})/)

        if (dateMatch && timeMatch) {
          const [_, year, month, day] = dateMatch
          const [__, hours, minutes] = timeMatch
          return `${year}-${month}-${day}T${hours}:${minutes}`
        }

        return ''
      }

      // Determine selected service IDs
      let serviceIds = []
      if (booking.serviceIds && Array.isArray(booking.serviceIds)) {
        serviceIds = booking.serviceIds.map((id) => id.toString())
      } else if (booking.serviceId) {
        serviceIds = [booking.serviceId.toString()]
      }

      setFormData({
        numClients: booking.numClients || 1,
        status: booking.status || 'confirmed',
        notes: booking.notes || '',
        startTime: toLocalDateTimeString(booking.startTime),
        endTime: toLocalDateTimeString(booking.endTime),
        totalPrice: booking.totalPrice ? String(booking.totalPrice) : '0',
        selectedServiceIds: serviceIds,
        staffId: booking.staffId ? booking.staffId.toString() : '',
      })
    }
  }, [booking, services])

  // Update end time and total price when services or start time changes
  useEffect(() => {
    if (formData.startTime && selectedServicesInfo.totalDuration > 0) {
      const newEndTime = calculateEndTime(formData.startTime, selectedServicesInfo.totalDuration)
      setFormData((prev) => ({
        ...prev,
        endTime: newEndTime,
        totalPrice: selectedServicesInfo.totalPrice,
      }))
    }
  }, [formData.startTime, selectedServicesInfo.totalDuration, selectedServicesInfo.totalPrice])

  const handleServiceToggle = (serviceId) => {
    setFormData((prev) => {
      const serviceIdStr = serviceId.toString()
      const isSelected = prev.selectedServiceIds.includes(serviceIdStr)

      return {
        ...prev,
        selectedServiceIds: isSelected
          ? prev.selectedServiceIds.filter((id) => id !== serviceIdStr)
          : [...prev.selectedServiceIds, serviceIdStr],
      }
    })
  }

  const validateForm = () => {
    const errors = {}

    if (formData.selectedServiceIds.length === 0) {
      errors.services = 'Please select at least one service'
    }

    if (!formData.startTime) {
      errors.startTime = 'Start time is required'
    }

    if (!formData.staffId) {
      errors.staffId = 'Please select a staff member'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Parse the datetime-local value: YYYY-MM-DDTHH:MM
      const [startDatePart, startTimePart] = formData.startTime.split('T')
      const [endDatePart, endTimePart] = formData.endTime.split('T')

      // Create timestamps in format: YYYY-MM-DD HH:MM:SS
      const startTimestamp = `${startDatePart} ${startTimePart}:00`
      const endTimestamp = `${endDatePart} ${endTimePart}:00`

      const updateData = {
        numClients: parseInt(formData.numClients),
        status: formData.status,
        notes: formData.notes,
        date: startDatePart, // Use the date from startTime
        startTime: startTimestamp,
        endTime: endTimestamp,
        totalPrice: formData.totalPrice,
        serviceIds: formData.selectedServiceIds.map((id) => parseInt(id)),
        staffId: parseInt(formData.staffId),
      }

      await updateBooking(booking.id, updateData)
      onBookingUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating booking:', error)
      setFormErrors({ submit: 'Failed to update booking. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Edit Booking</h2>
          <button onClick={onClose} style={modalStyles.closeButton}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          {/* Services Selection */}
          <div style={modalStyles.formGroup}>
            <label
              style={{
                ...modalStyles.label,
                fontWeight: '500',
                fontSize: '14px',
                color: '#000',
              }}
            >
              Services <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="🔍 Search services by name or category..."
              value={serviceSearchTerm}
              onChange={(e) => setServiceSearchTerm(e.target.value)}
              style={{
                ...modalStyles.searchInput,
                marginBottom: '8px',
                padding: '10px 12px',
                fontSize: '14px',
                border: '2px solid #d1d5db',
                backgroundColor: 'white',
              }}
            />
            <div
              style={{
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'white',
              }}
            >
              {servicesLoading ? (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px',
                  }}
                >
                  Loading services...
                </div>
              ) : filteredServices.length === 0 ? (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '14px',
                  }}
                >
                  No services found matching &#39;{serviceSearchTerm}&#39;
                </div>
              ) : (
                filteredServices.map((service) => (
                  <label
                    key={service.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      backgroundColor: formData.selectedServiceIds.includes(service.id.toString())
                        ? '#e0f2fe'
                        : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.selectedServiceIds.includes(service.id.toString())}
                      onChange={() => handleServiceToggle(service.id)}
                      style={{ marginRight: '8px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', fontSize: '14px', color: '#000' }}>
                        {service.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {service.category && (
                          <span
                            style={{
                              backgroundColor: '#e5e7eb',
                              padding: '2px 6px',
                              borderRadius: '3px',
                              marginRight: '6px',
                              fontSize: '11px',
                            }}
                          >
                            {service.category}
                          </span>
                        )}
                        {service.duration} min - $
                        {(() => {
                          const regularPriceStr = service.regularPrice
                            ? String(service.regularPrice)
                            : '0'
                          const discountStr = service.discount ? String(service.discount) : '0'

                          const hasPlus = regularPriceStr.includes('+')
                          const regularPriceNum = parseFloat(regularPriceStr.replace('+', ''))
                          const discountNum = parseFloat(discountStr.replace('+', ''))

                          if (isNaN(regularPriceNum)) {
                            return regularPriceStr
                          }

                          const finalPrice =
                            regularPriceNum - (isNaN(discountNum) ? 0 : discountNum)

                          return hasPlus ? `${finalPrice}+` : `${finalPrice}`
                        })()}
                        {service.discount > 0 && (
                          <span
                            style={{
                              textDecoration: 'line-through',
                              marginLeft: '4px',
                              opacity: 0.7,
                            }}
                          >
                            ${service.regularPrice}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            {serviceSearchTerm && (
              <button
                type="button"
                onClick={() => setServiceSearchTerm('')}
                style={{
                  marginTop: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  color: '#2563eb',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear search
              </button>
            )}
            {formData.selectedServiceIds.length > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                }}
              >
                <div
                  style={{
                    fontWeight: '600',
                    marginBottom: '8px',
                    fontSize: '14px',
                    color: '#1e40af',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>Selected Services ({formData.selectedServiceIds.length})</span>
                  {/* ADD THIS: Clear All button */}
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, selectedServiceIds: [] }))}
                    style={{
                      padding: '4px 8px',
                      fontSize: '11px',
                      color: '#dc2626',
                      backgroundColor: 'transparent',
                      border: '1px solid #dc2626',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                </div>

                {/* ADD THIS: Individual service items with remove buttons */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: '8px',
                  }}
                >
                  {formData.selectedServiceIds.map((serviceId) => {
                    const service = services.find((s) => s.id.toString() === serviceId)
                    if (!service) return null

                    return (
                      <div
                        key={serviceId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 8px',
                          backgroundColor: 'white',
                          borderRadius: '6px',
                          border: '1px solid #bfdbfe',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                            {service.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            {service.duration} min • $
                            {(() => {
                              const regularPriceStr = service.regularPrice
                                ? String(service.regularPrice)
                                : '0'
                              const discountStr = service.discount ? String(service.discount) : '0'
                              const hasPlus = regularPriceStr.includes('+')
                              const regularPriceNum = parseFloat(regularPriceStr.replace('+', ''))
                              const discountNum = parseFloat(discountStr.replace('+', ''))
                              const finalPrice =
                                regularPriceNum - (isNaN(discountNum) ? 0 : discountNum)
                              return hasPlus ? `${finalPrice}+` : `${finalPrice}`
                            })()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleServiceToggle(service.id)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            color: '#dc2626',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )
                  })}
                </div>

                {/* Existing summary */}
                <div
                  style={{
                    fontSize: '12px',
                    color: '#1e40af',
                    paddingTop: '8px',
                    borderTop: '1px solid #bfdbfe',
                  }}
                >
                  <strong>Total:</strong> {selectedServicesInfo.serviceNames.join(', ')}
                  <div style={{ marginTop: '4px' }}>
                    Duration: {selectedServicesInfo.totalDuration} min • Price: $
                    {selectedServicesInfo.totalPrice}
                  </div>
                </div>
              </div>
            )}
            {formErrors.services && (
              <div
                style={{
                  color: '#EF4444',
                  fontSize: '12px',
                  marginTop: '8px',
                }}
              >
                {formErrors.services}
              </div>
            )}
          </div>

          {/* Staff Selection */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>
              Staff Member <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={formData.staffId}
              onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
              style={modalStyles.select}
            >
              <option value="">Select staff member</option>
              {staffLoading ? (
                <option disabled>Loading staff...</option>
              ) : (
                staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))
              )}
            </select>
            {formErrors.staffId && <div style={modalStyles.errorText}>{formErrors.staffId}</div>}
          </div>

          {/* Start Time */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>
              Start Time <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              style={modalStyles.input}
            />
            {formErrors.startTime && (
              <div style={modalStyles.errorText}>{formErrors.startTime}</div>
            )}
          </div>

          {/* End Time (Read-only, calculated) */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>End Time (Calculated)</label>
            <input
              type="datetime-local"
              value={formData.endTime}
              readOnly
              style={{ ...modalStyles.input, backgroundColor: '#F3F4F6' }}
            />
          </div>

          {/* Number of Clients */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Number of Clients</label>
            <input
              type="number"
              min="1"
              value={formData.numClients}
              onChange={(e) => setFormData({ ...formData, numClients: e.target.value })}
              style={modalStyles.input}
            />
          </div>

          {/* Status */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={modalStyles.select}
            >
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Notes */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={modalStyles.textarea}
              rows="3"
              placeholder="Add any special notes or requirements..."
            />
          </div>

          {/* Total Price (Read-only, calculated) */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Total Price</label>
            <input
              type="text"
              value={`$${formData.totalPrice}`}
              readOnly
              style={{ ...modalStyles.input, backgroundColor: '#F3F4F6' }}
            />
          </div>

          {formErrors.submit && (
            <div style={{ ...modalStyles.errorText, marginBottom: '1rem' }}>
              {formErrors.submit}
            </div>
          )}

          <div style={modalStyles.buttonGroup}>
            <button type="button" onClick={onClose} style={modalStyles.cancelButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                ...modalStyles.submitButton,
                ...(isSubmitting ? modalStyles.submitButtonDisabled : {}),
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, booking, serialPort, setSerialPort }) => {
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [discount, setDiscount] = useState('')
  const [discountType, setDiscountType] = useState('amount') // 'amount' or 'percentage'

  const [voucherCode, setVoucherCode] = useState('')
  const [voucherData, setVoucherData] = useState(null)
  const [voucherLoading, setVoucherLoading] = useState(false)
  const [voucherError, setVoucherError] = useState('')
  const [appliedVouchers, setAppliedVouchers] = useState([])

  const [paymentCompleted, setPaymentCompleted] = useState(false)

  // Reset payment state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentCompleted(false)
      setMessage({ type: '', text: '' })
      setIsProcessing(false)
      // Optionally reset other fields
      setCashReceived('')
      setDiscount('')
      setVoucherCode('')
      setAppliedVouchers([])
      setVoucherData(null)
      setVoucherError('')
    }
  }, [isOpen])

  const validateVoucher = async (code) => {
    setVoucherLoading(true)
    setVoucherError('')

    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', code.toUpperCase().trim())
        .eq('status', 'active')
        .single()

      if (error || !data) {
        throw new Error('Invalid voucher code')
      }

      // Check if voucher is expired
      const now = new Date()
      const expiryDate = new Date(data.expiry_date)

      if (expiryDate < now) {
        throw new Error('This voucher has expired')
      }

      // Check if voucher has remaining balance
      if (data.balance <= 0) {
        throw new Error('This voucher has been fully redeemed')
      }

      // Check if voucher is already applied
      if (appliedVouchers.find((v) => v.code === code.toUpperCase().trim())) {
        throw new Error('This voucher is already applied')
      }

      setVoucherData(data)
      return data
    } catch (error) {
      setVoucherError(error.message)
      return null
    } finally {
      setVoucherLoading(false)
    }
  }

  const applyVoucher = () => {
    if (voucherData) {
      const discountAmount = Math.min(voucherData.balance, totalAmount)
      setAppliedVouchers([
        ...appliedVouchers,
        {
          ...voucherData,
          appliedAmount: discountAmount,
        },
      ])
      setVoucherCode('')
      setVoucherData(null)
    }
  }

  const removeAppliedVoucher = (voucherId) => {
    setAppliedVouchers(appliedVouchers.filter((v) => v.id !== voucherId))
  }

  const subtotal = parseFloat(booking?.totalPrice || 0)

  // Calculate discount
  const discountValue = parseFloat(discount) || 0
  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = (subtotal * discountValue) / 100
  } else {
    discountAmount = discountValue
  }

  const voucherDiscount = appliedVouchers.reduce((sum, voucher) => sum + voucher.appliedAmount, 0)

  const totalAmount = Math.max(0, subtotal - discountAmount - voucherDiscount)

  const change =
    paymentMethod === 'cash' && cashReceived ? parseFloat(cashReceived) - totalAmount : 0

  const openCashDrawer = async () => {
    try {
      let port = serialPort

      // Only request port if we don't have one stored
      if (!port) {
        port = await navigator.serial.requestPort()
        setSerialPort(port)
      }

      // Check if port is already open
      if (!port.readable || !port.writable) {
        await port.open({ baudRate: 9600 })
      }

      const writer = port.writable.getWriter()
      const command = new Uint8Array([27, 112, 0, 25, 250])

      await writer.write(command)
      writer.releaseLock()

      // Don't close the port - keep it open for reuse
      return { success: true }
    } catch (error) {
      console.error('Cash drawer error:', error)
      // Reset port on error
      setSerialPort(null)
      return { success: false, error: error.message }
    }
  }

  const processPayment = async () => {
    if (isProcessing || paymentCompleted) {
      return
    }

    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived)
      if (!received || received < totalAmount) {
        setMessage({ type: 'error', text: 'Insufficient cash received' })
        setTimeout(() => setMessage({ type: '', text: '' }), 3000)
        return
      }
    }

    // NEW: Validate voucher payments
    if (paymentMethod === 'voucher' && appliedVouchers.length === 0) {
      setMessage({ type: 'error', text: 'Please apply a voucher to continue' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)
      return
    }

    setIsProcessing(true)

    try {
      // Open cash drawer for cash payments
      if (paymentMethod === 'cash') {
        const drawerResult = await openCashDrawer()
        if (!drawerResult.success) {
          setMessage({ type: 'error', text: 'Failed to open cash drawer. Continue anyway?' })
          // You might want to add a confirmation here, but we'll continue with payment
        }
      }

      // Log the transaction to database
      const serviceItems =
        booking.services && Array.isArray(booking.services) && booking.services.length > 0
          ? booking.services.map((service) => ({
              id: service.id,
              name: service.name,
              quantity: 1,
              regularPrice: service.regularPrice || 0,
            }))
          : booking.service
          ? [
              {
                id: booking.serviceId || booking.service.id,
                name: booking.service.name,
                quantity: 1,
                regularPrice: booking.service.regularPrice || booking.totalPrice,
              },
            ]
          : [
              {
                id: booking.serviceId,
                name: 'Service',
                quantity: 1,
                regularPrice: booking.totalPrice,
              },
            ]

      const transactionData = {
        items: serviceItems,
        subtotal: subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        total: totalAmount,
        payment_method: paymentMethod,
        cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
        change_given: paymentMethod === 'cash' ? change : null,
        timestamp: new Date().toISOString(),
        user_id: 'current_user_id', // Replace with actual user ID
        staff: booking.staffId, // Add staff ID to transaction
        notes: `Payment for booking #${booking.id} - Client: ${
          booking?.client?.fullName ||
          booking?.client?.email ||
          booking?.client?.phone ||
          booking?.name ||
          booking?.phone ||
          'N/A'
        }${booking.staff?.name ? ` - Staff: ${booking.staff.name}` : ''}`,
      }

      // Insert transaction
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select('id')
        .single()

      if (transactionError) {
        console.error('Transaction logging error:', transactionError)
        // Continue with payment even if logging fails
      }

      if (appliedVouchers.length > 0) {
        for (const voucher of appliedVouchers) {
          // Update voucher balance
          const newBalance = voucher.balance - voucher.appliedAmount
          const newStatus = newBalance <= 0 ? 'redeemed' : 'active'

          await supabase
            .from('vouchers')
            .update({
              balance: newBalance,
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', voucher.id)

          // Record voucher transaction
          await supabase.from('voucher_transactions').insert({
            voucher_id: voucher.id,
            transaction_type: 'redemption',
            amount: voucher.appliedAmount,
            balance_after: newBalance,
            notes: `Booking payment redemption - Booking #${booking.id}`,
            created_by: booking.staffId,
          })
        }
      }

      // Log cash drawer opening
      if (paymentMethod === 'cash') {
        await supabase.from('cash_drawer_logs').insert([
          {
            action: 'drawer_opened',
            user_id: 'current_user_id',
            timestamp: new Date().toISOString(),
            amount: totalAmount,
            status: 'success',
            metadata: {
              booking_id: booking.id,
              payment_method: paymentMethod,
              staff_id: booking.staffId,
              staff_name: booking.staff?.name,
            },
          },
        ])
      }

      // Update booking status to completed
      await updateBooking(booking.id, {
        status: 'completed',
        staffId: booking.staffId, // Include staff information
      })

      setPaymentCompleted(true)
      setMessage({ type: 'success', text: 'Payment completed successfully!' })

      setTimeout(() => {
        onClose()
        // Optionally refresh the page or navigate
        window.location.reload() // Or use refetch() if available
      }, 1500)
    } catch (error) {
      console.error('Payment error:', error)
      setMessage({ type: 'error', text: 'Payment failed. Please try again.' })
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={paymentModalStyles.overlay} onClick={onClose}>
      <div style={paymentModalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={paymentModalStyles.header}>
          <h2 style={paymentModalStyles.title}>Complete Payment</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
            <button onClick={onClose} style={paymentModalStyles.closeButton}>
              ✕
            </button>
          </div>
        </div>

        {/* Booking Summary */}
        <div style={paymentModalStyles.bookingSummary}>
          <div style={paymentModalStyles.summaryRow}>
            <span>Service:</span>
            <span style={paymentModalStyles.summaryValue}>
              {booking?.services && Array.isArray(booking.services) && booking.services.length > 0
                ? booking.services.map((s) => s.name).join(', ')
                : booking?.service?.name || 'N/A'}
            </span>
          </div>
        </div>

        {/* Total Amount */}
        <div style={paymentModalStyles.totalSection}>
          {/* Discount Input */}
          <div style={paymentModalStyles.discountSection}>
            <div style={paymentModalStyles.discountHeader}>
              <label style={paymentModalStyles.discountLabel}>Discount</label>
              <div style={paymentModalStyles.discountTypeToggle}>
                <button
                  onClick={() => setDiscountType('amount')}
                  style={{
                    ...paymentModalStyles.discountTypeButton,
                    ...(discountType === 'amount'
                      ? paymentModalStyles.discountTypeButtonActive
                      : {}),
                  }}
                >
                  $
                </button>
                <button
                  onClick={() => setDiscountType('percentage')}
                  style={{
                    ...paymentModalStyles.discountTypeButton,
                    ...(discountType === 'percentage'
                      ? paymentModalStyles.discountTypeButtonActive
                      : {}),
                  }}
                >
                  %
                </button>
              </div>
            </div>
            <div style={paymentModalStyles.discountInputWrapper}>
              {discountType === 'amount' ? (
                <span style={paymentModalStyles.discountSymbol}>$</span>
              ) : (
                <span style={paymentModalStyles.discountSymbol}>%</span>
              )}
              <input
                type="number"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder={discountType === 'amount' ? '0.00' : '0'}
                style={paymentModalStyles.discountInput}
              />
            </div>
            {discount && (
              <button
                onClick={() => setDiscount('')}
                style={paymentModalStyles.clearDiscountButton}
              >
                Clear discount
              </button>
            )}
          </div>
          {/* Amount Breakdown */}
          <div style={paymentModalStyles.amountBreakdown}>
            <div style={paymentModalStyles.breakdownRow}>
              <span style={paymentModalStyles.breakdownLabel}>Subtotal:</span>
              <span style={paymentModalStyles.breakdownValue}>${subtotal.toFixed(2)}</span>
            </div>

            {discountAmount > 0 && (
              <div style={{ ...paymentModalStyles.breakdownRow, color: '#EF4444' }}>
                <span style={paymentModalStyles.breakdownLabel}>
                  Discount (
                  {discountType === 'percentage'
                    ? `${discountValue}%`
                    : `$${discountValue.toFixed(2)}`}
                  ):
                </span>
                <span style={paymentModalStyles.breakdownValue}>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            {/* NEW: Show voucher discount */}
            {voucherDiscount > 0 && (
              <div style={{ ...paymentModalStyles.breakdownRow, color: '#10B981' }}>
                <span style={paymentModalStyles.breakdownLabel}>Voucher Discount:</span>
                <span style={paymentModalStyles.breakdownValue}>
                  -${voucherDiscount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div style={paymentModalStyles.totalLabel}>Total Amount</div>
          <div style={paymentModalStyles.totalAmount}>${totalAmount.toFixed(2)}</div>
        </div>

        {/* Payment Method Selection */}
        <div style={paymentModalStyles.paymentMethodSection}>
          <label style={paymentModalStyles.label}>Payment Method</label>
          <div
            style={{
              ...paymentModalStyles.paymentMethodGrid,
              gridTemplateColumns: 'repeat(2, 1fr)', // Change to 2x2 grid
              gap: '12px',
            }}
          >
            <button
              onClick={() => setPaymentMethod('cash')}
              style={{
                ...paymentModalStyles.paymentMethodButton,
                ...(paymentMethod === 'cash' ? paymentModalStyles.paymentMethodButtonActive : {}),
              }}
            >
              <span style={paymentModalStyles.paymentIcon}>💵</span>
              <span>Cash</span>
            </button>

            <button
              onClick={() => setPaymentMethod('card')}
              style={{
                ...paymentModalStyles.paymentMethodButton,
                ...(paymentMethod === 'card' ? paymentModalStyles.paymentMethodButtonActive : {}),
              }}
            >
              <span style={paymentModalStyles.paymentIcon}>💳</span>
              <span>Card</span>
            </button>

            {/* NEW: PayID Payment Method */}
            <button
              onClick={() => setPaymentMethod('payid')}
              style={{
                ...paymentModalStyles.paymentMethodButton,
                ...(paymentMethod === 'payid' ? paymentModalStyles.paymentMethodButtonActive : {}),
              }}
            >
              <span style={paymentModalStyles.paymentIcon}>📱</span>
              <span>PayID</span>
            </button>

            {/* NEW: Voucher Payment Method */}
            <button
              onClick={() => setPaymentMethod('voucher')}
              style={{
                ...paymentModalStyles.paymentMethodButton,
                ...(paymentMethod === 'voucher'
                  ? paymentModalStyles.paymentMethodButtonActive
                  : {}),
              }}
            >
              <span style={paymentModalStyles.paymentIcon}>🎁</span>
              <span>Voucher</span>
            </button>
          </div>
        </div>

        {/* Cash Input */}
        {paymentMethod === 'cash' && (
          <div style={paymentModalStyles.cashInputSection}>
            <label style={paymentModalStyles.label}>Cash Received</label>
            <div style={paymentModalStyles.cashInputWrapper}>
              <span style={paymentModalStyles.dollarSign}>$</span>
              <input
                type="number"
                step="0.01"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                placeholder="0.00"
                style={paymentModalStyles.cashInput}
                autoFocus
              />
            </div>
            {cashReceived && (
              <div style={paymentModalStyles.changeDisplay}>
                <span style={paymentModalStyles.changeLabel}>Change:</span>
                <span style={paymentModalStyles.changeAmount}>
                  ${change >= 0 ? change.toFixed(2) : '0.00'}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Voucher Input */}
        {paymentMethod === 'voucher' && (
          <div style={paymentModalStyles.cashInputSection}>
            <label style={paymentModalStyles.label}>Voucher Code</label>
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="ENTER VOUCHER CODE"
                style={{
                  ...paymentModalStyles.cashInput,
                  textTransform: 'uppercase',
                  flex: 1,
                }}
              />
              <button
                onClick={() => validateVoucher(voucherCode)}
                disabled={!voucherCode.trim() || voucherLoading}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  cursor: voucherLoading ? 'not-allowed' : 'pointer',
                  opacity: voucherLoading || !voucherCode.trim() ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {voucherLoading ? 'Checking...' : 'Validate'}
              </button>
            </div>

            {/* Voucher Error */}
            {voucherError && (
              <div style={{ color: '#EF4444', fontSize: '14px', marginBottom: '12px' }}>
                {voucherError}
              </div>
            )}

            {/* Valid Voucher Display */}
            {voucherData && !voucherError && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px',
                  backgroundColor: '#F0FDF4',
                  borderRadius: '8px',
                  border: '1px solid #10B981',
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: '#065F46' }}>{voucherData.code}</div>
                    <div style={{ fontSize: '14px', color: '#047857' }}>
                      Balance: ${voucherData.balance}| Can apply: $
                      {Math.min(voucherData.balance, totalAmount).toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={applyVoucher}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Applied Vouchers List */}
            {appliedVouchers.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ ...paymentModalStyles.label, marginBottom: '8px' }}>
                  Applied Vouchers
                </label>
                {appliedVouchers.map((voucher) => (
                  <div
                    key={voucher.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: '#EFF6FF',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid #3B82F6',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', color: '#1E40AF' }}>{voucher.code}</div>
                      <div style={{ fontSize: '12px', color: '#1D4ED8' }}>
                        Applied: ${voucher.appliedAmount.toFixed(2)}
                      </div>
                    </div>
                    <button
                      onClick={() => removeAppliedVoucher(voucher.id)}
                      style={{
                        color: '#EF4444',
                        cursor: 'pointer',
                        padding: '4px',
                        background: 'none',
                        border: 'none',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Message */}
        {message.text && (
          <div
            style={{
              ...paymentModalStyles.message,
              ...(message.type === 'success'
                ? paymentModalStyles.messageSuccess
                : paymentModalStyles.messageError),
            }}
          >
            {message.text}
          </div>
        )}

        {/* Complete Payment Button */}
        <button
          onClick={processPayment}
          disabled={
            isProcessing ||
            paymentCompleted || // NEW: Disable if payment is completed
            (paymentMethod === 'cash' &&
              (!cashReceived || parseFloat(cashReceived) < totalAmount)) ||
            (paymentMethod === 'voucher' && appliedVouchers.length === 0)
          }
          style={{
            ...paymentModalStyles.completeButton,
            ...(isProcessing ||
            paymentCompleted || // NEW: Include in styling condition
            (paymentMethod === 'cash' &&
              (!cashReceived || parseFloat(cashReceived) < totalAmount)) ||
            (paymentMethod === 'voucher' && appliedVouchers.length === 0)
              ? paymentModalStyles.completeButtonDisabled
              : {}),
          }}
        >
          {paymentCompleted
            ? '✓ Payment Completed'
            : isProcessing
            ? 'Processing...'
            : 'Complete Payment'}
        </button>
      </div>
    </div>
  )
}

// Payment Modal Styles
const paymentModalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6B7280',
    padding: '0',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
  },
  bookingSummary: {
    padding: '20px 24px',
    backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#6B7280',
  },
  summaryValue: {
    color: '#111827',
    fontWeight: '500',
  },
  totalSection: {
    padding: '24px',
    textAlign: 'center',
    borderBottom: '1px solid #E5E7EB',
  },
  discountSection: {
    marginBottom: '20px',
    textAlign: 'left',
  },
  discountHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  discountLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  discountTypeToggle: {
    display: 'flex',
    gap: '4px',
    backgroundColor: '#F3F4F6',
    padding: '2px',
    borderRadius: '6px',
  },
  discountTypeButton: {
    padding: '4px 12px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: '#6B7280',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  discountTypeButtonActive: {
    backgroundColor: 'white',
    color: '#10B981',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  discountInputWrapper: {
    position: 'relative',
    marginBottom: '8px',
  },
  discountSymbol: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '14px',
    color: '#6B7280',
    fontWeight: '500',
  },
  discountInput: {
    width: '100%',
    paddingLeft: '32px',
    paddingRight: '12px',
    paddingTop: '8px',
    paddingBottom: '8px',
    border: '1px solid #D1D5DB',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  clearDiscountButton: {
    fontSize: '12px',
    color: '#EF4444',
    cursor: 'pointer',
    padding: '4px',
    background: 'none',
    border: 'none',
  },
  amountBreakdown: {
    marginBottom: '16px',
    paddingTop: '12px',
    borderTop: '1px solid #E5E7EB',
  },
  breakdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  breakdownLabel: {
    color: '#6B7280',
  },
  breakdownValue: {
    fontWeight: '500',
    color: '#374151',
  },
  totalLabel: {
    fontSize: '14px',
    color: '#6B7280',
    marginBottom: '8px',
  },
  totalAmount: {
    fontSize: '36px',
    fontWeight: '700',
    color: '#10B981',
  },
  paymentMethodSection: {
    padding: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '12px',
  },
  paymentMethodGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },
  paymentMethodButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    transition: 'all 0.2s',
  },
  paymentMethodButtonActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    color: '#10B981',
  },
  paymentIcon: {
    fontSize: '32px',
  },
  cashInputSection: {
    padding: '0 24px 24px',
  },
  cashInputWrapper: {
    position: 'relative',
    marginBottom: '12px',
  },
  dollarSign: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '18px',
    color: '#6B7280',
    fontWeight: '500',
  },
  cashInput: {
    width: '100%',
    padding: '12px 12px 12px 32px',
    border: '2px solid #E5E7EB',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: '500',
    boxSizing: 'border-box',
  },
  changeDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#F3F4F6',
    borderRadius: '8px',
  },
  changeLabel: {
    fontSize: '14px',
    color: '#6B7280',
  },
  changeAmount: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#10B981',
  },
  message: {
    margin: '0 24px 16px',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
  },
  messageSuccess: {
    backgroundColor: '#ECFDF5',
    color: '#10B981',
    border: '1px solid #10B981',
  },
  messageError: {
    backgroundColor: '#FEE2E2',
    color: '#EF4444',
    border: '1px solid #EF4444',
  },
  completeButton: {
    width: 'calc(100% - 48px)',
    margin: '0 24px 24px',
    padding: '14px',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  completeButtonDisabled: {
    backgroundColor: '#9CA3AF',
    cursor: 'not-allowed',
  },
}

// Main BookingDetailPage Component
const BookingDetailPage = () => {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnDate = searchParams.get('returnDate')
  const { booking, isLoading, error, refetch } = useBookingDetail(bookingId)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [serialPort, setSerialPort] = useState(null)

  // Check if we should auto-open payment modal from URL
  useEffect(() => {
    if (searchParams.get('payment') === 'true') {
      setIsPaymentModalOpen(true)
    }
  }, [searchParams])

  const disconnectCashDrawer = async () => {
    if (serialPort) {
      try {
        await serialPort.close()
        alert('Cash drawer disconnected successfully')
      } catch (error) {
        console.error('Error closing port:', error)
        alert('Error disconnecting cash drawer')
      }
      setSerialPort(null)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleBack = () => {
    if (returnDate) {
      navigate(`/bookings?date=${returnDate}`)
    } else {
      navigate('/bookings')
    }
  }

  const calculateDuration = (start, end) => {
    if (!start || !end) return 'N/A'
    const startDate = new Date(start)
    const endDate = new Date(end)
    const durationMs = endDate - startDate
    const durationMinutes = Math.floor(durationMs / 60000)
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const getServiceDisplay = () => {
    if (booking.services && Array.isArray(booking.services) && booking.services.length > 0) {
      return booking.services.map((s) => s.name).join(', ')
    }
    return booking.service?.name || 'N/A'
  }

  const getStatusStyle = (status) => {
    const baseStyle = {
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '500',
    }

    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { ...baseStyle, backgroundColor: '#D1FAE5', color: '#065F46' }
      case 'pending':
        return { ...baseStyle, backgroundColor: '#FEF3C7', color: '#92400E' }
      case 'cancelled':
        return { ...baseStyle, backgroundColor: '#FEE2E2', color: '#991B1B' }
      case 'completed':
        return { ...baseStyle, backgroundColor: '#DBEAFE', color: '#1E40AF' }
      default:
        return { ...baseStyle, backgroundColor: '#F3F4F6', color: '#6B7280' }
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteBooking(bookingId)
      // Navigate back with date if available
      if (returnDate) {
        navigate(`/bookings?date=${returnDate}`)
      } else {
        navigate('/bookings')
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Failed to delete booking. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) return <Spinner />
  if (error) return <div style={styles.error}>Error loading booking details</div>
  if (!booking) return <div style={styles.error}>Booking not found</div>

  return (
    <div style={styles.container}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 24px',
          backgroundColor: 'white',
          borderBottom: '1px solid #E5E7EB',
          flexWrap: 'nowrap',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flex: '0 1 auto',
          }}
        >
          <button
            onClick={handleBack}
            style={{
              ...styles.backButton,
              whiteSpace: 'nowrap',
            }}
          >
            ← Back
          </button>
          <h1
            style={{
              ...styles.title,
              whiteSpace: 'nowrap',
              margin: 0,
            }}
          >
            Booking Details
          </h1>
          <div
            style={{
              ...getStatusStyle(booking.status),
              whiteSpace: 'nowrap',
            }}
          >
            {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1) || 'N/A'}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: '0 0 auto',
          }}
        >
          {serialPort && (
            <button
              onClick={disconnectCashDrawer}
              style={{
                padding: '10px 20px',
                backgroundColor: '#F59E0B',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              🔌 Disconnect Drawer
            </button>
          )}
          <button
            onClick={() => setIsPaymentModalOpen(true)}
            style={{
              ...styles.completeButton,
              whiteSpace: 'nowrap',
            }}
          >
            ✓ Complete & Pay
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            style={{
              ...styles.editButton,
              whiteSpace: 'nowrap',
            }}
          >
            ✏️ Edit
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            style={{
              ...styles.deleteButton,
              whiteSpace: 'nowrap',
            }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Booking Overview Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Booking Overview</h2>
          <div style={styles.overviewGrid}>
            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Client</div>
              <div style={styles.overviewValue}>
                <span style={styles.clientIcon}>👤</span>
                {booking.client?.fullName || booking.client?.email || booking.name} -{' '}
                {booking.phone || booking.client?.phone}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Service</div>
              <div style={styles.overviewValue}>
                <span style={styles.serviceIcon}>💼</span>
                {getServiceDisplay()}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Staff</div>
              <div style={styles.overviewValue}>
                <span style={styles.serviceIcon}>👤</span>
                {booking.staff?.name || 'Not assigned'}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Date</div>
              <div style={styles.overviewValue}>
                <span style={styles.dateIcon}>📅</span>
                {formatDate(booking.startTime)}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Start Time</div>
              <div style={styles.overviewValue}>
                <span style={styles.timeIcon}>🕐</span>
                {formatTime(booking.startTime)}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>End Time</div>
              <div style={styles.overviewValue}>
                <span style={styles.timeIcon}>🕐</span>
                {formatTime(booking.endTime)}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Duration</div>
              <div style={styles.overviewValue}>
                <span style={styles.durationIcon}>⏱️</span>
                {calculateDuration(booking.startTime, booking.endTime)}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Number of Clients</div>
              <div style={styles.overviewValue}>
                <span style={styles.clientIcon}>👥</span>
                {booking.numClients || 1}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Total Price</div>
              <div style={styles.overviewValue}>
                <span style={styles.priceIcon}>💰</span>${booking.totalPrice || 0}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Booking ID</div>
              <div style={styles.overviewValue}>
                <span style={styles.idIcon}>#</span>
                {booking.id}
              </div>
            </div>
          </div>
        </div>

        {/* Client Information Card */}
        {booking.client && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Client Information</h2>
            <div style={styles.clientInfoGrid}>
              {booking.client.email && (
                <div style={styles.contactItem}>
                  <div style={styles.contactLabel}>Email</div>
                  <div style={styles.contactValue}>
                    <a href={`mailto:${booking.client.email}`} style={styles.emailLink}>
                      {booking.client.email}
                    </a>
                  </div>
                </div>
              )}

              {booking.client.phone && (
                <div style={styles.contactItem}>
                  <div style={styles.contactLabel}>Phone</div>
                  <div style={styles.contactValue}>
                    <a href={`tel:${booking.client.phone}`} style={styles.phoneLink}>
                      {booking.client.phone}
                    </a>
                  </div>
                </div>
              )}

              {booking.client.fullName && (
                <div style={styles.contactItem}>
                  <div style={styles.contactLabel}>Full Name</div>
                  <div style={styles.contactValue}>{booking.client.fullName}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Information Card */}
        {booking.service && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Service Information</h2>
            <div style={styles.serviceInfoGrid}>
              <div style={styles.serviceItem}>
                <div style={styles.serviceLabel}>Service Name</div>
                <div style={styles.serviceValue}>{getServiceDisplay()}</div>
              </div>

              {booking.service.duration && (
                <div style={styles.serviceItem}>
                  <div style={styles.serviceLabel}>Service Duration</div>
                  <div style={styles.serviceValue}>{booking.service.duration} minutes</div>
                </div>
              )}

              {booking.service.regularPrice && (
                <div style={styles.serviceItem}>
                  <div style={styles.serviceLabel}>Service Price</div>
                  <div style={styles.serviceValue}>${booking.service.regularPrice}</div>
                </div>
              )}

              {booking.service.description && (
                <div style={styles.serviceItem}>
                  <div style={styles.serviceLabel}>Description</div>
                  <div style={styles.serviceValue}>{booking.service.description}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Card */}
        {booking.notes && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Notes</h2>
            <div style={styles.notesContent}>{booking.notes}</div>
          </div>
        )}

        {/* Booking History/Metadata Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Booking Information</h2>
          <div style={styles.metadataGrid}>
            <div style={styles.metadataItem}>
              <div style={styles.metadataLabel}>Created</div>
              <div style={styles.metadataValue}>{formatDateTime(booking.created_at)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        booking={booking}
        onBookingUpdated={refetch}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        booking={booking}
        serialPort={serialPort}
        setSerialPort={setSerialPort}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div style={modalStyles.overlay} onClick={() => setIsDeleteModalOpen(false)}>
          <div style={modalStyles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <h3 style={modalStyles.deleteTitle}>Delete Booking</h3>
            <p style={modalStyles.deleteMessage}>
              Are you sure you want to delete this booking? This action cannot be undone.
            </p>
            <div style={modalStyles.deleteButtonGroup}>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                style={modalStyles.cancelButton}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  ...modalStyles.deleteConfirmButton,
                  ...(isDeleting ? modalStyles.deleteConfirmButtonDisabled : {}),
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingDetailPage
