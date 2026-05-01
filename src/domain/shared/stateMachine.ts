export type TransitionMap<TState extends string> = Record<TState, readonly TState[]>;

export function canTransition<TState extends string>(
  current: TState,
  next: TState,
  transitions: TransitionMap<TState>,
): boolean {
  if (current === next) {
    return true;
  }

  return transitions[current]?.includes(next) ?? false;
}

export function assertTransition<TState extends string>(
  current: TState,
  next: TState,
  transitions: TransitionMap<TState>,
  label: string,
): void {
  if (!canTransition(current, next, transitions)) {
    throw new Error(`Invalid ${label} transition: ${current} -> ${next}`);
  }
}

export function transitionState<TState extends string>(
  current: TState,
  next: TState,
  transitions: TransitionMap<TState>,
  label: string,
): TState {
  assertTransition(current, next, transitions, label);
  return next;
}
