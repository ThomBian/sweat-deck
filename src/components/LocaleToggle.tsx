import { t } from '@lingui/core/macro';
import { cn } from '@/lib/utils';
import { useLocaleStore, type Locale } from '@/store/localeStore';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'fr', label: 'FR' },
];

export function LocaleToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <div
      className="fixed top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] z-[200] flex items-center gap-0.5 rounded-lg border border-border/50 bg-background/90 p-0.5 text-xs font-medium tabular-nums shadow-sm ring-1 ring-border/30 backdrop-blur-md"
      role="group"
      aria-label={t`Interface language`}
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              if (!active) setLocale(opt.value);
            }}
            className={cn(
              'min-h-8 min-w-[2.5rem] rounded-md px-2.5 transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
