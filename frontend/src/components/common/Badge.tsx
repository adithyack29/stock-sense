import React from 'react';
import { getStatusBadgeVariant } from '../../utils/formatters';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'draft' | 'waiting' | 'ready' | 'done' | 'canceled' | 'info' | 'neutral' | 'danger' | 'warning' | 'success';
  size?: 'sm' | 'md';
  showDot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  showDot = true,
  className = '',
}) => {
  // If variant matches semantic status
  const isStatus = ['draft', 'waiting', 'ready', 'done', 'canceled'].includes(variant);

  let styles = {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
  };

  if (isStatus) {
    styles = getStatusBadgeVariant(variant);
  } else {
    switch (variant) {
      case 'info':
        styles = {
          bg: 'bg-sky-50',
          text: 'text-sky-700',
          border: 'border-sky-200',
          dot: 'bg-sky-500',
        };
        break;
      case 'success':
        styles = {
          bg: 'bg-emerald-50',
          text: 'text-emerald-700',
          border: 'border-emerald-200',
          dot: 'bg-emerald-500',
        };
        break;
      case 'warning':
        styles = {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          dot: 'bg-amber-500',
        };
        break;
      case 'danger':
        styles = {
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200',
          dot: 'bg-rose-500',
        };
        break;
      default:
        styles = {
          bg: 'bg-slate-100',
          text: 'text-slate-700',
          border: 'border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${styles.bg} ${styles.text} ${styles.border} ${sizeClass} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />}
      <span className="capitalize">{children}</span>
    </span>
  );
};

export const MovementBadge: React.FC<{ type: string }> = ({ type }) => {
  switch (type.toLowerCase()) {
    case 'receipt':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          ↓ Receipt (+In)
        </span>
      );
    case 'delivery':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
          ↑ Delivery (-Out)
        </span>
      );
    case 'transfer':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
          ⇄ Transfer (Move)
        </span>
      );
    case 'adjustment':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          ⚡ Adjustment (Fix)
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          {type}
        </span>
      );
  }
};
