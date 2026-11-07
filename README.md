# COLORLINK

Tienda de pinturas y recubrimientos con asesoría de color, asistente con IA y gestión de proyectos técnicos por roles.

## Arquitectura

```
Navegador (React + Vite)  ──►  Backend Express (server.ts + server/)  ──►  Supabase (Postgres, Auth, Storage)
       │                                │                                  Gemini (asistente y diagnóstico)
       └── Supabase Auth (solo sesión)  └── valida sesión y rol en cada      Gmail (correos)
                                            petición antes de tocar datos
```

- **Todos los datos viven en Supabase.** El navegador no guarda pedidos, proyectos, carritos ni favoritos en `localStorage`; solo el borrador del formulario de proyecto (por pestaña) y el id de la conversación con la IA.
- El **rol** de cada usuario está en `public.perfiles` y solo lo cambia un administrador. Quien se registra entra como `cliente`.
- Las operaciones críticas (crear pedido y descontar stock, cancelar y devolver stock, recibir abastecimiento, crear proyecto completo) son **transacciones en PostgreSQL** (`supabase/migrations/001_esquema_colorlink.sql`).

## Puesta en marcha

1. **Instalar dependencias**: `npm install`
2. **Crear el proyecto en Supabase** y, en *SQL Editor*, ejecutar en orden:
   - `supabase/migrations/001_esquema_colorlink.sql` (tablas, funciones, RLS y buckets de Storage)
   - `supabase/migrations/002_catalogo_inicial.sql` (productos de la tienda)
   - `supabase/migrations/003_migrar_tablas_antiguas.sql` *(opcional: solo si ya tenías datos en las tablas `cliente` / `proyecto` de la versión anterior)*
   - `supabase/migrations/004_seguridad.sql` (cierra la lectura pública de las tablas antiguas y del costo de los productos)
   - `supabase/migrations/005_reparar_areas_migradas.sql` *(solo si ejecutaste una versión anterior de la 003)*
   - `supabase/migrations/006_catalogo_detallado.sql` (ficha técnica, catálogo ampliado y precios actualizados)
   - `supabase/migrations/007_validacion_clasificacion.sql` (reporte de validación automática y clasificación con IA)
   - `supabase/migrations/008_registro_otp.sql` (código de verificación por correo antes del registro)
   - `supabase/migrations/009_imagenes_productos.sql` (asigna las fotos de `public/productos/` a cada producto)
   - `supabase/migrations/010_ciudades_registro.sql` (catálogo de ciudades para los selectores y tipo de documento)
   - `supabase/migrations/011_pedidos_seguimiento.sql` (transportadora, número de guía, historial y notas internas de pedidos)
   - `supabase/migrations/012_colores_stock.sql` (paleta de colores con stock en galones, selección de máximo 2 colores por proyecto y descuento al aprobar)
3. **Configurar variables**: copiar `.env.example` a `.env` y completar las claves de Supabase, Gemini y Gmail.
4. **Supabase Auth** → *URL Configuration*: agregar la URL de la app (por ejemplo `http://localhost:3000`) como *Site URL* y *Redirect URL*.
5. **Crear el primer administrador**: registrarse en la app y luego, en el SQL Editor:
   ```sql
   update public.perfiles set rol = 'administrador' where email = 'tu-correo@dominio.com';
   ```
   Desde ese momento los demás roles se asignan en **Panel → Usuarios y roles**.
6. **Ejecutar**: `npm run dev` → http://localhost:3000

Producción: `npm run produccion` (compila y arranca). Ver **Despliegue** más abajo.

## Roles

| Rol | Qué puede hacer |
|---|---|
| Cliente | Comprar, ver/cancelar sus pedidos, guardar colores, crear proyectos, subir fotos, aprobar o rechazar cotizaciones |
| Técnico | Tomar proyectos, generar/validar diagnóstico, definir la solución técnica, registrar calidad |
| Comercial | Clientes, cotizaciones (crear, editar, enviar), gestión de pedidos |
| Operaciones | Inventario y ajustes de stock, abastecimiento, pedidos, programar y ejecutar servicios, calidad |
| Administrador | Todo lo anterior + usuarios/roles y estado del sistema (Supabase, Gemini, correo, registros) |

## Entregables del MVP: captura, validación y clasificación

**Regla de oro:** primero capturar datos confiables, luego validarlos automáticamente y solo después usar IA para interpretar la información no estructurada.

