// Enhanced apiRoster.js - API service for both recurring and specific date shifts

import supabase from './supabase'

// Get all staff shifts with optional filters
export async function getStaffShifts(filters = {}) {
  try {
    let query = supabase.from('staff_shifts').select(`
        *,
        staff:staffId (
          id,
          name
        )
      `)

    // Apply filters
    if (filters.staffId) {
      query = query.eq('staffId', filters.staffId)
    }

    if (filters.dayOfWeek !== undefined && filters.dayOfWeek !== '') {
      query = query.eq('dayOfWeek', filters.dayOfWeek)
    }

    if (filters.specificDate) {
      query = query.eq('specificDate', filters.specificDate)
    }

    if (filters.dateRange) {
      query = query
        .gte('specificDate', filters.dateRange.start)
        .lte('specificDate', filters.dateRange.end)
    }

    // Default ordering
    query = query
      .order('specificDate', { ascending: true, nullsFirst: false })
      .order('dayOfWeek', { ascending: true, nullsFirst: false })
      .order('startTime', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching staff shifts:', error)
      throw new Error(error.message || 'Failed to fetch staff shifts')
    }

    return data || []
  } catch (err) {
    console.error('Unexpected error in getStaffShifts:', err)
    throw err
  }
}

// Create a new staff shift (handles both recurring and specific date)
export async function createStaffShift(shiftData) {
  try {
    // Validate required fields
    if (!shiftData.staffId) {
      throw new Error('Staff ID is required')
    }
    if (!shiftData.startTime) {
      throw new Error('Start time is required')
    }
    if (!shiftData.endTime) {
      throw new Error('End time is required')
    }

    // Validate shift type
    const isRecurring = shiftData.dayOfWeek !== null && shiftData.dayOfWeek !== undefined
    const isSpecific = shiftData.specificDate !== null && shiftData.specificDate !== undefined

    if (!isRecurring && !isSpecific) {
      throw new Error('Either day of week or specific date must be provided')
    }

    if (isRecurring && isSpecific) {
      throw new Error('Cannot set both day of week and specific date')
    }

    // Check for conflicts
    if (isRecurring) {
      // Check if staff already has a recurring shift on this day
      const { data: existingRecurring, error: recurringError } = await supabase
        .from('staff_shifts')
        .select('id')
        .eq('staffId', shiftData.staffId)
        .eq('dayOfWeek', shiftData.dayOfWeek)
        .is('specificDate', null)

      if (recurringError) {
        console.error('Error checking existing recurring shifts:', recurringError)
        throw new Error('Failed to validate shift uniqueness')
      }

      if (existingRecurring && existingRecurring.length > 0) {
        throw new Error('Staff member already has a recurring shift on this day')
      }
    } else {
      // Check if staff already has a shift on this specific date
      const { data: existingSpecific, error: specificError } = await supabase
        .from('staff_shifts')
        .select('id')
        .eq('staffId', shiftData.staffId)
        .eq('specificDate', shiftData.specificDate)

      if (specificError) {
        console.error('Error checking existing specific shifts:', specificError)
        throw new Error('Failed to validate shift uniqueness')
      }

      if (existingSpecific && existingSpecific.length > 0) {
        throw new Error('Staff member already has a shift scheduled for this date')
      }
    }

    // Create the shift
    const insertData = {
      staffId: shiftData.staffId,
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      notes: shiftData.notes || null,
    }

    if (isRecurring) {
      insertData.dayOfWeek = shiftData.dayOfWeek
      insertData.specificDate = null
    } else {
      insertData.specificDate = shiftData.specificDate
      insertData.dayOfWeek = null
    }

    const { data, error } = await supabase
      .from('staff_shifts')
      .insert([insertData])
      .select(
        `
        *,
        staff:staffId (
          id,
          name
        )
      `
      )
      .single()

    if (error) {
      console.error('Error creating staff shift:', error)
      throw new Error(error.message || 'Failed to create staff shift')
    }

    return data
  } catch (err) {
    console.error('Unexpected error in createStaffShift:', err)
    throw err
  }
}

