# Comandos de Graphify - ecommerce-web

Guía rápida de comandos para trabajar con el grafo de conocimiento de tu proyecto.

## Comandos Principales

### Construir el Grafo (Primera Vez)
```
/graphify
```
Crea el grafo de conocimiento del proyecto completo.

### Actualizar el Grafo
```
/graphify . --update
```
Actualiza incrementalmente con cambios recientes (más rápido que una reconstrucción completa).

---

## Comandos Disponibles en Graphify

Una vez que el grafo está construido, puedes consultar con los siguientes comandos:

### 1. **Hacer Preguntas sobre el Grafo**
```
/graphify query "¿pregunta sobre el código?"
```
Busca respuestas en el grafo usando BFS (búsqueda amplia por defecto). Ejemplos:
- `/graphify query "¿Dónde se usa useCartStore?"` - Encuentra todas las referencias
- `/graphify query "¿Cómo se conecta ProductCard con Supabase?"` - Trazo completo
- `/graphify query "¿Qué componentes usan autenticación?"` - Encuentra patrones

### 2. **Encontrar Rutas de Conexión (DFS)**
```
/graphify query "pregunta" --dfs
```
Traza un camino específico (depth-first search) en lugar de búsqueda amplia. Ejemplo:
- `/graphify query "¿Cómo conecta App.jsx con Supabase?" --dfs` - Camino exacto

### 3. **Encontrar Ruta Más Corta**
```
/graphify path "Nodo1" "Nodo2"
```
Muestra el camino más corto entre dos conceptos. Ejemplo:
- `/graphify path "ProductCard" "useCartStore"` - Ruta más corta
- `/graphify path "App.jsx" "Supabase"` - De la raíz a la base de datos

### 4. **Explicar un Componente o Concepto**
```
/graphify explain "NombredelNodo"
```
Proporciona explicación completa y contexto de un nodo y sus relaciones. Ejemplo:
- `/graphify explain "useMercanciaUser()"` - Qué es y dónde se usa
- `/graphify explain "ProtectedRoute"` - Explicar el flujo de autenticación
- `/graphify explain "useCheckoutPro Hook"` - Detalles del hook de checkout

### 5. **Actualizar el Grafo** (después de cambios)
```
/graphify . --update
```
Rescaneea el proyecto e actualiza el grafo con cambios recientes. Úsalo después de:
- Agregar nuevos componentes
- Cambiar estructuras principales
- Refactorizar código
- Nota: Solo re-extrae archivos nuevos o modificados

### 6. **Re-ejecutar Clustering**
```
/graphify . --cluster-only
```
Re-ejecuta la detección de comunidades sin volver a extraer código. Útil si necesitas reanalizar las agrupaciones.

---

## Ejemplo de Flujo de Trabajo

```bash
# 1. Construir el grafo (primera vez)
/graphify

# 2. Hacer preguntas sobre checkout
/graphify query "¿Cómo funciona el flujo de checkout?"

# 3. Ver qué componentes están conectados
/graphify path "useCheckoutPro" "MercadoPagoBrick"

# 4. Entender un componente en detalle
/graphify explain "useCheckoutPro Hook"

# 5. Después de hacer cambios en checkout
/graphify . --update

# 6. Explorar con búsqueda profunda (DFS)
/graphify query "¿Cómo conecta Cart con Supabase?" --dfs
```

---

## Estado Actual del Grafo

- **Últimas actualización**: 2026-06-29
- **Total de archivos**: 439 archivos (~380,902 palabras)
- **Nodos**: 645
- **Conexiones**: 1,386
- **Comunidades**: 45
- **Ciclos de importación**: ✓ Ninguno detectado

## God Nodes (Núcleos del Proyecto)

| Nodo | Conexiones | Función |
|------|-----------|---------|
| `supabase` | 66 | Cliente principal de BD |
| `useMercanciaUser()` | 23 | Hook principal de usuarios/mercancía |
| `Button` | 22 | Componente base reutilizado |
| `src/App.jsx` | 21 | Raíz de la aplicación |
| `cn()` | 16 | Utilidad de estilos (clsx) |

---

## Notas Importantes

- **Crea la consulta en lenguaje natural**: No necesitas sintaxis especial, puedes preguntar en español
  - "¿Dónde se usa el hook useCartStore?"
  - "¿Cómo se conecta Navbar con Supabase?"
  - "¿Qué componentes están en la comunidad de checkout?"

- **El grafo es automático**: Analiza el código real, no requiere actualización manual en la mayoría de casos

- **Actualizar después de refactors grandes**: Si haces cambios estructurales importantes, usa `?update` para que el grafo refleje la nueva arquitectura

---

## Troubleshooting

**¿El grafo está desactualizado después de cambios?**
```
/graphify . --update
```

**¿Quiero explorar una área específica?**
```
/graphify query "¿Dónde se usa [componente/hook]?"
```

**¿Quiero ver la documentación completa del grafo?**
Accede a: `graphify-out/GRAPH_REPORT.md`

**¿Necesito reconstruir completamente?**
```
/graphify
```
Esto regenera el grafo desde cero (más lento que `--update`).