1. **Captura inteligente** (`NewProjectWizard`, `POST /api/proyectos`): formulario guiado de 5 pasos con cliente, ciudad, tipo de proyecto, área en m², superficie, condición (humedad, fisuras, desgaste), ambiente, color, fecha requerida, descripción, fotos y documentos PDF, consentimiento y canal de origen. Cada proyecto recibe un código único (`CLK-AAAA-0001`).
2. **Validación automática** (`server/validacion.ts`, `POST /api/proyectos/validar`): revisa **completitud**, **formato**, **coherencia** (fecha viable según el área, unidades, superficie frente a ambiente, texto frente a condiciones marcadas), **duplicidad** (solicitudes parecidas del mismo cliente en 180 días) y **trazabilidad** (quién, cuándo, desde qué canal e IP). Los errores bloquean el registro (HTTP 422). Las advertencias quedan en `proyectos.validacion` y en el historial.
3. **Clasificación con IA** (`server/ai.ts`): Gemini recibe el caso junto con hasta 4 fotos o PDF, extrae el texto legible y devuelve un JSON con `categoria`, `condicion`, `complejidad`, `confianza`, `textoExtraido` y `hallazgosVisuales` (se guarda en `diagnosticos.clasificacion`). Gemini **no calcula cantidades de pintura**: las calcula el motor técnico a partir del área, las manos y el rendimiento. Sin Gemini, el motor de reglas clasifica con una confianza baja.

## Flujo de un proyecto

Recibido → En análisis → Validación técnica → Solución propuesta → Cotización → Aprobado → (Abastecimiento) → Servicio programado → En ejecución → Control de calidad → Cerrado. Cada cambio queda en el historial y se notifica al cliente por correo.

## Asistente COLORLINK IA

`POST /api/ia/chat` envía a Gemini un contexto cerrado: catálogo real (precios y stock), paleta de colores, reglas de la tienda y, si hay sesión, los proyectos, pedidos y carrito del usuario. Tiene instrucciones para responder **solo** sobre COLORLINK, no inventar productos ni precios y rechazar temas ajenos. Las acciones que propone se validan en el servidor (solo slugs y colores existentes). Todas las conversaciones se guardan en `conversaciones_ia`. Sin `GEMINI_API_KEY` responde con orientación básica por palabras clave.

## Correos (Gmail / Google Workspace)

1. En la cuenta de Google que enviará los correos, activa la **verificación en 2 pasos**.
2. Crea una **contraseña de aplicación** en https://myaccount.google.com/apppasswords (16 letras).
3. En `.env`: `EMAIL_PROVIDER="gmail"`, `GMAIL_USER` y `GMAIL_APP_PASSWORD`.

Se puede enviar a cualquier destinatario. Límite aproximado de Google: ~500 correos/día con Gmail gratuito y ~2.000/día con Workspace. Para que los correos lleguen con el dominio de la empresa (p. ej. `ventas@colorlink.com.co`) usa una cuenta de Google Workspace de ese dominio.

**Correos de inicio de sesión** (confirmar cuenta, recuperar contraseña): los envía Supabase, no la app. En Supabase → *Authentication → Emails → SMTP Settings* activa *Custom SMTP* con: host `smtp.gmail.com`, puerto `465`, usuario = tu Gmail, contraseña = la contraseña de aplicación. Sin esto Supabase limita mucho esos envíos.

Cada correo (o intento) queda registrado en la tabla `correos_enviados`. Para cambiar de proveedor basta con agregar un caso en `deliver()` de `server/email.ts` (Resend ya está implementado).

## Publicar el proyecto

### Opción recomendada · Servidor Ubuntu con Docker Compose

1. **Instala Docker** en el servidor (una sola vez):
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER && newgrp docker
   ```
2. **Sube el proyecto** al servidor (`git clone …` o `scp -r COLORLINK usuario@servidor:~/`) y crea el `.env` a partir de `.env.example`. La imagen no lleva secretos: el `.env` se lee al arrancar.
3. **Arranca con un link público** (HTTPS gratis por Cloudflare, sin dominio ni abrir puertos):
   ```bash
   cd COLORLINK
   docker compose --profile tunel up -d --build
   docker compose logs cloudflared | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com'
   ```
   Ese es el link para compartir. **Cambia cada vez que se reinicia el túnel**; para un link fijo usa la opción con dominio de abajo.
4. Pon la URL en `APP_URL` del `.env` y en Supabase → *Authentication → URL Configuration* (*Site URL* y *Redirect URLs*). Luego aplica el cambio con `docker compose --profile tunel up -d app`. Así no se reinicia el túnel y el link se mantiene.

#### Link fijo con Tailscale Funnel (gratis, sin dominio ni abrir puertos)

El link queda así: `https://colorlink.<tu-red>.ts.net`. **No cambia aunque reinicies el servidor.**

