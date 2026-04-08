type LogoVariant = 'header' | 'hero' | 'footer' | 'login';

const variantClass: Record<LogoVariant, string> = {
  header: 'logo-mark logo-mark--header',
  hero: 'logo-mark logo-mark--hero',
  footer: 'logo-mark logo-mark--footer',
  login: 'logo-mark logo-mark--login',
};

type LogoMarkProps = {
  variant?: LogoVariant;
  className?: string;
};

export function LogoMark({ variant = 'header', className = '' }: LogoMarkProps) {
  const combined = [variantClass[variant], className].filter(Boolean).join(' ');
  return (
    <img
      src="/logo.svg"
      alt=""
      className={combined}
      decoding="async"
      aria-hidden="true"
    />
  );
}
