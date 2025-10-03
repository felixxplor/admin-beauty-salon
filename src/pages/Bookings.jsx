import React, { useState, useMemo } from 'react'
import { getStaff } from '../services/apiStaff'
import { getServices } from '../services/apiServices'
import { useBookings } from '../features/bookings/useBookings'
import Spinner from '../ui/Spinner'
import Empty from '../ui/Empty'
import { calendarStyles } from '../styles/CalendarStyles'
import { createBooking } from '../services/apiBookings'
import { getClient } from '../services/apiClients'
import { useNavigate, useSearchParams } from 'react-router-dom'
import supabase from '../services/supabase'
import { useEffect } from 'react'

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

// Custom hook to use the getClient function
const useClients = () => {
  const [clients, setClients] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    const fetchClients = async () => {
      try {
        setIsLoading(true)
        const clientsData = await getClient()
        setClients(clientsData || [])
      } catch (err) {
        console.error('Error loading clients:', err)
        setError(err)
        setClients([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchClients()
  }, [])

  return { clients, isLoading, error }
}

// Custom hook to fetch staff shifts
const useStaffShifts = () => {
  const [staffShifts, setStaffShifts] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  React.useEffect(() => {
    const fetchStaffShifts = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await supabase
          .from('staff_shifts')
          .select('*')
          .order('dayOfWeek', { ascending: true })

        if (error) throw error
        setStaffShifts(data || [])
      } catch (err) {
        console.error('Error loading staff shifts:', err)
        setError(err)
        setStaffShifts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchStaffShifts()
  }, [])

  return { staffShifts, isLoading, error }
}

const timeSlots = [
  '09:00',
  '09:15',
  '09:30',
  '09:45',
  '10:00',
  '10:15',
  '10:30',
  '10:45',
  '11:00',
  '11:15',
  '11:30',
  '11:45',
  '12:00',
  '12:15',
  '12:30',
  '12:45',
  '13:00',
  '13:15',
  '13:30',
  '13:45',
  '14:00',
  '14:15',
  '14:30',
  '14:45',
  '15:00',
  '15:15',
  '15:30',
  '15:45',
  '16:00',
  '16:15',
  '16:30',
  '16:45',
  '17:00',
  '17:15',
  '17:30',
  '17:45',
  '18:00',
  '18:15',
  '18:30',
  '18:45',
  '19:00',
]

// Helper function to get staff working on a specific day
const getStaffWorkingOnDay = (date, staff, staffShifts) => {
  if (!date || !staff || !staffShifts || staffShifts.length === 0) return staff

  const dayOfWeek = new Date(date).getDay() // 0 = Sunday, 1 = Monday, etc.

  // Get staff IDs that have shifts on this day
  const workingStaffIds = staffShifts
    .filter((shift) => shift.dayOfWeek === dayOfWeek)
    .map((shift) => shift.staffId)

  // Return only staff members who are working on this day
  const workingStaff = staff.filter((s) => workingStaffIds.includes(s.id))

  // If no staff found (maybe shifts not set up yet), return all staff
  return workingStaff.length > 0 ? workingStaff : staff
}

// Helper function to create a local date-time without timezone conversion
const createLocalDateTime = (dateString, timeString) => {
  // Parse the date string (YYYY-MM-DD)
  const [year, month, day] = dateString.split('-').map(Number)
  // Parse the time string (HH:MM)
  const [hours, minutes] = timeString.split(':').map(Number)

  // Create a new Date object with local time components
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0)

  return localDate
}

// Helper function to format date for database (keeping local time)
const formatDateForDatabase = (date) => {
  // Format as ISO string but keep local time
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  // Return in local time format that preserves the actual time
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

const BookingCalendar = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [view, setView] = useState('calendar') // 'calendar' or 'day'
  const [hoveredDay, setHoveredDay] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')
  const [createFormData, setCreateFormData] = useState({
    clientId: '',
    name: '',
    phone: '',
    selectedServiceIds: [],
    startTime: '',
    staffId: '',
    numClients: 1,
    notes: '',
    status: 'pending',
  })

  useEffect(() => {
    const dateParam = searchParams.get('date')
    const viewParam = searchParams.get('view')

    if (dateParam && viewParam === 'day') {
      setSelectedDate(dateParam)
      setView('day')
      // Clean up URL params after applying them
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  const { bookings, isLoading, refetch } = useBookings()
  const { staff, isLoading: staffLoading, error: staffError } = useStaff()
  const { services, isLoading: servicesLoading, error: servicesError } = useServices()
  const { clients, isLoading: clientsLoading, error: clientsError } = useClients()
  const { staffShifts, isLoading: staffShiftsLoading, error: staffShiftsError } = useStaffShifts()

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

  // Calculate total duration and price based on selected services - UPDATED TO HANDLE "+" SUFFIX
  // Calculate total duration and price based on selected services - FIXED FOR TEXT FORMAT
  // Calculate total duration and price based on selected services - ROBUST FIX
  const selectedServicesInfo = useMemo(() => {
    if (!services || createFormData.selectedServiceIds.length === 0) {
      return { totalDuration: 0, totalPrice: '0', serviceNames: [] }
    }

    const selectedServices = services.filter((service) =>
      createFormData.selectedServiceIds.includes(service.id.toString())
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

    return { totalDuration, totalPrice, serviceNames, selectedServices }
  }, [services, createFormData.selectedServiceIds])

  // Calculate end time based on start time and total duration
  const calculateEndTime = (startTime, durationInMinutes) => {
    if (!startTime || !durationInMinutes) return ''

    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    const endDate = new Date(startDate.getTime() + durationInMinutes * 60000)
    return endDate.toTimeString().slice(0, 5)
  }

  // Transform your booking data to include date and time information
  const transformedBookings = useMemo(() => {
    // Wait for both bookings and staff data to be loaded before transforming
    if (!bookings || bookings.length === 0 || staff.length === 0) return []

    return bookings.map((booking) => {
      // Handle both ISO string and Date object formats, with null checks
      let startTime, endTime

      // Handle startTime - FIXED to avoid timezone conversion issues
      if (booking.startTime) {
        if (typeof booking.startTime === 'string') {
          // If it's a string, parse it carefully to avoid timezone issues
          startTime = new Date(booking.startTime)
        } else {
          startTime = booking.startTime
        }
      } else {
        // If no startTime, create a default date
        startTime = new Date()
      }

      // Handle endTime with null check
      if (booking.endTime) {
        if (typeof booking.endTime === 'string') {
          endTime = new Date(booking.endTime)
        } else {
          endTime = booking.endTime
        }
      } else {
        // If no endTime, calculate from startTime + 60 minutes as default
        endTime = new Date(startTime.getTime() + 60 * 60000)
      }

      // Validate that dates are valid
      if (isNaN(startTime.getTime())) {
        console.warn('Invalid startTime for booking:', booking.id, booking.startTime)
        startTime = new Date()
      }

      if (isNaN(endTime.getTime())) {
        console.warn('Invalid endTime for booking:', booking.id, booking.endTime)
        endTime = new Date(startTime.getTime() + 60 * 60000)
      }

      // FIXED: Extract time in local timezone to avoid conversion issues
      // Get local time components to avoid timezone conversion
      const localStartHours = startTime.getHours()
      const localStartMinutes = startTime.getMinutes()
      const localEndHours = endTime.getHours()
      const localEndMinutes = endTime.getMinutes()

      const formatTime = (hours, minutes) => {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      }

      // Properly resolve staff member from staffId
      let staffMember = 'Any'
      if (booking.staffId && staff.length > 0) {
        const foundStaff = staff.find((s) => s.id === booking.staffId)
        if (foundStaff) {
          staffMember = foundStaff.name || foundStaff.id
        }
        // If staffId exists but no matching staff found, default to 'Any'
      }
      // If no staffId specified, it defaults to 'Any'

      // Handle multiple services display
      let serviceDisplay = 'Service'
      if (Array.isArray(booking.services)) {
        // Multiple services returned from the query
        serviceDisplay = booking.services.map((s) => s.name).join(', ')
      } else if (booking.services?.name) {
        // Single service object
        serviceDisplay = booking.services.name
      } else if (booking.serviceIds) {
        // If we have serviceIds array but no services data, we'll need to fetch service names
        // For now, show a generic message indicating multiple services
        try {
          const serviceIdsArray = Array.isArray(booking.serviceIds)
            ? booking.serviceIds
            : JSON.parse(booking.serviceIds)
          serviceDisplay =
            serviceIdsArray.length > 1 ? `${serviceIdsArray.length} Services` : 'Service'
        } catch (e) {
          serviceDisplay = 'Service'
        }
      }

      const transformedBooking = {
        id: booking.id,
        originalBooking: booking, // Keep reference to original booking data
        service: serviceDisplay,
        client: booking.client?.fullName || booking.client?.email || booking.name || booking.phone,
        date: booking.date || startTime.toISOString().split('T')[0],
        time: formatTime(localStartHours, localStartMinutes), // Use local time
        endTime: formatTime(localEndHours, localEndMinutes), // Use local time
        staff: staffMember,
        staffId: booking.staffId, // Keep the original staffId for reference
        status: booking.status || 'pending',
        amount: booking.totalPrice || 0,
        numClients: booking.numClients || 1,
        duration: Math.round((endTime - startTime) / (1000 * 60)),
        created_at: booking.created_at,
      }

      return transformedBooking
    })
  }, [bookings, staff])

  // Get bookings grouped by date
  const bookingsByDate = useMemo(() => {
    const grouped = transformedBookings.reduce((acc, booking) => {
      const date = booking.date
      if (!acc[date]) acc[date] = []
      acc[date].push(booking)
      return acc
    }, {})

    return grouped
  }, [transformedBookings])

  // Filter bookings for current month
  const currentMonthBookings = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    return transformedBookings.filter((booking) => {
      const bookingDate = new Date(booking.date)
      return bookingDate.getFullYear() === year && bookingDate.getMonth() === month
    })
  }, [transformedBookings, currentDate])

  const handleServiceSelection = (serviceId) => {
    setCreateFormData((prev) => ({
      ...prev,
      selectedServiceIds: prev.selectedServiceIds.includes(serviceId)
        ? prev.selectedServiceIds.filter((id) => id !== serviceId)
        : [...prev.selectedServiceIds, serviceId],
    }))
  }

  // Handler for when client is selected from dropdown
  const handleClientSelection = (clientId) => {
    if (clientId) {
      // Clear name and phone when client is selected
      setCreateFormData((prev) => ({
        ...prev,
        clientId: clientId,
        name: '',
        phone: '',
      }))
    } else {
      setCreateFormData((prev) => ({
        ...prev,
        clientId: '',
      }))
    }
  }

  // Handler for when name or phone is entered
  const handleNameOrPhoneChange = (field, value) => {
    setCreateFormData((prev) => ({
      ...prev,
      [field]: value,
      // Clear client selection if name or phone is being entered
      clientId: value.trim() ? '' : prev.clientId,
    }))
  }

  const handleBookingClick = (booking) => {
    navigate(`/bookings/${booking.id}?returnDate=${selectedDate}`)
  }

  // Function to close modal and reset
  const closeModal = () => {
    setShowCreateModal(false)
    setServiceSearchTerm('')
  }

  // FIXED: getBookingForSlot function with proper staffId handling
  const getBookingForSlot = (staffMember, timeSlot, date) => {
    const dayBookings = bookingsByDate[date] || []

    return dayBookings.find((booking) => {
      // Convert both to numbers for proper comparison
      const bookingStaffId = parseInt(booking.staffId)
      const staffMemberId = parseInt(staffMember.id)

      // Handle undefined/null staffId - if booking has no staffId, show it for "Any" staff (id: 2)
      let staffMatch = false
      if (booking.staffId === undefined || booking.staffId === null) {
        staffMatch = staffMemberId === 2 // Show unassigned bookings in "Any" column
      } else {
        staffMatch = bookingStaffId === staffMemberId // Exact match for assigned bookings
      }

      // Time matching: compare time strings directly
      const timeToMinutes = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number)
        return hours * 60 + minutes
      }

      const slotMinutes = timeToMinutes(timeSlot)
      const bookingStartMinutes = timeToMinutes(booking.time)
      const bookingEndMinutes = timeToMinutes(booking.endTime)

      const timeMatch = slotMinutes >= bookingStartMinutes && slotMinutes < bookingEndMinutes + 15

      return staffMatch && timeMatch
    })
  }

  const handleCreateBooking = async (e) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      if (createFormData.selectedServiceIds.length === 0) {
        alert('Please select at least one service')
        setIsCreating(false)
        return
      }

      if (!createFormData.clientId && !createFormData.phone.trim()) {
        alert('Please either select a client or enter a phone number')
        setIsCreating(false)
        return
      }

      const startDateTime = createLocalDateTime(selectedDate, createFormData.startTime)
      const endDateTime = new Date(
        startDateTime.getTime() + selectedServicesInfo.totalDuration * 60000
      )

      const formattedStartTime = formatDateForDatabase(startDateTime)
      const formattedEndTime = formatDateForDatabase(endDateTime)

      // Keep the price as-is (with "+" if present) since it's stored as TEXT in database
      const priceValue = selectedServicesInfo.totalPrice

      const bookingData = {
        date: selectedDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        numClients: parseInt(createFormData.numClients),
        price: priceValue,
        totalPrice: priceValue,
        status: createFormData.status,
        notes: createFormData.notes,
        serviceIds: createFormData.selectedServiceIds.map((id) => parseInt(id)),
        serviceId:
          createFormData.selectedServiceIds.length === 1
            ? parseInt(createFormData.selectedServiceIds[0])
            : null,
        isPaid: false,
        extrasPrice: 0,
        staffId: createFormData.staffId ? parseInt(createFormData.staffId) : null,
      }

      if (createFormData.clientId) {
        bookingData.clientId = parseInt(createFormData.clientId)
      } else {
        bookingData.name = createFormData.name || null
        bookingData.phone = createFormData.phone
      }

      // Create the booking
      await createBooking(bookingData)

      // Close the modal and reset form
      closeModal()
      setCreateFormData({
        clientId: '',
        name: '',
        phone: '',
        selectedServiceIds: [],
        startTime: '',
        staffId: '',
        numClients: 1,
        notes: '',
        status: 'pending',
      })

      // Ensure day view is maintained
      setSearchParams({ date: selectedDate, view: 'day' })

      // Refresh bookings data to show the new booking
      if (refetch) {
        await refetch()
      }
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  if (isLoading || staffLoading || servicesLoading || clientsLoading || staffShiftsLoading)
    return <Spinner />

  if (staffError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        Error loading staff: {staffError.message}
      </div>
    )
  }

  if (servicesError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        Error loading services: {servicesError.message}
      </div>
    )
  }

  if (clientsError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        Error loading clients: {clientsError.message}
      </div>
    )
  }

  if (staffShiftsError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        Error loading staff shifts: {staffShiftsError.message}
      </div>
    )
  }

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const formatDate = (day) => {
    const year = currentDate.getFullYear()
    const month = String(currentDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(day).padStart(2, '0')
    return `${year}-${month}-${dayStr}`
  }

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const handleDateClick = (day) => {
    if (!day) return
    const dateStr = formatDate(day)
    setSelectedDate(dateStr)
    setView('day')
  }

  if (view === 'day' && selectedDate) {
    const dayBookings = bookingsByDate[selectedDate] || []

    // Filter staff to only show those working on this day
    const workingStaff = getStaffWorkingOnDay(selectedDate, staff, staffShifts)

    // Calculate grid template columns dynamically based on number of WORKING staff
    const staffGridColumns = workingStaff.map(() => '120px').join(' ')
    const staffHeaderGridColumns = `repeat(${workingStaff.length}, 120px)`

    return (
      <div style={calendarStyles.container}>
        <button
          onClick={() => {
            setShowCreateModal(true)
          }}
          style={calendarStyles.createBookingButton}
          onMouseOver={(e) => (e.target.style.backgroundColor = '#1d4ed8')}
          onMouseOut={(e) => (e.target.style.backgroundColor = '#2563eb')}
        >
          + Create Booking
        </button>
        {/* Day View Header */}
        <div style={calendarStyles.dayViewHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setView('calendar')}
              style={calendarStyles.backButton}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#f0f8ff')}
              onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
            >
              ← Back to Calendar
            </button>
            <h1 style={calendarStyles.dayViewTitle}>
              Bookings for{' '}
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>
              Total bookings: {dayBookings.length}
            </div>
          </div>
        </div>

        {/* Schedule Grid */}
        <div style={calendarStyles.scheduleGrid}>
          <div style={calendarStyles.scheduleHeader}>
            <div style={calendarStyles.scheduleHeaderLeft}>Time / Staff</div>
            <div
              style={{
                ...calendarStyles.scheduleHeaderRight,
                gridTemplateColumns: staffHeaderGridColumns,
              }}
            >
              {workingStaff.map((staffMember) => {
                const staffName =
                  typeof staffMember === 'string' ? staffMember : staffMember.name || staffMember.id
                return (
                  <div key={staffMember.id || staffName} style={calendarStyles.staffHeader}>
                    <span style={{ fontSize: '12px' }}>👤</span>
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {staffName}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} style={calendarStyles.timeRow}>
              <div style={calendarStyles.timeCell}>{timeSlot}</div>
              <div
                style={{
                  ...calendarStyles.staffSlotsRow,
                  gridTemplateColumns: staffGridColumns,
                }}
              >
                {workingStaff.map((staffMember) => {
                  const booking = getBookingForSlot(staffMember, timeSlot, selectedDate)
                  return (
                    <div key={`${staffMember.id}-${timeSlot}`} style={calendarStyles.staffSlot}>
                      {booking ? (
                        <div
                          style={{
                            ...calendarStyles.bookingBlock,
                            ...(booking.status === 'completed'
                              ? { backgroundColor: '#9ca3af', color: 'white' }
                              : booking.status === 'pending'
                              ? { backgroundColor: '#22c55e', color: 'white' }
                              : booking.status === 'cancelled'
                              ? { backgroundColor: '#ef4444', color: 'white' }
                              : calendarStyles.bookingConfirmed),
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => handleBookingClick(booking)}
                          onMouseOver={(e) => {
                            e.target.style.transform = 'scale(1.02)'
                            e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
                          }}
                          onMouseOut={(e) => {
                            e.target.style.transform = 'scale(1)'
                            e.target.style.boxShadow = 'none'
                          }}
                          title="Click to view booking details"
                        >
                          <div
                            style={{
                              fontWeight: '600',
                              fontSize: '11px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: '1.2',
                            }}
                          >
                            {booking.service}
                          </div>
                          <div
                            style={{
                              fontSize: '10px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              lineHeight: '1.2',
                              opacity: 0.9,
                            }}
                          >
                            {booking.client}
                          </div>
                          {booking.numClients > 1 && (
                            <div style={{ fontSize: '9px', opacity: 0.8 }}>
                              ({booking.numClients} clients)
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={calendarStyles.availableSlot}
                          onMouseOver={(e) => (e.target.style.backgroundColor = '#f8f9fa')}
                          onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
                        >
                          -
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Day Summary */}
        <div style={calendarStyles.summaryGrid}>
          <div style={{ ...calendarStyles.summaryCard, ...calendarStyles.summaryCardBlue }}>
            <div style={calendarStyles.summaryLabel}>📅 Total Bookings</div>
            <div style={calendarStyles.summaryValue}>{dayBookings.length}</div>
          </div>
          <div style={{ ...calendarStyles.summaryCard, ...calendarStyles.summaryCardGreen }}>
            <div style={calendarStyles.summaryLabel}>🕐 Total Clients</div>
            <div style={calendarStyles.summaryValue}>
              {dayBookings.reduce((sum, booking) => sum + (booking.numClients || 1), 0)}
            </div>
          </div>
          <div style={{ ...calendarStyles.summaryCard, ...calendarStyles.summaryCardPurple }}>
            <div style={calendarStyles.summaryLabel}>✂️ Services</div>
            <div style={calendarStyles.summaryValue}>
              {new Set(dayBookings.map((b) => b.service)).size}
            </div>
          </div>
        </div>

        {/* Create Booking Modal */}
        {showCreateModal && (
          <div style={calendarStyles.modalOverlay} onClick={closeModal}>
            <div style={calendarStyles.modal} onClick={(e) => e.stopPropagation()}>
              <div style={calendarStyles.modalHeader}>
                Create New Booking for{' '}
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>

              <form onSubmit={handleCreateBooking}>
                {/* Client Selection Section */}
                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Client (Optional)</label>
                  <select
                    style={{
                      ...calendarStyles.select,
                      backgroundColor:
                        createFormData.name || createFormData.phone ? '#f9fafb' : 'white',
                    }}
                    value={createFormData.clientId}
                    onChange={(e) => handleClientSelection(e.target.value)}
                    disabled={createFormData.name.trim() || createFormData.phone.trim()}
                  >
                    <option value="">Select existing client (optional)</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.fullName || client.name} - {client.email || client.phone}
                      </option>
                    ))}
                  </select>
                  {(createFormData.name || createFormData.phone) && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Client selection disabled when name/phone is entered
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginTop: '8px',
                  }}
                >
                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Name</label>
                    <input
                      type="text"
                      style={{
                        ...calendarStyles.input,
                        backgroundColor: createFormData.clientId ? '#f9fafb' : 'white',
                      }}
                      value={createFormData.name}
                      onChange={(e) => handleNameOrPhoneChange('name', e.target.value)}
                      disabled={!!createFormData.clientId}
                      placeholder={
                        createFormData.clientId
                          ? 'Auto-filled from selected client'
                          : 'Enter client name'
                      }
                    />
                  </div>

                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Phone</label>
                    <input
                      type="tel"
                      style={{
                        ...calendarStyles.input,
                        backgroundColor: createFormData.clientId ? '#f9fafb' : 'white',
                      }}
                      value={createFormData.phone}
                      onChange={(e) => handleNameOrPhoneChange('phone', e.target.value)}
                      disabled={!!createFormData.clientId}
                      placeholder={
                        createFormData.clientId
                          ? 'Auto-filled from selected client'
                          : 'Enter phone number'
                      }
                      required
                    />
                  </div>
                </div>

                {/* Help text */}
                <div
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    fontStyle: 'italic',
                    marginTop: '8px',
                    padding: '8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                  }}
                >
                  💡 Either select an existing client OR enter name and phone for a new client
                </div>

                {/* Services with Search Box */}
                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Services (Select Multiple)</label>

                  {/* Search Box */}
                  <input
                    type="text"
                    placeholder="🔍 Search services by name or category..."
                    value={serviceSearchTerm}
                    onChange={(e) => setServiceSearchTerm(e.target.value)}
                    style={{
                      ...calendarStyles.input,
                      marginBottom: '8px',
                      padding: '10px 12px',
                      fontSize: '14px',
                      border: '2px solid #d1d5db',
                      backgroundColor: 'white',
                    }}
                  />

                  {/* Service List */}
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
                            backgroundColor: createFormData.selectedServiceIds.includes(
                              service.id.toString()
                            )
                              ? '#e0f2fe'
                              : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={createFormData.selectedServiceIds.includes(
                              service.id.toString()
                            )}
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
                                // Service prices are TEXT format (e.g., "20+", "POA", etc.)
                                const regularPriceStr = service.regularPrice
                                  ? String(service.regularPrice)
                                  : '0'
                                const discountStr = service.discount
                                  ? String(service.discount)
                                  : '0'

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
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#666',
                          fontSize: '14px',
                        }}
                      >
                        No services found matching &#39;{serviceSearchTerm}&#39;
                      </div>
                    )}
                  </div>

                  {/* Clear search button */}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Start Time</label>
                    <select
                      style={calendarStyles.select}
                      value={createFormData.startTime}
                      onChange={(e) =>
                        setCreateFormData((prev) => ({ ...prev, startTime: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select time</option>
                      {timeSlots.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>End Time (Auto-calculated)</label>
                    <input
                      type="text"
                      style={{ ...calendarStyles.input, backgroundColor: '#f9fafb' }}
                      value={calculateEndTime(
                        createFormData.startTime,
                        selectedServicesInfo.totalDuration
                      )}
                      disabled
                    />
                  </div>
                </div>

                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Staff Member *</label>
                  <select
                    style={calendarStyles.select}
                    value={createFormData.staffId}
                    onChange={(e) => {
                      console.log('Staff selected:', e.target.value)
                      setCreateFormData((prev) => ({ ...prev, staffId: e.target.value }))
                    }}
                    required
                  >
                    <option value="">Select staff member</option>
                    {workingStaff.map((staffMember) => (
                      <option key={staffMember.id} value={staffMember.id}>
                        {staffMember.name || staffMember.id}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    Only showing staff available on this day
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Number of Clients</label>
                    <input
                      type="number"
                      min="1"
                      style={calendarStyles.input}
                      value={createFormData.numClients}
                      onChange={(e) =>
                        setCreateFormData((prev) => ({ ...prev, numClients: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Total Price (Auto-calculated)</label>
                    <input
                      type="text"
                      style={{ ...calendarStyles.input, backgroundColor: '#f9fafb' }}
                      value={`$${selectedServicesInfo.totalPrice}`}
                      disabled
                    />
                  </div>
                </div>

                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Status</label>
                  <select
                    style={calendarStyles.select}
                    value={createFormData.status}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Notes (Optional)</label>
                  <textarea
                    style={{ ...calendarStyles.input, minHeight: '80px', resize: 'vertical' }}
                    value={createFormData.notes}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Add any additional notes..."
                  />
                </div>

                <div style={calendarStyles.formButtons}>
                  <button type="button" onClick={closeModal} style={calendarStyles.cancelButton}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreating || createFormData.selectedServiceIds.length === 0}
                    style={{
                      ...calendarStyles.submitButton,
                      ...(isCreating || createFormData.selectedServiceIds.length === 0
                        ? calendarStyles.disabledButton
                        : {}),
                    }}
                  >
                    {isCreating ? 'Creating...' : 'Create Booking'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={calendarStyles.container}>
      {/* Calendar Header */}
      <div style={calendarStyles.header}>
        <h1 style={calendarStyles.title}>
          <span style={{ fontSize: '24px' }}>📅</span>
          Booking Calendar
        </h1>
        <div style={calendarStyles.navigation}>
          <button
            onClick={() => navigateMonth(-1)}
            style={calendarStyles.navButton}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
            onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
          >
            ←
          </button>
          <h2 style={calendarStyles.monthTitle}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            style={calendarStyles.navButton}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
            onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={calendarStyles.calendarGrid}>
        {/* Days of week header */}
        <div style={calendarStyles.weekHeader}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              style={{
                ...calendarStyles.weekHeaderCell,
                borderRight: day === 'Sat' ? 'none' : '1px solid #e5e5e5',
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div style={calendarStyles.daysGrid}>
          {getCalendarDays().map((day, index) => {
            const dateStr = day ? formatDate(day) : null
            const dayBookings = dateStr ? bookingsByDate[dateStr] || [] : []
            const isToday =
              day &&
              new Date().getDate() === day &&
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === currentDate.getFullYear()

            return (
              <div
                key={index}
                style={{
                  ...calendarStyles.dayCell,
                  ...(day ? {} : calendarStyles.emptyCell),
                  ...(hoveredDay === index && day ? calendarStyles.dayCellHover : {}),
                  borderRight: (index + 1) % 7 === 0 ? 'none' : '1px solid #e5e5e5',
                }}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => day && setHoveredDay(index)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {day && (
                  <>
                    <div
                      style={{
                        ...calendarStyles.dayNumber,
                        ...(isToday ? calendarStyles.todayNumber : {}),
                      }}
                    >
                      {day}
                      {isToday && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#2563eb',
                            borderRadius: '50%',
                            display: 'inline-block',
                            marginLeft: '4px',
                          }}
                        ></span>
                      )}
                    </div>
                    {dayBookings.length > 0 && (
                      <div>
                        <div style={calendarStyles.bookingBadge}>
                          {dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly Summary */}
      <div style={calendarStyles.summaryGrid}>
        <div style={{ ...calendarStyles.summaryCard, ...calendarStyles.summaryCardBlue }}>
          <div style={calendarStyles.summaryLabel}>Total Bookings</div>
          <div style={calendarStyles.summaryValue}>{currentMonthBookings.length}</div>
        </div>
      </div>
    </div>
  )
}

export default BookingCalendar
