import { Hono } from 'hono'
import { supabase } from '../config/supabase'
import { validateBody, validateQuery } from '../middlewares/validate.middleware'
import {
  createPropertySchema,
  updatePropertySchema,
  queryPropertySchema,
} from '../validators/property.validator'

const propertiesRoute = new Hono()

// 1. GET ALL Properties (dengan pagination & search)
propertiesRoute.get('/', validateQuery(queryPropertySchema), async (c) => {
  const queryParams = c.req.valid('query') as any
  const status = queryParams.status
  const search = queryParams.search
  const page = queryParams.page || 1
  const limit = queryParams.limit || 50
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('properties')
    .select('*, tenants(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.ilike('unit_name', `%${search}%`)
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

// 2. GET Single Property by ID (termasuk relasi tenants)
propertiesRoute.get('/:id', async (c) => {
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('properties')
    .select('*, tenants(*)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Property tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    data,
  })
})

// 3. POST Create New Property
propertiesRoute.post('/', validateBody(createPropertySchema), async (c) => {
  const body = c.req.valid('json')

  const { data, error } = await supabase
    .from('properties')
    .insert([body])
    .select()
    .single()

  if (error) {
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json(
    {
      success: true,
      message: 'Property berhasil ditambahkan',
      data,
    },
    201
  )
})

// 4. PUT Update Property by ID
propertiesRoute.put('/:id', validateBody(updatePropertySchema), async (c) => {
  const id = c.req.param('id')
  const body = c.req.valid('json')

  if (Object.keys(body).length === 0) {
    return c.json({ success: false, message: 'Tidak ada data untuk diperbarui' }, 400)
  }

  const { data, error } = await supabase
    .from('properties')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Property tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    message: 'Property berhasil diperbarui',
    data,
  })
})

// 5. DELETE Property by ID
propertiesRoute.delete('/:id', async (c) => {
  const id = c.req.param('id')

  const { data, error } = await supabase
    .from('properties')
    .delete()
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return c.json({ success: false, message: 'Property tidak ditemukan' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }

  return c.json({
    success: true,
    message: 'Property berhasil dihapus',
    data,
  })
})

export default propertiesRoute
