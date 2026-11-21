import { HelpCircle } from 'lucide-react';
import { MAX_HINT_LEVEL } from '../../../shared/config';

export interface HintLadderProps {
  hintLevel: number;
  disabled: boolean;
  onRequestHint: () => void;
}

/**
 * 3-level Socratic "I'm stuck" hint ladder control with visual level dots
 * (Level 1: guiding question, Level 2: similar worked example, Level 3: first step).
 */
export function HintLadder({ hintLevel, disabled, onRequestHint }: HintLadderProps) {
  const nextHintLabel =
    hintLevel === 0
      ? "I'm stuck (Hint 1/3)"
      : hintLevel === 1
        ? "I'm stuck (Hint 2/3 · Worked Example)"
        : hintLevel === 2
          ? "I'm stuck (Hint 3/3 · First Step)"
          : 'All 3 hints used';

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        disabled={disabled || hintLevel >= MAX_HINT_LEVEL}
        onClick={onRequestHint}
        className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 bg-[#D3E3FD] hover:bg-[#BED6FB] text-[#041E49] dark:bg-[#0842A0] dark:hover:bg-[#0B57D0] dark:text-[#E8F0FE] transition-colors disabled:opacity-45"
      >
        <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{nextHintLabel}</span>
        <span
          className="inline-flex items-center gap-1 ml-1"
          aria-label={`Hint level ${hintLevel} of ${MAX_HINT_LEVEL}`}
          data-testid="hint-level-dots"
        >
          {[1, 2, 3].map((dot) => (
            <span
              key={dot}
              aria-hidden="true"
              data-filled={dot <= hintLevel ? 'true' : 'false'}
              className={`w-2 h-2 rounded-full transition-colors ${
                dot <= hintLevel
                  ? 'bg-[#041E49] dark:bg-[#E8F0FE]'
                  : 'bg-[#041E49]/25 dark:bg-[#E8F0FE]/30'
              }`}
            />
          ))}
        </span>
      </button>
    </div>
  );
}
