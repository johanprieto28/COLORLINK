import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

// ------------------------------------------------------------------------------
// Marca
// ------------------------------------------------------------------------------
/** Isotipo de COLORLINK: cuatro muestras de color sobre un cuadro azul marino (igual que el favicon) */
export const BrandMark: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ size = 'md', className = '' }) => {
  const caja = { sm: 'w-8 h-8 rounded-lg', md: 'w-9 h-9 rounded-xl', lg: 'w-14 h-14 rounded-2xl' }[size];
  const grilla = { sm: 'w-3.5 h-3.5 gap-0.5', md: 'w-4 h-4 gap-0.5', lg: 'w-6 h-6 gap-1' }[size];
  const celda = size === 'lg' ? 'rounded-[3px]' : 'rounded-[2px]';
  return (
    <span aria-hidden="true" className={`inline-flex items-center justify-center shrink-0 bg-[#092653] ${caja} ${className}`}>
      <span className={`grid grid-cols-2 ${grilla}`}>
        <span className={`${celda} bg-[#155EEF]`} />
        <span className={`${celda} bg-[#08B6CC]`} />
        <span className={`${celda} bg-[#FFE34D]`} />
        <span className={`${celda} bg-[#FAFAF7]`} />
      </span>
    </span>
  );
};

// ------------------------------------------------------------------------------
// Botones
// ------------------------------------------------------------------------------
type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'danger';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-[#155EEF] hover:bg-[#092653] text-white shadow-xs',
  accent: 'bg-[#08B6CC] hover:bg-[#092653] text-white shadow-xs',
  secondary: 'bg-white hover:bg-[#FAFAF7] text-[#092653] border border-[#E7EAF0] hover:border-slate-300',
  ghost: 'text-[#155EEF] hover:bg-[#155EEF]/8',
  danger: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-xl gap-2',
  };
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-3 focus-visible:ring-[#155EEF]/30 ${BUTTON_STYLES[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};

// ------------------------------------------------------------------------------
// Formularios
// ------------------------------------------------------------------------------
export const Field: React.FC<{
  label: string;
  hint?: string;
  /** Mensaje de validación; reemplaza la ayuda mientras exista */
  error?: string | null;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ label, hint, error, required, children, className = '' }) => (
  <label className={`block space-y-1.5 ${className}`}>
    <span className="text-xs font-semibold text-[#15243B]">
      {label}
      {required && <span className="text-rose-600"> *</span>}
    </span>
    {children}
    {error ? (
      <span role="alert" className="cl-slide-down flex items-start gap-1 text-[11px] font-medium text-rose-600">
        <AlertCircle className="w-3 h-3 mt-px shrink-0" />
        {error}
      </span>
    ) : (
      hint && <span className="block text-[11px] text-slate-500">{hint}</span>
    )}
  </label>
);

export const INPUT_CLASS =
  'w-full bg-white border border-[#E7EAF0] rounded-xl px-3.5 py-2.5 text-sm text-[#15243B] placeholder-slate-400 focus:outline-none focus:border-[#155EEF] focus:ring-3 focus:ring-[#155EEF]/15 disabled:bg-slate-50 disabled:text-slate-500';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => <input ref={ref} className={`${INPUT_CLASS} ${className}`} {...props} />
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea className={`${INPUT_CLASS} ${className}`} {...props} />
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => (
  <select className={`${INPUT_CLASS} cursor-pointer ${className}`} {...props}>
    {children}
  </select>
);

// ------------------------------------------------------------------------------
// Estados
// ------------------------------------------------------------------------------
export const Spinner: React.FC<{ label?: string; className?: string }> = ({ label = 'Cargando…', className = '' }) => (
  <div className={`flex items-center justify-center gap-2 py-16 text-sm text-slate-500 ${className}`} role="status">
    <Loader2 className="w-5 h-5 animate-spin text-[#155EEF]" />
    <span>{label}</span>
  </div>
);

export const ErrorBox: React.FC<{ message: string; onRetry?: () => void; className?: string }> = ({
  message,
  onRetry,
  className = '',
}) => (
  <div className={`p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start gap-3 ${className}`} role="alert">
    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
    <div className="flex-1 space-y-2">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="text-xs font-semibold underline cursor-pointer">
          Reintentar
        </button>
      )}
    </div>
  </div>
);

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="py-14 px-6 text-center bg-white border border-dashed border-[#E7EAF0] rounded-3xl space-y-3">
    <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FAFAF7] border border-[#E7EAF0] flex items-center justify-center text-[#155EEF]">
      {icon}
    </div>
    <h3 className="font-display text-base font-bold text-[#092653]">{title}</h3>
    {description && <p className="text-sm text-slate-600 max-w-md mx-auto">{description}</p>}
    {action && <div className="pt-2 flex justify-center">{action}</div>}
  </div>
);

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white border border-[#E7EAF0] rounded-2xl shadow-2xs ${className}`}>{children}</div>
);

export const PageHeader: React.FC<{
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}> = ({ eyebrow, title, description, actions }) => (
  <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div className="space-y-1.5 max-w-3xl">
      {eyebrow && <span className="text-xs font-bold uppercase tracking-widest text-[#155EEF]">{eyebrow}</span>}
      <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#092653] tracking-tight">{title}</h1>
      {description && <p className="text-sm sm:text-base text-[#15243B]/75 leading-relaxed">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

// ------------------------------------------------------------------------------
// Animación de entrada y salida
// ------------------------------------------------------------------------------
/**
 * Mantiene montado un elemento mientras se anima su salida.
 * `state` va en data-state del contenedor .cl-overlay ('open' | 'closed').
 */
export function usePresence(open: boolean, exitMs = 320) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      // Dos cuadros: el primero pinta el estado cerrado, el segundo dispara la transición
      let raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), exitMs);
    return () => clearTimeout(t);
  }, [open, exitMs]);
  return { mounted, state: visible ? ('open' as const) : ('closed' as const) };
}

// ------------------------------------------------------------------------------
// Modal
// ------------------------------------------------------------------------------
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl';
}> = ({ open, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const { mounted, state } = usePresence(open);
  if (!mounted) return null;
  const widths = { md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div
      data-state={state}
      className="cl-overlay fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#092653]/50 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`cl-modal cl-modal-sheet w-full ${widths[size]} bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col`}
      >
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-[#E7EAF0]">
          <h2 className="font-display text-lg font-extrabold text-[#092653]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 sm:px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------------------
// Notificaciones (toasts)
// ------------------------------------------------------------------------------
interface Toast {
  id: number;
  tipo: 'exito' | 'error';
  mensaje: string;
}

let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
let toastSeq = 0;

function emitToasts() {
  toastListeners.forEach((l) => l());
}

export function toast(mensaje: string, tipo: Toast['tipo'] = 'exito') {
  const id = ++toastSeq;
  toasts = [...toasts, { id, tipo, mensaje }];
  emitToasts();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitToasts();
  }, tipo === 'error' ? 6000 : 3500);
}

export const Toaster: React.FC = () => {
  const items = useSyncExternalStore(
    (cb) => {
      toastListeners.add(cb);
      return () => toastListeners.delete(cb);
    },
    () => toasts
  );
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-2rem)] max-w-md space-y-2 pointer-events-none" aria-live="polite">
      {items.map((t) => (
        <div
          key={t.id}
          className={`cl-toast pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm ${
            t.tipo === 'exito' ? 'bg-white border-emerald-200 text-[#15243B]' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {t.tipo === 'exito' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{t.mensaje}</span>
        </div>
      ))}
    </div>
  );
};
