# Security Guidelines — ecommerce-web

These rules are derived from a real security audit of this codebase.
**Every AI assistant working on this project MUST follow these rules.**

---

## 1. SECRETS & CREDENTIALS — Never hardcode, never commit

### FORBIDDEN patterns
```js
// ❌ NEVER — hardcoded credentials in source code
const supabaseUrl = 'https://abc123.supabase.co'
const supabaseKey = 'sb_publishable_abc123...'
const MP_TOKEN = 'TEST-2774624...'
```

```js
// ❌ NEVER — fallback to a default value if env var is missing (fail-open)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'
```

### REQUIRED patterns
```js
// ✅ ALWAYS — fail hard if env vars are missing (fail-secure)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
}
```

### Rules
- All secrets go in `.env` or `.env.local` — both must be in `.gitignore`
- NEVER commit `.env`, `.env.local`, or any file containing real tokens
- If a secret is accidentally committed: rotate it immediately, then clean git history
- Supabase anon key and URL are public by design, but must still come from env vars
- Mercado Pago tokens (even TEST) are real credentials — never in source code

---

## 2. CORS — Always restrict to known origin

### FORBIDDEN
```ts
// ❌ NEVER — allows any domain to call your edge functions
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
}
```

### REQUIRED
```ts
// ✅ ALWAYS — restrict to the configured site URL
const ALLOWED_ORIGIN = Deno.env.get('SITE_URL')
if (!ALLOWED_ORIGIN) {
  return new Response(JSON.stringify({ error: 'SITE_URL not configured' }), { status: 500 })
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
}
```

### Rules
- Every Supabase edge function must read its allowed origin from `Deno.env.get('SITE_URL')`
- If `SITE_URL` is undefined, return HTTP 500 — do NOT fall back to `localhost`
- Never use `'*'` as the CORS origin in any production-reachable function

---

## 3. ENVIRONMENT VARIABLES IN EDGE FUNCTIONS — Fail-secure

### FORBIDDEN
```ts
// ❌ NEVER — silent fallback to localhost
const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
const allowedOrigin = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
```

### REQUIRED
```ts
// ✅ ALWAYS — crash loudly if critical config is missing
const siteUrl = Deno.env.get('SITE_URL')
if (!siteUrl) {
  return new Response(JSON.stringify({ error: 'SITE_URL environment variable not set' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  })
}
```

---

## 4. AUTHENTICATION — Always validate on the server

### FORBIDDEN
```js
// ❌ NEVER — storing permissions in client storage and trusting them
sessionStorage.setItem('app_user_permissions', JSON.stringify(permissions))
const permissions = JSON.parse(sessionStorage.getItem('app_user_permissions') || '[]')

// ❌ NEVER — checking auth by just verifying a key exists in sessionStorage
const appUserId = sessionStorage.getItem('app_user_id')
if (!appUserId) redirect('/login') // anyone can set this key in DevTools
```

### REQUIRED
```js
// ✅ ALWAYS — fetch permissions from the server on every session init
const appUserId = sessionStorage.getItem('app_user_id')
if (!appUserId) { redirect('/login'); return }

const { data, error } = await supabase.rpc('get_app_user_permissions', { p_user_id: appUserId })
if (error || !Array.isArray(data)) {
  sessionStorage.clear()
  redirect('/login')
  return
}
setPermissions(data)
```

### Rules
- Permissions and roles must always be fetched from the database, never from `localStorage` or `sessionStorage`
- `sessionStorage` can only store an identifier (user ID) — never trust data stored there without server validation
- `ProtectedRoute` must validate the stored ID against the database via RPC, not just check for key presence

---

## 5. PASSWORD HANDLING — Use bcrypt, never plaintext

### FORBIDDEN
```js
// ❌ NEVER — comparing passwords as plaintext
if (data.password_hash !== formData.password) throw new Error('Wrong password')

// ❌ NEVER — storing plaintext passwords
await supabase.from('users').insert({ username, password: formData.password })
```

