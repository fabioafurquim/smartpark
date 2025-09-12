import { InputHTMLAttributes, forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

/**
 * Componente Input reutilizável
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    label,
    error,
    helperText,
    fullWidth = false,
    startIcon,
    endIcon,
    id,
    ...props 
  }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = !!error;

    const baseClasses = [
      'block w-full rounded-lg border px-3 py-2 text-sm',
      'placeholder:text-gray-400',
      'focus:outline-none focus:ring-2 focus:ring-offset-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'transition-colors',
    ];

    const stateClasses = hasError
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500';

    const iconPadding = {
      left: startIcon ? 'pl-10' : '',
      right: endIcon ? 'pr-10' : '',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <div className={cn('relative', widthClass)}>
        {/* Label */}
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          {/* Start icon */}
          {startIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <div className="text-gray-400">
                {startIcon}
              </div>
            </div>
          )}

          {/* Input */}
          <input
            id={inputId}
            className={cn(
              baseClasses,
              stateClasses,
              iconPadding.left,
              iconPadding.right,
              className
            )}
            ref={ref}
            {...props}
          />

          {/* End icon */}
          {endIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <div className={cn(
                hasError ? 'text-red-400' : 'text-gray-400'
              )}>
                {endIcon}
              </div>
            </div>
          )}

          {/* Error icon */}
          {hasError && !endIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
          )}
        </div>

        {/* Helper text or error */}
        {(error || helperText) && (
          <p className={cn(
            'mt-1 text-xs',
            hasError ? 'text-red-600' : 'text-gray-500'
          )}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';