// Get shifts for a specific date range (includes both recurring and specific)
export async function getShiftsForDateRange(startDate, endDate, staffId = null) {
  try {
    const shifts = []

    // Get specific date shifts within the range
    let specificQuery = supabase
      .from('staff_shifts')
      .select(
        `
        *,
        staff:staffId (
          id,
          name
        )
      `
      )
      .gte('specificDate', startDate)
      .lte('specificDate', endDate)
      .not('specificDate', 'is', null)

    if (staffId) {
      specificQuery = specificQuery.eq('staffId', staffId)
    }

    const { data: specificShifts, error: specificError } = await specificQuery

    if (specificError) {
      console.error('Error fetching specific shifts:', specificError)
      throw new Error('Failed to fetch specific date shifts')
    }

    shifts.push(...(specificShifts || []))

    // Get recurring shifts and generate them for the date range
    let recurringQuery = supabase
      .from('staff_shifts')
      .select(
        `
        *,
        staff:staffId (
          id,
          name
        )
      `
      )
      .is('specificDate', null)
      .not('dayOfWeek', 'is', null)

    if (staffId) {
      recurringQuery = recurringQuery.eq('staffId', staffId)
    }

    const { data: recurringShifts, error: recurringError } = await recurringQuery

    if (recurringError) {
      console.error('Error fetching recurring shifts:', recurringError)
      throw new Error('Failed to fetch recurring shifts')
    }

    // Generate recurring shifts for each day in the range
    if (recurringShifts && recurringShifts.length > 0) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay()

        const recurringForDay = recurringShifts.filter((shift) => shift.dayOfWeek === dayOfWeek)

        recurringForDay.forEach((shift) => {
          shifts.push({
            ...shift,
            effectiveDate: d.toISOString().split('T')[0], // Add the actual date
            isRecurring: true,
          })
        })
      }
    }

    // Sort by date and time
    shifts.sort((a, b) => {
      const dateA = a.specificDate || a.effectiveDate
      const dateB = b.specificDate || b.effectiveDate

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB)
      }

      return a.startTime.localeCompare(b.startTime)
    })

    return shifts
  } catch (err) {
    console.error('Unexpected error in getShiftsForDateRange:', err)
    throw err
  }
}

// Get shifts for a specific date (including recurring shifts that fall on that date)
export async function getShiftsForDate(date, staffId = null) {
  try {
    const shifts = []
    const targetDate = new Date(date)
    const dayOfWeek = targetDate.getDay()

    // Get specific date shifts
    let specificQuery = supabase
      .from('staff_shifts')
      .select(
        `
        *,
        staff:staffId (
          id,
          name
        )
      `
      )
      .eq('specificDate', date)

    if (staffId) {
      specificQuery = specificQuery.eq('staffId', staffId)
    }

    const { data: specificShifts, error: specificError } = await specificQuery

    if (specificError) {
      console.error('Error fetching specific shifts:', specificError)
      throw new Error('Failed to fetch specific date shifts')
    }

    shifts.push(...(specificShifts || []))

    // Get recurring shifts for this day of week
    let recurringQuery = supabase
      .from('staff_shifts')
      .select(
        `
        *,
        staff:staffId (
          id,
          name
        )
      `
      )
      .eq('dayOfWeek', dayOfWeek)
      .is('specificDate', null)

    if (staffId) {
      recurringQuery = recurringQuery.eq('staffId', staffId)
    }

    const { data: recurringShifts, error: recurringError } = await recurringQuery

    if (recurringError) {
      console.error('Error fetching recurring shifts:', recurringError)
      throw new Error('Failed to fetch recurring shifts')
    }

    // Add recurring shifts with effective date
    if (recurringShifts) {
      recurringShifts.forEach((shift) => {
        shifts.push({
          ...shift,
          effectiveDate: date,
          isRecurring: true,
        })
      })
    }

    // Sort by start time
    shifts.sort((a, b) => a.startTime.localeCompare(b.startTime))

    return shifts
  } catch (err) {
    console.error('Unexpected error in getShiftsForDate:', err)
    throw err
  }
}

