import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import DashboardPage from '@/pages/DashboardPage'
import NotFoundPage from '@/pages/NotFoundPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])

export default router
