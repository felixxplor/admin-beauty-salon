import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'

import { DarkModeProvider } from './context/DarkModeContext'

import './index.css'
import GlobalStyles from './styles/GlobalStyles'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import Settings from './pages/Settings'
import Account from './pages/Account'
import Login from './pages/Login'
import PageNotFound from './pages/PageNotFound'
import AppLayout from './ui/AppLayout'
import Booking from './pages/Booking'
import ProtectedRoute from './ui/ProtectedRoute'
import ClientsPage from './pages/Clients'
import Services from './pages/Services'
import BookingDetailPage from './pages/BookingDetail'
import POSSystem from './pages/POS'
import PendingBookings from './pages/PendingBookings'
import StaffLeavePage from './pages/Staff'
import Transactions from './pages/Transactions'
import VouchersPage from './pages/VouchersPage'
import RosterPage from './pages/RosterPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // staleTime: 60 * 1000,
      staleTime: 0,
    },
  },
})

function App() {
  return (
    <DarkModeProvider>
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />

        <GlobalStyles />
        <BrowserRouter>
          <Routes>
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate replace to="dashboard" />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="pos" element={<POSSystem />} />
              <Route path="bookings" element={<Bookings />} />
              <Route path="bookings/:bookingId" element={<Booking />} />
              <Route path="/bookings/:bookingId" element={<BookingDetailPage />} />
              <Route path="/pending-bookings" element={<PendingBookings />} />
              <Route path="/staff" element={<StaffLeavePage />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/vouchers" element={<VouchersPage />} />
              <Route path="/roster" element={<RosterPage />} />

              <Route path="services" element={<Services />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="settings" element={<Settings />} />
              <Route path="account" element={<Account />} />
            </Route>

            <Route path="login" element={<Login />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-center"
          gutter={12}
          containerStyle={{ margin: '8px' }}
          toastOptions={{
            success: {
              duration: 3000,
            },
            error: {
              duration: 5000,
            },
            style: {
              fontSize: '16px',
              maxWidth: '500px',
              padding: '16px 24px',
              backgroundColor: 'var(--color-grey-0)',
              color: 'var(--color-grey-600)',
            },
          }}
        />
      </QueryClientProvider>
    </DarkModeProvider>
  )
}

export default App
