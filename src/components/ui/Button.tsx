import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

/**
 * Componente Button reutilizável
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading = false,
    fullWidth = false,
    disabled,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
    ];

    const variants = {
      primary: [
        'bg-primary-600 text-white hover:bg-primary-700',
        'focus:ring-primary-500',
      ],
      secondary: [
        'bg-gray-600 text-white hover:bg-gray-700',
        'focus:ring-gray-500',
      ],
      outline: [
        'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        'focus:ring-primary-500',
      ],
      ghost: [
        'text-gray-700 hover:bg-gray-100',
        'focus:ring-gray-500',
      ],
      danger: [
        'bg-red-600 text-white hover:bg-red-700',
        'focus:ring-red-500',
      ],
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          widthClass,
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';