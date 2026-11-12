# La Plata — contexto para Claude Code

App web de finanzas personales para amigos y familia (beta con usuarios de prueba). Cada usuario crea su cuenta, responde un asistente de bienvenida y usa su dashboard. Hosting: GitHub Pages (este repo, rama `main`, raíz). Base de datos y login: Supabase.

- Producción: https://homero8.github.io/la-plata/
- Dueño: Homero (habla español; responde en español, tono normal y directo).

## Reglas de trabajo

- **Sin build ni frameworks.** Todo el frontend es un único `index.html`, con CSS y JS inline (vanilla). No introduzcas bundlers, npm en el frontend ni archivos JS separados sin pedirlo.
- **Librerías por CDN con versión exacta.** Hoy solo hay una: `@supabase/supabase-js@2.117.3` (UMD, jsDelivr). Fuentes: Plus Jakarta Sans y Material Symbols Rounded (Google Fonts).
- **La clave de Supabase del `index.html` es la publishable (pública a propósito).** La seguridad la ponen las políticas RLS de `supabase/schema.sql`. Nunca pongas la `service_role`/`secret` en el repo.
- **El repo es público.** No subas datos personales: exports JSON o CSV, capturas con importes reales, el antiguo `Code.gs` con PINs.
- **Cambios de base de datos.** Edita `supabase/schema.sql`, que debe seguir siendo idempotente (`if not exists`, `drop policy if exists`). Dile a Homero que lo ejecute en Supabase → SQL Editor; no hay migraciones automáticas. Si puedes, prueba antes en un Postgres local (ver Tests).
- **Datos de usuarios ya existentes.** Cualquier cambio en la forma de `config` o de los movimientos tiene que seguir funcionando con datos antiguos: lee con valores por defecto, no rompas campos existentes.
- **Antes de dar algo por terminado,** ejecuta `npm test` y mira las capturas de `tests/shots/`, en escritorio y en móvil (390 px, sin scroll horizontal).
- **Desplegar = commit + push a `main`.** GitHub Pages publica en 1–2 minutos. Commit o push solo cuando Homero lo pida.
- **Textos de la interfaz en español.** El login, el asistente y el apartado de cuenta/compartir pasan por `t()` y están en `TR.en` / `TR.pt`. Los textos nuevos de esas partes deben añadirse a los tres idiomas.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la app (~1500 líneas) |
| `manifest.webmanifest`, `sw.js`, `icon*.png`, `icon.svg` | PWA instalable. `sw.js` no cachea nada a propósito |
| `supabase/schema.sql` | Tablas, RLS y funciones RPC. Ya está ejecutado en el proyecto de producción |
| `tests/` | Supabase simulado (mismas reglas que el SQL) + prueba de punta a punta con Playwright |
| `README.md` | Guía de instalación para humanos |

## Base de datos (Supabase)

- **`profiles`** (`user_id` PK → `auth.users`, `config jsonb`, `updated_at`): toda la configuración del usuario en un JSON.
- **`movimientos`** (`id uuid`, `user_id`, `fecha date`, `data jsonb`, `created_at`): un movimiento por fila. El contenido completo va en `data`; `fecha` se duplica para ordenar.
- **`notas`** (`id`, `user_id`, `texto`, `created_at`): checklist privado de ideas o mejoras (solo el dueño).
- **`shares`** (`id`, `owner_id`, `owner_name`, `code` único, `viewer_id` nullable): invitaciones de solo lectura. Un código = una persona.
- **Funciones:**
  - `can_view(owner)`: dueño o viewer de un share.
  - `redeem_share(p_code)`: asigna `viewer_id = auth.uid()` si el código está libre.
  - `delete_my_account()`: borra de `auth.users`, y por cascada todo lo demás.
- **RLS:**
  - En `profiles` y `movimientos`, el SELECT lo permite `can_view(user_id)`; INSERT, UPDATE y DELETE, solo `user_id = auth.uid()`.
  - `notas`: solo el dueño.
  - `shares`: el dueño crea y borra; el viewer puede verlo y borrarse.
- **Auth:** email + contraseña. "Confirm email" está **desactivado** a propósito, por el límite de correos del plan gratis. El código de invitación no depende del email, así que esto no abre ningún agujero.

## Modelo de datos

### `config` (en `profiles.config`)

