/**
 * Reglas de los campos de registro e inicio de sesión.
 * Las usan el navegador (para bloquear caracteres mientras se escribe y avisar antes de enviar)
 * y el servidor (para validar de nuevo: el navegador se puede saltar).
 * Para cambiar un límite basta con editarlo aquí.
 */

export const LIMITES = {
  email: { max: 254 },
  password: { min: 8, max: 64 },
  nombres: { min: 2, max: 30 },
  apellidos: { min: 2, max: 30 },
  /** Nombre y apellidos en un solo campo (Mi cuenta y compra) */
  nombreCompleto: { min: 5, max: 61 },
  notas: { max: 300 },
  razonSocial: { min: 3, max: 100 },
  cargo: { max: 40 },
  telefono: { largo: 10 },
  direccion: { min: 8, max: 100 },
  /** Dígitos del NIT sin el dígito de verificación */
  nit: { largo: 9 },
} as const;

export type TipoDocumentoPersona = 'CC' | 'CE' | 'PPT' | 'PA' | 'TI';
export type TipoDocumento = TipoDocumentoPersona | 'NIT';

export const DOCUMENTOS: Record<TipoDocumentoPersona, { label: string; min: number; max: number; soloNumeros: boolean }> = {
  CC: { label: 'C.C.', min: 6, max: 10, soloNumeros: true },
  CE: { label: 'C.E.', min: 6, max: 10, soloNumeros: true },
  PPT: { label: 'PPT', min: 6, max: 10, soloNumeros: true },
  TI: { label: 'T.I.', min: 10, max: 11, soloNumeros: true },
  PA: { label: 'Pasaporte', min: 6, max: 12, soloNumeros: false },
};

const LETRAS = 'A-Za-zÁÉÍÓÚÜÑáéíóúüñ';
const sinEspaciosDobles = (v: string) => v.replace(/\s{2,}/g, ' ').replace(/^\s+/, '');

/** Limpian lo que se escribe en cada campo: los caracteres no permitidos simplemente no aparecen */
export const filtrar = {
  email: (v: string) => v.replace(/\s/g, '').slice(0, LIMITES.email.max),
  password: (v: string) => v.slice(0, LIMITES.password.max),
  notas: (v: string) => v.replace(/\s{3,}/g, '  ').slice(0, LIMITES.notas.max),
  nombre: (v: string, max: number) => sinEspaciosDobles(v.replace(new RegExp(`[^${LETRAS} ]`, 'g'), '')).slice(0, max),
  razonSocial: (v: string) =>
    sinEspaciosDobles(v.replace(new RegExp(`[^${LETRAS}0-9 .,&'()-]`, 'g'), '')).slice(0, LIMITES.razonSocial.max),
  direccion: (v: string) =>
    sinEspaciosDobles(v.replace(new RegExp(`[^${LETRAS}0-9 #°.,-]`, 'g'), '')).slice(0, LIMITES.direccion.max),
  telefono: (v: string) => v.replace(/\D/g, '').slice(0, LIMITES.telefono.largo),
  documento: (v: string, tipo: TipoDocumentoPersona) => {
    const regla = DOCUMENTOS[tipo];
    const limpio = regla.soloNumeros ? v.replace(/\D/g, '') : v.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return limpio.slice(0, regla.max);
  },
  /** Solo números; el guion antes del dígito de verificación se pone solo: 901234567-8 */
  nit: (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, LIMITES.nit.largo + 1);
    return d.length > LIMITES.nit.largo ? `${d.slice(0, LIMITES.nit.largo)}-${d.slice(LIMITES.nit.largo)}` : d;
  },
};

