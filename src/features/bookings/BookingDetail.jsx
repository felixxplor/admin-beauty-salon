import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import Spinner from '../../ui/Spinner'
import { deleteBooking, getBooking, updateBooking } from '../../services/apiBookings'
import { modalStyles, styles } from '../../styles/BookingDetailStyles'
import { getStaff } from '../../services/apiStaff'
import { getServices } from '../../services/apiServices'

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
      const toLocalDateTimeString = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
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

  // Auto-update end time and total price when start time or services change
  useEffect(() => {
    if (formData.startTime && selectedServicesInfo.totalDuration > 0) {
      const calculatedEndTime = calculateEndTime(
        formData.startTime,
        selectedServicesInfo.totalDuration
      )
      setFormData((prev) => ({
        ...prev,
        endTime: calculatedEndTime,
        totalPrice: selectedServicesInfo.totalPrice,
      }))
    }
  }, [formData.startTime, selectedServicesInfo.totalDuration, selectedServicesInfo.totalPrice])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const handleServiceSelection = (serviceId) => {
    setFormData((prev) => ({
      ...prev,
      selectedServiceIds: prev.selectedServiceIds.includes(serviceId)
        ? prev.selectedServiceIds.filter((id) => id !== serviceId)
        : [...prev.selectedServiceIds, serviceId],
    }))
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
      errors.staffId = 'Staff member is required'
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      // Keep the price as-is (with "+" if present) since it's stored as TEXT in database
      const priceValue = formData.totalPrice

      const updateData = {
        numClients: parseInt(formData.numClients),
        status: formData.status,
        notes: formData.notes,
        startTime: formData.startTime,
        endTime: formData.endTime,
        totalPrice: priceValue,
        serviceIds: formData.selectedServiceIds.map((id) => parseInt(id)),
        serviceId:
          formData.selectedServiceIds.length === 1
            ? parseInt(formData.selectedServiceIds[0])
            : null,
        staffId: parseInt(formData.staffId),
      }

      await updateBooking(booking.id, updateData)
      onBookingUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating booking:', error)
      setFormErrors({ submit: error.message || 'Failed to update booking' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormErrors({})
    setServiceSearchTerm('')
    onClose()
  }

  if (!isOpen) return null
  if (servicesLoading || staffLoading) {
    return (
      <div style={modalStyles.overlay}>
        <div style={modalStyles.modal}>
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div style={modalStyles.overlay} onClick={handleClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Edit Booking</h2>
          <button style={modalStyles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          {/* Services Selection */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Services (Select Multiple) *</label>

            <input
              type="text"
              placeholder="Search services..."
              value={serviceSearchTerm}
              onChange={(e) => setServiceSearchTerm(e.target.value)}
              style={{
                ...modalStyles.input,
                marginBottom: '8px',
                color: '#000000',
                WebkitTextFillColor: '#000000',
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
              {filteredServices.length > 0 ? (
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
                      onChange={() => handleServiceSelection(service.id.toString())}
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
                          // Service prices are TEXT format (e.g., "20+", "POA")
                          const regularPriceStr = service.regularPrice
                            ? String(service.regularPrice)
                            : '0'
                          const discountStr = service.discount ? String(service.discount) : '0'

                          const hasPlus = regularPriceStr.includes('+')
                          const regularPriceNum = parseFloat(regularPriceStr.replace('+', ''))
                          const discountNum = parseFloat(discountStr.replace('+', ''))

                          // Check if we got valid numbers
                          if (isNaN(regularPriceNum)) {
                            return regularPriceStr // Return original text (e.g., "POA")
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
              ) : (
                <div
                  style={{ padding: '16px', textAlign: 'center', color: '#666', fontSize: '14px' }}
                >
                  No services found matching &#39;{serviceSearchTerm}&#39;
                </div>
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

            {formErrors.services && <div style={modalStyles.errorText}>{formErrors.services}</div>}

            {selectedServicesInfo.totalDuration > 0 && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                <strong>Selected:</strong> {selectedServicesInfo.serviceNames.join(', ')}
                <br />
                <strong>Total Duration:</strong> {selectedServicesInfo.totalDuration} minutes
                <br />
                <strong>Total Price:</strong> ${selectedServicesInfo.totalPrice}
              </div>
            )}
          </div>

          {/* Start Time */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Start Time *</label>
            <input
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              style={{
                ...modalStyles.input,
                color: '#000000',
                WebkitTextFillColor: '#000000',
                ...(formErrors.startTime ? modalStyles.inputError : {}),
              }}
            />
            {formErrors.startTime && (
              <div style={modalStyles.errorText}>{formErrors.startTime}</div>
            )}
          </div>

          {/* End Time (Auto-calculated) */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>End Time (Auto-calculated)</label>
            <input
              type="datetime-local"
              value={formData.endTime}
              disabled
              style={{
                ...modalStyles.input,
                backgroundColor: '#f9fafb',
                color: '#000000',
                WebkitTextFillColor: '#000000',
              }}
            />
          </div>

          {/* Staff Selection */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Staff Member *</label>
            <select
              value={formData.staffId}
              onChange={(e) => handleInputChange('staffId', e.target.value)}
              style={{
                ...modalStyles.select,
                color: '#000000',
                WebkitTextFillColor: '#000000',
                ...(formErrors.staffId ? modalStyles.inputError : {}),
              }}
            >
              <option value="">Select staff member</option>
              {staff &&
                staff.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name || staffMember.id}
                  </option>
                ))}
            </select>
            {formErrors.staffId && <div style={modalStyles.errorText}>{formErrors.staffId}</div>}
          </div>

          <div style={modalStyles.formRow}>
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Number of Clients</label>
              <input
                type="number"
                min="1"
                value={formData.numClients}
                onChange={(e) => handleInputChange('numClients', e.target.value)}
                style={{
                  ...modalStyles.input,
                  color: '#000000',
                  WebkitTextFillColor: '#000000',
                }}
              />
            </div>

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Total Price (Auto-calculated)</label>
              <input
                type="text"
                value={`$${formData.totalPrice}`}
                disabled
                style={{
                  ...modalStyles.input,
                  backgroundColor: '#f9fafb',
                  color: '#000000',
                  WebkitTextFillColor: '#000000',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              />
            </div>
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              style={{
                ...modalStyles.select,
                color: '#000000',
                WebkitTextFillColor: '#000000',
              }}
            >
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              style={{
                ...modalStyles.textarea,
                color: '#000000',
                WebkitTextFillColor: '#000000',
              }}
              rows={3}
              placeholder="Add any notes about this booking..."
            />
          </div>

          {formErrors.submit && <div style={modalStyles.submitError}>{formErrors.submit}</div>}

          <div style={modalStyles.buttonGroup}>
            <button
              type="button"
              onClick={handleClose}
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
              {isSubmitting ? 'Updating...' : 'Update Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const BookingDetailPage = () => {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

  const { booking, isLoading, error, refetch } = useBookingDetail(bookingId)

  const getStatusBadgeStyle = (status) => {
    const baseStyle = {
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '600',
      textTransform: 'capitalize',
      display: 'inline-block',
    }

    switch (status?.toLowerCase()) {
      case 'confirmed':
        return { ...baseStyle, backgroundColor: '#dcfce7', color: '#166534' }
      case 'pending':
        return { ...baseStyle, backgroundColor: '#fef3c7', color: '#d97706' }
      case 'cancelled':
        return { ...baseStyle, backgroundColor: '#fee2e2', color: '#dc2626' }
      case 'completed':
        return { ...baseStyle, backgroundColor: '#e0e7ff', color: '#4338ca' }
      default:
        return { ...baseStyle, backgroundColor: '#f3f4f6', color: '#6b7280' }
    }
  }

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A'
    return new Date(dateTimeString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const formatDate = (dateTimeString) => {
    if (!dateTimeString) return 'N/A'
    return new Date(dateTimeString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatTime = (dateTimeString) => {
    if (!dateTimeString) return 'N/A'
    return new Date(dateTimeString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A'
    const start = new Date(startTime)
    const end = new Date(endTime)
    const durationMs = end - start
    const durationMinutes = Math.round(durationMs / (1000 * 60))

    if (durationMinutes >= 60) {
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
    return `${durationMinutes}m`
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await updateBooking(parseInt(bookingId), { status: 'completed' })
      await refetch()
    } catch (error) {
      console.error('Error completing booking:', error)
      alert('Failed to complete booking. Please try again.')
    } finally {
      setIsCompleting(false)
    }
  }

  const handleDelete = async () => {
    const returnDate = searchParams.get('returnDate')
    setIsDeleting(true)
    try {
      await deleteBooking(parseInt(bookingId))
      if (returnDate) {
        navigate(`/bookings?date=${returnDate}&view=day`)
      } else {
        navigate('/bookings')
      }
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Failed to delete booking. Please try again.')
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
  }

  const getServiceDisplay = () => {
    if (!booking) return 'Service not specified'

    // Handle multiple services from serviceIds
    if (booking.serviceIds && Array.isArray(booking.serviceIds) && booking.serviceIds.length > 0) {
      // If we have service names from the query
      if (Array.isArray(booking.services)) {
        return booking.services.map((s) => s.name).join(', ')
      }
      // Fallback to showing count
      return `${booking.serviceIds.length} Service${booking.serviceIds.length > 1 ? 's' : ''}`
    }

    // Handle single service
    if (booking.services?.name) {
      return booking.services.name
    }

    return 'Service not specified'
  }

  if (isLoading) return <Spinner />

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorMessage}>Error loading booking: {error.message}</div>
      </div>
    )
  }

  if (!booking) {
    return (
      <div style={styles.container}>
        <div style={styles.errorMessage}>Booking not found</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => {
              const returnDate = searchParams.get('returnDate')

              if (returnDate) {
                navigate(`/bookings?date=${returnDate}&view=day`)
              } else {
                navigate('/bookings')
              }
            }}
            style={styles.backButton}
          >
            ← Back
          </button>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>Booking Details</h1>
            <div style={getStatusBadgeStyle(booking.status)}>{booking.status || 'Confirmed'}</div>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={handleComplete}
            disabled={isCompleting || booking.status === 'completed'}
            style={{
              padding: '12px 20px',
              backgroundColor: booking.status === 'completed' ? '#9ca3af' : '#16a34a',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isCompleting || booking.status === 'completed' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: isCompleting || booking.status === 'completed' ? 0.7 : 1,
            }}
          >
            ✓{' '}
            {isCompleting
              ? 'Completing...'
              : booking.status === 'completed'
              ? 'Completed'
              : 'Complete'}
          </button>
          <button onClick={() => setIsEditModalOpen(true)} style={styles.editButton}>
            ✏️ Edit
          </button>
          <button onClick={() => setIsDeleteModalOpen(true)} style={styles.deleteButton}>
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
                {booking.client?.fullName || booking.client?.email || booking.name || booking.phone}
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
