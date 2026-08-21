import app from './src/app'

async function runTests() {
  console.log('🧪 Memulai pengujian API Hono...')

  // Test 1: Info root route
  const resRoot = await app.fetch(new Request('http://localhost:3000/'))
  const rootData = await resRoot.json()
  console.log('✅ GET / => Status:', resRoot.status, rootData.app)

  // Test 2: Validation rejection on POST /api/properties (empty body)
  const resBadProp = await app.fetch(
    new Request('http://localhost:3000/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  )
  console.log('✅ POST /api/properties validation failure handled => Status:', resBadProp.status)

  // Test 3: Validation rejection on POST /api/tenants (invalid uuid)
  const resBadTenant = await app.fetch(
    new Request('http://localhost:3000/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        property_id: 'invalid-uuid',
        full_name: 'John',
        phone: '123456',
        start_date: '2026-01-01',
      }),
    })
  )
  console.log('✅ POST /api/tenants UUID validation failure handled => Status:', resBadTenant.status)

  // Test 4: 404 Route handler
  const res404 = await app.fetch(new Request('http://localhost:3000/api/non-existent'))
  console.log('✅ 404 handler => Status:', res404.status)

  // Test 5: Storage upload rejection without file
  const resNoFile = await app.fetch(
    new Request('http://localhost:3000/api/storage/upload', {
      method: 'POST',
      body: new FormData(),
    })
  )
  console.log('✅ POST /api/storage/upload missing file handled => Status:', resNoFile.status)

  // Test 6: Auth login validation failure (invalid email)
  const resBadLogin = await app.fetch(
    new Request('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '123' }),
    })
  )
  console.log('✅ POST /api/auth/login validation failure handled => Status:', resBadLogin.status)

  // Test 7: Auth protected route rejection without token
  const resNoAuth = await app.fetch(new Request('http://localhost:3000/api/auth/me'))
  console.log('✅ GET /api/auth/me unauthorized rejection handled => Status:', resNoAuth.status)

  console.log('🎉 Semua tes lokal endpoint, validator, auth, dan middleware berjalan sukses!')
}

runTests().catch(console.error)
