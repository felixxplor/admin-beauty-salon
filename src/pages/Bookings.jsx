import React, { useState, useMemo, useEffect } from 'react'
import { getStaff } from '../services/apiStaff'
import { getServices } from '../services/apiServices'
import { useBookings } from '../features/bookings/useBookings'
import Spinner from '../ui/Spinner'
import { responsiveCalendarStyles, SLOT_HEIGHT } from '../styles/ResponsiveCalendarStyles'
import { createBooking } from '../services/apiBookings'
import { getClient } from '../services/apiClients'
import { useNavigate, useSearchParams } from 'react-router-dom'
import supabase from '../services/supabase'
import { calendarStyles } from '../styles/CalendarStyles'
import {
  CreateBookingModal,
  CreateLeaveModal,
  CreateShiftModal,
  NoStaffWarningModal,
} from '../ui/BookingModals'

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

// Hook to detect device type and screen size
const useDeviceType = () => {
  const [deviceType, setDeviceType] = useState('desktop')
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    const updateDeviceType = () => {
      const width = window.innerWidth
      const height = window.innerHeight

      setScreenSize({ width, height })

      if (width <= 768) {
        setDeviceType('mobile')
      } else if (width <= 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    updateDeviceType()
    window.addEventListener('resize', updateDeviceType)
    window.addEventListener('orientationchange', updateDeviceType)

    return () => {
      window.removeEventListener('resize', updateDeviceType)
      window.removeEventListener('orientationchange', updateDeviceType)
    }
  }, [])

  return { deviceType, screenSize }
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
  const { deviceType, screenSize } = useDeviceType()

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
        serviceDisplay = booking.services.map((s) => s.name).join(' + ')
      } else if (booking.services?.name) {
        serviceDisplay = booking.services.name
      } else if (booking.serviceIds) {
        try {
          const serviceIdsArray = Array.isArray(booking.serviceIds)
            ? booking.serviceIds
            : JSON.parse(booking.serviceIds)

          // Get actual service names with + separator
          if (serviceIdsArray.length > 0 && services && services.length > 0) {
            const serviceNames = serviceIdsArray
              .map((serviceId) => {
                const service = services.find((s) => s.id === parseInt(serviceId))
                return service ? service.name : null
              })
              .filter((name) => name !== null)

            serviceDisplay = serviceNames.length > 0 ? serviceNames.join(' + ') : 'Service'
          } else {
            serviceDisplay =
              serviceIdsArray.length > 1 ? `${serviceIdsArray.length} Services` : 'Service'
          }
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

    // Create custom drag preview
    const dragPreview = document.createElement('div')
    dragPreview.style.cssText = `
    position: absolute;
    top: -1000px;
    left: -1000px;
    background: linear-gradient(135deg, #3b82f6, #1d4ed8);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    min-width: 120px;
    text-align: center;
  `
    dragPreview.innerHTML = `
    <div>📅 ${booking.service}</div>
    <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">
      ${booking.client}
    </div>
  `

    document.body.appendChild(dragPreview)
    e.dataTransfer.setDragImage(dragPreview, 60, 30)

    // Clean up after drag image is captured
    setTimeout(() => {
      document.body.removeChild(dragPreview)
    }, 0)

    e.dataTransfer.effectAllowed = 'move'

    // Style the original element being dragged
    e.currentTarget.style.opacity = '0.5'
    e.currentTarget.style.transform = 'scale(0.95)'
    e.currentTarget.style.cursor = 'grabbing'
  }

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1'
    e.currentTarget.style.cursor = 'grab'
    setDraggedBooking(null)
    setDragTarget(null)
    setIsDragging(false)
  }

  const getDropZoneStatus = (targetStaff, targetTime, draggedBooking, dayBookings) => {
    if (!draggedBooking) return { type: 'none' }

    const { booking } = draggedBooking
    const duration = booking.duration || 60

    // Check if it's the same position
    if (
      targetStaff.id === draggedBooking.originalStaff.id &&
      targetTime === draggedBooking.originalTime
    ) {
      return { type: 'same', message: 'Original position' }
    }

    // Check for scheduling conflicts
    const hasConflict = checkBookingConflict(
      targetStaff,
      targetTime,
      duration,
      booking.id,
      dayBookings
    )

    if (hasConflict) {
      return {
        type: 'conflict',
        message: 'Time conflict',
      }
    }

    // Check if staff is working
    const isStaffWorking = workingStaff.some((staff) => staff.id === targetStaff.id)
    if (!isStaffWorking) {
      return {
        type: 'invalid',
        message: 'Staff not scheduled',
      }
    }

    return { type: 'valid', message: 'Drop here' }
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
    const currentDayBookings = bookingsByDate[selectedDate] || []
    const dropStatus = getDropZoneStatus(
      targetStaff,
      targetTime,
      draggedBooking,
      currentDayBookings
    )

    // Don't do anything if dropping in the same position
    if (dropStatus.type === 'same') {
      setDraggedBooking(null)
      setDragTarget(null)
      setIsDragging(false)
      return
    }

    // Only prevent invalid drops (staff not scheduled)
    if (dropStatus.type === 'invalid') {
      alert(`❌ Cannot move booking: ${dropStatus.message}`)
      setDraggedBooking(null)
      setDragTarget(null)
      setIsDragging(false)
      return
    }

    // Show confirmation modal for all valid drops
    const staffName = targetStaff.name || 'Staff'
    const clientName = booking.client || 'Client'
    const serviceName = booking.service || 'Service'

    let confirmMessage = `Move booking to ${targetTime}?\n\n`
    confirmMessage += `📅 ${serviceName}\n`
    confirmMessage += `👤 ${clientName}\n`
    confirmMessage += `🧑‍⚕️ ${staffName}\n`
    confirmMessage += `⏰ ${targetTime}\n`

    if (dropStatus.type === 'conflict') {
      confirmMessage += `\n⚠️ WARNING: This will create a time conflict with another booking!`
    }

    const confirmDrop = window.confirm(confirmMessage)

    if (!confirmDrop) {
      setDraggedBooking(null)
      setDragTarget(null)
      setIsDragging(false)
      return
    }

    // Proceed with the move
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

      // Clean success notification
      const successMessage =
        dropStatus.type === 'conflict'
          ? '✓ Booking moved successfully (with conflict)'
          : '✓ Booking moved successfully!'

      // Show brief success notification in top-right corner
      const notification = document.createElement('div')
      notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #16a34a;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      animation: slideIn 0.3s ease-out forwards;
    `
      notification.innerHTML = `
      <style>
        @keyframes slideIn {
          to { transform: translateX(0); }
        }
      </style>
      ${successMessage}
    `
      document.body.appendChild(notification)

      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in forwards'
        setTimeout(() => notification.remove(), 300)
      }, 2500)

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
    const pixelsPerMinute = SLOT_HEIGHT[deviceType] / 15
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
    const slotsSpanned = Math.max(1, Math.ceil(durationMinutes / 15))

    console.log('Booking:', booking.service, 'Duration:', durationMinutes, 'Slots:', slotsSpanned) // ADD THIS

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
        console.log('Creating bookings for', createFormData.numClients, 'clients')

        // Validate all data before creating any bookings
        for (let clientIndex = 0; clientIndex < createFormData.numClients; clientIndex++) {
          const clientServices = getServicesForClient(clientIndex)
          const clientStartTime = createFormData.clientStartTimes[clientIndex]

          if (clientServices.length === 0) {
            alert(
              `Client ${
                clientIndex + 1
              } has no services assigned. Please assign services to all clients.`
            )
            setIsCreating(false)
            return
          }

          if (!clientStartTime) {
            alert(
              `Client ${
                clientIndex + 1
              } has no start time selected. Please select start times for all clients.`
            )
            setIsCreating(false)
            return
          }

          // Check if all services have staff assigned
          for (const serviceInstance of clientServices) {
            const staffId = createFormData.serviceStaffAssignments[serviceInstance.instanceId]
            if (!staffId) {
              alert(
                `${serviceInstance.service.name} for Client ${
                  clientIndex + 1
                } has no staff assigned.`
              )
              setIsCreating(false)
              return
            }
          }
        }

        // Create separate bookings for each client
        for (let clientIndex = 0; clientIndex < createFormData.numClients; clientIndex++) {
          const clientServices = getServicesForClient(clientIndex)
          const clientStartTime = createFormData.clientStartTimes[clientIndex] // FIX: Use client-specific start time

          if (clientServices.length === 0) continue // Skip if no services for this client

          let currentStartTime = clientStartTime // FIX: Use client-specific start time instead of createFormData.startTime

          // Create booking for each service for this client
          for (const serviceInstance of clientServices) {
            try {
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

              console.log(
                `Creating booking for Client ${clientIndex + 1}, Service: ${service.name}`,
                bookingData
              )
              await createBooking(bookingData)
              currentStartTime = calculateEndTime(currentStartTime, service.duration)
            } catch (error) {
              console.error(
                `Error creating booking for Client ${clientIndex + 1}, Service ${
                  serviceInstance.service.name
                }:`,
                error
              )
              alert(
                `Failed to create booking for Client ${clientIndex + 1} - ${
                  serviceInstance.service.name
                }: ${error.message}`
              )
              setIsCreating(false)
              return
            }
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
        clientStartTimes: {}, // FIX: Add this to reset client start times
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
      <div style={responsiveCalendarStyles.errorContainer(deviceType)}>
        Error loading staff: {staffError.message}
      </div>
    )
  }

  if (servicesError) {
    return (
      <div style={responsiveCalendarStyles.errorContainer(deviceType)}>
        Error loading services: {servicesError.message}
      </div>
    )
  }

  if (clientsError) {
    return (
      <div style={responsiveCalendarStyles.errorContainer(deviceType)}>
        Error loading clients: {clientsError.message}
      </div>
    )
  }

  if (workingStaffError) {
    return (
      <div style={responsiveCalendarStyles.errorContainer(deviceType)}>
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

  const simpleDropStyles = {
    validDrop: {
      backgroundColor: '#dcfce7',
      border: '2px dashed #16a34a',
    },
    invalidDrop: {
      backgroundColor: '#fef2f2',
      border: '2px dashed #dc2626',
    },
  }

  if (view === 'day' && selectedDate) {
    const dayBookings = bookingsByDate[selectedDate] || []
    const staffGridColumns =
      workingStaff.length > 0 ? workingStaff.map(() => '160px').join(' ') : '200px'
    const currentTimePosition = getCurrentTimePosition()
    const showCurrentTimeLine = isSelectedDateToday() && currentTimePosition !== null

    return (
      <div style={responsiveCalendarStyles.dayViewContainer(deviceType)}>
        {/* Day View Header */}
        <div style={responsiveCalendarStyles.dayViewHeader(deviceType)}>
          <div style={responsiveCalendarStyles.dayViewHeaderContent(deviceType)}>
            <div style={responsiveCalendarStyles.dayViewHeaderLeft(deviceType)}>
              <button
                onClick={() => setView('calendar')}
                style={responsiveCalendarStyles.backButton(deviceType)}
                onTouchStart={(e) => (e.target.style.backgroundColor = '#f0f8ff')}
                onTouchEnd={(e) => (e.target.style.backgroundColor = 'transparent')}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#f0f8ff')}
                onMouseOut={(e) => (e.target.style.backgroundColor = 'transparent')}
              >
                ← Back to Calendar
              </button>
            </div>

            <h1 style={responsiveCalendarStyles.dayViewTitle(deviceType)}>
              {deviceType === 'mobile'
                ? new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                : `Bookings for ${new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}`}
            </h1>

            <div style={responsiveCalendarStyles.dayViewHeaderRight(deviceType)}>
              {deviceType !== 'mobile' && (
                <>
                  <button
                    onClick={() => setShowLeaveModal(true)}
                    style={responsiveCalendarStyles.actionButton(deviceType, 'danger')}
                    onTouchStart={(e) => (e.target.style.backgroundColor = '#b91c1c')}
                    onTouchEnd={(e) => (e.target.style.backgroundColor = '#dc2626')}
                  >
                    + Add Leave
                  </button>
                  <button
                    onClick={() => setShowShiftModal(true)}
                    style={responsiveCalendarStyles.actionButton(deviceType, 'success')}
                    onTouchStart={(e) => (e.target.style.backgroundColor = '#047857')}
                    onTouchEnd={(e) => (e.target.style.backgroundColor = '#059669')}
                  >
                    + Add Shift
                  </button>
                </>
              )}
              <button
                onClick={() => setShowCreateModal(true)}
                style={responsiveCalendarStyles.actionButton(deviceType, 'primary')}
                onTouchStart={(e) => (e.target.style.backgroundColor = '#1d4ed8')}
                onTouchEnd={(e) => (e.target.style.backgroundColor = '#2563eb')}
              >
                {deviceType === 'mobile' ? '+ Book' : '+ Create Booking'}
              </button>
              {deviceType !== 'mobile' && (
                <div style={responsiveCalendarStyles.dayViewStats(deviceType)}>
                  Total bookings: {dayBookings.length}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Action Bar */}
        {deviceType === 'mobile' && (
          <div style={responsiveCalendarStyles.mobileActionBar}>
            <button
              onClick={() => setShowLeaveModal(true)}
              style={responsiveCalendarStyles.mobileActionButton('danger')}
              onTouchStart={(e) => (e.target.style.backgroundColor = '#b91c1c')}
              onTouchEnd={(e) => (e.target.style.backgroundColor = '#dc2626')}
            >
              Leave
            </button>
            <button
              onClick={() => setShowShiftModal(true)}
              style={responsiveCalendarStyles.mobileActionButton('success')}
              onTouchStart={(e) => (e.target.style.backgroundColor = '#047857')}
              onTouchEnd={(e) => (e.target.style.backgroundColor = '#059669')}
            >
              Shift
            </button>
            <div style={responsiveCalendarStyles.mobileStats}>📊 {dayBookings.length} bookings</div>
          </div>
        )}

        {/* Working Staff Banner */}
        {workingStaff.length > 0 && (
          <div style={responsiveCalendarStyles.statusBanner(deviceType, 'info')}>
            <span style={{ fontWeight: '600' }}>👥 Working Staff ({workingStaff.length})</span>
            {deviceType !== 'mobile' && (
              <span style={responsiveCalendarStyles.statusBannerSubtext}>
                📅 = Specific shift (tap 🗑️ to delete) | 🔄 = Recurring weekly shift
              </span>
            )}
          </div>
        )}

        {/* Staff on Leave Banner */}
        {staffAbsences.length > 0 && (
          <div style={responsiveCalendarStyles.statusBanner(deviceType, 'warning')}>
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
          <div style={responsiveCalendarStyles.statusBanner(deviceType, 'error')}>
            <span style={{ fontWeight: '600' }}>⚠️ No staff scheduled for this date</span>
            {deviceType !== 'mobile' && (
              <span style={responsiveCalendarStyles.statusBannerSubtext}>
                Click "Add Staff Shift" to schedule staff for this day
              </span>
            )}
          </div>
        )}

        {/* Scrollable Content Area */}
        <div style={responsiveCalendarStyles.scrollableContent(deviceType)}>
          <div style={responsiveCalendarStyles.scheduleContainer(deviceType)}>
            {/* Current Time Line */}
            {showCurrentTimeLine && (
              <div style={responsiveCalendarStyles.currentTimeLine(currentTimePosition)}>
                <div style={responsiveCalendarStyles.currentTimeLabel}>
                  {currentTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </div>
                <div style={responsiveCalendarStyles.currentTimeDot} />
              </div>
            )}

            {/* Time/Staff Header - STICKY */}
            <div style={responsiveCalendarStyles.scheduleHeader(deviceType, workingStaff.length)}>
              <div style={responsiveCalendarStyles.timeHeaderCell(deviceType)}>
                {deviceType === 'mobile' ? 'Time' : 'Time / Staff'}
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
                      style={responsiveCalendarStyles.staffHeaderCell(deviceType, hasSpecificShift)}
                    >
                      <span style={{ fontSize: deviceType === 'mobile' ? '10px' : '12px' }}>
                        👤
                      </span>
                      <span style={responsiveCalendarStyles.staffName(deviceType)}>
                        {deviceType === 'mobile' ? staffName.split(' ')[0] : staffName}
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
                            if (specificShifts.length === 1) {
                              handleDeleteShift(specificShifts[0], staffName)
                            } else {
                              const confirmMessage = `${staffName} has ${specificShifts.length} specific shifts today. Delete all?`
                              if (window.confirm(confirmMessage)) {
                                specificShifts.forEach((shift) => {
                                  handleDeleteShift(shift, staffName)
                                })
                              }
                            }
                          }}
                          style={responsiveCalendarStyles.deleteShiftButton(deviceType)}
                          onTouchStart={(e) => (e.target.style.backgroundColor = '#fee2e2')}
                          onTouchEnd={(e) => (e.target.style.backgroundColor = 'transparent')}
                          title={`Delete ${staffName}'s shift${
                            specificShifts.length > 1 ? 's' : ''
                          }`}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <div style={responsiveCalendarStyles.noStaffHeader(deviceType)}>
                  No staff scheduled
                </div>
              )}
            </div>

            {/* Time Slots */}
            {timeSlots.map((timeSlot) => (
              <div
                key={timeSlot}
                style={{
                  ...responsiveCalendarStyles.timeSlotRow(deviceType, workingStaff.length),
                  // FORCE consistent height regardless of content
                  height: `${SLOT_HEIGHT[deviceType]}px`,
                  minHeight: `${SLOT_HEIGHT[deviceType]}px`,
                  maxHeight: `${SLOT_HEIGHT[deviceType]}px`,
                  overflow: 'visible', // Allow booking blocks to extend visually
                }}
              >
                <div style={responsiveCalendarStyles.timeCell(deviceType)}>{timeSlot}</div>
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

                    // Get drop zone status for visual feedback
                    const dropStatus = draggedBooking
                      ? getDropZoneStatus(staffMember, timeSlot, draggedBooking, dayBookings)
                      : null

                    // Determine drop zone styling based on drag status
                    let dropZoneStyle = {}
                    if (isDragging && dropStatus) {
                      switch (dropStatus.type) {
                        case 'valid':
                          dropZoneStyle = {
                            backgroundColor: isDropTarget ? '#dcfce7' : '#f0fdf4',
                            border: isDropTarget ? '2px dashed #16a34a' : '1px dashed #22c55e',
                            borderRadius: '6px',
                          }
                          break
                        case 'conflict':
                        case 'invalid':
                          dropZoneStyle = {
                            backgroundColor: isDropTarget ? '#fef2f2' : '#fafafa',
                            border: isDropTarget ? '2px dashed #dc2626' : '1px dashed #f87171',
                            borderRadius: '6px',
                            opacity: 0.6,
                          }
                          break
                        case 'same':
                          dropZoneStyle = {
                            backgroundColor: '#fef3c7',
                            border: '1px dashed #f59e0b',
                            borderRadius: '6px',
                            opacity: 0.8,
                          }
                          break
                        default:
                          if (isDragging) {
                            dropZoneStyle = {
                              backgroundColor: '#fafafa',
                              opacity: 0.5,
                            }
                          }
                      }
                    }

                    return (
                      <div
                        key={`${staffMember.id}-${timeSlot}`}
                        style={{
                          ...responsiveCalendarStyles.staffSlot(deviceType, isDropTarget),
                          height: `${SLOT_HEIGHT[deviceType]}px`,
                          minHeight: `${SLOT_HEIGHT[deviceType]}px`,
                          maxHeight: `${SLOT_HEIGHT[deviceType]}px`,
                        }}
                        onDragOver={handleDragOver}
                        onDragEnter={(e) => handleDragEnter(e, staffMember, timeSlot)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, staffMember, timeSlot)}
                      >
                        {/* Enhanced drop feedback with status details */}
                        {isDragging && isDropTarget && dropStatus && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: '10px',
                              fontWeight: '600',
                              textAlign: 'center',
                              pointerEvents: 'none',
                              zIndex: 10,
                              color:
                                dropStatus.type === 'valid'
                                  ? '#16a34a'
                                  : dropStatus.type === 'same'
                                  ? '#f59e0b'
                                  : '#dc2626',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            }}
                          >
                            {dropStatus.type === 'valid' && '✓ '}
                            {dropStatus.type === 'conflict' && '✗ '}
                            {dropStatus.type === 'invalid' && '⚠ '}
                            {dropStatus.message}
                          </div>
                        )}

                        {bookingInfo ? (
                          <div
                            draggable={deviceType !== 'mobile'}
                            onDragStart={(e) =>
                              deviceType !== 'mobile' &&
                              handleDragStart(e, bookingInfo.booking, staffMember, timeSlot)
                            }
                            onDragEnd={handleDragEnd}
                            style={{
                              ...responsiveCalendarStyles.bookingBlock(
                                deviceType,
                                bookingInfo.booking,
                                bookingInfo.slotsSpanned
                              ),
                              height: `${bookingInfo.slotsSpanned * SLOT_HEIGHT[deviceType] - 4}px`,
                              cursor: deviceType === 'mobile' ? 'pointer' : 'grab',
                              transition: 'all 0.2s ease',
                              position: 'relative',
                              // Enhanced visual feedback when dragging
                              ...(draggedBooking?.booking?.id === bookingInfo.booking.id
                                ? {
                                    opacity: 0.5,
                                    transform: 'scale(0.95)',
                                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
                                    zIndex: 1000,
                                  }
                                : {}),
                            }}
                            onMouseEnter={(e) => {
                              if (!isDragging) {
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                                e.currentTarget.style.transform = 'translateY(-1px)'
                                // Show drag handle on hover
                                const dragHandle = e.currentTarget.querySelector('.drag-handle')
                                if (dragHandle) {
                                  dragHandle.style.opacity = '1'
                                }
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isDragging) {
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'
                                e.currentTarget.style.transform = 'translateY(0)'
                                // Hide drag handle
                                const dragHandle = e.currentTarget.querySelector('.drag-handle')
                                if (dragHandle) {
                                  dragHandle.style.opacity = '0.3'
                                }
                              }
                            }}
                            onClick={() => handleBookingClick(bookingInfo.booking)}
                            onTouchStart={(e) => {
                              if (deviceType === 'mobile') {
                                e.currentTarget.style.transform = 'scale(0.98)'
                              }
                            }}
                            onTouchEnd={(e) => {
                              if (deviceType === 'mobile') {
                                e.currentTarget.style.transform = 'scale(1)'
                              }
                            }}
                          >
                            {/* Enhanced drag handle */}
                            {deviceType !== 'mobile' && (
                              <div
                                className="drag-handle"
                                style={{
                                  position: 'absolute',
                                  top: '2px',
                                  right: '2px',
                                  width: '16px',
                                  height: '16px',
                                  opacity: 0.3,
                                  cursor: 'grab',
                                  fontSize: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'opacity 0.2s ease',
                                  color: '#6b7280',
                                  userSelect: 'none',
                                }}
                                title="Drag to move booking"
                              >
                                ⋮⋮
                              </div>
                            )}

                            <div style={responsiveCalendarStyles.bookingService(deviceType)}>
                              {bookingInfo.booking.service}
                            </div>
                            <div style={responsiveCalendarStyles.bookingClient(deviceType)}>
                              {bookingInfo.booking.client}
                            </div>
                            {bookingInfo.booking.notes &&
                              bookingInfo.booking.notes.trim() !== '' && (
                                <div style={responsiveCalendarStyles.bookingNotes(deviceType)}>
                                  {bookingInfo.booking.notes}
                                </div>
                              )}
                            {bookingInfo.booking.numClients > 1 && (
                              <div style={responsiveCalendarStyles.bookingClientCount(deviceType)}>
                                ({bookingInfo.booking.numClients} clients)
                              </div>
                            )}
                            <div style={responsiveCalendarStyles.bookingTime(deviceType)}>
                              {bookingInfo.booking.time} - {bookingInfo.booking.endTime}
                            </div>
                          </div>
                        ) : (
                          <div
                            style={{
                              ...responsiveCalendarStyles.emptySlot(deviceType),
                              height: `${SLOT_HEIGHT[deviceType]}px`,
                            }}
                          >
                            {isDragging && isDropTarget && dropStatus?.type === 'valid' ? '' : '-'}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div
                    style={{
                      ...responsiveCalendarStyles.noStaffSlot(deviceType),
                      height: `${SLOT_HEIGHT[deviceType]}px`,
                    }}
                  >
                    -
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Day Summary for Mobile */}
          {deviceType === 'mobile' && (
            <div style={responsiveCalendarStyles.mobileSummary}>
              <div style={responsiveCalendarStyles.summaryCard('blue')}>
                <div style={responsiveCalendarStyles.summaryLabel}>📅 Total Bookings</div>
                <div style={responsiveCalendarStyles.summaryValue}>{dayBookings.length}</div>
              </div>

              <div style={responsiveCalendarStyles.summaryCard('green')}>
                <div style={responsiveCalendarStyles.summaryLabel}>👥 Working Staff</div>
                <div style={responsiveCalendarStyles.summaryValue}>{workingStaff.length}</div>
              </div>
            </div>
          )}
        </div>

        {/* Create Booking Modal */}
        <CreateBookingModal
          showModal={showCreateModal && workingStaff.length > 0}
          deviceType={deviceType}
          selectedDate={selectedDate}
          workingStaff={workingStaff}
          services={services}
          clients={clients}
          createFormData={createFormData}
          isCreating={isCreating}
          selectedServicesInfo={selectedServicesInfo}
          bookingsByDate={bookingsByDate}
          timeSlots={timeSlots}
          responsiveCalendarStyles={responsiveCalendarStyles}
          closeModal={closeModal}
          handleCreateBooking={handleCreateBooking}
          setCreateFormData={setCreateFormData}
          handleClientSelection={handleClientSelection}
          handleNameOrPhoneChange={handleNameOrPhoneChange}
          handleServiceSelection={handleServiceSelection}
          handleRemoveServiceInstance={handleRemoveServiceInstance}
          handleServiceStaffAssignment={handleServiceStaffAssignment}
          handleClientServiceAssignment={handleClientServiceAssignment}
          handleClientStartTimeAssignment={handleClientStartTimeAssignment}
          getServicesForClient={getServicesForClient}
          areAllServicesAssigned={areAllServicesAssigned}
          areAllServicesAssignedToStaff={areAllServicesAssignedToStaff}
          areAllClientStartTimesAssigned={areAllClientStartTimesAssigned}
          calculateEndTime={calculateEndTime}
          isTimeSlotAvailable={isTimeSlotAvailable}
          getAvailableTimeSlotsForConsecutiveBookings={getAvailableTimeSlotsForConsecutiveBookings}
          serviceSearchTerm={serviceSearchTerm}
          setServiceSearchTerm={setServiceSearchTerm}
          filteredServices={filteredServices}
        />

        {/* No Staff Warning Modal */}
        <NoStaffWarningModal
          showModal={showCreateModal && workingStaff.length === 0}
          closeModal={closeModal}
          openShiftModal={() => setShowShiftModal(true)}
        />

        {/* Create Shift Modal */}
        <CreateShiftModal
          showModal={showShiftModal}
          selectedDate={selectedDate}
          staff={staff}
          shiftFormData={shiftFormData}
          isCreatingShift={isCreatingShift}
          timeSlots={timeSlots}
          closeModal={closeShiftModal}
          handleCreateShift={handleCreateShift}
          setShiftFormData={setShiftFormData}
        />

        {/* Create Leave Modal */}
        <CreateLeaveModal
          showModal={showLeaveModal}
          selectedDate={selectedDate}
          staff={staff}
          leaveFormData={leaveFormData}
          isCreatingLeave={isCreatingLeave}
          absenceTypes={absenceTypes}
          closeModal={closeLeaveModal}
          handleCreateLeave={handleCreateLeave}
          setLeaveFormData={setLeaveFormData}
        />
      </div>
    )
  }

  // Calendar View (responsive version)
  return (
    <div style={responsiveCalendarStyles.calendarContainer(deviceType)}>
      {/* Calendar Header */}
      <div style={responsiveCalendarStyles.calendarHeader(deviceType)}>
        <h1 style={responsiveCalendarStyles.calendarTitle(deviceType)}>
          <span style={{ fontSize: deviceType === 'mobile' ? '20px' : '24px' }}>📅</span>
          {deviceType === 'mobile' ? 'Calendar' : 'Booking Calendar'}
        </h1>
        <div style={responsiveCalendarStyles.navigation(deviceType)}>
          <button
            onClick={() => navigateMonth(-1)}
            style={responsiveCalendarStyles.navButton(deviceType)}
            onTouchStart={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
            onTouchEnd={(e) => (e.target.style.backgroundColor = 'transparent')}
          >
            ←
          </button>
          <h2 style={responsiveCalendarStyles.monthTitle(deviceType)}>
            {deviceType === 'mobile'
              ? currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => navigateMonth(1)}
            style={responsiveCalendarStyles.navButton(deviceType)}
            onTouchStart={(e) => (e.target.style.backgroundColor = '#f5f5f5')}
            onTouchEnd={(e) => (e.target.style.backgroundColor = 'transparent')}
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={responsiveCalendarStyles.calendarGrid(deviceType)}>
        {/* Days of week header */}
        <div style={responsiveCalendarStyles.weekHeader(deviceType)}>
          {(deviceType === 'mobile'
            ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          ).map((day, index) => (
            <div key={day} style={responsiveCalendarStyles.weekHeaderCell(deviceType, index === 6)}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div style={responsiveCalendarStyles.daysGrid(deviceType)}>
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
                style={responsiveCalendarStyles.dayCell(
                  deviceType,
                  day,
                  hoveredDay === index,
                  index % 7 === 6
                )}
                onClick={() => handleDateClick(day)}
                onMouseEnter={() => day && setHoveredDay(index)}
                onMouseLeave={() => setHoveredDay(null)}
                onTouchStart={() => day && setHoveredDay(index)}
                onTouchEnd={() => setHoveredDay(null)}
              >
                {day && (
                  <>
                    <div style={responsiveCalendarStyles.dayNumber(deviceType, isToday)}>
                      {day}
                      {isToday && (
                        <span style={responsiveCalendarStyles.todayIndicator(deviceType)} />
                      )}
                    </div>
                    {dayBookings.length > 0 && (
                      <div style={responsiveCalendarStyles.bookingBadge(deviceType)}>
                        {dayBookings.length} {deviceType === 'mobile' ? '' : 'booking'}
                        {dayBookings.length !== 1 && deviceType !== 'mobile' ? 's' : ''}
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
      <div style={responsiveCalendarStyles.summaryGrid(deviceType)}>
        <div style={responsiveCalendarStyles.summaryCard('blue')}>
          <div style={responsiveCalendarStyles.summaryLabel}>Total Bookings</div>
          <div style={responsiveCalendarStyles.summaryValue}>{currentMonthBookings.length}</div>
        </div>
      </div>
    </div>
  )
}

export default BookingCalendar
