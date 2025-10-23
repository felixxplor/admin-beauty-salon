import React, { useState } from 'react'
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  DollarSign,
  CreditCard,
  Banknote,
  X,
  Search,
  Package,
  Unplug,
  DoorOpen,
} from 'lucide-react'
import { useServices } from '../features/services/useServices'
import Spinner from '../ui/Spinner'
import Empty from '../ui/Empty'
import supabase from '../services/supabase'
import { styles } from '../styles/POSStyles'

const POSSystem = () => {
  const { isLoading, services } = useServices()
  const [cart, setCart] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showPayment, setShowPayment] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [cashReceived, setCashReceived] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [serialPort, setSerialPort] = useState(null)
  const [cartDiscount, setCartDiscount] = useState('')
  const [discountType, setDiscountType] = useState('amount') // 'amount' or 'percentage'

  if (isLoading) return <Spinner />
  if (!services || !services.length) return <Empty resourceName="services" />

  // Add 'Popular' to the categories
  const regularCategories = [...new Set(services.map((s) => s.category))]
  const categories = ['All', 'Popular', ...regularCategories]

  const filteredServices = services.filter((service) => {
    const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase())

    // Handle category filtering
    let matchesCategory
    if (selectedCategory === 'All') {
      matchesCategory = true
    } else if (selectedCategory === 'Popular') {
      matchesCategory = service.popular === true
    } else {
      matchesCategory = service.category === selectedCategory
    }

    return matchesSearch && matchesCategory
  })

  const addToCart = (service) => {
    const existingItem = cart.find((item) => item.id === service.id)

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === service.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      )
    } else {
      const isPOA = service.isPOA || false
      setCart([...cart, { ...service, quantity: 1, customPrice: isPOA ? '' : null, isPOA }])
    }
  }

  const updateCustomPrice = (serviceId, price) => {
    setCart(cart.map((item) => (item.id === serviceId ? { ...item, customPrice: price } : item)))
  }

  const updateQuantity = (serviceId, change) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === serviceId) {
            const newQuantity = item.quantity + change
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (serviceId) => {
    setCart(cart.filter((item) => item.id !== serviceId))
  }

  const subtotal = cart.reduce((sum, item) => {
    // Use custom price for POA items, otherwise calculate normally
    let price
    if (item.isPOA && item.customPrice) {
      price = parseFloat(item.customPrice) || 0
    } else {
      const regularPrice = parseFloat(item.regularPrice) || 0
      const discount = item.discount || 0
      price = discount > 0 ? regularPrice - discount : regularPrice
    }
    return sum + price * item.quantity
  }, 0)

  // Calculate cart discount
  const cartDiscountValue = parseFloat(cartDiscount) || 0
  let discountAmount = 0
  if (discountType === 'percentage') {
    discountAmount = (subtotal * cartDiscountValue) / 100
  } else {
    discountAmount = cartDiscountValue
  }

  const total = Math.max(0, subtotal - discountAmount) // Ensure total is not negative

  const openCashDrawer = async () => {
    try {
      let port = serialPort

      // Only request port if we don't have one stored
      if (!port) {
        port = await navigator.serial.requestPort()
        setSerialPort(port)
      }

      // Check if port is already open
      if (!port.readable || !port.writable) {
        await port.open({ baudRate: 9600 })
      }

      const writer = port.writable.getWriter()
      const command = new Uint8Array([27, 112, 0, 25, 250])

      await writer.write(command)
      writer.releaseLock()

      // Don't close the port - keep it open for reuse
      return { success: true }
    } catch (error) {
      console.error('Cash drawer error:', error)
      // Reset port on error
      setSerialPort(null)
      return { success: false, error: error.message }
    }
  }

  const disconnectCashDrawer = async () => {
    if (serialPort) {
      try {
        await serialPort.close()
        setMessage({ type: 'success', text: 'Cash drawer disconnected successfully' })
      } catch (error) {
        console.error('Error closing port:', error)
        setMessage({ type: 'error', text: 'Error disconnecting cash drawer' })
      }
      setSerialPort(null)

      // Clear message after 2 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 2000)
    }
  }

  const manualOpenDrawer = async () => {
    setIsProcessing(true)
    try {
      const drawerResult = await openCashDrawer()
      if (drawerResult.success) {
        setMessage({ type: 'success', text: 'Cash drawer opened successfully' })

        // Log manual drawer opening
        await supabase.from('cash_drawer_logs').insert([
          {
            action: 'manual_open',
            user_id: 'current_user_id',
            timestamp: new Date().toISOString(),
            amount: null,
            status: 'success',
            metadata: {
              reason: 'manual_open',
            },
          },
        ])
      } else {
        setMessage({ type: 'error', text: 'Failed to open cash drawer' })
      }
    } catch (error) {
      console.error('Manual drawer open error:', error)
      setMessage({ type: 'error', text: 'Error opening cash drawer' })
    } finally {
      setIsProcessing(false)

      // Clear message after 2 seconds
      setTimeout(() => {
        setMessage({ type: '', text: '' })
      }, 2000)
    }
  }

  const logTransaction = async () => {
    const transactionData = {
      items: cart,
      subtotal: subtotal,
      discount_type: discountType,
      discount_value: cartDiscountValue,
      discount_amount: discountAmount,
      total: total,
      payment_method: paymentMethod,
      cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : null,
      change_given: paymentMethod === 'cash' ? parseFloat(cashReceived) - total : null,
      timestamp: new Date().toISOString(),
      user_id: 'current_user_id',
    }

    const { error } = await supabase.from('transactions').insert([transactionData])

    if (error) {
      console.error('Transaction logging error:', error)
      throw new Error('Failed to log transaction')
    }

    if (paymentMethod === 'cash') {
      await supabase.from('cash_drawer_logs').insert([
        {
          action: 'drawer_opened',
          user_id: 0,
          timestamp: new Date().toISOString(),
          amount: total,
          status: 'success',
          metadata: {
            transaction_id: transactionData.timestamp,
            payment_method: paymentMethod,
          },
        },
      ])
    }
  }

  const processPayment = async () => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived)
      if (!received || received < total) {
        setMessage({ type: 'error', text: 'Insufficient cash received' })
        return
      }
    }

    setIsProcessing(true)
    setMessage({ type: '', text: '' })

    try {
      await logTransaction()

      if (paymentMethod === 'cash') {
        const drawerResult = await openCashDrawer()
        if (!drawerResult.success) {
          setMessage({ type: 'warning', text: 'Transaction logged but drawer failed to open' })
        }
      }

      setMessage({
        type: 'success',
        text: 'Payment processed successfully!',
      })

      setTimeout(() => {
        setCart([])
        setCashReceived('')
        setCartDiscount('')
        setDiscountType('amount')
        setShowPayment(false)
        setMessage({ type: '', text: '' })
      }, 2000)
    } catch (error) {
      console.error('Payment processing error:', error)
      setMessage({ type: 'error', text: error.message })
    } finally {
      setIsProcessing(false)
    }
  }

  const getServicePrice = (service) => {
    if (service.isPOA && service.customPrice) {
      return parseFloat(service.customPrice) || 0
    }
    const regularPrice = parseFloat(service.regularPrice) || 0
    const discount = service.discount || 0
    return discount > 0 ? regularPrice - discount : regularPrice
  }

  const change = cashReceived ? parseFloat(cashReceived) - total : 0

  return (
    <div style={styles.container}>
      {/* Services Panel */}
      <div style={styles.leftPanel}>
        {/* Search Bar */}
        <div style={styles.searchContainer}>
          <div style={styles.searchInputWrapper}>
            <Search style={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {/* Category Tabs */}
          <div style={styles.categoriesWrapper}>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  ...styles.categoryButton,
                  ...(selectedCategory === category ? styles.categoryButtonActive : {}),
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Services Grid */}
        <div style={styles.productsContainer}>
          {filteredServices.length === 0 ? (
            <div style={styles.emptyState}>
              <Package size={48} style={{ color: '#9CA3AF' }} />
              <p style={styles.emptyStateText}>No services found</p>
            </div>
          ) : (
            <div style={styles.productsGrid}>
              {filteredServices.map((service) => {
                const regularPrice = parseFloat(service.regularPrice) || 0
                const discount = service.discount || 0
                const finalPrice = discount > 0 ? regularPrice - discount : regularPrice

                return (
                  <div
                    key={service.id}
                    onClick={() => addToCart(service)}
                    style={styles.productCard}
                  >
                    {discount > 0 && <div style={styles.discountBadge}>-${discount}</div>}
                    {service.popular && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: '#FBBF24',
                          color: '#78350F',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                        }}
                      >
                        ⭐
                      </div>
                    )}

                    <h3 style={styles.productName}>{service.name}</h3>
                    <p style={styles.productDuration}>{service.duration} min</p>

                    <div style={styles.priceContainer}>
                      {service.isPOA ? (
                        <span
                          style={{
                            backgroundColor: '#DBEAFE',
                            color: '#1E40AF',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                          }}
                        >
                          POA
                        </span>
                      ) : (
                        <>
                          {discount > 0 && (
                            <span style={styles.originalPrice}>${regularPrice.toFixed(2)}</span>
                          )}
                          <span style={styles.productPrice}>${finalPrice.toFixed(2)}</span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel */}
      <div style={styles.cartPanel}>
        <div style={styles.cartHeader}>
          <div style={styles.cartTitle}>
            <ShoppingCart size={24} style={{ marginRight: '8px' }} />
            Cart ({cart.length})
          </div>

          {/* Cash Drawer Controls */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={manualOpenDrawer}
              disabled={isProcessing}
              style={{
                padding: '8px 12px',
                backgroundColor: '#60A5FA',
                color: 'white',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 1,
                transition: 'background-color 0.2s',
              }}
              onMouseOver={(e) => {
                if (!isProcessing) e.currentTarget.style.backgroundColor = '#3B82F6'
              }}
              onMouseOut={(e) => {
                if (!isProcessing) e.currentTarget.style.backgroundColor = '#60A5FA'
              }}
            >
              <DoorOpen size={16} />
              {isProcessing ? 'Opening...' : 'Open Drawer'}
            </button>

            {serialPort && (
              <button
                onClick={disconnectCashDrawer}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#FEE2E2',
                  color: '#991B1B',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#FECACA')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#FEE2E2')}
              >
                <Unplug size={16} />
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div style={styles.cartItems}>
          {cart.length === 0 ? (
            <div style={styles.emptyCart}>
              <ShoppingCart size={48} style={{ color: '#9CA3AF' }} />
              <p style={styles.emptyCartText}>Cart is empty</p>
            </div>
          ) : (
            <div style={styles.cartItemsList}>
              {cart.map((item) => {
                const itemPrice = getServicePrice(item)
                return (
                  <div key={item.id} style={styles.cartItem}>
                    <div style={styles.cartItemHeader}>
                      <div style={styles.cartItemInfo}>
                        <h3 style={styles.cartItemName}>{item.name}</h3>
                        {item.isPOA ? (
                          <div style={{ marginTop: '8px' }}>
                            <label
                              style={{
                                fontSize: '12px',
                                color: '#6B7280',
                                display: 'block',
                                marginBottom: '4px',
                              }}
                            >
                              Enter Price:
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <DollarSign size={16} color="#6B7280" />
                              <input
                                type="number"
                                step="0.01"
                                value={item.customPrice}
                                onChange={(e) => updateCustomPrice(item.id, e.target.value)}
                                placeholder="0.00"
                                style={{
                                  padding: '6px 8px',
                                  border: '1px solid #D1D5DB',
                                  borderRadius: '6px',
                                  fontSize: '14px',
                                  width: '100px',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <div style={styles.cartItemDetails}>
                            <p style={styles.cartItemPrice}>${itemPrice.toFixed(2)}</p>
                            {item.discount > 0 && (
                              <span style={styles.smallDiscountBadge}>-${item.discount}</span>
                            )}
                          </div>
                        )}
                        <p style={styles.cartItemDuration}>{item.duration} min</p>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} style={styles.removeButton}>
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div style={styles.cartItemFooter}>
                      <div style={styles.quantityControls}>
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          style={styles.quantityButton}
                        >
                          <Minus size={16} />
                        </button>
                        <span style={styles.quantity}>{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          style={styles.quantityButton}
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <div style={styles.itemTotal}>${(itemPrice * item.quantity).toFixed(2)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Totals */}
        {cart.length > 0 && (
          <div style={styles.totalsContainer}>
            {/* Discount Input Section */}
            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: '#374151',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Add Discount (Optional)
              </label>

              {/* Discount Type Toggle */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                <button
                  onClick={() => setDiscountType('amount')}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    backgroundColor: discountType === 'amount' ? '#2563EB' : '#E5E7EB',
                    color: discountType === 'amount' ? 'white' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  $ Amount
                </button>
                <button
                  onClick={() => setDiscountType('percentage')}
                  style={{
                    flex: 1,
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    borderRadius: '6px',
                    backgroundColor: discountType === 'percentage' ? '#2563EB' : '#E5E7EB',
                    color: discountType === 'percentage' ? 'white' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  % Percent
                </button>
              </div>

              {/* Discount Input */}
              <div style={{ position: 'relative' }}>
                {discountType === 'amount' ? (
                  <DollarSign
                    size={16}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '10px',
                      color: '#9CA3AF',
                    }}
                  />
                ) : (
                  <span
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '10px',
                      color: '#9CA3AF',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    %
                  </span>
                )}
                <input
                  type="number"
                  step="0.01"
                  value={cartDiscount}
                  onChange={(e) => setCartDiscount(e.target.value)}
                  placeholder={discountType === 'amount' ? '0.00' : '0'}
                  style={{
                    width: '100%',
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    paddingTop: '8px',
                    paddingBottom: '8px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Clear Discount Button */}
              {cartDiscount && (
                <button
                  onClick={() => setCartDiscount('')}
                  style={{
                    marginTop: '6px',
                    fontSize: '12px',
                    color: '#EF4444',
                    cursor: 'pointer',
                    padding: '4px',
                  }}
                >
                  Clear discount
                </button>
              )}
            </div>

            {/* Subtotal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                color: '#6B7280',
                marginBottom: '4px',
              }}
            >
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>

            {/* Discount Display */}
            {discountAmount > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '14px',
                  color: '#EF4444',
                  marginBottom: '4px',
                }}
              >
                <span>
                  Discount (
                  {discountType === 'percentage'
                    ? `${cartDiscountValue}%`
                    : `$${cartDiscountValue.toFixed(2)}`}
                  ):
                </span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div style={styles.grandTotal}>
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>

            <button onClick={() => setShowPayment(true)} style={styles.checkoutButton}>
              Proceed to Payment
            </button>
          </div>
        )}

        {/* Status Message (for disconnect feedback) */}
        {message.text && !showPayment && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: message.type === 'success' ? '#10B981' : '#EF4444',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              zIndex: 1000,
            }}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Payment</h2>
              <button onClick={() => setShowPayment(false)} style={styles.closeButton}>
                <X size={24} />
              </button>
            </div>

            <div style={styles.totalDisplay}>
              <p style={styles.totalLabel}>Total Amount</p>
              {discountAmount > 0 && (
                <div
                  style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    marginTop: '4px',
                  }}
                >
                  <div>Subtotal: ${subtotal.toFixed(2)}</div>
                  <div style={{ color: '#EF4444' }}>
                    Discount (
                    {discountType === 'percentage'
                      ? `${cartDiscountValue}%`
                      : `$${cartDiscountValue.toFixed(2)}`}
                    ): -${discountAmount.toFixed(2)}
                  </div>
                </div>
              )}
              <p style={styles.totalAmount}>${total.toFixed(2)}</p>
            </div>

            {/* Payment Method Selection */}
            <div style={styles.paymentMethodSection}>
              <label style={styles.label}>Payment Method</label>
              <div style={styles.paymentMethodGrid}>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  style={{
                    ...styles.paymentMethodButton,
                    ...(paymentMethod === 'cash' ? styles.paymentMethodButtonActive : {}),
                  }}
                >
                  <Banknote style={{ margin: '0 auto 8px' }} size={32} />
                  <p style={styles.paymentMethodLabel}>Cash</p>
                </button>
                <button
                  onClick={() => setPaymentMethod('card')}
                  style={{
                    ...styles.paymentMethodButton,
                    ...(paymentMethod === 'card' ? styles.paymentMethodButtonActive : {}),
                  }}
                >
                  <CreditCard style={{ margin: '0 auto 8px' }} size={32} />
                  <p style={styles.paymentMethodLabel}>Card</p>
                </button>
              </div>
            </div>

            {/* Cash Input */}
            {paymentMethod === 'cash' && (
              <div style={styles.cashInputSection}>
                <label style={styles.label}>Cash Received</label>
                <div style={styles.cashInputWrapper}>
                  <DollarSign style={styles.dollarIcon} size={20} />
                  <input
                    type="number"
                    step="0.01"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    style={styles.cashInput}
                  />
                </div>
                {cashReceived && (
                  <div style={styles.changeDisplay}>
                    <p style={styles.changeLabel}>Change</p>
                    <p style={styles.changeAmount}>${change.toFixed(2)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            {message.text && (
              <div
                style={{
                  ...styles.message,
                  ...(message.type === 'success' ? styles.messageSuccess : styles.messageError),
                }}
              >
                {message.text}
              </div>
            )}

            {/* Complete Payment Button */}
            <button
              onClick={processPayment}
              disabled={
                isProcessing ||
                (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < total))
              }
              style={{
                ...styles.completeButton,
                ...(isProcessing ||
                (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < total))
                  ? styles.completeButtonDisabled
                  : {}),
              }}
            >
              {isProcessing ? 'Processing...' : 'Complete Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default POSSystem
