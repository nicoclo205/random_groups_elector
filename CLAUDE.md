# Creación de Grupos — Capstone

App web local para armar grupos de trabajo (4-5 personas) a partir de una encuesta
de tipo de persona creativa (estilo FourSight: tipos A/B/C/D), balanceando los tipos
lo más parejo posible entre grupos.

## Estado del proyecto

**Fase actual: interfaz implementada; siguiente paso es la lógica real (parseo del Excel).**

`index.html` y `app.js` ya tienen la interfaz completa (los 3 estados, tarjetas de
grupo, drag & drop, exportar, animaciones). Ya **no hay datos de ejemplo** en la
app (se quitaron `DEMO_PEOPLE` y el botón de "usar datos de ejemplo") — sin un
Excel real cargado, la app no muestra a nadie. Las funciones que faltan están
marcadas con `TODO — lo vemos juntos` en `app.js`: `parseExcelFile`,
`detectColumns`, `computeType`, y revisar `balanceGroups` (hoy es un placeholder
razonable pero no verificado contra la regla exacta de abajo). El trabajo que
sigue es justo `parseExcelFile` (leer el archivo con FileReader + SheetJS).

Este archivo se actualiza cada vez que cambien decisiones de diseño, arquitectura
o alcance. Es la fuente de verdad del proyecto — antes de asumir cómo funciona algo,
leer este archivo.

**Quién implementa qué**: el usuario escribe la lógica real (parseo, detección de
columnas, cálculo de tipo, algoritmo de balanceo definitivo) con guía paso a paso;
Claude implementó la capa de interfaz/diseño directamente, a pedido explícito del
usuario, a partir de un diseño hecho en Claude Design (no del mockup de fuentes
anterior, que quedó descartado).

## Objetivo

Dado un Excel de resultados de encuesta (uno por semestre, con nombre y estructura
de columnas variable pero consistente en el contenido), generar grupos de personas:

- Tamaño de grupo configurable fácilmente (default 5, ej. 4).
- Si el total de personas no es múltiplo exacto del tamaño elegido, repartir el
  sobrante entre grupos en vez de dejar un grupo chico suelto (tamaños difieren
  como máximo en 1 entre grupos).
- Cada grupo debe quedar lo más balanceado posible en tipos: máximo 2 personas del
  mismo tipo por grupo; 3 solo se acepta si es matemáticamente inevitable dado el
  conteo de tipos.

## Origen de los datos

Excel de un formulario (ej. `Capstone 2026-2 (1-19).xlsx`, incluido como dato de
ejemplo). Es el instrumento **FourSight** (32 afirmaciones Sí/No repartidas en
4 bloques de estilo creativo). Estructura observada:

- **Fila 1**: casi vacía, solo tiene contenido en las últimas dos columnas
  (`Pregunta` y `Tipo de persona creativa` — ver advertencia abajo, es engañoso).
- **Fila 2**: encabezados reales — `ID`, `Hora de inicio`, `Hora de finalización`,
  `Correo electrónico`, `Nombre`, `Hora de la última modificación`, y las 32
  preguntas Sí/No del test, en 4 bloques contiguos de 8-9 preguntas cada uno.
- **Filas siguientes**: una persona por fila, con sus respuestas Sí/No.

### ⚠️ Trampa encontrada: NO existe un tipo precalculado por persona

Las columnas `Pregunta` / `Tipo de persona creativa` (las dos últimas, ~AN/AO)
**no son datos por persona**, aunque lo parezcan. Son una tabla-leyenda de 32
filas (una por cada una de las 32 preguntas) que dice a qué tipo pertenece cada
pregunta. Como esa leyenda empieza en la fila 2 y las personas también empiezan
casi en la fila 2-3, ambas tablas quedan visualmente superpuestas por
coincidencia de rango de filas, pero **no tienen relación entre sí fila a fila**.
No leer esas dos columnas como si fueran el tipo de la persona de esa fila.

**El tipo de cada persona hay que calcularlo en la app**, contando cuántos "Sí"
tiene esa persona en cada uno de los 4 bloques de preguntas, y asignando el tipo
del bloque con más "Sí" (empate = tipo **mixto**, ver "Decisiones cerradas").

### Mapeo pregunta → tipo (confirmado con los datos, vía la tabla-leyenda)

