import { memo } from 'react'
import { CONDITION_HINTS, translateCondition } from '../utils/labels'

interface ConditionBadgeProps {
  condition: string
  variant: 'list' | 'banner'
}

/** Condition is the primary signal: colour plus the word, never colour alone. */
function ConditionBadge({ condition, variant }: ConditionBadgeProps) {
  const known = condition in CONDITION_HINTS
  const level = known ? condition : 'unknown'
  const word = translateCondition(condition)
  const label = `Состояние: ${word.toLowerCase()}`

  if (variant === 'list') {
    return (
      <span className={`condition-badge condition-badge--${level}`} role="img" aria-label={label}>
        <span className="condition-badge__word" aria-hidden="true">{word}</span>
        <span className="condition-badge__caption" aria-hidden="true">состояние</span>
      </span>
    )
  }

  return (
    <div className={`condition-banner condition-banner--${level}`} role="group" aria-label={label}>
      <svg className="condition-banner__marker" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="currentColor" />
      </svg>
      <div className="condition-banner__text">
        <strong className="condition-banner__title">{word} состояние</strong>
        {known && <span className="condition-banner__hint">{CONDITION_HINTS[condition]}</span>}
      </div>
    </div>
  )
}

export default memo(ConditionBadge)