- **Perfil:** `nombre`, `lang` (`es`/`en`/`pt`), `moneda` (`€`, `$`, `£` o `R$`; se guarda en `CUR` y se usa en `eur()`), `inicio` (`YYYY-MM`, primer mes).
- **`cuentas`:** `[{id, nombre, color, icon}]`. La primera es la "base": a ella va lo antiguo sin cuenta y el desborde de la tarjeta.
- **`cuentaGasto`:** id de la cuenta por defecto para los gastos.
- **`tarjeta`:** `{on, nombre}`, la tarjeta de comida (CoverFlex, Edenred…). En código es la pseudo-cuenta `CFID = "coverflex"`.
- **Categorías:** `catsGasto` y `catsIngreso`, `[{id, nombre, icon, color, subs: [string]}]`.
  - Ids de ingreso: `in-salario`, `in-pagas`, `in-extras` e `in-alimentacion` (carga de la tarjeta).
  - Los usuarios importados de la versión antigua tienen además `in-navidad` e `in-ferias`.
  - Gasto `alimentacion` sin cuenta explícita se paga con la tarjeta, si está activa.
- **`programados`:** pagos o cobros recurrentes que alimentan "Pagos del mes".
  - Forma: `{id, nombre, tipo: gasto|ingreso|pago, cat, sub, deuda?, importe, dia, habil?, desde?, hasta?, meses?: [1-12], vence?, cuenta?}`.
  - Los aportes a botes NO se guardan aquí: se generan desde `botes[].plan` (`progsFor`).
- **`botes`:** `[{id, nombre, icon, color, meta, inicial, plan: [{desde, mensual}], nota?, cuenta?}]`.
- **`deudas`:** `[{id, nombre, total, cuotas, icon, nota, fin?}]`. Se archivan solas cuando los pagos llegan al total; `fin` es solo un texto ("termina …").
- **`debo`:** deudas pequeñas a amigos, `[{id, persona, importe, concepto, fecha, cat, sub}]`. Se pagan con gastos que llevan `ref = id`.
- **`reparto`:** `{ "<catIngreso>": { "<cuentaId>": importe } }`. Reparto por defecto al cobrar, que genera transferencias.
- **`reglaExtra`:** `{bote, pct, cats: [...], on: [...]}`. Al cobrar un ingreso de esas categorías, ofrece apartar un `pct` % al bote. Viene marcado si la categoría está en `on`.
- **`limites`:** `{ "<catGasto>": tope mensual }`. Se muestran en Análisis.

### Movimientos (`movimientos.data`; en memoria llevan además `_id`)

Campos comunes: `tipo`, `importe` (número > 0, salvo `ajuste`), `fecha` (`YYYY-MM-DD`), `desc`, `creado` (ISO).

| `tipo` | Campos | Efecto |
|---|---|---|
| `ingreso` | `cat`, `sub`, `cuenta` | + cuenta (o + tarjeta si `cat = in-alimentacion`) |
| `gasto` | `cat`, `sub`, `cuenta` \| `desdeBote` (`coverflex` o id de bote), `ref?` (id de `debo`) | − cuenta / − tarjeta / − bote. Si sale de un bote, no cuenta como gasto del mes |
| `aporte` / `retiro` | `bote`, `cuenta` | cuenta ↔ bote |
| `pago` | `deuda`, `cuenta` | − cuenta; amortiza la deuda |
| `prestamo` | `sub` (persona), `cuenta` \| `bote` (`coverflex` o id de bote) | Dinero prestado: "Me deben" |
| `cobro` | `ref` (id del préstamo), `sub`, `cuenta` \| `bote` | Devolución, a una cuenta o a un bote (nunca a la tarjeta) |
| `transferencia` | `cuenta` (origen), `destino` | Entre cuentas; neutro en totales |
| `ajuste` | `cuenta` (o `coverflex`), `importe` con signo, `inicial?` | Cuadre de saldo. Con `inicial: true` no cuenta en el "libre" del mes |

Forma de pago codificada en la interfaz: `"a:<cuentaId>"`, `"cf"`, `"b:<boteId>"` (`payEnc` / `payDec`).

## Estructura de `index.html` (orden aproximado)

