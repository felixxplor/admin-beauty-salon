import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import Spinner from '../ui/Spinner'
import { deleteBooking, getBooking, updateBooking } from '../services/apiBookings'

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
      const startTime = booking.startTime ? new Date(booking.startTime) : null
      const endTime = booking.endTime ? new Date(booking.endTime) : null

      setFormData({
        numClients: booking.numClients || 1,
        status: booking.status || 'confirmed',
        notes: booking.notes || '',
        startTime: startTime ? startTime.toISOString().slice(0, 16) : '',
        endTime: endTime ? endTime.toISOString().slice(0, 16) : '',
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
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteBooking(parseInt(bookingId))
      navigate('/bookings') // or wherever you want to redirect after deletion
    } catch (error) {
      console.error('Error deleting booking:', error)
      alert('Failed to delete booking. Please try again.')
    } finally {
      setIsDeleting(false)
      setIsDeleteModalOpen(false)
    }
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
          <button onClick={() => navigate(-1)} style={styles.backButton}>
            ← Back
          </button>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>Booking Details</h1>
            <div style={getStatusBadgeStyle(booking.status)}>{booking.status || 'Confirmed'}</div>
          </div>
        </div>

        <div style={styles.headerActions}>
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
                {booking.clients?.fullName || booking.clients?.name || 'Unknown Client'}
              </div>
            </div>

            <div style={styles.overviewItem}>
              <div style={styles.overviewLabel}>Service</div>
              <div style={styles.overviewValue}>
                <span style={styles.serviceIcon}>💼</span>
                {booking.services?.name || 'Service not specified'}
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
        {booking.clients && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Client Information</h2>
            <div style={styles.clientInfoGrid}>
              {booking.clients.email && (
                <div style={styles.contactItem}>
                  <div style={styles.contactLabel}>Email</div>
                  <div style={styles.contactValue}>
                    <a href={`mailto:${booking.clients.email}`} style={styles.emailLink}>
                      {booking.clients.email}
                    </a>
                  </div>
                </div>
              )}

              {booking.clients.phone && (
                <div style={styles.contactItem}>
                  <div style={styles.contactLabel}>Phone</div>
                  <div style={styles.contactValue}>
                    <a href={`tel:${booking.clients.phone}`} style={styles.phoneLink}>
                      {booking.clients.phone}
                    </a>
                  </div>
                </div>
              )}

              {booking.clients.fullName && (
                <div style={styles.contactItem}>
                  <div style={styles.contactLabel}>Full Name</div>
                  <div style={styles.contactValue}>{booking.clients.fullName}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Service Information Card */}
        {booking.services && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Service Information</h2>
            <div style={styles.serviceInfoGrid}>
              <div style={styles.serviceItem}>
                <div style={styles.serviceLabel}>Service Name</div>
                <div style={styles.serviceValue}>{booking.services.name}</div>
              </div>

              {booking.services.duration && (
                <div style={styles.serviceItem}>
                  <div style={styles.serviceLabel}>Service Duration</div>
                  <div style={styles.serviceValue}>{booking.services.duration} minutes</div>
                </div>
              )}

              {booking.services.regularPrice && (
                <div style={styles.serviceItem}>
                  <div style={styles.serviceLabel}>Service Price</div>
                  <div style={styles.serviceValue}>${booking.services.regularPrice}</div>
                </div>
              )}

              {booking.services.description && (
                <div style={styles.serviceItem}>
                  <div style={styles.serviceLabel}>Description</div>
                  <div style={styles.serviceValue}>{booking.services.description}</div>
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

            {booking.updated_at && (
              <div style={styles.metadataItem}>
                <div style={styles.metadataLabel}>Last Updated</div>
                <div style={styles.metadataValue}>{formatDateTime(booking.updated_at)}</div>
              </div>
            )}

            {booking.isPaid !== null && (
              <div style={styles.metadataItem}>
                <div style={styles.metadataLabel}>Payment Status</div>
                <div style={styles.metadataValue}>{booking.isPaid ? 'Paid' : 'Not Paid'}</div>
              </div>
            )}
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

const styles = {
  container: {
    width: '100%',
    padding: '24px',
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
    backgroundColor: 'white',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    color: '#6b7280',
    transition: 'all 0.2s ease',
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  editButton: {
    padding: '12px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  deleteButton: {
    padding: '12px 20px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  overviewItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  overviewLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  overviewValue: {
    fontSize: '16px',
    color: '#1a1a1a',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  clientIcon: { fontSize: '18px' },
  serviceIcon: { fontSize: '18px' },
  dateIcon: { fontSize: '18px' },
  timeIcon: { fontSize: '18px' },
  durationIcon: { fontSize: '18px' },
  priceIcon: { fontSize: '18px' },
  idIcon: { fontSize: '18px', fontWeight: 'bold' },
  clientInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  contactItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  contactLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  contactValue: {
    fontSize: '16px',
    color: '#1a1a1a',
    fontWeight: '500',
  },
  emailLink: {
    color: '#2563eb',
    textDecoration: 'none',
  },
  phoneLink: {
    color: '#059669',
    textDecoration: 'none',
  },
  serviceInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  serviceItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  serviceLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  serviceValue: {
    fontSize: '16px',
    color: '#1a1a1a',
    fontWeight: '500',
  },
  notesContent: {
    fontSize: '16px',
    color: '#374151',
    lineHeight: '1.6',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
  },
  metadataItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metadataLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  metadataValue: {
    fontSize: '16px',
    color: '#1a1a1a',
    fontWeight: '500',
  },
  errorMessage: {
    padding: '24px',
    textAlign: 'center',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
  },
}

const modalStyles = {
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
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  deleteModal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e5e5',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: 0,
  },
  deleteTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: '16px',
  },
  deleteMessage: {
    fontSize: '16px',
    color: '#6b7280',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  select: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  textarea: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: '12px',
    color: '#ef4444',
  },
  submitError: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '14px',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  deleteButtonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  deleteConfirmButton: {
    padding: '12px 24px',
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  deleteConfirmButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
}

export default BookingDetailPage
