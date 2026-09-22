# .project-meta

Carpeta destinada a almacenar información y metadatos del proyecto que no forman parte del código fuente pero son útiles para la documentación y referencias rápidas.

## Contenido

### `integrations.json`
- **Proyecto de Stitch ID**: `1234888852551236141`
- **MCP**: Configurado en `~/.claude/settings.json`
- **Integraciones**: Supabase, Mercado Pago, Stitch Design System
- **Proyectos relacionados**: ecommerce-mobile

## Uso

Esta carpeta se usa para guardar:
- IDs de proyectos externos (Stitch, Firebase, etc.)
- Configuraciones de integraciones
- Referencias a APIs y servicios
- Metadatos del proyecto
- Notas sobre arquitectura y decisiones técnicas

**No incluir:**
- Secrets o credenciales
- Archivos sensibles
- Archivos que cambien frecuentemente

## Actualizar información

Cuando se añadan nuevas integraciones o cambien configuraciones, actualiza `integrations.json` para mantener centralizada la información.