1. Crea una cuenta gratis en https://login.tailscale.com.
2. En el panel de Tailscale:
   - **DNS** → activa **MagicDNS** y **HTTPS Certificates**. Ahí ves el nombre de tu red (`tailXXXX.ts.net`). Con *Rename tailnet* puedes cambiarlo una vez por uno más amigable.
   - **Access controls**: Funnel debe estar permitido. En redes nuevas ya viene así. Si no, agrega `"nodeAttrs": [{"target": ["autogroup:member"], "attr": ["funnel"]}]` y guarda.
   - **Settings → Keys → Generate auth key**: copia la clave en `TS_AUTHKEY` del `.env`.
3. En el servidor:
   ```bash
   cd COLORLINK
   docker compose --profile funnel up -d --build
   docker compose exec tailscale tailscale funnel status     # muestra el link https://colorlink.….ts.net
   ```
   La primera vez el certificado HTTPS tarda 1 o 2 minutos.
4. En el panel de Tailscale → **Machines** → `colorlink` → menú **⋯** → **Disable key expiry**. Si no lo haces, la máquina se desconecta a los 180 días y el link deja de funcionar.
5. Pon el link en `APP_URL` del `.env` y en Supabase → *Authentication → URL Configuration*. Luego: `docker compose --profile funnel up -d app`.

Desde aquí, para publicar cambios: `git pull && docker compose --profile funnel up -d --build app`. El link se mantiene.

**Link fijo con tu dominio:** en Cloudflare → *Zero Trust → Networks → Tunnels*, crea un túnel tipo Docker, copia el token en `CLOUDFLARE_TUNNEL_TOKEN` del `.env` y, en *Public hostname*, apunta tu subdominio (p. ej. `colorlink.tudominio.com`) a `http://app:3000`. Arranca con `docker compose --profile tunel-fijo up -d --build`.

**Solo por IP** (sin túnel): `docker compose up -d --build` y abre `http://IP_DEL_SERVIDOR:3000` (permite el puerto con `sudo ufw allow 3000`).

Comandos útiles: `docker compose ps` (estado y salud), `docker compose logs -f app` (registros), `git pull && docker compose --profile tunel up -d --build app` (publicar cambios).

### Pruebas de QA

`npm run qa` ejecuta unas 135 pruebas de API. Cubren infraestructura, permisos, captura y validación, clasificación con IA, carrito, pedidos, stock y panel. Para probar el servidor publicado: `QA_BASE=https://tu-url npm run qa`. La batería crea un usuario y datos temporales en Supabase y los borra al terminar.

### Opción A · Google Cloud Run

Queda en internet con HTTPS, se apaga solo cuando nadie lo usa (nivel gratuito generoso) y permite enviar correos por Gmail.

1. Crea una cuenta en https://console.cloud.google.com, crea un proyecto y activa la facturación (no se cobra mientras estés dentro del nivel gratuito).
2. Instala Google Cloud CLI: https://cloud.google.com/sdk/docs/install y ejecuta:
   ```bash
   gcloud auth login
   gcloud config set project TU_ID_DE_PROYECTO
   ```
3. Desde la carpeta del proyecto:
   ```bash
   npm run env:cloudrun          # genera env.cloudrun.yaml a partir de tu .env (no se sube a git)
   gcloud run deploy colorlink --source . --region us-central1 --allow-unauthenticated --env-vars-file env.cloudrun.yaml
   ```
   La primera vez te pedirá activar algunas APIs: responde `Y`. Al terminar muestra la URL pública (`https://colorlink-xxxx.run.app`).
4. Pon esa URL en `APP_URL` del `.env` y repite el paso 3 (así los enlaces de los correos apuntan bien).
5. En Supabase → *Authentication → URL Configuration*: agrega la URL como *Site URL* y en *Redirect URLs*.

Para publicar cambios basta con repetir el comando `gcloud run deploy …`.

### Opción B · Desde tu PC o un servidor propio

Requisitos: **Node.js 20 o superior** y el archivo `.env` completo.

```bash
npm install
npm run produccion        # compila y arranca en http://localhost:3000
```

**Compartirlo rápido** (mientras tu PC esté encendido), con una URL pública temporal y HTTPS, sin abrir puertos: instala [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) y ejecuta en otra terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

**Dejarlo siempre encendido** en un servidor:

```bash
npm install -g pm2
npm run build
pm2 start server.ts --name colorlink --interpreter node --interpreter-args="--import tsx" -- --production
pm2 save
```

En cualquier caso, pon la URL pública en `APP_URL` y en Supabase → *Authentication → URL Configuration*.

## Pendiente / siguiente paso sugerido

- **Pasarela de pago en línea** (Wompi, Mercado Pago, PayU): el esquema ya admite `metodo_pago = 'PASARELA'` y `estado_pago`; falta integrar el proveedor elegido y su webhook.
