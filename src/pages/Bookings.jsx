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

// Custom hook to fetch staff shifts
const useStaffShifts = () => {
  const [staffShifts, setStaffShifts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
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

  const dayOfWeek = new Date(date).getDay()

  const workingStaffIds = staffShifts
    .filter((shift) => shift.dayOfWeek === dayOfWeek)
    .map((shift) => shift.staffId)

  const workingStaff = staff.filter((s) => workingStaffIds.includes(s.id))

  return workingStaff.length > 0 ? workingStaff : staff
}

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

  // Drag and drop state
  const [draggedBooking, setDraggedBooking] = useState(null)
  const [dragTarget, setDragTarget] = useState(null)
  const [isDragging, setIsDragging] = useState(false)

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
    serviceStaffAssignments: {},
    createSeparateBookings: false,
  })

  useEffect(() => {
    const dateParam = searchParams.get('date')
    const viewParam = searchParams.get('view')

    if (dateParam && viewParam === 'day') {
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

  const { bookings, isLoading, refetch } = useBookings()
  const { staff, isLoading: staffLoading, error: staffError } = useStaff()
  const { services, isLoading: servicesLoading, error: servicesError } = useServices()
  const { clients, isLoading: clientsLoading, error: clientsError } = useClients()
  const { staffShifts, isLoading: staffShiftsLoading, error: staffShiftsError } = useStaffShifts()

  // Drag and drop handlers
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

  // Calculate total duration and price based on selected services
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

    let totalPriceNum = 0
    let hasPlus = false
    let hasNonNumeric = false

    selectedServices.forEach((service) => {
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
    setCreateFormData((prev) => {
      const isSelected = prev.selectedServiceIds.includes(serviceId)
      const newSelectedIds = isSelected
        ? prev.selectedServiceIds.filter((id) => id !== serviceId)
        : [...prev.selectedServiceIds, serviceId]

      const newAssignments = { ...prev.serviceStaffAssignments }
      if (isSelected) {
        delete newAssignments[serviceId]
      }

      return {
        ...prev,
        selectedServiceIds: newSelectedIds,
        serviceStaffAssignments: newAssignments,
        createSeparateBookings: false,
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

  const closeModal = () => {
    setShowCreateModal(false)
    setServiceSearchTerm('')
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

      if (createFormData.createSeparateBookings && createFormData.selectedServiceIds.length > 1) {
        const unassignedServices = createFormData.selectedServiceIds.filter(
          (serviceId) => !createFormData.serviceStaffAssignments[serviceId]
        )

        if (unassignedServices.length > 0) {
          alert('Please assign a staff member to each service')
          setIsCreating(false)
          return
        }

        let currentStartTime = createFormData.startTime

        for (const serviceId of createFormData.selectedServiceIds) {
          const service = services.find((s) => s.id.toString() === serviceId)
          const staffId = createFormData.serviceStaffAssignments[serviceId]

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
            serviceIds: [parseInt(serviceId)],
            serviceId: parseInt(serviceId),
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

        await createBooking(bookingData)
      }

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
        serviceStaffAssignments: {},
        createSeparateBookings: false,
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
    const workingStaff = getStaffWorkingOnDay(selectedDate, staff, staffShifts)
    const staffGridColumns = workingStaff.map(() => '160px').join(' ')
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
                  top: `${currentTimePosition + 52}px`, // 52px accounts for the sticky header
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
              {workingStaff.map((staffMember) => {
                const staffName =
                  typeof staffMember === 'string' ? staffMember : staffMember.name || staffMember.id
                return (
                  <div
                    key={staffMember.id || staffName}
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
                    }}
                  >
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
                {workingStaff.map((staffMember) => {
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
                              // Keep the shadow, just enhance it slightly
                              e.currentTarget.style.boxShadow =
                                '0 4px 12px rgba(0, 0, 0, 0.25), 0 2px 4px rgba(0, 0, 0, 0.15)'
                            }
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)'
                            // Restore the original shadow (don't remove it)
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
                })}
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
              }}
            >
              <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '4px' }}>
                📅 Total Bookings
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e3a8a' }}>
                {dayBookings.length}
              </div>
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
                                const regularPriceStr = service.regularPrice
                                  ? String(service.regularPrice)
                                  : '0'
                                const discountStr = service.discount
                                  ? String(service.discount)
                                  : '0'

                                const hasPlus = regularPriceStr.includes('+')
                                const regularPriceNum = parseFloat(regularPriceStr.replace('+', ''))
                                const discountNum = parseFloat(discountStr.replace('+', ''))

                                if (isNaN(regularPriceNum)) {
                                  return regularPriceStr
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

                {/* Multiple Bookings Toggle */}
                {createFormData.selectedServiceIds.length > 1 && (
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

                {/* Staff Assignment Section */}
                {createFormData.createSeparateBookings &&
                createFormData.selectedServiceIds.length > 1 ? (
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
                      {createFormData.selectedServiceIds.map((serviceId, index) => {
                        const service = services.find((s) => s.id.toString() === serviceId)
                        if (!service) return null

                        return (
                          <div
                            key={serviceId}
                            style={{
                              marginBottom:
                                index < createFormData.selectedServiceIds.length - 1 ? '12px' : '0',
                              paddingBottom:
                                index < createFormData.selectedServiceIds.length - 1 ? '12px' : '0',
                              borderBottom:
                                index < createFormData.selectedServiceIds.length - 1
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
                            </div>
                            <select
                              style={calendarStyles.select}
                              value={createFormData.serviceStaffAssignments[serviceId] || ''}
                              onChange={(e) =>
                                handleServiceStaffAssignment(serviceId, e.target.value)
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

  // Calendar View
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
