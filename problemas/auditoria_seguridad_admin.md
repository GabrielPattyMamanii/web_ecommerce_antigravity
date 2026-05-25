# Auditoría: plan_seguridad_admin.md — Problemas Encontrados

**Fecha:** 2026-03-07  
**Archivo auditado:** `planes-desarrollo/plan_seguridad_admin.md`

---

## Resumen Ejecutivo

| # | Severidad | Archivo | Problema | Estado |
|---|-----------|---------|----------|--------|
| 1 | 🔴 **CRÍTICO** | `App.jsx` + `UserLayout.jsx` | Las rutas `/dashboard/*` no tienen guardia de sesión | Pendiente fix |
| 2 | 🟡 **MEDIO** | `UserLayout.jsx` línea 46 | El logout redirige a `/admin/usuarios` (ruta admin privada) | **Corregido** |
| 3 | 🟡 **MEDIO** | `App.jsx` + `ResetPassword.jsx` | Doble suscripción a `PASSWORD_RECOVERY` puede causar navegación duplicada | Documentado |
| 4 | 🟢 **BAJO** | `useAuth.js` | Race condition: `onAuthStateChange` puede sobreescribir estado antes de `initAuth` | Documentado |

---

## Problemas Detallados

---

### 🔴 PROBLEMA 1 (CRÍTICO): Rutas `/dashboard` sin protección

**Archivo:** `App.jsx` — líneas 179-189  
**Archivo:** `UserLayout.jsx` — no tiene `useAuth` ni verificación de sesión

#### Código actual (vulnerable)
```jsx
{/* User Dashboard Routes - For App Users (Light Auth) */}
<Route path="/dashboard" element={
  <MiMercaderiaProvider>
    <UserLayout />   {/* ← No hay verificación de sesión */}
  </MiMercaderiaProvider>
}>
```

#### Problema
Cualquier persona sin cuenta puede navegar directamente a `/dashboard`, `/dashboard/carga-boletas`, etc. y ver el contenido del panel de usuario. El plan del sistema establece que `/dashboard` es el **área de cliente autenticado**, no pública.

#### Solución requerida
Crear un `UserProtectedRoute` (análogo a `ProtectedRoute`) que verifique que hay sesión activa:

```jsx
// src/components/layout/UserProtectedRoute.jsx
export function UserProtectedRoute() {
    const { session, loading } = useAuth();
    if (loading) return <LoadingScreen />;
    if (!session) return <Navigate to="/login" replace />;
    return (
        <MiMercaderiaProvider>
            <UserLayout />
        </MiMercaderiaProvider>
    );
}
```

Y en `App.jsx`:
```diff
- <Route path="/dashboard" element={
-   <MiMercaderiaProvider>
-     <UserLayout />
-   </MiMercaderiaProvider>
- }>
+ <Route path="/dashboard" element={<UserProtectedRoute />}>
```

---

### 🟡 PROBLEMA 2 (MEDIO): Logout de UserLayout redirige a ruta de admin

**Archivo:** `UserLayout.jsx` — línea 46  
**Estado: CORREGIDO automáticamente** en la sesión anterior

```diff
- navigate('/admin/usuarios'); // ← Ruta del panel admin (requiere rol admin)
+ navigate('/login');          // ← Portal unificado correcto
```

> **Nota:** Aunque `handleLogout` existe en el código, el botón de logout está comentado en el JSX (línea 106: `{/* Logout button removed as per user request */}`). Sin embargo, la función incorrecta permanece en el código y podría ser llamada accidentalmente.

---

### 🟡 PROBLEMA 3 (MEDIO): Doble suscripción a `PASSWORD_RECOVERY`

**Archivos:** `App.jsx` (líneas 62-66) y `ResetPassword.jsx` (líneas 23-31)

#### Descripción
Cuando Supabase dispara el evento `PASSWORD_RECOVERY`:

