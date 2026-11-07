import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Building2, Check, CheckCircle2, Eye, EyeOff, Home, MailCheck, X } from 'lucide-react';
import { authStore, useAuth, type TipoPersona } from '../../stores/auth';
import type { ClientChannel } from '../../types';

import { errorMessage } from '../../lib/api';
import { BrandMark, Button, Field, Input, Select } from '../ui';
import { CiudadCombobox } from '../common/CiudadCombobox';
import {
  DOCUMENTOS,
  emailValido,
  filtrar,
  LIMITES,
  normalizarRegistro,
  REGLAS_CONTRASENA,
  revisarNit,
  validarRegistro,
  type CampoRegistro,
  type TipoDocumentoPersona,
} from '../../data/reglasRegistro';

type Mode = 'login' | 'register' | 'forgot';
/** Registro: primero se verifica el correo con un código y luego se capturan los datos */
type RegisterStep = 'correo' | 'codigo' | 'datos';

interface AuthViewProps {
  onSuccess: () => void;
  onClose?: () => void;
  initialMode?: Mode;
  /** Explica por qué se pide iniciar sesión (p. ej. "para agregar al carrito") */
  motivo?: string;
}

const TITLES: Record<Mode, { title: string; subtitle: string }> = {
  login: { title: 'Ingresa a tu cuenta', subtitle: 'Accede a tus pedidos, proyectos y colores guardados.' },
  register: { title: 'Crea tu cuenta', subtitle: 'Primero verificaremos tu correo con un código de 6 dígitos.' },
  forgot: { title: 'Recupera tu contraseña', subtitle: 'Te enviaremos un enlace para crear una nueva.' },
};

const REGISTER_TITLES: Record<RegisterStep, { title: string; subtitle: string }> = {
  correo: TITLES.register,
  codigo: { title: 'Revisa tu correo', subtitle: 'Escribe el código de 6 dígitos que te enviamos.' },
  datos: { title: 'Completa tu perfil', subtitle: 'Con estos datos precargamos tus compras y tus proyectos.' },
};

const TIPOS_PERSONA: Array<{ value: TipoPersona; titulo: string; detalle: string; Icono: typeof Home }> = [
  { value: 'NATURAL', titulo: 'Para mi hogar', detalle: 'Persona natural', Icono: Home },
  { value: 'JURIDICA', titulo: 'Para mi empresa', detalle: 'Persona jurídica · NIT', Icono: Building2 },
];

/** Título pequeño que separa los grupos del formulario */
const Grupo: React.FC<{ titulo: string; children: React.ReactNode }> = ({ titulo, children }) => (
  <fieldset className="space-y-3.5">
    <legend className="flex items-center gap-2 w-full mb-3 text-[11px] font-bold uppercase tracking-wider text-[#08B6CC]">
      {titulo}
      <span className="flex-1 h-px bg-[#E7EAF0]" />
    </legend>
    {children}
  </fieldset>
);

const CANALES: Array<{ value: ClientChannel; label: string }> = [
  { value: 'WEB', label: 'Plataforma web COLORLINK' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'REFERIDO', label: 'Recomendación / Referido' },
  { value: 'COMERCIAL', label: 'Asesor comercial' },
  { value: 'FERIA', label: 'Evento o punto físico' },
];

const ESPERA_REENVIO = 60;

