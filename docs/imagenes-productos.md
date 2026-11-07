# Imágenes de producto para COLORLINK (generadas con Gemini)

## Especificaciones

| Parámetro | Valor |
|---|---|
| Formato de la imagen | **Cuadrado 1:1** (las tarjetas y la ficha del producto son cuadradas) |
| Tamaño | **1024 × 1024 px** como mínimo (lo que entrega Gemini). Si da más, mejor |
| Fondo | Liso, **blanco cálido `#FAFAF7`** (el mismo de la tienda), sin textura ni objetos |
| Encuadre | Producto centrado, ocupando ~70 % del alto, con aire alrededor (la tarjeta recorta un poco los bordes) |
| Luz | Estudio suave, sombra de contacto debajo del producto |
| Archivo que me entregas | PNG o JPG; yo lo convierto a WebP (~100–150 KB) |

## Dónde guardarlas

Guárdalas en `COLORLINK/public/productos/<carpeta>/<nombre>.png` con **exactamente** estos nombres:

| Carpeta | Categoría de la tienda |
|---|---|
| `pinturas/` | Pintura para interiores y exteriores |
| `impermeabilizantes/` | Humedad e impermeabilización |
| `reparacion/` | Reparación de fisuras |
| `preparacion/` | Preparación de superficies |
| `herramientas/` | Herramientas y accesorios |
| `decorativos/` | Acabados decorativos |

Cuando estén, avísame: las convierto a WebP y creo la migración que llena `imagen_url` de cada producto.

## Cómo lograr que todas se vean de la misma familia

1. Genera primero **Marfil Luz** con el prompt base + su línea.
2. Para las demás, **adjunta esa primera imagen** en Gemini y empieza el mensaje con:
   > Usa la imagen adjunta como referencia de estilo: mismo fondo, misma luz, mismo ángulo de cámara, mismo diseño de etiqueta y mismo tamaño del producto en el encuadre. Solo cambia lo siguiente:
3. Si una etiqueta sale con letras deformes, pide: *"Regenera con el texto de la etiqueta exactamente: …"*. Mientras más corto el texto, mejor queda.

## Prompt base (va siempre primero)

```
Fotografía de producto de estudio para tienda en línea, estilo premium y limpio.
Formato cuadrado 1:1, 1024x1024.
Fondo liso de color blanco cálido (#FAFAF7), sin textura, sin degradados marcados, sin otros objetos.
Producto centrado, ocupando aproximadamente el 70% del alto de la imagen, con margen amplio a los lados.
Cámara frontal ligeramente elevada (unos 15 grados). Iluminación suave tipo softbox desde arriba a la izquierda,
sombra de contacto suave debajo del producto. Enfoque nítido, alta resolución, colores fieles.
Etiqueta de la marca COLORLINK: fondo blanco, franja superior azul marino (#092653), línea fina turquesa (#08B6CC),
logotipo "COLORLINK" en azul marino con "LINK" en turquesa.
Sin marcas de agua, sin texto fuera del producto, sin manos ni personas.
```

## Línea específica por producto

Pega el prompt base y, debajo, la línea del producto.

### `pinturas/`

