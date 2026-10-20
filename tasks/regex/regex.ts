// Target/negative sets for the regex task.
//
// The agent must produce a regular expression (as a string) that:
//   - matches every string in the POSITIVES set
//   - does NOT match any string in the NEGATIVES set
//
// It runs against real input via `new RegExp(...)` with `.test()` (whole-string
// anchoring is enforced; see verify.ts).

export const POSITIVES = [
  "abc@example.com",
  "first.last@sub.domain.org",
  "user+tag@mail.co",
  "a@b.io",
];

// Realistic emails must (per this task) have exactly one '@', a
// non-empty local part, a domain with at least one dot, and no spaces.
export const NEGATIVES = [
  "not-an-email",
  "missing-at.example.com",
  "@nolocal.com",
  "user@nodot",
  "two@@signs.com",
  "has space@x.com",
  "user@.leadingdot.com",
  "trailingdot.@x.com",
];
