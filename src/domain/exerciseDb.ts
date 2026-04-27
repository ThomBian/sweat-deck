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
  out.push(
    row(src.id as ExerciseId, {
      defaultReps: src.reps,
      defaultDurationSec: src.durationSec,
      defaultDistanceM: src.distanceM,
    }),
  );
  for (const a of src.alts ?? []) {
    out.push(
      row(a.id as ExerciseId, {
        defaultReps: a.reps,
        defaultDurationSec: a.durationSec,
        defaultDistanceM: a.distanceM,
      }),
    );
  }
  return out;
}
