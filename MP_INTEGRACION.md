# 💳 Integración de Mercado Pago — Documentación Completa

Fecha: Marzo 2026  
Proyecto: ecommerce-web  
Modalidad implementada: **Checkout PRO** (redirect al checkout alojado por MP)

---

## 📐 Arquitectura general

```
Usuario hace clic en "Pagar con Mercado Pago"
        │
        ▼
[Frontend React]
MercadoPagoBrick.jsx  →  useCheckoutPro.js
        │
        │  supabase.functions.invoke("create-mp-preference")
        ▼
[Backend Supabase Edge Function — Deno]
supabase/functions/create-mp-preference/index.ts
        │
        │  POST https://api.mercadopago.com/checkout/preferences
        │  Authorization: Bearer MP_ACCESS_TOKEN  ← 🔐 nunca sale del server
        ▼
[API de Mercado Pago]
Devuelve  { id, init_point, sandbox_init_point }
        │
        ▼
[Frontend]
window.location.href = init_point  →  Cliente paga en el sitio de MP
        │
        ▼
Redirige a back_url (/, éxito / fracaso / pendiente)
```

> **Por qué Edge Function y no llamar a MP directo desde el frontend:**  
> El `Access Token` de MP es una credencial secreta que nunca debe exponerse en el navegador.  
> La Edge Function corre en el servidor de Supabase y es la única que conoce el token.

---

## 🗂️ Archivos involucrados

| Archivo | Responsabilidad |
|---|---|
| `src/components/payment/MercadoPagoBrick.jsx` | Botón de pago visual, maneja estados de carga y error |
| `src/hooks/useCheckoutPro.js` | Hook que invoca la Edge Function y redirige al usuario |
| `src/pages/Checkout.jsx` | Página de checkout, integra el componente y pasa los datos |
| `supabase/functions/create-mp-preference/index.ts` | Edge Function serverless — crea la preferencia en la API de MP |
| `.env` / `.env.local` | Variables de entorno del frontend (Supabase URL y Anon Key) |
| Supabase Secrets (panel web) | `MP_ACCESS_TOKEN` y `SITE_URL` — credenciales del servidor |

---

## 🧩 Paso 1 — Cuenta y credenciales en MercadoPago

### 1.1 Crear / acceder a la cuenta de MP developers

