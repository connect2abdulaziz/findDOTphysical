import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL must be set in .env')
  }
  return createClient(url, key)
}

function isAuthorized(headers) {
  const pw = headers['x-admin-password']
  const expected = process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD
  return expected && pw === expected
}

/** @returns {{ status: number, body?: unknown }} */
export async function handleAdminExaminers({ method, headers, query = {}, body = {} }) {
  if (!isAuthorized(headers)) {
    return { status: 401, body: { message: 'Unauthorized' } }
  }

  const supabase = getSupabase()

  if (method === 'GET') {
    const { data, error } = await supabase
      .from('examiners')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return { status: 200, body: data || [] }
  }

  if (method === 'POST') {
    const { data, error } = await supabase.from('examiners').insert([body]).select()
    if (error) throw error
    return { status: 201, body: data[0] }
  }

  if (method === 'PATCH') {
    const { id, ...updates } = body
    if (!id) return { status: 400, body: { message: 'id is required' } }
    const { data, error } = await supabase
      .from('examiners')
      .update(updates)
      .eq('id', id)
      .select()
    if (error) throw error
    if (!data?.length) return { status: 404, body: { message: 'Examiner not found' } }
    return { status: 200, body: data[0] }
  }

  if (method === 'DELETE') {
    const id = query.id || body.id
    if (!id) return { status: 400, body: { message: 'id is required' } }
    const { error } = await supabase.from('examiners').delete().eq('id', id)
    if (error) throw error
    return { status: 204 }
  }

  return { status: 405, body: { message: 'Method not allowed' } }
}
