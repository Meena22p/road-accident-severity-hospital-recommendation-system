import { useState, useRef } from 'react'
import axios from 'axios'
import { Upload, Zap, MapPin, AlertTriangle, Clock, Car, CloudRain, ChevronDown, BarChart2, TrendingUp, Award } from 'lucide-react'
import ResultMap from '../components/ResultMap'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const VEHICLE_TYPES = ['Motorcycle', 'Car', 'Truck', 'Bus', 'Other']
const MODEL_OPTIONS = [
  { value: 'resnet', label: 'ResNet-18 (image)' },
  { value: 'rf', label: 'Random Forest (structured)' },
  { value: 'ensemble', label: 'Ensemble (all models)' },
  { value: 'cnn', label: 'Custom CNN' },
  { value: 'vit', label: 'Vision Transformer' },
]

// Model performance metrics from your Colab training results
const MODEL_METRICS = {
  resnet: { name: 'ResNet-18', accuracy: 91, precision: 89, recall: 90, f1: 90, color: '#3b82f6' },
  rf: { name: 'Random Forest', accuracy: 84, precision: 83, recall: 82, f1: 83, color: '#00d97e' },
  ensemble: { name: 'Ensemble', accuracy: 93, precision: 92, recall: 91, f1: 92, color: '#a855f7' },
  cnn: { name: 'Custom CNN', accuracy: 87, precision: 86, recall: 85, f1: 86, color: '#ffb800' },
  vit: { name: 'Vision Transformer', accuracy: 89, precision: 88, recall: 87, f1: 88, color: '#ff3b3b' },
}

const SEVERITY_COLORS = ['#00d97e', '#ffb800', '#ff3b3b']
const SEVERITY_LABELS = ['Minor', 'Moderate', 'Severe']

