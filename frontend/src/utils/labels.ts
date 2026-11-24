export const SURFACE_LABELS: Record<string, string> = {
  asphalt: 'Асфальт',
  rubber: 'Резина',
  grass: 'Трава',
  sand: 'Песок',
  wood: 'Паркет',
  other: 'Другое',
}

/** Surfaces offered in the add-court form; `sand` and `other` are display-only for old data. */
export const FORM_SURFACES = ['asphalt', 'rubber', 'wood', 'grass']

export const CONDITION_LABELS: Record<string, string> = {
  excellent: 'Отличное',
  good: 'Хорошее',
  fair: 'Среднее',
  poor: 'Плохое',
}

/** Same wording for every court and for the form hints, so everyone rates alike. */
export const CONDITION_HINTS: Record<string, string> = {
  excellent: 'Как новая: ровное покрытие, целые кольца с сетками, чёткая разметка',
  good: 'Кольца и разметка целые, покрытие ровное, есть следы износа',
  fair: 'Играть можно: трещины или неровности, сеток может не быть',
  poor: 'Играть трудно: кольцо погнуто или нет щита, покрытие разбито',
}

export function translateSurface(value: string): string {
  return SURFACE_LABELS[value] ?? value
}

export function translateCondition(value: string): string {
  return CONDITION_LABELS[value] ?? value
}

export const NO_ADDRESS = 'Адрес не указан'

export function lightingLabel(value: boolean): string {
  return value ? 'Свет' : 'Без света'
}
