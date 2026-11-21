/**
 * Result of inspecting a Student Tutor reply for a leaked direct numeric answer.
 */
export interface SocraticAnswerGuardResult {
  leaked: boolean;
  expectedValue?: string;
  reason?: string;
}

function formatComputedNumber(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return Number(value.toFixed(4)).toString();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Attempts to solve simple linear equations (`ax + b = c`, `x - b = c`, `ax = c`)
 * or direct binary arithmetic (`a + b`, `a - b`, `a * b`, `a / b`) contained in
 * a student's prompt so the server-side Socratic answer guard can verify that a
 * tutor reply did not reveal the final numeric answer.
 *
 * @param prompt Student message text.
 * @returns Detected target variable (if any), computed numeric answer string,
 *          and matched problem substring, or `null` if no numeric problem was found.
 */
export function extractNumericProblemAnswer(prompt: string): {
  variable?: string;
  answer: string;
  matchedExpression: string;
} | null {
  const cleaned = prompt.replace(/\$/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Linear equation: ax + b = c or ax - b = c (e.g., 2x + 5 = 15, x - 4 = 10)
  const linearAddSub = cleaned.match(
    /(-?\d*\.?\d*)\s*([a-zA-Z])\s*([+-])\s*(\d+(?:\.\d+)?)\s*=\s*(-?\d+(?:\.\d+)?)/
  );
  if (linearAddSub) {
    const [matchedExpression, rawCoeff, variable, op, rawB, rawC] = linearAddSub;
    const coeff =
      rawCoeff === '' || rawCoeff === '+'
        ? 1
        : rawCoeff === '-'
          ? -1
          : Number(rawCoeff);
    const b = Number(rawB);
    const c = Number(rawC);
    if (
      Number.isFinite(coeff) &&
      coeff !== 0 &&
      Number.isFinite(b) &&
      Number.isFinite(c)
    ) {
      const rhs = op === '+' ? c - b : c + b;
      const solved = rhs / coeff;
      if (Number.isFinite(solved)) {
        return {
          variable: variable.toLowerCase(),
          answer: formatComputedNumber(solved),
          matchedExpression: matchedExpression.trim(),
        };
      }
    }
  }

  // 2. Simple multiplicative equation: ax = c (e.g., 3x = 21)
  const linearMul = cleaned.match(
    /(-?\d+(?:\.\d+)?)\s*([a-zA-Z])\s*=\s*(-?\d+(?:\.\d+)?)/
  );
  if (linearMul) {
    const [matchedExpression, rawCoeff, variable, rawC] = linearMul;
    const coeff = Number(rawCoeff);
    const c = Number(rawC);
    if (Number.isFinite(coeff) && coeff !== 0 && Number.isFinite(c)) {
      const solved = c / coeff;
      if (Number.isFinite(solved)) {
        return {
          variable: variable.toLowerCase(),
          answer: formatComputedNumber(solved),
          matchedExpression: matchedExpression.trim(),
        };
      }
    }
  }

  // 3. Direct arithmetic expression: a op b (avoid matching dates/ratios with multiple slashes)
  const arithmetic = cleaned.match(
    /(?:^|[^\d.])((-?\d+(?:\.\d+)?)\s*([+\-*×x/÷])\s*(\d+(?:\.\d+)?))(?=$|[^\d.])/i
  );
  if (arithmetic) {
    const [, matchedExpression, rawA, rawOp, rawB] = arithmetic;
    const a = Number(rawA);
    const b = Number(rawB);
    const op = rawOp.toLowerCase();
    let solved: number | null = null;
    if (op === '+') solved = a + b;
    else if (op === '-') solved = a - b;
    else if (op === '*' || op === '×' || op === 'x') solved = a * b;
    else if ((op === '/' || op === '÷') && b !== 0) solved = a / b;

    if (solved !== null && Number.isFinite(solved)) {
      return {
        answer: formatComputedNumber(solved),
        matchedExpression: matchedExpression.trim(),
      };
    }
  }

  return null;
}

/**
 * Inspects a Socratic tutor reply to detect whether it directly reveals the
 * final numeric answer to a math problem in the student's prompt.
 *
 * Strips any verbatim restatement of the original problem expression first to
 * avoid false positives (for example, restating `2x + 5 = 15` contains `5`,
 * which should not trigger a leak unless the reply states `x = 5` or
 * `the answer is 5`).
 *
 * @param studentPrompt Latest student question text.
 * @param tutorReply Draft assistant response text.
 * @returns Detection result indicating whether regeneration is required.
 */
export function detectDirectNumericAnswerLeak(
  studentPrompt: string,
  tutorReply: string
): SocraticAnswerGuardResult {
  const extracted = extractNumericProblemAnswer(studentPrompt);
  if (!extracted) {
    return { leaked: false };
  }

  const { variable, answer, matchedExpression } = extracted;
  const normalizedReply = tutorReply
    .replace(/\$/g, ' ')
    .replace(new RegExp(escapeRegExp(matchedExpression), 'gi'), ' ')
    .replace(/\s+/g, ' ');

  const escapedAnswer = escapeRegExp(answer);

  if (variable) {
    const varRevealRegex = new RegExp(
      `\\b${escapeRegExp(variable)}\\s*(?:=|is|equals|becomes|comes out to|ki value|ka maan|का मान|என்பது)\\s*${escapedAnswer}(?!\\d)`,
      'i'
    );
    if (varRevealRegex.test(normalizedReply)) {
      return {
        leaked: true,
        expectedValue: `${variable} = ${answer}`,
        reason: `Tutor reply revealed variable solution ${variable} = ${answer}.`,
      };
    }
  }

  const genericRevealRegex = new RegExp(
    `(?:final\\s+answer|the\\s+answer|answer\\s+is|answer\\s*=|solution\\s+is|equals|result\\s+is|so\\s+it\\s+is|jawab\\s+hai|jawab\\s*=|सही\\s+उत्तर|उत्तर\\s+है|விடை)\\s*[:=]?\\s*${escapedAnswer}(?!\\d)`,
    'i'
  );
  if (genericRevealRegex.test(normalizedReply)) {
    return {
      leaked: true,
      expectedValue: answer,
      reason: `Tutor reply directly stated final numeric answer ${answer}.`,
    };
  }

  if (!variable) {
    const directEqualsRegex = new RegExp(`=\\s*${escapedAnswer}(?!\\d)`, 'i');
    if (directEqualsRegex.test(normalizedReply)) {
      return {
        leaked: true,
        expectedValue: answer,
        reason: `Tutor reply directly evaluated expression to = ${answer}.`,
      };
    }
  }

  return { leaked: false };
}