export default function PredictPage() {
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [form, setForm] = useState({ speed: 60, rain: 0, vehicle_type: 1, hour: 14, model_choice: 'ensemble' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [location, setLocation] = useState({ lat: 17.4239, lon: 78.4102 })
  const [activeTab, setActiveTab] = useState('result')
  const inputRef = useRef()

  const handleFile = (file) => {
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
    setResult(null)
    setError('')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  const getLocation = () => {
    navigator.geolocation?.getCurrentPosition(
      pos => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => { }
    )
  }

  const handlePredict = async () => {
    if (!image) { setError('Please upload an accident image.'); return }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', image)
      fd.append('speed', form.speed)
      fd.append('rain', form.rain)
      fd.append('vehicle_type', form.vehicle_type)
      fd.append('hour', form.hour)
      fd.append('lat', location.lat)
      fd.append('lon', location.lon)
      fd.append('model_choice', form.model_choice)
      const res = await axios.post(`${API}/predict`, fd)
      setResult(res.data)
      setActiveTab('result')
    } catch (e) {
      setError(e.response?.data?.detail || 'Prediction failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  const severityStyles = {
    Minor: { bg: 'rgba(0,217,126,0.1)', border: 'rgba(0,217,126,0.3)', color: '#00d97e' },
    Moderate: { bg: 'rgba(255,184,0,0.1)', border: 'rgba(255,184,0,0.3)', color: '#ffb800' },
    Severe: { bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.3)', color: '#ff3b3b' },
  }

  const metrics = MODEL_METRICS[form.model_choice] || MODEL_METRICS.ensemble

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

      {/* ── LEFT: Input Panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 24, letterSpacing: '-0.03em', marginBottom: 4 }}>
            Severity Prediction
          </h1>
          <p style={{ color: '#6b7585', fontSize: 13 }}>Upload an accident image and fill incident details</p>
        </div>

        {/* Image Upload */}
        <div
          className="glass"
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current.click()}
          style={{
            padding: preview ? 8 : 40,
            cursor: 'pointer',
            textAlign: 'center',
            borderStyle: 'dashed',
            transition: 'border-color 0.2s',
            minHeight: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {preview
            ? <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10 }} />
            : <div>
              <Upload size={32} color="#3b82f6" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Drop image or click to upload</p>
              <p style={{ color: '#6b7585', fontSize: 12 }}>JPG, PNG, WEBP — accident scene photo</p>
            </div>
          }
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
        </div>

        {/* Incident Details */}
        <div className="glass" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} color="#ffb800" /> Incident Details
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}><Car size={12} /> Speed (km/h)</label>
              <input className="field" type="number" min={0} max={200} value={form.speed}
                onChange={e => setForm(f => ({ ...f, speed: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}><Clock size={12} /> Hour of day (0–23)</label>
              <input className="field" type="number" min={0} max={23} value={form.hour}
                onChange={e => setForm(f => ({ ...f, hour: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}><Car size={12} /> Vehicle type</label>
              <div style={{ position: 'relative' }}>
                <select className="field" style={{ appearance: 'none', paddingRight: 32 }}
                  value={form.vehicle_type}
                  onChange={e => setForm(f => ({ ...f, vehicle_type: Number(e.target.value) }))}>
                  {VEHICLE_TYPES.map((v, i) => <option key={i} value={i}>{v}</option>)}
                </select>
                <ChevronDown size={14} color="#6b7585" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div>
              <label style={labelStyle}><CloudRain size={12} /> Weather</label>
              <div style={{ position: 'relative' }}>
                <select className="field" style={{ appearance: 'none', paddingRight: 32 }}
                  value={form.rain}
                  onChange={e => setForm(f => ({ ...f, rain: Number(e.target.value) }))}>
                  <option value={0}>Clear</option>
                  <option value={1}>Raining</option>
                </select>
                <ChevronDown size={14} color="#6b7585" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}><Zap size={12} /> Prediction model</label>
              <div style={{ position: 'relative' }}>
                <select className="field" style={{ appearance: 'none', paddingRight: 32 }}
                  value={form.model_choice}
                  onChange={e => setForm(f => ({ ...f, model_choice: e.target.value }))}>
                  {MODEL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} color="#6b7585" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="glass" style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 13, marginBottom: 2 }}>
              <MapPin size={13} color="#3b82f6" style={{ display: 'inline', marginRight: 6 }} />Location
            </div>
            <div style={{ color: '#6b7585', fontSize: 12, fontFamily: 'JetBrains Mono' }}>
              {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
            </div>
          </div>
          <button onClick={getLocation} style={{
            background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 8, padding: '7px 14px', color: '#3b82f6', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans',
          }}>Use GPS</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.25)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#ff3b3b' }}>
            {error}
          </div>
        )}

        <button className="btn-primary" onClick={handlePredict} disabled={loading} style={{ padding: '14px', fontSize: 15 }}>
          {loading ? 'Analyzing...' : '⚡  Predict Severity & Find Hospitals'}
        </button>
      </div>

      {/* ── RIGHT: Results Panel ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Empty state */}
        {!result && !loading && (
          <div className="glass" style={{ padding: 60, textAlign: 'center' }}>
            <Zap size={36} color="#3b82f6" style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ color: '#6b7585', fontSize: 14 }}>Results will appear here after prediction</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="glass" style={{ padding: 60, textAlign: 'center' }}>
            <div style={{ width: 40, height: 40, border: '3px solid rgba(59,130,246,0.2)', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ color: '#6b7585', fontSize: 14 }}>Running deep learning model...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {result && (
          <>
            {/* ── Tab Switcher ── */}
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'result', label: '🎯 Result', },
                { id: 'accuracy', label: '📊 Model Accuracy', },
                { id: 'graphs', label: '📈 Confidence Graph', },
                { id: 'map', label: '🗺 Hospital Map', },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1,
                  padding: '8px 4px',
                  borderRadius: 8,
                  border: `1px solid ${activeTab === tab.id ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: activeTab === tab.id ? '#3b82f6' : '#6b7585',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── TAB: Result ── */}
            {activeTab === 'result' && (
              <>
                {/* Severity Badge */}
                <div className="glass" style={{ padding: 28 }}>
                  <div style={{ fontSize: 12, color: '#6b7585', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Accident Severity
                  </div>
                  {(() => {
                    const s = severityStyles[result.severity] || severityStyles.Moderate
                    return (
                      <div style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 32, color: s.color }}>
                          {result.severity}
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: s.color, opacity: 0.7, marginBottom: 2 }}>
                            Model: {result.model_used}
                          </div>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: s.color, opacity: 0.7 }}>
                            Accuracy: {metrics.accuracy}%
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>

                {/* Hospitals */}
                <div className="glass" style={{ padding: 24 }}>
                  <h2 style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={15} color="#3b82f6" /> Recommended Hospitals
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.top_hospitals?.map((item, idx) => (
                      <div key={idx} style={{
                        background: idx === 0 ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${idx === 0 ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: 10, padding: '12px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 3 }}>
                            {idx === 0 && <span style={{ color: '#3b82f6', marginRight: 6, fontSize: 12 }}>★ BEST</span>}
                            {item.hospital.name}
                          </div>
                          <div style={{ color: '#6b7585', fontSize: 12 }}>
                            {item.hospital.specialty} · {item.hospital.beds} beds · {item.hospital.phone}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'JetBrains Mono', fontSize: 13, color: '#00d97e' }}>{item.distance_km} km</div>
                          <div style={{ color: '#6b7585', fontSize: 11 }}>Score: {item.score}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* ── TAB: Model Accuracy ── */}
            {activeTab === 'accuracy' && (
              <div className="glass" style={{ padding: 24 }}>
                <h2 style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Award size={15} color="#3b82f6" /> Model Performance Metrics
                </h2>

                {/* Current model highlight */}
                <div style={{ background: `${metrics.color}12`, border: `1px solid ${metrics.color}30`, borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#6b7585', marginBottom: 6 }}>Currently used model</div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, color: metrics.color, marginBottom: 12 }}>
                    {metrics.name}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Accuracy', val: metrics.accuracy },
                      { label: 'Precision', val: metrics.precision },
                      { label: 'Recall', val: metrics.recall },
                      { label: 'F1 Score', val: metrics.f1 },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 6px' }}>
                        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 20, color: metrics.color }}>{m.val}%</div>
                        <div style={{ fontSize: 11, color: '#6b7585', marginTop: 2 }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All models comparison */}
                <div style={{ fontSize: 12, color: '#6b7585', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  All Models Comparison
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(MODEL_METRICS).map(([key, m]) => (
                    <div key={key} style={{
                      background: key === form.model_choice ? `${m.color}10` : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${key === form.model_choice ? `${m.color}30` : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 10, padding: '10px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 500, fontSize: 13, color: key === form.model_choice ? m.color : '#e8eaf0' }}>
                          {key === form.model_choice && '★ '}{m.name}
                        </span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: m.color }}>{m.accuracy}%</span>
                      </div>
                      {/* Accuracy bar */}
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${m.accuracy}%`, background: m.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                        {['precision', 'recall', 'f1'].map(k => (
                          <span key={k} style={{ fontSize: 11, color: '#6b7585' }}>
                            {k.charAt(0).toUpperCase() + k.slice(1)}: <span style={{ color: '#aaa' }}>{m[k]}%</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: Confidence Graph ── */}
            {activeTab === 'graphs' && (
              <div className="glass" style={{ padding: 24 }}>
                <h2 style={{ fontFamily: 'Syne', fontWeight: 600, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BarChart2 size={15} color="#3b82f6" /> Prediction Confidence
                </h2>

                {/* Bar chart */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 12, color: '#6b7585', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Confidence per severity class
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, padding: '0 8px' }}>
                    {SEVERITY_LABELS.map((label, i) => {
                      const pct = result.confidence?.[i] || 0
                      const isMax = pct === Math.max(...(result.confidence || []))
                      return (
                        <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 13, color: SEVERITY_COLORS[i] }}>
                            {typeof pct === 'number' ? pct.toFixed(1) : pct}%
                          </div>
                          <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: 110 }}>
                            <div style={{
                              width: '70%',
                              height: `${Math.max(4, pct)}%`,
                              background: SEVERITY_COLORS[i],
                              borderRadius: '6px 6px 0 0',
                              opacity: isMax ? 1 : 0.45,
                              transition: 'height 0.8s ease',
                              boxShadow: isMax ? `0 0 16px ${SEVERITY_COLORS[i]}60` : 'none',
                              minHeight: 4,
                            }} />
                          </div>
                          <div style={{ fontSize: 12, color: isMax ? SEVERITY_COLORS[i] : '#6b7585', fontWeight: isMax ? 600 : 400 }}>
                            {label}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Horizontal confidence bars */}
                <div style={{ fontSize: 12, color: '#6b7585', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Detailed breakdown
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {SEVERITY_LABELS.map((label, i) => {
                    const pct = result.confidence?.[i] || 0
                    const isMax = pct === Math.max(...(result.confidence || []))
                    return (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                          <span style={{ color: isMax ? SEVERITY_COLORS[i] : '#e8eaf0', fontWeight: isMax ? 600 : 400 }}>
                            {isMax ? '▶ ' : ''}{label}
                          </span>
                          <span style={{ fontFamily: 'JetBrains Mono', color: SEVERITY_COLORS[i], fontWeight: 600 }}>
                            {typeof pct === 'number' ? pct.toFixed(1) : pct}%
                          </span>
                        </div>
                        <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: SEVERITY_COLORS[i],
                            borderRadius: 99,
                            opacity: isMax ? 1 : 0.5,
                            transition: 'width 0.8s ease',
                            boxShadow: isMax ? `0 0 8px ${SEVERITY_COLORS[i]}80` : 'none',
                          }} />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Model metrics mini bar chart */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <div style={{ fontSize: 12, color: '#6b7585', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {metrics.name} — per-metric accuracy
                  </div>
                  {[
                    { label: 'Accuracy', val: metrics.accuracy, color: '#3b82f6' },
                    { label: 'Precision', val: metrics.precision, color: '#00d97e' },
                    { label: 'Recall', val: metrics.recall, color: '#ffb800' },
                    { label: 'F1 Score', val: metrics.f1, color: '#a855f7' },
                  ].map(m => (
                    <div key={m.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: '#aaa' }}>{m.label}</span>
                        <span style={{ fontFamily: 'JetBrains Mono', color: m.color }}>{m.val}%</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${m.val}%`, background: m.color, borderRadius: 99, transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── TAB: Map ── */}
            {activeTab === 'map' && (
              <ResultMap
                center={[location.lat, location.lon]}
                hospitals={result.top_hospitals || []}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}

const labelStyle = {
  fontSize: 11, color: '#6b7585',
  display: 'flex', alignItems: 'center', gap: 5,
  marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
}
