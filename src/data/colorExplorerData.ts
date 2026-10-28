export type ExplorerEnvironmentId =
  | 'SALA'
  | 'HABITACION'
  | 'COCINA'
  | 'FACHADA'
  | 'OFICINA'
  | 'COMERCIAL';

export type ExplorerCategoryId =
  | 'NEUTROS'
  | 'CALIDOS'
  | 'FRESCOS'
  | 'NATURALES'
  | 'ACENTOS';

export type ExplorerIntensityId = 'CLAROS' | 'MEDIOS' | 'INTENSOS';

export type ExplorerMoodId =
  | 'RELAJANTE'
  | 'CALIDO_ACOGEDOR'
  | 'LUMINOSO'
  | 'MODERNO'
  | 'NATURAL'
  | 'CON_PERSONALIDAD';

export type SimulatorSceneId = 'SALA' | 'HABITACION' | 'FACHADA';

export interface ExplorerColorItem {
  id: string;
  name: string;
  hex: string;
  category: ExplorerCategoryId;
  intensity: ExplorerIntensityId;
  sensationShort: string;
  inspirationNote: string;
  environments: ExplorerEnvironmentId[];
  moods: ExplorerMoodId[];
  recommendedPairIds: string[];
  defaultScene: SimulatorSceneId;
  searchKeywords: string[];
}

export interface ExplorerColorCombination {
  id: string;
  title: string;
  subtitle: string;
  mainColorId: string;
  complementaryColorId: string;
  accentColorId: string;
  environments: ExplorerEnvironmentId[];
  moods: ExplorerMoodId[];
  defaultScene: SimulatorSceneId;
}

export interface ColorExplorerFilterRequest {
  timestamp: number;
  environment?: ExplorerEnvironmentId;
  mood?: ExplorerMoodId;
  category?: ExplorerCategoryId;
  colorId?: string;
  combinationId?: string;
  onlyFavorites?: boolean;
  openSimulator?: boolean;
}

export const FAVORITES_STORAGE_KEY = 'colorlink_favorite_colors_v1';
export const FAVORITES_UPDATED_EVENT = 'colorlink-favorites-updated';

export function getStoredFavoriteColorIds(): string[] {
  if (typeof window === 'undefined') {
    return ['clr-marfil-luz', 'clr-verde-salvia'];
  }
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignorar errores de almacenamiento restringido
  }
  return ['clr-marfil-luz', 'clr-verde-salvia'];
}

export function saveStoredFavoriteColorIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT, { detail: ids }));
  } catch {
    // Ignorar errores de almacenamiento restringido
  }
}

export const EXPLORER_ENVIRONMENTS: Array<{
  id: ExplorerEnvironmentId;
  label: string;
  hint: string;
  accentHex: string;
  softBgHex: string;
}> = [
  {
    id: 'SALA',
    label: 'Sala',
    hint: 'Recibidores y zona social',
    accentHex: '#C66B53',
    softBgHex: '#FDF5F2',
  },
  {
    id: 'HABITACION',
    label: 'Habitación',
    hint: 'Descanso y serenidad',
    accentHex: '#738996',
    softBgHex: '#F3F7F9',
  },
  {
    id: 'COCINA',
    label: 'Cocina',
    hint: 'Luz, limpieza y vitalidad',
    accentHex: '#C9963B',
    softBgHex: '#FCF8EE',
  },
  {
    id: 'FACHADA',
    label: 'Fachada',
    hint: 'Exteriores y terrazas',
    accentHex: '#738063',
    softBgHex: '#F4F6F1',
  },
  {
    id: 'OFICINA',
    label: 'Oficina',
    hint: 'Enfoque y claridad visual',
    accentHex: '#0891B2',
    softBgHex: '#F0F9FB',
  },
  {
    id: 'COMERCIAL',
    label: 'Espacios comerciales',
    hint: 'Tiendas, cafés y atención',
    accentHex: '#D9725B',
    softBgHex: '#FDF4F1',
  },
];

