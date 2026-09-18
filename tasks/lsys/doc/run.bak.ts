import { LSystemContext, generateLSystem } from '../lsystem.ts';

// Example usage for a repeating AABBAABB... pattern
// Rules:
// n = 0 : A
// n = 1 : AABB
// n = 2 : AABBAABB
// n = 3 : AABBAABBAABBAABB
const targetPatternContext: LSystemContext = {
  axiom: 'A',
  iterations: 5,
  rules: [
    { character: 'A', production: ['f', '-', 'f', '+'] },
    { character: 'B', production: [] }
  ]
};

const targetPatternResult = generateLSystem(targetPatternContext);
console.log(targetPatternResult);
