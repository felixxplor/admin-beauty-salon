import React, { useState, useMemo } from 'react'
import { getClient, createClient } from '../services/apiClients'
import Spinner from '../ui/Spinner'
import Empty from '../ui/Empty'

// Custom hook to fetch clients
const useClients = () => {
  const [clients, setClients] = React.useState([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState(null)

  const fetchClients = React.useCallback(async () => {
    try {
      setIsLoading(true)
      const clientData = await getClient()
      setClients(clientData || [])
    } catch (err) {
      console.error('Error loading clients:', err)
      setError(err)
      setClients([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchClients()
  }, [fetchClients])

  return { clients, isLoading, error, refetch: fetchClients }
}

// Create Client Modal Component
const CreateClientModal = ({ isOpen, onClose, onClientCreated }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState({})

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required'
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address'
    }

    if (formData.phone && !/^[\d\s\-m)+]+$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number'
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    setIsSubmitting(true)
    try {
      // Create the client data object, only including non-empty fields
      const clientData = {
        fullName: formData.fullName.trim(),
        ...(formData.email.trim() && { email: formData.email.trim() }),
        ...(formData.phone.trim() && { phone: formData.phone.trim() }),
      }

      await createClient(clientData)

      // Reset form and close modal
      setFormData({ fullName: '', email: '', phone: '' })
      setFormErrors({})
      onClientCreated()
      onClose()
    } catch (error) {
      console.error('Error creating client:', error)
      setFormErrors({ submit: error.message || 'Failed to create client' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({ fullName: '', email: '', phone: '' })
    setFormErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div style={modalStyles.overlay} onClick={handleClose}>
      <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h2 style={modalStyles.title}>Create New Client</h2>
          <button style={modalStyles.closeButton} onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={modalStyles.form}>
          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Full Name *</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              style={{
                ...modalStyles.input,
                ...(formErrors.fullName ? modalStyles.inputError : {}),
              }}
              placeholder="Enter client's full name"
            />
            {formErrors.fullName && <div style={modalStyles.errorText}>{formErrors.fullName}</div>}
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              style={{
                ...modalStyles.input,
                ...(formErrors.email ? modalStyles.inputError : {}),
              }}
              placeholder="Enter client's email address"
            />
            {formErrors.email && <div style={modalStyles.errorText}>{formErrors.email}</div>}
          </div>

          <div style={modalStyles.formGroup}>
            <label style={modalStyles.label}>Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              style={{
                ...modalStyles.input,
                ...(formErrors.phone ? modalStyles.inputError : {}),
              }}
              placeholder="Enter client's phone number"
            />
            {formErrors.phone && <div style={modalStyles.errorText}>{formErrors.phone}</div>}
          </div>

          {formErrors.submit && <div style={modalStyles.submitError}>{formErrors.submit}</div>}

          <div style={modalStyles.buttonGroup}>
            <button
              type="button"
              onClick={handleClose}
              style={modalStyles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                ...modalStyles.submitButton,
                ...(isSubmitting ? modalStyles.submitButtonDisabled : {}),
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const clientStyles = {
  container: {
    width: '100%',
    padding: '24px',
    backgroundColor: 'white',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e5e5e5',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  createButton: {
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  createButtonHover: {
    backgroundColor: '#1d4ed8',
    transform: 'translateY(-1px)',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    width: '300px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    padding: '20px',
    borderRadius: '12px',
    color: 'white',
    textAlign: 'center',
  },
  statCardBlue: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  },
  statCardGreen: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
  },
  statCardPurple: {
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  },
  statLabel: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
  },
  clientsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '20px',
  },
  clientCard: {
    backgroundColor: 'white',
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  clientCardHover: {
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transform: 'translateY(-2px)',
  },
  clientHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#6b7280',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: '4px',
  },
  clientEmail: {
    fontSize: '14px',
    color: '#6b7280',
  },
  clientDetails: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '16px',
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  detailLabel: {
    fontSize: '12px',
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: '14px',
    color: '#1a1a1a',
    fontWeight: '500',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    textAlign: 'center',
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  noResults: {
    textAlign: 'center',
    padding: '40px',
    color: '#6b7280',
    fontSize: '16px',
  },
  errorMessage: {
    padding: '24px',
    textAlign: 'center',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    marginBottom: '24px',
  },
}

const modalStyles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e5e5e5',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1a1a1a',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
  },
  submitError: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#ef4444',
    fontSize: '14px',
    textAlign: 'center',
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
}

const ClientsPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [hoveredCard, setHoveredCard] = useState(null)
  const [hoveredButton, setHoveredButton] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { clients, isLoading, error, refetch } = useClients()

  // Filter clients based on search term
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients

    return clients.filter(
      (client) =>
        (client.fullName && client.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (client.phone && client.phone.includes(searchTerm))
    )
  }, [clients, searchTerm])

  // Calculate stats
  const stats = useMemo(() => {
    const totalClients = clients.length
    const clientsWithEmail = clients.filter((client) => client.email && client.email.trim()).length
    const recentClients = clients.filter((client) => {
      if (!client.created_at) return false
      const createdDate = new Date(client.created_at)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return createdDate >= thirtyDaysAgo
    }).length

    return { totalClients, clientsWithEmail, recentClients }
  }, [clients])

  // Helper function to get initials from name
  const getInitials = (name) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('')
  }

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const handleClientCreated = () => {
    refetch()
  }

  if (isLoading) return <Spinner />

  if (error) {
    return (
      <div style={clientStyles.container}>
        <div style={clientStyles.errorMessage}>Error loading clients: {error.message}</div>
      </div>
    )
  }

  if (!clients || clients.length === 0) {
    return (
      <div style={clientStyles.container}>
        {/* Header with Create Button even when empty */}
        <div style={clientStyles.header}>
          <h1 style={clientStyles.title}>
            <span style={{ fontSize: '28px' }}>👥</span>
            Clients
          </h1>
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              ...clientStyles.createButton,
              ...(hoveredButton ? clientStyles.createButtonHover : {}),
            }}
            onMouseEnter={() => setHoveredButton(true)}
            onMouseLeave={() => setHoveredButton(false)}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            New Client
          </button>
        </div>

        <Empty resourceName="clients" />

        <CreateClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onClientCreated={handleClientCreated}
        />
      </div>
    )
  }

  return (
    <div style={clientStyles.container}>
      {/* Header */}
      <div style={clientStyles.header}>
        <h1 style={clientStyles.title}>
          <span style={{ fontSize: '28px' }}>👥</span>
          Clients
        </h1>
        <div style={clientStyles.headerRight}>
          <input
            type="text"
            placeholder="Search clients by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              ...clientStyles.searchInput,
              borderColor: searchTerm ? '#2563eb' : '#d1d5db',
            }}
          />
          <button
            onClick={() => setIsModalOpen(true)}
            style={{
              ...clientStyles.createButton,
              ...(hoveredButton ? clientStyles.createButtonHover : {}),
            }}
            onMouseEnter={() => setHoveredButton(true)}
            onMouseLeave={() => setHoveredButton(false)}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            New Client
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={clientStyles.statsContainer}>
        <div style={{ ...clientStyles.statCard, ...clientStyles.statCardBlue }}>
          <div style={clientStyles.statLabel}>Total Clients</div>
          <div style={clientStyles.statValue}>{stats.totalClients}</div>
        </div>
        <div style={{ ...clientStyles.statCard, ...clientStyles.statCardGreen }}>
          <div style={clientStyles.statLabel}>With Email</div>
          <div style={clientStyles.statValue}>{stats.clientsWithEmail}</div>
        </div>
        <div style={{ ...clientStyles.statCard, ...clientStyles.statCardPurple }}>
          <div style={clientStyles.statLabel}>New This Month</div>
          <div style={clientStyles.statValue}>{stats.recentClients}</div>
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div style={clientStyles.noResults}>
          {searchTerm ? `No clients found matching "${searchTerm}"` : 'No clients available'}
        </div>
      ) : (
        <div style={clientStyles.clientsGrid}>
          {filteredClients.map((client) => (
            <div
              key={client.id}
              style={{
                ...clientStyles.clientCard,
                ...(hoveredCard === client.id ? clientStyles.clientCardHover : {}),
              }}
              onMouseEnter={() => setHoveredCard(client.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Client Header */}
              <div style={clientStyles.clientHeader}>
                <div style={clientStyles.avatar}>{getInitials(client.fullName)}</div>
                <div style={clientStyles.clientInfo}>
                  <div style={clientStyles.clientName}>{client.fullName || 'Unknown Name'}</div>
                  <div style={clientStyles.clientEmail}>{client.email || 'No email provided'}</div>
                </div>
                <div
                  style={{
                    ...clientStyles.statusBadge,
                    ...clientStyles.statusActive,
                  }}
                >
                  {client.phone ? 'Contact Available' : 'No Phone'}
                </div>
              </div>

              {/* Client Details */}
              <div style={clientStyles.clientDetails}>
                <div style={clientStyles.detailItem}>
                  <div style={clientStyles.detailLabel}>Phone</div>
                  <div style={clientStyles.detailValue}>{client.phone || 'Not provided'}</div>
                </div>
                <div style={clientStyles.detailItem}>
                  <div style={clientStyles.detailLabel}>Joined</div>
                  <div style={clientStyles.detailValue}>{formatDate(client.created_at)}</div>
                </div>
                <div style={clientStyles.detailItem}>
                  <div style={clientStyles.detailLabel}>Client ID</div>
                  <div style={clientStyles.detailValue}>#{client.id}</div>
                </div>
                <div style={clientStyles.detailItem}>
                  <div style={clientStyles.detailLabel}>Contact Info</div>
                  <div style={clientStyles.detailValue}>
                    {client.email && client.phone ? 'Complete' : 'Incomplete'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClientCreated={handleClientCreated}
      />
    </div>
  )
}

export default ClientsPage
