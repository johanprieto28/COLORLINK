-- ==============================================================================
-- COLORLINK · Fotos de producto del catálogo
--
-- Las imágenes viven en public/productos/<carpeta>/<slug>.webp y el servidor las
-- publica en /productos/... junto con el frontend.
-- Solo se asigna la foto si el producto no tiene una o si ya tenía una de este
-- mismo catálogo: no reemplaza las fotos subidas desde Panel → Inventario.
-- Los productos sin foto siguen mostrando la ilustración del empaque.
-- Idempotente.
-- ==============================================================================

update public.productos p
   set imagen_url = v.url
  from (values
    ('pintura-interior-marfil-luz-galon',      '/productos/pinturas/pintura-interior-marfil-luz-galon.webp'),
    ('pintura-interior-verde-salvia-galon',    '/productos/pinturas/pintura-interior-verde-salvia-galon.webp'),
    ('pintura-interior-blanco-algodon-cunete', '/productos/pinturas/pintura-interior-blanco-algodon-cunete.webp'),
    ('pintura-interior-terracota-galon',       '/productos/pinturas/pintura-interior-terracota-galon.webp'),
    ('pintura-exterior-piedra-serena-galon',   '/productos/pinturas/pintura-exterior-piedra-serena-galon.webp'),
    ('pintura-exterior-azul-profundo-galon',   '/productos/pinturas/pintura-exterior-azul-profundo-galon.webp'),
    ('pintura-exterior-blanco-cunete',         '/productos/pinturas/pintura-exterior-blanco-cunete.webp'),
    ('pintura-pisos-canchas-gris',             '/productos/pinturas/pintura-pisos-canchas-gris.webp'),

    ('impermeabilizante-acrilico-cubiertas',   '/productos/impermeabilizantes/impermeabilizante-acrilico-cubiertas.webp'),
    ('sellador-antihumedad-muros',             '/productos/impermeabilizantes/sellador-antihumedad-muros.webp'),
    ('hidrofugo-fachadas-ladrillo',            '/productos/impermeabilizantes/hidrofugo-fachadas-ladrillo.webp'),

    ('masilla-flexible-fisuras',               '/productos/reparacion/masilla-flexible-fisuras.webp'),
    ('malla-refuerzo-fisuras',                 '/productos/reparacion/malla-refuerzo-fisuras.webp'),

    ('estuco-plastico-interior',               '/productos/preparacion/estuco-plastico-interior.webp'),
    ('sellador-imprimante-acrilico',           '/productos/preparacion/sellador-imprimante-acrilico.webp'),
    ('lija-agua-150-pliego',                   '/productos/preparacion/lija-agua-150-pliego.webp'),
    ('anticorrosivo-gris-galon',               '/productos/preparacion/anticorrosivo-gris-galon.webp'),

    ('rodillo-felpa-9-pulgadas',               '/productos/herramientas/rodillo-felpa-9-pulgadas.webp'),
    ('brocha-profesional-3-pulgadas',          '/productos/herramientas/brocha-profesional-3-pulgadas.webp'),
    ('kit-pintura-completo',                   '/productos/herramientas/kit-pintura-completo.webp'),
    ('cinta-enmascarar-1-pulgada',             '/productos/herramientas/cinta-enmascarar-1-pulgada.webp'),

    ('acabado-decorativo-mineral',             '/productos/decorativos/acabado-decorativo-mineral.webp'),
    ('pintura-decorativa-metalizada',          '/productos/decorativos/pintura-decorativa-metalizada.webp'),
    ('esmalte-sintetico-blanco-galon',         '/productos/decorativos/esmalte-sintetico-blanco-galon.webp')
  ) as v(slug, url)
 where p.slug = v.slug
   and (p.imagen_url is null or p.imagen_url = '' or p.imagen_url like '/productos/%');
