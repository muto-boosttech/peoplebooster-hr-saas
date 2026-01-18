'use client';

import React from 'react';
import {
  Controller,
  Control,
  FieldPath,
  FieldValues,
  type FieldError as RHFFieldError,
} from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

// Base props for all form fields
interface BaseFormFieldProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

// Text input field
interface TextFieldProps<TFieldValues extends FieldValues>
  extends BaseFormFieldProps<TFieldValues> {
  type: 'text' | 'email' | 'tel' | 'url' | 'number';
  placeholder?: string;
  autoComplete?: string;
}

// Password input field
interface PasswordFieldProps<TFieldValues extends FieldValues>
  extends BaseFormFieldProps<TFieldValues> {
  type: 'password';
  placeholder?: string;
  showToggle?: boolean;
}

// Textarea field
interface TextareaFieldProps<TFieldValues extends FieldValues>
  extends BaseFormFieldProps<TFieldValues> {
  type: 'textarea';
  placeholder?: string;
  rows?: number;
}

// Select field
interface SelectFieldProps<TFieldValues extends FieldValues>
  extends BaseFormFieldProps<TFieldValues> {
  type: 'select';
  placeholder?: string;
  options: { value: string; label: string }[];
}

// Checkbox field
interface CheckboxFieldProps<TFieldValues extends FieldValues>
  extends BaseFormFieldProps<TFieldValues> {
  type: 'checkbox';
  checkboxLabel?: string;
}

// Date field
interface DateFieldProps<TFieldValues extends FieldValues>
  extends BaseFormFieldProps<TFieldValues> {
  type: 'date' | 'datetime-local' | 'time';
  min?: string;
  max?: string;
}

// Union type for all field types
type FormFieldProps<TFieldValues extends FieldValues> =
  | TextFieldProps<TFieldValues>
  | PasswordFieldProps<TFieldValues>
  | TextareaFieldProps<TFieldValues>
  | SelectFieldProps<TFieldValues>
  | CheckboxFieldProps<TFieldValues>
  | DateFieldProps<TFieldValues>;

// Error message component
function FieldError({ error }: { error?: RHFFieldError }) {
  if (!error) return null;

  return (
    <p className="mt-1 flex items-center gap-1 text-sm text-destructive">
      <AlertCircle className="h-3 w-3" />
      {error.message}
    </p>
  );
}

// Field description component
function FieldDescription({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-sm text-muted-foreground">{children}</p>;
}

// Main FormField component
export function FormField<TFieldValues extends FieldValues>(
  props: FormFieldProps<TFieldValues>
) {
  const { name, control, label, description, required, disabled, className, type } = props;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        // Checkbox field
        if (type === 'checkbox') {
          const checkboxProps = props as CheckboxFieldProps<TFieldValues>;
          return (
            <div className={cn('space-y-2', className)}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={name}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={disabled}
                />
                <label
                  htmlFor={name}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {checkboxProps.checkboxLabel || label}
                  {required && <span className="ml-1 text-destructive">*</span>}
                </label>
              </div>
              {description && <FieldDescription>{description}</FieldDescription>}
              <FieldError error={error} />
            </div>
          );
        }

        // Select field
        if (type === 'select') {
          const selectProps = props as SelectFieldProps<TFieldValues>;
          return (
            <div className={cn('space-y-2', className)}>
              {label && (
                <Label htmlFor={name}>
                  {label}
                  {required && <span className="ml-1 text-destructive">*</span>}
                </Label>
              )}
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled}
              >
                <SelectTrigger
                  id={name}
                  className={cn(error && 'border-destructive')}
                >
                  <SelectValue placeholder={selectProps.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {selectProps.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {description && <FieldDescription>{description}</FieldDescription>}
              <FieldError error={error} />
            </div>
          );
        }

        // Textarea field
        if (type === 'textarea') {
          const textareaProps = props as TextareaFieldProps<TFieldValues>;
          return (
            <div className={cn('space-y-2', className)}>
              {label && (
                <Label htmlFor={name}>
                  {label}
                  {required && <span className="ml-1 text-destructive">*</span>}
                </Label>
              )}
              <textarea
                id={name}
                {...field}
                placeholder={textareaProps.placeholder}
                rows={textareaProps.rows || 4}
                disabled={disabled}
                className={cn(
                  'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                  error && 'border-destructive'
                )}
              />
              {description && <FieldDescription>{description}</FieldDescription>}
              <FieldError error={error} />
            </div>
          );
        }

        // Password field with toggle
        if (type === 'password') {
          const passwordProps = props as PasswordFieldProps<TFieldValues>;
          return (
            <PasswordInput
              name={name}
              label={label}
              required={required}
              disabled={disabled}
              placeholder={passwordProps.placeholder}
              description={description}
              error={error}
              field={field}
              showToggle={passwordProps.showToggle !== false}
              className={className}
            />
          );
        }

        // Default text/email/number/date input
        const inputProps = props as TextFieldProps<TFieldValues> | DateFieldProps<TFieldValues>;
        return (
          <div className={cn('space-y-2', className)}>
            {label && (
              <Label htmlFor={name}>
                {label}
                {required && <span className="ml-1 text-destructive">*</span>}
              </Label>
            )}
            <Input
              id={name}
              type={type}
              {...field}
              placeholder={'placeholder' in inputProps ? inputProps.placeholder : undefined}
              autoComplete={'autoComplete' in inputProps ? inputProps.autoComplete : undefined}
              min={'min' in inputProps ? inputProps.min : undefined}
              max={'max' in inputProps ? inputProps.max : undefined}
              disabled={disabled}
              className={cn(error && 'border-destructive')}
            />
            {description && <FieldDescription>{description}</FieldDescription>}
            <FieldError error={error} />
          </div>
        );
      }}
    />
  );
}

// Password input with show/hide toggle
interface PasswordInputProps {
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  description?: string;
  error?: RHFFieldError;
  field: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur: () => void;
    name: string;
    ref: React.Ref<HTMLInputElement>;
  };
  showToggle?: boolean;
  className?: string;
}

function PasswordInput({
  name,
  label,
  required,
  disabled,
  placeholder,
  description,
  error,
  field,
  showToggle = true,
  className,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label htmlFor={name}>
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id={name}
          type={showPassword ? 'text' : 'password'}
          {...field}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(showToggle && 'pr-10', error && 'border-destructive')}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError error={error} />
    </div>
  );
}

export default FormField;
