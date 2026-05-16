import { createClient } from '@supabase/supabase-js'

// ─── Replace with your real Supabase credentials ───────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
// ────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ─── Examiner Queries ────────────────────────────────────────────────────────

/** Fetch all active examiners, premium first */
export async function getExaminers({ city, search, walkIns, openWeekends } = {}) {
  let query = supabase
    .from('examiners')
    .select('*')
    .eq('active', true)
    .order('tier', { ascending: false }) // premium > featured > free

  if (city) query = query.ilike('city', city)
  if (walkIns) query = query.contains('badges', ['Walk-ins Welcome'])
  if (openWeekends) query = query.contains('badges', ['Open Weekends'])
  if (search) {
    query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,clinic_type.ilike.%${search}%`)
  }

  const { data, error } = await query
  if (error) throw error

  // Sort: premium → featured → free (Supabase text sort isn't perfect for this)
  const tierOrder = { premium: 0, featured: 1, free: 2 }
  return (data || []).sort((a, b) => (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3))
}

// ─── Admin API (service role server-side — bypasses RLS) ─────────────────────

async function adminRequest(adminPassword, method, { body, id } = {}) {
  const url = id ? `/api/admin-examiners?id=${encodeURIComponent(id)}` : '/api/admin-examiners'
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': adminPassword,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    throw new Error(
      'Admin API not reachable. Restart with `npm run dev` and ensure SUPABASE_SERVICE_ROLE_KEY is in .env'
    )
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`)

  if (method === 'GET' && !Array.isArray(data)) {
    throw new Error('Admin API returned invalid data')
  }

  return data
}

/** Fetch all examiners (admin) */
export async function getAllExaminers(adminPassword) {
  const data = await adminRequest(adminPassword, 'GET')
  return Array.isArray(data) ? data : []
}

/** Add a new examiner */
export async function addExaminer(adminPassword, examiner) {
  return adminRequest(adminPassword, 'POST', { body: examiner })
}

/** Update an examiner */
export async function updateExaminer(adminPassword, id, updates) {
  return adminRequest(adminPassword, 'PATCH', { body: { id, ...updates } })
}

/** Delete an examiner */
export async function deleteExaminer(adminPassword, id) {
  await adminRequest(adminPassword, 'DELETE', { id })
}