| Tipo | Nombre           | Tema de las preguntas del bloque                          |
|------|------------------|-------------------------------------------------------------|
| A    | Clarificador     | Entender/definir el problema con precisión                  |
| B    | Ideador          | Generar muchas ideas, imaginación, metáforas                |
| C    | Desarrollador    | Analizar, refinar y desarrollar pasos de una solución        |
| D    | Implementador    | Pasar a la acción, poca paciencia para refinar               |

La app debe reconocer cada una de las 32 afirmaciones **por texto** (normalizado:
trim + sin distinguir mayúsculas/tildes), no por posición de columna, para seguir
funcionando si el formulario reordena las preguntas en otro semestre. La lista
completa de las 32 afirmaciones con su tipo debe vivir como constante en `app.js`.

⚠️ Cada semestre el archivo cambia (nombre de archivo, cantidad de personas).
La app debe detectar columnas por nombre de encabezado (`Nombre`, `Correo`, y
las 32 afirmaciones), con un mapeo manual de respaldo en la UI por si el
autodetect falla (ej. una pregunta se redactó ligeramente distinto).

⚠️ El nombre del archivo de ejemplo contiene un espacio irrompible (U+00A0,
`\xa0`) entre "2026-2" y "(1-19)", no un espacio normal — no asumir que se puede
teclear el nombre a mano y que va a hacer match; usar listado de directorio o el
selector de archivos del navegador.

## Arquitectura

App estática, **sin backend**, sin paso de build. **Destino de despliegue:
Vercel** — por lo tanto siempre se va a visitar con internet disponible, así
que no hay necesidad de vendorizar librerías para uso offline (esto revirtió
una decisión anterior, ver nota abajo).

```
creacion_grupos/
  index.html          # estructura de la app, incluye <script> de CDN (Tailwind + SheetJS)
  app.js              # parseo Excel, algoritmo de balanceo, render, drag&drop, export
  CLAUDE.md
```

(No hay carpeta `vendor/`: se descartó al confirmar que el destino es Vercel.
El Excel de ejemplo vive en la carpeta local del proyecto pero **no se versiona**
— está en `.gitignore` por `*.xlsx`, nunca debe subirse al repo por tener datos
reales de personas.)

Decisiones de stack:
- **Tailwind CSS** vía CDN en vivo (Play CDN), con versión **pineada** en la
  URL, no "latest" — para que la librería no cambie sola y rompa algo sin
  avisar.
- **SheetJS** (lectura/escritura de `.xlsx`) también vía CDN, versión pineada.
- **JS vanilla**, sin framework.
- **Drag & drop nativo** (HTML5 Drag and Drop API), sin librería externa.
- **CSS lo menos posible por fuera de Tailwind**: todo lo personalizado (colores
  por tipo, tipografías, animaciones) vive dentro de un único bloque `@theme` en
  `index.html`, usando los namespaces nativos de Tailwind v4 (`--color-*`,
  `--font-*`, `--animate-*` con su `@keyframes` anidado). Eso genera clases como
  `bg-type-a`, `font-display`, `animate-breathe` automáticamente — no hay clases
  CSS escritas a mano por fuera de `@theme`. Lo único que Tailwind no puede
  generar por sí solo son las recetas `@keyframes` en sí (la animación como tal
  siempre hay que describirla).

> Nota: la decisión original era vendorizar Tailwind y SheetJS localmente
> (carpeta `vendor/`) pensando en un caso de uso "abrir el HTML localmente sin
> internet". Se descartó al confirmar que el proyecto se despliega en Vercel,
> donde siempre hay internet disponible — usar CDN en vivo es más simple y
> es exactamente lo que corresponde a ese destino.

## Flujo de la app

1. **Cargar Excel** — input de archivo, parseo con SheetJS.
2. **Detectar columnas** automáticamente: `Nombre`, `Correo`, y las 32 columnas
   de preguntas (por texto, ver tabla de mapeo arriba); si falla, mapeo manual
   en la UI.
3. **Calcular tipo por persona** — contar "Sí" por bloque (A/B/C/D) y asignar el
   de mayor conteo. Empate entre bloques: tipo **mixto** (ver "Decisiones cerradas").
4. **Configurar tamaño de grupo** — campo numérico, default 5.
5. **Algoritmo de balanceo**:
   - Calcular número de grupos y tamaños (diferencia máx. 1 entre grupos).
   - Agrupar personas por tipo, repartir tipo-round-robin entre grupos evitando
     que un grupo acumule >2 del mismo tipo (3 solo si es inevitable).
   - Los tipos **mixtos** también se reparten automáticamente entre los grupos
     (barajeados), igual que cualquier otra persona — no quedan aparte
     esperando asignación manual.
