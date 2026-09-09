export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultySettings {
  enemyAimSpread: number;
  enemyDamage: number;
  enemyHealth: number;
}

export const difficulties: Record<Difficulty, DifficultySettings> = {
  easy: { enemyAimSpread: 0.075, enemyDamage: 5, enemyHealth: 70 },
  medium: { enemyAimSpread: 0.035, enemyDamage: 7, enemyHealth: 100 },
  hard: { enemyAimSpread: 0.015, enemyDamage: 10, enemyHealth: 150 },
};

export const difficultyLabels: Record<Difficulty, string> = {
  easy: 'Leicht',
  medium: 'Mittel',
  hard: 'Schwer',
};

export function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard';
}
