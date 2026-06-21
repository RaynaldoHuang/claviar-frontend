import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Box, ChartNoAxesCombined, ChevronLeft, ChevronRight, CircleDollarSign, CreditCard, LayoutDashboard, LogOut, Menu, Package, ReceiptText, Search, UserRound, Users, X } from 'lucide-react'
import { api } from '@/api/client'
import { authStore } from '@/stores/auth-store'
import { feedback } from '@/components/feedback-store'

const nav = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard }, { label: 'Consignors', to: '/consignors', icon: Users },
  { label: 'Customers', to: '/customers', icon: UserRound },
  { label: 'Product Cards', to: '/products', icon: Package }, { label: 'Customer Purchases', to: '/customer-purchases', icon: ReceiptText },
  { label: 'Sales History', to: '/sales', icon: CircleDollarSign }, { label: 'Payouts', to: '/payouts', icon: CreditCard },
  { label: 'Reports', to: '/reports', icon: ChartNoAxesCombined },
]
type SearchResult = { type: string; title: string; subtitle: string; url: string }

export function AdminLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const user = authStore.user()
  const globalResults = useQuery({ queryKey: ['global-search', search], enabled: search.trim().length >= 2, queryFn: async () => (await api.get<{ data: SearchResult[] }>('/search', { params: { q: search.trim() } })).data.data })
  const menuResults: SearchResult[] = search.trim() ? nav.filter(item => item.label.toLowerCase().includes(search.toLowerCase())).map(item => ({ type: 'menu', title: item.label, subtitle: 'Menu', url: item.to })) : []
  const results = [...menuResults, ...(globalResults.data ?? [])]
  const openResult = (result: SearchResult) => { navigate(result.url); setSearch(''); setSearchOpen(false) }
  const logout = () => feedback.confirm({ title: 'Keluar dari Claviar?', description: 'Sesi Anda akan diakhiri dan Anda harus login kembali untuk mengakses dashboard.', confirmLabel: 'Ya, logout', tone: 'danger', action: async () => { try { await api.post('/auth/logout') } finally { authStore.clear(); navigate('/login') } } })

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus(); setSearchOpen(true) }
      if (event.key === 'Escape') { setSearchOpen(false); searchRef.current?.blur() }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [])

  return <div className="app-shell">
    {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Tutup menu" />}
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand"><div className="brand-mark"><Box size={20} /></div>{!collapsed && <span>Claviar</span>}<button className="mobile-close" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
      <div className="sidebar-scroll"><p className="nav-label">Management</p><nav className="nav-list">{nav.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'} title={collapsed ? label : undefined} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}><Icon size={18} />{!collapsed && <span>{label}</span>}</NavLink>)}</nav></div>
      <div className="sidebar-footer"><button className="profile-card" onClick={() => navigate('/profile')}><span className="avatar">{user?.name.slice(0, 2).toUpperCase() ?? 'CA'}</span>{!collapsed && <span className="profile-copy"><strong>{user?.name ?? 'Claviar Admin'}</strong><small>{user?.roles?.[0] ?? 'Administrator'}</small></span>}</button><button className="collapse-button" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}{!collapsed && <span>Collapse sidebar</span>}</button></div>
    </aside>
    <div className="main-shell"><header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
      <div className="search-box"><Search size={17} /><input ref={searchRef} value={search} onChange={event => { setSearch(event.target.value); setSearchOpen(true) }} onFocus={() => setSearchOpen(true)} onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)} onKeyDown={event => { if (event.key === 'Enter' && results[0]) openResult(results[0]) }} placeholder="Search Claviar..." /><kbd>⌘ K</kbd>
        {searchOpen && search.trim() && <div className="global-search-results">{search.trim().length < 2 ? <p>Type at least 2 characters...</p> : globalResults.isLoading ? <p>Searching...</p> : results.length ? results.map((result, index) => <button key={`${result.type}-${result.url}-${index}`} onMouseDown={event => event.preventDefault()} onClick={() => openResult(result)}><span className={`search-result-icon ${result.type}`}>{result.type.slice(0, 1).toUpperCase()}</span><span><strong>{result.title}</strong><small>{result.subtitle}</small></span></button>) : <p>No matching records found.</p>}</div>}
      </div></div>
      <div className="topbar-actions"><button className="header-profile" onClick={() => navigate('/profile')} title="Open profile"><span className="avatar small">{user?.name.slice(0, 2).toUpperCase() ?? 'CA'}</span><span className="header-profile-copy"><strong>{user?.name ?? 'Claviar Admin'}</strong><small>{user?.roles?.[0] ?? 'Administrator'}</small></span></button><span className="topbar-divider" /><button className="icon-button logout-button" onClick={logout} title="Sign out"><LogOut size={18} /></button></div>
    </header>{children}</div>
  </div>
}
