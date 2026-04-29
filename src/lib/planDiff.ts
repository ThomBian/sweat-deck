import type { PlanOverrides, SlotKey, SlotOverride } from '@/domain/plan';

const FIELDS = ['id', 'reps', 'durationSec', 'distanceM'] as const;

export function slotOverrideEqual(
  a: SlotOverride | undefined,
  b: SlotOverride | undefined,
): boolean {
  const aa = a ?? {};
  const bb = b ?? {};
  for (const f of FIELDS) {
    if (aa[f] !== bb[f]) return false;
  }
  return true;
}

export function overridesEqual(a: PlanOverrides, b: PlanOverrides): boolean {
  const keys = new Set<SlotKey>([
    ...(Object.keys(a) as SlotKey[]),
    ...(Object.keys(b) as SlotKey[]),
  ]);
  for (const k of keys) {
    if (!slotOverrideEqual(a[k], b[k])) return false;
  }
  return true;
}
