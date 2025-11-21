import React, { useState, useEffect, useMemo } from 'react'
import Spinner from '../ui/Spinner'
import { modalStyles, styles } from '../styles/RosterStyles'
import { getStaff } from '../services/apiStaff'

import { deleteStaffShift, getRecurringShifts, getSpecificDateShifts } from '../services/apiRoster'
import EnhancedShiftModal from '../ui/EnhancedShiftModal'
import MonthlyCalendarView from '../ui/MonthlyCalendarView'

// Custom hook to fetch staff
const useStaff = () => {
  const [staff, setStaff] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        setIsLoading(true)
        const data = await getStaff()
        setStaff(data || [])
        setError(null)
      } catch (err) {
        console.error('Error fetching staff:', err)
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

// Custom hook to fetch staff shifts based on view mode
const useStaffShifts = (viewMode, filters = {}) => {
  const [shifts, setShifts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchShifts = async () => {
    try {
      setIsLoading(true)
      let data = []

      switch (viewMode) {
        case 'recurring': {
          data = await getRecurringShifts(filters.staffId || null)
          break
        }
        case 'specific': {
          const today = new Date()
          const nextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0)
          data = await getSpecificDateShifts(
            today.toISOString().split('T')[0],
            nextMonth.toISOString().split('T')[0],
            filters.staffId || null
          )
          break
        }
        case 'calendar': {
          // Calendar view handles its own data fetching
          data = []
          break
        }
        default: {
          // Combined view - get both types
          const recurringData = await getRecurringShifts(filters.staffId || null)
          const specificData = await getSpecificDateShifts(null, null, filters.staffId || null)
          data = [...recurringData, ...specificData]
          break
        }
      }

      setShifts(data || [])
      setError(null)
    } catch (err) {
      console.error('Error fetching shifts:', err)
      setError(err)
      setShifts([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (viewMode !== 'calendar') {
      fetchShifts()
    }
  }, [viewMode, JSON.stringify(filters)])

  return { shifts, isLoading, error, refetch: fetchShifts }
}

// Constants for days of week
const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'Sun' },
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
]

// Utility functions
const formatTime = (timeString) => {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

const getDayName = (dayNumber) => {
  const day = DAYS_OF_WEEK.find((d) => d.value === dayNumber)
  return day ? day.label : 'Unknown'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  return new Date(dateString).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const getShiftDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return 'N/A'

  const [startHours, startMinutes] = startTime.split(':').map(Number)
  const [endHours, endMinutes] = endTime.split(':').map(Number)

  let totalMinutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes)

  // Handle overnight shifts
  if (totalMinutes < 0) {
    totalMinutes += 24 * 60
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours}h ${minutes}m`
}

// Weekly Calendar View Component (for recurring shifts)
const WeeklyRecurringView = ({ shifts, staff, onEditShift, onDeleteShift }) => {
  const groupedShifts = useMemo(() => {
    const grouped = {}
    DAYS_OF_WEEK.forEach((day) => {
      grouped[day.value] = shifts
        .filter((shift) => shift.dayOfWeek === day.value)
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
    })
    return grouped
  }, [shifts])

  const getStaffName = (staffId) => {
    const staffMember = staff.find((s) => s.id === staffId)
    return staffMember ? staffMember.name : 'Unknown Staff'
  }

  return (
    <div style={styles.calendarContainer}>
      <div style={styles.calendarGrid}>
        {DAYS_OF_WEEK.map((day) => (
          <div key={day.value} style={styles.dayColumn}>
            <div style={styles.dayHeader}>
              <h3 style={styles.dayTitle}>{day.label}</h3>
              <span style={styles.dayShiftCount}>
                {groupedShifts[day.value]?.length || 0} recurring shift
                {groupedShifts[day.value]?.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={styles.shiftsContainer}>
              {groupedShifts[day.value]?.length === 0 ? (
                <div style={styles.noShifts}>No recurring shifts</div>
              ) : (
                groupedShifts[day.value]?.map((shift) => (
                  <div key={shift.id} style={styles.shiftCard}>
                    <div style={styles.shiftHeader}>
                      <span style={styles.staffName}>{getStaffName(shift.staffId)}</span>
                      <div style={styles.shiftActions}>
                        <button
                          onClick={() => onEditShift(shift)}
                          style={styles.editButton}
                          title="Edit shift"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => onDeleteShift(shift)}
                          style={styles.deleteButton}
                          title="Delete shift"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div style={styles.shiftTime}>
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </div>
                    <div style={styles.shiftDuration}>
                      {getShiftDuration(shift.startTime, shift.endTime)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Staff Summary Component
const StaffSummary = ({ shifts, staff, viewMode }) => {
  const staffSummary = useMemo(() => {
    const summary = {}

    staff.forEach((member) => {
      const memberShifts = shifts.filter((shift) => shift.staffId === member.id)
      let totalHours = 0

      memberShifts.forEach((shift) => {
        if (shift.startTime && shift.endTime) {
          const [startHours, startMinutes] = shift.startTime.split(':').map(Number)
          const [endHours, endMinutes] = shift.endTime.split(':').map(Number)

          let shiftMinutes = endHours * 60 + endMinutes - (startHours * 60 + startMinutes)
          if (shiftMinutes < 0) shiftMinutes += 24 * 60 // Handle overnight shifts

          totalHours += shiftMinutes / 60
        }
      })

      summary[member.id] = {
        name: member.name,
        shiftCount: memberShifts.length,
        totalHours: totalHours,
        shifts: memberShifts,
      }
    })

    return summary
  }, [shifts, staff])

  const getSummaryTitle = () => {
    switch (viewMode) {
      case 'recurring':
        return 'Weekly Recurring Schedule'
      case 'specific':
        return 'Upcoming Extra Shifts'
      case 'calendar':
        return 'Staff Overview'
      default:
        return 'Combined Staff Summary'
    }
  }

  return (
    <div style={styles.summaryContainer}>
      <h3 style={styles.summaryTitle}>{getSummaryTitle()}</h3>
      <div style={styles.summaryGrid}>
        {Object.values(staffSummary).map((summary) => (
          <div key={summary.name} style={styles.summaryCard}>
            <div style={styles.summaryHeader}>
              <span style={styles.summaryStaffName}>{summary.name}</span>
            </div>
            <div style={styles.summaryStats}>
              <div style={styles.summaryStatsItem}>
                <span style={styles.summaryLabel}>Shifts:</span>
                <span style={styles.summaryValue}>{summary.shiftCount}</span>
              </div>
              <div style={styles.summaryStatsItem}>
                <span style={styles.summaryLabel}>
                  {viewMode === 'recurring' ? 'Weekly Hours:' : 'Hours:'}
                </span>
                <span style={styles.summaryValue}>{summary.totalHours.toFixed(1)}h</span>
              </div>
            </div>
            <div style={styles.summaryDays}>
              {summary.shifts.slice(0, 7).map((shift, index) => (
                <span key={shift.id || index} style={styles.summaryDay}>
                  {shift.dayOfWeek !== null
                    ? DAYS_OF_WEEK.find((d) => d.value === shift.dayOfWeek)?.short
                    : new Date(shift.specificDate).getDate()}
                </span>
              ))}
              {summary.shifts.length > 7 && (
                <span style={styles.summaryDay}>+{summary.shifts.length - 7}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main Enhanced Roster Page Component
const EnhancedRosterPage = () => {
  const [filters, setFilters] = useState({
    staffId: '',
    dayOfWeek: '',
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState(null)
  const [viewMode, setViewMode] = useState('calendar') // 'calendar', 'recurring', 'specific', 'list'
  const [modalPreselectedDate, setModalPreselectedDate] = useState(null)

  const { staff, isLoading: staffLoading } = useStaff()
  const { shifts, isLoading: shiftsLoading, refetch } = useStaffShifts(viewMode, filters)
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0)

  const handleEditShift = (shift) => {
    setSelectedShift(shift)
    setModalPreselectedDate(null)
    setIsModalOpen(true)
  }

  const handleCreateShift = (options = {}) => {
    setSelectedShift(null)
    setModalPreselectedDate(options.preselectedDate || null)
    setIsModalOpen(true)
  }

  const handleDeleteShift = async (shift) => {
    const staffName = staff.find((s) => s.id === shift.staffId)?.name || 'Unknown'
    const shiftDescription =
      shift.dayOfWeek !== null
        ? `recurring ${getDayName(shift.dayOfWeek)} shift`
        : `shift on ${formatDate(shift.specificDate)}`

    if (
      !window.confirm(
        `Are you sure you want to delete ${staffName}'s ${shiftDescription} from ${formatTime(
          shift.startTime
        )} to ${formatTime(shift.endTime)}?`
      )
    ) {
      return
    }

    try {
      await deleteStaffShift(shift.id)
      refetch()

      // Force calendar refresh
      setCalendarRefreshKey((prev) => prev + 1)
    } catch (err) {
      console.error('Error deleting shift:', err)
      alert('Failed to delete shift')
    }
  }

  const handleModalSuccess = () => {
    refetch()
    // Force calendar refresh by updating the key
    setCalendarRefreshKey((prev) => prev + 1)
  }

  const getViewModeTitle = () => {
    switch (viewMode) {
      case 'calendar':
        return 'Monthly Calendar'
      case 'recurring':
        return 'Recurring Weekly Schedule'
      case 'specific':
        return 'Specific Date Shifts'
      case 'list':
        return 'All Shifts'
      default:
        return 'Staff Roster'
    }
  }

  if (staffLoading) {
    return <Spinner />
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>Staff Roster - {getViewModeTitle()}</h1>
        <div style={styles.headerActions}>
          <div style={styles.viewToggle}>
            <button
              onClick={() => setViewMode('calendar')}
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'calendar' ? styles.toggleButtonActive : {}),
              }}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setViewMode('recurring')}
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'recurring' ? styles.toggleButtonActive : {}),
              }}
            >
              🔄 Recurring
            </button>
            <button
              onClick={() => setViewMode('specific')}
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'specific' ? styles.toggleButtonActive : {}),
              }}
            >
              📋 Extra
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                ...styles.toggleButton,
                ...(viewMode === 'list' ? styles.toggleButtonActive : {}),
              }}
            >
              📋 List
            </button>
          </div>
          <button onClick={() => handleCreateShift()} style={styles.primaryButton}>
            + Add Shift
          </button>
        </div>
      </div>

      {/* Filters - only show for non-calendar views */}
      {viewMode !== 'calendar' && (
        <div style={styles.filterBar}>
          <select
            value={filters.staffId}
            onChange={(e) => setFilters({ ...filters, staffId: e.target.value })}
            style={styles.select}
          >
            <option value="">All Staff</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {viewMode === 'recurring' && (
            <select
              value={filters.dayOfWeek}
              onChange={(e) => setFilters({ ...filters, dayOfWeek: e.target.value })}
              style={styles.select}
            >
              <option value="">All Days</option>
              {DAYS_OF_WEEK.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Staff Summary - only show for non-calendar views */}
      {viewMode !== 'calendar' && (
        <StaffSummary shifts={shifts} staff={staff} viewMode={viewMode} />
      )}

      {/* Main Content */}
      {viewMode === 'calendar' ? (
        <MonthlyCalendarView
          key={calendarRefreshKey}
          staff={staff}
          onEditShift={handleEditShift}
          onDeleteShift={handleDeleteShift}
          onCreateShift={handleCreateShift}
        />
      ) : viewMode === 'recurring' ? (
        <WeeklyRecurringView
          shifts={shifts}
          staff={staff}
          onEditShift={handleEditShift}
          onDeleteShift={handleDeleteShift}
        />
      ) : (
        // List View for specific shifts or combined view
        <div style={styles.listContainer}>
          {shiftsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spinner />
            </div>
          ) : shifts.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>📅</div>
              <div style={styles.emptyStateTitle}>No shifts found</div>
              <div style={styles.emptyStateText}>
                {filters.staffId || filters.dayOfWeek
                  ? 'Try adjusting your filters'
                  : `Create your first ${
                      viewMode === 'specific' ? 'specific date' : ''
                    } shift to get started`}
              </div>
            </div>
          ) : (
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Staff Member</th>
                  <th style={styles.tableHeaderCell}>
                    {viewMode === 'specific' ? 'Date' : 'Day/Date'}
                  </th>
                  <th style={styles.tableHeaderCell}>Start Time</th>
                  <th style={styles.tableHeaderCell}>End Time</th>
                  <th style={styles.tableHeaderCell}>Duration</th>
                  <th style={styles.tableHeaderCell}>Type</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => (
                  <tr key={shift.id} style={styles.tableRow}>
                    <td style={styles.tableCell}>
                      {staff.find((s) => s.id === shift.staffId)?.name || 'Unknown'}
                    </td>
                    <td style={styles.tableCell}>
                      {shift.dayOfWeek !== null
                        ? getDayName(shift.dayOfWeek)
                        : formatDate(shift.specificDate)}
                    </td>
                    <td style={styles.tableCell}>{formatTime(shift.startTime)}</td>
                    <td style={styles.tableCell}>{formatTime(shift.endTime)}</td>
                    <td style={styles.tableCell}>
                      {getShiftDuration(shift.startTime, shift.endTime)}
                    </td>
                    <td style={styles.tableCell}>
                      <span
                        style={{
                          ...styles.badge,
                          ...(shift.dayOfWeek !== null
                            ? styles.badgeRecurring
                            : styles.badgeSpecific),
                        }}
                      >
                        {shift.dayOfWeek !== null ? 'Recurring' : 'Specific'}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actionButtons}>
                        <button
                          onClick={() => handleEditShift(shift)}
                          style={{
                            ...styles.iconButton,
                            backgroundColor: '#dbeafe',
                            color: '#1d4ed8',
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteShift(shift)}
                          style={{
                            ...styles.iconButton,
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Enhanced Modal */}
      <EnhancedShiftModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedShift(null)
          setModalPreselectedDate(null)
        }}
        shift={selectedShift}
        staff={staff}
        onSuccess={handleModalSuccess}
        preselectedDate={modalPreselectedDate}
      />
    </div>
  )
}

export default EnhancedRosterPage
