import { formatCurrency } from '../../utils/helpers'
import Stat from './Stat'

import {
  HiOutlineBanknotes,
  HiOutlineBriefcase,
  HiOutlineCalendarDays,
  HiOutlineChartBar,
} from 'react-icons/hi2'

function Stats({ bookings, serviceCount }) {
  // Add safety check for bookings data
  const safeBookings = bookings || []

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

  // 3. Sales
  const sales = safeBookings.reduce((acc, cur) => acc + (cur.totalPrice || 0), 0)

  // 4. Today's sales (based on startTime)
  const todaysSales = safeBookings
    .filter((booking) => isToday(booking.startTime))
    .reduce((acc, cur) => acc + (cur.totalPrice || 0), 0)

  // 5. Commented out stats for future implementation
  // const checkins = confirmedStays.length

  // 6. Occupancy rate calculation
  // num checked in nights / all available nights (num days * num cabins)
  // const occupation =
  //   confirmedStays.reduce((acc, cur) => acc + cur.numNights, 0) / (numDays * cabinCount)

  return (
    <>
      {/* <Stat title="Bookings" color="blue" icon={<HiOutlineBriefcase />} value={numBookings} /> */}
      <Stat
        title="Today's Bookings"
        color="indigo"
        icon={<HiOutlineCalendarDays />}
        value={todaysBookings}
      />
      {/* <Stat
        title="Sales"
        color="green"
        icon={<HiOutlineBanknotes />}
        value={formatCurrency(sales)}
      />
      <Stat
        title="Today's Sales"
        color="yellow"
        icon={<HiOutlineBanknotes />}
        value={formatCurrency(todaysSales)}
      /> */}
      {/* <Stat title="Check ins" color="indigo" icon={<HiOutlineCalendarDays />} value={checkins} />
      <Stat
        title="Occupancy rate"
        color="yellow"
        icon={<HiOutlineChartBar />}
        value={Math.round(occupation * 100) + '%'}
      /> */}
    </>
  )
}

export default Stats
