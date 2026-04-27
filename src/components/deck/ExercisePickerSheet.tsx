import { useMemo, useState, useEffect } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { motion, useDragControls, useReducedMotion, type PanInfo } from 'framer-motion';
import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { useLingui } from '@lingui/react';
import { cn } from '@/lib/utils';
import { tExercise } from '@/i18n/exercises';
import type { FaceRank } from '@/domain/card';
import { faceFreePickPrescription, recommendedFor, ALL_EXERCISES, type ExerciseEntry } from '@/domain/exerciseDb';
import type { SlotKey } from '@/domain/plan';
import type { SetupConfig } from '@/domain/config';
import type { ExerciseId } from '@/domain/exercise';
import { formatMSS } from '@/lib/formatTime';
import { SetupOptionButton } from '@/components/setup/SetupOptionButton';
import { tEquipment } from '@/i18n/labels';
import type { Equipment } from '@/domain/config';
import { slotHeaderParts } from '@/lib/reviewSlotContext';
import { Check, Heart } from 'lucide-react';

const EQUIPMENT_META_ORDER: Equipment[] = ['bodyweight', 'weights', 'gym'];

export type FacePrescriptionCtx = {
  rank: FaceRank;
  defaultSrc: { reps?: number; durationSec?: number; distanceM?: number };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotKey: SlotKey;
  config: SetupConfig;
  selected: ExerciseId;
  onPick: (id: ExerciseId) => void;
  /** When the slot is a face card, used to preview sensible reps/time/distance for search hits. */
  facePrescriptionCtx?: FacePrescriptionCtx;
};

function orderedEquipmentForMeta(equipment: Equipment[]): Equipment[] {
  return [...equipment].sort(
    (a, b) => EQUIPMENT_META_ORDER.indexOf(a) - EQUIPMENT_META_ORDER.indexOf(b),
  );
}

function exerciseBodyKindLabel(entry: ExerciseEntry): string {
  switch (entry.group) {
    case 'push':
      return t`Push`;
    case 'pull':
      return t`Pull`;
    case 'legs':
      return t`Legs`;
    case 'posterior':
      return t`Posterior`;
    case 'challenge':
      return t`Mixed`;
  }
}

function exerciseMetaLine(entry: ExerciseEntry): string {
  const cardKind = entry.group === 'challenge' ? t`Face card` : t`Number card`;
  const bodyKind = exerciseBodyKindLabel(entry);
  const equip = orderedEquipmentForMeta(entry.equipment).map(tEquipment);
  return [cardKind, bodyKind, ...equip].join(' · ');
}

function rxLabel(slotKey: SlotKey, entry: ExerciseEntry, faceCtx?: FacePrescriptionCtx): string {
  if (slotKey.startsWith('face:')) {
    if (entry.defaultReps !== undefined) return t`×${entry.defaultReps} reps`;
    if (entry.defaultDurationSec !== undefined) return formatMSS(entry.defaultDurationSec);
    if (entry.defaultDistanceM !== undefined) return t`${entry.defaultDistanceM}m`;
    if (faceCtx) {
      const rx = faceFreePickPrescription(entry.id, faceCtx.defaultSrc, faceCtx.rank);
      if (rx.reps !== undefined) return t`×${rx.reps} reps`;
      if (rx.durationSec !== undefined) return formatMSS(rx.durationSec);
      if (rx.distanceM !== undefined) return t`${rx.distanceM}m`;
    }
    return '';
  }
  return t`×N reps`;
}

const DISMISS_OFFSET_PX = 72;
const DISMISS_VELOCITY = 420;

