import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import L from 'leaflet'

// Fix default leaflet icon issue in Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const accidentIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    width:24px;height:24px;
    background:#ff3b3b;
    border:3px solid #fff;
    border-radius:50%;
    box-shadow:0 0 12px rgba(255,59,59,0.5);
  "></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const hospitalIcon = (rank) => new L.DivIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;
    background:${rank === 0 ? '#3b82f6' : '#243352'};
    border:2px solid ${rank === 0 ? '#60a5fa' : 'rgba(59,130,246,0.4)'};
    border-radius:6px;
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:700;color:white;
    font-family:'Syne',sans-serif;
    box-shadow:${rank === 0 ? '0 0 12px rgba(59,130,246,0.5)' : 'none'};
  ">${rank + 1}</div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

export default function ResultMap({ center, hospitals }) {
  return (
    <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontFamily: 'Syne', fontWeight: 600, fontSize: 14 }}>
        🗺 Hospital Map
      </div>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: 320, width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />

        {/* Accident location */}
        <Marker position={center} icon={accidentIcon}>
          <Popup>
            <strong>Accident Location</strong><br />
            {center[0].toFixed(4)}, {center[1].toFixed(4)}
          </Popup>
        </Marker>
        <Circle center={center} radius={500} pathOptions={{ color: '#ff3b3b', fillColor: '#ff3b3b', fillOpacity: 0.08 }} />

        {/* Hospital markers */}
        {hospitals.map((item, idx) => (
          <Marker
            key={idx}
            position={[item.hospital.lat, item.hospital.lon]}
            icon={hospitalIcon(idx)}
          >
            <Popup>
              <strong>{item.hospital.name}</strong><br />
              Specialty: {item.hospital.specialty}<br />
              Beds: {item.hospital.beds}<br />
              Distance: {item.distance_km} km<br />
              📞 {item.hospital.phone}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
