# TypeScript traps: TS2589 / TS2545 / TS2515 / TS4060, and contextual typing

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

Every compiler error below was hit for real in this package. The one-line **rule** each produced
lives in `CLAUDE.md`'s `## Traps`; the reasoning is here.

## TS4060 — "Return type of exported function has or is using private name"

Every factory that returns a class declared **inside its own body** must annotate its return
type. `tsconfig.build.json` sets `declaration: true` while `bun run build` runs `tsup --dts` — an
inferred return type fails with TS4060 and emits no `.d.ts`.

That is why `ValueObjectClassOf<V, S>` exists on the custom-VO factories, `DomainEventClassOf` on
`defineDomainEvent`, `CommandClassOf`/`AggregateCommandClassOf` on `commandOf`/`aggregateCommandOf`,
and `RecordClassOf`/`WrapperClassOf` on their pillars' factories.

`DomainEventClassOf` takes no type parameters — `DomainEvent` isn't generic — and its shape
(`new (aggregateId: string): DomainEvent`) is structurally compatible with both
`Entity.raiseEvent`'s inline bare-class type and `BareDomainEventClass` without importing either.

The `as ValueObjectClassOf<…>` on a custom-VO factory's return covers `demo` alone: the base
declares it generic over `this`, so assignability instantiates `Self` at its constraint and the
return collapses to `{ value: unknown }`.

## TS2589 — "Type instantiation is excessively deep and possibly infinite"

Two wrapper-pillar constraints exist only to avoid this, and both were **measured**, not guessed:

- `WrappableClass` stops the wrapped union one level short of `AnyPropertyClass`; typing `wraps`
  as the full union makes the two mutually recursive and TS2589s on a real blueprint.
- Every blueprint conditional probes the two wrapper statics inline rather than testing
  `extends AnyWrapperClass`, because the full structural form drags `AnyWrapper`'s five members
  into the comparison at every key of every blueprint and TS2589s there too.

The same class of problem is why `UndefinedableKeys` reads `["prototype"]["value"]` directly
rather than going through `InputValueOf`: recursing through it would re-enter the same type for a
self-referencing blueprint (`{ child: Node }`) and TypeScript rejects that as a circular mapped
type.

## TS2545 and TS2515 — the class-decorator mixin pattern

- The mixin base constructor type's rest parameter must be exactly `any[]` (TS2545 otherwise —
  `never[]`, the usual "widest signature" trick, does not satisfy this specific check), each
  carrying a `biome-ignore lint/suspicious/noExplicitAny`.
- The generated wrapper class must be declared `abstract` (TS2515 otherwise — the compiler can't
  see through the generic constructor type that `target` already implements `defineEntity`), even
  though it is never constructed directly and is always cast away before returning.

See [decorator-mixin-traps.md](decorator-mixin-traps.md) for why `EntityConstructor` cannot be
pinned at `Entity<PropertiesShapeBase>` in the first place.

## Contextual typing of a method decorator's replacement

The replacement must be written as `const replacement: typeof target = function (...) {...}` —
the function as the *direct initializer* of a `const` typed against `typeof target`. That is what
gives the implicit `this` parameter and the rest parameter `args` contextual typing, inherited
from `typeof target`'s own `This`/`Args`/`Return`.

A `function replacement(...) {}` declared separately and returned afterwards does **not** get
contextual typing — that only applies at a syntactic position that already expects a type (an
assignment or return expression), not a later reference to an already-declared, unannotated
function — and falls back to implicit `any` under this package's `strict: true`.

A hand-annotated alternative such as `function (this: unknown, ...args: unknown[]): unknown` fails
differently: return-position assignability is covariant, and `unknown` is not assignable to an
arbitrary generic `Return`, only to a `Return` that happens to be `unknown` itself.

Because `replacement`'s declared type is already exactly `typeof target`, the method decorators
need no `as unknown as typeof target` cast on the return, unlike the class decorators'.

## Never type-check a scratch file whose name starts with a dot

TypeScript's default `include` (`**/*`) does not match dotfiles, so `tsc --noEmit` exits 0 while
silently ignoring `.probe.ts` / `.spike.ts`. A design spike was once declared sound on exactly
that false signal; the same file renamed without the dot failed immediately with TS2515. Use a
plain name (`probe-check.ts`) and delete it afterwards.
