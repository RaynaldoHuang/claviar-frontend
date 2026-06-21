import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AdminLayout } from '@/layouts/AdminLayout'
import { authStore } from '@/stores/auth-store'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ConsignorsPage } from '@/pages/ConsignorsPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { SalesPage } from '@/pages/SalesPage'
import { PayoutsPage } from '@/pages/PayoutsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { CustomersPage } from '@/pages/CustomersPage'
import { CheckoutsPage } from '@/pages/CheckoutsPage'
import './App.css'

function Protected() { const location = useLocation(); return authStore.token() ? <AdminLayout><Outlet key={`${location.pathname}${location.search}`} /></AdminLayout> : <Navigate to="/login" replace /> }
export default function App() { return <Routes><Route path="/login" element={<LoginPage />} /><Route element={<Protected />}><Route index element={<DashboardPage />} /><Route path="consignors" element={<ConsignorsPage />} /><Route path="customers" element={<CustomersPage />} /><Route path="products" element={<ProductsPage />} /><Route path="customer-purchases" element={<CheckoutsPage />} /><Route path="sales" element={<SalesPage />} /><Route path="payouts" element={<PayoutsPage />} /><Route path="reports" element={<ReportsPage />} /><Route path="profile" element={<ProfilePage />} /></Route><Route path="*" element={<Navigate to="/" replace />} /></Routes> }
