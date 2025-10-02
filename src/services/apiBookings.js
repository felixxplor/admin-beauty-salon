import { PAGE_SIZE } from '../utils/constants'
import { getToday } from '../utils/helpers'
import supabase from './supabase'

export async function getBookings({ filter, sortBy, page }) {
  let query = supabase
    .from('bookings')
    .select(
      'id, created_at, date, startTime, endTime, numClients, status, totalPrice, staffId, phone, name, serviceIds, services(name), client(fullName, email)',
      { count: 'exact' }
    )

  //FILTER
  if (filter) query = query[filter.method || 'eq'](filter.field, filter.value)

  //SORT
  if (sortBy)
    query = query.order(sortBy.field, {
      ascending: sortBy.direction === 'asc',
    })

  if (page) {
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    query = query.range(from, to)
  }

  const { data, error, count } = await query

  if (error) {
    console.error(error)
    throw new Error('Bookings could not be loaded')
  }

  return { data, count }
}

export async function getBooking(id) {
  // First get the booking data
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(
      `
      *,
      client!clientId(id, fullName, email, phone),
      staff!staffId(id, name)
    `
    )
    .eq('id', id)
    .single()

  if (bookingError) {
    console.error(bookingError)
    throw new Error('Booking could not be loaded')
  }

  // If booking has serviceIds, fetch the services
  if (booking.serviceIds && Array.isArray(booking.serviceIds)) {
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, name, duration, regularPrice, description')
      .in('id', booking.serviceIds)

    if (!servicesError) {
      booking.services = services
    }
  } else if (booking.serviceId) {
    // Fallback for single service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration, regularPrice, description')
      .eq('id', booking.serviceId)
      .single()

    if (!serviceError) {
      booking.services = service
    }
  }

  return booking
}

export async function updateBooking(id, obj) {
  const { data, error } = await supabase.from('bookings').update(obj).eq('id', id).select().single()

  if (error) {
    console.error(error)
    throw new Error('Booking could not be updated')
  }
  return data
}

export async function deleteBooking(bookingId) {
  // REMEMBER RLS POLICIES
  const { data, error } = await supabase.from('bookings').delete().eq('id', bookingId)

  if (error) {
    console.error(error)
    throw new Error('Booking could not be deleted')
  }

  return data
}

// Returns all BOOKINGS that are were created after the given date. Useful to get bookings created in the last 30 days, for example.
export async function getBookingsAfterDate(date) {
  const { data, error } = await supabase
    .from('bookings')
    .select('created_at, totalPrice, extrasPrice')
    .gte('created_at', date)
    .lte('created_at', getToday({ end: true }))

  if (error) {
    console.error(error)
    throw new Error('Bookings could not get loaded')
  }

  return data
}

// Returns all STAYS that are were created after the given date
export async function getStaysAfterDate(date) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, guests(fullName)')
    .gte('startTime', date)
    .lte('startTime', getToday())

  if (error) {
    console.error(error)
    throw new Error('Bookings could not get loaded')
  }

  return data
}

// Activity means that there is a check in or a check out today
export async function getStaysTodayActivity() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, guests(fullName, nationality, countryFlag)')
    .or(
      `and(status.eq.unconfirmed,startTime.eq.${getToday()}),and(status.eq.checked-in,endTime.eq.${getToday()})`
    )
    .order('created_at')

  // Equivalent to this. But by querying this, we only download the data we actually need, otherwise we would need ALL bookings ever created
  // (stay.status === 'unconfirmed' && isToday(new Date(stay.startTime))) ||

  if (error) {
    console.error(error)
    throw new Error('Bookings could not get loaded')
  }
  return data
}

export async function createBooking(bookingData) {
  // REMEMBER RLS POLICIES
  const { data, error } = await supabase.from('bookings').insert([bookingData]).select().single()

  if (error) {
    console.error(error)
    throw new Error('Booking could not be created')
  }

  return data
}
