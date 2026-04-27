import { useMemo, useState, useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { motion, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion';
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

const DISMISS_OFFSET_PX = 72;
const DISMISS_VELOCITY = 420;

export function ExerciseSearchSheet({ open, onOpenChange, slotKey, config, selected, onPick }: Props) {
  const { i18n } = useLingui();
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
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
        <Dialog.Popup className="fixed inset-x-0 bottom-0 z-[101] flex max-h-[80dvh] w-full flex-col outline-none">
          <motion.div
            initial={false}
            className={cn(
              'flex max-h-[80dvh] w-full flex-col overflow-hidden rounded-t-[1.25rem] border border-border/50 bg-background shadow-lg',
              'pb-[env(safe-area-inset-bottom)]',
            )}
            {...(reduceMotion
              ? { drag: false as const }
              : {
                  drag: 'y' as const,
                  dragControls,
                  dragListener: false as const,
                  dragConstraints: { top: 0, bottom: 320 },
                  dragElastic: { top: 0, bottom: 0.14 },
                  onDragEnd: (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
                    if (info.offset.y > DISMISS_OFFSET_PX || info.velocity.y > DISMISS_VELOCITY) {
                      onOpenChange(false);
                    }
                  },
                })}
          >
            {/* Drag surface: handle + title only — search + list keep native scroll/focus */}
            <div
              className="touch-none select-none"
              onPointerDown={(e) => {
                if (reduceMotion) return;
                void dragControls.start(e);
              }}
            >
              <div className="flex shrink-0 cursor-grab justify-center active:cursor-grabbing" aria-hidden>
                <span className="mt-3 mb-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />
              </div>

              <div className="px-5 sm:px-6">
                <Dialog.Title className="px-0.5 font-display text-xl font-semibold tracking-tight text-balance">
                  {glyph ? (
                    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-2xl leading-none">{glyph}</span>
                      <span className="text-lg sm:text-xl">{family}</span>
                    </span>
                  ) : (
                    <span className="font-mono text-2xl tabular-nums tracking-tight">{family}</span>
                  )}
                </Dialog.Title>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-4 border-b border-border/40 px-5 pb-5 pt-2 sm:px-6">
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
                className="min-h-12 w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-base outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain touch-pan-y">
              {showRecommendedOnly ? (
                <div className="flex min-h-0 flex-1 flex-col px-5 pt-5 pb-6 sm:px-6">
                  <h2 className="mb-3 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase">
                    <Trans>Recommended</Trans>
                  </h2>
                  <div
                    role="listbox"
                    aria-label={t`Recommended exercises`}
                    className="flex flex-col gap-2.5"
                  >
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
                <div
                  role="listbox"
                  aria-label={t`Search results`}
                  className="flex flex-col gap-2.5 px-5 py-5 pb-6 sm:px-6"
                >
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
          </motion.div>
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
