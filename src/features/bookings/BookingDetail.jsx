import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom'

import Spinner from '../../ui/Spinner'
import { deleteBooking, getBooking, updateBooking } from '../../services/apiBookings'
import { modalStyles, styles } from '../../styles/BookingDetailStyles'

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
    totalPrice: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  useEffect(() => {
    if (booking) {
      // Helper function to convert UTC date to local datetime-local format
      const toLocalDateTimeString = (dateString) => {
        if (!dateString) return ''
        const date = new Date(dateString)
        // Get local datetime in the format needed for datetime-local input
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        return `${year}-${month}-${day}T${hours}:${minutes}`
      }

      setFormData({
        numClients: booking.numClients || 1,
        status: booking.status || 'confirmed',
        notes: booking.notes || '',
        startTime: toLocalDateTimeString(booking.startTime),
        endTime: toLocalDateTimeString(booking.endTime),
        totalPrice: booking.totalPrice || 0,
      })
    }
  }, [booking])

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.startTime) {
      errors.startTime = 'Start time is required'
    }
    if (!formData.endTime) {
      errors.endTime = 'End time is required'
    }
    if (
      formData.startTime &&
      formData.endTime &&
      new Date(formData.startTime) >= new Date(formData.endTime)
    ) {
      errors.endTime = 'End time must be after start time'
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
      const updateData = {
        numClients: parseInt(formData.numClients),
        status: formData.status,
        notes: formData.notes,
        // Don't use new Date().toISOString() - it converts to UTC
        // Instead, append 'Z' to treat the local time as UTC, or use the value directly
        startTime: formData.startTime, // Send as-is, let backend handle it
        endTime: formData.endTime, // Send as-is, let backend handle it
        totalPrice: parseFloat(formData.totalPrice),
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
    onClose()
  }

  if (!isOpen) return null

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
          <div style={modalStyles.formRow}>
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

            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>End Time *</label>
              <input
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                style={{
                  ...modalStyles.input,
                  color: '#000000',
                  WebkitTextFillColor: '#000000',
                  ...(formErrors.endTime ? modalStyles.inputError : {}),
                }}
              />
              {formErrors.endTime && <div style={modalStyles.errorText}>{formErrors.endTime}</div>}
            </div>
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
              <label style={modalStyles.label}>Total Price</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.totalPrice}
                onChange={(e) => handleInputChange('totalPrice', e.target.value)}
                style={{
                  ...modalStyles.input,
                  color: '#000000',
                  WebkitTextFillColor: '#000000',
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
    setIsDeleting(true)
    try {
      await deleteBooking(parseInt(bookingId))
      navigate('/bookings')
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
                {booking.client?.fullName || booking.client?.name || booking.phone}
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