### REQUIRED
```sql
-- ✅ ALWAYS — hash passwords with bcrypt in the database
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Store: crypt(plaintext_password, gen_salt('bf', 10))
-- Verify via SECURITY DEFINER RPC:
CREATE OR REPLACE FUNCTION public.verify_user_password(p_email TEXT, p_password TEXT)
RETURNS TABLE (id UUID, username TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.username FROM public.users u
  WHERE u.email = lower(trim(p_email))
    AND u.password = crypt(p_password, u.password);
END;
$$;
```

```js
// ✅ ALWAYS — call the RPC, never read the hash column directly
const { data, error } = await supabase.rpc('verify_user_password', {
  p_email: formData.email,
  p_password: formData.password
})
if (error || !data || data.length === 0) throw new Error('Email o contraseña incorrectos')
```

### Rules
- All passwords must be hashed with bcrypt (`gen_salt('bf', 10)`) via pgcrypto
- Password verification must happen inside a `SECURITY DEFINER` RPC — the hash must never reach the client
- Minimum password length: **12 characters** for admin users
- Error messages must be generic: "Email o contraseña incorrectos" — never reveal which field is wrong

---

## 6. ROW LEVEL SECURITY (RLS) — Every table must have it

### FORBIDDEN
```sql
-- ❌ NEVER — table without RLS (any authenticated user can read/write everything)
CREATE TABLE app_users (
  id uuid primary key,
  username text,
  password text
);
-- (no ALTER TABLE ... ENABLE ROW LEVEL SECURITY)

-- ❌ NEVER — overly permissive policy (any authenticated user can write)
CREATE POLICY "insert" ON products FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
```

### REQUIRED
```sql
-- ✅ ALWAYS — enable RLS on every table
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- ✅ ALWAYS — restrict writes to admin role, not just 'authenticated'
CREATE POLICY "Admins can insert products" ON products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ✅ For sensitive tables (credentials, permissions): only SECURITY DEFINER RPCs can access
-- No SELECT/INSERT/UPDATE policies for regular users
```

### Rules
- Every new table must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in its migration
- Write operations (INSERT, UPDATE, DELETE) on business data must check `profiles.role = 'admin'`
- Tables with credentials or sensitive data must only be accessible via `SECURITY DEFINER` functions
- Public read policies (`USING (true)`) are only acceptable for catalog data (products, categories)

---

## 7. GIT HYGIENE — What must never be committed

The following files must always be in `.gitignore`:
```
.env
.env.local
.env.*.local
*.pem
*.key
```

If a secret is accidentally committed:
1. Rotate the secret immediately (Supabase dashboard / Mercado Pago panel)
2. Remove from git history: `npx bfg --delete-files .env` or `git filter-branch`
3. Force push the cleaned history
4. Notify all collaborators to re-clone

---

## 8. QUICK CHECKLIST — Before writing any new feature

Before writing any new auth, config, or database code, verify:

- [ ] No secrets hardcoded in source files
- [ ] No `|| 'fallback'` or `?? 'fallback'` for critical config — throw instead
- [ ] No `Access-Control-Allow-Origin: '*'` in edge functions
- [ ] New tables have `ENABLE ROW LEVEL SECURITY` in migration
- [ ] Write policies check admin role, not just `auth.role() = 'authenticated'`
- [ ] Passwords stored as bcrypt hash, verified via SECURITY DEFINER RPC
- [ ] Auth state validated server-side, not trusted from sessionStorage/localStorage
- [ ] Minimum password length is 12 characters for privileged accounts

---

## Summary Table

| Vulnerability | Forbidden Pattern | Required Pattern |
|---|---|---|
| Secrets in code | `const key = 'abc123'` | `const key = env.KEY; if (!key) throw` |
| Fail-open config | `env.VAR \|\| 'default'` | `env.VAR ?? throw new Error(...)` |
| Open CORS | `Allow-Origin: '*'` | `Allow-Origin: Deno.env.get('SITE_URL')` |
| Client-side auth | `sessionStorage.getItem('permissions')` | `supabase.rpc('get_permissions')` |
| Plaintext password | `db.password === form.password` | `supabase.rpc('verify_password', ...)` |
| Missing RLS | Table with no policies | `ENABLE ROW LEVEL SECURITY` + admin policies |
| Weak write policy | `auth.role() = 'authenticated'` | `profiles.role = 'admin'` |
| Weak passwords | `minLength={6}` | `minLength={12}` |
