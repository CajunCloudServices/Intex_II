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
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="checkbox-field">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