export const EXPLORER_CATEGORIES: Array<{
  id: ExplorerCategoryId;
  label: string;
  description: string;
  swatches: [string, string, string];
}> = [
  {
    id: 'NEUTROS',
    label: 'Neutros',
    description: 'Blancos, marfiles, grises y beige',
    swatches: ['#FAF7F2', '#F4EFE6', '#D8D2C5'],
  },
  {
    id: 'CALIDOS',
    label: 'Cálidos',
    description: 'Terracotas, arena, ocres y tonos tierra',
    swatches: ['#E3C9A8', '#C9963B', '#C66B53'],
  },
  {
    id: 'FRESCOS',
    label: 'Frescos',
    description: 'Azules, verdes y sensación de frescura',
    swatches: ['#B8D4D8', '#9EC5BE', '#2E7D8C'],
  },
  {
    id: 'NATURALES',
    label: 'Naturales',
    description: 'Salvia, oliva, piedra e inspiración natural',
    swatches: ['#C7D3C6', '#96AD98', '#738063'],
  },
  {
    id: 'ACENTOS',
    label: 'Acentos',
    description: 'Colores intensos para paredes destacadas',
    swatches: ['#D9725B', '#1E3A5F', '#2F4F46'],
  },
];

export const EXPLORER_INTENSITIES: Array<{
  id: ExplorerIntensityId;
  label: string;
  hint: string;
  sampleHex: string;
}> = [
  {
    id: 'CLAROS',
    label: 'Claros',
    hint: 'Amplían e iluminan',
    sampleHex: '#F4EFE6',
  },
  {
    id: 'MEDIOS',
    label: 'Medios',
    hint: 'Equilibrio suave',
    sampleHex: '#96AD98',
  },
  {
    id: 'INTENSOS',
    label: 'Intensos',
    hint: 'Muros protagonistas',
    sampleHex: '#1E3A5F',
  },
];

export const EXPLORER_MOODS: Array<{
  id: ExplorerMoodId;
  label: string;
  tagline: string;
  inspirationTip: string;
  palettePreview: [string, string, string];
  accentBorder: string;
}> = [
  {
    id: 'RELAJANTE',
    label: 'Relajante',
    tagline: 'Paz visual para descansar y desconectar',
    inspirationTip:
      'Idea de inspiración: combina muros en tonos brisa o salvia suave con techos marfil claro y textiles de algodón natural.',
    palettePreview: ['#B8D4D8', '#C7D3C6', '#738996'],
    accentBorder: '#0891B2',
  },
  {
    id: 'CALIDO_ACOGEDOR',
    label: 'Cálido y acogedor',
    tagline: 'Tonos envolventes que invitan a compartir',
    inspirationTip:
      'Idea de inspiración: los tonos arena, trigo y terracota resaltan especialmente con luz cálida e interiores con madera.',
    palettePreview: ['#F4EFE6', '#E3C9A8', '#C66B53'],
    accentBorder: '#D9725B',
  },
  {
    id: 'LUMINOSO',
    label: 'Luminoso',
    tagline: 'Claridad que hace crecer tus espacios',
    inspirationTip:
      'Idea de inspiración: ideal para espacios con poca entrada de sol o pasillos; refleja la luz manteniendo calidez.',
    palettePreview: ['#FAF7F2', '#F4EFE6', '#9EC5BE'],
    accentBorder: '#C9963B',
  },
  {
    id: 'MODERNO',
    label: 'Moderno',
    tagline: 'Líneas limpias y contrastes contemporáneos',
    inspirationTip:
      'Idea de inspiración: usa un neutro gris o piedra en tres paredes y reserva un tono profundo para el muro focal.',
    palettePreview: ['#CBD2D9', '#D8D2C5', '#3A434D'],
    accentBorder: '#0B1F3A',
  },
  {
    id: 'NATURAL',
    label: 'Natural',
    tagline: 'Armonía orgánica conectada con el exterior',
    inspirationTip:
      'Idea de inspiración: los verdes salvia, oliva y piedra dialogan con plantas interiores, fibras tejidas y luz de día.',
    palettePreview: ['#96AD98', '#738063', '#B8B2A6'],
    accentBorder: '#738063',
  },
  {
    id: 'CON_PERSONALIDAD',
    label: 'Con personalidad',
    tagline: 'Acentos expresivos para rincones únicos',
    inspirationTip:
      'Idea de inspiración: aplica tonos intensos como coral, mostaza o azul profundo en una pared protagonista o nicho.',
    palettePreview: ['#D9725B', '#C9963B', '#1E3A5F'],
    accentBorder: '#C66B53',
  },
];