/** Seis casillas para el código: avanza solo, acepta pegar el código completo y borrar hacia atrás */
const CodigoInput: React.FC<{ value: string; onChange: (v: string) => void; disabled?: boolean }> = ({
  value,
  onChange,
  disabled,
}) => {
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const setDigitos = (desde: number, digitos: string) => {
    const chars = value.padEnd(6, ' ').split('');
    digitos.split('').forEach((d, i) => {
      if (desde + i < 6) chars[desde + i] = d;
    });
    onChange(chars.join('').replace(/\s+$/, ''));
    refs.current[Math.min(desde + digitos.length, 5)]?.focus();
  };

  return (
    <div className="flex justify-center gap-2" role="group" aria-label="Código de verificación">
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={value[i]?.trim() || ''}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Dígito ${i + 1}`}
          maxLength={6}
          onChange={(e) => {
            const digitos = e.target.value.replace(/\D/g, '');
            if (digitos) setDigitos(i, digitos);
          }}
          onPaste={(e) => {
            e.preventDefault();
            const digitos = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (digitos) setDigitos(0, digitos);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') {
              e.preventDefault();
              const chars = value.padEnd(6, ' ').split('');
              const borrar = chars[i].trim() ? i : Math.max(0, i - 1);
              chars[borrar] = ' ';
              onChange(chars.join('').replace(/\s+$/, ''));
              refs.current[borrar]?.focus();
            } else if (e.key === 'ArrowLeft') refs.current[i - 1]?.focus();
            else if (e.key === 'ArrowRight') refs.current[i + 1]?.focus();
          }}
          className="w-11 h-13 sm:w-12 sm:h-14 text-center text-2xl font-extrabold text-[#092653] bg-white border border-[#E7EAF0] rounded-xl focus:outline-none focus:border-[#155EEF] focus:ring-3 focus:ring-[#155EEF]/15 disabled:bg-slate-50"
        />
      ))}
    </div>
  );
};

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onClose, initialMode = 'login', motivo }) => {
  const { authDisponible: authConfigured } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [registerStep, setRegisterStep] = useState<RegisterStep>('correo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registro
  const [codigo, setCodigo] = useState('');
  const [token, setToken] = useState('');
  const [reenvioEn, setReenvioEn] = useState(0);
  const [tipoPersona, setTipoPersona] = useState<TipoPersona>('NATURAL');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoPersona>('CC');
  const [documento, setDocumento] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [cargo, setCargo] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [canal, setCanal] = useState<ClientChannel>('WEB');
  const [verContrasena, setVerContrasena] = useState(false);
  const [aceptaDatos, setAceptaDatos] = useState(false);

  const juridica = tipoPersona === 'JURIDICA';
  const estadoNit = juridica ? revisarNit(documento) : null;
  const formRef = useRef<HTMLFormElement>(null);

  /** Muestra el error y lleva el cursor al campo que hay que corregir */
  const marcarError = (mensaje: string, campo?: CampoRegistro | 'email' | 'ciudad') => {
    setError(mensaje);
    if (campo) formRef.current?.querySelector<HTMLElement>(`[name="${campo}"]`)?.focus();
  };

  useEffect(() => {
    if (reenvioEn <= 0) return;
    const t = setTimeout(() => setReenvioEn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [reenvioEn]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setRegisterStep('correo');
    setCodigo('');
    setToken('');
    setError(null);
    setInfo(null);
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const enviarCodigo = () =>
    run(async () => {
      const minutos = await authStore.enviarCodigoRegistro(email);
      setCodigo('');
      setRegisterStep('codigo');
      setReenvioEn(ESPERA_REENVIO);
      setInfo(`Enviamos un código a ${email.trim()}. Vence en ${minutos} minutos.`);
    });

  const verificarCodigo = (valor = codigo) =>
    run(async () => {
      if (valor.length !== 6) throw new Error('Escribe los 6 dígitos del código.');
      setToken(await authStore.verificarCodigoRegistro(email, valor));
      setRegisterStep('datos');
      setInfo('Correo verificado. Completa tus datos para crear la cuenta.');
    });

  const cambiarCodigo = (valor: string) => {
    setCodigo(valor);
    // Al completar los 6 dígitos se verifica sin tener que pulsar el botón
    if (/^\d{6}$/.test(valor) && !loading) void verificarCodigo(valor);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode !== 'register' || registerStep === 'correo') {
      if (!emailValido(email.trim())) return marcarError('Escribe un correo válido, por ejemplo nombre@correo.com.', 'email');
    }
    if (mode === 'login') {
      if (password.length < LIMITES.password.min) {
        return marcarError(`La contraseña tiene mínimo ${LIMITES.password.min} caracteres.`, 'password');
      }
      return run(async () => {
        await authStore.signIn(email, password);
        onSuccess();
      });
    }
    if (mode === 'forgot') {
      return run(async () => {
        await authStore.resetPassword(email);
        setInfo('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.');
      });
    }

    if (registerStep === 'correo') return enviarCodigo();
    if (registerStep === 'codigo') return verificarCodigo();

    const invalido = validarRegistro(
      normalizarRegistro({ tipoPersona, nombres, apellidos, tipoDocumento, documento, razonSocial, cargo, telefono, direccion, password })
    );
    if (invalido) return marcarError(invalido.mensaje, invalido.campo);
    if (!ciudad) return marcarError('Selecciona tu ciudad de la lista.', 'ciudad');
    if (!aceptaDatos) return setError('Debes aceptar el tratamiento de datos personales para crear tu cuenta.');
    return run(async () => {
      try {
        await authStore.signUp({
          email,
          token,
          tipoPersona,
          nombres,
          apellidos,
          tipoDocumento: juridica ? 'NIT' : tipoDocumento,
          documento,
          razonSocial: juridica ? razonSocial : undefined,
          cargo: juridica ? cargo : undefined,
          ciudad,
          direccion,
          telefono,
          canal,
          password,
          aceptaDatos,
        });
      } catch (err) {
        // Si la verificación venció hay que pedir un código nuevo
        if (/verificaci[oó]n del correo venci/i.test(errorMessage(err))) {
          setRegisterStep('correo');
          setToken('');
        }
        throw err;
      }
      onSuccess();
    });
  };

  const { title, subtitle } = mode === 'register' ? REGISTER_TITLES[registerStep] : TITLES[mode];
  const submitLabel =
    mode === 'login'
      ? 'Ingresar'
      : mode === 'forgot'
        ? 'Enviar enlace'
        : registerStep === 'correo'
          ? 'Enviar código'
          : registerStep === 'codigo'
            ? 'Verificar código'
            : 'Crear cuenta';
  const anchoDatos = mode === 'register' && registerStep === 'datos';

  return (
    <div className={`w-full ${anchoDatos ? 'max-w-xl' : 'max-w-md'} bg-white border border-[#E7EAF0] rounded-3xl shadow-2xl p-6 sm:p-8 relative my-auto transition-[max-width] duration-300`}>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {mode === 'register' && (
        <ol className="flex items-center justify-center gap-2 mb-5" aria-label="Pasos del registro">
          {(['correo', 'codigo', 'datos'] as RegisterStep[]).map((paso, i) => {
            const actual = ['correo', 'codigo', 'datos'].indexOf(registerStep);
            return (
              <li
                key={paso}
                aria-current={i === actual ? 'step' : undefined}
                className={`h-1.5 w-10 rounded-full ${i <= actual ? 'bg-[#08B6CC]' : 'bg-[#E7EAF0]'}`}
              />
            );
          })}
        </ol>
      )}

      <div className="text-center mb-6">
        {mode === 'register' && registerStep === 'codigo' ? (
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#092653] text-[#08B6CC] mb-3">
            <MailCheck className="w-6 h-6" />
          </div>
        ) : (
          <BrandMark size="lg" className="mb-3 shadow-lg shadow-[#092653]/20" />
        )}
        <h2 className="font-display text-2xl font-extrabold text-[#092653] tracking-tight">{title}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {motivo && mode !== 'forgot' && !(mode === 'register' && registerStep !== 'correo') ? motivo : subtitle}
        </p>
      </div>

      {!authConfigured && (
        <div className="p-3.5 mb-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          El inicio de sesión aún no está configurado en este entorno (faltan las variables de Supabase).
        </div>
      )}
      {error && (
        <div role="alert" className="p-3.5 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {info && (
        <div role="status" className="p-3.5 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{info}</span>
        </div>
      )}

      {/* La clave reinicia la animación al pasar de un paso a otro */}
      <form ref={formRef} key={`${mode}-${registerStep}`} onSubmit={handleSubmit} noValidate className="cl-slide-down space-y-4">
        {(mode !== 'register' || registerStep === 'correo') && (
          <Field label="Correo electrónico" required>
            <Input
              name="email"
              value={email}
              onChange={(e) => setEmail(filtrar.email(e.target.value))}
              type="email"
              required
              maxLength={LIMITES.email.max}
              autoComplete="email"
              autoFocus
            />
          </Field>
        )}

        {mode === 'login' && (
          <Field label="Contraseña" required>
            <Input
              name="password"
              value={password}
              onChange={(e) => setPassword(filtrar.password(e.target.value))}
              type="password"
              required
              maxLength={LIMITES.password.max}
              autoComplete="current-password"
            />
          </Field>
        )}

        {mode === 'register' && registerStep === 'codigo' && (
          <div className="space-y-4">
            <CodigoInput value={codigo} onChange={cambiarCodigo} disabled={loading} />
            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => switchMode('register')}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-[#155EEF] cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Cambiar correo
              </button>
              <button
                type="button"
                onClick={enviarCodigo}
                disabled={reenvioEn > 0 || loading}
                className="font-semibold text-[#155EEF] hover:underline cursor-pointer disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
              >
                {reenvioEn > 0 ? `Reenviar código en ${reenvioEn}s` : 'Reenviar código'}
              </button>
            </div>
          </div>
        )}

        {mode === 'register' && registerStep === 'datos' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#08B6CC]/8 border border-[#08B6CC]/25 text-sm">
              <CheckCircle2 className="w-4 h-4 text-[#08B6CC] shrink-0" />
              <span className="truncate text-[#092653] font-semibold">{email.trim()}</span>
              <span className="ml-auto text-[11px] font-semibold text-[#08B6CC] shrink-0">Verificado</span>
            </div>

            <div role="radiogroup" aria-label="Tipo de cuenta" className="grid grid-cols-2 gap-3">
              {TIPOS_PERSONA.map(({ value, titulo, detalle, Icono }) => {
                const activo = tipoPersona === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    onClick={() => {
                      setTipoPersona(value);
                      setDocumento('');
                    }}
                    className={`relative text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                      activo
                        ? 'border-[#08B6CC] bg-[#08B6CC]/6 shadow-sm'
                        : 'border-[#E7EAF0] hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-2 transition-colors ${
                        activo ? 'bg-[#092653] text-[#08B6CC]' : 'bg-[#FAFAF7] text-slate-500'
                      }`}
                    >
                      <Icono className="w-4.5 h-4.5" />
                    </span>
                    <span className="block font-display text-sm font-extrabold text-[#092653]">{titulo}</span>
                    <span className="block text-[11px] text-slate-500">{detalle}</span>
                    {activo && (
                      <span className="cl-pop absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#08B6CC] text-white flex items-center justify-center">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* La clave reinicia la animación al cambiar de tipo de cuenta */}
            <div key={tipoPersona} className="cl-slide-down space-y-6">
              {juridica ? (
                <Grupo titulo="Empresa">
                  <Field label="Razón social" required>
                    <Input
                      name="razonSocial"
                      value={razonSocial}
                      onChange={(e) => setRazonSocial(filtrar.razonSocial(e.target.value))}
                      required
                      maxLength={LIMITES.razonSocial.max}
                      autoComplete="organization"
                      placeholder="Como aparece en el RUT"
                      autoFocus
                    />
                  </Field>
                  <Field
                    label="NIT con dígito de verificación"
                    required
                    hint={
                      estadoNit === 'dv-incorrecto'
                        ? undefined
                        : estadoNit === 'valido'
                          ? 'NIT válido.'
                          : `${LIMITES.nit.largo} dígitos y el de verificación; el guion se pone solo.`
                    }
                  >
                    <div className="relative">
                      <Input
                        name="documento"
                        value={documento}
                        onChange={(e) => setDocumento(filtrar.nit(e.target.value))}
                        required
                        maxLength={LIMITES.nit.largo + 2}
                        inputMode="numeric"
                        placeholder="000000000-0"
                        aria-invalid={estadoNit === 'dv-incorrecto'}
                        className={estadoNit === 'dv-incorrecto' ? 'border-rose-300! focus:ring-rose-500/15!' : ''}
                      />
                      {estadoNit === 'valido' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                      )}
                    </div>
                    {estadoNit === 'dv-incorrecto' && (
                      <span className="block text-[11px] text-rose-600">El dígito de verificación no coincide con el NIT.</span>
                    )}
                  </Field>
                </Grupo>
              ) : null}

              <Grupo titulo={juridica ? 'Persona de contacto' : 'Tus datos'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Field label="Nombres" required hint={`Solo letras, máximo ${LIMITES.nombres.max}.`}>
                    <Input
                      name="nombres"
                      value={nombres}
                      onChange={(e) => setNombres(filtrar.nombre(e.target.value, LIMITES.nombres.max))}
                      required
                      maxLength={LIMITES.nombres.max}
                      autoComplete="given-name"
                      autoFocus={!juridica}
                    />
                  </Field>
                  <Field label="Apellidos" required hint={`Solo letras, máximo ${LIMITES.apellidos.max}.`}>
                    <Input
                      name="apellidos"
                      value={apellidos}
                      onChange={(e) => setApellidos(filtrar.nombre(e.target.value, LIMITES.apellidos.max))}
                      required
                      maxLength={LIMITES.apellidos.max}
                      autoComplete="family-name"
                    />
                  </Field>
                </div>
                {juridica ? (
                  <Field label="Cargo" hint="Opcional.">
                    <Input
                      name="cargo"
                      value={cargo}
                      onChange={(e) => setCargo(filtrar.nombre(e.target.value, LIMITES.cargo.max))}
                      maxLength={LIMITES.cargo.max}
                      autoComplete="organization-title"
                      placeholder="Ej. Jefe de compras"
                    />
                  </Field>
                ) : (
                  <div className="grid grid-cols-[7.5rem_1fr] gap-3.5">
                    <Field label="Documento" required>
                      <Select
                        name="tipoDocumento"
                        value={tipoDocumento}
                        onChange={(e) => {
                          const tipo = e.target.value as TipoDocumentoPersona;
                          setTipoDocumento(tipo);
                          setDocumento((d) => filtrar.documento(d, tipo));
                        }}
                      >
                        {(Object.keys(DOCUMENTOS) as TipoDocumentoPersona[]).map((t) => (
                          <option key={t} value={t}>
                            {DOCUMENTOS[t].label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      label="Número"
                      required
                      hint={`${DOCUMENTOS[tipoDocumento].soloNumeros ? 'Solo números' : 'Letras y números'}, ${
                        DOCUMENTOS[tipoDocumento].min === DOCUMENTOS[tipoDocumento].max
                          ? DOCUMENTOS[tipoDocumento].min
                          : `${DOCUMENTOS[tipoDocumento].min} a ${DOCUMENTOS[tipoDocumento].max}`
                      } caracteres.`}
                    >
                      <Input
                        name="documento"
                        value={documento}
                        onChange={(e) => setDocumento(filtrar.documento(e.target.value, tipoDocumento))}
                        required
                        maxLength={DOCUMENTOS[tipoDocumento].max}
                        inputMode={DOCUMENTOS[tipoDocumento].soloNumeros ? 'numeric' : 'text'}
                        placeholder="Sin puntos ni espacios"
                      />
                    </Field>
                  </div>
                )}
              </Grupo>

              <Grupo titulo={juridica ? 'Ubicación de la empresa u obra' : 'Entrega y contacto'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <Field label="Ciudad" required>
                    <CiudadCombobox name="ciudad" value={ciudad} onChange={setCiudad} required />
                  </Field>
                  <Field label={juridica ? 'Teléfono o celular' : 'Celular'} required hint={`${LIMITES.telefono.largo} números, sin espacios.`}>
                    <Input
                      name="telefono"
                      value={telefono}
                      onChange={(e) => setTelefono(filtrar.telefono(e.target.value))}
                      type="tel"
                      inputMode="numeric"
                      required
                      maxLength={LIMITES.telefono.largo}
                      autoComplete="tel-national"
                      placeholder="3001234567"
                    />
                  </Field>
                </div>
                <Field label="Dirección" required hint="La usaremos para precargar tus entregas. Podrás cambiarla en cada compra.">
                  <Input
                    name="direccion"
                    value={direccion}
                    onChange={(e) => setDireccion(filtrar.direccion(e.target.value))}
                    required
                    maxLength={LIMITES.direccion.max}
                    autoComplete="street-address"
                    placeholder="Calle, número, apto o casa"
                  />
                </Field>
                <Field label="¿Cómo nos conociste?">
                  <Select value={canal} onChange={(e) => setCanal(e.target.value as ClientChannel)}>
                    {CANALES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </Grupo>

              <Grupo titulo="Seguridad">
                <Field label="Contraseña" required>
                  <div className="relative">
                    <Input
                      name="password"
                      value={password}
                      onChange={(e) => setPassword(filtrar.password(e.target.value))}
                      type={verContrasena ? 'text' : 'password'}
                      maxLength={LIMITES.password.max}
                      required
                      autoComplete="new-password"
                      className="pr-11!"
                    />
                    <button
                      type="button"
                      onClick={() => setVerContrasena((v) => !v)}
                      aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-[#092653] cursor-pointer"
                    >
                      {verContrasena ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>
                <ul className="flex flex-wrap gap-1.5" aria-label="Requisitos de la contraseña">
                  {REGLAS_CONTRASENA.map((r) => {
                    const ok = r.cumple(password);
                    return (
                      <li
                        key={r.texto}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          ok ? 'bg-emerald-50 text-emerald-700' : 'bg-[#FAFAF7] text-slate-500'
                        }`}
                      >
                        {ok ? <Check className="w-3 h-3" strokeWidth={3} /> : <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                        {r.texto}
                      </li>
                    );
                  })}
                </ul>
              </Grupo>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={aceptaDatos}
                onChange={(e) => setAceptaDatos(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#155EEF]"
              />
              <span>
                Autorizo a COLORLINK el tratamiento de mis datos personales para gestionar mi cuenta, compras y proyectos.
              </span>
            </label>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!authConfigured}>
          {submitLabel}
        </Button>
      </form>

      <div className="mt-5 pt-5 border-t border-[#E7EAF0] text-sm text-center space-y-2">
        {mode === 'login' && (
          <>
            <button type="button" onClick={() => switchMode('forgot')} className="text-slate-500 hover:text-[#155EEF] cursor-pointer">
              ¿Olvidaste tu contraseña?
            </button>
            <p className="text-slate-600">
              ¿No estás registrado?{' '}
              <button type="button" onClick={() => switchMode('register')} className="font-semibold text-[#155EEF] hover:underline cursor-pointer">
                Regístrate
              </button>
            </p>
          </>
        )}
        {mode !== 'login' && (
          <p className="text-slate-600">
            ¿Ya tienes cuenta?{' '}
            <button type="button" onClick={() => switchMode('login')} className="font-semibold text-[#155EEF] hover:underline cursor-pointer">
              Inicia sesión
            </button>
          </p>
        )}
      </div>
    </div>
  );
};
