import { Hono } from 'hono'
import { supabase } from '../config/supabase'
import { validateBody, validateQuery } from '../middlewares/validate.middleware'
import {
  createTenantSchema,
  updateTenantSchema,
  queryTenantSchema,
} from '../validators/tenant.validator'
import { invalidateDashboardCache } from './dashboard.route'

const tenantsRoute = new Hono()


// 1. GET ALL Tenants (dengan pagination, search & filter property_id)
tenantsRoute.get('/', validateQuery(queryTenantSchema), async (c) => {
  const queryParams = c.req.valid('query') as any
  const property_id = queryParams.property_id
  const search = queryParams.search
  const page = queryParams.page || 1
  const limit = queryParams.limit || 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('tenants')
    .select('*, properties(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (property_id) {
    query = query.eq('property_id', property_id)
  }

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    data,
    meta: {
      total: count ?? 0,
      page,
      limit,
      totalPages: count ? Math.ceil(count / limit) : 0,
    },
  })
})

// 2. GET Single Tenant by ID (termasuk relasi properties)
tenantsRoute.get('/:id', async (c) => {
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('tenants')
    .select('*, properties(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Tenant tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    data,
  })
})

// 3. POST Create New Tenant
tenantsRoute.post('/', validateBody(createTenantSchema), async (c) => {
  const body = c.req.valid('json')

  // Cek apakah property exists
  const { data: propData, error: propError } = await supabase
    .from('properties')
    .select('id')
    .eq('id', body.property_id)
    .single()

  if (propError || !propData) {
    return c.json({ success: false, message: 'Property dengan property_id tersebut tidak ditemukan' }, 400)
  }

  const { data, error } = await supabase
    .from('tenants')
    .insert([body])
    .select('*, properties(*)')
    .single()

  if (error) {
    return c.json({ success: false, message: error.message }, 500)
  }

  invalidateDashboardCache()

  return c.json(
    {
      success: true,
      message: 'Tenant berhasil ditambahkan',
      data,
    },
    201
  )
})

// 4. PUT Update Tenant by ID
tenantsRoute.put('/:id', validateBody(updateTenantSchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  if (Object.keys(body).length === 0) {
    return c.json({ success: false, message: 'Tidak ada data untuk diperbarui' }, 400)
  }

  if (body.property_id) {
    const { data: propData, error: propError } = await supabase
      .from('properties')
      .select('id')
      .eq('id', body.property_id)
      .single()

    if (propError || !propData) {
      return c.json({ success: false, message: 'Property dengan property_id tersebut tidak ditemukan' }, 400)
    }
  }

  const { data, error } = await supabase
    .from('tenants')
    .update(body)
    .eq('id', id)
    .select('*, properties(*)')
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Tenant tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  invalidateDashboardCache()

  return c.json({
    success: true,
    message: 'Tenant berhasil diperbarui',
    data,
  })
})

// 5. DELETE Tenant by ID
tenantsRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('tenants')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Tenant tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  invalidateDashboardCache()

  return c.json({
    success: true,
    message: 'Tenant berhasil dihapus',
    data,
  })
})

export default tenantsRoute

