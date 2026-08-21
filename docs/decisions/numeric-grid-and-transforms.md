# The numeric grid, and why the transforms carry the meaning

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

Nine of `domain/collections/`'s twenty-one Schema / Value Object pairs are the **numeric
grid**: three shapes (`Number`, `Integer`, `Double`) crossed with three signs (unconstrained,
`Positive*`, `Negative*`).

`Positive*` and `Negative*` both **include zero** (`minimum: 0` / `maximum: 0`), so they read
as "non-negative"/"non-positive" and overlap at exactly one value — the unconstrained form is
the one to reach for when zero must not be special.

`NumberSchema` carries **no bound at all**. It did carry `minimum: 0` through 0.3, which made
the generically-named `NumberVO` silently reject a delta or a balance; removed in 0.4.0 —
`PositiveNumberVO` is what that used to mean.

`IntegerSchema` is `t.Integer`, emitting `type: "integer"` rather than `customNumberVO`'s
`multipleOf: 1` divisibility rule, so an adapter reading the derived schema can pick an integer
column.

## The schema cannot express "floating point"

`Double*Schema` is structurally identical to `Number*Schema` — JSON Schema cannot express
"floating point", and `2.0` is not distinguishable from `2` in JavaScript — so what makes a
`Double*VO` decimal is its `transform` (rounds to two places), and what makes an `Integer*VO`
whole is its `transform` (truncates toward zero), never the schema.

Both transforms live in `value-objects/helpers/` (`to-integer.ts`, `to-double.ts`, no
`index.ts`, imported by direct path — the `shared/helpers/` rule) because each is used nine
times: three signs × required/optional/nullable.

Both normalise `-0` to `0`, which is not cosmetic: `JSON.stringify(-0)` is `"0"` while
`Object.is(-0, 0)` is `false`, so an un-normalised `-0` would fail its own `toJSON`/`fromJSON`
round-trip.

`toDouble` carries a documented infidelity in the same spirit as the in-memory double's UTF-16
ordering: decimal rounding over a binary float is approximate, and `1.005` at two places rounds
to `1`, not `1.01` — every alternative (the string-exponent trick, `toFixed`) fails worse on a
different input set, so the straightforward form is kept and its limit stated in the TSDoc and
asserted in `to-double.spec.ts`.

## Other catalog notes

- There is no `*.dto.ts` layer: since terroir dropped the `Schema` wrapper, the schema *is* the
  runtime value, so DTO and Schema collapsed into one name.
- `StringVO` is the one VO that intentionally reuses `StringSchema` rather than declaring its
  own — and `StringSchema` carries **no** `minLength`, so `StringVO` accepts `""`. A property
  that must not be empty needs a VO whose schema says so; naming it `name` in a blueprint does
  not.
- `OptionalSlugVO` and the six `Optional<Integer|Double>*VO`s carry their own `transform`,
  mirroring `SlugVO`'s `slugify` / `IntegerVO`'s `toInteger` / `DoubleVO`'s `toDouble` call
  (guarded for `undefined`) — `optionalVO` wraps a *schema*, not a VO's `transform` override,
  so that has to be re-declared explicitly. The `Nullable*` twins do the same, guarded for
  `null`.
