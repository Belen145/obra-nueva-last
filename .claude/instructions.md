# Instrucciones del Proyecto - SaaS Gestión Documental

## Contexto del Proyecto

Esta es una aplicación SaaS de gestión documental especializada en obras de construcción. Gestiona proyectos, servicios asociados (luz, gas, agua, telefonía) y toda la documentación necesaria para cada servicio.

## Stack Tecnológico

- **Framework**: React 18 + TypeScript + Vite
- **Routing**: React Router DOM v7
- **Backend**: Supabase (PostgreSQL)
- **Estilos**: Tailwind CSS
- **Iconos**: Lucide React
- **Tipografía**: Figtree (Google Fonts)

## Sistema de diseño

El objetivo del presente proyecto es actualizar los estilos a los que se usan en el sistema de diseño de Zenova. Para ello, se irán adjuntando links de Figma (a través de su mcp) para ir actualizando las distintas secciones del proyecto. Deberás tener en cuenta las siguientes cuestiones:

- **Color de tipografía**: para interpretar fielmente el color de la tipografía de los textos que aparece en Figma, deberás fijarte en en apartado Colors, sección Text colors y ahí aparecerá la variable con el color en cuestión, que deberás matchear con los colores de Zenova definidos en `tailwind.config.js`. Recuerda que todos los estilos deben ser introducidos a través de la semántica de Tailwind CSS

- **Dimensiones y espaciados**: **CRÍTICO** - SIEMPRE debes obtener la metadata del diseño usando `get_metadata` ANTES de implementar cualquier componente. Este paso es OBLIGATORIO y NO OPCIONAL. Debes:
  1. Llamar a `get_metadata` para el nodo de Figma
  2. Extraer el `width` y `height` exactos del nodo
  3. Aplicar esas dimensiones exactas usando clases de Tailwind con valores específicos (ej: `w-[333px]`, `h-[352px]`)
  4. NO usar valores aproximados o genéricos como `max-w-md`, `max-w-lg`, etc.
  5. Verificar también padding, gap, border-radius en el código generado por `get_code`

  **Ejemplo correcto**:
  - Metadata muestra `width="333"` → Usar `w-[333px]`
  - Metadata muestra `height="352"` → Usar `h-[352px]`

  **Ejemplo INCORRECTO**:
  - Metadata muestra `width="333"` → NO usar `max-w-sm` o `w-96`

## Paleta de Colores

Usar los colores personalizados de Zenova definidos en `tailwind.config.js` Para identificar estos colores, fijate en los que empiezan por 'zen':

### Colores Principales

- **zen-blue**: Color principal de la marca (usar 500, 600, 700 para acciones principales)
- **zen-green**: Para estados de éxito y completados
- **zen-grey**: Para textos y fondos neutrales
- **zen-warning**: Para alertas y acciones que requieren atención
- **zen-success**: Para confirmaciones y éxitos
- **zen-error**: Para errores e incidencias

### Uso Recomendado

- Botones primarios: `bg-zen-blue-500 hover:bg-zen-blue-600`
- Botones de éxito: `bg-zen-green-500 hover:bg-zen-green-600`
- Fondos: `bg-zen-grey-50`, `bg-zen-grey-100`
- Textos: `text-zen-grey-900` (principal), `text-zen-grey-600` (secundario)
- Bordes: `border-zen-grey-200`

## Convenciones de Código

### Componentes

- Usar **TypeScript** para todos los componentes
- Definir interfaces para props al inicio del archivo

### Hooks Personalizados

- Prefijo `use` + nombre descriptivo
- Retornar objetos con propiedades nombradas (no arrays)
- Manejar estados de `loading`, `error` y `data`

### Estilos

- Usar **Tailwind CSS** exclusivamente
- No crear archivos CSS personalizados adicionales
- Clases ordenadas: layout → spacing → colores → texto → efectos
- Usar los colores de Zenova en lugar de los colores por defecto de Tailwind

### Iconos

**IMPORTANTE: Antes de realizar cualquier tarea relacionada con iconos, SIEMPRE debes leer estas instrucciones primero.**

