import styled from 'styled-components'
import { useRecentBookings } from './useRecentBookings'
import Spinner from '../../ui/Spinner'
import { useRecentStays } from './useRecentStays'
import Stats from './Stats'
import { useServices } from '../services/useServices'
import SalesChart from './SalesChart'
import DurationChart from './DurationChart'
import TodayActivity from '../check-in-out/TodayActivity'
import { getBookings } from '../../services/apiBookings'
import { useBookings } from '../bookings/useBookings'

const StyledDashboardLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: auto auto auto;
  gap: 2.4rem;
`

function DashboardLayout() {
  const { bookings, isLoading: isLoading1 } = useBookings()
  // const { confirmedStays, isLoading: isLoading2, numDays } = useRecentStays()
  const { services, isLoading: isLoading3 } = useServices()

  if (isLoading1 || isLoading3) return <Spinner />

  return (
    <StyledDashboardLayout>
      <Stats
        bookings={bookings}
        // confirmedStays={confirmedStays}
        // numDays={numDays}
        serviceCount={services.length}
      />
      {/* <TodayActivity /> */}
      {/* <DurationChart confirmedStays={confirmedStays} />
      <SalesChart bookings={bookings} /> */}
    </StyledDashboardLayout>
  )
}

export default DashboardLayout