// Paleta curada de muestras ilustrativas de COLORLINK (20 tonos 100 % únicos, sin repetir hex)
export const COLOR_EXPLORER_PALETTE: ExplorerColorItem[] = [
  {
    id: 'clr-marfil-luz',
    name: 'Marfil Luz',
    hex: '#F4EFE6',
    category: 'NEUTROS',
    intensity: 'CLAROS',
    sensationShort: 'Luminoso y acogedor',
    inspirationNote:
      'Blanco cálido aporcelanado que amplía visualmente salas, pasillos y habitaciones sin sentirse frío.',
    environments: ['SALA', 'HABITACION', 'COCINA', 'OFICINA'],
    moods: ['LUMINOSO', 'CALIDO_ACOGEDOR', 'RELAJANTE'],
    recommendedPairIds: ['clr-verde-salvia', 'clr-terracota', 'clr-azul-bruma'],
    defaultScene: 'SALA',
    searchKeywords: ['blanco', 'marfil', 'crema', 'claro', 'amplitud', 'iluminado', 'suave'],
  },
  {
    id: 'clr-blanco-algodon',
    name: 'Blanco Algodón',
    hex: '#FAF7F2',
    category: 'NEUTROS',
    intensity: 'CLAROS',
    sensationShort: 'Limpio, amplio y sereno',
    inspirationNote:
      'Tono extra claro ideal para maximizar la luz natural y acompañar cualquier pared de acento.',
    environments: ['SALA', 'COCINA', 'OFICINA', 'COMERCIAL'],
    moods: ['LUMINOSO', 'MODERNO'],
    recommendedPairIds: ['clr-azul-profundo', 'clr-brisa-marina', 'clr-mostaza-artesanal'],
    defaultScene: 'SALA',
    searchKeywords: ['blanco', 'algodon', 'luminoso', 'puro', 'pequeño', 'minimalista'],
  },
  {
    id: 'clr-arena-dorada',
    name: 'Arena Dorada',
    hex: '#E3C9A8',
    category: 'CALIDOS',
    intensity: 'CLAROS',
    sensationShort: 'Cálido y envolvente',
    inspirationNote:
      'Evoca la suavidad de la arena natural al sol; aporta confort inmediato en salas y comedores familiares.',
    environments: ['SALA', 'HABITACION', 'COMERCIAL'],
    moods: ['CALIDO_ACOGEDOR', 'LUMINOSO'],
    recommendedPairIds: ['clr-marfil-luz', 'clr-coral-atardecer', 'clr-verde-oliva'],
    defaultScene: 'SALA',
    searchKeywords: ['arena', 'beige', 'calido', 'hogar', 'comedor', 'dorado', 'acogedor'],
  },
  {
    id: 'clr-verde-salvia',
    name: 'Verde Salvia',
    hex: '#96AD98',
    category: 'NATURALES',
    intensity: 'MEDIOS',
    sensationShort: 'Fresco, botánico y armónico',
    inspirationNote:
      'Conecta el interior con la calma de la naturaleza; luce extraordinario junto a maderas claras y lino.',
    environments: ['SALA', 'HABITACION', 'COCINA', 'OFICINA'],
    moods: ['NATURAL', 'RELAJANTE'],
    recommendedPairIds: ['clr-marfil-luz', 'clr-arena-dorada', 'clr-terracota'],
    defaultScene: 'HABITACION',
    searchKeywords: ['verde', 'salvia', 'plantas', 'botanico', 'calma', 'natural', 'fresco'],
  },
  {
    id: 'clr-azul-profundo',
    name: 'Azul Profundo',
    hex: '#1E3A5F',
    category: 'ACENTOS',
    intensity: 'INTENSOS',
    sensationShort: 'Elegante y con gran carácter',
    inspirationNote:
      'Tono arquitectónico intenso pensado para paredes focales en salas, estudios y volúmenes de fachada.',
    environments: ['SALA', 'FACHADA', 'OFICINA', 'COMERCIAL'],
    moods: ['CON_PERSONALIDAD', 'MODERNO'],
    recommendedPairIds: ['clr-piedra-serena', 'clr-blanco-algodon', 'clr-mostaza-artesanal'],
    defaultScene: 'SALA',
    searchKeywords: ['azul', 'oscuro', 'marino', 'elegante', 'intenso', 'acento', 'moderno'],
  },
  {
    id: 'clr-terracota',
    name: 'Terracota',
    hex: '#C66B53',
    category: 'CALIDOS',
    intensity: 'INTENSOS',
    sensationShort: 'Terroso, artesanal y acogedor',
    inspirationNote:
      'Inspirado en la arcilla cocida; transforma cualquier pared en un punto focal lleno de calidez y vida.',
    environments: ['SALA', 'FACHADA', 'COMERCIAL'],
    moods: ['CALIDO_ACOGEDOR', 'CON_PERSONALIDAD'],
    recommendedPairIds: ['clr-marfil-luz', 'clr-verde-salvia', 'clr-piedra-serena'],
    defaultScene: 'SALA',
    searchKeywords: ['terracota', 'arcilla', 'tierra', 'naranja', 'calido', 'rustico', 'artesanal'],
  },
  {
    id: 'clr-piedra-serena',
    name: 'Piedra Serena',
    hex: '#D8D2C5',
    category: 'NEUTROS',
    intensity: 'MEDIOS',
    sensationShort: 'Equilibrado y contemporáneo',
    inspirationNote:
      'Neutro greige versátil que disimula el paso del tiempo en salas de alto uso, oficinas y fachadas.',
    environments: ['SALA', 'FACHADA', 'OFICINA', 'COMERCIAL'],
    moods: ['MODERNO', 'NATURAL', 'RELAJANTE'],
    recommendedPairIds: ['clr-azul-profundo', 'clr-blanco-algodon', 'clr-verde-oliva'],
    defaultScene: 'FACHADA',
    searchKeywords: ['piedra', 'beige', 'greige', 'neutro', 'fachada', 'elegante'],
  },
  {
    id: 'clr-brisa-marina',
    name: 'Brisa Marina',
    hex: '#B8D4D8',
    category: 'FRESCOS',
    intensity: 'CLAROS',
    sensationShort: 'Suave, aireado y relajante',
    inspirationNote:
      'Aporta una sensación inmediata de orden, descanso y aire fresco en alcobas principales o infantiles.',
    environments: ['HABITACION', 'COCINA', 'OFICINA'],
    moods: ['RELAJANTE', 'LUMINOSO'],
    recommendedPairIds: ['clr-blanco-algodon', 'clr-azul-bruma', 'clr-arena-dorada'],
    defaultScene: 'HABITACION',
    searchKeywords: ['azul claro', 'celeste', 'brisa', 'mar', 'descanso', 'dormitorio', 'paz'],
  },
  {
    id: 'clr-verde-oliva',
    name: 'Verde Oliva',
    hex: '#738063',
    category: 'NATURALES',
    intensity: 'MEDIOS',
    sensationShort: 'Orgánico y atemporal',
    inspirationNote:
      'Tono tierra-botánico con excelente presencia tanto en fachadas rodeadas de jardín como en estancias interiores.',
    environments: ['FACHADA', 'SALA', 'COMERCIAL'],
    moods: ['NATURAL', 'CALIDO_ACOGEDOR'],
    recommendedPairIds: ['clr-arena-dorada', 'clr-marfil-luz', 'clr-piedra-caliza'],
    defaultScene: 'FACHADA',
    searchKeywords: ['verde', 'oliva', 'campo', 'jardin', 'natural', 'exterior'],
  },
  {
    id: 'clr-coral-atardecer',
    name: 'Coral Atardecer',
    hex: '#D9725B',
    category: 'ACENTOS',
    intensity: 'INTENSOS',
    sensationShort: 'Alegre, vital y expresivo',
    inspirationNote:
      'Un acento cálido contemporáneo ideal para dar identidad a cafeterías, recibidores y rincones creativos.',
    environments: ['SALA', 'COMERCIAL', 'HABITACION'],
    moods: ['CON_PERSONALIDAD', 'CALIDO_ACOGEDOR'],
    recommendedPairIds: ['clr-blanco-algodon', 'clr-arena-dorada', 'clr-bruma-botanica'],
    defaultScene: 'SALA',
    searchKeywords: ['coral', 'rosado', 'salmon', 'vivo', 'alegre', 'personalidad', 'destacado'],
  },
  {
    id: 'clr-gris-niebla',
    name: 'Gris Niebla',
    hex: '#CBD2D9',
    category: 'NEUTROS',
    intensity: 'CLAROS',
    sensationShort: 'Sobrio, limpio y actual',
    inspirationNote:
      'Gris claro arquitectónico que favorece la concentración en oficinas, estudios y locales modernos.',
    environments: ['OFICINA', 'HABITACION', 'COMERCIAL', 'COCINA'],
    moods: ['MODERNO', 'LUMINOSO', 'RELAJANTE'],
    recommendedPairIds: ['clr-turquesa-calma', 'clr-grafito-urbano', 'clr-blanco-algodon'],
    defaultScene: 'SALA',
    searchKeywords: ['gris', 'plata', 'niebla', 'moderno', 'estudio', 'oficina'],
  },
  {
    id: 'clr-mostaza-artesanal',
    name: 'Mostaza Artesanal',
    hex: '#C9963B',
    category: 'CALIDOS',
    intensity: 'INTENSOS',
    sensationShort: 'Creativo, luminoso y cálido',
    inspirationNote:
      'Ocre dorado que llena de energía positiva cocinas, comedores y espacios comerciales con sello propio.',
    environments: ['COCINA', 'COMERCIAL', 'SALA'],
    moods: ['CON_PERSONALIDAD', 'CALIDO_ACOGEDOR'],
    recommendedPairIds: ['clr-blanco-algodon', 'clr-bruma-botanica', 'clr-azul-profundo'],
    defaultScene: 'SALA',
    searchKeywords: ['mostaza', 'amarillo', 'ocre', 'dorado', 'energia', 'cocina', 'creativo'],
  },
  {
    id: 'clr-azul-bruma',
    name: 'Azul Bruma',
    hex: '#738996',
    category: 'FRESCOS',
    intensity: 'MEDIOS',
    sensationShort: 'Sereno y contemplativo',
    inspirationNote:
      'Azul agrisado de baja saturación que invita a la lectura, el descanso profundo y la calma visual.',
    environments: ['HABITACION', 'SALA', 'OFICINA'],
    moods: ['RELAJANTE', 'MODERNO'],
    recommendedPairIds: ['clr-marfil-luz', 'clr-brisa-marina', 'clr-piedra-serena'],
    defaultScene: 'HABITACION',
    searchKeywords: ['azul', 'bruma', 'gris azulado', 'sereno', 'dormitorio', 'relajante'],
  },
  {
    id: 'clr-bruma-botanica',
    name: 'Bruma Botánica',
    hex: '#C7D3C6',
    category: 'NATURALES',
    intensity: 'CLAROS',
    sensationShort: 'Ligero, natural y luminoso',
    inspirationNote:
      'Verde eucalipto muy suave que refresca cocinas, habitaciones e interiores luminosos sin recargarlos.',
    environments: ['HABITACION', 'SALA', 'COCINA'],
    moods: ['NATURAL', 'RELAJANTE', 'LUMINOSO'],
    recommendedPairIds: ['clr-blanco-algodon', 'clr-mostaza-artesanal', 'clr-verde-oliva'],
    defaultScene: 'HABITACION',
    searchKeywords: ['eucalipto', 'menta suave', 'verde claro', 'natural', 'suave'],
  },
  {
    id: 'clr-trigo-suave',
    name: 'Trigo Suave',
    hex: '#D9B382',
    category: 'CALIDOS',
    intensity: 'MEDIOS',
    sensationShort: 'Hogareño y soleado',
    inspirationNote:
      'Tono tierra claro que brinda sensación de sol de la tarde en cocinas familiares, pasillos y salas.',
    environments: ['COCINA', 'SALA', 'COMERCIAL'],
    moods: ['CALIDO_ACOGEDOR', 'NATURAL'],
    recommendedPairIds: ['clr-marfil-luz', 'clr-verde-oliva', 'clr-terracota'],
    defaultScene: 'SALA',
    searchKeywords: ['trigo', 'miel', 'tierra', 'calido', 'acogedor', 'ocre claro'],
  },
  {
    id: 'clr-verde-agua-claro',
    name: 'Agua de Manantial',
    hex: '#9EC5BE',
    category: 'FRESCOS',
    intensity: 'CLAROS',
    sensationShort: 'Refrescante y vital',
    inspirationNote:
      'Equilibrio sutil entre verde agua y turquesa pastel para cocinas despejadas, consultorios y estudios.',
    environments: ['COCINA', 'HABITACION', 'OFICINA'],
    moods: ['RELAJANTE', 'LUMINOSO'],
    recommendedPairIds: ['clr-blanco-algodon', 'clr-turquesa-calma', 'clr-gris-niebla'],
    defaultScene: 'HABITACION',
    searchKeywords: ['agua', 'aguamarina', 'menta', 'fresco', 'limpio', 'cocina'],
  },
  {
    id: 'clr-piedra-caliza',
    name: 'Piedra Caliza',
    hex: '#B8B2A6',
    category: 'NATURALES',
    intensity: 'MEDIOS',
    sensationShort: 'Mineral, sobrio y duradero',
    inspirationNote:
      'Inspirado en roca natural; ideal para fachadas residenciales y espacios corporativos sobrios.',
    environments: ['FACHADA', 'OFICINA', 'SALA', 'COMERCIAL'],
    moods: ['NATURAL', 'MODERNO'],
    recommendedPairIds: ['clr-blanco-algodon', 'clr-azul-profundo', 'clr-grafito-urbano'],
    defaultScene: 'FACHADA',
    searchKeywords: ['caliza', 'cemento suave', 'topo', 'piedra', 'exterior', 'fachada'],
  },
  {
    id: 'clr-turquesa-calma',
    name: 'Turquesa Sereno',
    hex: '#2E7D8C',
    category: 'FRESCOS',
    intensity: 'MEDIOS',
    sensationShort: 'Fresco con sello contemporáneo',
    inspirationNote:
      'Aporta vitalidad equilibrada y enfoque creativo en oficinas modernas, estudios y locales comerciales.',
    environments: ['OFICINA', 'COMERCIAL', 'COCINA'],
    moods: ['MODERNO', 'CON_PERSONALIDAD'],
    recommendedPairIds: ['clr-gris-niebla', 'clr-blanco-algodon', 'clr-arena-dorada'],
    defaultScene: 'SALA',
    searchKeywords: ['turquesa', 'petroleo', 'azul verde', 'fresco', 'oficina', 'comercial'],
  },
  {
    id: 'clr-bosque-norte',
    name: 'Verde Bosque',
    hex: '#2F4F46',
    category: 'ACENTOS',
    intensity: 'INTENSOS',
    sensationShort: 'Distinguido, profundo y natural',
    inspirationNote:
      'Verde botánico profundo que viste muros principales con elegancia serena en salas, restaurantes y bibliotecas.',
    environments: ['SALA', 'COMERCIAL', 'OFICINA'],
    moods: ['CON_PERSONALIDAD', 'NATURAL'],
    recommendedPairIds: ['clr-marfil-luz', 'clr-arena-dorada', 'clr-gris-niebla'],
    defaultScene: 'SALA',
    searchKeywords: ['bosque', 'verde oscuro', 'esmeralda', 'elegante', 'intenso', 'botanico'],
  },
  {
    id: 'clr-grafito-urbano',
    name: 'Grafito Urbano',
    hex: '#3A434D',
    category: 'ACENTOS',
    intensity: 'INTENSOS',
    sensationShort: 'Arquitectónico y vanguardista',
    inspirationNote:
      'Contraste contemporáneo para resaltar volúmenes en fachadas, marcos arquitectónicos y espacios comerciales.',
    environments: ['FACHADA', 'COMERCIAL', 'OFICINA'],
    moods: ['MODERNO', 'CON_PERSONALIDAD'],
    recommendedPairIds: ['clr-gris-niebla', 'clr-piedra-serena', 'clr-mostaza-artesanal'],
    defaultScene: 'FACHADA',
    searchKeywords: ['grafito', 'gris oscuro', 'antracita', 'moderno', 'urbano', 'fachada'],
  },
];