**Orden de prioridad para usar iconos:**

1. **PRIMERO**: Verificar si el icono existe en el sprite `public/icons.svg` usando la etiqueta svg con `<use href="/icons.svg#nombre-icono" />`
2. **SEGUNDO**: Si el icono NO está en el sprite, extraerlo del diseño de Figma proporcionado usando las herramientas MCP de Figma
3. **TERCERO** (SOLO COMO ÚLTIMO RECURSO): Usar **Lucide React** únicamente si no se puede obtener el icono de las dos formas anteriores

**Proceso de trabajo con iconos:**

- SIEMPRE revisar primero el diseño de Figma para identificar el icono exacto a usar
- Buscar el icono en `public/icons.svg` por su nombre o similitud visual
- Si no está en el sprite, descargarlo del diseño de Figma y agregarlo al sprite
- Solo usar Lucide React cuando sea imposible obtener el icono del diseño
- Tamaños estándar: `w-4 h-4` (small), `w-5 h-5` (medium), `w-6 h-6` (large)
- El color de los iconos debe ser coherente con el diseño, o en su defecto con el texto más cercano

**Confirmación obligatoria:**

Cada vez que vayas a realizar una tarea, DEBES confirmar explícitamente que has leído estas instrucciones antes de proceder.

## Estructura de Archivos

```
src/
├── components/     # Componentes React (UI)
├── hooks/         # Custom hooks (lógica de negocio)
├── lib/           # Configuraciones (Supabase)
├── App.tsx        # Routing principal
└── main.tsx       # Entry point
```

## Reglas de Desarrollo

### General

1. **No crear archivos nuevos**: se debe trabajar sobre el código ya generado. No se deben crear nuevos componentes. El trabajo que se va a realizar en este proyecto es de actualizar el diseño para seguir los patrones de estilo de Zenova.
2. **Reutilizar componentes existentes**: insisto, no se deben crear nuevos componentes.
3. **Mantener consistencia**: Seguir los patrones existentes en el código. Se debe mantener toda la funcionalidad previa ya existente.

### UI/UX

1. Usar la tipografía **Figtree** en todo el proyecto
2. Mantener consistencia en espaciados: `gap-4`, `gap-6`, `p-4`, `p-6`
3. Bordes redondeados: `rounded-lg` o `rounded-xl`
4. Transiciones suaves: `transition-colors duration-200`
5. Estados hover visibles en elementos interactivos
6. Spinners de carga cuando hay operaciones asíncronas

### Accesibilidad

1. Usar `aria-label` en botones sin texto
2. Asegurar contraste de colores adecuado
3. Mantener un orden lógico de tabulación

### Rendimiento

1. Usar el hook `useServicesCache` para cachear servicios
2. Evitar llamadas redundantes a Supabase
3. Implementar loading states apropiadamente

## Flujo de Trabajo Principal

1. **Crear Obra** → Wizard de 3 pasos (info básica, servicios, sociedad/responsable)
2. **Gestionar Servicios** → Cada obra tiene servicios con estados y timelines
3. **Subir Documentación** → Documentos categorizados por tipo de servicio
4. **Gestionar Estados** → Transiciones automáticas según documentación
5. **Resolver Incidencias** → Modal dedicado para gestión de incidencias

## Modelo de Datos (Supabase)

- `construction`: Obras de construcción
- `services`: Servicios asociados a obras
- `documents`: Documentos de servicios
- `service_type`: Tipos de servicios (luz, gas, agua, telefonía)
- `services_status`: Estados con flags (is_final, is_incidence, requires_user_action)
- `documentation_type`: Tipos de documentos requeridos

## Notas Importantes

- Los estados de servicios tienen flags importantes: `is_final`, `is_incidence`, `requires_user_action`
- Cada tipo de servicio tiene documentación específica requerida
- Usar cache inteligente para optimizar consultas repetitivas

## Comandos Útiles

```bash
npm run dev      # Desarrollo
npm run build    # Compilar para producción
npm run preview  # Preview de build
```