export function ExercisePickerSheet({
  open,
  onOpenChange,
  slotKey,
  config,
  selected,
  onPick,
  facePrescriptionCtx,
}: Props) {
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
  const { glyph, family } = slotHeaderParts(slotKey);

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

  /** Everything not in Recommended, for the default "browse more" list. */
  const restOfExercises = useMemo(() => {
    return ALL_EXERCISES.filter((e) => !recIds.has(e.id)).sort((a, b) => {
      const byGroup = a.group.localeCompare(b.group);
      if (byGroup !== 0) return byGroup;
      return tExercise(a.id).localeCompare(tExercise(b.id), i18n.locale);
    });
  }, [recIds, i18n.locale]);

  const handlePick = (id: ExerciseId) => {
    onPick(id);
    onOpenChange(false);
  };

  const showRecommendedOnly = !q;
  const allSectionHeadingId = `exercise-sheet-all-${slotKey.replaceAll(':', '-')}`;

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
            <div
              className="touch-none select-none"
              onPointerDown={(e) => {
                if (reduceMotion) return;
                void dragControls.start(e);
              }}
            >
              <div
                className="flex min-h-11 shrink-0 cursor-grab items-center justify-center pt-2 active:cursor-grabbing"
                aria-hidden
              >
                <span className="mb-1 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />
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
                <Dialog.Description className="px-0.5 pt-1.5 text-sm leading-relaxed text-muted-foreground">
                  <Trans>
                    Current move:{' '}
                    <span className="font-medium text-foreground">{tExercise(selected)}</span>
                  </Trans>
                </Dialog.Description>
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

            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overscroll-y-contain touch-pan-y',
                'max-h-[min(56dvh,calc(80dvh-10.5rem))]',
              )}
            >
              {showRecommendedOnly ? (
                <div className="flex flex-col px-5 pt-5 pb-6 sm:px-6">
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
                        showRecommendedHeart={recIds.has(entry.id)}
                        rx={rxLabel(slotKey, entry, facePrescriptionCtx)}
                        onPick={() => handlePick(entry.id)}
                      />
                    ))}
                  </div>

                  <h2
                    id={allSectionHeadingId}
                    className="mt-6 mb-3 text-[0.6875rem] font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    <Trans>All exercises</Trans>
                  </h2>
                  <div
                    role="listbox"
                    aria-labelledby={allSectionHeadingId}
                    className="flex flex-col gap-2.5"
                  >
                    {restOfExercises.map((entry) => (
                      <ResultRow
                        key={entry.id}
                        entry={entry}
                        selected={selected}
                        showRecommendedHeart={recIds.has(entry.id)}
                        rx={rxLabel(slotKey, entry, facePrescriptionCtx)}
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
                      showRecommendedHeart={recIds.has(entry.id)}
                      rx={rxLabel(slotKey, entry, facePrescriptionCtx)}
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
  showRecommendedHeart,
  rx,
  onPick,
}: {
  entry: ExerciseEntry;
  selected: ExerciseId;
  showRecommendedHeart: boolean;
  rx: string;
  onPick: () => void;
}) {
  const isSel = entry.id === selected;
  const meta = exerciseMetaLine(entry);
  return (
    <div role="option" aria-selected={isSel} className="min-w-0">
      <SetupOptionButton selected={isSel} aria-pressed={isSel} onClick={onPick}>
        <span className="flex min-w-0 flex-col gap-0.5 text-left">
          <span className="flex min-w-0 items-start justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              {showRecommendedHeart ? (
                <Heart
                  className="size-3.5 shrink-0 text-suit-hearts/55"
                  strokeWidth={2}
                  aria-hidden
                />
              ) : null}
              {isSel ? <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} aria-hidden /> : null}
              <span className="min-w-0 truncate">{tExercise(entry.id)}</span>
            </span>
            {rx ? (
              <span className="min-w-0 max-w-[45%] shrink truncate text-right text-xs text-muted-foreground tabular-nums">
                {rx}
              </span>
            ) : null}
          </span>
          <span className="line-clamp-2 text-[0.6875rem] leading-snug text-muted-foreground">{meta}</span>
        </span>
      </SetupOptionButton>
    </div>
  );
}
