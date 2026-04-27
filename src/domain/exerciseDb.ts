import type { FaceRank, Suit } from './card';
import type { Equipment, Theme } from './config';
import type { SetupConfig } from './config';
import type { ExerciseId } from './exercise';
import { NUMBER_MOVEMENTS, FACE_CHALLENGES, FACE_CHALLENGES_CARDIO } from './mappings';
import type { FaceChallengeId, MovementId } from './mappings';
import type { SlotKey } from './plan';

export type ExerciseGroup = 'push' | 'pull' | 'legs' | 'posterior' | 'challenge';

export type ExerciseEntry = {
  id: ExerciseId;
  group: ExerciseGroup;
  equipment: Equipment[];
  defaultReps?: number;
  defaultDurationSec?: number;
  defaultDistanceM?: number;
};

const THEMES: Theme[] = ['full', 'upper', 'lower'];
const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const EQUIPMENTS: Equipment[] = ['bodyweight', 'weights', 'gym'];
const FACE_ORDER: FaceRank[] = ['J', 'Q', 'K'];

const SUIT_GROUP: Record<Suit, ExerciseGroup> = {
  hearts: 'push',
  diamonds: 'pull',
  clubs: 'legs',
  spades: 'posterior',
};

function buildMovementEntries(): ExerciseEntry[] {
  const meta = new Map<MovementId, { equipment: Set<Equipment>; group: ExerciseGroup }>();

  for (const theme of THEMES) {
    for (const suit of SUITS) {
      const group = SUIT_GROUP[suit];
      for (const eq of EQUIPMENTS) {
        const cell = NUMBER_MOVEMENTS[theme][suit][eq];
        const ids = [cell.id, ...(cell.alts ?? [])] as MovementId[];
        for (const id of ids) {
          let row = meta.get(id);
          if (!row) {
            row = { equipment: new Set(), group };
            meta.set(id, row);
          }
          row.equipment.add(eq);
        }
      }
    }
  }

  return [...meta.entries()]
    .map(([id, row]) => ({
      id: id as ExerciseId,
      group: row.group,
      equipment: [...row.equipment].sort(),
    }))
    .sort((a, b) => a.group.localeCompare(b.group) || a.id.localeCompare(b.id));
}

function collectFaceEquipment(): Map<FaceChallengeId, Set<Equipment>> {
  const m = new Map<FaceChallengeId, Set<Equipment>>();
  const add = (id: FaceChallengeId, eq: Equipment) => {
    let s = m.get(id);
    if (!s) {
      s = new Set();
      m.set(id, s);
    }
    s.add(eq);
  };
  for (const rank of FACE_ORDER) {
    for (const eq of EQUIPMENTS) {
      const ch = FACE_CHALLENGES[rank][eq];
      add(ch.id, eq);
      for (const a of ch.alts ?? []) add(a.id, eq);
    }
    const cardio = FACE_CHALLENGES_CARDIO[rank];
    for (const eq of EQUIPMENTS) {
      add(cardio.id, eq);
      for (const a of cardio.alts ?? []) add(a.id, eq);
    }
  }
  return m;
}

function buildFaceEntries(): ExerciseEntry[] {
  const eqMap = collectFaceEquipment();
  const ids = [...eqMap.keys()].sort();
  return ids.map((id) => ({
    id: id as ExerciseId,
    group: 'challenge' as const,
    equipment: [...eqMap.get(id)!].sort(),
  }));
}

export const ALL_EXERCISES: ExerciseEntry[] = (() => {
  const movements = buildMovementEntries();
  const faces = buildFaceEntries();
  return [...movements, ...faces];
})();

function pickExplicitRx(x: { reps?: number; durationSec?: number; distanceM?: number }): {
  reps?: number;
  durationSec?: number;
  distanceM?: number;
} {
  const o: { reps?: number; durationSec?: number; distanceM?: number } = {};
  if (x.reps !== undefined) o.reps = x.reps;
  if (x.durationSec !== undefined) o.durationSec = x.durationSec;
  if (x.distanceM !== undefined) o.distanceM = x.distanceM;
  return o;
}

