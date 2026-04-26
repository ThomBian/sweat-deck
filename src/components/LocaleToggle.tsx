import { useEffect, useId, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { t } from '@lingui/core/macro';
import { cn } from '@/lib/utils';
import { useLocaleStore, type Locale } from '@/store/localeStore';

const OPTIONS: { value: Locale; short: string; label: () => string }[] = [
  { value: 'en', short: 'EN', label: () => t`Switch to English` },
  { value: 'fr', short: 'FR', label: () => t`Switch to French` },
];

type Props = { className?: string; /** Optional id of visible hint text in the document (a11y) */ descriptionId?: string };

export function LocaleToggle({ className, descriptionId }: Props) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDoc, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative z-20', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex size-11 min-h-11 min-w-11 items-center justify-center rounded-lg border border-border/50',
          'bg-card/80 text-foreground shadow-sm ring-1 ring-border/30 backdrop-blur-sm',
          'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
          open && 'border-primary/50 bg-primary/10 ring-primary/20',
        )}
        aria-label={t`Interface language — choose a language`}
        aria-describedby={descriptionId}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="listbox"
      >
        <Languages className="size-5" aria-hidden />
      </button>

      {open ? (
        <div
          id={menuId}
          role="listbox"
          aria-label={t`Interface language`}
          className={cn(
            'absolute start-0 top-full z-50 mt-1 max-w-[min(calc(100vw-1.5rem),12rem)] min-w-[8.5rem] rounded-lg border border-border/60',
            'bg-card/95 p-1.5 text-sm font-medium shadow-lg backdrop-blur-md',
            'overscroll-contain',
          )}
        >
          {OPTIONS.map((opt) => {
            const active = locale === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  if (!active) setLocale(opt.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                className={cn(
                  'flex w-full min-h-11 min-w-0 items-center justify-center rounded-md px-3 py-2.5',
                  'text-center transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/90 hover:text-foreground',
                )}
                aria-label={opt.label()}
              >
                {opt.short}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
