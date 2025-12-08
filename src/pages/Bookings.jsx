import React, { useState, useMemo, useEffect } from 'react'
import { getStaff } from '../services/apiStaff'
import { getServices } from '../services/apiServices'
import { useBookings } from '../features/bookings/useBookings'
import Spinner from '../ui/Spinner'
import { calendarStyles } from '../styles/CalendarStyles'
import { createBooking } from '../services/apiBookings'
import { getClient } from '../services/apiClients'
import { useNavigate, useSearchParams } from 'react-router-dom'
import supabase from '../services/supabase'

// Absence types for leave management
const absenceTypes = [
  'Sick Leave',
  'Annual Leave',
  'Personal Leave',
  'Public Holiday',
  'Unpaid Leave',
  'Training',
]

// Custom hook to use the getStaff function
const useStaff = () => {
  const [staff, setStaff] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
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
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
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
  const [clients, setClients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
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

// Enhanced hook to get staff working on a specific date
const useStaffWorkingOnDate = (date) => {
  const [workingStaff, setWorkingStaff] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchWorkingStaff = async () => {
      if (!date) {
        setWorkingStaff([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        // Get all staff first
        const allStaff = await getStaff()

        // Get day of week for recurring shifts
        const selectedDate = new Date(date)
        const dayOfWeek = selectedDate.getDay()

        // Fetch both recurring and specific shifts
        const { data: shifts, error: shiftsError } = await supabase
          .from('staff_shifts')
          .select(
            `
            *,
            staff:staffId (
              id,
              name
            )
          `
          )
          .or(`dayOfWeek.eq.${dayOfWeek},specificDate.eq.${date}`)

        if (shiftsError) {
          console.error('Error fetching shifts:', shiftsError)
          throw shiftsError
        }

        // Fetch staff absences for this date
        const { data: absences, error: absencesError } = await supabase
          .from('staff_absences')
          .select('staffId, absenceType, notes')
          .eq('absenceDate', date)

        if (absencesError) {
          console.error('Error fetching absences:', absencesError)
          throw absencesError
        }

        const validShifts = shifts || []
        const staffAbsences = absences || []

        // Get staff IDs who are on leave
        const staffOnLeave = staffAbsences.map((absence) => absence.staffId)

        // Get staff IDs who have shifts but are NOT on leave
        const workingStaffIds = [...new Set(validShifts.map((shift) => shift.staffId))].filter(
          (staffId) => !staffOnLeave.includes(staffId)
        )

        // Filter staff to only include those with shifts and not on leave
        const staffWithShifts = allStaff.filter((staffMember) =>
          workingStaffIds.includes(staffMember.id)
        )

        // Add shift information to each staff member
        const enrichedStaff = staffWithShifts.map((staffMember) => {
          const staffShifts = validShifts.filter((shift) => shift.staffId === staffMember.id)
          return {
            ...staffMember,
            shifts: staffShifts,
            hasSpecificShift: staffShifts.some((shift) => shift.specificDate === date),
            hasRecurringShift: staffShifts.some(
              (shift) => shift.dayOfWeek === dayOfWeek && !shift.specificDate
            ),
          }
        })

        setWorkingStaff(enrichedStaff)
        setError(null)
      } catch (err) {
        console.error('Error loading working staff:', err)
        setError(err)
        setWorkingStaff([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkingStaff()
  }, [date])

  return { workingStaff, isLoading, error }
}

const isTimeSlotAvailable = (
  timeSlot,
  staffId,
  dayBookings,
  selectedDate,
  serviceDuration = 60
) => {
  if (!staffId || !dayBookings || dayBookings.length === 0) return true

  const slotStartMinutes = timeToMinutes(timeSlot)
  const slotEndMinutes = slotStartMinutes + serviceDuration

  // Check for conflicts with existing bookings for this staff member
  const hasConflict = dayBookings.some((booking) => {
    // Only check bookings for the same staff member
    if (parseInt(booking.staffId) !== parseInt(staffId)) return false

    const bookingStartMinutes = timeToMinutes(booking.time)
    const bookingEndMinutes = timeToMinutes(booking.endTime)

    // Check if the time slots overlap
    return (
      (slotStartMinutes >= bookingStartMinutes && slotStartMinutes < bookingEndMinutes) ||
      (slotEndMinutes > bookingStartMinutes && slotEndMinutes <= bookingEndMinutes) ||
      (slotStartMinutes <= bookingStartMinutes && slotEndMinutes >= bookingEndMinutes)
    )
  })

  return !hasConflict
}

// Add this function after isTimeSlotAvailable
const getAvailableTimeSlotsForConsecutiveBookings = (
  selectedServices, // Now expects the full selectedServices array
  staffAssignments,
  dayBookings,
  services,
  selectedDate
) => {
  if (!selectedServices || selectedServices.length === 0) return timeSlots

  return timeSlots.filter((startTime) => {
    let currentTime = startTime

    // Check if all services can be scheduled consecutively
    for (const serviceInstance of selectedServices) {
      const service = serviceInstance.service
      const staffId = staffAssignments[serviceInstance.instanceId]

      if (!service || !staffId) return false

      // Check if this time slot is available for this staff member
      if (!isTimeSlotAvailable(currentTime, staffId, dayBookings, selectedDate, service.duration)) {
        return false
      }

      // Move to next time slot for next service
      const [hours, minutes] = currentTime.split(':').map(Number)
      const startDate = new Date()
      startDate.setHours(hours, minutes, 0, 0)
      const endDate = new Date(startDate.getTime() + service.duration * 60000)
      currentTime = endDate.toTimeString().slice(0, 5)
    }

    return true
  })
}
// Custom hook to get staff absences for a specific date
const useStaffAbsences = (date) => {
  const [absences, setAbsences] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchAbsences = async () => {
      if (!date) {
        setAbsences([])
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)

        const { data: absencesData, error: absencesError } = await supabase
          .from('staff_absences')
          .select(
            `
            *,
            staff:staffId (
              id,
              name
            )
          `
          )
          .eq('absenceDate', date)

        if (absencesError) {
          console.error('Error fetching absences:', absencesError)
          throw absencesError
        }

        setAbsences(absencesData || [])
        setError(null)
      } catch (err) {
        console.error('Error loading staff absences:', err)
        setError(err)
        setAbsences([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAbsences()
  }, [date])

  return { absences, isLoading, error }
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
  '19:15',
  '19:30',
  '19:45',
  '20:00',
  '20:15',
  '20:30',
]

// Add this helper function near the top with other helper functions
const getBookingColor = (booking, status) => {
  // Count services
  let serviceCount = 1 // default

  if (Array.isArray(booking.originalBooking?.services)) {
    serviceCount = booking.originalBooking.services.length
  } else if (booking.originalBooking?.serviceIds) {
    try {
      const serviceIdsArray = Array.isArray(booking.originalBooking.serviceIds)
        ? booking.originalBooking.serviceIds
        : JSON.parse(booking.originalBooking.serviceIds)
      serviceCount = serviceIdsArray.length
    } catch (e) {
      serviceCount = 1
    }
  }

  // Status-based colors with service count variations
  if (status === 'completed') {
    return '#9ca3af' // Gray - keep same for completed
  } else if (status === 'cancelled') {
    return '#ef4444' // Red - keep same for cancelled
  } else if (status === 'pending') {
    // Different shades of green based on service count
    if (serviceCount === 1) return '#22c55e' // Bright green
    if (serviceCount === 2) return '#16a34a' // Medium green
    return '#15803d' // Dark green for 3+
  } else {
    // confirmed or other
    // Different shades of blue based on service count
    if (serviceCount === 1) return '#3b82f6' // Bright blue
    if (serviceCount === 2) return '#2563eb' // Medium blue
    return '#1d4ed8' // Dark blue for 3+
  }
}

// Helper function to create a local date-time without timezone conversion
const createLocalDateTime = (dateString, timeString) => {
  const [year, month, day] = dateString.split('-').map(Number)
  const [hours, minutes] = timeString.split(':').map(Number)
  const localDate = new Date(year, month - 1, day, hours, minutes, 0, 0)
  return localDate
}

// Helper function to format date for database (keeping local time)
const formatDateForDatabase = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

// Helper function to convert time to minutes
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// Helper function to format shift time display
const formatShiftTime = (timeString) => {
  if (!timeString) return ''
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minutes} ${ampm}`
}

const BookingCalendar = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [view, setView] = useState('calendar')
  const [hoveredDay, setHoveredDay] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [serviceSearchTerm, setServiceSearchTerm] = useState('')
  const [currentTime, setCurrentTime] = useState(new Date())

  // Shift creation state
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [isCreatingShift, setIsCreatingShift] = useState(false)
  const [shiftFormData, setShiftFormData] = useState({
    staffId: '',
    startTime: '',
    endTime: '',
    notes: '',
  })

  // Leave management state
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [isCreatingLeave, setIsCreatingLeave] = useState(false)
  const [leaveFormData, setLeaveFormData] = useState({
    staffId: '',
    absenceType: 'Sick Leave',
    notes: '',
  })

  // Drag and drop state
  const [draggedBooking, setDraggedBooking] = useState(null)
  const [dragTarget, setDragTarget] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

  const [createFormData, setCreateFormData] = useState({
    clientId: '',
    name: '',
    phone: '',
    selectedServices: [],
    startTime: '', // Keep this for single client
    clientStartTimes: {}, // New: for multiple clients
    staffId: '',
    numClients: 1,
    notes: '',
    status: 'confirmed',
    serviceStaffAssignments: {},
    createSeparateBookings: false,
    clientServiceAssignments: {},
  })

  const { bookings, isLoading, refetch } = useBookings()
  const { staff, isLoading: staffLoading, error: staffError } = useStaff()
  const { services, isLoading: servicesLoading, error: servicesError } = useServices()
  const { clients, isLoading: clientsLoading, error: clientsError } = useClients()

  // Transform your booking data to include date and time information
  const transformedBookings = useMemo(() => {
    if (!bookings || bookings.length === 0 || staff.length === 0) return []

    return bookings.map((booking) => {
      let startTime, endTime

      if (booking.startTime) {
        if (typeof booking.startTime === 'string') {
          startTime = new Date(booking.startTime)
        } else {
          startTime = booking.startTime
        }
      } else {
        startTime = new Date()
      }

      if (booking.endTime) {
        if (typeof booking.endTime === 'string') {
          endTime = new Date(booking.endTime)
        } else {
          endTime = booking.endTime
        }
      } else {
        endTime = new Date(startTime.getTime() + 60 * 60000)
      }

      if (isNaN(startTime.getTime())) {
        console.warn('Invalid startTime for booking:', booking.id, booking.startTime)
        startTime = new Date()
      }

      if (isNaN(endTime.getTime())) {
        console.warn('Invalid endTime for booking:', booking.id, booking.endTime)
        endTime = new Date(startTime.getTime() + 60 * 60000)
      }

      const localStartHours = startTime.getHours()
      const localStartMinutes = startTime.getMinutes()
      const localEndHours = endTime.getHours()
      const localEndMinutes = endTime.getMinutes()

      const formatTime = (hours, minutes) => {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
      }

      let staffMember = 'Any'
      if (booking.staffId && staff.length > 0) {
        const foundStaff = staff.find((s) => s.id === booking.staffId)
        if (foundStaff) {
          staffMember = foundStaff.name || foundStaff.id
        }
      }

      let serviceDisplay = 'Service'
      if (Array.isArray(booking.services)) {
        serviceDisplay = booking.services.map((s) => s.name).join(', ')
      } else if (booking.services?.name) {
        serviceDisplay = booking.services.name
      } else if (booking.serviceIds) {
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
        originalBooking: booking,
        service: serviceDisplay,
        client: booking.client?.fullName || booking.client?.email || booking.name || booking.phone,
        date:
          booking.date ||
          (() => {
            const year = startTime.getFullYear()
            const month = String(startTime.getMonth() + 1).padStart(2, '0')
            const day = String(startTime.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
          })(),
        time: formatTime(localStartHours, localStartMinutes),
        endTime: formatTime(localEndHours, localEndMinutes),
        staff: staffMember,
        staffId: booking.staffId,
        status: booking.status || 'pending',
        amount: booking.totalPrice || 0,
        numClients: booking.numClients || 1,
        duration: Math.round((endTime - startTime) / (1000 * 60)),
        created_at: booking.created_at,
        notes: booking.notes || '',
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

  // Calculate total duration and price based on selected services
  const selectedServicesInfo = useMemo(() => {
    if (
      !services ||
      !createFormData.selectedServices ||
      createFormData.selectedServices.length === 0
    ) {
      return { totalDuration: 0, totalPrice: '0', serviceNames: [] }
    }

    const selectedServicesData = createFormData.selectedServices.map(
      (serviceInstance) => serviceInstance.service
    )

    const totalDuration = selectedServicesData.reduce(
      (sum, service) => sum + (service.duration || 0),
      0
    )

    let totalPriceNum = 0
    let hasPlus = false
    let hasNonNumeric = false

    selectedServicesData.forEach((service) => {
      const regularPriceStr = service.regularPrice ? String(service.regularPrice) : '0'
      const discountStr = service.discount ? String(service.discount) : '0'

      if (regularPriceStr.includes('+')) {
        hasPlus = true
      }

      const regularPriceNum = parseFloat(regularPriceStr.replace('+', ''))
      const discountNum = parseFloat(discountStr.replace('+', ''))

      if (isNaN(regularPriceNum) || isNaN(discountNum)) {
        hasNonNumeric = true
      } else {
        totalPriceNum += regularPriceNum - discountNum
      }
    })

    let totalPrice
    if (hasNonNumeric) {
      totalPrice = 'POA'
    } else if (hasPlus) {
      totalPrice = `${totalPriceNum}+`
    } else {
      totalPrice = `${totalPriceNum}`
    }

    const serviceNames = selectedServicesData.map((service) => service.name)

    return { totalDuration, totalPrice, serviceNames, selectedServices: selectedServicesData }
  }, [services, createFormData.selectedServices])

  // Helper function to handle service assignment to clients
  const handleClientServiceAssignment = (serviceId, clientIndex) => {
    setCreateFormData((prev) => ({
      ...prev,
      clientServiceAssignments: {
        ...prev.clientServiceAssignments,
        [serviceId]: clientIndex,
      },
    }))
  }

  // Helper function to get services for a specific client
  const getServicesForClient = (clientIndex) => {
    return createFormData.selectedServices.filter(
      (serviceInstance) =>
        createFormData.clientServiceAssignments[serviceInstance.instanceId] === clientIndex
    )
  }

  // Helper function to check if all services are assigned to clients
  const areAllServicesAssigned = () => {
    if (createFormData.numClients === 1) return true

    return createFormData.selectedServices.every(
      (serviceInstance) =>
        createFormData.clientServiceAssignments[serviceInstance.instanceId] !== undefined
    )
  }

  // Helper function to handle client start time assignment
  const handleClientStartTimeAssignment = (clientIndex, startTime) => {
    setCreateFormData((prev) => ({
      ...prev,
      clientStartTimes: {
        ...prev.clientStartTimes,
        [clientIndex]: startTime,
      },
    }))
  }

  // Helper function to check if all clients have start times
  const areAllClientStartTimesAssigned = () => {
    if (createFormData.numClients === 1) return !!createFormData.startTime

    for (let i = 0; i < createFormData.numClients; i++) {
      if (!createFormData.clientStartTimes[i]) {
        return false
      }
    }
    return true
  }

  useEffect(() => {
    // Reset start time if it becomes unavailable when staff/services change
    if (createFormData.startTime) {
      let isStillAvailable = false

      // Get the current day's bookings
      const currentDayBookings = bookingsByDate[selectedDate] || []

      if (
        createFormData.createSeparateBookings &&
        createFormData.selectedServices &&
        createFormData.selectedServices.length > 1
      ) {
        // Check if start time is still available for consecutive bookings
        const availableSlots = getAvailableTimeSlotsForConsecutiveBookings(
          createFormData.selectedServices,
          createFormData.serviceStaffAssignments,
          currentDayBookings,
          services,
          selectedDate
        )
        isStillAvailable = availableSlots.includes(createFormData.startTime)
      } else if (createFormData.staffId) {
        // Check if start time is still available for single booking
        isStillAvailable = isTimeSlotAvailable(
          createFormData.startTime,
          createFormData.staffId,
          currentDayBookings, // FIX: Use currentDayBookings instead of dayBookings
          selectedDate,
          selectedServicesInfo.totalDuration
        )
      }

      if (!isStillAvailable) {
        setCreateFormData((prev) => ({
          ...prev,
          startTime: '',
        }))

        console.log('⚠️ Selected time slot is no longer available - cleared selection')
      }
    }
  }, [
    createFormData.startTime,
    createFormData.staffId,
    createFormData.serviceStaffAssignments,
    createFormData.selectedServices, // Changed from selectedServiceIds
    createFormData.createSeparateBookings,
    selectedServicesInfo.totalDuration,
    bookingsByDate,
    selectedDate,
    services,
  ])

  useEffect(() => {
    const dateParam = searchParams.get('date')
    const viewParam = searchParams.get('view')

    if (dateParam) {
      setSelectedDate(dateParam)
      setView('day')
      setSearchParams({})
    }
  }, [searchParams, setSearchParams])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    return () => clearInterval(timer)
  }, [])

  const hasMultipleStaffAssigned = () => {
    const assignments = Object.values(createFormData.serviceStaffAssignments)
    const uniqueStaff = new Set(assignments.filter((id) => id))
    return uniqueStaff.size > 1
  }

  const handleServiceStaffAssignment = (serviceId, staffId) => {
    setCreateFormData((prev) => ({
      ...prev,
      serviceStaffAssignments: {
        ...prev.serviceStaffAssignments,
        [serviceId]: staffId,
      },
    }))
  }

  // Use the enhanced hook for staff working on the selected date
  const {
    workingStaff,
    isLoading: workingStaffLoading,
    error: workingStaffError,
  } = useStaffWorkingOnDate(selectedDate)

  // Use the absences hook to get staff on leave for the selected date
  const {
    absences: staffAbsences,
    isLoading: absencesLoading,
    error: absencesError,
  } = useStaffAbsences(selectedDate)

  // Staff shift functions
  const closeModal = () => {
    setShowCreateModal(false)
    setServiceSearchTerm('')
  }

  const closeShiftModal = () => {
    setShowShiftModal(false)
    setShiftFormData({
      staffId: '',
      startTime: '',
      endTime: '',
      notes: '',
    })
  }

  const closeLeaveModal = () => {
    setShowLeaveModal(false)
    setLeaveFormData({
      staffId: '',
      absenceType: 'Sick Leave',
      notes: '',
    })
  }

  const handleCreateShift = async (e) => {
    e.preventDefault()
    setIsCreatingShift(true)

    try {
      if (!shiftFormData.staffId || !shiftFormData.startTime || !shiftFormData.endTime) {
        alert('Please fill in all required fields')
        setIsCreatingShift(false)
        return
      }

      // Validate that end time is after start time
      if (shiftFormData.startTime >= shiftFormData.endTime) {
        alert('End time must be after start time')
        setIsCreatingShift(false)
        return
      }

      const shiftData = {
        staffId: parseInt(shiftFormData.staffId),
        specificDate: selectedDate,
        dayOfWeek: null, // This is a specific date shift
        startTime: shiftFormData.startTime,
        endTime: shiftFormData.endTime,
        notes: shiftFormData.notes || null,
      }

      const { error } = await supabase.from('staff_shifts').insert([shiftData])

      if (error) throw error

      alert('✓ Staff shift created successfully!')
      closeShiftModal()

      // Trigger a re-render by updating the selected date
      const currentDate = selectedDate
      setSelectedDate(null)
      setTimeout(() => setSelectedDate(currentDate), 10)
    } catch (error) {
      console.error('Error creating staff shift:', error)
      alert('❌ Failed to create shift: ' + (error.message || 'Please try again.'))
    } finally {
      setIsCreatingShift(false)
    }
  }

  const handleCreateLeave = async (e) => {
    e.preventDefault()
    setIsCreatingLeave(true)

    try {
      if (!leaveFormData.staffId || !leaveFormData.absenceType) {
        alert('Please fill in all required fields')
        setIsCreatingLeave(false)
        return
      }

      const leaveData = {
        staffId: parseInt(leaveFormData.staffId),
        absenceDate: selectedDate,
        absenceType: leaveFormData.absenceType,
        notes: leaveFormData.notes || null,
      }

      const { error } = await supabase.from('staff_absences').insert([leaveData])

      if (error) throw error

      alert('✓ Staff leave added successfully!')
      closeLeaveModal()

      // Refresh the working staff data
      const currentDate = selectedDate
      setSelectedDate(null)
      setTimeout(() => setSelectedDate(currentDate), 10)
    } catch (error) {
      console.error('Error creating staff leave:', error)
      alert('❌ Failed to add leave: ' + (error.message || 'Please try again.'))
    } finally {
      setIsCreatingLeave(false)
    }
  }

  const handleDeleteShift = async (shift, staffName) => {
    const shiftType = shift.specificDate ? 'specific date shift' : 'recurring shift'
    const shiftDate = shift.specificDate
      ? new Date(shift.specificDate).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
          shift.dayOfWeek
        ]

    const confirmMessage = `Are you sure you want to delete ${staffName}'s ${shiftType} on ${shiftDate} from ${formatShiftTime(
      shift.startTime
    )} to ${formatShiftTime(shift.endTime)}?`

    if (!window.confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase.from('staff_shifts').delete().eq('id', shift.id)

      if (error) throw error

      alert('✓ Shift deleted successfully!')

      // Trigger a re-render to update the display
      const currentDate = selectedDate
      setSelectedDate(null)
      setTimeout(() => setSelectedDate(currentDate), 10)
    } catch (error) {
      console.error('Error deleting staff shift:', error)
      alert('❌ Failed to delete shift: ' + (error.message || 'Please try again.'))
    }
  }

  // Drag and drop handlers (keeping your existing drag/drop code)
  const handleDragStart = (e, booking, staff, time) => {
    setDraggedBooking({
      booking,
      originalStaff: staff,
      originalTime: time,
    })
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.style.opacity = '0.5'
    e.currentTarget.style.cursor = 'grabbing'
  }

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    e.currentTarget.style.cursor = 'grab'
    setDraggedBooking(null)
    setDragTarget(null)
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e, staff, time) => {
    e.preventDefault()
    if (draggedBooking) {
      setDragTarget({ staff, time })
    }
  }

  const handleDragLeave = (e) => {
    if (e.currentTarget === e.target) {
      setDragTarget(null)
    }
  }

  const checkBookingConflict = (
    targetStaff,
    targetTime,
    duration,
    currentBookingId,
    dayBookings
  ) => {
    const startMinutes = timeToMinutes(targetTime)
    const endMinutes = startMinutes + duration

    const conflicts = dayBookings.filter((booking) => {
      if (booking.id === currentBookingId) return false
      if (booking.staffId !== targetStaff.id) return false

      const bookingStart = timeToMinutes(booking.time)
      const bookingEnd = timeToMinutes(booking.endTime)

      return startMinutes < bookingEnd && endMinutes > bookingStart
    })

    return conflicts.length > 0
  }

  const handleDrop = async (e, targetStaff, targetTime) => {
    e.preventDefault()

    if (!draggedBooking) return

    const { booking, originalStaff, originalTime } = draggedBooking

    const staffChanged = targetStaff.id !== originalStaff.id
    const timeChanged = targetTime !== originalTime

    if (!staffChanged && !timeChanged) {
      setDraggedBooking(null)
      setDragTarget(null)
      setIsDragging(false)
      return
    }

    const dayBookings = bookingsByDate[selectedDate] || []

    // Check for conflicts
    if (checkBookingConflict(targetStaff, targetTime, booking.duration, booking.id, dayBookings)) {
      alert('⚠️ This time slot conflicts with another booking for this staff member!')
      setDraggedBooking(null)
      setDragTarget(null)
      setIsDragging(false)
      return
    }

    try {
      const newStartDateTime = createLocalDateTime(selectedDate, targetTime)
      const duration = booking.duration || 60
      const newEndDateTime = new Date(newStartDateTime.getTime() + duration * 60000)

      const formattedStartTime = formatDateForDatabase(newStartDateTime)
      const formattedEndTime = formatDateForDatabase(newEndDateTime)

      const { error } = await supabase
        .from('bookings')
        .update({
          staffId: targetStaff.id,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
        })
        .eq('id', booking.id)

      if (error) throw error

      const staffName = targetStaff.name || 'staff member'
      alert(`✓ Booking moved to ${staffName} at ${targetTime}`)

      if (refetch) await refetch()
    } catch (error) {
      console.error('Error updating booking:', error)
      alert('❌ Failed to move booking. Please try again.')
    } finally {
      setDraggedBooking(null)
      setDragTarget(null)
      setIsDragging(false)
    }
  }

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

  // Calculate end time based on start time and total duration
  const calculateEndTime = (startTime, durationInMinutes) => {
    if (!startTime || !durationInMinutes) return ''

    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    const endDate = new Date(startDate.getTime() + durationInMinutes * 60000)
    return endDate.toTimeString().slice(0, 5)
  }

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
    setCreateFormData((prev) => {
      // Create a new service instance with unique ID
      const instanceId = `${serviceId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const newSelectedServices = [
        ...prev.selectedServices,
        {
          instanceId,
          serviceId: serviceId,
          service: services.find((s) => s.id.toString() === serviceId),
        },
      ]

      return {
        ...prev,
        selectedServices: newSelectedServices,
        createSeparateBookings: false,
      }
    })
  }

  const handleRemoveServiceInstance = (instanceId) => {
    setCreateFormData((prev) => {
      const newSelectedServices = prev.selectedServices.filter((s) => s.instanceId !== instanceId)
      const newStaffAssignments = { ...prev.serviceStaffAssignments }
      const newClientAssignments = { ...prev.clientServiceAssignments }

      delete newStaffAssignments[instanceId]
      delete newClientAssignments[instanceId]

      return {
        ...prev,
        selectedServices: newSelectedServices,
        serviceStaffAssignments: newStaffAssignments,
        clientServiceAssignments: newClientAssignments,
      }
    })
  }

  const handleClientSelection = (clientId) => {
    if (clientId) {
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

  const handleNameOrPhoneChange = (field, value) => {
    setCreateFormData((prev) => ({
      ...prev,
      [field]: value,
      clientId: value.trim() ? '' : prev.clientId,
    }))
  }

  const handleBookingClick = (booking) => {
    if (!isDragging) {
      navigate(`/bookings/${booking.id}?returnDate=${selectedDate}`)
    }
  }

  // Calculate current time position
  const getCurrentTimePosition = () => {
    const hours = currentTime.getHours()
    const minutes = currentTime.getMinutes()
    const currentTimeInMinutes = hours * 60 + minutes

    // Calendar starts at 09:00 (540 minutes from midnight)
    const startMinutes = 9 * 60

    // If current time is before 09:00 or after 19:00, don't show the line
    if (currentTimeInMinutes < startMinutes || currentTimeInMinutes >= 19 * 60) {
      return null
    }

    // Calculate position relative to start time
    const minutesFromStart = currentTimeInMinutes - startMinutes
    // Each time slot is 40px high and represents 15 minutes
    const pixelsPerMinute = 40 / 15
    const position = minutesFromStart * pixelsPerMinute

    return position
  }

  // Check if the selected date is today
  const isSelectedDateToday = () => {
    if (!selectedDate) return false
    const today = new Date()
    const selected = new Date(selectedDate)
    return (
      today.getFullYear() === selected.getFullYear() &&
      today.getMonth() === selected.getMonth() &&
      today.getDate() === selected.getDate()
    )
  }

  const getBookingInfo = (staffMember, timeSlot, date, dayBookings) => {
    const roundToNearestSlot = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      const totalMinutes = hours * 60 + minutes
      const roundedMinutes = Math.floor(totalMinutes / 15) * 15
      const roundedHours = Math.floor(roundedMinutes / 60)
      const remainingMinutes = roundedMinutes % 60
      return `${String(roundedHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`
    }

    const booking = dayBookings.find((booking) => {
      const bookingSlot = roundToNearestSlot(booking.time)
      const bookingStaffId = parseInt(booking.staffId)
      const staffMemberId = parseInt(staffMember.id)

      let staffMatch = false
      if (booking.staffId === undefined || booking.staffId === null) {
        staffMatch = staffMemberId === 2
      } else {
        staffMatch = bookingStaffId === staffMemberId
      }

      return staffMatch && bookingSlot === timeSlot
    })

    if (!booking) return null

    const startMinutes = timeToMinutes(booking.time)
    const endMinutes = timeToMinutes(booking.endTime)
    const durationMinutes = endMinutes - startMinutes
    const slotsSpanned = Math.ceil(durationMinutes / 15)

    return {
      booking,
      slotsSpanned,
    }
  }

  // Add this helper function with your other helper functions
  const areAllServicesAssignedToStaff = () => {
    if (createFormData.numClients > 1) {
      // For multiple clients, all services must have staff assigned
      return createFormData.selectedServices.every(
        (serviceInstance) => createFormData.serviceStaffAssignments[serviceInstance.instanceId]
      )
    } else if (
      createFormData.createSeparateBookings &&
      createFormData.selectedServices.length > 1
    ) {
      // For single client with separate bookings, all services must have staff assigned
      return createFormData.selectedServices.every(
        (serviceInstance) => createFormData.serviceStaffAssignments[serviceInstance.instanceId]
      )
    } else {
      // For single client with combined booking, just need one staff member
      return !!createFormData.staffId
    }
  }

  const handleCreateBooking = async (e) => {
    e.preventDefault()
    setIsCreating(true)

    try {
      if (!createFormData.selectedServices || createFormData.selectedServices.length === 0) {
        alert('Please select at least one service')
        setIsCreating(false)
        return
      }

      if (!createFormData.clientId && !createFormData.phone.trim()) {
        alert('Please either select a client or enter a phone number')
        setIsCreating(false)
        return
      }

      // Check if multi-client booking has all services assigned
      if (createFormData.numClients > 1 && !areAllServicesAssigned()) {
        alert('Please assign all services to clients')
        setIsCreating(false)
        return
      }

      // Multi-client booking logic
      if (createFormData.numClients > 1) {
        // Create separate bookings for each client
        for (let clientIndex = 0; clientIndex < createFormData.numClients; clientIndex++) {
          const clientServices = getServicesForClient(clientIndex)

          if (clientServices.length === 0) continue // Skip if no services for this client

          let currentStartTime = createFormData.startTime

          // Create booking for each service for this client
          for (const serviceInstance of clientServices) {
            const service = serviceInstance.service // Direct access to service object
            const staffId = createFormData.serviceStaffAssignments[serviceInstance.instanceId] // Use instanceId for staff assignments

            const startDateTime = createLocalDateTime(selectedDate, currentStartTime)
            const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000)

            const formattedStartTime = formatDateForDatabase(startDateTime)
            const formattedEndTime = formatDateForDatabase(endDateTime)

            const regularPriceStr = service.regularPrice ? String(service.regularPrice) : '0'
            const discountStr = service.discount ? String(service.discount) : '0'
            const hasPlus = regularPriceStr.includes('+')
            const regularPriceNum = parseFloat(regularPriceStr.replace('+', ''))
            const discountNum = parseFloat(discountStr.replace('+', ''))
            const priceValue = hasPlus
              ? `${regularPriceNum - discountNum}+`
              : `${regularPriceNum - discountNum}`

            const bookingData = {
              date: selectedDate,
              startTime: formattedStartTime,
              endTime: formattedEndTime,
              numClients: 1, // Each booking is for one client
              price: priceValue,
              totalPrice: priceValue,
              status: createFormData.status,
              notes: `${createFormData.notes}${createFormData.notes ? ' | ' : ''}Client ${
                clientIndex + 1
              } of ${createFormData.numClients}`,
              serviceIds: [parseInt(serviceInstance.serviceId)], // Use serviceInstance.serviceId
              serviceId: parseInt(serviceInstance.serviceId), // Use serviceInstance.serviceId
              isPaid: false,
              extrasPrice: 0,
              staffId: parseInt(staffId),
            }

            if (createFormData.clientId) {
              bookingData.clientId = parseInt(createFormData.clientId)
            } else {
              bookingData.name = `${createFormData.name || 'Client'} ${clientIndex + 1}`
              bookingData.phone = createFormData.phone
            }

            await createBooking(bookingData)
            currentStartTime = calculateEndTime(currentStartTime, service.duration)
          }
        }
      } else {
        // Single client booking (existing logic)
        if (
          createFormData.createSeparateBookings &&
          createFormData.selectedServices &&
          createFormData.selectedServices.length > 1
        ) {
          const unassignedServices = createFormData.selectedServices.filter(
            (serviceInstance) => !createFormData.serviceStaffAssignments[serviceInstance.instanceId]
          )

          if (unassignedServices.length > 0) {
            alert('Please assign a staff member to each service')
            setIsCreating(false)
            return
          }

          let currentStartTime = createFormData.startTime

          for (const serviceInstance of createFormData.selectedServices) {
            const service = serviceInstance.service // Changed: Direct access instead of find
            const staffId = createFormData.serviceStaffAssignments[serviceInstance.instanceId] // Changed: Use instanceId

            const startDateTime = createLocalDateTime(selectedDate, currentStartTime)
            const endDateTime = new Date(startDateTime.getTime() + service.duration * 60000)

            const formattedStartTime = formatDateForDatabase(startDateTime)
            const formattedEndTime = formatDateForDatabase(endDateTime)

            const regularPriceStr = service.regularPrice ? String(service.regularPrice) : '0'
            const discountStr = service.discount ? String(service.discount) : '0'
            const hasPlus = regularPriceStr.includes('+')
            const regularPriceNum = parseFloat(regularPriceStr.replace('+', ''))
            const discountNum = parseFloat(discountStr.replace('+', ''))
            const priceValue = hasPlus
              ? `${regularPriceNum - discountNum}+`
              : `${regularPriceNum - discountNum}`

            const bookingData = {
              date: selectedDate,
              startTime: formattedStartTime,
              endTime: formattedEndTime,
              numClients: parseInt(createFormData.numClients),
              price: priceValue,
              totalPrice: priceValue,
              status: createFormData.status,
              notes: createFormData.notes,
              serviceIds: [parseInt(serviceInstance.serviceId)], // Changed: Use serviceInstance.serviceId
              serviceId: parseInt(serviceInstance.serviceId), // Changed: Use serviceInstance.serviceId
              isPaid: false,
              extrasPrice: 0,
              staffId: parseInt(staffId),
            }

            if (createFormData.clientId) {
              bookingData.clientId = parseInt(createFormData.clientId)
            } else {
              bookingData.name = createFormData.name || null
              bookingData.phone = createFormData.phone
            }

            await createBooking(bookingData)
            currentStartTime = calculateEndTime(currentStartTime, service.duration)
          }
        } else {
          // Combined booking
          const startDateTime = createLocalDateTime(selectedDate, createFormData.startTime)
          const endDateTime = new Date(
            startDateTime.getTime() + selectedServicesInfo.totalDuration * 60000
          )

          const formattedStartTime = formatDateForDatabase(startDateTime)
          const formattedEndTime = formatDateForDatabase(endDateTime)

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
            serviceIds: createFormData.selectedServices.map((instance) =>
              parseInt(instance.serviceId)
            ),
            serviceId:
              createFormData.selectedServices.length === 1
                ? parseInt(createFormData.selectedServices[0].serviceId)
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

          await createBooking(bookingData)
        }
      }

      closeModal()
      setCreateFormData({
        clientId: '',
        name: '',
        phone: '',
        selectedServices: [], // Changed from selectedServiceIds
        startTime: '',
        staffId: '',
        numClients: 1,
        notes: '',
        status: 'confirmed',
        serviceStaffAssignments: {},
        createSeparateBookings: false,
        clientServiceAssignments: {},
      })

      setSearchParams({ date: selectedDate, view: 'day' })

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

  if (
    isLoading ||
    staffLoading ||
    servicesLoading ||
    clientsLoading ||
    workingStaffLoading ||
    absencesLoading
  )
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

  if (workingStaffError) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#ef4444' }}>
        Error loading working staff: {workingStaffError.message}
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

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

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
    const staffGridColumns =
      workingStaff.length > 0 ? workingStaff.map(() => '160px').join(' ') : '200px'
    const currentTimePosition = getCurrentTimePosition()
    const showCurrentTimeLine = isSelectedDateToday() && currentTimePosition !== null

    return (
      <div
        style={{
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
          backgroundColor: 'white',
        }}
      >
        {/* Day View Header */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1600px',
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                justifyContent: 'flex-start',
              }}
            >
              <button
                onClick={() => setView('calendar')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'transparent',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#2563eb',
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#f0f8ff')}
                onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                ← Back to Calendar
              </button>
            </div>

            <h1
              style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: 0,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              Bookings for{' '}
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </h1>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => setShowLeaveModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                onMouseOut={(e) => (e.target.style.backgroundColor = '#dc2626')}
              >
                + Add Leave
              </button>
              <button
                onClick={() => setShowShiftModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#047857')}
                onMouseOut={(e) => (e.target.style.backgroundColor = '#059669')}
              >
                + Add Staff Shift
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#1d4ed8')}
                onMouseOut={(e) => (e.target.style.backgroundColor = '#2563eb')}
              >
                + Create Booking
              </button>
              <div style={{ fontSize: '14px', color: '#666' }}>
                Total bookings: {dayBookings.length}
              </div>
            </div>
          </div>
        </div>

        {/* Working Staff Banner */}
        {workingStaff.length > 0 && (
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: '#f0f9ff',
              borderBottom: '1px solid #bfdbfe',
              fontSize: '14px',
              color: '#1e40af',
              textAlign: 'center',
            }}
          >
            <span style={{ fontWeight: '600' }}>👥 Working Staff ({workingStaff.length})</span>
            <span style={{ fontSize: '12px', marginLeft: '16px', opacity: 0.8 }}>
              📅 = Specific shift (click 🗑️ to delete) | 🔄 = Recurring weekly shift
            </span>
          </div>
        )}

        {/* Staff on Leave Banner */}
        {staffAbsences.length > 0 && (
          <div
            style={{
              padding: '12px 24px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fecaca',
              fontSize: '14px',
              color: '#991b1b',
              textAlign: 'center',
            }}
          >
            <span style={{ fontWeight: '600' }}>🏠 Staff on Leave ({staffAbsences.length}): </span>
            {staffAbsences.map((absence, index) => (
              <span key={absence.id}>
                {absence.staff?.name || 'Unknown'} ({absence.absenceType})
                {index < staffAbsences.length - 1 && ', '}
              </span>
            ))}
          </div>
        )}

        {/* No Staff Message */}
        {workingStaff.length === 0 && staffAbsences.length === 0 && (
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fecaca',
              fontSize: '14px',
              color: '#991b1b',
              textAlign: 'center',
            }}
          >
            <span style={{ fontWeight: '600' }}>⚠️ No staff scheduled for this date</span>
            <span style={{ marginLeft: '16px', opacity: 0.8 }}>
              Click "Add Staff Shift" to schedule staff for this day
            </span>
          </div>
        )}

        {/* Only Staff on Leave Message */}
        {workingStaff.length === 0 && staffAbsences.length > 0 && (
          <div
            style={{
              padding: '16px 24px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fecaca',
              fontSize: '14px',
              color: '#991b1b',
              textAlign: 'center',
            }}
          >
            <span style={{ fontWeight: '600' }}>
              ⚠️ No staff available - all scheduled staff are on leave
            </span>
            <span style={{ marginLeft: '16px', opacity: 0.8 }}>
              Add more staff shifts or check staff availability
            </span>
          </div>
        )}

        {/* Drag Instruction Banner */}
        {isDragging && (
          <div
            style={{
              padding: '8px 16px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              textAlign: 'center',
              fontSize: '13px',
              fontWeight: '500',
              borderBottom: '1px solid #93c5fd',
            }}
          >
            🖱️ Drag to a different time slot or staff member to reschedule the booking
          </div>
        )}

        {/* Scrollable Content Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'scroll',
            overflowX: 'auto',
            position: 'relative',
            backgroundColor: '#f9fafb',
            WebkitOverflowScrolling: 'touch',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              padding: '24px',
              width: 'fit-content',
              maxWidth: '1600px',
              minHeight: '100%',
              position: 'relative',
            }}
          >
            {/* Current Time Line */}
            {showCurrentTimeLine && (
              <div
                style={{
                  position: 'absolute',
                  top: `${currentTimePosition + 125}px`,
                  left: 0,
                  right: 0,
                  height: '2px',
                  backgroundColor: '#ef4444',
                  zIndex: 40,
                  pointerEvents: 'none',
                  boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: '8px',
                    top: '-10px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '-4px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: '#ef4444',
                    borderRadius: '50%',
                    border: '2px solid white',
                  }}
                />
              </div>
            )}

            {/* Time/Staff Header - STICKY */}
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                backgroundColor: 'white',
                borderBottom: '2px solid #e5e7eb',
                display: 'grid',
                gridTemplateColumns: `100px ${staffGridColumns}`,
                width: 'fit-content',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  fontWeight: '600',
                  fontSize: '14px',
                  borderRight: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                Time / Staff
              </div>
              {workingStaff.length > 0 ? (
                workingStaff.map((staffMember) => {
                  const staffName = staffMember.name || staffMember.id
                  const hasSpecificShift = staffMember.hasSpecificShift
                  const hasRecurringShift = staffMember.hasRecurringShift
                  const specificShifts =
                    staffMember.shifts?.filter((shift) => shift.specificDate) || []

                  return (
                    <div
                      key={staffMember.id}
                      style={{
                        padding: '12px 8px',
                        fontWeight: '600',
                        fontSize: '13px',
                        textAlign: 'center',
                        borderRight: '1px solid #e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        backgroundColor: hasSpecificShift ? '#f0fdf4' : 'white',
                        position: 'relative',
                      }}
                    >
                      <span style={{ fontSize: '12px' }}>👤</span>
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                        }}
                      >
                        {staffName}
                      </span>
                      {hasSpecificShift && (
                        <span style={{ fontSize: '10px', color: '#059669' }}>📅</span>
                      )}
                      {hasRecurringShift && (
                        <span style={{ fontSize: '10px', color: '#2563eb' }}>🔄</span>
                      )}

                      {/* Delete icon for staff with specific shifts */}
                      {hasSpecificShift && specificShifts.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // If multiple specific shifts, show confirmation for all
                            if (specificShifts.length === 1) {
                              handleDeleteShift(specificShifts[0], staffName)
                            } else {
                              const confirmMessage = `${staffName} has ${specificShifts.length} specific shifts today. Delete all specific shifts for this date?`
                              if (window.confirm(confirmMessage)) {
                                // Delete all specific shifts for this staff member
                                specificShifts.forEach((shift) => {
                                  handleDeleteShift(shift, staffName)
                                })
                              }
                            }
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: '12px',
                            padding: '2px',
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '16px',
                            height: '16px',
                            transition: 'all 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#fee2e2'
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent'
                          }}
                          title={`Delete ${staffName}'s specific shift${
                            specificShifts.length > 1 ? 's' : ''
                          } for this date`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <div
                  style={{
                    padding: '12px 8px',
                    fontWeight: '600',
                    fontSize: '13px',
                    textAlign: 'center',
                    borderRight: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#6b7280',
                  }}
                >
                  No staff scheduled
                </div>
              )}
            </div>

            {/* Time Slots */}
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `100px ${staffGridColumns}`,
                  borderBottom: '1px solid #e5e7eb',
                  minHeight: '40px',
                  width: 'fit-content',
                }}
              >
                <div
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#666',
                    borderRight: '1px solid #e5e7eb',
                    backgroundColor: 'white',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {timeSlot}
                </div>
                {workingStaff.length > 0 ? (
                  workingStaff.map((staffMember) => {
                    const bookingInfo = getBookingInfo(
                      staffMember,
                      timeSlot,
                      selectedDate,
                      dayBookings
                    )

                    const isDropTarget =
                      dragTarget?.staff?.id === staffMember.id && dragTarget?.time === timeSlot

                    return (
                      <div
                        key={`${staffMember.id}-${timeSlot}`}
                        style={{
                          position: 'relative',
                          borderRight: '1px solid #e5e7eb',
                          backgroundColor: isDropTarget ? '#dbeafe' : 'white',
                          minHeight: '40px',
                          transition: 'background-color 0.2s ease',
                        }}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, staffMember, timeSlot)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, staffMember, timeSlot)}
                      >
                        {bookingInfo ? (
                          <div
                            draggable="true"
                            onDragStart={(e) =>
                              handleDragStart(e, bookingInfo.booking, staffMember, timeSlot)
                            }
                            onDragEnd={handleDragEnd}
                            style={{
                              backgroundColor: getBookingColor(
                                bookingInfo.booking,
                                bookingInfo.booking.status
                              ),
                              color: 'white',
                              cursor: 'grab',
                              transition: 'all 0.2s ease',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: `calc(${bookingInfo.slotsSpanned * 40}px - 2px)`,
                              zIndex: 10,
                              padding: '6px 8px',
                              borderRadius: '4px',
                              margin: '2px',
                              boxShadow:
                                '0 2px 4px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)',
                            }}
                            onClick={() => handleBookingClick(bookingInfo.booking)}
                            onMouseOver={(e) => {
                              if (!isDragging) {
                                e.currentTarget.style.transform = 'scale(1.02)'
                                e.currentTarget.style.boxShadow =
                                  '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)'
                              }
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.transform = 'scale(1)'
                              e.currentTarget.style.boxShadow =
                                '0 2px 4px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1)'
                            }}
                            title="Drag to reschedule or click to view details"
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
                              {bookingInfo.booking.service}
                            </div>
                            <div
                              style={{
                                fontSize: '10px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                lineHeight: '1.2',
                                opacity: 0.9,
                                marginTop: '2px',
                              }}
                            >
                              {bookingInfo.booking.client}
                            </div>
                            {bookingInfo.booking.notes &&
                              bookingInfo.booking.notes.trim() !== '' && (
                                <div
                                  style={{
                                    fontSize: '10px',
                                    overflow: 'hidden',
                                    fontWeight: 'bold',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    lineHeight: '1.2',
                                    color: 'yellow',
                                  }}
                                >
                                  {bookingInfo.booking.notes}
                                </div>
                              )}
                            {bookingInfo.booking.numClients > 1 && (
                              <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                                ({bookingInfo.booking.numClients} clients)
                              </div>
                            )}
                            <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
                              {bookingInfo.booking.time} - {bookingInfo.booking.endTime}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: '40px',
                              color: '#d1d5db',
                              fontSize: '12px',
                            }}
                          >
                            -
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div
                    key={`empty-${timeSlot}`}
                    style={{
                      borderRight: '1px solid #e5e7eb',
                      backgroundColor: 'white',
                      minHeight: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      fontSize: '12px',
                    }}
                  >
                    -
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Day Summary */}
          <div style={{ padding: '24px', backgroundColor: '#f9fafb' }}>
            <div
              style={{
                backgroundColor: '#dbeafe',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '4px' }}>
                📅 Total Bookings
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e3a8a' }}>
                {dayBookings.length}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#f0fdf4',
                padding: '16px',
                borderRadius: '8px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '14px', color: '#065f46', marginBottom: '4px' }}>
                👥 Working Staff
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#065f46' }}>
                {workingStaff.length}
              </div>
            </div>
          </div>
        </div>

        {/* Create Booking Modal */}
        {showCreateModal && workingStaff.length > 0 && (
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

                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Number of Clients *</label>
                  <select
                    style={calendarStyles.select}
                    value={createFormData.numClients}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({ ...prev, numClients: e.target.value }))
                    }
                    required
                  >
                    <option value="1">1 Client</option>
                    <option value="2">2 Clients</option>
                    <option value="3">3 Clients</option>
                    <option value="4">4 Clients</option>
                    <option value="5">5 Clients</option>
                  </select>
                </div>

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
                  <label style={calendarStyles.label}>Services (Click to Add Multiple)</label>

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
                        <div
                          key={service.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            backgroundColor: 'transparent',
                            border: '1px solid #e5e7eb',
                          }}
                          onClick={() => handleServiceSelection(service.id.toString())}
                        >
                          <button
                            type="button"
                            style={{
                              marginRight: '8px',
                              padding: '4px 8px',
                              fontSize: '12px',
                              backgroundColor: '#2563eb',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            + Add
                          </button>
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
                              {service.duration} min - ${service.regularPrice}
                            </div>
                          </div>
                        </div>
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
                        No services found matching '{serviceSearchTerm}'
                      </div>
                    )}
                  </div>

                  {/* Selected Services Display */}
                  {createFormData.selectedServices.length > 0 && (
                    <div
                      style={{
                        marginTop: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '12px',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: '14px' }}>
                        Selected Services ({createFormData.selectedServices.length}):
                      </div>
                      {createFormData.selectedServices.map((serviceInstance, index) => (
                        <div
                          key={serviceInstance.instanceId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '6px 0',
                            borderBottom:
                              index < createFormData.selectedServices.length - 1
                                ? '1px solid #e5e7eb'
                                : 'none',
                          }}
                        >
                          <span style={{ fontSize: '13px' }}>
                            {serviceInstance.service.name} ({serviceInstance.service.duration} min)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveServiceInstance(serviceInstance.instanceId)}
                            style={{
                              color: '#dc2626',
                              backgroundColor: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: '2px 6px',
                            }}
                          >
                            ✕ Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Client-Service Assignment for Multiple Clients */}
                {createFormData.numClients > 1 && createFormData.selectedServices.length > 0 && (
                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Assign Services to Clients *</label>
                    <div
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '12px',
                        backgroundColor: 'white',
                      }}
                    >
                      {createFormData.selectedServices.map((serviceInstance, index) => (
                        <div
                          key={serviceInstance.instanceId}
                          style={{
                            marginBottom:
                              index < createFormData.selectedServices.length - 1 ? '12px' : '0',
                            paddingBottom:
                              index < createFormData.selectedServices.length - 1 ? '12px' : '0',
                            borderBottom:
                              index < createFormData.selectedServices.length - 1
                                ? '1px solid #e5e7eb'
                                : 'none',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              marginBottom: '6px',
                              color: '#374151',
                            }}
                          >
                            {serviceInstance.service.name} ({serviceInstance.service.duration} min)
                            <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                              Instance #{index + 1}
                            </span>
                          </div>
                          <select
                            style={calendarStyles.select}
                            value={
                              createFormData.clientServiceAssignments[
                                serviceInstance.instanceId
                              ]?.toString() || ''
                            }
                            onChange={(e) =>
                              handleClientServiceAssignment(
                                serviceInstance.instanceId,
                                parseInt(e.target.value)
                              )
                            }
                            required
                          >
                            <option value="">Assign to client...</option>
                            {Array.from({ length: createFormData.numClients }, (_, i) => (
                              <option key={i} value={i.toString()}>
                                Client {i + 1}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}

                      {/* Assignment Summary */}
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                        <strong>Assignment Summary:</strong>
                        {Array.from({ length: createFormData.numClients }, (_, i) => {
                          const clientServices = createFormData.selectedServices.filter(
                            (serviceInstance) =>
                              createFormData.clientServiceAssignments[
                                serviceInstance.instanceId
                              ] === i
                          )

                          return (
                            <div key={i} style={{ marginTop: '4px' }}>
                              Client {i + 1}:{' '}
                              {clientServices.length > 0
                                ? clientServices.map((s) => s.service.name).join(', ')
                                : 'No services assigned'}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Multiple Bookings Toggle */}
                {createFormData.selectedServices && createFormData.selectedServices.length > 1 && (
                  <div
                    style={{
                      ...calendarStyles.formGroup,
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={createFormData.createSeparateBookings}
                        onChange={(e) =>
                          setCreateFormData((prev) => ({
                            ...prev,
                            createSeparateBookings: e.target.checked,
                          }))
                        }
                        style={{ marginRight: '8px', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontWeight: '600' }}>
                        Create separate bookings for each service
                      </span>
                    </label>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#1e40af',
                        marginTop: '6px',
                        marginLeft: '24px',
                      }}
                    >
                      {createFormData.createSeparateBookings
                        ? '✓ Services will be scheduled consecutively with individual staff assignments'
                        : 'All services will be combined in one booking'}
                    </div>
                  </div>
                )}

                {/* Staff Assignment Section - Updated for Multi-Client */}
                {createFormData.numClients > 1 ? (
                  // Show individual service-staff assignments for multiple clients
                  createFormData.selectedServices &&
                  createFormData.selectedServices.length > 0 && (
                    <div style={calendarStyles.formGroup}>
                      <label style={calendarStyles.label}>Assign Staff to Each Service *</label>
                      <div
                        style={{
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          padding: '12px',
                          backgroundColor: 'white',
                        }}
                      >
                        {createFormData.selectedServices.map((serviceInstance, index) => {
                          const service = serviceInstance.service
                          if (!service) return null

                          return (
                            <div
                              key={serviceInstance.instanceId}
                              style={{
                                marginBottom:
                                  index < createFormData.selectedServices.length - 1 ? '12px' : '0',
                                paddingBottom:
                                  index < createFormData.selectedServices.length - 1 ? '12px' : '0',
                                borderBottom:
                                  index < createFormData.selectedServices.length - 1
                                    ? '1px solid #e5e7eb'
                                    : 'none',
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  marginBottom: '6px',
                                  color: '#374151',
                                }}
                              >
                                {service.name} ({service.duration} min)
                                <span
                                  style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}
                                >
                                  Instance #{index + 1}
                                </span>
                              </div>
                              <select
                                style={calendarStyles.select}
                                value={
                                  createFormData.serviceStaffAssignments[
                                    serviceInstance.instanceId
                                  ] || ''
                                }
                                onChange={(e) =>
                                  handleServiceStaffAssignment(
                                    serviceInstance.instanceId,
                                    e.target.value
                                  )
                                }
                                required
                              >
                                <option value="">Select staff member</option>
                                {workingStaff.map((staffMember) => (
                                  <option key={staffMember.id} value={staffMember.id}>
                                    {staffMember.name || staffMember.id}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )
                        })}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                        💡 Each service must have a staff member assigned for multiple clients
                      </div>
                    </div>
                  )
                ) : // Show single staff selection for single client (existing logic)
                createFormData.createSeparateBookings &&
                  createFormData.selectedServices &&
                  createFormData.selectedServices.length > 1 ? (
                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Assign Staff to Each Service *</label>
                    <div
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        padding: '12px',
                        backgroundColor: 'white',
                      }}
                    >
                      {createFormData.selectedServices.map((serviceInstance, index) => {
                        const service = serviceInstance.service
                        if (!service) return null

                        return (
                          <div
                            key={serviceInstance.instanceId}
                            style={{
                              marginBottom:
                                index < createFormData.selectedServices.length - 1 ? '12px' : '0',
                              paddingBottom:
                                index < createFormData.selectedServices.length - 1 ? '12px' : '0',
                              borderBottom:
                                index < createFormData.selectedServices.length - 1
                                  ? '1px solid #e5e7eb'
                                  : 'none',
                            }}
                          >
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                marginBottom: '6px',
                                color: '#374151',
                              }}
                            >
                              {service.name} ({service.duration} min)
                              <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                                Instance #{index + 1}
                              </span>
                            </div>
                            <select
                              style={calendarStyles.select}
                              value={
                                createFormData.serviceStaffAssignments[
                                  serviceInstance.instanceId
                                ] || ''
                              }
                              onChange={(e) =>
                                handleServiceStaffAssignment(
                                  serviceInstance.instanceId,
                                  e.target.value
                                )
                              }
                              required
                            >
                              <option value="">Select staff member</option>
                              {workingStaff.map((staffMember) => (
                                <option key={staffMember.id} value={staffMember.id}>
                                  {staffMember.name || staffMember.id}
                                </option>
                              ))}
                            </select>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                      💡 Services will be scheduled back-to-back starting from the selected time
                    </div>
                  </div>
                ) : (
                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Staff Member *</label>
                    <select
                      style={calendarStyles.select}
                      value={createFormData.staffId}
                      onChange={(e) => {
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
                )}

                {/* Replace your existing Start Time section with this FIXED version: */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>
                      {/* Start Time Section - Updated for Multi-Client */}
                      {createFormData.numClients > 1 ? (
                        // Multiple clients - individual start times
                        <div style={calendarStyles.formGroup}>
                          <label style={calendarStyles.label}>Start Times for Each Client *</label>
                          <div
                            style={{
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              padding: '12px',
                              backgroundColor: 'white',
                            }}
                          >
                            {Array.from({ length: createFormData.numClients }, (_, clientIndex) => {
                              const clientServices = getServicesForClient(clientIndex)
                              const allServicesHaveStaff = clientServices.every(
                                (serviceInstance) =>
                                  createFormData.serviceStaffAssignments[serviceInstance.instanceId]
                              )

                              let availableSlots = []
                              if (allServicesHaveStaff && clientServices.length > 0) {
                                const currentDayBookings = bookingsByDate[selectedDate] || []
                                availableSlots = getAvailableTimeSlotsForConsecutiveBookings(
                                  clientServices,
                                  createFormData.serviceStaffAssignments,
                                  currentDayBookings,
                                  services,
                                  selectedDate
                                )
                              }

                              return (
                                <div
                                  key={clientIndex}
                                  style={{
                                    marginBottom:
                                      clientIndex < createFormData.numClients - 1 ? '16px' : '0',
                                    paddingBottom:
                                      clientIndex < createFormData.numClients - 1 ? '16px' : '0',
                                    borderBottom:
                                      clientIndex < createFormData.numClients - 1
                                        ? '1px solid #e5e7eb'
                                        : 'none',
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: '14px',
                                      fontWeight: '600',
                                      marginBottom: '8px',
                                      color: '#374151',
                                    }}
                                  >
                                    Client {clientIndex + 1} Start Time
                                    {clientServices.length > 0 && (
                                      <span
                                        style={{
                                          fontSize: '12px',
                                          fontWeight: '400',
                                          color: '#666',
                                          marginLeft: '8px',
                                        }}
                                      >
                                        ({clientServices.map((s) => s.service.name).join(', ')})
                                      </span>
                                    )}
                                  </div>

                                  <select
                                    style={calendarStyles.select}
                                    value={createFormData.clientStartTimes[clientIndex] || ''}
                                    onChange={(e) =>
                                      handleClientStartTimeAssignment(clientIndex, e.target.value)
                                    }
                                    required
                                    disabled={!allServicesHaveStaff || clientServices.length === 0}
                                  >
                                    <option value="">Select start time</option>
                                    {availableSlots.map((time) => (
                                      <option key={time} value={time}>
                                        {time}
                                      </option>
                                    ))}
                                  </select>

                                  {/* Status message for each client */}
                                  <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                    {clientServices.length === 0 ? (
                                      <span style={{ color: '#dc2626' }}>
                                        ⚠️ No services assigned to this client
                                      </span>
                                    ) : !allServicesHaveStaff ? (
                                      <span style={{ color: '#dc2626' }}>
                                        ⚠️ Assign staff to all services first
                                      </span>
                                    ) : availableSlots.length === 0 ? (
                                      <span style={{ color: '#dc2626' }}>
                                        ⚠️ No available time slots
                                      </span>
                                    ) : (
                                      <span style={{ color: '#059669' }}>
                                        ✓ {availableSlots.length} time slot
                                        {availableSlots.length !== 1 ? 's' : ''} available
                                      </span>
                                    )}
                                  </div>

                                  {/* Show estimated end time */}
                                  {createFormData.clientStartTimes[clientIndex] &&
                                    clientServices.length > 0 && (
                                      <div
                                        style={{
                                          fontSize: '11px',
                                          color: '#666',
                                          marginTop: '4px',
                                        }}
                                      >
                                        Estimated end time:{' '}
                                        {(() => {
                                          const totalDuration = clientServices.reduce(
                                            (sum, serviceInstance) =>
                                              sum + serviceInstance.service.duration,
                                            0
                                          )
                                          return calculateEndTime(
                                            createFormData.clientStartTimes[clientIndex],
                                            totalDuration
                                          )
                                        })()}
                                      </div>
                                    )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        // Single client - existing logic
                        <div
                          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}
                        >
                          <div style={calendarStyles.formGroup}>
                            <label style={calendarStyles.label}>
                              {createFormData.createSeparateBookings &&
                              createFormData.selectedServices &&
                              createFormData.selectedServices.length > 1
                                ? 'Start Time (for first service)'
                                : 'Start Time'}
                            </label>
                            <select
                              style={calendarStyles.select}
                              value={createFormData.startTime}
                              onChange={(e) =>
                                setCreateFormData((prev) => ({
                                  ...prev,
                                  startTime: e.target.value,
                                }))
                              }
                              required
                            >
                              <option value="">Select time</option>
                              {(() => {
                                let availableSlots = []
                                const currentDayBookings = bookingsByDate[selectedDate] || []

                                if (
                                  createFormData.createSeparateBookings &&
                                  createFormData.selectedServices &&
                                  createFormData.selectedServices.length > 1
                                ) {
                                  availableSlots = getAvailableTimeSlotsForConsecutiveBookings(
                                    createFormData.selectedServices,
                                    createFormData.serviceStaffAssignments,
                                    currentDayBookings,
                                    services,
                                    selectedDate
                                  )
                                } else {
                                  availableSlots = timeSlots.filter((timeSlot) => {
                                    return isTimeSlotAvailable(
                                      timeSlot,
                                      createFormData.staffId,
                                      currentDayBookings,
                                      selectedDate,
                                      selectedServicesInfo.totalDuration
                                    )
                                  })
                                }

                                return availableSlots.map((time) => (
                                  <option key={time} value={time}>
                                    {time}
                                  </option>
                                ))
                              })()}
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
                      )}
                    </label>
                    <select
                      style={calendarStyles.select}
                      value={createFormData.startTime}
                      onChange={(e) =>
                        setCreateFormData((prev) => ({ ...prev, startTime: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select time</option>
                      {(() => {
                        let availableSlots = []
                        const currentDayBookings = bookingsByDate[selectedDate] || [] // FIX: Get day bookings

                        if (
                          createFormData.createSeparateBookings &&
                          createFormData.selectedServices &&
                          createFormData.selectedServices.length > 1
                        ) {
                          // For separate bookings - check consecutive availability
                          availableSlots = getAvailableTimeSlotsForConsecutiveBookings(
                            createFormData.selectedServices,
                            createFormData.serviceStaffAssignments,
                            currentDayBookings,
                            services,
                            selectedDate
                          )
                        } else {
                          // For single booking - filter by staff availability
                          availableSlots = timeSlots.filter((timeSlot) => {
                            return isTimeSlotAvailable(
                              timeSlot,
                              createFormData.staffId,
                              currentDayBookings, // FIX: Use currentDayBookings
                              selectedDate,
                              selectedServicesInfo.totalDuration
                            )
                          })
                        }

                        return availableSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))
                      })()}
                    </select>

                    {/* Show helpful messages */}
                    {(() => {
                      let availableCount = 0
                      const currentDayBookings = bookingsByDate[selectedDate] || [] // FIX: Get day bookings

                      if (
                        createFormData.createSeparateBookings &&
                        createFormData.selectedServices &&
                        createFormData.selectedServices.length > 1
                      ) {
                        availableCount = getAvailableTimeSlotsForConsecutiveBookings(
                          createFormData.selectedServices,
                          createFormData.serviceStaffAssignments,
                          currentDayBookings,
                          services,
                          selectedDate
                        ).length
                      } else if (createFormData.staffId) {
                        availableCount = timeSlots.filter((timeSlot) =>
                          isTimeSlotAvailable(
                            timeSlot,
                            createFormData.staffId,
                            currentDayBookings, // FIX: Use currentDayBookings
                            selectedDate,
                            selectedServicesInfo.totalDuration
                          )
                        ).length
                      }

                      if (
                        availableCount === 0 &&
                        (createFormData.staffId ||
                          (createFormData.createSeparateBookings &&
                            Object.keys(createFormData.serviceStaffAssignments).length > 0))
                      ) {
                        return (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#dc2626',
                              marginTop: '4px',
                              padding: '8px',
                              backgroundColor: '#fee2e2',
                              borderRadius: '4px',
                            }}
                          >
                            ⚠️ No available time slots for the selected configuration
                          </div>
                        )
                      } else if (availableCount > 0) {
                        return (
                          <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                            ✓ {availableCount} time slot{availableCount !== 1 ? 's' : ''} available
                          </div>
                        )
                      }

                      return (
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {createFormData.createSeparateBookings
                            ? 'Select staff for all services to see available times'
                            : 'Select a staff member to see available times'}
                        </div>
                      )
                    })()}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                  <button
                    type="submit"
                    disabled={
                      isCreating ||
                      !createFormData.selectedServices ||
                      createFormData.selectedServices.length === 0 ||
                      !areAllServicesAssignedToStaff() ||
                      !areAllClientStartTimesAssigned() || // Add this validation
                      (createFormData.numClients > 1 && !areAllServicesAssigned())
                    }
                    style={{
                      ...calendarStyles.submitButton,
                      ...(isCreating ||
                      !createFormData.selectedServices ||
                      createFormData.selectedServices.length === 0 ||
                      !areAllServicesAssignedToStaff() ||
                      !areAllClientStartTimesAssigned() ||
                      (createFormData.numClients > 1 && !areAllServicesAssigned())
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

        {/* No Staff Warning Modal */}
        {showCreateModal && workingStaff.length === 0 && (
          <div style={calendarStyles.modalOverlay} onClick={closeModal}>
            <div
              style={{ ...calendarStyles.modal, maxWidth: '400px' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ ...calendarStyles.modalHeader, textAlign: 'center' }}>
                ⚠️ No Staff Available
              </div>
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#991b1b', marginBottom: '16px' }}>
                  No staff members are scheduled for this date.
                </p>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  Please add staff shifts first using the &#34;Add Staff Shift&#34; button.
                </p>
              </div>
              <div style={calendarStyles.formButtons}>
                <button type="button" onClick={closeModal} style={calendarStyles.cancelButton}>
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    closeModal()
                    setShowShiftModal(true)
                  }}
                  style={calendarStyles.submitButton}
                >
                  Add Staff Shift
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Staff Shift Modal */}
        {showShiftModal && (
          <div style={calendarStyles.modalOverlay} onClick={closeShiftModal}>
            <div
              style={{
                ...calendarStyles.modal,
                maxWidth: '500px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={calendarStyles.modalHeader}>
                Add Staff Shift for{' '}
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>

              <form onSubmit={handleCreateShift}>
                {/* Staff Selection */}
                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Staff Member *</label>
                  <select
                    style={calendarStyles.select}
                    value={shiftFormData.staffId}
                    onChange={(e) =>
                      setShiftFormData((prev) => ({ ...prev, staffId: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select staff member</option>
                    {staff.map((staffMember) => (
                      <option key={staffMember.id} value={staffMember.id}>
                        {staffMember.name || staffMember.id}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    This will create a specific shift for this date only
                  </div>
                </div>

                {/* Time Selection */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>Start Time *</label>
                    <select
                      style={calendarStyles.select}
                      value={shiftFormData.startTime}
                      onChange={(e) =>
                        setShiftFormData((prev) => ({ ...prev, startTime: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select start time</option>
                      {timeSlots.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={calendarStyles.formGroup}>
                    <label style={calendarStyles.label}>End Time *</label>
                    <select
                      style={calendarStyles.select}
                      value={shiftFormData.endTime}
                      onChange={(e) =>
                        setShiftFormData((prev) => ({ ...prev, endTime: e.target.value }))
                      }
                      required
                    >
                      <option value="">Select end time</option>
                      {timeSlots.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Duration Display */}
                {shiftFormData.startTime && shiftFormData.endTime && (
                  <div
                    style={{
                      ...calendarStyles.formGroup,
                      backgroundColor: '#f0f9ff',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #bfdbfe',
                    }}
                  >
                    <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
                      Shift Duration:{' '}
                      {(() => {
                        const startMinutes = timeToMinutes(shiftFormData.startTime)
                        const endMinutes = timeToMinutes(shiftFormData.endTime)
                        let duration = endMinutes - startMinutes

                        if (duration < 0) duration += 24 * 60 // Handle overnight shifts

                        const hours = Math.floor(duration / 60)
                        const minutes = duration % 60

                        return `${hours}h ${minutes}m`
                      })()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#1e40af', marginTop: '4px' }}>
                      📅 This is a specific date shift (one-time only)
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Notes (Optional)</label>
                  <textarea
                    style={{
                      ...calendarStyles.input,
                      minHeight: '80px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                    value={shiftFormData.notes}
                    onChange={(e) =>
                      setShiftFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Add any notes about this shift..."
                  />
                </div>

                {/* Validation Warning */}
                {shiftFormData.startTime &&
                  shiftFormData.endTime &&
                  shiftFormData.startTime >= shiftFormData.endTime && (
                    <div
                      style={{
                        padding: '12px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#991b1b',
                        fontSize: '14px',
                        marginBottom: '16px',
                      }}
                    >
                      ⚠️ End time must be after start time
                    </div>
                  )}

                {/* Action Buttons */}
                <div style={calendarStyles.formButtons}>
                  <button
                    type="button"
                    onClick={closeShiftModal}
                    style={calendarStyles.cancelButton}
                    disabled={isCreatingShift}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isCreatingShift ||
                      !shiftFormData.staffId ||
                      !shiftFormData.startTime ||
                      !shiftFormData.endTime ||
                      shiftFormData.startTime >= shiftFormData.endTime
                    }
                    style={{
                      ...calendarStyles.submitButton,
                      backgroundColor: '#059669',
                      ...(isCreatingShift ||
                      !shiftFormData.staffId ||
                      !shiftFormData.startTime ||
                      !shiftFormData.endTime ||
                      shiftFormData.startTime >= shiftFormData.endTime
                        ? { backgroundColor: '#9ca3af', cursor: 'not-allowed' }
                        : {}),
                    }}
                    onMouseOver={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = '#047857'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = '#059669'
                      }
                    }}
                  >
                    {isCreatingShift ? 'Creating Shift...' : 'Create Shift'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Staff Leave Modal */}
        {showLeaveModal && (
          <div style={calendarStyles.modalOverlay} onClick={closeLeaveModal}>
            <div
              style={{
                ...calendarStyles.modal,
                maxWidth: '500px',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={calendarStyles.modalHeader}>
                Add Staff Leave for{' '}
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>

              <form onSubmit={handleCreateLeave}>
                {/* Staff Selection */}
                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Staff Member *</label>
                  <select
                    style={calendarStyles.select}
                    value={leaveFormData.staffId}
                    onChange={(e) =>
                      setLeaveFormData((prev) => ({ ...prev, staffId: e.target.value }))
                    }
                    required
                  >
                    <option value="">Select staff member</option>
                    {staff.map((staffMember) => (
                      <option key={staffMember.id} value={staffMember.id}>
                        {staffMember.name || staffMember.id}
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    This will record an absence for this specific date
                  </div>
                </div>

                {/* Leave Type Selection */}
                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Leave Type *</label>
                  <select
                    style={calendarStyles.select}
                    value={leaveFormData.absenceType}
                    onChange={(e) =>
                      setLeaveFormData((prev) => ({ ...prev, absenceType: e.target.value }))
                    }
                    required
                  >
                    {absenceTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div style={calendarStyles.formGroup}>
                  <label style={calendarStyles.label}>Notes (Optional)</label>
                  <textarea
                    style={{
                      ...calendarStyles.input,
                      minHeight: '80px',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                    value={leaveFormData.notes}
                    onChange={(e) =>
                      setLeaveFormData((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    placeholder="Add any notes about this leave..."
                  />
                </div>

                {/* Leave Summary */}
                {leaveFormData.staffId && (
                  <div
                    style={{
                      ...calendarStyles.formGroup,
                      backgroundColor: '#fef2f2',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '14px',
                        color: '#991b1b',
                        fontWeight: '600',
                        marginBottom: '4px',
                      }}
                    >
                      Leave Summary:
                    </div>
                    <div style={{ fontSize: '13px', color: '#991b1b' }}>
                      {staff.find((s) => s.id === parseInt(leaveFormData.staffId))?.name} will be
                      marked as <strong>{leaveFormData.absenceType}</strong> on{' '}
                      {new Date(selectedDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                    <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>
                      ⚠️ This staff member will not be available for bookings on this date
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={calendarStyles.formButtons}>
                  <button
                    type="button"
                    onClick={closeLeaveModal}
                    style={calendarStyles.cancelButton}
                    disabled={isCreatingLeave}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={
                      isCreatingLeave || !leaveFormData.staffId || !leaveFormData.absenceType
                    }
                    style={{
                      ...calendarStyles.submitButton,
                      backgroundColor: '#dc2626',
                      ...(isCreatingLeave || !leaveFormData.staffId || !leaveFormData.absenceType
                        ? { backgroundColor: '#9ca3af', cursor: 'not-allowed' }
                        : {}),
                    }}
                    onMouseOver={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = '#b91c1c'
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.backgroundColor = '#dc2626'
                      }
                    }}
                  >
                    {isCreatingLeave ? 'Adding Leave...' : 'Add Leave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Calendar View (unchanged from original)
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
