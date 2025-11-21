import React, { useState, useEffect } from 'react'
import { modalStyles } from '../styles/RosterStyles'
import { createStaffShift, deleteStaffShift, updateStaffShift } from '../services/apiRoster'

// Enhanced Shift Modal with Date-Specific Support
const EnhancedShiftModal = ({ isOpen, onClose, shift, staff, onSuccess }) => {
  const [shiftType, setShiftType] = useState('recurring') // 'recurring' or 'specific'
  const [formData, setFormData] = useState({
    staffId: '',
    // For recurring shifts
    dayOfWeek: '',
    // For specific date shifts
    specificDate: '',
    startTime: '',
    endTime: '',
    notes: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Add these helper functions if they're not already in your modal
  const formatTime = (timeString) => {
    if (!timeString) return ''
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getDayName = (dayNumber) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayNumber] || 'Unknown'
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  useEffect(() => {
    if (shift) {
      // Determine if this is a recurring or specific date shift
      const isSpecificDate = shift.specificDate !== null
      setShiftType(isSpecificDate ? 'specific' : 'recurring')

      setFormData({
        staffId: shift.staffId || '',
        dayOfWeek: shift.dayOfWeek !== null ? shift.dayOfWeek : '',
        specificDate: shift.specificDate || '',
        startTime: shift.startTime || '',
        endTime: shift.endTime || '',
        notes: shift.notes || '',
      })
    } else {
      setFormData({
        staffId: '',
        dayOfWeek: '',
        specificDate: '',
        startTime: '',
        endTime: '',
        notes: '',
      })
    }
    setError(null)
  }, [shift, isOpen])

  // Add this function inside your EnhancedShiftModal component
  const handleDeleteShift = async () => {
    if (!shift) return

    // Get staff name for confirmation
    const staffMember = staff.find((s) => s.id === shift.staffId)
    const staffName = staffMember?.name || 'Unknown'

    // Create description based on shift type
    const shiftDescription =
      shift.dayOfWeek !== null
        ? `recurring ${getDayName(shift.dayOfWeek)} shift`
        : `shift on ${formatDate(shift.specificDate)}`

    // Confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete ${staffName}'s ${shiftDescription} from ${formatTime(
        shift.startTime
      )} to ${formatTime(shift.endTime)}?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setIsSubmitting(true)

      // Call your delete API function
      await deleteStaffShift(shift.id)

      // Call success callback to refresh parent
      onSuccess()

      // Close modal
      onClose()
    } catch (error) {
      console.error('Error deleting shift:', error)
      alert('Failed to delete shift. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const validateForm = () => {
    if (!formData.staffId) return 'Please select a staff member'
    if (!formData.startTime) return 'Please enter start time'
    if (!formData.endTime) return 'Please enter end time'

    if (shiftType === 'recurring') {
      if (formData.dayOfWeek === '') return 'Please select a day of week'
    } else {
      if (!formData.specificDate) return 'Please select a specific date'

      // Check if date is not in the past
      const selectedDate = new Date(formData.specificDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        return 'Cannot schedule shifts for past dates'
      }
    }

    if (formData.startTime >= formData.endTime) {
      return 'Start time must be before end time'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setIsSubmitting(true)

      const shiftData = {
        staffId: parseInt(formData.staffId),
        startTime: formData.startTime,
        endTime: formData.endTime,
        notes: formData.notes || null,
      }

      if (shiftType === 'recurring') {
        shiftData.dayOfWeek = parseInt(formData.dayOfWeek)
        shiftData.specificDate = null
      } else {
        shiftData.specificDate = formData.specificDate
        shiftData.dayOfWeek = null
      }

      if (shift) {
        await updateStaffShift(shift.id, shiftData)
      } else {
        await createStaffShift(shiftData)
      }

      onSuccess()
      onClose()
    } catch (err) {
      console.error('Error saving shift:', err)
      setError(err.message || 'Failed to save shift')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const selectedStaff = staff.find((s) => s.id === parseInt(formData.staffId))

  // Get day name for specific date
  const getDateDayName = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  // Format date for display
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.modalHeader}>
          <h2 style={modalStyles.modalTitle}>{shift ? 'Edit Shift' : 'Create New Shift'}</h2>
          <p style={modalStyles.modalSubtitle}>
            {shift ? 'Update shift details' : 'Add a new shift to the roster'}
          </p>
        </div>

        {error && <div style={modalStyles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Staff Selection */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Staff Member *</label>
            <select
              value={formData.staffId}
              onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
              style={modalStyles.input}
              required
            >
              <option value="">-- Select Staff Member --</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Type Selection */}
          {!shift && (
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Shift Type *</label>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShiftType('recurring')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: shiftType === 'recurring' ? '2px solid #007bff' : '2px solid #e5e7eb',
                    backgroundColor: shiftType === 'recurring' ? '#eff6ff' : 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: shiftType === 'recurring' ? '600' : '500',
                    color: shiftType === 'recurring' ? '#007bff' : '#374151',
                    transition: 'all 0.2s',
                  }}
                >
                  🔄 Recurring Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setShiftType('specific')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: shiftType === 'specific' ? '2px solid #007bff' : '2px solid #e5e7eb',
                    backgroundColor: shiftType === 'specific' ? '#eff6ff' : 'white',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: shiftType === 'specific' ? '600' : '500',
                    color: shiftType === 'specific' ? '#007bff' : '#374151',
                    transition: 'all 0.2s',
                  }}
                >
                  📅 Specific Date
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {shiftType === 'recurring'
                  ? 'Creates a shift that repeats every week on the selected day'
                  : 'Creates a one-time shift for a specific date'}
              </div>
            </div>
          )}

          {/* Day of Week (for recurring shifts) */}
          {shiftType === 'recurring' && (
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Day of Week *</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                style={modalStyles.input}
                required
              >
                <option value="">-- Select Day --</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
            </div>
          )}

          {/* Specific Date (for one-off shifts) */}
          {shiftType === 'specific' && (
            <div style={modalStyles.formGroup}>
              <label style={modalStyles.label}>Date *</label>
              <input
                type="date"
                value={formData.specificDate}
                onChange={(e) => setFormData({ ...formData, specificDate: e.target.value })}
                style={modalStyles.input}
                min={new Date().toISOString().split('T')[0]} // Prevent past dates
                required
              />
              {formData.specificDate && (
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  {getDateDayName(formData.specificDate)} -{' '}
                  {formatDateForDisplay(formData.specificDate)}
                </div>
              )}
            </div>
          )}

          {/* Start Time */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Start Time *</label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              style={modalStyles.input}
              required
            />
          </div>

          {/* End Time */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>End Time *</label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              style={modalStyles.input}
              required
            />
          </div>

          {/* Notes */}
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              style={modalStyles.textarea}
              placeholder="Add any notes about this shift..."
            />
          </div>

          {/* Shift Preview */}
          {formData.startTime &&
            formData.endTime &&
            selectedStaff &&
            ((shiftType === 'recurring' && formData.dayOfWeek !== '') ||
              (shiftType === 'specific' && formData.specificDate)) && (
              <div style={modalStyles.infoBox}>
                <div style={modalStyles.infoText}>
                  <strong>Shift Preview:</strong> {selectedStaff.name} -{' '}
                  {shiftType === 'recurring'
                    ? `Every ${
                        [
                          'Sunday',
                          'Monday',
                          'Tuesday',
                          'Wednesday',
                          'Thursday',
                          'Friday',
                          'Saturday',
                        ][formData.dayOfWeek]
                      }`
                    : formatDateForDisplay(formData.specificDate)}{' '}
                  from {formData.startTime} to {formData.endTime}
                </div>
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
            {shift && (
              <button
                type="button"
                onClick={handleDeleteShift}
                style={{
                  ...modalStyles.cancelButton,
                  backgroundColor: '#fee2e2',
                  borderColor: '#fecaca',
                  color: '#991b1b',
                  marginLeft: '8px',
                }}
                disabled={isSubmitting}
              >
                🗑️ Delete
              </button>
            )}
            <button
              type="submit"
              style={{
                ...modalStyles.submitButton,
                ...(isSubmitting ? modalStyles.submitButtonDisabled : {}),
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : shift ? 'Update Shift' : 'Create Shift'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EnhancedShiftModal
