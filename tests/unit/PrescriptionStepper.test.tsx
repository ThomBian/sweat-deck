import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@/i18n';
import { alignToPrescriptionStep, PrescriptionStepper } from '@/components/deck/PrescriptionStepper';

const wrap = (ui: ReactNode) => <I18nProvider i18n={i18n}>{ui}</I18nProvider>;

describe('alignToPrescriptionStep', () => {
  it('snaps duration to nearest 5s step within bounds', () => {
    expect(alignToPrescriptionStep(7, 'durationSec')).toBe(5);
    expect(alignToPrescriptionStep(8, 'durationSec')).toBe(10);
    expect(alignToPrescriptionStep(3600, 'durationSec')).toBe(3600);
  });

  it('clamps to ceiling', () => {
    expect(alignToPrescriptionStep(9999, 'reps')).toBe(500);
    expect(alignToPrescriptionStep(999999, 'durationSec')).toBe(3600);
    expect(alignToPrescriptionStep(999999, 'distanceM')).toBe(10000);
  });

  it('falls back to floor for non-finite values', () => {
    expect(alignToPrescriptionStep(NaN, 'reps')).toBe(1);
    expect(alignToPrescriptionStep(Infinity, 'durationSec')).toBe(5);
  });
});

describe('PrescriptionStepper', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    i18n.activate('en');
  });
  afterEach(() => vi.useRealTimers());

  it('renders reps label', () => {
    render(wrap(<PrescriptionStepper value={20} type="reps" onChange={vi.fn()} />));
    expect(screen.getByText('×20 reps')).toBeTruthy();
  });

  it('renders formatted time for durationSec', () => {
    render(wrap(<PrescriptionStepper value={90} type="durationSec" onChange={vi.fn()} />));
    expect(screen.getByText('1:30')).toBeTruthy();
  });

  it('renders distance label', () => {
    render(wrap(<PrescriptionStepper value={100} type="distanceM" onChange={vi.fn()} />));
    expect(screen.getByText('100m')).toBeTruthy();
  });

  it('calls onChange with value + 1 on reps increment', () => {
    const onChange = vi.fn();
    render(wrap(<PrescriptionStepper value={20} type="reps" onChange={onChange} />));
    fireEvent.pointerDown(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(21);
  });

  it('calls onChange with value − 1 on reps decrement', () => {
    const onChange = vi.fn();
    render(wrap(<PrescriptionStepper value={20} type="reps" onChange={onChange} />));
    fireEvent.pointerDown(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(19);
  });

  it('− button is disabled when value is at reps floor (1)', () => {
    render(wrap(<PrescriptionStepper value={1} type="reps" onChange={vi.fn()} />));
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
  });

  it('− button is disabled when value is at durationSec floor (5)', () => {
    render(wrap(<PrescriptionStepper value={5} type="durationSec" onChange={vi.fn()} />));
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
  });

  it('− button is disabled when value is at distanceM floor (10)', () => {
    render(wrap(<PrescriptionStepper value={10} type="distanceM" onChange={vi.fn()} />));
    expect(screen.getByRole('button', { name: /decrease/i })).toBeDisabled();
  });

  it('+ button is disabled at max reps', () => {
    render(wrap(<PrescriptionStepper value={500} type="reps" onChange={vi.fn()} />));
    expect(screen.getByRole('button', { name: /increase/i })).toBeDisabled();
  });

  it('does not call onChange when − is disabled', () => {
    const onChange = vi.fn();
    render(wrap(<PrescriptionStepper value={1} type="reps" onChange={onChange} />));
    fireEvent.pointerDown(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not call onChange when + is disabled', () => {
    const onChange = vi.fn();
    render(wrap(<PrescriptionStepper value={500} type="reps" onChange={onChange} />));
    fireEvent.pointerDown(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses step 5 for durationSec increment', () => {
    const onChange = vi.fn();
    render(wrap(<PrescriptionStepper value={30} type="durationSec" onChange={onChange} />));
    fireEvent.pointerDown(screen.getByRole('button', { name: /increase/i }));
    expect(onChange).toHaveBeenCalledWith(35);
  });

  it('uses step 10 for distanceM decrement', () => {
    const onChange = vi.fn();
    render(wrap(<PrescriptionStepper value={100} type="distanceM" onChange={onChange} />));
    fireEvent.pointerDown(screen.getByRole('button', { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('fires multiple times during long press hold', () => {
    const onChange = vi.fn();
    render(wrap(<PrescriptionStepper value={20} type="reps" onChange={onChange} />));
    act(() => {
      fireEvent.pointerDown(screen.getByRole('button', { name: /increase/i }));
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    act(() => {
      vi.advanceTimersByTime(750);
    });
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('shows nearest valid step when stored value is off-step (display only until user adjusts)', () => {
    render(wrap(<PrescriptionStepper value={7} type="durationSec" onChange={vi.fn()} />));
    expect(screen.getByText('0:05')).toBeTruthy();
  });

  it('exposes value text as group label via aria-labelledby', () => {
    render(wrap(<PrescriptionStepper value={20} type="reps" onChange={vi.fn()} />));
    const region = screen.getByRole('group', { name: '×20 reps' });
    expect(region).toBeTruthy();
  });
});
