import { useMemo, useState, useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import { recommendedFor, ALL_EXERCISES, type ExerciseEntry } from '@/domain/exerciseDb';
import type { SlotKey } from '@/domain/plan';
import type { SetupConfig } from '@/domain/config';
import type { ExerciseId } from '@/domain/exercise';
import { formatMSS } from '@/lib/formatTime';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { Check } from 'lucide-react';

const SUIT_GLYPH: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_FAMILY: Record<string, string> = {
  hearts: 'Push',
  diamonds: 'Pull',
  clubs: 'Legs',
  spades: 'Posterior',
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotKey: SlotKey;
  config: SetupConfig;
  selected: ExerciseId;
  onPick: (id: ExerciseId) => void;
};

function rxLabel(slotKey: SlotKey, entry: ExerciseEntry): string {
  if (slotKey.startsWith('face:')) {
    if (entry.defaultReps !== undefined) return t`×${entry.defaultReps} reps`;
    if (entry.defaultDurationSec !== undefined) return formatMSS(entry.defaultDurationSec);
    if (entry.defaultDistanceM !== undefined) return t`${entry.defaultDistanceM}m`;
    return '';
  }
  return t`×N reps`;
}

function headerParts(slotKey: SlotKey): { glyph: string; family: string } {
  const m = slotKey.match(/^suit:(.+)$/);
  if (m) {
    const suit = m[1]!;
    return { glyph: SUIT_GLYPH[suit] ?? '', family: SUIT_FAMILY[suit] ?? suit };
  }
  const fm = slotKey.match(/^face:(.+)$/);
  if (fm) return { glyph: fm[1]!, family: t`Challenge` };
  return { glyph: '', family: '' };
}

export function ExerciseSearchSheet({ open, onOpenChange, slotKey, config, selected, onPick }: Props) {
  const { i18n } = useLingui();
  const [query, setQuery] = useState('');
  const recommended = useMemo(() => recommendedFor({ slotKey, config }), [slotKey, config]);
  const recIds = useMemo(() => new Set(recommended.map((r) => r.id)), [recommended]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const q = query.trim().toLowerCase();
  const { glyph, family } = headerParts(slotKey);

  const filteredSorted = useMemo(() => {
    if (!q) return [];
    const match = (e: ExerciseEntry) => tExercise(e.id).toLowerCase().includes(q);
    const hit = ALL_EXERCISES.filter(match);
    const recFirst = (a: ExerciseEntry, b: ExerciseEntry) => {
      const ar = recIds.has(a.id) ? 0 : 1;
      const br = recIds.has(b.id) ? 0 : 1;
      if (ar !== br) return ar - br;
      return tExercise(a.id).localeCompare(tExercise(b.id), i18n.locale);
    };
    return [...hit].sort(recFirst);
  }, [q, recIds, i18n.locale]);

  const handlePick = (id: ExerciseId) => {
    onPick(id);
    onOpenChange(false);
  };

  const showRecommendedOnly = !q;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[100] bg-black/50" />
        <Dialog.Popup
          className={cn(
            'fixed inset-x-0 bottom-0 z-[101] flex max-h-[80dvh] flex-col rounded-t-2xl border border-border/50 bg-background shadow-lg',
            'pb-[env(safe-area-inset-bottom)]',
          )}
        >
          <div className="flex shrink-0 flex-col gap-3 border-b border-border/40 p-4">
            <Dialog.Title className="font-display text-lg font-semibold">
              {glyph ? (
                <span>
                  {glyph} {family}
                </span>
              ) : (
                family
              )}
            </Dialog.Title>
            <label className="sr-only" htmlFor="exercise-search-input">
              <Trans>Search exercises…</Trans>
            </label>
            <input
              id="exercise-search-input"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t`Search exercises…`}
              className="w-full rounded-lg border border-border/60 bg-card px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {showRecommendedOnly ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pt-3">
                <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  <Trans>Recommended</Trans>
                </h2>
                <div role="listbox" aria-label={t`Recommended exercises`} className="flex flex-col gap-2">
                  {recommended.map((entry) => (
                    <ResultRow
                      key={entry.id}
                      entry={entry}
                      selected={selected}
                      rx={rxLabel(slotKey, entry)}
                      onPick={() => handlePick(entry.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div role="listbox" aria-label={t`Search results`} className="flex flex-col gap-2 px-4 py-3">
                {filteredSorted.map((entry) => (
                  <ResultRow
                    key={entry.id}
                    entry={entry}
                    selected={selected}
                    rx={rxLabel(slotKey, entry)}
                    onPick={() => handlePick(entry.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ResultRow({
  entry,
  selected,
  rx,
  onPick,
}: {
  entry: ExerciseEntry;
  selected: ExerciseId;
  rx: string;
  onPick: () => void;
}) {
  const isSel = entry.id === selected;
  return (
    <div role="option" aria-selected={isSel} className="min-w-0">
      <SetupOptionButton selected={isSel} aria-pressed={isSel} onClick={onPick}>
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {isSel ? <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden /> : null}
            <span className="min-w-0 truncate">{tExercise(entry.id)}</span>
          </span>
          {rx ? (
            <span className="min-w-0 max-w-[45%] shrink truncate text-right text-xs text-muted-foreground">{rx}</span>
          ) : null}
        </span>
      </SetupOptionButton>
    </div>
  );
}