1. Ir a [https://www.mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers)
2. Iniciar sesión con la cuenta de MP de la tienda.
3. Ir a **Tus integraciones → Crear aplicación**.
4. Elegir el tipo **Checkout Pro** y el modelo de integración **Online**.
5. Una vez creada la app, ir a **Credenciales**.

### 1.2 Credenciales disponibles

MP otorga dos pares de credenciales: **TEST** y **PRODUCCIÓN**.

| Credencial | ¿Para qué sirve? | ¿Dónde se usa? |
|---|---|---|
| `Access Token TEST` | Crear preferencias en modo sandbox | Supabase Secret `MP_ACCESS_TOKEN` (pruebas) |
| `Access Token PRODUCCIÓN` | Crear preferencias reales que cobran dinero | Supabase Secret `MP_ACCESS_TOKEN` (producción) |
| `Public Key TEST` | (No usada en Checkout PRO redirect) | — |
| `Public Key PRODUCCIÓN` | (No usada en Checkout PRO redirect) | — |

> ℹ️ En la integración de tipo **Checkout PRO con redirect**, solo se necesita el `Access Token` en el backend. La `Public Key` se usa únicamente en integraciones con JS SDK embebido (Bricks en el DOM), que no es nuestro caso.

---

## 🔐 Paso 2 — Configurar los Secrets en Supabase

Las credenciales del servidor se guardan como **Secrets de Supabase** (equivalente a variables de entorno del backend). Nunca se commitean al repositorio.

### 2.1 Acceder a los secrets

1. Ir al **Dashboard de Supabase** → seleccionar el proyecto.
2. En el menú lateral: **Edge Functions → Secrets** (o `Settings → Edge Functions`).
3. Hacer clic en **New secret**.

### 2.2 Secrets requeridos

| Nombre del secret | Valor (pruebas) | Valor (producción) |
|---|---|---|
| `MP_ACCESS_TOKEN` | `TEST-XXXX...` (token de prueba de MP) | `APP_USR-XXXX...` (token de producción de MP) |
| `SITE_URL` | `http://localhost:5173` o la URL de staging | `https://tu-dominio.com` |

### 2.3 Comandos alternativos vía Supabase CLI

```bash
# Configurar en modo pruebas
supabase secrets set MP_ACCESS_TOKEN=TEST-XXXXXXXXXXXXXXXX
supabase secrets set SITE_URL=http://localhost:5173

# Configurar en modo producción
supabase secrets set MP_ACCESS_TOKEN=APP_USR-XXXXXXXXXXXXXXXX
supabase secrets set SITE_URL=https://tu-dominio.com
```

---

## 🔧 Paso 3 — Variables de entorno del Frontend (`.env`)

El frontend solo necesita las credenciales de Supabase para poder invocar la Edge Function. Estas variables van en el archivo `.env` (o `.env.local`) en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ El `ANON_KEY` es pública por diseño (Supabase la usa junto con Row Level Security). El `MP_ACCESS_TOKEN` **jamás** debe aparecer en el `.env` del frontend ni estar en el código del cliente.

**Dónde obtener estos valores:**  
Dashboard de Supabase → `Settings → API` → `Project URL` y `anon public key`.

---

## 🏗️ Paso 4 — La Edge Function (`create-mp-preference/index.ts`)

Esta función corre en el servidor de Supabase (runtime Deno). Es la pieza central de la integración.

### 4.1 Estructura del archivo

```
supabase/
└── functions/
    └── create-mp-preference/
        └── index.ts        ← La Edge Function
```

### 4.2 Qué hace la función, paso a paso

```typescript
// 1. Lee el Access Token desde los Secrets del servidor
const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
const siteUrl     = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';

// 2. Recibe el carrito del frontend
const { items, deliveryFee, discountAmount, payerEmail } = await req.json();

// 3. Construye el array de ítems en el formato que espera la API de MP
const mpItems = items.map(item => ({
    id:         String(item.id),
    title:      item.name,
    quantity:   item.quantity,
    unit_price: round2(item.price),   // MP exige 2 decimales
    currency_id: 'ARS',
}));

// 4. Agrega el costo de envío como ítem separado (valor positivo)
mpItems.push({ id: 'shipping', title: 'Costo de Envío', ... });

// 5. Agrega el descuento como ítem con unit_price NEGATIVO
mpItems.push({ id: 'discount', title: 'Descuento aplicado', unit_price: -descuento, ... });

// 6. Define las URLs de retorno y el nombre comercial
const preference = {
    items: mpItems,
    back_urls: {
        success: `${siteUrl}/`,
        failure: `${siteUrl}/`,
        pending: `${siteUrl}/`,
    },
    statement_descriptor: 'MI TIENDA',   // ← Nombre que aparece en el resumen de pago
};

// 7. Llama a la API de MP con el Access Token en el header
const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(preference),
});

// 8. Devuelve al frontend el ID de preferencia y las URLs de checkout
return json({
    preferenceId:       mpData.id,
    init_point:         mpData.init_point,         // URL de producción
    sandbox_init_point: mpData.sandbox_init_point, // URL de pruebas
});
```

### 4.3 Diferencia entre `init_point` y `sandbox_init_point`

| URL | Cuándo se usa |
|---|---|
| `sandbox_init_point` | Pruebas — no mueve dinero real, usa tarjetas de prueba de MP |
| `init_point` | **Producción** — cobra dinero real |

> **¿Cuál usamos?** El hook `useCheckoutPro.js` usa `init_point` tanto en pruebas como en producción. La diferencia la controla el `Access Token`: si es un token TEST, `init_point` igual funciona como sandbox. Si es token de producción, cobra dinero real.

### 4.4 Desplegar la Edge Function

Cada vez que se modifica la función, se debe re-deployar:

```bash
# Desde la raíz del proyecto
supabase functions deploy create-mp-preference --no-verify-jwt
```

> La flag `--no-verify-jwt` es necesaria porque el frontend llama a la función con el `anon key` de Supabase (no con un JWT de usuario autenticado). Esto es correcto para un checkout público.

---

## ⚛️ Paso 5 — El Hook de React (`useCheckoutPro.js`)

Este hook encapsula toda la lógica de comunicación con la Edge Function.

```javascript
// src/hooks/useCheckoutPro.js
const { data, error } = await supabase.functions.invoke(
    'create-mp-preference',          // nombre de la Edge Function
    {
        body: { items, deliveryFee, discountAmount, payerEmail },
    }
);

// Si todo ok, redirigir al checkout de MP
window.location.href = data.init_point;
```

**Estados que maneja el hook:**
- `isLoading` → `true` mientras espera la respuesta de la Edge Function
- `error` → mensaje de error si algo falla (se muestra en el componente)
- `checkout()` → función que dispara el proceso de pago

---

## 🎨 Paso 6 — El Componente Visual (`MercadoPagoBrick.jsx`)

Componente React puro que renderiza el botón de pago y sus estados:

```jsx
// src/components/payment/MercadoPagoBrick.jsx
export function MercadoPagoBrick({ items, deliveryFee, discountAmount }) {
    const { checkout, isLoading, error } = useCheckoutPro();

    return (
        <div>
            {error && <MensajeError mensaje={error} />}
            <button
                onClick={() => checkout({ items, deliveryFee, discountAmount })}
                disabled={isLoading || items.length === 0}
                style={{ backgroundColor: '#009EE3' }}   // azul oficial de MP
            >
                {isLoading ? 'Redirigiendo...' : 'Pagar con Mercado Pago'}
            </button>
        </div>
    );
}
```

**Cómo se usa en `Checkout.jsx`:**

```jsx
<MercadoPagoBrick
    items={items}
    deliveryFee={deliveryFee}
    discountAmount={discountAmount}
/>
```

---

## 🧪 Paso 7 — Pruebas con tarjetas de Mercado Pago

Con el token de TEST activo, se pueden usar las tarjetas de prueba oficiales de MP Argentina:

| Tarjeta | Número | CVV | Vencimiento | Resultado |
|---|---|---|---|---|
| Visa (aprobada) | 4509 9535 6623 3704 | 123 | 11/25 | ✅ Pago aprobado |
| Mastercard (aprobada) | 5031 7557 3453 0604 | 123 | 11/25 | ✅ Pago aprobado |
| Cualquier tarjeta (rechazada) | 4000 0000 0000 0002 | 123 | 11/25 | ❌ Pago rechazado |

**Cuenta de prueba del comprador:**
- Usar las cuentas de prueba que se generan en [https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-cards](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/integration-test/test-cards)
- Cada aplicación de MP genera usuarios de prueba asociados

---

## 🚀 Paso 8 — Pasar de PRUEBAS a PRODUCCIÓN (checklist completo)

### ✅ Checklist de producción

- [ ] **1. Cambiar el `MP_ACCESS_TOKEN` en Supabase Secrets**
  - Ir al Dashboard de Supabase → Edge Functions → Secrets
  - Reemplazar el token `TEST-XXXX...` por el token de producción `APP_USR-XXXX...`
  - Se obtiene en: [mercadopago.com.ar/developers](https://www.mercadopago.com.ar/developers) → Tu aplicación → Credenciales de producción

- [ ] **2. Cambiar el `SITE_URL` en Supabase Secrets**
  - Reemplazar `http://localhost:5173` por la URL real de producción
  - Ejemplo: `https://mi-tienda.vercel.app`
  - Esto afecta las `back_urls` (a dónde redirige MP al terminar el pago)

- [ ] **3. Re-deployar la Edge Function**
  ```bash
  supabase functions deploy create-mp-preference --no-verify-jwt
  ```

- [ ] **4. Actualizar `statement_descriptor` en la Edge Function (opcional)**
  - En `index.ts`, línea 95: `statement_descriptor: 'MI TIENDA'`
  - Cambiar `'MI TIENDA'` por el nombre real del negocio
  - Este nombre aparece en el resumen de tarjeta del comprador

- [ ] **5. Activar `auto_return` (opcional pero recomendado en producción)**
  - En `index.ts`, descomentar o agregar: `auto_return: 'approved'`
  - Hace que MP redirija automáticamente al usuario al sitio luego de un pago aprobado
  - ⚠️ Solo funciona con dominios públicos (no con localhost)

- [ ] **6. Ajustar CORS en producción (opcional, recomendado)**
  - En `index.ts`, línea 9: `'Access-Control-Allow-Origin': '*'`
  - Reemplazar `'*'` por el dominio exacto: `'https://mi-tienda.vercel.app'`

- [ ] **7. Verificar que el `.env` del frontend apunta al proyecto de Supabase correcto**
  - `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` deben ser del proyecto de producción

- [ ] **8. Hacer una compra de prueba real con monto mínimo**
  - Realizar una compra real con tarjeta propia por el monto mínimo posible
  - Verificar que el dinero llega a la cuenta de MP de la tienda
  - Verificar que las `back_urls` redirigen correctamente

---

## 🗺️ Resumen visual: ¿qué cambia al pasar a producción?

```
PRUEBAS                              PRODUCCIÓN
──────────────────────────────────────────────────────────────
MP_ACCESS_TOKEN = TEST-XXXX...  →   MP_ACCESS_TOKEN = APP_USR-XXXX...
SITE_URL = localhost:5173        →   SITE_URL = https://mi-tienda.com
init_point → sandbox checkout   →   init_point → checkout real (cobra)
auto_return: comentado           →   auto_return: 'approved'
CORS: '*'                        →   CORS: 'https://mi-tienda.com'
```

---

## ❓ Preguntas frecuentes

**¿Por qué no usamos el SDK de MP (`@mercadopago/sdk-react`)?**  
El SDK embebido requiere la `Public Key` en el frontend y renderiza un formulario de tarjeta en la página. Elegimos Checkout PRO con redirect porque es más simple, más seguro, y MP se encarga de toda la UI de pago.

**¿Qué pasa si el usuario cierra la pestaña de MP sin pagar?**  
MP redirige a `back_urls.failure` o `back_urls.pending`. En nuestra configuración, ambas apuntan a la raíz (`/`). Se puede mejorar apuntando a una página dedicada de "pago cancelado".

**¿La preferencia de MP caduca?**  
Sí. Por defecto caduca en 30 días. Si el usuario tarda más de ese tiempo, el link ya no funciona y deberá iniciar el checkout nuevamente (en la práctica esto nunca sucede).

**¿Podemos guardar el `preferenceId` en la base de datos?**  
Sí, y es recomendable para auditoría. La Edge Function devuelve `preferenceId`, que se puede guardar en Supabase junto con la orden del cliente antes de redirigir.

**¿Cómo recibimos notificaciones de pago en tiempo real?**  
Usando **Webhooks de MP** (IPN). Se configura una URL de notificación en la preferencia con el campo `notification_url`. No está implementado aún — es el siguiente paso recomendado para órdenes en producción.

---

*Documentado con base en el código de producción del proyecto — Marzo 2026*
