// RosterStyles.js - Styling for the Roster Page

export const styles = {
  // Container and Layout
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1f2937',
    margin: 0,
  },

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },

  // Buttons
  primaryButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0, 123, 255, 0.2)',
  },

  viewToggle: {
    display: 'flex',
    backgroundColor: '#f1f5f9',
    borderRadius: '8px',
    padding: '4px',
  },

  toggleButton: {
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#64748b',
  },

  toggleButtonActive: {
    backgroundColor: '#ffffff',
    color: '#1e40af',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    fontWeight: '600',
  },

  iconButton: {
    border: 'none',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // Filter Bar
  filterBar: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    backgroundColor: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  select: {
    padding: '10px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
    minWidth: '150px',
  },

  // Staff Summary
  summaryContainer: {
    marginBottom: '32px',
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  summaryTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },

  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },

  summaryCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    transition: 'all 0.2s',
  },

  summaryHeader: {
    marginBottom: '12px',
  },

  summaryStaffName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
  },

  summaryStats: {
    display: 'flex',
    gap: '24px',
    marginBottom: '12px',
  },

  summaryStatsItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  summaryLabel: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },

  summaryValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
  },

  summaryDays: {
    display: 'flex',
    gap: '4px',
    flexWrap: 'wrap',
  },

  summaryDay: {
    fontSize: '11px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: '500',
  },

  // Calendar View
  calendarContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },

  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    minHeight: '600px',
  },

  dayColumn: {
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column',
  },

  dayHeader: {
    padding: '16px 12px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
    textAlign: 'center',
  },

  dayTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 4px 0',
  },

  dayShiftCount: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },

  shiftsContainer: {
    padding: '12px 8px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  noShifts: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '14px',
    fontStyle: 'italic',
    padding: '20px 8px',
  },

  shiftCard: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '6px',
    padding: '10px',
    fontSize: '13px',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },

  shiftHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },

  staffName: {
    fontWeight: '600',
    color: '#0c4a6e',
    fontSize: '13px',
  },

  shiftActions: {
    display: 'flex',
    gap: '2px',
  },

  editButton: {
    background: 'none',
    border: 'none',
    padding: '2px 4px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
    transition: 'background-color 0.2s',
  },

  deleteButton: {
    background: 'none',
    border: 'none',
    padding: '2px 4px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px',
    transition: 'background-color 0.2s',
  },

  shiftTime: {
    color: '#1e40af',
    fontWeight: '500',
    fontSize: '12px',
    marginBottom: '2px',
  },

  shiftDuration: {
    color: '#6b7280',
    fontSize: '11px',
  },

  // List View
  listContainer: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    overflow: 'hidden',
  },

  // Table Styles
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  tableHeader: {
    backgroundColor: '#f8fafc',
  },

  tableHeaderCell: {
    padding: '16px',
    textAlign: 'left',
    borderBottom: '2px solid #e5e7eb',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },

  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
    cursor: 'pointer',
  },

  tableCell: {
    padding: '16px',
    fontSize: '14px',
    color: '#374151',
  },

  actionButtons: {
    display: 'flex',
    gap: '8px',
  },

  // Empty State
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },

  emptyStateIcon: {
    fontSize: '64px',
    marginBottom: '16px',
    opacity: 0.5,
  },

  emptyStateTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },

  emptyStateText: {
    fontSize: '14px',
    color: '#6b7280',
    maxWidth: '400px',
    margin: '0 auto',
  },

  // Monthly Calendar Styles
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e5e7eb',
  },

  calendarNavigation: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },

  navButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#374151',
  },

  monthTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1f2937',
    margin: 0,
    minWidth: '200px',
    textAlign: 'center',
  },

  todayButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  daysHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e5e7eb',
  },

  calendarDay: {
    position: 'relative',
    minHeight: '120px',
    padding: '8px',
    borderRight: '1px solid #e5e7eb',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    boxSizing: 'border-box',
  },

  otherMonthDay: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },

  todayDay: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },

  selectedDay: {
    backgroundColor: '#eff6ff !important',
    position: 'relative',
  },

  dayNumber: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '4px',
  },

  addShiftButton: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    fontSize: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },

  dayShifts: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '4px',
  },

  shiftItem: {
    padding: '4px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    position: 'relative',
  },

  specificShift: {
    backgroundColor: '#dbeafe',
    border: '1px solid #93c5fd',
    color: '#1e40af',
  },

  recurringShift: {
    backgroundColor: '#d1fae5',
    border: '1px solid #86efac',
    color: '#065f46',
  },

  shiftStaff: {
    fontWeight: '600',
    fontSize: '9px',
    marginBottom: '1px',
  },

  recurringIndicator: {
    position: 'absolute',
    top: '1px',
    right: '2px',
    fontSize: '8px',
  },

  moreShifts: {
    padding: '2px 6px',
    fontSize: '10px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    textAlign: 'center',
  },

  expandedShifts: {
    position: 'absolute',
    top: '100%',
    left: '-1px',
    right: '-1px',
    backgroundColor: '#ffffff',
    border: '2px solid #3b82f6',
    borderRadius: '8px',
    padding: '12px',
    zIndex: 100,
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
    maxHeight: '300px',
    overflowY: 'auto',
    marginTop: '2px',
  },

  expandedHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    paddingBottom: '4px',
    borderBottom: '1px solid #e5e7eb',
    fontSize: '12px',
    color: '#1f2937',
  },

  closeButton: {
    background: 'none',
    border: 'none',
    padding: '4px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#6b7280',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
  },

  expandedShiftItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid #f3f4f6',
  },

  expandedShiftInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  expandedStaffName: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#1f2937',
  },

  expandedShiftTime: {
    fontSize: '11px',
    color: '#6b7280',
  },

  recurringLabel: {
    fontSize: '9px',
    color: '#059669',
    backgroundColor: '#ecfdf5',
    padding: '1px 4px',
    borderRadius: '2px',
  },

  expandedShiftActions: {
    display: 'flex',
    gap: '4px',
  },

  miniEditButton: {
    background: 'none',
    border: 'none',
    padding: '2px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '10px',
  },

  miniDeleteButton: {
    background: 'none',
    border: 'none',
    padding: '2px',
    borderRadius: '2px',
    cursor: 'pointer',
    fontSize: '10px',
  },

  calendarLoading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: '20px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#6b7280',
  },

  // Badge Styles
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },

  badgeRecurring: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #86efac',
  },

  badgeSpecific: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    border: '1px solid #93c5fd',
  },
}

// Modal Styles
export const modalStyles = {
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
    padding: '20px',
  },

  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
  },

  modalHeader: {
    padding: '24px 24px 16px 24px',
    borderBottom: '1px solid #e5e7eb',
  },

  modalTitle: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#1f2937',
    margin: '0 0 8px 0',
  },

  modalSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },

  // Form Elements
  formGroup: {
    marginBottom: '20px',
    padding: '0 24px',
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '6px',
  },

  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },

  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    minHeight: '80px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    backgroundColor: '#ffffff',
    boxSizing: 'border-box',
  },

  // Messages
  errorMessage: {
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    margin: '16px 24px',
    border: '1px solid #fecaca',
  },

  successMessage: {
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    margin: '16px 24px',
    border: '1px solid #a7f3d0',
  },

  infoBox: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '12px 16px',
    margin: '16px 24px',
  },

  infoText: {
    fontSize: '14px',
    color: '#1e40af',
    margin: 0,
  },

  // Button Group
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },

  cancelButton: {
    flex: 1,
    padding: '12px 24px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  submitButton: {
    flex: 1,
    padding: '12px 24px',
    border: 'none',
    backgroundColor: '#007bff',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
}