export const CURATED_COLOR_COMBINATIONS: ExplorerColorCombination[] = [
  {
    id: 'combo-sala-natural',
    title: 'Calma Botánica en Sala',
    subtitle: 'Luminosidad cálida con acento artesanal en arcilla',
    mainColorId: 'clr-marfil-luz',
    complementaryColorId: 'clr-verde-salvia',
    accentColorId: 'clr-terracota',
    environments: ['SALA', 'HABITACION'],
    moods: ['LUMINOSO', 'NATURAL', 'CALIDO_ACOGEDOR'],
    defaultScene: 'SALA',
  },
  {
    id: 'combo-descanso-sereno',
    title: 'Refugio de Descanso',
    subtitle: 'Tonos aireados pensados para desconectar y dormir mejor',
    mainColorId: 'clr-blanco-algodon',
    complementaryColorId: 'clr-brisa-marina',
    accentColorId: 'clr-azul-bruma',
    environments: ['HABITACION', 'OFICINA'],
    moods: ['RELAJANTE', 'LUMINOSO'],
    defaultScene: 'HABITACION',
  },
  {
    id: 'combo-calidez-hogar',
    title: 'Encuentro Cálido y Alegre',
    subtitle: 'Arena suave acompañada de un toque expresivo en coral',
    mainColorId: 'clr-arena-dorada',
    complementaryColorId: 'clr-marfil-luz',
    accentColorId: 'clr-coral-atardecer',
    environments: ['SALA', 'COMERCIAL', 'COCINA'],
    moods: ['CALIDO_ACOGEDOR', 'CON_PERSONALIDAD'],
    defaultScene: 'SALA',
  },
  {
    id: 'combo-fachada-elegante',
    title: 'Fachada Contemporánea',
    subtitle: 'Piedra arquitectónica con contraste firme y duradero',
    mainColorId: 'clr-piedra-serena',
    complementaryColorId: 'clr-piedra-caliza',
    accentColorId: 'clr-azul-profundo',
    environments: ['FACHADA', 'COMERCIAL'],
    moods: ['MODERNO', 'CON_PERSONALIDAD'],
    defaultScene: 'FACHADA',
  },
  {
    id: 'combo-cocina-vital',
    title: 'Cocina Luminosa y Natural',
    subtitle: 'Frescura orgánica con detalles llenos de energía cálida',
    mainColorId: 'clr-bruma-botanica',
    complementaryColorId: 'clr-blanco-algodon',
    accentColorId: 'clr-mostaza-artesanal',
    environments: ['COCINA', 'SALA', 'COMERCIAL'],
    moods: ['LUMINOSO', 'NATURAL', 'CALIDO_ACOGEDOR'],
    defaultScene: 'SALA',
  },
  {
    id: 'combo-estudio-moderno',
    title: 'Estudio y Comercio Actual',
    subtitle: 'Claridad profesional con un acento botánico distinguido',
    mainColorId: 'clr-gris-niebla',
    complementaryColorId: 'clr-blanco-algodon',
    accentColorId: 'clr-bosque-norte',
    environments: ['OFICINA', 'COMERCIAL', 'SALA'],
    moods: ['MODERNO', 'CON_PERSONALIDAD'],
    defaultScene: 'SALA',
  },
];

