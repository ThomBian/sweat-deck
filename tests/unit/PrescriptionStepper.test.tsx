import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PrescriptionStepper } from '@/components/deck/PrescriptionStepper';

describe('PrescriptionStepper', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders reps label', () => {
    render(<PrescriptionStepper value={20} type="reps" onChange={vi.fn()} />);
    expect(screen.getByText('×20 reps')).toBeTruthy();
  });

  it('renders formatted time for durationSec', () => {
    render(<PrescriptionStepper value={90} type="durationSec" onChange={vi.fn()} />);
    expect(screen.getByText('1:30')).toBeTruthy();
  });

  it('renders distance label', () => {
    render(<PrescriptionStepper value={100} type="distanceM" onChange={vi.fn()} />);
    expect(screen.getByText('100m')).toBeTruthy();
  });

  it('calls onChange with value + 1 on reps increment', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={20} type="reps" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(21);
  });

  it('calls onChange with value − 1 on reps decrement', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={20} type="reps" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(19);
  });

  it('− button is disabled when value is at reps floor (1)', () => {
    render(<PrescriptionStepper value={1} type="reps" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Decrease')).toBeDisabled();
  });

  it('− button is disabled when value is at durationSec floor (5)', () => {
    render(<PrescriptionStepper value={5} type="durationSec" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Decrease')).toBeDisabled();
  });

  it('− button is disabled when value is at distanceM floor (10)', () => {
    render(<PrescriptionStepper value={10} type="distanceM" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Decrease')).toBeDisabled();
  });

  it('does not call onChange when − is disabled', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={1} type="reps" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Decrease'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses step 5 for durationSec increment', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={30} type="durationSec" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Increase'));
    expect(onChange).toHaveBeenCalledWith(35);
  });

  it('uses step 10 for distanceM decrement', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={100} type="distanceM" onChange={onChange} />);
    fireEvent.pointerDown(screen.getByLabelText('Decrease'));
    expect(onChange).toHaveBeenCalledWith(90);
  });

  it('fires multiple times during long press hold', () => {
    const onChange = vi.fn();
    render(<PrescriptionStepper value={20} type="reps" onChange={onChange} />);
    act(() => {
      fireEvent.pointerDown(screen.getByLabelText('Increase'));
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    act(() => {
      vi.advanceTimersByTime(750);
    });
    expect(onChange).toHaveBeenCalledTimes(4);
  });
});