6. **Visualización** — tarjetas por grupo, color por tipo, aviso visual si un
   grupo queda con 3 del mismo tipo.
7. **Ajuste manual** — arrastrar personas entre grupos; la validación de "máx 2
   del mismo tipo" se re-evalúa en vivo tras cada cambio.
8. **Exportar** — botón para descargar el resultado final (post-ajustes) como
   Excel o CSV.

## Diseño visual (implementado)

Objetivo explícito del usuario: "algo chévere y entretenido", no solo funcional.
El diseño real vino de un proyecto en **Claude Design** ("Diseño página crear
grupos", `Creacion de Grupos.dc.html`) — el archivo `.dc.html` en sí no es
usable tal cual (depende de un runtime propio sobre React, `support.js`), así
que se tradujo a mano a HTML + Tailwind + JS vanilla, manteniendo look, estados
y animaciones.

**Tipografía**: `Bricolage Grotesque` (títulos, vía Google Fonts) + `Karla`
(texto). Cargadas por `<link>` a Google Fonts (no vendorizadas — mismo criterio
que Tailwind/SheetJS: destino Vercel, siempre hay internet).

**Colores por tipo**: definidos en OKLCH como tokens de `@theme` de Tailwind v4
en `index.html` (`--color-type-a/b/c/d` + su `-fg` de texto y `-line` de acento),
un tono pastel por tipo con su texto a juego. Ver `index.html` para los valores
exactos. (Esto reemplaza la paleta hex que yo había validado antes con el
checker de daltonismo — se prefirió el diseño real por encima de mi borrador.)

**Estados de la app** (nuevo respecto al plan original, buena adición del
diseño): `void` (sin datos — pantalla oscura tipo portada con el input de
archivo y botón de "usar datos de ejemplo") → `reading` (spinner mientras
"lee" el archivo) → `loaded` (dashboard claro con header pegajoso, contador de
tamaño, botón "Rebarajar" con giro, exportar CSV/Excel, leyenda, tarjetas de
grupo, tarjeta flotante al pasar el mouse sobre una persona con su detalle).

La interfaz todavía tiene una bandeja ("tray") a la que se puede arrastrar
manualmente a cualquier persona para dejarla sin asignar — se conserva como
mecanismo general de ajuste manual, pero ya no es donde caen los tipos mixtos
por defecto (ver "Decisiones cerradas": ahora el algoritmo los baraja junto
con todos los demás).

Ya implementado: avatares con iniciales coloreados por tipo (degradado a dos
colores para tipo mixto), animaciones al arrastrar/soltar y al aparecer las
tarjetas, aviso visual (borde + texto) cuando un grupo queda con 3 del mismo
tipo, botón de reordenar con animación de giro.

**Pendiente/no implementado todavía**: confetti u otra celebración cuando el
resultado queda sin violaciones (tarea #13 del roadmap); leyenda de tipos
editable (nombre/emoji por tipo) — hoy el nombre de cada tipo es fijo
(Clarificador/Ideador/Desarrollador/Implementador).

## Decisiones cerradas relevantes

- **Empate entre bloques** al calcular el tipo de una persona (mismo conteo de
  "Sí" en dos o más bloques): la persona queda marcada como **tipo mixto**
  (ej. "A/B"), visualmente distinta en la UI (avatar con degradado de dos
  colores). El algoritmo de balanceo **la reparte automáticamente** entre los
  grupos junto con todos los demás — no queda separada esperando asignación
  manual. (Decisión revisada: originalmente se había dicho que los mixtos
  quedarían sin asignar en una bandeja aparte; se cambió porque se prefiere que
  el algoritmo los baraje también.)
- Exportación: debe ofrecer **ambas** (Excel y CSV) y también visualización en
  pantalla.

## Evidencia de que `Pregunta`/`Tipo de persona creativa` NO son datos por persona

En el archivo de ejemplo hay solo **20 personas reales** (ID 1 a 20, filas 3-22).
Las filas 23-33 no tienen ID/Nombre/Correo (están vacías), pero las columnas
`Pregunta` y `Tipo de persona creativa` siguen teniendo contenido ahí (continúan
listando las preguntas 21-32 y sus tipos). Si esas columnas fueran el resultado
calculado por persona, no podrían tener valores en filas sin ninguna persona —
confirma que es una tabla-leyenda de 32 filas (una por pregunta), no una columna
de resultado por persona.
