import { Outlet, NavLink } from 'react-router-dom'
import { Activity, MapPin, LogOut, AlertTriangle } from 'lucide-react'

export default function Layout({ user, onLogout }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      {/* Navbar */}
      <nav style={{
        background: 'rgba(8,12,20,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 32px',
        display: 'flex',
        alignItems: 'center',
        height: 60,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 40 }}>
          <AlertTriangle size={20} color="#ff3b3b" />
          <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17, letterSpacing: '-0.02em' }}>
            Accident<span style={{ color: '#3b82f6' }}>AI</span>
          </span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          <NavLink to="/predict" style={({ isActive }) => navStyle(isActive)}>
            <Activity size={15} />
            Predict
          </NavLink>
          <NavLink to="/hospitals" style={({ isActive }) => navStyle(isActive)}>
            <MapPin size={15} />
            Hospitals
          </NavLink>
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 13, color: '#6b7585' }}>
            {user}
          </span>
          <button onClick={onLogout} style={{
            background: 'rgba(255,59,59,0.1)',
            border: '1px solid rgba(255,59,59,0.2)',
            borderRadius: 8,
            padding: '6px 12px',
            color: '#ff3b3b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontFamily: 'DM Sans',
          }}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </nav>

      {/* Page content */}
      <main style={{ flex: 1, padding: '32px 32px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <Outlet />
      </main>
    </div>
  )
}

function navStyle(isActive) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 8,
    textDecoration: 'none',
    fontSize: 14,
    fontFamily: 'DM Sans',
    fontWeight: 500,
    color: isActive ? '#fff' : '#6b7585',
    background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
    transition: 'all 0.2s',
  }
}
