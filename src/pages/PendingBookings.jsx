import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../services/supabase'

const PendingBookings = () => {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedBookings, setSelectedBookings] = useState(new Set())
  const [filter, setFilter] = useState('all') // 'all', 'today', 'upcoming'

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    setLoading(true)
    try {
      // First, get all pending bookings
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'pending')
        .order('startTime', { ascending: true })

      if (bookingsError) throw bookingsError

      // Then fetch related data for each booking
      const enrichedBookings = await Promise.all(
        (bookingsData || []).map(async (booking) => {
          let client = null
          let staff = null
          let services = []

          // Fetch client if clientId exists
          if (booking.clientId) {
            const { data: clientData } = await supabase
              .from('clients')
              .select('*')
              .eq('id', booking.clientId)
              .single()
            client = clientData
          }

          // Fetch staff if staffId exists
          if (booking.staffId) {
            const { data: staffData } = await supabase
              .from('staff')
              .select('*')
              .eq('id', booking.staffId)
              .single()
            staff = staffData
          }

          // Fetch services based on serviceIds
          if (booking.serviceIds) {
            try {
              const serviceIdsArray = Array.isArray(booking.serviceIds)
                ? booking.serviceIds
                : JSON.parse(booking.serviceIds)

              const { data: servicesData } = await supabase
                .from('services')
                .select('*')
                .in('id', serviceIdsArray)

              services = servicesData || []
            } catch (e) {
              console.error('Error parsing serviceIds:', e)
            }
          }

          return {
            ...booking,
            client,
            staff,
            services,
          }
        })
      )

      setBookings(enrichedBookings)
    } catch (error) {
      console.error('Error loading bookings:', error)
      alert('Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isToday = (dateString) => {
    const today = new Date()
    const bookingDate = new Date(dateString)
    return today.toDateString() === bookingDate.toDateString()
  }

  const confirmBooking = async (bookingId) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId)

      if (error) throw error

      // Remove from list
      setBookings((prev) => prev.filter((b) => b.id !== bookingId))
      alert('✓ Booking confirmed successfully!')
    } catch (error) {
      console.error('Error confirming booking:', error)
      alert('❌ Failed to confirm booking')
    }
  }

  const confirmMultiple = async () => {
    if (selectedBookings.size === 0) {
      alert('Please select at least one booking')
      return
    }

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'confirmed' })
        .in('id', Array.from(selectedBookings))

      if (error) throw error

      setBookings((prev) => prev.filter((b) => !selectedBookings.has(b.id)))
      setSelectedBookings(new Set())
      alert(`✓ ${selectedBookings.size} booking(s) confirmed successfully!`)
    } catch (error) {
      console.error('Error confirming bookings:', error)
      alert('❌ Failed to confirm bookings')
    }
  }

  const cancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      setBookings((prev) => prev.filter((b) => b.id !== bookingId))
      alert('✓ Booking cancelled')
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('❌ Failed to cancel booking')
    }
  }

  const toggleSelection = (bookingId) => {
    setSelectedBookings((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId)
      } else {
        newSet.add(bookingId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    if (selectedBookings.size === filteredBookings.length) {
      setSelectedBookings(new Set())
    } else {
      setSelectedBookings(new Set(filteredBookings.map((b) => b.id)))
    }
  }

  const filteredBookings = bookings.filter((booking) => {
    if (filter === 'today') return isToday(booking.startTime)
    if (filter === 'upcoming') {
      const bookingDate = new Date(booking.startTime)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      return bookingDate > today
    }
    return true
  })

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading pending bookings...</div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>⏳ Pending Bookings</h1>
          <p style={styles.subtitle}>
            {filteredBookings.length} booking(s) waiting for confirmation
          </p>
        </div>
        <button
          onClick={() => navigate('/bookings')}
          style={styles.backButton}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#f3f4f6')}
          onMouseOut={(e) => (e.target.style.backgroundColor = 'white')}
        >
          ← Back to Bookings
        </button>
      </div>

      {/* Filter Bar */}
      <div style={styles.filterBar}>
        <div style={styles.filterButtons}>
          <button
            onClick={() => setFilter('all')}
            style={{
              ...styles.filterButton,
              ...(filter === 'all' ? styles.filterButtonActive : {}),
            }}
            onMouseOver={(e) => {
              if (filter !== 'all') e.target.style.backgroundColor = '#f3f4f6'
            }}
            onMouseOut={(e) => {
              if (filter !== 'all') e.target.style.backgroundColor = 'white'
            }}
          >
            All ({bookings.length})
          </button>
          <button
            onClick={() => setFilter('today')}
            style={{
              ...styles.filterButton,
              ...(filter === 'today' ? styles.filterButtonActive : {}),
            }}
            onMouseOver={(e) => {
              if (filter !== 'today') e.target.style.backgroundColor = '#f3f4f6'
            }}
            onMouseOut={(e) => {
              if (filter !== 'today') e.target.style.backgroundColor = 'white'
            }}
          >
            Today ({bookings.filter((b) => isToday(b.startTime)).length})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            style={{
              ...styles.filterButton,
              ...(filter === 'upcoming' ? styles.filterButtonActive : {}),
            }}
            onMouseOver={(e) => {
              if (filter !== 'upcoming') e.target.style.backgroundColor = '#f3f4f6'
            }}
            onMouseOut={(e) => {
              if (filter !== 'upcoming') e.target.style.backgroundColor = 'white'
            }}
          >
            Upcoming ({bookings.filter((b) => new Date(b.startTime) > new Date()).length})
          </button>
        </div>

        {selectedBookings.size > 0 && (
          <div style={styles.bulkActions}>
            <span style={styles.selectedCount}>{selectedBookings.size} selected</span>
            <button
              onClick={confirmMultiple}
              style={styles.confirmMultipleButton}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#059669')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#10b981')}
            >
              ✓ Confirm Selected
            </button>
          </div>
        )}
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📋</div>
          <h3 style={styles.emptyTitle}>No pending bookings</h3>
          <p style={styles.emptyText}>
            All bookings have been confirmed or there are no bookings yet.
          </p>
        </div>
      ) : (
        <>
          {/* Select All */}
          <div style={styles.selectAllBar}>
            <label style={styles.selectAllLabel}>
              <input
                type="checkbox"
                checked={selectedBookings.size === filteredBookings.length}
                onChange={selectAll}
                style={styles.checkbox}
              />
              Select All
            </label>
          </div>

          <div style={styles.bookingsList}>
            {filteredBookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  ...styles.bookingCard,
                  ...(selectedBookings.has(booking.id) ? styles.bookingCardSelected : {}),
                }}
              >
                <div style={styles.bookingHeader}>
                  <input
                    type="checkbox"
                    checked={selectedBookings.has(booking.id)}
                    onChange={() => toggleSelection(booking.id)}
                    style={styles.checkbox}
                  />
                  <div style={styles.bookingTime}>
                    {isToday(booking.startTime) && <span style={styles.todayBadge}>TODAY</span>}
                    <span style={styles.dateTime}>{formatDateTime(booking.startTime)}</span>
                  </div>
                  <div style={styles.actions}>
                    <button
                      onClick={() => confirmBooking(booking.id)}
                      style={styles.confirmButton}
                      onMouseOver={(e) => (e.target.style.backgroundColor = '#059669')}
                      onMouseOut={(e) => (e.target.style.backgroundColor = '#10b981')}
                    >
                      ✓ Confirm
                    </button>
                    <button
                      onClick={() => cancelBooking(booking.id)}
                      style={styles.cancelButton}
                      onMouseOver={(e) => (e.target.style.backgroundColor = '#dc2626')}
                      onMouseOut={(e) => (e.target.style.backgroundColor = '#ef4444')}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>

                <div style={styles.bookingBody}>
                  <div style={styles.infoGrid}>
                    <div style={styles.infoItem}>
                      <span style={styles.label}>👤 Client:</span>
                      <span style={styles.value}>
                        {booking.client?.fullName || booking.name || 'Walk-in'}
                      </span>
                    </div>

                    <div style={styles.infoItem}>
                      <span style={styles.label}>📞 Phone:</span>
                      <span style={styles.value}>
                        {booking.client?.phone || booking.phone || 'N/A'}
                      </span>
                    </div>

                    <div style={styles.infoItem}>
                      <span style={styles.label}>💅 Services:</span>
                      <span style={styles.value}>
                        {Array.isArray(booking.services)
                          ? booking.services.map((s) => s.name).join(', ')
                          : booking.services?.name || 'N/A'}
                      </span>
                    </div>

                    <div style={styles.infoItem}>
                      <span style={styles.label}>👨‍💼 Staff:</span>
                      <span style={styles.value}>{booking.staff?.name || 'Not assigned'}</span>
                    </div>

                    <div style={styles.infoItem}>
                      <span style={styles.label}>⏰ Time:</span>
                      <span style={styles.value}>
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </span>
                    </div>

                    <div style={styles.infoItem}>
                      <span style={styles.label}>💰 Price:</span>
                      <span style={styles.value}>${booking.totalPrice}</span>
                    </div>

                    {booking.numClients > 1 && (
                      <div style={styles.infoItem}>
                        <span style={styles.label}>👥 Clients:</span>
                        <span style={styles.value}>{booking.numClients}</span>
                      </div>
                    )}

                    {booking.notes && (
                      <div style={{ ...styles.infoItem, gridColumn: '1 / -1' }}>
                        <span style={styles.label}>📝 Notes:</span>
                        <span style={styles.value}>{booking.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    minWidth: '700px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  backButton: {
    padding: '10px 20px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    transition: 'background-color 0.2s',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
  },
  filterButton: {
    padding: '8px 16px',
    backgroundColor: 'white',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    transition: 'all 0.2s',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    color: 'white',
    borderColor: '#2563eb',
  },
  bulkActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  selectedCount: {
    fontSize: '14px',
    color: '#666',
    fontWeight: '500',
  },
  confirmMultipleButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  selectAllBar: {
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  selectAllLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    cursor: 'pointer',
  },
  bookingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '2px solid transparent',
    transition: 'all 0.2s',
    minWidth: '600px',
  },
  bookingCardSelected: {
    borderColor: '#2563eb',
    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.1)',
  },
  bookingHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e7eb',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  bookingTime: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: '16px',
  },
  todayBadge: {
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
  },
  dateTime: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  confirmButton: {
    padding: '8px 16px',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  bookingBody: {
    padding: '0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    color: '#666',
    fontWeight: '500',
  },
  value: {
    fontSize: '14px',
    color: '#1a1a1a',
    fontWeight: '500',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    fontSize: '16px',
    color: '#666',
  },
  emptyState: {
    textAlign: 'center',
    padding: '64px 24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#666',
  },
}

export default PendingBookings
