import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import { MapPin, Phone, BedDouble, Stethoscope, Search } from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const specialtyColors = {
  trauma:  '#ff3b3b',
  general: '#3b82f6',
  ortho:   '#ffb800',
  neuro:   '#a855f7',
}

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([])
  const [search, setSearch]       = useState('')
  const [filter, setFilter]       = useState('all')

  useEffect(() => {
    axios.get(`${API}/hospitals`).then(r => setHospitals(r.data.hospitals)).catch(() => {})
  }, [])

  const specialties = ['all', ...new Set(hospitals.map(h => h.specialty))]

  const filtered = hospitals.filter(h => {
    const matchSearch = h.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || h.specialty === filter
    return matchSearch && matchFilter
  })

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 24, letterSpacing: '-0.03em', marginBottom: 4 }}>
          Hospital Network
        </h1>
        <p style={{ color: '#6b7585', fontSize: 13 }}>
          {hospitals.length} hospitals in the recommendation database
        </p>
      </div>

      {/* Map */}
      <div className="glass" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <MapContainer center={[17.43, 78.42]} zoom={12} style={{ height: 340, width: '100%' }} scrollWheelZoom={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
          {hospitals.map(h => (
            <Marker key={h.id} position={[h.lat, h.lon]}>
              <Popup>
                <strong>{h.name}</strong><br />
                {h.specialty} · {h.beds} beds<br />
                📞 {h.phone}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 200px' }}>
          <Search size={14} color="#6b7585" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="field" style={{ paddingLeft: 36 }} placeholder="Search hospitals..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {specialties.map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${filter === s ? (specialtyColors[s] || '#3b82f6') : 'rgba(255,255,255,0.08)'}`,
              background: filter === s ? `${specialtyColors[s] || '#3b82f6'}22` : 'transparent',
              color: filter === s ? (specialtyColors[s] || '#3b82f6') : '#6b7585',
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: 'DM Sans',
              textTransform: 'capitalize',
            }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Hospital Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(h => {
          const color = specialtyColors[h.specialty] || '#3b82f6'
          return (
            <div key={h.id} className="glass" style={{ padding: 20, transition: 'border-color 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <h3 style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>
                  {h.name}
                </h3>
                <span style={{
                  background: `${color}18`,
                  border: `1px solid ${color}40`,
                  color,
                  fontSize: 11,
                  padding: '3px 8px',
                  borderRadius: 6,
                  textTransform: 'capitalize',
                  flexShrink: 0,
                  marginLeft: 8,
                }}>
                  {h.specialty}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={infoRow}>
                  <BedDouble size={13} color="#6b7585" />
                  <span style={{ color: '#6b7585', fontSize: 13 }}>{h.beds} available beds</span>
                </div>
                <div style={infoRow}>
                  <Phone size={13} color="#6b7585" />
                  <span style={{ color: '#6b7585', fontSize: 13, fontFamily: 'JetBrains Mono' }}>{h.phone}</span>
                </div>
                <div style={infoRow}>
                  <MapPin size={13} color="#6b7585" />
                  <span style={{ color: '#6b7585', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
                    {h.lat.toFixed(4)}, {h.lon.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const infoRow = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}
