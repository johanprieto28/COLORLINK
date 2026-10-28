import React, { useId } from 'react';
import { ExplorerColorItem, getCategoryLabel } from '../../data/colorExplorerData';

interface PaintBucketPackshotProps {
  color: ExplorerColorItem;
  size?: 'card' | 'detail' | 'mini';
  className?: string;
}

/**
 * Calcula la luminancia relativa aproximada (0..1) de un color hexadecimal
 * para garantizar contraste nítido incluso en blancos cálidos o marfiles claros.
 */
function getHexLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return 0.5;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export const PaintBucketPackshot: React.FC<PaintBucketPackshotProps> = ({
  color,
  size = 'card',
  className = '',
}) => {
  const rawId = useId();
  const uid = `bkt-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const luminance = getHexLuminance(color.hex);
  const isVeryLight = luminance > 0.78;
  const isDark = luminance < 0.34;

  const sizeClasses =
    size === 'detail'
      ? 'w-56 sm:w-64 h-auto'
      : size === 'mini'
      ? 'w-24 sm:w-28 h-auto'
      : 'w-44 sm:w-48 h-auto';

  const familyLabel = getCategoryLabel(color.category);

  // Coordenadas estáticas de las estrías verticales en la falda de la tapa
  const lidRibXs = [
    70, 77, 84, 92, 100, 109, 118, 128, 138, 149, 160, 171, 182, 192, 202, 211, 220, 228, 236,
    243, 250,
  ];

  return (
    <div
      className={`relative select-none flex items-center justify-center ${sizeClasses} ${className}`}
    >
      <svg
        viewBox="0 0 320 316"
        className="w-full h-auto block overflow-visible"
        role="img"
        aria-label={`Recipiente ilustrativo COLORLINK en tono ${color.name} (${familyLabel})`}
      >
        <defs>
          {/* Sombra ambiental amplia sobre la mesa de estudio */}
          <radialGradient id={`${uid}-floor-ambient`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#092653" stopOpacity="0.16" />
            <stop offset="58%" stopColor="#092653" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#092653" stopOpacity="0" />
          </radialGradient>

          {/* Sombra de contacto firme justo bajo la base curva de la cubeta */}
          <radialGradient id={`${uid}-floor-contact`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#092653" stopOpacity="0.34" />
            <stop offset="65%" stopColor="#092653" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#092653" stopOpacity="0" />
          </radialGradient>

          {/* Iluminación cilíndrica de estudio para el cuerpo plástico blanco */}
          <linearGradient id={`${uid}-body-plastic`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#DCE3EE" />
            <stop offset="13%" stopColor="#F2F5FA" />
            <stop offset="28%" stopColor="#FFFFFF" />
            <stop offset="54%" stopColor="#F7F9FC" />
            <stop offset="82%" stopColor="#DEE5F0" />
            <stop offset="93%" stopColor="#CFD8E6" />
            <stop offset="100%" stopColor="#EDF1F7" />
          </linearGradient>

          {/* Iluminación cilíndrica para la falda de la tapa superior */}
          <linearGradient id={`${uid}-lid-skirt`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#D7DFEC" />
            <stop offset="16%" stopColor="#F4F7FB" />
            <stop offset="30%" stopColor="#FFFFFF" />
            <stop offset="58%" stopColor="#F5F8FC" />
            <stop offset="85%" stopColor="#D8E0ED" />
            <stop offset="95%" stopColor="#C9D3E3" />
            <stop offset="100%" stopColor="#EEF2F8" />
          </linearGradient>

          {/* Plano superior hundido de la tapa con luz suave lateral */}
          <linearGradient id={`${uid}-lid-top`} x1="12%" y1="15%" x2="88%" y2="85%">
            <stop offset="0%" stopColor="#E4EAF3" />
            <stop offset="45%" stopColor="#F8FAFD" />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>

          {/* Sombra proyectada debajo de la tapa y el anillo superior */}
          <linearGradient id={`${uid}-under-lid-shadow`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#092653" stopOpacity="0.2" />
            <stop offset="55%" stopColor="#092653" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#092653" stopOpacity="0" />
          </linearGradient>

          {/* Acabado metálico cepillado para el asa */}
          <linearGradient id={`${uid}-metal-wire`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94A3B8" />
            <stop offset="32%" stopColor="#E2E8F0" />
            <stop offset="68%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>

          {/* Capa de brillo especular y volumen 3D sobre la etiqueta y la franja de pintura */}
          <linearGradient id={`${uid}-label-3d-sheen`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#092653" stopOpacity="0.1" />
            <stop offset="12%" stopColor="#092653" stopOpacity="0.02" />
            <stop offset="28%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="44%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="65%" stopColor="#092653" stopOpacity="0" />
            <stop offset="86%" stopColor="#092653" stopOpacity="0.14" />
            <stop offset="95%" stopColor="#092653" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.16" />
          </linearGradient>

          {/* Recorte curvo exacto de la etiqueta comercial envolvente */}
          <clipPath id={`${uid}-label-clip`}>
            <path d="M 71 102 C 71 113, 249 113, 249 102 L 238 255 C 238 267, 82 267, 82 255 Z" />
          </clipPath>

          {/* Recorte de la falda de la tapa para las estrías */}
          <clipPath id={`${uid}-lid-skirt-clip`}>
            <path d="M 62 52 L 258 52 L 258 73 C 258 85, 62 85, 62 73 Z" />
          </clipPath>
        </defs>

        {/* ================================================================= */}
        {/* 1. SOMBRAS REALISTAS SOBRE SUPERFICIE DE ESTUDIO                  */}
        {/* ================================================================= */}
        <ellipse cx="160" cy="283" rx="98" ry="15" fill={`url(#${uid}-floor-ambient)`} />
        <ellipse cx="160" cy="278" rx="75" ry="9.5" fill={`url(#${uid}-floor-contact)`} />

        {/* ================================================================= */}
        {/* 2. ASA METÁLICA REPOSANDO HACIA ATRÁS Y OREJAS DE ANCLAJE         */}
        {/* ================================================================= */}
        {/* Arco posterior discreto del asa metálica (no tapa el logotipo) */}
        <path
          d="M 63 88 C 52 68, 86 38, 160 38 C 234 38, 268 68, 257 88"
          fill="none"
          stroke={`url(#${uid}-metal-wire)`}
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {/* Empuñadura ergonómica central en la parte superior trasera */}
        <rect
          x="136"
          y="34"
          width="48"
          height="7.5"
          rx="3.75"
          fill="#F8FAFC"
          stroke="#CBD5E1"
          strokeWidth="1.2"
        />

        {/* Orejas plásticas laterales donde engarza el asa */}
        <path
          d="M 68 80 L 60 82 C 58 83, 58 94, 61 95 L 69 96 Z"
          fill="#DDE4F0"
          stroke="#CBD5E1"
          strokeWidth="0.9"
        />
        <circle cx="63.5" cy="88.5" r="2.1" fill="#94A3B8" />

        <path
          d="M 252 80 L 260 82 C 262 83, 262 94, 259 95 L 251 96 Z"
          fill="#CFD8E6"
          stroke="#CBD5E1"
          strokeWidth="0.9"
        />
        <circle cx="256.5" cy="88.5" r="2.1" fill="#64748B" />

        {/* ================================================================= */}
        {/* 3. CUERPO CILÍNDRICO CÓNICO DE LA CUBETA                          */}
        {/* ================================================================= */}
        {/* Cuerpo principal desde el cuello hasta la base curva */}
        <path
          d="M 68 74 L 252 74 L 238 265 C 238 278, 82 278, 82 265 Z"
          fill={`url(#${uid}-body-plastic)`}
          stroke="#D5DCE8"
          strokeWidth="1"
        />

        {/* Reborde inferior plástico de apoyo */}
        <path
          d="M 82 262 C 82 275, 238 275, 238 262"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.65"
          strokeWidth="1.4"
        />

        {/* Anillo estructural superior (collarín de refuerzo bajo la tapa) */}
        <path
          d="M 65.5 82 C 65.5 93, 254.5 93, 254.5 82 L 253.5 91 C 253.5 102, 66.5 102, 66.5 91 Z"
          fill={`url(#${uid}-body-plastic)`}
          stroke="#D5DCE8"
          strokeWidth="0.8"
        />
        {/* Brillo en el filo del anillo estructural */}
        <path
          d="M 67 90.5 C 67 101, 253 101, 253 90.5"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.85"
          strokeWidth="1.2"
        />

        {/* Sombra proyectada por la tapa sobre el cuello de la cubeta */}
        <path
          d="M 67 73 L 253 73 L 252 87 C 252 97, 68 97, 68 87 Z"
          fill={`url(#${uid}-under-lid-shadow)`}
        />

        {/* ================================================================= */}
        {/* 4. ETIQUETA COMERCIAL ENVOLVENTE COLORLINK + MUESTRA DEL TONO     */}
        {/* ================================================================= */}
        <g clipPath={`url(#${uid}-label-clip)`}>
          {/* Fondo blanco limpio de la etiqueta comercial */}
          <rect x="65" y="96" width="190" height="176" fill="#FFFFFF" />

          {/* Línea superior sutil de identidad COLORLINK */}
          <path
            d="M 68 105 C 68 116, 252 116, 252 105"
            fill="none"
            stroke="#08B6CC"
            strokeWidth="2.4"
          />

          {/* Encabezado limpio con marca COLORLINK */}
          <g transform="translate(160, 129)">
            {/* Emblema geométrico de gota / prisma COLORLINK a la izquierda */}
            <g transform="translate(-58, -9)">
              <rect x="0" y="1" width="14" height="14" rx="4" fill="#092653" />
              <path d="M 7 3.2 L 11.2 9.5 A 4.2 4.2 0 1 1 2.8 9.5 Z" fill="#08B6CC" />
              <circle cx="9.8" cy="4.6" r="1.5" fill="#FFE34D" />
            </g>

            {/* Logotipo tipográfico COLORLINK */}
            <text
              x="7"
              y="3"
              textAnchor="middle"
              fill="#092653"
              fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
              fontWeight="800"
              fontSize="15.5"
              letterSpacing="0.8"
            >
              COLORLINK
            </text>

            {/* Subtítulo discreto de línea */}
            <text
              x="0"
              y="16.5"
              textAnchor="middle"
              fill="#64748B"
              fontFamily="'DM Sans', system-ui, sans-serif"
              fontWeight="600"
              fontSize="6.8"
              letterSpacing="1.5"
            >
              COLECCIÓN ARQUITECTÓNICA
            </text>
          </g>

          {/* Onda fluida de transición en azul/turquesa que enmarca la pintura */}
          <path
            d="M 66 164 C 112 149, 156 176, 254 155 L 254 162 C 156 183, 112 156, 66 171 Z"
            fill="#092653"
            fillOpacity={isVeryLight ? '0.16' : '0.22'}
          />
          <path
            d="M 66 162 C 112 147, 156 174, 254 153 L 254 157 C 156 178, 112 151, 66 166 Z"
            fill="#08B6CC"
          />

          {/* FRANJA PROTAGONISTA DEL COLOR SELECCIONADO (exactamente color.hex) */}
          <path
            d="M 66 165 C 112 150, 156 177, 254 156 L 254 272 L 66 272 Z"
            fill={color.hex}
          />

          {/* Veta fluida sutil de textura acrílica dentro de la franja del color */}
          <path
            d="M 66 196 C 122 182, 178 212, 254 190 L 254 222 C 178 242, 122 214, 66 226 Z"
            fill={isDark ? '#FFFFFF' : '#092653'}
            fillOpacity={isDark ? '0.08' : isVeryLight ? '0.035' : '0.05'}
          />

          {/* Pastilla tipográfica limpia integrada en la base de la etiqueta */}
          {size !== 'mini' && (
            <g transform="translate(160, 235)">
              <rect
                x="-64"
                y="-15"
                width="128"
                height="28"
                rx="7"
                fill="#FFFFFF"
                fillOpacity="0.95"
                stroke="#092653"
                strokeOpacity="0.1"
                strokeWidth="0.9"
              />
              {/* Indicador lateral del mismo tono dentro del sello */}
              <circle
                cx="-51"
                cy="-1"
                r="5.5"
                fill={color.hex}
                stroke="#092653"
                strokeOpacity="0.18"
                strokeWidth="0.9"
              />
              <text
                x="5"
                y="-2.5"
                textAnchor="middle"
                fill="#092653"
                fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
                fontWeight="800"
                fontSize="9.4"
              >
                {color.name}
              </text>
              <text
                x="5"
                y="7.8"
                textAnchor="middle"
                fill="#64748B"
                fontFamily="'DM Sans', system-ui, sans-serif"
                fontWeight="600"
                fontSize="6.4"
                letterSpacing="0.7"
              >
                {`FAMILIA ${familyLabel.toUpperCase()} · ILUSTRATIVO`}
              </text>
            </g>
          )}

          {/* Sombreado y brillo especular 3D cilíndrico sobre toda la etiqueta */}
          <rect
            x="65"
            y="96"
            width="190"
            height="176"
            fill={`url(#${uid}-label-3d-sheen)`}
            pointerEvents="none"
          />

          {/* Borde sutil superior e inferior de papel de etiqueta */}
          <path
            d="M 71 102 C 71 113, 249 113, 249 102"
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="0.9"
          />
          <path
            d="M 82 255 C 82 267, 238 267, 238 255"
            fill="none"
            stroke="#092653"
            strokeOpacity="0.16"
            strokeWidth="1"
          />
        </g>

        {/* ================================================================= */}
        {/* 5. TAPA VISIBLE CON ESTRÍAS, PESTAÑA Y ANILLO DE COLOR            */}
        {/* ================================================================= */}
        {/* Falda cilíndrica de la tapa */}
        <path
          d="M 62 52 L 258 52 L 258 73 C 258 85, 62 85, 62 73 Z"
          fill={`url(#${uid}-lid-skirt)`}
          stroke="#CBD5E1"
          strokeWidth="1"
        />

        {/* Estrías verticales sutiles de agarre en la tapa */}
        <g clipPath={`url(#${uid}-lid-skirt-clip)`} opacity="0.45">
          {lidRibXs.map((rxPos) => (
            <line
              key={rxPos}
              x1={rxPos}
              y1="54"
              x2={rxPos}
              y2="84"
              stroke="#94A3B8"
              strokeWidth="0.9"
            />
          ))}
        </g>

        {/* Pestaña lateral de seguridad en el borde inferior de la tapa */}
        <path
          d="M 224 75.5 L 243 73.5 L 243 79.5 C 237 80.8, 230 81.4, 224 81.6 Z"
          fill="#E2E8F0"
          stroke="#CBD5E1"
          strokeWidth="0.8"
        />

        {/* Labio inferior brillante de la tapa */}
        <path
          d="M 62.5 72.5 C 62.5 84.5, 257.5 84.5, 257.5 72.5"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.9"
          strokeWidth="1.2"
        />

        {/* Superficie elíptica superior visible de la tapa (perspectiva frontal elevada) */}
        <ellipse
          cx="160"
          cy="52"
          rx="98"
          ry="13.5"
          fill="#FFFFFF"
          stroke="#CBD5E1"
          strokeWidth="1"
        />

        {/* Cavidad interior moldeada de la tapa */}
        <ellipse
          cx="160"
          cy="52.3"
          rx="88"
          ry="10.8"
          fill={`url(#${uid}-lid-top)`}
          stroke="#DCE3EE"
          strokeWidth="1"
        />

        {/* Anillo testigo del color seleccionado sobre la tapa */}
        <ellipse
          cx="160"
          cy="52.5"
          rx="60"
          ry="6.8"
          fill={color.hex}
          stroke={isVeryLight ? '#CBD5E1' : '#FFFFFF'}
          strokeWidth="1.5"
        />

        {/* Sello central blanco moldeado de la tapa */}
        <ellipse
          cx="160"
          cy="52.5"
          rx="36"
          ry="4"
          fill="#F8FAFC"
          stroke="#E2E8F0"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  );
};
