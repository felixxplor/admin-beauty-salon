// ImprovedBookingModals.jsx
// Fully responsive modals with mobile-first design

import React from 'react'

// Helper function to convert time to minutes
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

// =====================================================
// RESPONSIVE MODAL WRAPPER
// =====================================================
const ResponsiveModalWrapper = ({ children, showModal, closeModal, deviceType }) => {
  if (!showModal) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: deviceType === 'mobile' ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 0,
        boxSizing: 'border-box',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={closeModal}
    >
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
          @keyframes slideDown {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
      </style>
      {children}
    </div>
  )
}

// =====================================================
// CREATE BOOKING MODAL - RESPONSIVE
// =====================================================
export const CreateBookingModal = ({
  showModal,
  deviceType,
  selectedDate,
  workingStaff,
  services,
  clients,
  createFormData,
  isCreating,
  selectedServicesInfo,
  bookingsByDate,
  timeSlots,
  responsiveCalendarStyles,
  closeModal,
  handleCreateBooking,
  setCreateFormData,
  handleClientSelection,
  handleNameOrPhoneChange,
  handleServiceSelection,
  handleRemoveServiceInstance,
  handleServiceStaffAssignment,
  handleClientServiceAssignment,
  handleClientStartTimeAssignment,
  getServicesForClient,
  areAllServicesAssigned,
  areAllServicesAssignedToStaff,
  areAllClientStartTimesAssigned,
  calculateEndTime,
  isTimeSlotAvailable,
  getAvailableTimeSlotsForConsecutiveBookings,
  serviceSearchTerm,
  setServiceSearchTerm,
  filteredServices,
}) => {
  if (!showModal || workingStaff.length === 0) return null

  const isMobile = deviceType === 'mobile'

  return (
    <ResponsiveModalWrapper showModal={showModal} closeModal={closeModal} deviceType={deviceType}>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '20px 20px 0 0' : '12px',
          padding: isMobile ? '24px 16px 32px' : '24px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '800px',
          maxHeight: isMobile ? '90vh' : '90vh',
          overflowY: 'auto',
          boxShadow: isMobile ? '0 -4px 20px rgba(0,0,0,0.2)' : '0 10px 25px rgba(0,0,0,0.1)',
          position: 'relative',
          margin: 0,
          WebkitOverflowScrolling: 'touch',
          animation: isMobile ? 'slideUp 0.3s ease-out' : 'slideDown 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Handle (Mobile) */}
        {isMobile && (
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#d1d5db',
              borderRadius: '2px',
              margin: '0 auto 20px',
            }}
          />
        )}

        {/* Header */}
        <div
          style={{
            fontSize: isMobile ? '20px' : '22px',
            fontWeight: '700',
            marginBottom: '20px',
            color: '#111827',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div>Create New Booking</div>
            {!isMobile && (
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '400',
                  color: '#6b7280',
                  marginTop: '4px',
                }}
              >
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>
          {isMobile && (
            <button
              onClick={closeModal}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>

        <form
          onSubmit={handleCreateBooking}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Client Section - Compact on Mobile */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Client {!isMobile && '(Optional)'}
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                backgroundColor: createFormData.name || createFormData.phone ? '#f9fafb' : 'white',
                boxSizing: 'border-box',
                minHeight: '48px',
              }}
              value={createFormData.clientId}
              onChange={(e) => handleClientSelection(e.target.value)}
              disabled={createFormData.name.trim() || createFormData.phone.trim()}
            >
              <option value="">Select existing client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.fullName || client.name} - {client.email || client.phone}
                </option>
              ))}
            </select>
            {(createFormData.name || createFormData.phone) && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                Client selection disabled when name/phone entered
              </div>
            )}
          </div>

          {/* Name & Phone - Stack on Mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Name
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: createFormData.clientId ? '#f9fafb' : 'white',
                  boxSizing: 'border-box',
                  minHeight: '48px',
                }}
                value={createFormData.name}
                onChange={(e) => handleNameOrPhoneChange('name', e.target.value)}
                disabled={!!createFormData.clientId}
                placeholder={
                  createFormData.clientId ? 'Auto-filled from client' : 'Enter client name'
                }
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Phone *
              </label>
              <input
                type="tel"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: createFormData.clientId ? '#f9fafb' : 'white',
                  boxSizing: 'border-box',
                  minHeight: '48px',
                }}
                value={createFormData.phone}
                onChange={(e) => handleNameOrPhoneChange('phone', e.target.value)}
                disabled={!!createFormData.clientId}
                placeholder={createFormData.clientId ? 'Auto-filled' : 'Enter phone'}
                required
              />
            </div>
          </div>

          {/* Number of Clients */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Number of Clients *
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                minHeight: '48px',
              }}
              value={createFormData.numClients}
              onChange={(e) =>
                setCreateFormData((prev) => ({ ...prev, numClients: e.target.value }))
              }
              required
            >
              {[1, 2, 3, 4, 5].map((num) => (
                <option key={num} value={num}>
                  {num} Client{num > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Info Banner */}
          <div
            style={{
              fontSize: '12px',
              color: '#6b7280',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
            }}
          >
            💡 Select an existing client OR enter name and phone for a new client
          </div>

          {/* Services Section - Mobile Optimized */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Services * {isMobile && '(Tap to add)'}
            </label>

            {/* Search Box */}
            <input
              type="text"
              placeholder="🔍 Search services..."
              value={serviceSearchTerm}
              onChange={(e) => setServiceSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #d1d5db',
                borderRadius: '10px',
                fontSize: '16px',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                marginBottom: '12px',
                minHeight: '48px',
              }}
            />

            {/* Services List - Scrollable */}
            <div
              style={{
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                padding: isMobile ? '8px' : '12px',
                maxHeight: isMobile ? '200px' : '250px',
                overflowY: 'auto',
                backgroundColor: 'white',
              }}
            >
              {filteredServices.length > 0 ? (
                filteredServices.map((service) => (
                  <div
                    key={service.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: isMobile ? '12px 8px' : '12px',
                      cursor: 'pointer',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      gap: '12px',
                    }}
                    onClick={() => handleServiceSelection(service.id.toString())}
                  >
                    <button
                      type="button"
                      style={{
                        padding: isMobile ? '10px 16px' : '8px 14px',
                        fontSize: isMobile ? '14px' : '13px',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        minHeight: '40px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      + Add
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: '600',
                          fontSize: isMobile ? '14px' : '15px',
                          color: '#111827',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {service.name}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginTop: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        {service.category && (
                          <span
                            style={{
                              backgroundColor: '#e5e7eb',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                            }}
                          >
                            {service.category}
                          </span>
                        )}
                        <span>
                          {service.duration} min · ${service.regularPrice}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: '24px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '14px',
                  }}
                >
                  No services found matching "{serviceSearchTerm}"
                </div>
              )}
            </div>

            {/* Selected Services - Compact Display */}
            {createFormData.selectedServices.length > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  border: '2px solid #d1d5db',
                  borderRadius: '10px',
                  padding: isMobile ? '12px' : '16px',
                  backgroundColor: '#f8fafc',
                }}
              >
                <div
                  style={{
                    fontWeight: '600',
                    marginBottom: '12px',
                    fontSize: '14px',
                    color: '#374151',
                  }}
                >
                  Selected Services ({createFormData.selectedServices.length})
                </div>
                {createFormData.selectedServices.map((serviceInstance, index) => (
                  <div
                    key={serviceInstance.instanceId}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: isMobile ? '12px 0' : '10px 0',
                      borderBottom:
                        index < createFormData.selectedServices.length - 1
                          ? '1px solid #e5e7eb'
                          : 'none',
                      gap: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: isMobile ? '13px' : '14px',
                        color: '#111827',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {serviceInstance.service.name} ({serviceInstance.service.duration} min)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveServiceInstance(serviceInstance.instanceId)}
                      style={{
                        color: '#dc2626',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: isMobile ? '13px' : '12px',
                        padding: isMobile ? '8px 12px' : '6px 10px',
                        minHeight: isMobile ? '40px' : 'auto',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client-Service Assignment for Multiple Clients */}
          {createFormData.numClients > 1 && createFormData.selectedServices.length > 0 && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Assign Services to Clients *
              </label>
              <div
                style={{
                  border: '2px solid #d1d5db',
                  borderRadius: '10px',
                  padding: isMobile ? '12px' : '16px',
                  backgroundColor: 'white',
                }}
              >
                {createFormData.selectedServices.map((serviceInstance, index) => (
                  <div
                    key={serviceInstance.instanceId}
                    style={{
                      marginBottom:
                        index < createFormData.selectedServices.length - 1 ? '16px' : '0',
                      paddingBottom:
                        index < createFormData.selectedServices.length - 1 ? '16px' : '0',
                      borderBottom:
                        index < createFormData.selectedServices.length - 1
                          ? '1px solid #e5e7eb'
                          : 'none',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#374151',
                      }}
                    >
                      {serviceInstance.service.name} ({serviceInstance.service.duration} min)
                    </div>
                    <select
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '16px',
                        backgroundColor: 'white',
                        boxSizing: 'border-box',
                        minHeight: '48px',
                      }}
                      value={
                        createFormData.clientServiceAssignments[
                          serviceInstance.instanceId
                        ]?.toString() || ''
                      }
                      onChange={(e) =>
                        handleClientServiceAssignment(
                          serviceInstance.instanceId,
                          parseInt(e.target.value)
                        )
                      }
                      required
                    >
                      <option value="">Assign to client...</option>
                      {Array.from({ length: createFormData.numClients }, (_, i) => (
                        <option key={i} value={i.toString()}>
                          Client {i + 1}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}

                {/* Assignment Summary */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '8px',
                    fontSize: '12px',
                    color: '#1e40af',
                  }}
                >
                  <strong>Summary:</strong>
                  {Array.from({ length: createFormData.numClients }, (_, i) => {
                    const clientServices = createFormData.selectedServices.filter(
                      (serviceInstance) =>
                        createFormData.clientServiceAssignments[serviceInstance.instanceId] === i
                    )
                    return (
                      <div key={i} style={{ marginTop: '6px' }}>
                        Client {i + 1}:{' '}
                        {clientServices.length > 0
                          ? clientServices.map((s) => s.service.name).join(', ')
                          : 'No services'}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Separate Bookings Toggle - Compact on Mobile */}
          {createFormData.numClients === 1 &&
            createFormData.selectedServices &&
            createFormData.selectedServices.length > 1 && (
              <div
                style={{
                  backgroundColor: '#f0f9ff',
                  padding: isMobile ? '12px' : '16px',
                  borderRadius: '10px',
                  border: '2px solid #bfdbfe',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={createFormData.createSeparateBookings}
                    onChange={(e) =>
                      setCreateFormData((prev) => ({
                        ...prev,
                        createSeparateBookings: e.target.checked,
                      }))
                    }
                    style={{
                      marginRight: '12px',
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                    }}
                  />
                  <span style={{ fontWeight: '600', color: '#1e40af' }}>
                    Create separate bookings for each service
                  </span>
                </label>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#1e40af',
                    marginTop: '8px',
                    marginLeft: isMobile ? '0' : '32px',
                  }}
                >
                  {createFormData.createSeparateBookings
                    ? '✓ Services scheduled consecutively with individual staff'
                    : 'All services combined in one booking'}
                </div>
              </div>
            )}

          {/* Staff Assignment Section - Scrollable on Mobile */}
          {createFormData.numClients > 1 ? (
            createFormData.selectedServices &&
            createFormData.selectedServices.length > 0 && (
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  Assign Staff to Each Service *
                </label>
                <div
                  style={{
                    border: '2px solid #d1d5db',
                    borderRadius: '10px',
                    padding: isMobile ? '12px' : '16px',
                    backgroundColor: 'white',
                    maxHeight: isMobile ? '300px' : 'auto',
                    overflowY: isMobile ? 'auto' : 'visible',
                  }}
                >
                  {createFormData.selectedServices.map((serviceInstance, index) => {
                    const service = serviceInstance.service
                    if (!service) return null

                    return (
                      <div
                        key={serviceInstance.instanceId}
                        style={{
                          marginBottom:
                            index < createFormData.selectedServices.length - 1 ? '16px' : '0',
                          paddingBottom:
                            index < createFormData.selectedServices.length - 1 ? '16px' : '0',
                          borderBottom:
                            index < createFormData.selectedServices.length - 1
                              ? '1px solid #e5e7eb'
                              : 'none',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            color: '#374151',
                          }}
                        >
                          {service.name} ({service.duration} min)
                        </div>
                        <select
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            border: '2px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '16px',
                            backgroundColor: 'white',
                            boxSizing: 'border-box',
                            minHeight: '48px',
                          }}
                          value={
                            createFormData.serviceStaffAssignments[serviceInstance.instanceId] || ''
                          }
                          onChange={(e) =>
                            handleServiceStaffAssignment(serviceInstance.instanceId, e.target.value)
                          }
                          required
                        >
                          <option value="">Select staff member</option>
                          {workingStaff.map((staffMember) => (
                            <option key={staffMember.id} value={staffMember.id}>
                              {staffMember.name || staffMember.id}
                            </option>
                          ))}
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          ) : createFormData.createSeparateBookings &&
            createFormData.selectedServices &&
            createFormData.selectedServices.length > 1 ? (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Assign Staff to Each Service *
              </label>
              <div
                style={{
                  border: '2px solid #d1d5db',
                  borderRadius: '10px',
                  padding: isMobile ? '12px' : '16px',
                  backgroundColor: 'white',
                  maxHeight: isMobile ? '300px' : 'auto',
                  overflowY: isMobile ? 'auto' : 'visible',
                }}
              >
                {createFormData.selectedServices.map((serviceInstance, index) => {
                  const service = serviceInstance.service
                  if (!service) return null

                  return (
                    <div
                      key={serviceInstance.instanceId}
                      style={{
                        marginBottom:
                          index < createFormData.selectedServices.length - 1 ? '16px' : '0',
                        paddingBottom:
                          index < createFormData.selectedServices.length - 1 ? '16px' : '0',
                        borderBottom:
                          index < createFormData.selectedServices.length - 1
                            ? '1px solid #e5e7eb'
                            : 'none',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: '#374151',
                        }}
                      >
                        {service.name} ({service.duration} min)
                      </div>
                      <select
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          backgroundColor: 'white',
                          boxSizing: 'border-box',
                          minHeight: '48px',
                        }}
                        value={
                          createFormData.serviceStaffAssignments[serviceInstance.instanceId] || ''
                        }
                        onChange={(e) =>
                          handleServiceStaffAssignment(serviceInstance.instanceId, e.target.value)
                        }
                        required
                      >
                        <option value="">Select staff member</option>
                        {workingStaff.map((staffMember) => (
                          <option key={staffMember.id} value={staffMember.id}>
                            {staffMember.name || staffMember.id}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Staff Member *
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  boxSizing: 'border-box',
                  minHeight: '48px',
                }}
                value={createFormData.staffId}
                onChange={(e) => {
                  setCreateFormData((prev) => ({ ...prev, staffId: e.target.value }))
                }}
                required
              >
                <option value="">Select staff member</option>
                {workingStaff.map((staffMember) => (
                  <option key={staffMember.id} value={staffMember.id}>
                    {staffMember.name || staffMember.id}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                Only staff available on this day
              </div>
            </div>
          )}

          {/* Start Time Section - Improved Mobile Layout */}
          {createFormData.numClients > 1 ? (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Start Times for Each Client *
              </label>
              <div
                style={{
                  border: '2px solid #d1d5db',
                  borderRadius: '10px',
                  padding: isMobile ? '12px' : '16px',
                  backgroundColor: 'white',
                  maxHeight: isMobile ? '300px' : 'auto',
                  overflowY: isMobile ? 'auto' : 'visible',
                }}
              >
                {Array.from({ length: createFormData.numClients }, (_, clientIndex) => {
                  const clientServices = getServicesForClient(clientIndex)
                  const allServicesHaveStaff = clientServices.every(
                    (serviceInstance) =>
                      createFormData.serviceStaffAssignments[serviceInstance.instanceId]
                  )

                  let availableSlots = []
                  if (allServicesHaveStaff && clientServices.length > 0) {
                    const currentDayBookings = bookingsByDate[selectedDate] || []
                    availableSlots = getAvailableTimeSlotsForConsecutiveBookings(
                      clientServices,
                      createFormData.serviceStaffAssignments,
                      currentDayBookings,
                      services,
                      selectedDate
                    )
                  }

                  return (
                    <div
                      key={clientIndex}
                      style={{
                        marginBottom: clientIndex < createFormData.numClients - 1 ? '16px' : '0',
                        paddingBottom: clientIndex < createFormData.numClients - 1 ? '16px' : '0',
                        borderBottom:
                          clientIndex < createFormData.numClients - 1
                            ? '1px solid #e5e7eb'
                            : 'none',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: '#374151',
                        }}
                      >
                        Client {clientIndex + 1} Start Time
                        {clientServices.length > 0 && !isMobile && (
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: '400',
                              color: '#6b7280',
                              marginLeft: '8px',
                            }}
                          >
                            ({clientServices.map((s) => s.service.name).join(', ')})
                          </span>
                        )}
                      </div>

                      <select
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '16px',
                          backgroundColor: 'white',
                          boxSizing: 'border-box',
                          minHeight: '48px',
                        }}
                        value={
                          createFormData.clientStartTimes
                            ? createFormData.clientStartTimes[clientIndex] || ''
                            : ''
                        }
                        onChange={(e) =>
                          handleClientStartTimeAssignment(clientIndex, e.target.value)
                        }
                        required
                        disabled={!allServicesHaveStaff || clientServices.length === 0}
                      >
                        <option value="">Select start time</option>
                        {availableSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>

                      <div style={{ fontSize: '12px', marginTop: '6px' }}>
                        {clientServices.length === 0 ? (
                          <span style={{ color: '#dc2626' }}>⚠️ No services assigned</span>
                        ) : !allServicesHaveStaff ? (
                          <span style={{ color: '#dc2626' }}>⚠️ Assign staff first</span>
                        ) : availableSlots.length === 0 ? (
                          <span style={{ color: '#dc2626' }}>⚠️ No available slots</span>
                        ) : (
                          <span style={{ color: '#059669' }}>
                            ✓ {availableSlots.length} slot{availableSlots.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {createFormData.clientStartTimes &&
                        createFormData.clientStartTimes[clientIndex] &&
                        clientServices.length > 0 && (
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                            End time:{' '}
                            {(() => {
                              const totalDuration = clientServices.reduce(
                                (sum, serviceInstance) => sum + serviceInstance.service.duration,
                                0
                              )
                              return calculateEndTime(
                                createFormData.clientStartTimes[clientIndex],
                                totalDuration
                              )
                            })()}
                          </div>
                        )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '16px',
              }}
            >
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  {createFormData.createSeparateBookings &&
                  createFormData.selectedServices &&
                  createFormData.selectedServices.length > 1
                    ? 'Start Time (first service) *'
                    : 'Start Time *'}
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '16px',
                    backgroundColor: 'white',
                    boxSizing: 'border-box',
                    minHeight: '48px',
                  }}
                  value={createFormData.startTime}
                  onChange={(e) =>
                    setCreateFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Select time</option>
                  {(() => {
                    let availableSlots = []
                    const currentDayBookings = bookingsByDate[selectedDate] || []

                    if (
                      createFormData.createSeparateBookings &&
                      createFormData.selectedServices &&
                      createFormData.selectedServices.length > 1
                    ) {
                      availableSlots = getAvailableTimeSlotsForConsecutiveBookings(
                        createFormData.selectedServices,
                        createFormData.serviceStaffAssignments,
                        currentDayBookings,
                        services,
                        selectedDate
                      )
                    } else {
                      availableSlots = timeSlots.filter((timeSlot) => {
                        return isTimeSlotAvailable(
                          timeSlot,
                          createFormData.staffId,
                          currentDayBookings,
                          selectedDate,
                          selectedServicesInfo.totalDuration
                        )
                      })
                    }

                    return availableSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))
                  })()}
                </select>

                {(() => {
                  let availableCount = 0
                  const currentDayBookings = bookingsByDate[selectedDate] || []

                  if (
                    createFormData.createSeparateBookings &&
                    createFormData.selectedServices &&
                    createFormData.selectedServices.length > 1
                  ) {
                    availableCount = getAvailableTimeSlotsForConsecutiveBookings(
                      createFormData.selectedServices,
                      createFormData.serviceStaffAssignments,
                      currentDayBookings,
                      services,
                      selectedDate
                    ).length
                  } else if (createFormData.staffId) {
                    availableCount = timeSlots.filter((timeSlot) =>
                      isTimeSlotAvailable(
                        timeSlot,
                        createFormData.staffId,
                        currentDayBookings,
                        selectedDate,
                        selectedServicesInfo.totalDuration
                      )
                    ).length
                  }

                  if (
                    availableCount === 0 &&
                    (createFormData.staffId ||
                      (createFormData.createSeparateBookings &&
                        Object.keys(createFormData.serviceStaffAssignments).length > 0))
                  ) {
                    return (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#dc2626',
                          marginTop: '6px',
                          padding: '8px',
                          backgroundColor: '#fee2e2',
                          borderRadius: '6px',
                        }}
                      >
                        ⚠️ No available time slots
                      </div>
                    )
                  } else if (availableCount > 0) {
                    return (
                      <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
                        ✓ {availableCount} slot{availableCount !== 1 ? 's' : ''} available
                      </div>
                    )
                  }

                  return (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                      {createFormData.createSeparateBookings
                        ? 'Select staff for all services'
                        : 'Select a staff member first'}
                    </div>
                  )
                })()}
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  End Time
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '10px',
                    fontSize: '16px',
                    backgroundColor: '#f9fafb',
                    boxSizing: 'border-box',
                    minHeight: '48px',
                    color: '#6b7280',
                  }}
                  value={calculateEndTime(
                    createFormData.startTime,
                    selectedServicesInfo.totalDuration
                  )}
                  disabled
                />
              </div>
            </div>
          )}

          {/* Price & Status - Stack on Mobile */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Total Price
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: '#f9fafb',
                  boxSizing: 'border-box',
                  minHeight: '48px',
                  color: '#6b7280',
                }}
                value={`$${selectedServicesInfo.totalPrice}`}
                disabled
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Status *
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  boxSizing: 'border-box',
                  minHeight: '48px',
                }}
                value={createFormData.status}
                onChange={(e) => setCreateFormData((prev) => ({ ...prev, status: e.target.value }))}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Notes (Optional)
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                minHeight: isMobile ? '100px' : '120px',
                resize: 'vertical',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              value={createFormData.notes}
              onChange={(e) => setCreateFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes..."
            />
          </div>

          {/* Action Buttons - Stack on Mobile */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '8px',
              flexDirection: isMobile ? 'column-reverse' : 'row',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              style={{
                padding: '14px 24px',
                minHeight: '48px',
                backgroundColor: 'transparent',
                border: '2px solid #d1d5db',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '15px',
                color: '#374151',
                fontWeight: '600',
              }}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isCreating ||
                !createFormData.selectedServices ||
                createFormData.selectedServices.length === 0 ||
                !areAllServicesAssignedToStaff() ||
                !areAllClientStartTimesAssigned() ||
                (createFormData.numClients > 1 && !areAllServicesAssigned())
              }
              style={{
                padding: '14px 24px',
                minHeight: '48px',
                backgroundColor:
                  isCreating ||
                  !createFormData.selectedServices ||
                  createFormData.selectedServices.length === 0 ||
                  !areAllServicesAssignedToStaff() ||
                  !areAllClientStartTimesAssigned() ||
                  (createFormData.numClients > 1 && !areAllServicesAssigned())
                    ? '#9ca3af'
                    : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor:
                  isCreating ||
                  !createFormData.selectedServices ||
                  createFormData.selectedServices.length === 0 ||
                  !areAllServicesAssignedToStaff() ||
                  !areAllClientStartTimesAssigned() ||
                  (createFormData.numClients > 1 && !areAllServicesAssigned())
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              {isCreating ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModalWrapper>
  )
}

// =====================================================
// NO STAFF WARNING MODAL - RESPONSIVE
// =====================================================
export const NoStaffWarningModal = ({ showModal, closeModal, openShiftModal, deviceType }) => {
  if (!showModal) return null

  const isMobile = deviceType === 'mobile'

  return (
    <ResponsiveModalWrapper showModal={showModal} closeModal={closeModal} deviceType={deviceType}>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '20px 20px 0 0' : '12px',
          padding: isMobile ? '24px 16px 32px' : '24px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '400px',
          animation: isMobile ? 'slideUp 0.3s ease-out' : 'slideDown 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile && (
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#d1d5db',
              borderRadius: '2px',
              margin: '0 auto 20px',
            }}
          />
        )}

        <div
          style={{
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '16px',
            color: '#111827',
          }}
        >
          ⚠️ No Staff Available
        </div>

        <div style={{ padding: isMobile ? '16px 0' : '20px 0', textAlign: 'center' }}>
          <p style={{ color: '#dc2626', marginBottom: '16px', fontSize: '15px' }}>
            No staff members are scheduled for this date.
          </p>
          <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
            Please add staff shifts first using the "Add Shift" button.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '20px',
            flexDirection: isMobile ? 'column-reverse' : 'row',
          }}
        >
          <button
            type="button"
            onClick={closeModal}
            style={{
              padding: '14px 24px',
              minHeight: '48px',
              backgroundColor: 'transparent',
              border: '2px solid #d1d5db',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              color: '#374151',
              fontWeight: '600',
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              closeModal()
              openShiftModal()
            }}
            style={{
              padding: '14px 24px',
              minHeight: '48px',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
            }}
          >
            Add Staff Shift
          </button>
        </div>
      </div>
    </ResponsiveModalWrapper>
  )
}

// =====================================================
// CREATE STAFF SHIFT MODAL - RESPONSIVE
// =====================================================
export const CreateShiftModal = ({
  showModal,
  selectedDate,
  staff,
  shiftFormData,
  isCreatingShift,
  timeSlots,
  closeModal,
  handleCreateShift,
  setShiftFormData,
  deviceType,
}) => {
  if (!showModal) return null

  const isMobile = deviceType === 'mobile'

  return (
    <ResponsiveModalWrapper showModal={showModal} closeModal={closeModal} deviceType={deviceType}>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '20px 20px 0 0' : '12px',
          padding: isMobile ? '24px 16px 32px' : '24px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '500px',
          maxHeight: isMobile ? '90vh' : '90vh',
          overflowY: 'auto',
          animation: isMobile ? 'slideUp 0.3s ease-out' : 'slideDown 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile && (
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#d1d5db',
              borderRadius: '2px',
              margin: '0 auto 20px',
            }}
          />
        )}

        <div
          style={{
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '700',
            marginBottom: '20px',
            color: '#111827',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          <div>Add Staff Shift</div>
          {!isMobile && (
            <div
              style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280', marginTop: '4px' }}
            >
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={handleCreateShift}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Staff Member *
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                minHeight: '48px',
              }}
              value={shiftFormData.staffId}
              onChange={(e) => setShiftFormData((prev) => ({ ...prev, staffId: e.target.value }))}
              required
            >
              <option value="">Select staff member</option>
              {staff.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name || staffMember.id}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
              This creates a one-time shift for this date only
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '16px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                Start Time *
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  boxSizing: 'border-box',
                  minHeight: '48px',
                }}
                value={shiftFormData.startTime}
                onChange={(e) =>
                  setShiftFormData((prev) => ({ ...prev, startTime: e.target.value }))
                }
                required
              >
                <option value="">Select start time</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px',
                }}
              >
                End Time *
              </label>
              <select
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  boxSizing: 'border-box',
                  minHeight: '48px',
                }}
                value={shiftFormData.endTime}
                onChange={(e) => setShiftFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                required
              >
                <option value="">Select end time</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {shiftFormData.startTime && shiftFormData.endTime && (
            <div
              style={{
                backgroundColor: '#f0f9ff',
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid #bfdbfe',
              }}
            >
              <div style={{ fontSize: '14px', color: '#1e40af', fontWeight: '600' }}>
                Duration:{' '}
                {(() => {
                  const startMinutes = timeToMinutes(shiftFormData.startTime)
                  const endMinutes = timeToMinutes(shiftFormData.endTime)
                  let duration = endMinutes - startMinutes
                  if (duration < 0) duration += 24 * 60
                  const hours = Math.floor(duration / 60)
                  const minutes = duration % 60
                  return `${hours}h ${minutes}m`
                })()}
              </div>
              <div style={{ fontSize: '12px', color: '#1e40af', marginTop: '4px' }}>
                📅 One-time shift (not recurring)
              </div>
            </div>
          )}

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Notes (Optional)
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                minHeight: isMobile ? '80px' : '100px',
                resize: 'vertical',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              value={shiftFormData.notes}
              onChange={(e) => setShiftFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this shift..."
            />
          </div>

          {shiftFormData.startTime &&
            shiftFormData.endTime &&
            shiftFormData.startTime >= shiftFormData.endTime && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  border: '2px solid #fecaca',
                  borderRadius: '10px',
                  color: '#991b1b',
                  fontSize: '14px',
                }}
              >
                ⚠️ End time must be after start time
              </div>
            )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '8px',
              flexDirection: isMobile ? 'column-reverse' : 'row',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              style={{
                padding: '14px 24px',
                minHeight: '48px',
                backgroundColor: 'transparent',
                border: '2px solid #d1d5db',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '15px',
                color: '#374151',
                fontWeight: '600',
              }}
              disabled={isCreatingShift}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isCreatingShift ||
                !shiftFormData.staffId ||
                !shiftFormData.startTime ||
                !shiftFormData.endTime ||
                shiftFormData.startTime >= shiftFormData.endTime
              }
              style={{
                padding: '14px 24px',
                minHeight: '48px',
                backgroundColor:
                  isCreatingShift ||
                  !shiftFormData.staffId ||
                  !shiftFormData.startTime ||
                  !shiftFormData.endTime ||
                  shiftFormData.startTime >= shiftFormData.endTime
                    ? '#9ca3af'
                    : '#059669',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor:
                  isCreatingShift ||
                  !shiftFormData.staffId ||
                  !shiftFormData.startTime ||
                  !shiftFormData.endTime ||
                  shiftFormData.startTime >= shiftFormData.endTime
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              {isCreatingShift ? 'Creating...' : 'Create Shift'}
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModalWrapper>
  )
}

// =====================================================
// CREATE STAFF LEAVE MODAL - RESPONSIVE
// =====================================================
export const CreateLeaveModal = ({
  showModal,
  selectedDate,
  staff,
  leaveFormData,
  isCreatingLeave,
  absenceTypes,
  closeModal,
  handleCreateLeave,
  setLeaveFormData,
  deviceType,
}) => {
  if (!showModal) return null

  const isMobile = deviceType === 'mobile'

  return (
    <ResponsiveModalWrapper showModal={showModal} closeModal={closeModal} deviceType={deviceType}>
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '20px 20px 0 0' : '12px',
          padding: isMobile ? '24px 16px 32px' : '24px',
          width: '100%',
          maxWidth: isMobile ? '100%' : '500px',
          maxHeight: isMobile ? '90vh' : '90vh',
          overflowY: 'auto',
          animation: isMobile ? 'slideUp 0.3s ease-out' : 'slideDown 0.3s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isMobile && (
          <div
            style={{
              width: '40px',
              height: '4px',
              backgroundColor: '#d1d5db',
              borderRadius: '2px',
              margin: '0 auto 20px',
            }}
          />
        )}

        <div
          style={{
            fontSize: isMobile ? '18px' : '20px',
            fontWeight: '700',
            marginBottom: '20px',
            color: '#111827',
            paddingBottom: '16px',
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          <div>Add Staff Leave</div>
          {!isMobile && (
            <div
              style={{ fontSize: '14px', fontWeight: '400', color: '#6b7280', marginTop: '4px' }}
            >
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          )}
        </div>

        <form
          onSubmit={handleCreateLeave}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Staff Member *
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                minHeight: '48px',
              }}
              value={leaveFormData.staffId}
              onChange={(e) => setLeaveFormData((prev) => ({ ...prev, staffId: e.target.value }))}
              required
            >
              <option value="">Select staff member</option>
              {staff.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name || staffMember.id}
                </option>
              ))}
            </select>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
              Records an absence for this specific date
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Leave Type *
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                minHeight: '48px',
              }}
              value={leaveFormData.absenceType}
              onChange={(e) =>
                setLeaveFormData((prev) => ({ ...prev, absenceType: e.target.value }))
              }
              required
            >
              {absenceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '8px',
              }}
            >
              Notes (Optional)
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '12px 14px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '16px',
                minHeight: isMobile ? '80px' : '100px',
                resize: 'vertical',
                backgroundColor: 'white',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
              value={leaveFormData.notes}
              onChange={(e) => setLeaveFormData((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Add notes about this leave..."
            />
          </div>

          {leaveFormData.staffId && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                padding: '12px',
                borderRadius: '10px',
                border: '2px solid #fecaca',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  color: '#991b1b',
                  fontWeight: '600',
                  marginBottom: '4px',
                }}
              >
                Summary:
              </div>
              <div style={{ fontSize: '13px', color: '#991b1b' }}>
                {staff.find((s) => s.id === parseInt(leaveFormData.staffId))?.name} will be marked
                as <strong>{leaveFormData.absenceType}</strong>
                {!isMobile &&
                  ` on ${new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}`}
              </div>
              <div style={{ fontSize: '12px', color: '#991b1b', marginTop: '4px' }}>
                ⚠️ Staff will not be available for bookings
              </div>
            </div>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '8px',
              flexDirection: isMobile ? 'column-reverse' : 'row',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              style={{
                padding: '14px 24px',
                minHeight: '48px',
                backgroundColor: 'transparent',
                border: '2px solid #d1d5db',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '15px',
                color: '#374151',
                fontWeight: '600',
              }}
              disabled={isCreatingLeave}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingLeave || !leaveFormData.staffId || !leaveFormData.absenceType}
              style={{
                padding: '14px 24px',
                minHeight: '48px',
                backgroundColor:
                  isCreatingLeave || !leaveFormData.staffId || !leaveFormData.absenceType
                    ? '#9ca3af'
                    : '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                cursor:
                  isCreatingLeave || !leaveFormData.staffId || !leaveFormData.absenceType
                    ? 'not-allowed'
                    : 'pointer',
                fontSize: '15px',
                fontWeight: '600',
              }}
            >
              {isCreatingLeave ? 'Adding...' : 'Add Leave'}
            </button>
          </div>
        </form>
      </div>
    </ResponsiveModalWrapper>
  )
}
