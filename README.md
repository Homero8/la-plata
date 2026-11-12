# La Plata · versión para amigos y familia

Cada persona se crea su cuenta, responde un asistente de 8 pasos y ya tiene su dashboard. Los datos van a una base de datos en Supabase, donde cada usuario solo puede ver lo suyo (y lo que otros le compartan con un código).

**Archivos que se suben a GitHub:** `index.html`, `manifest.webmanifest`, `sw.js`, `icon.svg`, `icon-180.png`, `icon-192.png`, `icon-512.png`.
**No se sube:** `schema.sql`, que se pega una vez en Supabase.

---

## 1. Crear la base de datos en Supabase (10 min)

1. Entra en <https://supabase.com>, pulsa **Start your project** y entra con tu cuenta de GitHub.
2. **New project**:
   - Nombre: `la-plata`.
   - Pon una contraseña de base de datos y guárdala.
   - Región: **West EU (Ireland)** o **Central EU (Frankfurt)**.
   - Pulsa **Create**. Tarda unos minutos.
3. Menú izquierdo → **SQL Editor** → **New query**.
4. Pega todo el contenido de `schema.sql` y pulsa **Run**. Tiene que salir "Success". Si lo ejecutas dos veces no pasa nada.

## 2. Configurar el login (3 min)

1. **Authentication → Sign In / Providers → Email**: desactiva **Confirm email** y guarda.
   El plan gratis solo puede mandar unos pocos correos por hora. Así tus amigos entran al momento sin esperar el correo de confirmación.
2. **Authentication → URL Configuration → Site URL**: pon la dirección donde va a estar la app, por ejemplo `https://homero8.github.io/la-plata/`. Así funciona el enlace de "¿Olvidaste tu contraseña?".

## 3. Conectar la app (2 min)

1. **Project Settings → Data API** (o **API**). Copia:
   - **Project URL** (algo como `https://abcd1234.supabase.co`).
   - La clave **anon public** (una cadena larga que empieza por `eyJ…`, o `sb_publishable_…`).
2. Abre `index.html` con el Bloc de notas y busca estas dos líneas:

   ```js
   const SUPABASE_URL="";
   const SUPABASE_KEY="";
   ```

   Pega cada valor entre las comillas y guarda.

La clave *anon* es pública a propósito: puede estar en GitHub. Lo que protege los datos son las reglas del `schema.sql`. **Nunca** pegues la clave `service_role`.

## 4. Publicarla en GitHub Pages (5 min)

1. En GitHub, **New repository** → nombre `la-plata` → **Public** → **Create**.
2. **Add file → Upload files**: sube los 7 archivos de la lista de arriba y pulsa **Commit changes**.
3. **Settings → Pages**: Source **Deploy from a branch**, Branch **main**, carpeta **/ (root)**, y pulsa **Save**.
4. En un par de minutos está en `https://TU-USUARIO.github.io/la-plata/`.

## 5. Pasar tus datos actuales

1. En el navegador, abre tu URL de Apps Script con tu PIN al final:
   `https://script.google.com/macros/s/…/exec?pin=TU_PIN`
2. Sale un texto largo (tus datos en JSON). Guárdalo con **Ctrl + S** como `plata.json`.
3. En la app nueva, pulsa **Crear cuenta**. En el primer paso del asistente pulsa **Importar mis datos** y elige `plata.json`.

Sigue usando la versión antigua hasta que veas que en la nueva está todo bien.

## 6. En el celular

- **iPhone:** abre el link en Safari → **Compartir → Añadir a pantalla de inicio**.
- **Android:** en Chrome, **menú ⋮ → Instalar app**.

## 7. Invitar a gente

- **Para que usen la app:** mándales el link. Pulsan **Crear cuenta** y siguen el asistente.
- **Para que alguien vea tus finanzas sin poder tocarlas (tu papá):**
  1. Ve a **Ajustes → Compartir en solo lectura → Crear código** y mándale el código.
  2. Él se crea una cuenta y, en el primer paso del asistente, pone el código en "¿Solo quieres ver las finanzas de alguien?". No tiene que rellenar nada más.
  3. Puedes quitarle el acceso cuando quieras.

## Bueno saber

- **El plan gratis de Supabase pausa el proyecto si nadie lo usa en 7 días.** Con uso diario no pasa. Si pasa, entra en supabase.com y pulsa **Restore**; no se pierde nada.
- **Copia de seguridad:** cada usuario puede **Exportar CSV** desde el menú. Tú, como dueño, también tienes **Database → Backups** en Supabase.
- **Cambiar algo de la app:** solo hay que subir el `index.html` nuevo a GitHub. La base de datos no se toca.
