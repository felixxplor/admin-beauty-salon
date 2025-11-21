import supabase from './supabase'

/**
 * Generate a unique voucher code (5 characters: letters and numbers)
 */
export const generateVoucherCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar looking: I, O, 0, 1
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Get all vouchers with optional filters
 */
export const getVouchers = async (filters = {}) => {
  try {
    let query = supabase
      .from('vouchers')
      .select(
        `
        *,
        client:client(id, fullName, email, phone),
        issuedBy:staff!vouchers_issued_by_fkey(id, name)
      `
      )
      .order('issue_date', { ascending: false })

    // Apply filters
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId)
    }
    if (filters.search) {
      query = query.or(`code.ilike.%${filters.search}%,notes.ilike.%${filters.search}%`)
    }

    const { data, error } = await query

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching vouchers:', error)
    throw error
  }
}

/**
 * Get a single voucher by ID
 */
export const getVoucher = async (id) => {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select(
        `
        *,
        client:client(id, fullName, email, phone),
        issuedBy:staff!vouchers_issued_by_fkey(id, name)
      `
      )
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching voucher:', error)
    throw error
  }
}

/**
 * Get voucher by code
 */
export const getVoucherByCode = async (code) => {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .select(
        `
        *,
        client:client(id, fullName, email, phone),
        issuedBy:staff!vouchers_issued_by_fkey(id, name)
      `
      )
      .eq('code', code.toUpperCase())
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching voucher by code:', error)
    throw error
  }
}

/**
 * Create a new voucher
 */
export const createVoucher = async (voucherData) => {
  try {
    const code = voucherData.code || generateVoucherCode()

    const { data, error } = await supabase
      .from('vouchers')
      .insert([
        {
          code: code.toUpperCase(),
          client_id: voucherData.clientId || null,
          amount: parseFloat(voucherData.amount),
          balance: parseFloat(voucherData.amount), // Initial balance equals amount
          issue_date: voucherData.issueDate || new Date().toISOString(),
          expiry_date: voucherData.expiryDate || null, // Will be set by trigger
          issued_by: voucherData.issuedBy || null,
          notes: voucherData.notes || null,
          status: 'active',
        },
      ])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating voucher:', error)
    throw error
  }
}

/**
 * Update a voucher
 */
export const updateVoucher = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .update({
        client_id: updates.clientId,
        notes: updates.notes,
        status: updates.status,
        // Only allow updating certain fields
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating voucher:', error)
    throw error
  }
}

/**
 * Redeem/use a voucher
 */
export const redeemVoucher = async (
  voucherId,
  redemptionAmount,
  bookingId = null,
  transactionId = null,
  notes = null,
  createdBy = null
) => {
  try {
    // Get current voucher
    const { data: voucher, error: fetchError } = await supabase
      .from('vouchers')
      .select('*')
      .eq('id', voucherId)
      .single()

    if (fetchError) throw fetchError

    // Validate voucher
    if (voucher.status !== 'active') {
      throw new Error('Voucher is not active')
    }

    if (new Date(voucher.expiry_date) < new Date()) {
      throw new Error('Voucher has expired')
    }

    if (voucher.balance < redemptionAmount) {
      throw new Error('Insufficient voucher balance')
    }

    // Calculate new balance
    const newBalance = parseFloat(voucher.balance) - parseFloat(redemptionAmount)
    const newStatus = newBalance === 0 ? 'redeemed' : 'active'

    // Update voucher balance
    const { error: updateError } = await supabase
      .from('vouchers')
      .update({
        balance: newBalance,
        status: newStatus,
      })
      .eq('id', voucherId)

    if (updateError) throw updateError

    // Log the transaction
    const { error: transactionError } = await supabase.from('voucher_transactions').insert([
      {
        voucher_id: voucherId,
        transaction_type: 'redemption',
        amount: parseFloat(redemptionAmount),
        balance_after: newBalance,
        booking_id: bookingId,
        transaction_id: transactionId,
        notes: notes,
        created_by: createdBy,
      },
    ])

    if (transactionError) throw transactionError

    return { success: true, newBalance, newStatus }
  } catch (error) {
    console.error('Error redeeming voucher:', error)
    throw error
  }
}

/**
 * Cancel a voucher
 */
export const cancelVoucher = async (id, reason = null) => {
  try {
    const { data, error } = await supabase
      .from('vouchers')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error cancelling voucher:', error)
    throw error
  }
}

/**
 * Get voucher transaction history
 */
export const getVoucherTransactions = async (voucherId) => {
  try {
    // Try with just the booking join first
    let { data, error } = await supabase
      .from('voucher_transactions')
      .select(
        `
        *,
        booking:bookings(id, startTime)
      `
      )
      .eq('voucher_id', voucherId)
      .order('created_at', { ascending: false })

    // If booking join fails, try without it
    if (error && error.message?.includes('booking')) {
      // console.log('Booking join failed, trying without it...')
      const result = await supabase
        .from('voucher_transactions')
        .select('*')
        .eq('voucher_id', voucherId)
        .order('created_at', { ascending: false })

      data = result.data
      error = result.error
    }

    // Try to add staff join if basic query works
    if (!error && data) {
      try {
        const { data: dataWithStaff, error: staffError } = await supabase
          .from('voucher_transactions')
          .select(
            `
            *,
            booking:bookings(id, startTime),
            createdBy:staff(id, name)
          `
          )
          .eq('voucher_id', voucherId)
          .order('created_at', { ascending: false })

        if (!staffError) {
          data = dataWithStaff
        }
      } catch (staffJoinError) {
        // console.log('Staff join failed, using basic data')
      }
    }

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching voucher transactions:', error)
    throw error
  }
}

/**
 * Mark expired vouchers (can be run periodically)
 */
export const markExpiredVouchers = async () => {
  try {
    const { error } = await supabase.rpc('mark_expired_vouchers')
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error marking expired vouchers:', error)
    throw error
  }
}

/**
 * Get voucher statistics
 */
export const getVoucherStats = async () => {
  try {
    const { data, error } = await supabase.from('vouchers').select('status, amount, balance')

    if (error) throw error

    const stats = {
      total: data.length,
      active: data.filter((v) => v.status === 'active').length,
      redeemed: data.filter((v) => v.status === 'redeemed').length,
      expired: data.filter((v) => v.status === 'expired').length,
      cancelled: data.filter((v) => v.status === 'cancelled').length,
      totalValue: data.reduce((sum, v) => sum + parseFloat(v.amount), 0),
      totalBalance: data.reduce((sum, v) => sum + parseFloat(v.balance), 0),
    }

    return stats
  } catch (error) {
    console.error('Error fetching voucher stats:', error)
    throw error
  }
}
