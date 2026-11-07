import React, { useEffect, useState } from 'react';
import type { ExplorerColorItem } from '../../data/colorExplorerData';
import { PaintBucketPackshot } from './PaintBucketPackshot';

interface ColorPackshotProps {
  color: ExplorerColorItem;
  size?: 'card' | 'detail' | 'mini';
  /** Ocupa todo el contenedor (que debe ser `relative`), como las fotos de la tienda */
  fill?: boolean;
  className?: string;
}

const TAMANOS = {
  detail: 'w-60 sm:w-72',
  card: 'w-40 sm:w-48',
  mini: 'w-28 sm:w-32',
};

/**
 * Foto del galón del color (public/colores/<id>.webp). Si el color no tiene foto,
 * muestra la cubeta ilustrada, así un tono nuevo de la paleta nunca queda sin imagen.
 */
export const ColorPackshot: React.FC<ColorPackshotProps> = ({ color, size = 'card', fill = false, className = '' }) => {
  const [sinFoto, setSinFoto] = useState(false);

  useEffect(() => {
    setSinFoto(false);
  }, [color.id]);

  if (sinFoto) return <PaintBucketPackshot color={color} size={size} className={className} />;

  return (
    <img
      src={`/colores/${color.id}.webp`}
      alt={`Galón COLORLINK en tono ${color.name}`}
      loading={size === 'detail' ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setSinFoto(true)}
      className={
        fill
          ? `absolute inset-0 w-full h-full object-cover ${className}`
          : `${TAMANOS[size]} h-auto aspect-square object-cover rounded-2xl shadow-sm ${className}`
      }
    />
  );
};
