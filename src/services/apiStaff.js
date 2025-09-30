import supabase from './supabase'

export async function getStaff() {
  const { data, error } = await supabase.from('staff').select('*')

  if (error) {
    console.error(error)
    throw new Error('Staff could not be loaded')
  }

  return data
}
