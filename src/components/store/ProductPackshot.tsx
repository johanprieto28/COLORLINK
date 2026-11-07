import React, { useId } from 'react';
import type { CategoriaProducto, Producto } from '../../types';

/**
 * Ilustración del empaque del producto (lata, cuñete, tarro, herramientas…).
 * Se usa cuando el producto no tiene foto propia: todas las tarjetas se ven
 * coherentes y la etiqueta muestra el color, el nombre y la presentación reales.
 */

export const CATEGORY_ACCENT: Record<CategoriaProducto, string> = {
  INTERIOR: '#08B6CC',
  EXTERIOR: '#1E3A5F',
  HUMEDAD: '#2E7D8C',
  FISURAS: '#C9963B',
  PREPARACION: '#738996',
  HERRAMIENTAS: '#155EEF',
  DECORATIVOS: '#B08D57',
};

type Envase = 'galon' | 'cunete' | 'tarro' | 'litro' | 'rollo' | 'rodillo' | 'brocha' | 'kit';

export function envaseDe(p: Pick<Producto, 'nombre' | 'presentacion' | 'categoria'>): Envase {
  const n = `${p.nombre} ${p.presentacion}`.toLowerCase();
  if (p.categoria === 'HERRAMIENTAS') {
    if (n.includes('kit')) return 'kit';
    if (n.includes('brocha')) return 'brocha';
    if (n.includes('rodillo')) return 'rodillo';
  }
  if (n.includes('rollo') || n.includes('malla') || n.includes('cinta')) return 'rollo';
  if (n.includes('cuñete') || n.includes('cunete')) return 'cunete';
  if (n.includes('tarro') || /\bkg\b/.test(n)) return 'tarro';
  if (n.includes('litro') || n.includes('cuarto')) return 'litro';
  return 'galon';
}

function luminance(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length !== 6) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Nombre corto para la etiqueta (sin la palabra de categoría al inicio), en máximo 2 líneas */
function etiquetaLineas(nombre: string): string[] {
  const corto = nombre.replace(/^(pintura (interior|para fachadas|decorativa)|acabado decorativo|impermeabilizante)\s+/i, '');
  const palabras = corto.split(/\s+/);
  const lineas: string[] = [''];
  for (const w of palabras) {
    const actual = lineas[lineas.length - 1];
    if ((actual + ' ' + w).trim().length > 14 && actual) {
      if (lineas.length === 2) {
        lineas[1] = `${actual}…`;
        break;
      }
      lineas.push(w);
    } else {
      lineas[lineas.length - 1] = (actual + ' ' + w).trim();
    }
  }
  return lineas;
}