1. **CSS:** variables de tema en `:root`, con modo oscuro por `prefers-color-scheme` o `[data-theme]`. Después, tarjetas, hojas (`.sheet`), gate y asistente (`.gate`, `.w*`).
2. **HTML:** barra lateral (`.side`), tabbar móvil, vistas `#v-inicio`, `#v-movimientos`, `#v-analisis`, `#v-botes`, `#v-ajustes` y `#v-notas`, más hoja modal `#sheet`, `#gate` (login/asistente) y `#toast`.
3. **Utilidades:** `$`, `$$`, `esc`, `fmt`, `eur`, `eur0`, `mk`/`addM` (meses `YYYY-MM`), `applyTheme`.
4. **Modelo:**
   - Totales y saldos: `totals(m)`, `netActual(m)` (efecto por cuenta y tarjeta del mes), `ledger(m)` (acumulado; el saldo negativo de la tarjeta pasa a la cuenta base), `balance(m)` (pasado / actual / futuro proyectado), `boteSaldo`, `loans`, `deboList`.
   - Programados: `progsFor`, `statusFor` (casa programados con movimientos por `sameKey`).
5. **Render:** `render()` → `rInicio`, `rPagos`, `rSmall` (Debo / Me deben), `rMovs`, `rAnalisis`, `rLimits`, `rBotes`, `rAjustes`, `rAccs`, `rProgs`, `rNotas`, `rAccount`.
6. **Hojas y edición:**
   - Registrar: `openAdd` / `drawAdd` (registrar o editar movimiento), `repartoHtml`.
   - Editores: `editMov`, `editProg`, `editBote`, `editDebt`, `editDebo`, `editAcc`, `editLimit`.
   - Pagos y cuadre: `payDebo`, `repay`, `cuadre`.
   - `askDefault`: ofrece actualizar el importe del programado.
7. **Datos:**
   - `apiLoad()` lee perfil, movimientos (paginados de 1000 en 1000) y notas del `TARGET`, y llama a `apply()`.
   - `apiPost({action})` acepta `add`, `del`, `upd`, `config`, `noteAdd` y `noteDel`; escribe y recarga todo. El resto del código solo usa estas dos funciones.
8. **Roles:**
   - `canWrite` / `OWN`: el dueño es `admin`. Viendo un share, es `lector` (sin botón Registrar, con insignia "Solo lectura").
   - `body.admin` muestra los elementos `.adm`; el modo editor (`body.edit`) muestra los lápices `.edonly`.
9. **Auth y gate:** `boot` → `afterLogin` → (`wizard` si no tiene perfil ni shares) → `apiLoad`. También `showLogin`, `showNewPass` (recuperación) y el selector `#whoSel` para cambiar entre "Mis finanzas" y "Finanzas de X".
10. **Asistente:**
    - Estado `W`; `STEPS`: `tu`, `cuentas`, `cf`, `ingresos`, `fijos`, `deudas`, `botes`, `resumen`.
    - `wDraw` / `wBind` / `wKeep`; `wBuild` genera `config` + ajustes iniciales; `wFinish` guarda.
    - Plantillas: `CATS_DEF[lang]`, `INC_DEF[lang]`, `FIX_TPL`.
11. **`importJSON`:** importa el JSON de la versión antigua (Google Sheets / Apps Script) y reemplaza los datos del usuario.

## Tests

```bash
npm install                    # solo playwright (devDependency)
npx playwright install chromium   # si no está ya
npm test                       # tests/e2e.test.js
```

- `tests/fake-supabase.js` reemplaza el CDN de supabase-js: la ruta de Playwright intercepta la petición.
- `tests/fake-server.js` sirve `index.html` y una base de datos en memoria con **las mismas reglas que el RLS**.
- La prueba hace lo siguiente: registro → asistente completo → Inicio → registrar gasto → crear código → segundo usuario entra con el código en solo lectura (y no puede escribir) → asistente en inglés en móvil.
- Las capturas quedan en `tests/shots/` (ignoradas por git).
- Para probar el SQL de verdad: Postgres local, crear `auth.users`, `auth.uid()` (leyendo `request.jwt.claim.sub`) y los roles `authenticated`/`anon`, luego ejecutar `schema.sql` dos veces y probar con `set role authenticated; set request.jwt.claim.sub = '<uuid>'`.

## Pendiente / ideas

- Traducir a inglés y portugués el resto de la interfaz (vistas principales, hojas, toasts). Hoy solo están traducidos login, asistente, cuenta/compartir y las categorías por defecto.
- Botón "Descargar Excel" (.xlsx) con pestañas Resumen / Categorías / Botes / Deudas, como tenía la versión antigua en Google Sheets.
- Feedback de los usuarios de prueba (Homero lo irá pasando).
- Más adelante: cifrado de extremo a extremo opcional, apps en tiendas con Capacitor, cobro.
