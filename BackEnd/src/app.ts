import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import { errorHandler, notFoundHandler, requestLogger } from './middlewares/app.middleware'

// Routes
import authRoute from './routes/auth.route'
import propertiesRoute from './routes/properties.route'
import tenantsRoute from './routes/tenants.route'
import transactionsRoute from './routes/transactions.route'
import storageRoute from './routes/storage.route'
import { SUPABASE_SCHEMA, STORAGE_BUCKET } from './config/supabase'

const app = new Hono()

// Global Middlewares
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))
app.use('*', logger())
app.use('*', requestLogger)
app.use('*', prettyJSON())

// Health & Info Endpoint
app.get('/', (c) => {
  return c.json({
    app: 'Kontrakan Backend API',
    version: '1.0.0',
    status: 'online',
    runtime: 'Bun & Hono TypeScript',
    schema: SUPABASE_SCHEMA,
    storageBucket: STORAGE_BUCKET,
    endpoints: {
      auth: '/api/auth',
      properties: '/api/properties',
      tenants: '/api/tenants',
      transactions: '/api/transactions',
      storage: '/api/storage',
    },
  })
})

// Mount API routes
app.route('/api/auth', authRoute)
app.route('/api/properties', propertiesRoute)
app.route('/api/tenants', tenantsRoute)
app.route('/api/transactions', transactionsRoute)
app.route('/api/storage', storageRoute)

// Global 404 & Error Handlers
app.notFound(notFoundHandler)
app.onError(errorHandler)

const port = Number(process.env.PORT) || 3000

export default {
  port,
  fetch: app.fetch,
}