1. **`AuthRedirectHandler` en `App.jsx`** → navega a `/reset-password`  
2. **`ResetPassword.jsx`** (que ya está en `/reset-password`) → también escucha `PASSWORD_RECOVERY` y pone `setSessionReady(true)`

El problema ocurre si el usuario ya está en `/reset-password` cuando el evento llega: el `AuthRedirectHandler` intenta navegar a `/reset-password` de nuevo (aunque ya está ahí), lo cual es inofensivo en teoría pero puede causar un re-mount del componente y reiniciar el estado.

#### Solución recomendada
En `ResetPassword.jsx`, en lugar de escuchar `PASSWORD_RECOVERY` vía el listener, confiar en `getSession()` que `AuthRedirectHandler` ya garantizó que habrá una sesión activa al llegar a `/reset-password`:

```jsx
// ResetPassword.jsx — useEffect simplificado
useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setSessionReady(true);
        } else {
            setTimeout(() => setTokenError(true), 1500);
        }
    });
}, []);
```

---

### 🟢 PROBLEMA 4 (BAJO): Race condition en `useAuth.js`

**Archivo:** `hooks/useAuth.js` — líneas 19-36

#### Descripción
El hook lanza `initAuth()` y también registra `onAuthStateChange` en el mismo `useEffect`. Si Supabase dispara `onAuthStateChange` antes de que `initAuth` complete su `await`, ambas funciones ejecutan en paralelo y actualizan el estado de forma descoordinada.

```js
initAuth();  // ← async, no esperado
// onAuthStateChange puede disparar ANTES de que initAuth() termine
const { data: { subscription } } = supabase.auth.onAuthStateChange(...)
```

#### Impacto real
En la práctica, este bug puede causar que `loading` se ponga en `false` demasiado temprano (por el listener) antes de que `initAuth` haya actualizado `role`, resultando en que `ProtectedRoute` momentáneamente muestre la pantalla de "sin permiso" antes de redirigir correctamente.

#### Solución recomendada
```js
useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setRole(await fetchUserRole(session?.user?.id));
        setLoading(false);
    });

    // initAuth solo resuelve la sesión inicial sin setLoading
    supabase.auth.getSession().then(({ data: { session } }) => {
        // onAuthStateChange también disparará INITIAL_SESSION, así que
        // esto es un fallback por si el evento no llega.
    });

    return () => { mounted = false; subscription.unsubscribe(); };
}, []);
```

---

## Checklist del Plan vs Implementación

| Paso del Plan | Estado |
|---|---|
| ✅ Portal unificado `/login` (antes `/admin/login`) | **Implementado** |
| ✅ Dispatcher de roles en `Login.jsx` | **Implementado** |
| ✅ `ProtectedRoute` verifica `isAdmin` | **Implementado** |
| ✅ `useAuth.js` expone `role` e `isAdmin` | **Implementado** |
| ✅ Fase 1: Modal "Olvidé contraseña" en `Login.jsx` | **Implementado** |
| ✅ Fase 2: `ResetPassword.jsx` con redirect a `/login` | **Implementado** |
| ✅ `rls_policies.sql` preparado para Supabase | **Documentado (pendiente ejecutar en Supabase)** |
| ❌ Rutas `/dashboard` sin guardia de sesión | **FALTANTE** |
| ⚠️ Doble listener `PASSWORD_RECOVERY` | **Subóptimo** |
| ⚠️ Race condition en `useAuth` | **Bajo riesgo, mejorable** |

---

## Nota sobre RLS (Paso C del Plan)

El archivo `rls_policies.sql` está correctamente escrito y listo para ejecutar. **Sin embargo, es un archivo SQL que debe ejecutarse manualmente en el Supabase Dashboard → SQL Editor.** No se puede verificar desde el frontend si las políticas ya fueron aplicadas. Se recomienda confirmar en Supabase si RLS está activo en las tablas críticas.
