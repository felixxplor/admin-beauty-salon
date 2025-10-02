import supabase from './supabase'

export async function getStaff() {
  const { data, error } = await supabase.from('staff').select('*')

  if (error) {
    console.error(error)
    throw new Error('Staff could not be loaded')
  }

  return data
}

export async function getStaffShifts() {
  const { data, error } = await supabase
    .from('staff_shifts')
    .select('*')
    .order('dayOfWeek', { ascending: true })

  if (error) {
    console.error('Error fetching staff shifts:', error)
    throw new Error('Staff shifts could not be loaded')
  }

  return data
}
