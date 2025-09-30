import { useState } from 'react'
import { isFuture, isPast, isToday } from 'date-fns'
import supabase from '../services/supabase'
import Button from '../ui/Button'
import { subtractDates } from '../utils/helpers'

import { bookings } from './data-bookings'
import { services } from './data-services'
import { clients } from './data-clients'
import { styled } from 'styled-components'

// const originalSettings = {
//   minBookingLength: 3,
//   maxBookingLength: 30,
//   maxclientsPerBooking: 10,
//   breakfastPrice: 15,
// };

async function deleteClients() {
  const { error } = await supabase.from('clients').delete().gt('id', 0)
  if (error) console.log(error.message)
}

async function deleteServices() {
  const { error } = await supabase.from('services').delete().gt('id', 0)
  if (error) console.log(error.message)
}

async function deleteBookings() {
  const { error } = await supabase.from('bookings').delete().gt('id', 0)
  if (error) console.log(error.message)
}

async function createClients() {
  const { error } = await supabase.from('clients').insert(clients)
  if (error) console.log(error.message)
}

async function createServices() {
  const { error } = await supabase.from('services').insert(services)
  if (error) console.log(error.message)
}

async function createBookings() {
  // Bookings need a clientId and a serviceId. We can't tell Supabase IDs for each object, it will calculate them on its own. So it might be different for different people, especially after multiple uploads. Therefore, we need to first get all clientIds and serviceIds, and then replace the original IDs in the booking data with the actual ones from the DB
  const { data: clientsIds } = await supabase.from('clients').select('id').order('id')
  const allclientIds = clientsIds.map((service) => service.id)
  const { data: servicesIds } = await supabase.from('services').select('id').order('id')
  const allserviceIds = servicesIds.map((service) => service.id)

  const finalBookings = bookings.map((booking) => {
    // Here relying on the order of services, as they don't have and ID yet
    const service = services.at(booking.serviceId - 1)
    const numNights = subtractDates(booking.endTime, booking.startTime)
    const servicePrice = numNights * (service.regularPrice - service.discount)
    const extrasPrice = booking.hasBreakfast ? numNights * 15 * booking.numclients : 0 // hardcoded breakfast price
    const totalPrice = servicePrice + extrasPrice

    let status
    if (isPast(new Date(booking.endTime)) && !isToday(new Date(booking.endTime)))
      status = 'checked-out'
    if (isFuture(new Date(booking.startTime)) || isToday(new Date(booking.startTime)))
      status = 'unconfirmed'
    if (
      (isFuture(new Date(booking.endTime)) || isToday(new Date(booking.endTime))) &&
      isPast(new Date(booking.startTime)) &&
      !isToday(new Date(booking.startTime))
    )
      status = 'checked-in'

    return {
      ...booking,
      numNights,
      servicePrice,
      extrasPrice,
      totalPrice,
      clientId: allclientIds.at(booking.clientId - 1),
      serviceId: allserviceIds.at(booking.serviceId - 1),
      status,
    }
  })

  console.log(finalBookings)

  const { error } = await supabase.from('bookings').insert(finalBookings)
  if (error) console.log(error.message)
}

function Uploader() {
  const [isLoading, setIsLoading] = useState(false)

  async function uploadAll() {
    setIsLoading(true)
    // Bookings need to be deleted FIRST
    await deleteBookings()
    await deleteClients()
    await deleteServices()

    // Bookings need to be created LAST
    await createClients()
    await createServices()
    await createBookings()

    setIsLoading(false)
  }

  async function uploadBookings() {
    setIsLoading(true)
    await deleteBookings()
    await createBookings()
    setIsLoading(false)
  }

  return (
    <StyledUploader>
      <h3>SAMPLE DATA</h3>

      <Button onClick={uploadAll} disabled={isLoading}>
        Upload ALL
      </Button>

      <Button onClick={uploadBookings} disabled={isLoading}>
        Upload bookings ONLY
      </Button>
    </StyledUploader>
  )
}

export default Uploader

const StyledUploader = styled.div`
  margin-top: auto;
  background-color: var(--color-silver-100);
  padding: 8px;
  border-radius: 5px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
