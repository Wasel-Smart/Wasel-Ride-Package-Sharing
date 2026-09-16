import { describe, it, expect, vi, beforeEach } from 'vitest';
import { canTransition, assertTransition, transitionState } from '../stateMachine';

describe('State Machine', () => {
  describe('canTransition', () => {
    it('returns true for valid direct transitions', () => {
      const transitions = {
        A: ['B'],
        B: ['C'],
        C: [],
      };
      expect(canTransition('A', 'B', transitions)).toBe(true);
      expect(canTransition('B', 'C', transitions)).toBe(true);
    });

    it('returns true for same-state transitions', () => {
      const transitions = { A: ['B'], B: [] };
      expect(canTransition('A', 'A', transitions)).toBe(true);
    });

    it('returns false for invalid transitions', () => {
      const transitions = {
        A: ['B'],
        B: ['C'],
        C: [],
      };
      expect(canTransition('B', 'A', transitions)).toBe(false);
      expect(canTransition('C', 'A', transitions)).toBe(false);
    });

    it('returns false for undefined states', () => {
      const transitions = { A: ['B'] };
      expect(canTransition('X', 'A', transitions)).toBe(false);
      expect(canTransition('A', 'X', transitions)).toBe(false);
    });

    it('returns false for empty transitions', () => {
      expect(canTransition('', '', {})).toBe(true);
    });
  });

  describe('assertTransition', () => {
    it('does not throw for valid transitions', () => {
      const transitions = { A: ['B'] };
      expect(() => assertTransition('A', 'B', transitions, 'test')).not.toThrow();
    });

    it('throws with descriptive message for invalid transitions', () => {
      const transitions = { A: ['B'] };
      expect(() => assertTransition('A', 'C', transitions, 'test')).toThrow(
        'Invalid test transition: A -> C',
      );
    });
  });

  describe('transitionState', () => {
    it('returns the target state for valid transitions', () => {
      const transitions = { A: ['B'], B: [] };
      expect(transitionState('A', 'B', transitions, 'test')).toBe('B');
    });

    it('throws for invalid transitions', () => {
      const transitions = { A: ['B'], B: [] };
      expect(() => transitionState('B', 'A', transitions, 'test')).toThrow();
    });
  });
});