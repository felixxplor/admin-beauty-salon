// ImprovedResponsiveCalendarStyles.js
// Enhanced responsive styles with focus on mobile UX improvements

export const SLOT_HEIGHT = {
  mobile: 80, // Much taller for mobile
  tablet: 75, // Much taller for tablet
  desktop: 100, // Much taller for desktop
}

export const breakpoints = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
}

const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a8a',
  },
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  warning: {
    50: '#fffbeb',
    500: '#f59e0b',
    600: '#d97706',
  },
  danger: {
    50: '#fef2f2',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  white: '#ffffff',
  black: '#000000',
}

const touchTargets = {
  mobile: {
    minHeight: '48px',
    minWidth: '48px',
    fontSize: '16px',
    padding: '12px 16px',
  },
  tablet: {
    minHeight: '56px',
    minWidth: '56px',
    fontSize: '18px',
    padding: '14px 20px',
  },
  desktop: {
    minHeight: '44px',
    minWidth: '44px',
    fontSize: '14px',
    padding: '10px 16px',
  },
}

const typography = {
  mobile: {
    h1: '22px',
    h2: '18px',
    h3: '16px',
    body: '15px',
    small: '13px',
    xs: '11px',
  },
  tablet: {
    h1: '28px',
    h2: '24px',
    h3: '20px',
    body: '18px',
    small: '16px',
    xs: '14px',
  },
  desktop: {
    h1: '32px',
    h2: '24px',
    h3: '20px',
    body: '16px',
    small: '14px',
    xs: '12px',
  },
}

const getBookingColor = (booking, status) => {
  let serviceCount = 1
  if (Array.isArray(booking.originalBooking?.services)) {
    serviceCount = booking.originalBooking.services.length
  } else if (booking.originalBooking?.serviceIds) {
    try {
      const serviceIdsArray = Array.isArray(booking.originalBooking.serviceIds)
        ? booking.originalBooking.serviceIds
        : JSON.parse(booking.originalBooking.serviceIds)
      serviceCount = serviceIdsArray.length
    } catch (e) {
      serviceCount = 1
    }
  }

  if (status === 'completed') {
    return '#34d399' // Mint green - fresh & clean
  } else if (status === 'cancelled') {
    return '#f472b6' // Hot pink - bold but not harsh red
  } else if (status === 'pending') {
    // Peach/Coral gradient for pending
    if (serviceCount === 1) return '#fb923c' // Peachy orange
    if (serviceCount === 2) return '#f97316' // Tangerine
    return '#ea580c' // Deep orange
  } else {
    // Confirmed - Purple/Lavender vibes
    if (serviceCount === 1) return '#a78bfa' // Soft lavender
    if (serviceCount === 2) return '#8b5cf6' // Medium purple
    return '#7c3aed' // Deep violet
  }
}

