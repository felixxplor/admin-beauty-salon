import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/helpers'
import Stat from './Stat'

import {
  HiOutlineBanknotes,
  HiOutlineBriefcase,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
  HiOutlineClock,
} from 'react-icons/hi2'

function Stats({ bookings, serviceCount }) {
  // Add safety check for bookings data
  const safeBookings = bookings || []
  console.log('Bookings:', bookings)

  // Helper function to check if a startTime is today
  const isToday = (startTimeString) => {
    if (!startTimeString) return false

    const today = new Date()
    const startTime = new Date(startTimeString)

    // Check if date is valid
    if (isNaN(startTime.getTime())) return false

    // Compare using local dates to avoid timezone issues
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const startTimeLocal = new Date(
      startTime.getFullYear(),
      startTime.getMonth(),
      startTime.getDate()
    )

    return todayLocal.getTime() === startTimeLocal.getTime()
  }

  // 1. Total bookings
  const numBookings = safeBookings.length

  // 2. Today's bookings (based on startTime)
  const todaysBookings = safeBookings.filter((booking) => isToday(booking.startTime)).length

  // 2a. Today's PENDING bookings
  const todaysPendingBookings = safeBookings.filter(
    (booking) => isToday(booking.startTime) && booking.status === 'pending'
  ).length

  // 2b. Today's CONFIRMED bookings
  const todaysConfirmedBookings = safeBookings.filter(
    (booking) => isToday(booking.startTime) && booking.status === 'confirmed'
  ).length

  // 3. Sales
  const sales = safeBookings.reduce((acc, cur) => acc + (cur.totalPrice || 0), 0)

  // 4. Today's sales (based on startTime)
  const todaysSales = safeBookings
    .filter((booking) => isToday(booking.startTime))
    .reduce((acc, cur) => acc + (cur.totalPrice || 0), 0)

  return (
    <>
      <Link to="/pending-bookings">
        <Stat
          title="Today's Bookings"
          color="indigo"
          icon={<HiOutlineCalendarDays />}
          value={todaysBookings}
        />
      </Link>

      <Link to="/pending-bookings">
        <Stat
          title="Today's Pending"
          color="yellow"
          icon={<HiOutlineClock />}
          value={todaysPendingBookings}
        />
      </Link>

      <Link to="/pending-bookings">
        <Stat
          title="Today's Confirmed"
          color="green"
          icon={<HiOutlineBriefcase />}
          value={todaysConfirmedBookings}
        />
      </Link>
    </>
  )
}

export default Stats