export const FEATURED_COLOR_IDS: readonly string[] = [
  'clr-marfil-luz',
  'clr-arena-dorada',
  'clr-azul-profundo',
  'clr-verde-salvia',
];

export const ORDERED_CATALOG_COLORS: ExplorerColorItem[] = [
  ...FEATURED_COLOR_IDS.map((id) =>
    COLOR_EXPLORER_PALETTE.find((item) => item.id === id)
  ).filter((item): item is ExplorerColorItem => Boolean(item)),
  ...COLOR_EXPLORER_PALETTE.filter((item) => !FEATURED_COLOR_IDS.includes(item.id)),
];

export function getColorById(id: string): ExplorerColorItem {
  return (
    COLOR_EXPLORER_PALETTE.find((item) => item.id === id) || COLOR_EXPLORER_PALETTE[0]
  );
}

export function getCombinationById(id: string): ExplorerColorCombination | undefined {
  return CURATED_COLOR_COMBINATIONS.find((combo) => combo.id === id);
}

export function getCategoryLabel(category: ExplorerCategoryId): string {
  const found = EXPLORER_CATEGORIES.find((c) => c.id === category);
  return found ? found.label : category;
}

export function getCategoryBriefDescription(category: ExplorerCategoryId): string {
  const found = EXPLORER_CATEGORIES.find((c) => c.id === category);
  return found ? found.description : '';
}

