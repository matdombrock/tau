import { TObject } from "@sinclair/typebox";
import { Parse, Check, Assert } from "@sinclair/typebox/value";
import { Errors } from "@sinclair/typebox/errors";

export { Object, String, Number } from "@sinclair/typebox";
export type { Static } from "@sinclair/typebox";

export const Schema = {
  // (a) boolean guard with `Check`
  isValid(schema: TObject, json: string): boolean {
    try { return Check(schema, JSON.parse(json)); } catch { return false; }
  },

  // (b) throw on invalid with `Assert` (AssertError carries error details)
  assertValid(schema: TObject, json: string): any {
    const value = Parse(schema, JSON.parse(json)); // throws on invalid
    Assert(schema, value); // throws AssertError carrying details
    return value;
  },

  // (c) collect all errors with `Errors` (no throw for schema mismatch)
  listErrors(schema: TObject, json: string): string[] {
    const out: string[] = [];
    // Iterate the underlying iterator directly (spreading requires --downlevelIteration)
    const iter = Errors(schema, JSON.parse(json));
    const it = iter[Symbol.iterator]();
    for (let e = it.next(); !e.done; e = it.next()) {
      if (e.value) out.push(`${e.value.path}: ${e.value.message}`);
    }
    return out;
  }
}

// Example usage:
// const inputs = [
//   '{"id":1,"name":"Ada","email":"ada@x.io"}',       // valid
//   '{"id":"x","name":"Ada","email":"ada@x.io"}',     // wrong id type
//   '{"id":1,"name":"Ada"}',                           // missing email
//   '{"id":1,"name":"Ada","email":"ada@x.io","x":1}',  // extra property
// ];
//
// const testSchema = Object({
//   id: Number(),
//   name: String(),
//   email: String(),
// });
//
// for (const input of inputs) {
//   console.log("----", input);
//   console.log("  Check :", Schema.isValid(testSchema, input));
//   console.log("  Errors:", JSON.stringify(Schema.listErrors(testSchema, input)));
//   try {
//     const u = Schema.assertValid(testSchema, input);
//     console.log("  Assert OK, parsed:", JSON.stringify(u));
//   } catch (err) {
//     console.log("  Assert FAIL:", err instanceof Error ? err.message : globalThis.String(err));
//   }
// }
