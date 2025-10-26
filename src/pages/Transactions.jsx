import React, { useState, useEffect } from 'react'
import {
  Calendar,
  DollarSign,
  CreditCard,
  Banknote,
  TrendingUp,
  FileText,
  ChevronDown,
  ChevronUp,
  DoorOpen,
  Package,
  Filter,
  Download,
  LogOut,
  User,
  Phone,
} from 'lucide-react'
import supabase from '../services/supabase'
import PinProtection from '../ui/PinProtection'

const Transactions = () => {
  const [transactions, setTransactions] = useState([])
  const [cashDrawerLogs, setCashDrawerLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getTodaySydney())
  const [expandedTransaction, setExpandedTransaction] = useState(null)
  const [activeTab, setActiveTab] = useState('transactions')
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all')
  const [filterStaff, setFilterStaff] = useState('all')
  const [staffList, setStaffList] = useState([])
  const [staffLoading, setStaffLoading] = useState(true)

  // Timezone utility functions
  function getTodaySydney() {
    // Get current date/time in Sydney timezone
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    const parts = formatter.formatToParts(now)
    const year = parts.find((p) => p.type === 'year').value
    const month = parts.find((p) => p.type === 'month').value
    const day = parts.find((p) => p.type === 'day').value

    return `${year}-${month}-${day}`
  }

  function getStartOfDaySydney(dateString) {
    // Parse the date string and create a date at midnight Sydney time
    const [year, month, day] = dateString.split('-').map(Number)

    // Create a date object representing midnight on that day
    const date = new Date(year, month - 1, day, 0, 0, 0, 0)

    // Get the Sydney timezone offset in minutes
    const sydneyDateStr = date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
    const sydneyDate = new Date(sydneyDateStr)
    const localDate = new Date(
      date.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    )
    const offsetMinutes = (localDate - sydneyDate) / (1000 * 60)

    // Adjust for Sydney timezone
    const sydneyMidnight = new Date(date.getTime() - offsetMinutes * 60 * 1000)

    return sydneyMidnight.toISOString()
  }

  function getEndOfDaySydney(dateString) {
    const [year, month, day] = dateString.split('-').map(Number)

    // Create a date object representing 23:59:59 on that day
    const date = new Date(year, month - 1, day, 23, 59, 59, 999)

    // Get the Sydney timezone offset
    const sydneyDateStr = date.toLocaleString('en-US', { timeZone: 'Australia/Sydney' })
    const sydneyDate = new Date(sydneyDateStr)
    const localDate = new Date(
      date.toLocaleString('en-US', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })
    )
    const offsetMinutes = (localDate - sydneyDate) / (1000 * 60)

    // Adjust for Sydney timezone
    const sydneyEndOfDay = new Date(date.getTime() - offsetMinutes * 60 * 1000)

    return sydneyEndOfDay.toISOString()
  }

  useEffect(() => {
    loadData()
  }, [selectedDate])

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase.from('staff').select('id, name').order('name')

      if (error) throw error
      setStaffList(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setStaffLoading(false)
    }
  }

  const getStaffName = (staffId) => {
    if (!staffId) return 'N/A'
    const staff = staffList.find((s) => s.id === staffId)
    return staff ? staff.name : 'Unknown'
  }

  const loadData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadTransactions(), loadCashDrawerLogs()])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    const startOfDay = getStartOfDaySydney(selectedDate)
    const endOfDay = getEndOfDaySydney(selectedDate)

    const { data, error } = await supabase
      .from('transactions')
      .select('*, staff')
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Error loading transactions:', error)
      return
    }

    setTransactions(data || [])
  }

  const loadCashDrawerLogs = async () => {
    const startOfDay = getStartOfDaySydney(selectedDate)
    const endOfDay = getEndOfDaySydney(selectedDate)

    const { data, error } = await supabase
      .from('cash_drawer_logs')
      .select('*')
      .gte('timestamp', startOfDay)
      .lte('timestamp', endOfDay)
      .order('timestamp', { ascending: false })

    if (error) {
      console.error('Error loading cash drawer logs:', error)
      return
    }

    setCashDrawerLogs(data || [])
  }

  const handleLock = () => {
    sessionStorage.removeItem('transactionsUnlocked')
    window.location.reload()
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Australia/Sydney',
    })
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-AU', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Australia/Sydney',
    })
  }

  const filteredTransactions = transactions.filter((t) => {
    const matchesPaymentMethod =
      filterPaymentMethod === 'all' || t.payment_method === filterPaymentMethod
    const matchesStaff = filterStaff === 'all' || t.staff === parseInt(filterStaff)
    return matchesPaymentMethod && matchesStaff
  })

  const dailyStats = {
    totalTransactions: filteredTransactions.length,
    totalRevenue: filteredTransactions.reduce((sum, t) => sum + parseFloat(t.total), 0),
    cashTransactions: filteredTransactions.filter((t) => t.payment_method === 'cash').length,
    cardTransactions: filteredTransactions.filter((t) => t.payment_method === 'card').length,
    payidTransactions: filteredTransactions.filter((t) => t.payment_method === 'payid').length,
    totalCash: filteredTransactions
      .filter((t) => t.payment_method === 'cash')
      .reduce((sum, t) => sum + parseFloat(t.total), 0),
    totalCard: filteredTransactions
      .filter((t) => t.payment_method === 'card')
      .reduce((sum, t) => sum + parseFloat(t.total), 0),
    totalPayID: filteredTransactions
      .filter((t) => t.payment_method === 'payid')
      .reduce((sum, t) => sum + parseFloat(t.total), 0),
    totalDiscounts: filteredTransactions.reduce(
      (sum, t) => sum + parseFloat(t.discount_amount || 0),
      0
    ),
  }

  const toggleTransactionDetails = (transactionId) => {
    setExpandedTransaction(expandedTransaction === transactionId ? null : transactionId)
  }

  const exportToCSV = () => {
    const csvData = filteredTransactions.map((t) => ({
      Time: formatTime(t.timestamp),
      'Payment Method': t.payment_method,
      Staff: getStaffName(t.staff),
      Subtotal: t.subtotal,
      'Discount Amount': t.discount_amount || 0,
      Total: t.total,
      'Cash Received': t.cash_received || 'N/A',
      'Change Given': t.change_given || 'N/A',
      Notes: t.notes || '',
    }))

    const headers = Object.keys(csvData[0])
    const csv = [
      headers.join(','),
      ...csvData.map((row) => headers.map((header) => row[header]).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${selectedDate}.csv`
    a.click()
  }

  return (
    <PinProtection>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>💰 Transactions & Cash Drawer</h1>
            <p style={styles.subtitle}>
              View daily transactions and cash drawer activity (Sydney Time)
            </p>
          </div>

          <div style={styles.headerActions}>
            {/* Date Picker */}
            <div style={styles.datePicker}>
              <Calendar size={20} style={{ color: '#6B7280', marginRight: '8px' }} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={styles.dateInput}
                max={getTodaySydney()}
              />
            </div>

            {/* Lock Button */}
            <button onClick={handleLock} style={styles.lockButton} title="Lock Page">
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Daily Statistics Cards */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <FileText size={24} color="#3B82F6" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Total Transactions</p>
              <p style={styles.statValue}>{dailyStats.totalTransactions}</p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <TrendingUp size={24} color="#10B981" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Total Revenue</p>
              <p style={styles.statValue}>${dailyStats.totalRevenue.toFixed(2)}</p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Banknote size={24} color="#F59E0B" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Cash Sales</p>
              <p style={styles.statValue}>${dailyStats.totalCash.toFixed(2)}</p>
              <p style={styles.statSubtext}>{dailyStats.cashTransactions} transactions</p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <CreditCard size={24} color="#8B5CF6" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>Card Sales</p>
              <p style={styles.statValue}>${dailyStats.totalCard.toFixed(2)}</p>
              <p style={styles.statSubtext}>{dailyStats.cardTransactions} transactions</p>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statIcon}>
              <Phone size={24} color="#EC4899" />
            </div>
            <div style={styles.statContent}>
              <p style={styles.statLabel}>PayID Sales</p>
              <p style={styles.statValue}>${dailyStats.totalPayID.toFixed(2)}</p>
              <p style={styles.statSubtext}>{dailyStats.payidTransactions} transactions</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              ...styles.tab,
              ...(activeTab === 'transactions' ? styles.tabActive : {}),
            }}
          >
            <FileText size={18} />
            <span style={{ marginLeft: '8px' }}>Transactions</span>
          </button>
          <button
            onClick={() => setActiveTab('drawer')}
            style={{
              ...styles.tab,
              ...(activeTab === 'drawer' ? styles.tabActive : {}),
            }}
          >
            <DoorOpen size={18} />
            <span style={{ marginLeft: '8px' }}>Cash Drawer Logs</span>
          </button>
        </div>

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            {/* Filter and Export Bar */}
            <div style={styles.filterBar}>
              <div style={styles.filterGroup}>
                <Filter size={18} color="#6B7280" />
                <select
                  value={filterPaymentMethod}
                  onChange={(e) => setFilterPaymentMethod(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cash">Cash Only</option>
                  <option value="card">Card Only</option>
                  <option value="payid">PayID Only</option>
                </select>

                <select
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  style={styles.filterSelect}
                  disabled={staffLoading}
                >
                  <option value="all">All Staff</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={exportToCSV} style={styles.exportButton}>
                <Download size={18} />
                <span style={{ marginLeft: '8px' }}>Export CSV</span>
              </button>
            </div>

            {/* Transactions List */}
            <div style={styles.transactionsList}>
              {loading ? (
                <div style={styles.loading}>Loading transactions...</div>
              ) : filteredTransactions.length === 0 ? (
                <div style={styles.emptyState}>
                  <Package size={48} color="#D1D5DB" />
                  <p style={styles.emptyText}>
                    No transactions found for {formatDate(selectedDate + 'T00:00:00')}
                  </p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div key={transaction.id} style={styles.transactionCard}>
                    {/* Transaction Header */}
                    <div
                      style={styles.transactionHeader}
                      onClick={() => toggleTransactionDetails(transaction.id)}
                    >
                      <div style={styles.transactionInfo}>
                        <div style={styles.transactionTime}>
                          {formatTime(transaction.timestamp)}
                        </div>
                        <div style={styles.paymentMethodBadge}>
                          {transaction.payment_method === 'cash' ? (
                            <>
                              <Banknote size={16} />
                              <span style={{ marginLeft: '4px' }}>Cash</span>
                            </>
                          ) : transaction.payment_method === 'payid' ? (
                            <>
                              <Phone size={16} />
                              <span style={{ marginLeft: '4px' }}>PayID</span>
                            </>
                          ) : (
                            <>
                              <CreditCard size={16} />
                              <span style={{ marginLeft: '4px' }}>Card</span>
                            </>
                          )}
                        </div>
                        <div
                          style={{
                            ...styles.paymentMethodBadge,
                            backgroundColor: '#EEF2FF',
                            color: '#4F46E5',
                          }}
                        >
                          <User size={16} />
                          <span style={{ marginLeft: '4px' }}>
                            {staffLoading ? '...' : getStaffName(transaction.staff)}
                          </span>
                        </div>
                      </div>

                      <div style={styles.transactionAmount}>
                        <span style={styles.totalAmount}>${transaction.total}</span>
                        {expandedTransaction === transaction.id ? (
                          <ChevronUp size={20} color="#6B7280" />
                        ) : (
                          <ChevronDown size={20} color="#6B7280" />
                        )}
                      </div>
                    </div>

                    {/* Transaction Details (Expanded) */}
                    {expandedTransaction === transaction.id && (
                      <div style={styles.transactionDetails}>
                        <div style={styles.detailsGrid}>
                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Subtotal:</span>
                            <span style={styles.detailValue}>${transaction.subtotal}</span>
                          </div>

                          {transaction.discount_amount > 0 && (
                            <>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Discount Type:</span>
                                <span style={styles.detailValue}>
                                  {transaction.discount_type === 'percentage'
                                    ? `${transaction.discount_value}%`
                                    : `$${transaction.discount_value}`}
                                </span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={{ ...styles.detailLabel, color: '#EF4444' }}>
                                  Discount:
                                </span>
                                <span style={{ ...styles.detailValue, color: '#EF4444' }}>
                                  -${transaction.discount_amount}
                                </span>
                              </div>
                            </>
                          )}

                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Total:</span>
                            <span style={{ ...styles.detailValue, fontWeight: '700' }}>
                              ${transaction.total}
                            </span>
                          </div>

                          {transaction.payment_method === 'cash' && (
                            <>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Cash Received:</span>
                                <span style={styles.detailValue}>${transaction.cash_received}</span>
                              </div>
                              <div style={styles.detailItem}>
                                <span style={styles.detailLabel}>Change Given:</span>
                                <span style={styles.detailValue}>${transaction.change_given}</span>
                              </div>
                            </>
                          )}

                          <div style={styles.detailItem}>
                            <span style={styles.detailLabel}>Staff Member:</span>
                            <span style={styles.detailValue}>
                              {staffLoading ? 'Loading...' : getStaffName(transaction.staff)}
                            </span>
                          </div>

                          {transaction.notes && (
                            <div style={{ ...styles.detailItem, gridColumn: '1 / -1' }}>
                              <span style={styles.detailLabel}>Notes:</span>
                              <span style={styles.detailValue}>{transaction.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Items List */}
                        <div style={styles.itemsList}>
                          <h4 style={styles.itemsTitle}>Items</h4>
                          {Array.isArray(transaction.items) &&
                            transaction.items.map((item, index) => (
                              <div key={index} style={styles.itemRow}>
                                <div style={styles.itemInfo}>
                                  <span style={styles.itemName}>{item.name}</span>
                                  <span style={styles.itemQuantity}>x{item.quantity}</span>
                                </div>
                                <span style={styles.itemPrice}>
                                  $
                                  {item.isPOA && item.customPrice
                                    ? (parseFloat(item.customPrice) * item.quantity).toFixed(2)
                                    : (
                                        (parseFloat(item.regularPrice) - (item.discount || 0)) *
                                        item.quantity
                                      ).toFixed(2)}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Cash Drawer Logs Tab */}
        {activeTab === 'drawer' && (
          <div style={styles.drawerLogsList}>
            {loading ? (
              <div style={styles.loading}>Loading cash drawer logs...</div>
            ) : cashDrawerLogs.length === 0 ? (
              <div style={styles.emptyState}>
                <DoorOpen size={48} color="#D1D5DB" />
                <p style={styles.emptyText}>
                  No cash drawer activity for {formatDate(selectedDate + 'T00:00:00')}
                </p>
              </div>
            ) : (
              cashDrawerLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    ...styles.drawerLogCard,
                    ...(log.status === 'failed' ? styles.drawerLogFailed : {}),
                  }}
                >
                  <div style={styles.drawerLogHeader}>
                    <div style={styles.drawerLogInfo}>
                      <DoorOpen
                        size={20}
                        color={log.status === 'success' ? '#10B981' : '#EF4444'}
                      />
                      <div style={{ marginLeft: '12px' }}>
                        <p style={styles.drawerLogAction}>
                          {log.action === 'manual_open'
                            ? '🔓 Manual Open'
                            : log.action === 'drawer_opened'
                            ? '💰 Transaction - Drawer Opened'
                            : log.action}
                        </p>
                        <p style={styles.drawerLogTime}>{formatTime(log.timestamp)}</p>
                      </div>
                    </div>

                    <div style={styles.drawerLogStatus}>
                      <span
                        style={{
                          ...styles.statusBadge,
                          ...(log.status === 'success'
                            ? styles.statusSuccess
                            : styles.statusFailed),
                        }}
                      >
                        {log.status}
                      </span>
                      {log.amount && <span style={styles.drawerAmount}>${log.amount}</span>}
                    </div>
                  </div>

                  {log.error_message && (
                    <div style={styles.errorMessage}>
                      <strong>Error:</strong> {log.error_message}
                    </div>
                  )}

                  {log.metadata && (
                    <div style={styles.metadata}>
                      {log.metadata.reason && (
                        <span style={styles.metadataItem}>Reason: {log.metadata.reason}</span>
                      )}
                      {log.metadata.payment_method && (
                        <span style={styles.metadataItem}>
                          Payment: {log.metadata.payment_method}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </PinProtection>
  )
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '24px',
    backgroundColor: '#F9FAFB',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1F2937',
    margin: 0,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  datePicker: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
  },
  dateInput: {
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    color: '#1F2937',
    outline: 'none',
    cursor: 'pointer',
  },
  lockButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px',
    backgroundColor: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#6B7280',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    backgroundColor: '#F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#6B7280',
    margin: 0,
    marginBottom: '4px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1F2937',
    margin: 0,
  },
  statSubtext: {
    fontSize: '12px',
    color: '#9CA3AF',
    margin: 0,
    marginTop: '4px',
  },
  tabContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    backgroundColor: 'white',
    padding: '8px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  tab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#6B7280',
    transition: 'all 0.2s',
  },
  tabActive: {
    backgroundColor: '#3B82F6',
    color: 'white',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: '16px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #E5E7EB',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1F2937',
    backgroundColor: 'white',
    cursor: 'pointer',
    outline: 'none',
  },
  exportButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  transactionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  transactionCard: {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  transactionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  transactionInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  transactionTime: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentMethodBadge: {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  transactionAmount: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  totalAmount: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#10B981',
  },
  transactionDetails: {
    padding: '0 20px 20px 20px',
    borderTop: '1px solid #F3F4F6',
    paddingTop: '16px',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
  },
  detailItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: '13px',
    color: '#6B7280',
  },
  detailValue: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1F2937',
  },
  itemsList: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: '#F9FAFB',
    borderRadius: '8px',
  },
  itemsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
    marginBottom: '12px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #E5E7EB',
  },
  itemInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemName: {
    fontSize: '14px',
    color: '#1F2937',
  },
  itemQuantity: {
    fontSize: '13px',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  itemPrice: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1F2937',
  },
  drawerLogsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  drawerLogCard: {
    backgroundColor: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    borderLeft: '4px solid #10B981',
  },
  drawerLogFailed: {
    borderLeft: '4px solid #EF4444',
  },
  drawerLogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  drawerLogInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  drawerLogAction: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1F2937',
    margin: 0,
    marginBottom: '2px',
  },
  drawerLogTime: {
    fontSize: '12px',
    color: '#6B7280',
    margin: 0,
  },
  drawerLogStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statusSuccess: {
    backgroundColor: '#D1FAE5',
    color: '#065F46',
  },
  statusFailed: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  drawerAmount: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#10B981',
  },
  errorMessage: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#FEE2E2',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#991B1B',
  },
  metadata: {
    marginTop: '12px',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  metadataItem: {
    fontSize: '12px',
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  loading: {
    textAlign: 'center',
    padding: '48px',
    fontSize: '16px',
    color: '#6B7280',
    backgroundColor: 'white',
    borderRadius: '12px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '64px 24px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6B7280',
    marginTop: '16px',
  },
}

export default Transactions
