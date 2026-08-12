# Conexión con Supabase

Esta guía cubre dos escenarios: (A) crear un proyecto Supabase nuevo desde
cero con este esquema, y (B) conectar el frontend a un proyecto que ya existe.

---

## A. Crear el proyecto Supabase desde cero

### 1. Crear el proyecto

1. Entra a https://supabase.com/dashboard → **New project**.
2. Elige organización, nombre (ej. `puerto-chancay-simulador`), contraseña de
   base de datos (guárdala, la pide el CLI) y región (la más cercana a Perú:
   `South America (São Paulo)`).
3. Espera 1-2 min a que se aprovisione.

### 2. Instalar el CLI de Supabase

```bash
npm install -g supabase
supabase login          # abre el navegador para autenticarte
```

### 3. Vincular este repo al proyecto

Desde la raíz del repo (donde está la carpeta `supabase/`):

```bash
supabase link --project-ref <tu-project-ref>
```

El `project-ref` está en la URL del dashboard: `https://supabase.com/dashboard/project/<project-ref>`.
Te pedirá la contraseña de base de datos del paso 1.

### 4. Aplicar las migraciones

```bash
supabase db push
```

Esto ejecuta en orden todos los archivos de `supabase/migrations/`
(`0001_master_data.sql` → `0005_rls.sql`) contra tu base de datos nueva.

### 5. Cargar los datos maestros (seed)

El seed no se aplica con `db push` (Supabase lo reserva para desarrollo local).
Para un proyecto remoto, ejecútalo directo con `psql`:

```bash
# La connection string está en: Project Settings → Database → Connection string (URI)
psql "postgresql://postgres:<tu-password>@db.<project-ref>.supabase.co:5432/postgres" \
  -f supabase/seed.sql
```

Alternativa sin instalar `psql`: pega el contenido de `supabase/seed.sql` en
el **SQL Editor** del dashboard de Supabase y ejecútalo ahí.

### 6. Activar autenticación (para guardar escenarios)

La tabla `scenarios` usa `auth.uid()` en sus políticas RLS, así que los
usuarios necesitan poder iniciar sesión:

1. Dashboard → **Authentication** → **Providers**.
2. Activa **Email** (o el proveedor que prefieras: Google, etc.).
3. Si usas Email, en **Authentication → Settings** puedes desactivar
   "Confirm email" mientras pruebas, para no depender de configurar SMTP.

### 7. Obtener las claves para el frontend

Dashboard → **Project Settings → API**:

- **Project URL** → va en `VITE_SUPABASE_URL`
- **anon public key** → va en `VITE_SUPABASE_ANON_KEY`

⚠️ Nunca copies la **service_role key** al frontend ni la subas a git — tiene
permisos de administrador y salta todas las políticas RLS.

---

## B. Conectar el frontend a un proyecto ya existente

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```bash
VITE_SUPABASE_URL=https://<tu-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<tu-anon-key>
```

Luego:

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

---

## Verificar que la conexión funciona

1. Abre la app (`npm run dev`), pestaña **Simulador**.
2. El selector "Planta destino" debería poblarse con Chancay/GH Chancay/Lurín.
   Si aparece vacío, revisa:
   - Que `supabase db push` se ejecutó sin error.
   - Que `seed.sql` se ejecutó (revisa en el dashboard → **Table Editor → plants** que haya 3 filas).
   - Que `.env.local` tiene la URL y anon key correctas (revisa la consola del navegador: si faltan, verás un `console.warn` explícito).
3. Corre una simulación. Si da error "No hay tarifa de transporte vigente...",
   revisa que `transport_rates` tenga filas para esa planta (Table Editor).
4. Para guardar un escenario necesitas estar autenticado — si no configuraste
   un provider de auth todavía, ese botón fallará con "Debes iniciar sesión".

---

## Aplicar cambios de esquema más adelante

Cuando agregues una migración nueva (ej. `0006_algo.sql`) en
`supabase/migrations/`:

```bash
supabase db push
```

Vuelve a aplicar solo lo que falte; es seguro correrlo varias veces porque
todas las migraciones usan `create table if not exists` / `on conflict do nothing`.

## Levantar el mismo esquema en OTRO proyecto Supabase

Todo el esquema vive en `supabase/migrations/` y `supabase/seed.sql`, sin
ninguna referencia hardcodeada al proyecto original. Para clonarlo:

```bash
supabase link --project-ref <otro-project-ref>
supabase db push
psql "<connection-string-del-otro-proyecto>" -f supabase/seed.sql
```
