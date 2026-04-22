import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import LoginPage from './pages/LoginPage'
import PredictPage from './pages/PredictPage'
import HospitalsPage from './pages/HospitalsPage'
import Layout from './components/Layout'

export default function App() {
  const [user, setUser] = useState(() => sessionStorage.getItem('user') || null)

  const login = (username) => {
    sessionStorage.setItem('user', username)
    setUser(username)
  }

  const logout = () => {
    sessionStorage.removeItem('user')
    setUser(null)
  }

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/predict" replace /> : <LoginPage onLogin={login} />
      } />
      <Route path="/" element={
        user ? <Layout user={user} onLogout={logout} /> : <Navigate to="/login" replace />
      }>
        <Route index        element={<Navigate to="/predict" replace />} />
        <Route path="predict"   element={<PredictPage />} />
        <Route path="hospitals" element={<HospitalsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