// Update an existing staff shift
export async function updateStaffShift(id, updateData) {
  try {
    // Validate if provided
    if (updateData.staffId !== undefined && !updateData.staffId) {
      throw new Error('Staff ID is required')
    }
    if (updateData.startTime !== undefined && !updateData.startTime) {
      throw new Error('Start time is required')
    }
    if (updateData.endTime !== undefined && !updateData.endTime) {
      throw new Error('End time is required')
    }

    // Update the shift
    const { data, error } = await supabase
      .from('staff_shifts')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        staff:staffId (
          id,
          name
        )
      `
      )
      .single()

    if (error) {
      console.error('Error updating staff shift:', error)
      throw new Error(error.message || 'Failed to update staff shift')
    }

    return data
  } catch (err) {
    console.error('Unexpected error in updateStaffShift:', err)
    throw err
  }
}

// Delete a staff shift
export async function deleteStaffShift(id) {
  try {
    const { error } = await supabase.from('staff_shifts').delete().eq('id', id)

    if (error) {
      console.error('Error deleting staff shift:', error)
      throw new Error(error.message || 'Failed to delete staff shift')
    }

    return { success: true }
  } catch (err) {
    console.error('Unexpected error in deleteStaffShift:', err)
    throw err
  }
}

// Get all recurring shifts (weekly schedule)
export async function getRecurringShifts(staffId = null) {
  try {
    let query = supabase
      .from('staff_shifts')
      .select(
        `
        *,
        staff:staffId (
          id,
          name
        )
      `
      )
      .is('specificDate', null)
      .order('dayOfWeek', { ascending: true })
      .order('startTime', { ascending: true })

    if (staffId) {
      query = query.eq('staffId', staffId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching recurring shifts:', error)
      throw new Error(error.message || 'Failed to fetch recurring shifts')
    }

    return data || []
  } catch (err) {
    console.error('Unexpected error in getRecurringShifts:', err)
    throw err
  }
}

// Get all specific date shifts within a date range
export async function getSpecificDateShifts(startDate = null, endDate = null, staffId = null) {
  try {
    let query = supabase
      .from('staff_shifts')
      .select(
        `
        *,
        staff:staffId (
          id,
          name
        )
      `
      )
      .not('specificDate', 'is', null)
      .order('specificDate', { ascending: true })
      .order('startTime', { ascending: true })

    if (startDate) {
      query = query.gte('specificDate', startDate)
    }

    if (endDate) {
      query = query.lte('specificDate', endDate)
    }

    if (staffId) {
      query = query.eq('staffId', staffId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching specific date shifts:', error)
      throw new Error(error.message || 'Failed to fetch specific date shifts')
    }

    return data || []
  } catch (err) {
    console.error('Unexpected error in getSpecificDateShifts:', err)
    throw err
  }
}

// Check if staff member is available at a specific date and time
export async function checkStaffAvailability(
  staffId,
  date,
  startTime,
  endTime,
  excludeShiftId = null
) {
  try {
    const shifts = await getShiftsForDate(date, staffId)

    // Filter out the shift we're updating (if any)
    const relevantShifts = shifts.filter((shift) => shift.id !== excludeShiftId)

    // Check for time conflicts
    const hasConflict = relevantShifts.some((shift) => {
      // Check if times overlap
      return startTime < shift.endTime && endTime > shift.startTime
    })

    return !hasConflict
  } catch (err) {
    console.error('Unexpected error in checkStaffAvailability:', err)
    throw err
  }
}

// Export all functions
export default {
  getStaffShifts,
  createStaffShift,
  updateStaffShift,
  deleteStaffShift,
  getShiftsForDateRange,
  getShiftsForDate,
  getRecurringShifts,
  getSpecificDateShifts,
  checkStaffAvailability,
}
