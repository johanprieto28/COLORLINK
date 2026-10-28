import React from 'react';
import { ProjectStatus, SeverityLevel, ComplexityLevel, UserRole } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'cyan' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
}) => {
  const variantStyles = {
    primary: 'bg-blue-50 text-blue-800 border border-blue-200',
    secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
    cyan: 'bg-cyan-50 text-cyan-800 border border-cyan-200',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border border-rose-200',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 rounded-md gap-1 whitespace-nowrap shrink-0',
    md: 'text-xs font-semibold px-2.5 py-1 rounded-lg gap-1.5 whitespace-nowrap shrink-0',
    lg: 'text-xs font-semibold px-3 py-1.5 rounded-lg gap-2 whitespace-nowrap shrink-0',
  };

  return (
    <span
      className={`inline-flex items-center tracking-tight ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {icon && <span className="inline-block shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export function getStatusBadge(status: ProjectStatus) {
  switch (status) {
    case 'BORRADOR':
      return <Badge variant="neutral">Borrador</Badge>;
    case 'RECIBIDO':
      return <Badge variant="cyan">Recibido</Badge>;
    case 'EN_ANALISIS':
      return <Badge variant="primary">En análisis</Badge>;
    case 'VALIDACION_TECNICA':
      return <Badge variant="warning">En validación técnica</Badge>;
    case 'SOLUCION_GENERADA':
      return <Badge variant="cyan">Solución propuesta</Badge>;
    case 'COTIZACION':
      return <Badge variant="warning">Cotización</Badge>;
    case 'APROBADO':
      return <Badge variant="success">Aprobado</Badge>;
    case 'ABASTECIMIENTO':
      return <Badge variant="primary">Abastecimiento</Badge>;
    case 'SERVICIO_PROGRAMADO':
      return <Badge variant="cyan">Servicio programado</Badge>;
    case 'EN_EJECUCION':
      return <Badge variant="primary">En ejecución</Badge>;
    case 'CALIDAD':
      return <Badge variant="warning">Control de calidad</Badge>;
    case 'CERRADO':
      return <Badge variant="success">Cerrado</Badge>;
    case 'CANCELADO':
      return <Badge variant="danger">Cancelado</Badge>;
    default:
      return <Badge variant="neutral">{status}</Badge>;
  }
}

export function getSeverityBadge(severity: SeverityLevel) {
  switch (severity) {
    case 'LEVE':
      return <Badge variant="success">Severidad leve</Badge>;
    case 'MODERADO':
      return <Badge variant="warning">Severidad moderada</Badge>;
    case 'SEVERO':
      return <Badge variant="danger">Severidad alta</Badge>;
    case 'CRITICO':
      return <Badge variant="danger">Severidad crítica</Badge>;
    default:
      return <Badge variant="neutral">{severity}</Badge>;
  }
}

export function getComplexityBadge(complexity: ComplexityLevel) {
  switch (complexity) {
    case 'BAJA':
      return <Badge variant="success">Complejidad baja</Badge>;
    case 'MEDIA':
      return <Badge variant="cyan">Complejidad media</Badge>;
    case 'ALTA':
      return <Badge variant="warning">Complejidad alta</Badge>;
    case 'CRITICA':
      return <Badge variant="danger">Complejidad crítica</Badge>;
    default:
      return <Badge variant="neutral">{complexity}</Badge>;
  }
}

export function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'cliente':
      return <Badge variant="cyan">Cliente</Badge>;
    case 'tecnico':
      return <Badge variant="primary">Especialista Técnico</Badge>;
    case 'comercial':
      return <Badge variant="warning">Asesor Comercial</Badge>;
    case 'operaciones':
      return <Badge variant="success">Operaciones</Badge>;
    case 'administrador':
      return <Badge variant="danger">Administrador</Badge>;
    default:
      return <Badge variant="neutral">{role}</Badge>;
  }
}
