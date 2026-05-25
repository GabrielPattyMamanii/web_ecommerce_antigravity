# Problema: ResetPassword queda bloqueado en "Verificando enlace de recuperación..."

**Fecha:** 2026-03-07  
**Archivo afectado:** `src/App.jsx` + `src/pages/auth/ResetPassword.jsx`  
**Severidad:** 🔴 CRÍTICO — El flujo de recuperación de contraseña está completamente bloqueado

---

## Síntoma observado

Al hacer clic en el enlace del correo de recuperación, el usuario llega a
`localhost:5174/reset-password` y ve el spinner "Verificando enlace de recuperación..."
indefinidamente. Nunca aparece el formulario para escribir la nueva contraseña.

---

## Causa Raíz: Race Condition entre `AuthRedirectHandler` y Supabase

### El token viaja en el HASH del URL

Supabase (implicit flow) envía al usuario a:
```
http://localhost:5174/reset-password#access_token=XXXXX&type=recovery
```

El token `access_token` viaja en el fragmento `#hash` del URL.
Supabase JS SDK lee ese hash para intercambiarlo por una sesión activa.

### El `AuthRedirectHandler` destruye el token antes de que Supabase lo lea

El componente `AuthRedirectHandler` en `App.jsx` (líneas 54-58) hace esto:

```js
// App.jsx - AuthRedirectHandler
if (window.location.hash.includes('type=recovery')) {
    navigate('/reset-password', { replace: true }); // ← LA CAUSA DEL PROBLEMA
    return;
}
```

`navigate('/reset-password', { replace: true })` usa React Router para navegar.
React Router **borra el fragmento `#hash`** de la URL al hacer la navegación.

### Secuencia exacta del fallo

```
Paso 1: URL del email llega → /reset-password#access_token=XXX&type=recovery
Paso 2: AuthRedirectHandler detecta "type=recovery" en el hash
Paso 3: navigate('/reset-password', { replace: true }) → BORRA el hash
Paso 4: URL queda → /reset-password  (sin token)
Paso 5: ResetPassword.jsx monta → useEffect corre
Paso 6: onAuthStateChange() registra listener (demasiado tarde, token ya perdido)
Paso 7: getSession() → devuelve null (Supabase no pudo procesar el hash borrado)
Paso 8: setTimeout(2500ms) programa mostrar la pantalla de "Enlace inválido"
Paso 9: ❌ Pantalla atascada en "Verificando..." hasta que el timeout dispare
         (o indefinidamente si algo interfiere con el setTimeout)
```

### Por qué fue diseñado así (y por qué ahora es un problema)

`AuthRedirectHandler` fue creado para un caso específico: cuando Supabase
redirige al usuario a la raíz `/` en vez de a `/reset-password`.
En ese escenario, el handler detecta el hash en `/` y navega correctamente
a `/reset-password`, pasando el hash... pero con `replace:true` no se pasa el hash.

Ahora que la URL en Supabase está correctamente configurada a
`http://localhost:5174/reset-password`, el usuario llega **directamente** a
`/reset-password` con el hash intacto. El handler ya NO tiene razón de existir
para este caso, pero igual intercepta y borra el token.

---

## Solución Requerida

### Opción A (Recomendada): Arreglar `AuthRedirectHandler` para no operar cuando ya estamos en `/reset-password`

```js
// App.jsx - AuthRedirectHandler corregido
useEffect(() => {
    // Solo actuar si estamos en la raíz o en otro path que NO sea /reset-password
    // Si ya estamos en /reset-password, dejar que el componente maneje su propio flujo
    if (window.location.pathname === '/reset-password') return;

    if (window.location.hash.includes('type=recovery')) {
        navigate('/reset-password', { replace: true });
        return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
            navigate('/reset-password', { replace: true });
        }
    });

    return () => subscription.unsubscribe();
}, [navigate]);
```

### Opción B: Pasar el hash cuando se navega

```js
// Incluir el hash al navegar para que Supabase lo procese
navigate(`/reset-password${window.location.hash}`, { replace: true });
```

### Cambios adicionales en `ResetPassword.jsx`

`ResetPassword.jsx` debe simplificarse. Ya no necesita escuchar `PASSWORD_RECOVERY`
porque con la opción A, cuando llegue a `/reset-password` el hash ya estará intacto
y Supabase lo procesará. Solo necesita verificar la sesión después de dar tiempo
a que Supabase procese el hash:

```js
useEffect(() => {
    // Dar tiempo a Supabase para procesar el hash del URL
    const timer = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            setSessionReady(true);
        } else {
            setTokenError(true);
        }
    }, 800); // 800ms es suficiente para que Supabase procese el hash

    return () => clearTimeout(timer);
}, []);
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `src/App.jsx` | Agregar guard `if (pathname === '/reset-password') return;` en AuthRedirectHandler |
| `src/pages/auth/ResetPassword.jsx` | Simplificar useEffect: eliminar listener de onAuthStateChange, usar polling/delay con getSession() |
