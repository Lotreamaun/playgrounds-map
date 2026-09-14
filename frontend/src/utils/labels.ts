export const SURFACE_LABELS: Record<string, string> = {
  asphalt: 'Асфальт',
  rubber: 'Резина',
  grass: 'Трава',
  sand: 'Песок',
  wood: 'Дерево',
  other: 'Другое',
}

export const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Отличное',
  good: 'Хорошее',
  fair: 'Удовлетворительное',
  poor: 'Плохое',
}

export const SPORT_LABELS: Record<string, string> = {
  basketball: 'Баскетбол',
  football: 'Футбол',
  hockey: 'Хоккей',
  tennis: 'Теннис',
}

export function translateSurface(value: string): string {
  return SURFACE_LABELS[value] ?? value
}

export function translateCondition(value: string): string {
  return CONDITION_LABELS[value] ?? value
}

export function translateSport(value: string): string {
  return SPORT_LABELS[value] ?? value
}
