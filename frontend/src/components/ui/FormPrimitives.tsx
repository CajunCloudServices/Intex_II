import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

type BaseFieldProps = {
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
};

function FieldShell({ label, required, error, hint, className, children }: BaseFieldProps & { children: React.ReactNode }) {
  const hasError = Boolean(error);
  return (
    <label className={`field-shell ${hasError ? 'field-shell-error' : ''} ${className ?? ''}`.trim()}>
      <span className="field-label">
        {label}
        {required ? <span className="field-required-marker" aria-hidden="true">*</span> : null}
      </span>
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}

type TextFieldProps = BaseFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'required'>;

export function ValidatedTextField({ label, required, error, hint, className, ...inputProps }: TextFieldProps) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      <input {...inputProps} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${inputProps.id ?? inputProps.name}-error` : undefined} />
    </FieldShell>
  );
}

type SelectFieldProps = BaseFieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'required'> & { children: React.ReactNode };

export function ValidatedSelectField({ label, required, error, hint, className, children, ...selectProps }: SelectFieldProps) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      <select {...selectProps} required={required} aria-invalid={Boolean(error)}>
        {children}
      </select>
    </FieldShell>
  );
}

type TextareaFieldProps = BaseFieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'required'>;

export function ValidatedTextareaField({ label, required, error, hint, className, ...textareaProps }: TextareaFieldProps) {
  return (
    <FieldShell label={label} required={required} error={error} hint={hint} className={className}>
      <textarea {...textareaProps} required={required} aria-invalid={Boolean(error)} />
    </FieldShell>
  );
}

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  error?: string | null;
  name?: string;
};

export function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function FormGrid({
  children,
  columns = 'two',
}: {
  children: React.ReactNode;
  columns?: 'two' | 'three';
}) {
  return <div className={`form-grid form-grid-${columns}`}>{children}</div>;
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
  error,
  name,
}: CheckboxProps) {
  return (
    <label className={`checkbox-field ${error ? 'field-shell-error' : ''}`.trim()}>
      <input type="checkbox" name={name} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
      {hint ? <span className="field-hint">{hint}</span> : null}
      {error ? <span className="field-error">{error}</span> : null}
    </label>
  );
}
