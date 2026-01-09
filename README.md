# E-commerce Web App

Aplicación web completa de e-commerce construida con React, Vite, Tailwind CSS y Supabase.

## Características

### Parte Pública
- **Home:** Hero section y productos destacados.
- **Catálogo:** Grid de productos con búsqueda y filtros por categoría.
- **Detalle de Producto:** Vista individual con imágenes y descripción.
- **Carrito:** Gestión de items y checkout vía WhatsApp.
- **Contacto:** Formulario integrado con WhatsApp y mapa.

### Panel de Administración
- **Login:** Autenticación segura con Supabase.
- **Dashboard:** Resumen general.
- **Productos:** CRUD completo (Crear, Leer, Actualizar, Eliminar).
- **Categorías:** Gestión de categorías.
- **Configuración:** Edición de datos de contacto y redes sociales.

## Requisitos Previos

- Node.js (v18 o superior)
- Cuenta en [Supabase](https://supabase.com/)

## Instalación

1. Clonar el repositorio (o descargar los archivos):
   ```bash
   git clone <url-del-repo>
   cd ecommerce-web
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar Supabase:
   - Crear un nuevo proyecto en Supabase.
   - Ir al SQL Editor y ejecutar el script ubicado en `supabase/schema.sql`.
   - Crear un bucket de almacenamiento llamado `products` y hacerlo público.
   - Copiar la URL del proyecto y la `anon key` (API Key pública).

4. Configurar variables de entorno:
   - Renombrar `.env.example` a `.env`.
   - Pegar tus credenciales de Supabase:
     ```
     VITE_SUPABASE_URL=tu_url_de_supabase
     VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
     ```

5. Crear el primer usuario administrador:
   - Ir a la sección "Authentication" en Supabase.
   - Agregar un usuario manualmente (email y password).
   - (Opcional) Deshabilitar el registro público de usuarios si solo quieres que tú puedas crear admins.

## Ejecución

Para desarrollo local:
```bash
npm run dev
```
La aplicación estará disponible en `http://localhost:5173`.

## Estructura del Proyecto

- `src/components`: Componentes reutilizables (UI, Layout, Admin).
- `src/pages`: Vistas de la aplicación (Public, Admin).
- `src/context`: Estado global (Carrito).
- `src/hooks`: Hooks personalizados (Auth).
- `src/lib`: Configuración de Supabase y utilidades.
