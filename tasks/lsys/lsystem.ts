// A generic L-system runner
/**
 * Represents an L-system grammar rule.
 */
export interface LSystemRule {
  character: string;
  production: string[];
}

/**
 * Represents a context for applying L-system rules.
 */
export interface LSystemContext {
  rules: LSystemRule[];
  axiom: string;
  iterations: number;
}

/**
 * Generates an L-system string based on the given context.
 * @param context - The L-system context containing rules, axiom, and iterations.
 * @returns The generated L-system string.
 */
export function generateLSystem(context: LSystemContext): string {


  let current = context.axiom;

  for (let i = 0; i < context.iterations; i++) {
    const next: string[] = [];

    for (const char of current) {
      const rule = context.rules.find(r => r.character === char);
      if (rule) {
        next.push(...rule.production);
      } else {
        next.push(char);
      }
    }

    current = next.join('');
  }

  return current;
}
