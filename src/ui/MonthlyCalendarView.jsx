import React, { useState, useEffect, useMemo } from 'react'
import { styles } from '../styles/RosterStyles'
import { getShiftsForDateRange } from '../services/apiRoster'

// Utility function to create date in local timezone without time conversion issues
const createLocalDate = (year, month, day) => {
  return new Date(year, month, day)
}

// Utility function to format date as YYYY-MM-DD in local timezone
const formatDateLocal = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Utility function to parse YYYY-MM-DD string to local date
const parseLocalDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number)
  return createLocalDate(year, month - 1, day)
}

// Monthly Calendar View Component
const MonthlyCalendarView = ({ staff, onEditShift, onDeleteShift, onCreateShift }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)

  // Calculate calendar boundaries using local dates
  const { calendarStart, calendarEnd, monthStart, monthEnd } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const monthStart = createLocalDate(year, month, 1)
    const monthEnd = createLocalDate(year, month + 1, 0) // Last day of current month

    // Get first Sunday of calendar (may be in previous month)
    const calendarStart = createLocalDate(year, month, 1)
    calendarStart.setDate(1 - calendarStart.getDay())

    // Get last Saturday of calendar (may be in next month)
    const calendarEnd = createLocalDate(year, month + 1, 0)
    calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()))

    return { calendarStart, calendarEnd, monthStart, monthEnd }
  }, [currentDate])

  // Handle clicking outside to close expanded view
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        !event.target.closest('[data-calendar-day]') &&
        !event.target.closest('[data-expanded-shifts]')
      ) {
        setSelectedDate(null)
      }
    }

    if (selectedDate) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedDate])

  // Fetch shifts when date changes
  useEffect(() => {
    fetchShifts()
  }, [currentDate])

  const fetchShifts = async () => {
    try {
      setIsLoading(true)
      const startDate = formatDateLocal(calendarStart)
      const endDate = formatDateLocal(calendarEnd)
      const shiftsData = await getShiftsForDateRange(startDate, endDate)
      setShifts(shiftsData || [])
    } catch (err) {
      console.error('Error fetching shifts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Group shifts by date with proper date handling
  const shiftsByDate = useMemo(() => {
    const grouped = {}

    shifts.forEach((shift) => {
      let dateKey = shift.specificDate || shift.effectiveDate

      if (dateKey) {
        // Ensure consistent YYYY-MM-DD format
        if (dateKey instanceof Date) {
          dateKey = formatDateLocal(dateKey)
        } else if (typeof dateKey === 'string') {
          dateKey = dateKey.split('T')[0] // Remove time part if present
        }

        if (!grouped[dateKey]) {
          grouped[dateKey] = []
        }
        grouped[dateKey].push(shift)
      }
    })

    return grouped
  }, [shifts])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = []
    const current = new Date(calendarStart)

    while (current <= calendarEnd) {
      const dateStr = formatDateLocal(current)
      const isCurrentMonth = current.getMonth() === currentDate.getMonth()
      const today = new Date()
      const isToday = formatDateLocal(current) === formatDateLocal(today)
      const dayShifts = shiftsByDate[dateStr] || []

      days.push({
        date: dateStr,
        dayOfMonth: current.getDate(),
        isCurrentMonth,
        isToday,
        shifts: dayShifts,
        actualDate: new Date(current), // Keep actual date object for display
      })

      current.setDate(current.getDate() + 1)
    }

    return days
  }, [calendarStart, calendarEnd, currentDate, shiftsByDate])

  const goToPreviousMonth = () => {
    setCurrentDate((prev) => createLocalDate(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate((prev) => createLocalDate(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatTime = (timeString) => {
    if (!timeString) return ''
    const [hours, minutes] = timeString.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getStaffName = (staffId) => {
    const staffMember = staff.find((s) => s.id === staffId)
    return staffMember ? staffMember.name : 'Unknown'
  }

  const handleDateClick = (dateStr) => {
    setSelectedDate(selectedDate === dateStr ? null : dateStr)
  }

  const handleCreateShiftForDate = (date) => {
    onCreateShift({ preselectedDate: date })
  }

  const monthName = currentDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div style={styles.calendarContainer}>
      {/* Calendar Header */}
      <div style={styles.calendarHeader}>
        <div style={styles.calendarNavigation}>
          <button onClick={goToPreviousMonth} style={styles.navButton}>
            ← Previous
          </button>
          <h2 style={styles.monthTitle}>{monthName}</h2>
          <button onClick={goToNextMonth} style={styles.navButton}>
            Next →
          </button>
        </div>
        <button onClick={goToToday} style={styles.todayButton}>
          Today
        </button>
      </div>

      {/* Days of Week Header */}
      <div style={styles.daysHeader}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} style={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={styles.calendarGrid}>
        {calendarDays.map(({ date, dayOfMonth, isCurrentMonth, isToday, shifts, actualDate }) => (
          <div
            key={date}
            data-calendar-day={date}
            style={{
              ...styles.calendarDay,
              ...(isCurrentMonth ? {} : styles.otherMonthDay),
              ...(isToday ? styles.todayDay : {}),
              ...(selectedDate === date ? styles.selectedDay : {}),
            }}
            onClick={() => handleDateClick(date)}
          >
            <div style={styles.dayNumber}>{dayOfMonth}</div>

            {/* Add Shift Button for Current Month Days */}
            {isCurrentMonth && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleCreateShiftForDate(date)
                }}
                style={styles.addShiftButton}
                title="Add shift for this date"
              >
                +
              </button>
            )}

            {/* Shifts for this day */}
            <div style={styles.dayShifts}>
              {shifts.slice(0, 3).map((shift, index) => (
                <div
                  key={shift.id || `${shift.staffId}-${index}`}
                  style={{
                    ...styles.shiftItem,
                    ...(shift.isRecurring ? styles.recurringShift : styles.specificShift),
                  }}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!shift.isRecurring) {
                      onEditShift(shift)
                    }
                  }}
                  title={`${getStaffName(shift.staffId)}: ${formatTime(
                    shift.startTime
                  )} - ${formatTime(shift.endTime)}${shift.isRecurring ? ' (Recurring)' : ''}`}
                >
                  <div style={styles.shiftStaff}>{getStaffName(shift.staffId).split(' ')[0]}</div>
                  <div style={styles.shiftTime}>{formatTime(shift.startTime)}</div>
                  {shift.isRecurring && <div style={styles.recurringIndicator}>🔄</div>}
                </div>
              ))}

              {shifts.length > 3 && <div style={styles.moreShifts}>+{shifts.length - 3} more</div>}
            </div>

            {/* Expanded view for selected date */}
            {selectedDate === date && shifts.length > 0 && (
              <div
                style={styles.expandedShifts}
                data-expanded-shifts="true"
                onClick={(e) => e.stopPropagation()}
              >
                <div style={styles.expandedHeader}>
                  <strong>
                    {actualDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </strong>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedDate(null)
                    }}
                    style={styles.closeButton}
                    title="Close"
                  >
                    ×
                  </button>
                </div>
                {shifts.map((shift, index) => (
                  <div
                    key={shift.id || `${shift.staffId}-${index}`}
                    style={styles.expandedShiftItem}
                  >
                    <div style={styles.expandedShiftInfo}>
                      <span style={styles.expandedStaffName}>{getStaffName(shift.staffId)}</span>
                      <span style={styles.expandedShiftTime}>
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </span>
                      {shift.isRecurring && <span style={styles.recurringLabel}>Recurring</span>}
                    </div>
                    {!shift.isRecurring && (
                      <div style={styles.expandedShiftActions}>
                        <button onClick={() => onEditShift(shift)} style={styles.miniEditButton}>
                          ✏️
                        </button>
                        <button
                          onClick={() => onDeleteShift(shift)}
                          style={styles.miniDeleteButton}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {isLoading && <div style={styles.calendarLoading}>Loading shifts...</div>}
    </div>
  )
}

export default MonthlyCalendarView