/** First matching prescription for a face-challenge id anywhere in J/Q/K tables (non-alt picks from search). */
export function catalogPrescriptionForFaceChallengeId(
  id: ExerciseId,
): { reps?: number; durationSec?: number; distanceM?: number } | null {
  const entry = ALL_EXERCISES.find((e) => e.id === id);
  if (!entry || entry.group !== 'challenge') return null;

  for (const rank of FACE_ORDER) {
    for (const eq of EQUIPMENTS) {
      const ch = FACE_CHALLENGES[rank][eq];
      if (ch.id === id) return pickExplicitRx(ch);
      for (const a of ch.alts ?? []) {
        if (a.id === id) return pickExplicitRx(a);
      }
    }
    const c = FACE_CHALLENGES_CARDIO[rank];
    if (c.id === id) return pickExplicitRx(c);
    for (const a of c.alts ?? []) {
      if (a.id === id) return pickExplicitRx(a);
    }
  }
  return null;
}

/**
 * Prescription when the user picks an exercise outside the slot's curated alts.
 * Movements never inherit distance/time from an unrelated default (e.g. 500m row → pull-ups).
 */
export function faceFreePickPrescription(
  pickedId: ExerciseId,
  defaultSrc: { reps?: number; durationSec?: number; distanceM?: number },
  rank: FaceRank,
): { reps?: number; durationSec?: number; distanceM?: number } {
  const entry = ALL_EXERCISES.find((e) => e.id === pickedId);
  const isMovement = entry != null && entry.group !== 'challenge';

  const rankFallbackReps: Record<FaceRank, number> = { J: 15, Q: 15, K: 20 };

  if (isMovement) {
    const out: { reps?: number; durationSec?: number; distanceM?: number } = {};
    if (defaultSrc.reps != null) {
      out.reps = defaultSrc.reps;
      return out;
    }
    if (defaultSrc.durationSec != null) {
      out.reps = Math.min(40, Math.max(8, Math.round(defaultSrc.durationSec / 5)));
      return out;
    }
    if (defaultSrc.distanceM != null) {
      out.reps = rankFallbackReps[rank];
      return out;
    }
    out.reps = rankFallbackReps[rank];
    return out;
  }

  const catalog = catalogPrescriptionForFaceChallengeId(pickedId);
  if (
    catalog &&
    (catalog.reps !== undefined || catalog.durationSec !== undefined || catalog.distanceM !== undefined)
  ) {
    return catalog;
  }

  const out: { reps?: number; durationSec?: number; distanceM?: number } = {};
  if (defaultSrc.reps !== undefined) out.reps = defaultSrc.reps;
  if (defaultSrc.durationSec !== undefined) out.durationSec = defaultSrc.durationSec;
  if (defaultSrc.distanceM !== undefined) out.distanceM = defaultSrc.distanceM;
  return out;
}

export function recommendedFor(args: { slotKey: SlotKey; config: SetupConfig }): ExerciseEntry[] {
  const { slotKey, config } = args;
  const byId = new Map(ALL_EXERCISES.map((e) => [e.id, e]));

  const row = (id: ExerciseId, patch?: Partial<ExerciseEntry>): ExerciseEntry => {
    const base = byId.get(id);
    if (!base) {
      throw new Error(`Unknown exercise id in recommendedFor: ${String(id)}`);
    }
    return { ...base, ...patch };
  };

  if (slotKey.startsWith('suit:')) {
    const suit = slotKey.slice(5) as Suit;
    const cell = NUMBER_MOVEMENTS[config.theme][suit][config.equipment];
    const ids = [cell.id, ...(cell.alts ?? [])] as ExerciseId[];
    return ids.map((id) => row(id));
  }

  const rank = slotKey.slice(5) as FaceRank;
  const src = config.cardio ? FACE_CHALLENGES_CARDIO[rank] : FACE_CHALLENGES[rank][config.equipment];
  const out: ExerciseEntry[] = [];
  const defaultPatch: Partial<ExerciseEntry> = {};
  if (src.reps !== undefined) defaultPatch.defaultReps = src.reps;
  if (src.durationSec !== undefined) defaultPatch.defaultDurationSec = src.durationSec;
  if (src.distanceM !== undefined) defaultPatch.defaultDistanceM = src.distanceM;
  out.push(row(src.id as ExerciseId, defaultPatch));
  for (const a of src.alts ?? []) {
    const altPatch: Partial<ExerciseEntry> = {};
    if (a.reps !== undefined) altPatch.defaultReps = a.reps;
    if (a.durationSec !== undefined) altPatch.defaultDurationSec = a.durationSec;
    if (a.distanceM !== undefined) altPatch.defaultDistanceM = a.distanceM;
    out.push(row(a.id as ExerciseId, altPatch));
  }
  return out;
}