export const responsiveCalendarStyles = {
  errorContainer: (deviceType) => ({
    padding: deviceType === 'mobile' ? '16px' : '24px',
    textAlign: 'center',
    color: colors.danger[600],
    fontSize: typography[deviceType].body,
    backgroundColor: colors.danger[50],
    borderRadius: '8px',
    margin: '16px',
  }),

  calendarContainer: (deviceType) => ({
    width: '100%',
    padding: deviceType === 'mobile' ? '12px' : deviceType === 'tablet' ? '20px' : '24px',
    backgroundColor: colors.white,
    minHeight: '100vh',
    boxSizing: 'border-box',
  }),

  calendarHeader: (deviceType) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: deviceType === 'mobile' ? '12px' : '24px',
    flexWrap: deviceType === 'mobile' ? 'wrap' : 'nowrap',
    gap: deviceType === 'mobile' ? '8px' : '16px',
  }),

  calendarTitle: (deviceType) => ({
    fontSize: typography[deviceType].h1,
    fontWeight: '700',
    color: colors.gray[900],
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
  }),

  navigation: (deviceType) => ({
    display: 'flex',
    alignItems: 'center',
    gap: deviceType === 'mobile' ? '8px' : '16px',
  }),

  navButton: (deviceType) => ({
    minHeight: '44px',
    minWidth: '44px',
    backgroundColor: 'transparent',
    border: '2px solid #e5e7eb',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#374151',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    touchAction: 'manipulation',
  }),

  monthTitle: (deviceType) => ({
    fontSize: typography[deviceType].h2,
    fontWeight: '600',
    color: colors.gray[900],
    minWidth: deviceType === 'mobile' ? '100px' : '180px',
    textAlign: 'center',
    margin: 0,
  }),

  calendarGrid: (deviceType) => ({
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  }),

  weekHeader: (deviceType) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    backgroundColor: '#f9fafb',
    width: '100%',
    boxSizing: 'border-box',
  }),

  weekHeaderCell: (deviceType, isLast) => ({
    padding: deviceType === 'mobile' ? '10px 4px' : '12px',
    fontSize: deviceType === 'mobile' ? '13px' : '14px',
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    borderRight: isLast ? 'none' : '1px solid #e5e7eb',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    minWidth: 0,
  }),

  daysGrid: (deviceType) => ({
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    width: '100%',
    overflow: 'hidden',
  }),

  dayCell: (deviceType, hasDay, isHovered, isLast) => ({
    height: deviceType === 'mobile' ? '70px' : deviceType === 'tablet' ? '80px' : '96px',
    borderBottom: '1px solid #e5e7eb',
    borderRight: isLast ? 'none' : '1px solid #e5e7eb',
    padding: deviceType === 'mobile' ? '6px' : '6px',
    cursor: hasDay ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    position: 'relative',
    backgroundColor: !hasDay ? '#f9fafb' : isHovered ? '#f0f8ff' : 'white',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
    touchAction: 'manipulation',
    minWidth: 0,
    minHeight: deviceType === 'mobile' ? '70px' : '80px',
    boxSizing: 'border-box',
  }),

  dayNumber: (deviceType, isToday) => ({
    fontSize: deviceType === 'mobile' ? '14px' : typography[deviceType].small,
    fontWeight: isToday ? '700' : '500',
    marginBottom: '4px',
    color: isToday ? colors.primary[600] : colors.gray[900],
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  }),

  todayIndicator: (deviceType) => ({
    width: '8px',
    height: '8px',
    backgroundColor: colors.primary[500],
    borderRadius: '50%',
    display: 'inline-block',
  }),

  bookingBadge: (deviceType) => ({
    fontSize: deviceType === 'mobile' ? '11px' : typography[deviceType].xs,
    backgroundColor: colors.primary[100],
    color: colors.primary[700],
    padding: deviceType === 'mobile' ? '3px 8px' : '2px 8px',
    borderRadius: '10px',
    display: 'inline-block',
    marginBottom: '2px',
    fontWeight: '600',
  }),

  summaryGrid: (deviceType) => ({
    display: 'grid',
    gridTemplateColumns: deviceType === 'mobile' ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginTop: '20px',
  }),

  summaryCard: (variant) => {
    const colorMap = {
      blue: {
        bgGradient: `linear-gradient(135deg, ${colors.primary[600]}, ${colors.primary[500]})`,
      },
      green: {
        bgGradient: `linear-gradient(135deg, ${colors.success[600]}, ${colors.success[500]})`,
      },
      orange: {
        bgGradient: `linear-gradient(135deg, ${colors.warning[600]}, ${colors.warning[500]})`,
      },
      red: {
        bgGradient: `linear-gradient(135deg, ${colors.danger[600]}, ${colors.danger[500]})`,
      },
    }

    return {
      padding: '20px',
      borderRadius: '12px',
      color: colors.white,
      background: colorMap[variant]?.bgGradient || colorMap.blue.bgGradient,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }
  },

  summaryLabel: {
    fontSize: '14px',
    opacity: 0.95,
    marginBottom: '4px',
    fontWeight: '500',
  },

  summaryValue: {
    fontSize: '32px',
    fontWeight: '700',
    margin: 0,
  },

  // ============================================
  // DAY VIEW - MAJOR IMPROVEMENTS FOR MOBILE
  // ============================================

  dayViewContainer: (deviceType) => ({
    position: 'fixed', // Changed from absolute
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: colors.white,
    zIndex: 1,
  }),

  // IMPROVED: Compact header for mobile
  dayViewHeader: (deviceType) => ({
    padding: deviceType === 'mobile' ? '8px 12px' : '16px 24px',
    backgroundColor: colors.white,
    boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    zIndex: 100,
    borderBottom: `1px solid ${colors.gray[200]}`,
  }),

  dayViewHeaderContent: (deviceType) => ({
    width: '100%',
    maxWidth: deviceType === 'mobile' ? 'none' : '1600px',
    display: 'flex',
    flexDirection: deviceType === 'mobile' ? 'column' : 'row',
    alignItems: deviceType === 'mobile' ? 'stretch' : 'center',
    gap: deviceType === 'mobile' ? '8px' : '16px',
  }),

  // IMPROVED: Better mobile layout
  dayViewHeaderLeft: (deviceType) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    justifyContent: deviceType === 'mobile' ? 'space-between' : 'flex-start',
    order: deviceType === 'mobile' ? 1 : 1,
  }),

  dayViewTitle: (deviceType) => ({
    fontSize: deviceType === 'mobile' ? '16px' : typography[deviceType].h3,
    fontWeight: '600',
    margin: 0,
    textAlign: deviceType === 'mobile' ? 'left' : 'center',
    whiteSpace: 'nowrap',
    color: colors.gray[900],
    flex: deviceType === 'mobile' ? 1 : 'auto',
  }),

  dayViewHeaderRight: (deviceType) => ({
    display: 'flex',
    alignItems: 'center',
    gap: deviceType === 'mobile' ? '8px' : '16px',
    justifyContent: deviceType === 'mobile' ? 'stretch' : 'flex-end',
    order: deviceType === 'mobile' ? 2 : 2,
    width: deviceType === 'mobile' ? '100%' : 'auto',
  }),

  backButton: (deviceType) => ({
    padding: deviceType === 'mobile' ? '8px 12px' : '10px 16px',
    minHeight: '40px',
    backgroundColor: 'transparent',
    border: `2px solid ${colors.gray[300]}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: deviceType === 'mobile' ? '14px' : typography[deviceType].small,
    color: colors.primary[600],
    transition: 'all 0.2s ease',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    flex: deviceType === 'mobile' ? 'none' : 'auto',
  }),

  actionButton: (deviceType, variant) => {
    const variantColors = {
      primary: { bg: colors.primary[500], hover: colors.primary[600] },
      success: { bg: colors.success[600], hover: colors.success[700] },
      danger: { bg: colors.danger[600], hover: colors.danger[700] },
    }

    return {
      padding: deviceType === 'mobile' ? '10px 14px' : '10px 16px',
      minHeight: '40px',
      backgroundColor: variantColors[variant].bg,
      color: colors.white,
      border: 'none',
      borderRadius: '8px',
      fontSize: deviceType === 'mobile' ? '14px' : typography[deviceType].small,
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      whiteSpace: 'nowrap',
      flex: deviceType === 'mobile' && variant === 'primary' ? 1 : 'none',
    }
  },

  dayViewStats: (deviceType) => ({
    fontSize: typography[deviceType].small,
    color: colors.gray[600],
    fontWeight: '500',
    display: deviceType === 'mobile' ? 'none' : 'block',
  }),

  // IMPROVED: Better mobile action bar
  mobileActionBar: {
    padding: '10px 12px',
    backgroundColor: colors.gray[50],
    borderBottom: `1px solid ${colors.gray[200]}`,
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    justifyContent: 'space-between',
    flexShrink: 0,
  },

  mobileActionButton: (variant) => {
    const variantColors = {
      success: { bg: colors.success[600] },
      danger: { bg: colors.danger[600] },
    }

    return {
      padding: '8px 14px',
      backgroundColor: variantColors[variant].bg,
      color: colors.white,
      border: 'none',
      borderRadius: '8px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minHeight: '38px',
      flex: 1,
    }
  },

  mobileStats: {
    fontSize: '13px',
    color: colors.gray[600],
    fontWeight: '500',
    flex: 1,
    textAlign: 'center',
  },

  // IMPROVED: More compact status banners
  statusBanner: (deviceType, type) => {
    const typeColors = {
      info: { bg: colors.primary[50], color: colors.primary[700], border: colors.primary[200] },
      warning: { bg: colors.warning[50], color: colors.warning[800], border: colors.warning[200] },
      error: { bg: colors.danger[50], color: colors.danger[700], border: colors.danger[200] },
    }

    return {
      padding: deviceType === 'mobile' ? '8px 12px' : '12px 24px',
      backgroundColor: typeColors[type].bg,
      borderBottom: `1px solid ${typeColors[type].border}`,
      fontSize: deviceType === 'mobile' ? '12px' : typography[deviceType].small,
      color: typeColors[type].color,
      textAlign: 'center',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      flexWrap: 'wrap',
      flexShrink: 0,
      lineHeight: 1.4,
    }
  },

  statusBannerSubtext: {
    fontSize: '11px',
    opacity: 0.8,
    marginLeft: '8px',
  },

  // IMPROVED: Better scrolling container
  scrollableContent: (deviceType) => ({
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    position: 'relative',
    backgroundColor: '#fafafa',
    WebkitOverflowScrolling: 'touch',
    display: 'block',
  }),

  scheduleContainer: (deviceType) => ({
    padding: deviceType === 'mobile' ? '0' : '16px',
    minWidth: '100%',
    minHeight: '100%',
    position: 'relative',
    width: '100%',
  }),

  currentTimeLine: (position) => ({
    position: 'absolute',
    top: `${position + (window.innerWidth <= 480 ? 105 : 125)}px`,
    left: 0,
    right: 0,
    height: '2px',
    backgroundColor: colors.danger[500],
    zIndex: 40,
    pointerEvents: 'none',
    boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
  }),

  currentTimeLabel: {
    position: 'absolute',
    left: '8px',
    top: '-10px',
    backgroundColor: colors.danger[500],
    color: colors.white,
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap',
  },

  currentTimeDot: {
    position: 'absolute',
    left: 0,
    top: '-4px',
    width: '10px',
    height: '10px',
    backgroundColor: colors.danger[500],
    borderRadius: '50%',
    border: `2px solid ${colors.white}`,
  },

  // IMPROVED: Better sticky header on mobile
  scheduleHeader: (deviceType, staffCount) => {
    const timeColumnWidth = deviceType === 'mobile' ? '65px' : '100px'

    return {
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: 'white',
      borderBottom: `2px solid ${colors.gray[300]}`,
      display: 'grid',
      gridTemplateColumns:
        staffCount > 0 ? `${timeColumnWidth} repeat(${staffCount}, 1fr)` : `${timeColumnWidth} 1fr`,
      width: '100%',
      minWidth: '100%',
      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    }
  },

  timeHeaderCell: (deviceType) => ({
    padding: deviceType === 'mobile' ? '12px 8px' : '12px 16px',
    fontWeight: '700',
    fontSize: deviceType === 'mobile' ? '12px' : typography[deviceType].xs,
    borderRight: `1px solid ${colors.gray[300]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    color: colors.gray[900],
  }),

  // IMPROVED: Cleaner staff header
  staffHeaderCell: (deviceType, hasSpecificShift) => ({
    padding: deviceType === 'mobile' ? '10px 6px' : '12px 8px',
    fontWeight: '700',
    fontSize: deviceType === 'mobile' ? '12px' : '13px',
    textAlign: 'center',
    borderRight: `1px solid ${colors.gray[300]}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    backgroundColor: hasSpecificShift ? colors.success[50] : colors.white,
    position: 'relative',
    color: colors.gray[900],
    minWidth: 0,
    overflow: 'hidden',
  }),

  staffName: (deviceType) => ({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100%',
    fontSize: deviceType === 'mobile' ? '11px' : '12px',
    fontWeight: '600',
  }),

  deleteShiftButton: (deviceType) => ({
    background: 'none',
    border: 'none',
    color: colors.danger[600],
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    transition: 'all 0.2s',
    position: deviceType === 'mobile' ? 'relative' : 'absolute',
    top: deviceType === 'mobile' ? 'auto' : '4px',
    right: deviceType === 'mobile' ? 'auto' : '4px',
  }),

  noStaffHeader: (deviceType) => ({
    padding: deviceType === 'mobile' ? '12px 8px' : '12px 8px',
    fontWeight: '600',
    fontSize: typography[deviceType].xs,
    textAlign: 'center',
    borderRight: `1px solid ${colors.gray[200]}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.gray[500],
    minWidth: 0,
    overflow: 'hidden',
  }),

  // IMPROVED: Better visible borders
  timeSlotRow: (deviceType, staffCount) => {
    const timeWidth = deviceType === 'mobile' ? '65px' : '100px'

    return {
      display: 'grid',
      gridTemplateColumns:
        staffCount > 0 ? `${timeWidth} repeat(${staffCount}, 1fr)` : `${timeWidth} 1fr`,
      border: `1px solid ${colors.gray[100]}`,
      minHeight: `${SLOT_HEIGHT[deviceType]}px`,
      height: `${SLOT_HEIGHT[deviceType]}px`,
      width: '100%',
      overflow: 'visible',
      position: 'relative',
      backgroundColor: colors.white,
    }
  },

  timeCell: (deviceType) => ({
    padding: deviceType === 'mobile' ? '0 8px' : '8px 16px',
    fontSize: deviceType === 'mobile' ? '12px' : typography[deviceType].xs,
    fontWeight: '600',
    color: colors.gray[700],
    borderRight: `1px solid ${colors.gray[300]}`,
    backgroundColor: colors.gray[50],
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: `${SLOT_HEIGHT[deviceType]}px`,
    boxSizing: 'border-box',
  }),

  staffSlot: (deviceType, isDropTarget) => ({
    position: 'relative',
    borderRight: `1px solid ${colors.gray[300]}`,
    backgroundColor: isDropTarget ? colors.primary[50] : colors.white,
    height: `${SLOT_HEIGHT[deviceType]}px`,
    transition: 'background-color 0.2s ease',
    boxSizing: 'border-box',
    minWidth: 0,
    overflow: 'visible',
  }),

  // IMPROVED: Better booking blocks for mobile
  bookingBlock: (deviceType, booking, slotsSpanned) => ({
    backgroundColor: getBookingColor(booking, booking.status),
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'absolute',
    top: '2px',
    left: '2px',
    right: '2px',
    zIndex: 10,
    padding: deviceType === 'mobile' ? '6px' : '6px 8px',
    borderRadius: deviceType === 'mobile' ? '6px' : '6px',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
    touchAction: 'manipulation',
    userSelect: 'none',
    height: `${slotsSpanned * SLOT_HEIGHT[deviceType] - 4}px`,
    boxSizing: 'border-box',
    overflow: 'hidden',
    fontSize: deviceType === 'mobile' ? '11px' : '12px',
    lineHeight: 1.3,
  }),

  bookingService: (deviceType) => ({
    fontWeight: '700',
    fontSize: deviceType === 'mobile' ? '11px' : '10px',
    whiteSpace: 'normal', // Allow text wrapping
    lineHeight: '1.2',
    marginBottom: '2px',
    wordBreak: 'break-word', // Break long words if needed
    overflowWrap: 'break-word', // Better word wrapping
  }),

  bookingClient: (deviceType) => ({
    fontSize: deviceType === 'mobile' ? '11px' : '10px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: '1.2',
    opacity: 0.95,
    marginBottom: '1px',
  }),

  bookingNotes: (deviceType) => ({
    fontSize: '10px',
    overflow: 'hidden',
    fontWeight: 'bold',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: '1.2',
    color: '#fef08a',
    marginTop: '2px',
  }),

  bookingClientCount: (deviceType) => ({
    fontSize: '9px',
    opacity: 0.85,
    marginTop: '1px',
  }),

  bookingTime: (deviceType) => ({
    fontSize: '9px',
    opacity: 0.85,
    marginTop: '1px',
  }),

  emptySlot: (deviceType) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: `${SLOT_HEIGHT[deviceType]}px`,
    color: colors.gray[300],
    fontSize: '14px',
  }),

  noStaffSlot: (deviceType) => ({
    borderRight: `1px solid ${colors.gray[200]}`,
    backgroundColor: colors.white,
    height: `${SLOT_HEIGHT[deviceType]}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.gray[400],
    fontSize: '12px',
    minWidth: 0,
    overflow: 'hidden',
  }),

  mobileSummary: {
    padding: '16px 12px',
    backgroundColor: colors.gray[50],
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },

  // IMPROVED: Full-screen modals on mobile
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2000,
    padding: 0,
    boxSizing: 'border-box',
  },

  modal: (deviceType) => ({
    backgroundColor: 'white',
    borderRadius: deviceType === 'mobile' ? '16px 16px 0 0' : '12px',
    padding: deviceType === 'mobile' ? '20px 16px 32px' : '24px',
    width: '100%',
    height: deviceType === 'mobile' ? 'auto' : 'auto',
    maxWidth: deviceType === 'mobile' ? '100%' : '800px',
    maxHeight: deviceType === 'mobile' ? '85vh' : '90vh',
    overflowY: 'auto',
    boxShadow:
      deviceType === 'mobile' ? '0 -4px 20px rgba(0,0,0,0.2)' : '0 10px 25px rgba(0,0,0,0.1)',
    position: 'relative',
    margin: 0,
    WebkitOverflowScrolling: 'touch',
  }),

  modalHeader: (deviceType) => ({
    fontSize: deviceType === 'mobile' ? '18px' : typography[deviceType].h3,
    fontWeight: '700',
    marginBottom: '16px',
    color: colors.gray[900],
    textAlign: 'left',
    paddingBottom: '12px',
    borderBottom: `1px solid ${colors.gray[200]}`,
  }),

  modalSubheader: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '400',
    color: colors.gray[600],
    marginTop: '4px',
  },

  modalForm: (deviceType) => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  }),

  formGroup: {
    marginBottom: 0,
  },

  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: colors.gray[700],
    marginBottom: '6px',
  },

  input: (deviceType) => ({
    width: '100%',
    padding: '12px 14px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px', // 16px prevents zoom on iOS
    backgroundColor: 'white',
    boxSizing: 'border-box',
    color: '#111827',
    transition: 'border-color 0.2s ease',
    minHeight: '48px',
    WebkitAppearance: 'none',
    appearance: 'none',
  }),

  select: (deviceType) => ({
    width: '100%',
    padding: '12px 14px',
    border: `2px solid ${colors.gray[200]}`,
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: colors.white,
    boxSizing: 'border-box',
    color: colors.gray[900],
    minHeight: '48px',
    cursor: 'pointer',
    WebkitAppearance: 'none',
    appearance: 'none',
  }),

  formButtons: (deviceType) => ({
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    flexDirection: deviceType === 'mobile' ? 'column-reverse' : 'row',
  }),

  cancelButton: (deviceType) => ({
    padding: '12px 20px',
    minHeight: '48px',
    backgroundColor: 'transparent',
    border: `2px solid ${colors.gray[300]}`,
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    color: colors.gray[700],
    fontWeight: '600',
  }),

  submitButton: (deviceType) => ({
    padding: '12px 20px',
    minHeight: '48px',
    backgroundColor: colors.primary[500],
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '600',
  }),

  disabledButton: {
    backgroundColor: colors.gray[400],
    cursor: 'not-allowed',
    opacity: 0.6,
  },
}

export const requiredMetaTags = `
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
`

export const mobileCSSFixes = `
  <style>
    /* Prevent iOS safari zoom on input focus */
    input, select, textarea {
      font-size: 16px !important;
      transform: translateZ(0);
    }
    
    /* Prevent touch callouts and selection */
    * {
      -webkit-touch-callout: none;
      -webkit-tap-highlight-color: transparent;
    }
    
    /* Allow text selection only in inputs */
    input, textarea, [contenteditable] {
      -webkit-user-select: text;
      user-select: text;
    }
    
    /* Optimize scrolling */
    * {
      -webkit-overflow-scrolling: touch;
    }
    
    html {
      overflow-x: hidden;
      max-width: 100%;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    body {
      overflow-x: hidden;
      max-width: 100%;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      -webkit-text-size-adjust: 100%;
    }
    
    /* Fix for mobile viewport */
    .day-view-container {
      height: 100vh;
      height: 100dvh;
    }
    
    /* Better box sizing */
    *, *::before, *::after {
      box-sizing: border-box;
    }
    
    /* Better focus states for touch */
    button:active, 
    .touchable:active {
      opacity: 0.7;
      transform: scale(0.98);
    }
  </style>
`

export default {
  responsiveCalendarStyles,
  requiredMetaTags,
  mobileCSSFixes,
  SLOT_HEIGHT,
}
