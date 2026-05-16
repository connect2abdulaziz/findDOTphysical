import { useState, useEffect } from 'react'
import { getAllExaminers, addExaminer, updateExaminer, deleteExaminer } from '../lib/supabase'

// Simple hardcoded password (store in env var for real security)
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'dotadmin2024'

const BLANK = {
  name: '', clinic_type: '', city: '', state: 'OK', address: '',
  phone: '', email: '', price: '', wait_time: '', hours: '',
  badges: [], accepts: [], rating: '', review_count: 0,
  tier: 'free', verified: false, active: true,
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState('')
  const [examiners, setExaminers] = useState([])
  const [editing, setEditing] = useState(null) // examiner object or null (new)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function login() {
    if (pw === ADMIN_PASSWORD) setAuthed(true)
    else alert('Wrong password')
  }

  useEffect(() => {
    if (authed) load()
  }, [authed])

  async function load() {
    try {
      const data = await getAllExaminers(pw)
      setExaminers(Array.isArray(data) ? data : [])
    } catch (err) {
      setMsg('Load error: ' + err.message)
    }
  }

  async function quickUpdate(id, updates) {
    try {
      await updateExaminer(pw, id, updates)
      await load()
    } catch (err) {
      setMsg('❌ Update error: ' + err.message)
      await load()
    }
  }

  function openNew() { setEditing({ ...BLANK }); setFormOpen(true) }
  function openEdit(ex) { setEditing({ ...ex }); setFormOpen(true) }
  function closeForm() { setEditing(null); setFormOpen(false) }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    try {
      const payload = {
        ...editing,
        rating: editing.rating ? parseFloat(editing.rating) : null,
        review_count: parseInt(editing.review_count) || 0,
        badges: typeof editing.badges === 'string'
          ? editing.badges.split(',').map((s) => s.trim()).filter(Boolean)
          : editing.badges,
        accepts: typeof editing.accepts === 'string'
          ? editing.accepts.split(',').map((s) => s.trim()).filter(Boolean)
          : editing.accepts,
      }

      if (editing.id) {
        await updateExaminer(pw, editing.id, payload)
        setMsg('✅ Examiner updated.')
      } else {
        delete payload.id
        await addExaminer(pw, payload)
        setMsg('✅ Examiner added.')
      }

      await load()
      closeForm()
    } catch (err) {
      setMsg('❌ Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    try {
      await deleteExaminer(pw, id)
      setMsg(`✅ Deleted ${name}.`)
      await load()
    } catch (err) {
      setMsg('❌ Delete error: ' + err.message)
    }
  }

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="admin-login">
        <h1>Admin Login</h1>
        <input
          type="password"
          placeholder="Password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && login()}
        />
        <button onClick={login} className="btn btn--call">Login</button>
      </div>
    )
  }

  // ── Main admin panel ──────────────────────────────────────────────────────
  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>Admin Panel</h1>
        <button className="btn btn--call" onClick={openNew}>+ Add Examiner</button>
      </div>

      {msg && <p className="admin-msg">{msg}</p>}

      <table className="admin-table">
        <thead>
          <tr>
            <th>Name</th><th>City</th><th>Tier</th><th>Active</th><th>Verified</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {examiners.map((ex) => (
            <tr key={ex.id}>
              <td>{ex.name}</td>
              <td>{ex.city}</td>
              <td>
                <select
                  value={ex.tier}
                  onChange={(e) => quickUpdate(ex.id, { tier: e.target.value })}
                  className="tier-select"
                >
                  <option value="free">Free</option>
                  <option value="featured">Featured</option>
                  <option value="premium">Premium</option>
                </select>
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={ex.active}
                  onChange={(e) => quickUpdate(ex.id, { active: e.target.checked })}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={ex.verified}
                  onChange={(e) => quickUpdate(ex.id, { verified: e.target.checked })}
                />
              </td>
              <td>
                <button className="admin-btn" onClick={() => openEdit(ex)}>Edit</button>
                <button className="admin-btn admin-btn--danger" onClick={() => handleDelete(ex.id, ex.name)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Edit / Add Form ── */}
      {formOpen && editing && (
        <div className="modal-overlay" onClick={closeForm}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
            <h2>{editing.id ? 'Edit Examiner' : 'Add Examiner'}</h2>

            <div className="form-grid">
              <Field label="Name *" required value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Clinic Type" value={editing.clinic_type} onChange={(v) => setEditing({ ...editing, clinic_type: v })} />
              <Field label="City" value={editing.city} onChange={(v) => setEditing({ ...editing, city: v })} />
              <Field label="Address" value={editing.address} onChange={(v) => setEditing({ ...editing, address: v })} />
              <Field label="Phone" value={editing.phone} onChange={(v) => setEditing({ ...editing, phone: v })} />
              <Field label="Email" type="email" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} />
              <Field label="Price" value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} />
              <Field label="Wait Time" value={editing.wait_time} onChange={(v) => setEditing({ ...editing, wait_time: v })} />
              <Field label="Hours" value={editing.hours} onChange={(v) => setEditing({ ...editing, hours: v })} />
              <Field label="Rating" type="number" step="0.1" min="1" max="5" value={editing.rating} onChange={(v) => setEditing({ ...editing, rating: v })} />
              <Field label="Review Count" type="number" value={editing.review_count} onChange={(v) => setEditing({ ...editing, review_count: v })} />
              <Field label="Badges (comma-separated)" value={Array.isArray(editing.badges) ? editing.badges.join(', ') : editing.badges} onChange={(v) => setEditing({ ...editing, badges: v })} />
              <Field label="Accepts (comma-separated)" value={Array.isArray(editing.accepts) ? editing.accepts.join(', ') : editing.accepts} onChange={(v) => setEditing({ ...editing, accepts: v })} />

              <label className="form-label">
                Tier
                <select
                  className="form-input"
                  value={editing.tier}
                  onChange={(e) => setEditing({ ...editing, tier: e.target.value })}
                >
                  <option value="free">Free</option>
                  <option value="featured">Featured</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
            </div>

            <div className="form-checks">
              <label><input type="checkbox" checked={editing.verified} onChange={(e) => setEditing({ ...editing, verified: e.target.checked })} /> FMCSA Verified</label>
              <label><input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn--call" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', ...rest }) {
  return (
    <label className="form-label">
      {label}
      <input
        className="form-input"
        type={type}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </label>
  )
}