| Archivo | Línea para el prompt |
|---|---|
| `pintura-interior-marfil-luz-galon.png` | Galón plástico blanco de pintura de 3,78 L con asa metálica. Etiqueta: "Vinilo Tipo 1 · Marfil Luz · Mate". Franja de muestra de color marfil (#F4EFE6) en la etiqueta y una pequeña pincelada del mismo color sobre la tapa. |
| `pintura-interior-verde-salvia-galon.png` | Galón plástico blanco de 3,78 L con asa metálica. Etiqueta: "Vinilo Tipo 1 · Verde Salvia · Mate". Franja de muestra verde salvia (#96AD98) en la etiqueta y pincelada del mismo color sobre la tapa. |
| `pintura-interior-blanco-algodon-cunete.png` | Cuñete plástico grande de 18,9 L (5 galones) con asa. Etiqueta: "Vinilo Tipo 1 · Blanco Algodón · Mate". Franja de muestra blanco algodón (#FAF7F2). |
| `pintura-interior-terracota-galon.png` | Galón plástico blanco de 3,78 L con asa. Etiqueta: "Vinilo Satinado · Terracota". Franja de muestra terracota (#C66B53) y pincelada del mismo color sobre la tapa. |
| `pintura-exterior-piedra-serena-galon.png` | Galón de 3,78 L con asa. Etiqueta: "Fachadas · Piedra Serena · Mate", con un ícono pequeño de sol y lluvia. Franja de muestra gris piedra (#D8D2C5). |
| `pintura-exterior-azul-profundo-galon.png` | Galón de 3,78 L con asa. Etiqueta: "Fachadas · Azul Profundo · Satinado", con ícono de sol y lluvia. Franja de muestra azul profundo (#1E3A5F). |
| `pintura-exterior-blanco-cunete.png` | Cuñete grande de 18,9 L con asa. Etiqueta: "Fachadas · Blanco Intemperie · Mate", con ícono de sol y lluvia. Franja de muestra blanca (#FAFAF7) con borde gris claro para que se distinga. |
| `pintura-pisos-canchas-gris.png` | Galón de 3,78 L con asa. Etiqueta: "Pisos y Canchas · Gris · Satinado". Franja de muestra gris (#7A828A). |

### `impermeabilizantes/`

| Archivo | Línea para el prompt |
|---|---|
| `impermeabilizante-acrilico-cubiertas.png` | Cuñete grande de 18,9 L con asa. Etiqueta: "Impermeabilizante Acrílico · Techos", con ícono de gota de agua y techo. Franja gris muy claro (#E9ECEF). |
| `sellador-antihumedad-muros.png` | Galón de 3,78 L con asa. Etiqueta: "Sellador Antihumedad · Muros", con ícono de gota tachada. Sin muestra de color (producto transparente): franja turquesa. |
| `hidrofugo-fachadas-ladrillo.png` | Galón de 3,78 L con asa. Etiqueta: "Hidrófugo Transparente · Ladrillo", con ícono de gota que rebota. A un lado, un ladrillo pequeño con gotas de agua perladas sobre su superficie. |

### `reparacion/`

| Archivo | Línea para el prompt |
|---|---|
| `masilla-flexible-fisuras.png` | Tarro plástico pequeño y bajo de 1 kg con tapa a rosca. Etiqueta: "Masilla Elástica · Fisuras · 1 kg". A un lado, una espátula pequeña con un poco de masilla blanca. |
| `malla-refuerzo-fisuras.png` | Rollo de malla de fibra de vidrio blanca de 5 cm de ancho, con el extremo desenrollado mostrando la trama cuadriculada. Etiqueta envolvente en el rollo: "Malla de Refuerzo · 20 m". |

### `preparacion/`

| Archivo | Línea para el prompt |
|---|---|
| `estuco-plastico-interior.png` | Cuñete grande de 27 kg con asa. Etiqueta: "Estuco Plástico · Listo para usar · 27 kg". |
| `sellador-imprimante-acrilico.png` | Galón de 3,78 L con asa. Etiqueta: "Sellador Acrílico · Muros". Franja turquesa (producto transparente). |
| `lija-agua-150-pliego.png` | Pliego de lija de agua negra de 23 × 28 cm, ligeramente curvado, con el reverso impreso "COLORLINK · Grano 150". |
| `anticorrosivo-gris-galon.png` | Galón metálico de 3,78 L con asa. Etiqueta: "Anticorrosivo · Gris · Metal". Franja de muestra gris (#8E959C). |

### `herramientas/`

En herramientas no hay etiqueta grande: la marca va discreta en el mango.

| Archivo | Línea para el prompt |
|---|---|
| `rodillo-felpa-9-pulgadas.png` | Rodillo de pintura profesional de 9 pulgadas con felpa blanca nueva, marco metálico y mango ergonómico azul marino (#092653) con anillo turquesa (#08B6CC) y la palabra "COLORLINK" pequeña en el mango. Vista en diagonal. |
| `brocha-profesional-3-pulgadas.png` | Brocha profesional de 3 pulgadas con cerdas claras nuevas, virola metálica plateada y mango azul marino (#092653) con detalle turquesa (#08B6CC) y "COLORLINK" pequeño grabado. Vista en diagonal. |
| `kit-pintura-completo.png` | Kit de 5 piezas ordenado en composición: bandeja de pintura blanca, rodillo de 9" con mango azul marino, brocha de 3", rollo de cinta de enmascarar y pliego de lija. Detalles turquesa (#08B6CC). Vista superior en ángulo de 30 grados. |
| `cinta-enmascarar-1-pulgada.png` | Rollo de cinta de enmascarar color crema de 1 pulgada, con el núcleo de cartón impreso "COLORLINK" y un tramo corto desenrollado. |

### `decorativos/`

| Archivo | Línea para el prompt |
|---|---|
| `acabado-decorativo-mineral.png` | Galón de 3,78 L con asa. Etiqueta: "Efecto Piedra · Texturizado". A un lado, una pequeña muestra cuadrada de pared con textura mineral en tono (#9C8F80). |
| `pintura-decorativa-metalizada.png` | Lata metálica pequeña de 1 litro. Etiqueta: "Metalizada · Oro". Franja de muestra dorada metalizada (#B08D57) con brillo sutil. |
| `esmalte-sintetico-blanco-galon.png` | Galón metálico de 3,78 L con asa. Etiqueta: "Esmalte Sintético · Blanco Brillante". Pincelada blanca brillante sobre la tapa que refleje la luz. |
