import express from 'express';
import http from 'http';
import path from 'path';
import { config } from './server/config';
import { optionalAuth } from './server/auth';
import { errorMiddleware, handler } from './server/http';
import { geminiStatus } from './server/ai';
import { emailStatus } from './server/email';
import { cuentaRouter } from './server/routes/cuenta';
import { iaRouter } from './server/routes/ia';
import { panelRouter, estadoSupabase } from './server/routes/panel';
import { pedidosRouter } from './server/routes/pedidos';
import { proyectosRouter } from './server/routes/proyectos';
import { registroRouter } from './server/routes/registro';
import { ciudadesRouter } from './server/ciudades';
import { coloresRouter } from './server/routes/colores';
import { tiendaRouter } from './server/routes/tienda';

const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');

// 12 MB: una imagen de 8 MB en base64 ocupa ~10,7 MB
app.use('/api', express.json({ limit: '12mb' }));
app.use('/api', optionalAuth);

app.get(
  '/api/salud',
  handler(async (_req, res) => {
    const supabase = await estadoSupabase();
    res.json({
      ok: supabase.ok,
      supabase,
      gemini: geminiStatus(),
      correo: { ok: emailStatus().ok, proveedor: emailStatus().proveedor },
    });
  })
);

/** Configuración pública que el frontend necesita (nunca secretos) */
app.get('/api/config', (_req, res) => {
  res.json({
    envioGratisDesde: config.envioGratisDesde,
    costoEnvio: config.costoEnvio,
    supabaseUrl: config.supabaseUrl,
    supabasePublishableKey: config.supabasePublishableKey,
  });
});

app.use('/api', tiendaRouter);
app.use('/api', cuentaRouter);
app.use('/api', registroRouter);
app.use('/api', ciudadesRouter);
app.use('/api', coloresRouter);
app.use('/api', pedidosRouter);
app.use('/api', proyectosRouter);
app.use('/api', panelRouter);
app.use('/api', iaRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada.' });
});
app.use('/api', errorMiddleware);

async function startServer() {
  const httpServer = http.createServer(app);

  if (!config.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    app.use(express.static(distPath, { maxAge: '7d', index: false }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`COLORLINK disponible en http://localhost:${config.port}`);
  });
}

startServer();
