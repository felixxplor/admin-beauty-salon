import supabase from './supabase'

export async function getClient() {
  const { data, error } = await supabase.from('client').select('*')

  if (error) {
    console.error(error)
    throw new Error('Clients could not be loaded')
  }

  return data
}

export async function createClient(clientData) {
  const { data, error } = await supabase.from('client').insert([clientData]).select().single()

  if (error) {
    console.error(error)
    throw new Error('Client could not be created')
  }

  return data
}