export const REGLAS_CONTRASENA: Array<{ texto: string; cumple: (p: string) => boolean }> = [
  { texto: `${LIMITES.password.min} caracteres`, cumple: (p) => p.length >= LIMITES.password.min },
  { texto: 'Una mayúscula', cumple: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { texto: 'Una minúscula', cumple: (p) => /[a-záéíóúñ]/.test(p) },
  { texto: 'Un número', cumple: (p) => /\d/.test(p) },
  { texto: 'Un símbolo', cumple: (p) => /[^A-Za-z0-9ÁÉÍÓÚáéíóúÑñ\s]/.test(p) },
];

export function emailValido(v: string): boolean {
  return v.length <= LIMITES.email.max && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

/** Dígito de verificación del NIT (algoritmo DIAN) */
export function digitoVerificacionNit(base: string): number {
  const pesos = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
  const suma = base
    .split('')
    .reverse()
    .reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  const resto = suma % 11;
  return resto > 1 ? 11 - resto : resto;
}

export function revisarNit(valor: string): 'incompleto' | 'valido' | 'dv-incorrecto' {
  const m = new RegExp(`^(\\d{${LIMITES.nit.largo}})-(\\d)$`).exec(valor.trim());
  if (!m) return 'incompleto';
  return Number(m[2]) === digitoVerificacionNit(m[1]) ? 'valido' : 'dv-incorrecto';
}

// ------------------------------------------------------------------------------
// Validación por campo: devuelven el mensaje de error o null si el valor es correcto.
// Se usan en el registro, en Mi cuenta y en la compra.
// ------------------------------------------------------------------------------
const SOLO_LETRAS = new RegExp(`^[${LETRAS}]+( [${LETRAS}]+)*$`);
const RAZON_SOCIAL = new RegExp(`^[${LETRAS}0-9 .,&'()-]+$`);
const DIRECCION = new RegExp(`^[${LETRAS}0-9 #°.,-]+$`);
const TIENE_LETRA = new RegExp(`[${LETRAS}]`);

/** Unifica el formato antes de validar y guardar (igual en navegador y servidor) */
export const normalizar = {
  texto: (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim(),
  /** Quita espacios, guiones y el indicativo +57 */
  telefono: (v: unknown) =>
    normalizar
      .texto(v)
      .replace(/[\s()+.-]/g, '')
      .replace(/^57(?=\d{10}$)/, ''),
  documento: (v: unknown, tipo: string) =>
    tipo === 'NIT' ? filtrar.nit(normalizar.texto(v)) : normalizar.texto(v).replace(/[\s.-]/g, '').toUpperCase(),
};

export const validarCampo = {
  email(v: string): string | null {
    return emailValido(v) ? null : 'Escribe un correo válido, por ejemplo nombre@correo.com.';
  },

  nombre(v: string, etiqueta: string, limites: { min: number; max: number }): string | null {
    if (v.length < limites.min || v.length > limites.max) {
      return `${etiqueta} debe tener entre ${limites.min} y ${limites.max} letras.`;
    }
    return SOLO_LETRAS.test(v) ? null : `${etiqueta} solo puede tener letras y espacios.`;
  },

  nombreCompleto(v: string): string | null {
    if (v && !v.includes(' ')) return 'Escribe nombre y apellido.';
    return validarCampo.nombre(v, 'El nombre completo', LIMITES.nombreCompleto);
  },

  telefono(v: string): string | null {
    if (!new RegExp(`^\\d{${LIMITES.telefono.largo}}$`).test(v)) {
      return `El teléfono debe tener exactamente ${LIMITES.telefono.largo} números.`;
    }
    return /^(3|60)/.test(v) ? null : 'El celular debe empezar por 3 (o por 60 si es un fijo).';
  },

  direccion(v: string): string | null {
    const { min, max } = LIMITES.direccion;
    if (v.length < min || v.length > max) return `La dirección debe tener entre ${min} y ${max} caracteres.`;
    if (!/\d/.test(v) || !TIENE_LETRA.test(v)) return 'Escribe la dirección completa, por ejemplo: Calle 10 # 43E-28, apto 301.';
    return DIRECCION.test(v) ? null : 'La dirección solo puede tener letras, números y los signos # ° . , -';
  },

  razonSocial(v: string): string | null {
    const { min, max } = LIMITES.razonSocial;
    if (v.length < min || v.length > max) return `La razón social debe tener entre ${min} y ${max} caracteres.`;
    return TIENE_LETRA.test(v) && RAZON_SOCIAL.test(v)
      ? null
      : "La razón social solo puede tener letras, números y los signos . , & - ' ( ).";
  },

  documento(v: string, tipo: string): string | null {
    if (tipo === 'NIT') {
      const nit = revisarNit(v);
      if (nit === 'incompleto') {
        return `El NIT debe tener ${LIMITES.nit.largo} dígitos y su dígito de verificación, por ejemplo 901234567-8.`;
      }
      return nit === 'dv-incorrecto' ? 'El dígito de verificación del NIT no coincide. Revisa el número.' : null;
    }
    const regla = DOCUMENTOS[tipo as TipoDocumentoPersona];
    if (!regla) return 'Elige un tipo de documento válido.';
    const patron = regla.soloNumeros ? /^\d+$/ : /^[A-Z0-9]+$/;
    if (patron.test(v) && v.length >= regla.min && v.length <= regla.max) return null;
    const largo = regla.min === regla.max ? `${regla.min}` : `entre ${regla.min} y ${regla.max}`;
    return `El número de ${regla.label} debe tener ${largo} ${regla.soloNumeros ? 'dígitos (solo números)' : 'letras o números'}.`;
  },

  password(v: string): string | null {
    if (v.length > LIMITES.password.max) return `La contraseña puede tener máximo ${LIMITES.password.max} caracteres.`;
    const falta = REGLAS_CONTRASENA.filter((r) => !r.cumple(v)).map((r) => r.texto.toLowerCase());
    return falta.length ? `A la contraseña le falta: ${falta.join(', ')}.` : null;
  },

  notas(v: string): string | null {
    return v.length > LIMITES.notas.max ? `Las indicaciones pueden tener máximo ${LIMITES.notas.max} caracteres.` : null;
  },
};

/** Texto de ayuda con el formato esperado para el número de documento */
export function ayudaDocumento(tipo: TipoDocumento): string {
  if (tipo === 'NIT') return `${LIMITES.nit.largo} dígitos y el de verificación; el guion se pone solo.`;
  const r = DOCUMENTOS[tipo];
  return `${r.soloNumeros ? 'Solo números' : 'Letras y números'}, ${r.min === r.max ? r.min : `${r.min} a ${r.max}`} caracteres.`;
}

// ------------------------------------------------------------------------------
// Registro completo
// ------------------------------------------------------------------------------
export interface CamposRegistro {
  tipoPersona: 'NATURAL' | 'JURIDICA';
  nombres: string;
  apellidos: string;
  /** CC, CE, PPT, PA, TI o NIT */
  tipoDocumento: string;
  documento: string;
  razonSocial: string;
  cargo: string;
  telefono: string;
  direccion: string;
  password: string;
}

export type CampoRegistro = keyof CamposRegistro;

export function normalizarRegistro(raw: Record<string, unknown>): CamposRegistro {
  const txt = normalizar.texto;
  const juridica = raw.tipoPersona === 'JURIDICA';
  const tipo = juridica ? 'NIT' : txt(raw.tipoDocumento).toUpperCase() || 'CC';
  return {
    tipoPersona: juridica ? 'JURIDICA' : 'NATURAL',
    nombres: txt(raw.nombres),
    apellidos: txt(raw.apellidos),
    tipoDocumento: tipo,
    documento: normalizar.documento(raw.documento, tipo),
    razonSocial: juridica ? txt(raw.razonSocial) : '',
    cargo: juridica ? txt(raw.cargo) : '',
    telefono: normalizar.telefono(raw.telefono),
    direccion: txt(raw.direccion),
    password: String(raw.password ?? ''),
  };
}

/** Devuelve el primer error encontrado (con el campo, para enfocarlo) o null si todo está bien */
export function validarRegistro(c: CamposRegistro): { campo: CampoRegistro; mensaje: string } | null {
  const juridica = c.tipoPersona === 'JURIDICA';
  const revisiones: Array<[CampoRegistro, string | null]> = [
    ['razonSocial', juridica ? validarCampo.razonSocial(c.razonSocial) : null],
    ['documento', juridica ? validarCampo.documento(c.documento, 'NIT') : null],
    ['nombres', validarCampo.nombre(c.nombres, 'Los nombres', LIMITES.nombres)],
    ['apellidos', validarCampo.nombre(c.apellidos, 'Los apellidos', LIMITES.apellidos)],
    ['cargo', juridica && c.cargo ? validarCampo.nombre(c.cargo, 'El cargo', { min: 2, max: LIMITES.cargo.max }) : null],
    ['documento', juridica ? null : validarCampo.documento(c.documento, c.tipoDocumento)],
    ['telefono', validarCampo.telefono(c.telefono)],
    ['direccion', validarCampo.direccion(c.direccion)],
    ['password', validarCampo.password(c.password)],
  ];
  const fallo = revisiones.find(([, mensaje]) => mensaje);
  return fallo ? { campo: fallo[0], mensaje: fallo[1]! } : null;
}
