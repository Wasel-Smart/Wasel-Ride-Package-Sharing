import type { LucideIcon } from 'lucide-react';

export type TripMode = 'one-way' | 'round';

export interface QuickAction {
  badge: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
  dim: string;
  border: string;
  path: string;
}

export interface HeadlineStat {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
}

export interface ProofPoint {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface CorridorCard {
  key: string;
  title: string;
  detail: string;
  meta: string;
  path: string;
  accent: string;
}
