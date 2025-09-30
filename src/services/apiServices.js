import supabase from './supabase'

export async function getServices() {
  const { data, error } = await supabase.from('services').select('*')

  if (error) {
    console.error(error)
    throw new Error('Services could not be loaded')
  }

  return data
}

export async function createEditService(newService, id) {
  //1. Create or edit service
  let query = supabase.from('services')

  // A) CREATE
  if (!id) query = query.insert([newService])

  // B) EDIT
  if (id) query = query.update(newService).eq('id', id)

  const { data, error } = await query.select().single()

  if (error) {
    console.error(error)
    throw new Error('Service could not be created')
  }

  return data
}

export async function deleteService(id) {
  const { data, error } = await supabase.from('services').delete().eq('id', id)

  if (error) {
    console.error(error)
    throw new Error('Services could not be deleted')
  }

  return data
}