export function getIntensityLabel(intensity: ExplorerIntensityId): string {
  const found = EXPLORER_INTENSITIES.find((i) => i.id === intensity);
  return found ? found.label : intensity;
}

export function getEnvironmentLabel(env: ExplorerEnvironmentId): string {
  const found = EXPLORER_ENVIRONMENTS.find((e) => e.id === env);
  return found ? found.label : env;
}

/**
 * Interpreta una consulta en lenguaje cotidiano del cliente (para el asistente COLORLINK IA)
 * y devuelve sugerencias cromáticas coherentes con el ambiente y la sensación deseada.
 */
export function suggestColorsFromUserText(text: string): {
  detectedEnvironment?: ExplorerEnvironmentId;
  detectedMood?: ExplorerMoodId;
  suggestedColors: ExplorerColorItem[];
  explanation: string;
} {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  let detectedEnvironment: ExplorerEnvironmentId | undefined;
  if (normalized.includes('habitacion') || normalized.includes('alcoba') || normalized.includes('dormitorio') || normalized.includes('cuarto')) {
    detectedEnvironment = 'HABITACION';
  } else if (normalized.includes('cocina') || normalized.includes('comedor')) {
    detectedEnvironment = 'COCINA';
  } else if (normalized.includes('fachada') || normalized.includes('exterior') || normalized.includes('afuera') || normalized.includes('terraza')) {
    detectedEnvironment = 'FACHADA';
  } else if (normalized.includes('oficina') || normalized.includes('estudio') || normalized.includes('trabajo') || normalized.includes('consultorio')) {
    detectedEnvironment = 'OFICINA';
  } else if (normalized.includes('comercial') || normalized.includes('local') || normalized.includes('tienda') || normalized.includes('negocio') || normalized.includes('cafeteria') || normalized.includes('restaurante')) {
    detectedEnvironment = 'COMERCIAL';
  } else if (normalized.includes('sala') || normalized.includes('salon') || normalized.includes('recibidor')) {
    detectedEnvironment = 'SALA';
  }

  let detectedMood: ExplorerMoodId | undefined;
  if (normalized.includes('relaj') || normalized.includes('calma') || normalized.includes('tranquil') || normalized.includes('paz') || normalized.includes('descans')) {
    detectedMood = 'RELAJANTE';
  } else if (normalized.includes('calid') || normalized.includes('acogedor') || normalized.includes('hogar') || normalized.includes('tierra')) {
    detectedMood = 'CALIDO_ACOGEDOR';
  } else if (normalized.includes('luminos') || normalized.includes('luz') || normalized.includes('ampli') || normalized.includes('pequen') || normalized.includes('clar')) {
    detectedMood = 'LUMINOSO';
  } else if (normalized.includes('modern') || normalized.includes('actual') || normalized.includes('minimal') || normalized.includes('sobri') || normalized.includes('gris')) {
    detectedMood = 'MODERNO';
  } else if (normalized.includes('natural') || normalized.includes('verde') || normalized.includes('planta') || normalized.includes('organico') || normalized.includes('botanic')) {
    detectedMood = 'NATURAL';
  } else if (normalized.includes('personalidad') || normalized.includes('intens') || normalized.includes('destac') || normalized.includes('acento') || normalized.includes('vibrant') || normalized.includes('elegante')) {
    detectedMood = 'CON_PERSONALIDAD';
  }

  const matched = COLOR_EXPLORER_PALETTE.filter((item) => {
    const envOk = !detectedEnvironment || item.environments.includes(detectedEnvironment);
    const moodOk = !detectedMood || item.moods.includes(detectedMood);
    return envOk && moodOk;
  });

  const finalColors = (matched.length >= 2
    ? matched
    : COLOR_EXPLORER_PALETTE.filter((item) =>
        detectedEnvironment
          ? item.environments.includes(detectedEnvironment)
          : detectedMood
          ? item.moods.includes(detectedMood)
          : true
      )
  ).slice(0, 3);

  const envPhrase = detectedEnvironment
    ? `para ${getEnvironmentLabel(detectedEnvironment).toLowerCase()}`
    : 'para tu espacio';
  const moodObj = EXPLORER_MOODS.find((m) => m.id === detectedMood);
  const moodPhrase = moodObj
    ? ` buscando un ambiente ${moodObj.label.toLowerCase()}`
    : '';

  return {
    detectedEnvironment,
    detectedMood,
    suggestedColors: finalColors,
    explanation: `Pensando en opciones ${envPhrase}${moodPhrase}, te sugiero explorar estos tonos ilustrativos que armonizan muy bien entre sí:`,
  };
}