export const ProductPackshot: React.FC<{ producto: Producto; className?: string }> = ({ producto, className = '' }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const color = producto.color_hex || CATEGORY_ACCENT[producto.categoria];
  const envase = envaseDe(producto);
  const textoSobreColor = luminance(color) > 0.6 ? '#092653' : '#FFFFFF';
  const lineas = etiquetaLineas(producto.nombre);
  const presentacion = producto.presentacion.replace(/\s*\(.*\)/, '');

  const metal = `metal-${uid}`;
  const plastico = `plastico-${uid}`;
  const sombra = `sombra-${uid}`;

  const Etiqueta = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill="#FFFFFF" />
      <rect x={x} y={y} width={w} height={h * 0.3} rx="3" fill={color} />
      <rect x={x} y={y + h * 0.3 - 3} width={w} height="3" fill={color} />
      <text x={x + w / 2} y={y + h * 0.2} textAnchor="middle" fontSize={h * 0.11} fontWeight="800" fill={textoSobreColor} fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="0.4">
        COLORLINK
      </text>
      {lineas.map((l, i) => (
        <text
          key={i}
          x={x + w / 2}
          y={y + h * (0.47 + i * 0.16)}
          textAnchor="middle"
          fontSize={h * 0.125}
          fontWeight="700"
          fill="#092653"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {l}
        </text>
      ))}
      <text x={x + w / 2} y={y + h * 0.9} textAnchor="middle" fontSize={h * 0.095} fill="#5b6475" fontFamily="DM Sans, sans-serif">
        {presentacion}
      </text>
    </g>
  );

  const defs = (
    <defs>
      <linearGradient id={metal} x1="0" x2="1">
        <stop offset="0" stopColor="#9aa3ad" />
        <stop offset="0.18" stopColor="#e9edf1" />
        <stop offset="0.5" stopColor="#c3cad2" />
        <stop offset="0.82" stopColor="#f3f5f7" />
        <stop offset="1" stopColor="#8d96a0" />
      </linearGradient>
      <linearGradient id={plastico} x1="0" x2="1">
        <stop offset="0" stopColor="#dfe4ea" />
        <stop offset="0.25" stopColor="#ffffff" />
        <stop offset="0.75" stopColor="#f4f6f8" />
        <stop offset="1" stopColor="#cfd6dd" />
      </linearGradient>
      <radialGradient id={sombra}>
        <stop offset="0" stopColor="#092653" stopOpacity="0.22" />
        <stop offset="1" stopColor="#092653" stopOpacity="0" />
      </radialGradient>
    </defs>
  );

  const piso = <ellipse cx="100" cy="174" rx="62" ry="9" fill={`url(#${sombra})`} />;

  let cuerpo: React.ReactNode;
  switch (envase) {
    case 'cunete':
      cuerpo = (
        <>
          <path d="M50 52 Q100 18 150 52" fill="none" stroke="#9aa3ad" strokeWidth="3" />
          <path d="M46 56 H154 L146 170 H54 Z" fill={`url(#${plastico})`} stroke="#c3cad2" />
          <rect x="42" y="48" width="116" height="12" rx="4" fill="#eef1f4" stroke="#c3cad2" />
          <rect x="47" y="64" width="106" height="4" fill={color} opacity="0.85" />
          <Etiqueta x={58} y={78} w={84} h={72} />
        </>
      );
      break;
    case 'tarro':
      cuerpo = (
        <>
          <path d="M52 98 H148 L143 168 H57 Z" fill={`url(#${plastico})`} stroke="#c3cad2" />
          <rect x="48" y="86" width="104" height="16" rx="5" fill={color} />
          <Etiqueta x={62} y={110} w={76} h={52} />
        </>
      );
      break;
    case 'litro':
      cuerpo = (
        <>
          <rect x="68" y="88" width="64" height="80" rx="4" fill={`url(#${metal})`} />
          <ellipse cx="100" cy="88" rx="32" ry="6" fill="#d9dee4" stroke="#9aa3ad" />
          <Etiqueta x={71} y={100} w={58} h={60} />
        </>
      );
      break;
    case 'rollo':
      cuerpo = (
        <>
          <rect x="44" y="96" width="112" height="56" rx="6" fill="#f6f2e8" stroke="#d8d0bd" />
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={i} x1={48 + i * 8.5} y1="98" x2={48 + i * 8.5} y2="150" stroke="#d8d0bd" strokeWidth="1" />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={`h${i}`} x1="46" y1={102 + i * 9} x2="154" y2={102 + i * 9} stroke="#d8d0bd" strokeWidth="1" />
          ))}
          <ellipse cx="156" cy="124" rx="10" ry="28" fill="#ece5d4" stroke="#d8d0bd" />
          <ellipse cx="156" cy="124" rx="4" ry="10" fill="#bfb59f" />
          <rect x="70" y="112" width="60" height="24" rx="3" fill={color} />
          <text x="100" y="128" textAnchor="middle" fontSize="9" fontWeight="800" fill={textoSobreColor} fontFamily="Plus Jakarta Sans, sans-serif">
            COLORLINK
          </text>
        </>
      );
      break;
    case 'rodillo':
      cuerpo = (
        <>
          <rect x="52" y="58" width="96" height="34" rx="16" fill={color} />
          <rect x="52" y="58" width="96" height="34" rx="16" fill="#ffffff" opacity="0.18" />
          <path d="M148 75 H160 V112 H100 V128" fill="none" stroke="#9aa3ad" strokeWidth="5" strokeLinejoin="round" />
          <rect x="91" y="126" width="18" height="44" rx="8" fill="#092653" />
          <rect x="94" y="132" width="3" height="30" rx="1.5" fill="#ffffff" opacity="0.25" />
        </>
      );
      break;
    case 'brocha':
      cuerpo = (
        <g transform="rotate(-18 100 110)">
          <path d="M72 120 H128 L124 168 Q100 176 76 168 Z" fill="#e8d5b5" />
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1={79 + i * 5.3} y1="124" x2={80 + i * 5} y2="168" stroke="#cdb48b" strokeWidth="1" />
          ))}
          <rect x="70" y="102" width="60" height="20" rx="3" fill={`url(#${metal})`} />
          <path d="M84 102 Q86 52 100 40 Q114 52 116 102 Z" fill={color} />
          <circle cx="100" cy="56" r="4" fill="#FAFAF7" />
        </g>
      );
      break;
    case 'kit':
      cuerpo = (
        <>
          <path d="M34 150 L60 100 H164 L150 150 Z" fill="#dfe4ea" stroke="#9aa3ad" />
          <path d="M62 106 H156 L146 144 H46 Z" fill="#c3cad2" />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={70 + i * 20} y1="110" x2={62 + i * 20} y2="140" stroke="#aab3bd" strokeWidth="3" />
          ))}
          <rect x="74" y="56" width="70" height="24" rx="11" fill={CATEGORY_ACCENT.HERRAMIENTAS} />
          <path d="M144 68 H154 V92 H112 V104" fill="none" stroke="#9aa3ad" strokeWidth="4" />
          <g transform="rotate(25 150 120)">
            <rect x="140" y="94" width="20" height="10" rx="2" fill={`url(#${metal})`} />
            <path d="M143 94 Q145 70 150 62 Q155 70 157 94 Z" fill="#C9963B" />
            <path d="M140 104 H160 L158 122 H142 Z" fill="#e8d5b5" />
          </g>
          <circle cx="54" cy="70" r="13" fill="#f3efe4" stroke="#d8d0bd" strokeWidth="5" />
        </>
      );
      break;
    default:
      cuerpo = (
        <>
          <path d="M60 66 Q100 26 140 66" fill="none" stroke="#9aa3ad" strokeWidth="3" />
          <rect x="56" y="66" width="88" height="102" rx="5" fill={`url(#${metal})`} />
          <ellipse cx="100" cy="66" rx="44" ry="8" fill="#e3e7ec" stroke="#9aa3ad" />
          <ellipse cx="100" cy="66" rx="34" ry="5" fill="#cfd5dc" />
          <rect x="56" y="158" width="88" height="4" fill="#9aa3ad" opacity="0.5" />
          <Etiqueta x={60} y={82} w={80} h={72} />
        </>
      );
  }

  return (
    <svg viewBox="22 18 156 166" role="img" aria-label={`${producto.nombre}, ${producto.presentacion}`} className={className}>
      {defs}
      {piso}
      {cuerpo}
    </svg>
  );
};
