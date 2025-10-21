import React, { useState, useEffect } from 'react'
import supabase from '../services/supabase'
import Spinner from '../ui/Spinner'

// Custom hook to fetch staff
const useStaff = () => {
  const [staff, setStaff] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .order('name', { ascending: true })

        if (error) throw error
        setStaff(data || [])
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

// Custom hook to fetch staff absences
const useStaffAbsences = () => {
  const [absences, setAbsences] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAbsences = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('staff_absences')
        .select('*')
        .order('absenceDate', { ascending: false })

      if (error) throw error
      setAbsences(data || [])
    } catch (err) {
      console.error('Error loading absences:', err)
      setError(err)
      setAbsences([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAbsences()
  }, [])

  return { absences, isLoading, error, refetch: fetchAbsences }
}

const absenceTypes = [
  'Sick Leave',
  'Annual Leave',
  'Personal Leave',
  'Public Holiday',
  'Unpaid Leave',
  'Training',
]

const styles = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: '24px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: '28px',
    fontWeight: '600',
    margin: 0,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formTitle: {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '20px',
    color: '#1f2937',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '6px',
  },
  required: {
    color: '#ef4444',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: 'white',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    minHeight: '80px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  submitButton: {
    padding: '10px 24px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 24px',
    backgroundColor: '#e5e7eb',
    color: '#374151',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  listCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  listHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  listTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '4px',
    color: '#1f2937',
  },
  listSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#1f2937',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  absenceItem: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'start',
  },
  absenceInfo: {
    flex: 1,
  },
  absenceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  staffIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  staffName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '2px',
  },
  absenceDate: {
    fontSize: '14px',
    color: '#6b7280',
  },
  absenceDetails: {
    marginLeft: '52px',
  },
  typeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '13px',
    fontWeight: '500',
    borderRadius: '12px',
    marginBottom: '8px',
  },
  absenceNotes: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '8px',
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
}

const StaffLeavePage = () => {
  const { staff, isLoading: staffLoading, error: staffError } = useStaff()
  const { absences, isLoading: absencesLoading, error: absencesError, refetch } = useStaffAbsences()

  const [showForm, setShowForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    staffId: '',
    absenceDate: '',
    absenceType: 'Sick Leave',
    notes: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.staffId || !formData.absenceDate || !formData.absenceType) {
      alert('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('staff_absences').insert([
        {
          staffId: parseInt(formData.staffId),
          absenceDate: formData.absenceDate,
          absenceType: formData.absenceType,
          notes: formData.notes || null,
        },
      ])

      if (error) throw error

      alert('✓ Leave added successfully')
      setFormData({
        staffId: '',
        absenceDate: '',
        absenceType: 'Sick Leave',
        notes: '',
      })
      setShowForm(false)
      await refetch()
    } catch (error) {
      console.error('Error adding absence:', error)
      alert('❌ Failed to add leave. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this absence?')) return

    try {
      const { error } = await supabase.from('staff_absences').delete().eq('id', id)

      if (error) throw error

      alert('✓ Absence deleted successfully')
      await refetch()
    } catch (error) {
      console.error('Error deleting absence:', error)
      alert('❌ Failed to delete absence. Please try again.')
    }
  }

  const getStaffName = (staffId) => {
    const staffMember = staff.find((s) => s.id === staffId)
    return staffMember ? staffMember.name : 'Unknown Staff'
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (staffLoading || absencesLoading) return <Spinner />

  if (staffError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        Error loading staff: {staffError.message}
      </div>
    )
  }

  if (absencesError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        Error loading absences: {absencesError.message}
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Staff Leave Management</h1>
          <p style={styles.subtitle}>Manage staff absences and time off</p>
        </div>
        <button
          style={styles.addButton}
          onClick={() => setShowForm(!showForm)}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#1d4ed8')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#2563eb')}
        >
          {showForm ? '✕ Cancel' : '+ Add Leave'}
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Add Leave Form */}
        {showForm && (
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>Add New Absence</h2>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Staff Member <span style={styles.required}>*</span>
                  </label>
                  <select
                    style={styles.select}
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    required
                  >
                    <option value="">Select staff member</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Absence Date <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="date"
                    style={styles.input}
                    value={formData.absenceDate}
                    onChange={(e) => setFormData({ ...formData, absenceDate: e.target.value })}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Absence Type <span style={styles.required}>*</span>
                  </label>
                  <select
                    style={styles.select}
                    value={formData.absenceType}
                    onChange={(e) => setFormData({ ...formData, absenceType: e.target.value })}
                    required
                  >
                    {absenceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Notes</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Optional notes"
                  />
                </div>
              </div>

              <div style={styles.buttonGroup}>
                <button
                  type="button"
                  style={styles.cancelButton}
                  onClick={() => setShowForm(false)}
                  onMouseOver={(e) => (e.target.style.backgroundColor = '#d1d5db')}
                  onMouseOut={(e) => (e.target.style.backgroundColor = '#e5e7eb')}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...styles.submitButton,
                    opacity: isSubmitting ? 0.6 : 1,
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  }}
                  disabled={isSubmitting}
                  onMouseOver={(e) => !isSubmitting && (e.target.style.backgroundColor = '#1d4ed8')}
                  onMouseOut={(e) => !isSubmitting && (e.target.style.backgroundColor = '#2563eb')}
                >
                  {isSubmitting ? 'Saving...' : 'Save Absence'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Absences List */}
        <div style={styles.listCard}>
          <div style={styles.listHeader}>
            <h2 style={styles.listTitle}>Staff Absences</h2>
            <p style={styles.listSubtitle}>
              {absences.length} {absences.length === 1 ? 'absence' : 'absences'} recorded
            </p>
          </div>

          {absences.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📅</div>
              <h3 style={styles.emptyTitle}>No absences recorded</h3>
              <p style={styles.emptyText}>Click &#34;Add Leave&#34; to record staff absences</p>
            </div>
          ) : (
            <div>
              {absences.map((absence) => (
                <div key={absence.id} style={styles.absenceItem}>
                  <div style={styles.absenceInfo}>
                    <div style={styles.absenceHeader}>
                      <div style={styles.staffIcon}>👤</div>
                      <div>
                        <div style={styles.staffName}>{getStaffName(absence.staffId)}</div>
                        <div style={styles.absenceDate}>{formatDate(absence.absenceDate)}</div>
                      </div>
                    </div>
                    <div style={styles.absenceDetails}>
                      <span style={styles.typeBadge}>{absence.absenceType}</span>
                      {absence.notes && <div style={styles.absenceNotes}>{absence.notes}</div>}
                    </div>
                  </div>
                  <button
                    style={styles.deleteButton}
                    onClick={() => handleDelete(absence.id)}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#fee2e2'
                      e.target.style.borderColor = '#ef4444'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'transparent'
                      e.target.style.borderColor = '#fecaca'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StaffLeavePage
