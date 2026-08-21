# Decorator mixin traps

**Status:** closed. **Origin:** extracted from `CLAUDE.md` on 2026-08-21.

The lifecycle decorators (`onCreate`, `onUpdate`, `onDelete`) are standard (TC39 Stage 3)
**class** decorators, built on the TS mixin pattern. Three of that pattern's requirements are
load-bearing here, not stylistic choices.

## `EntityConstructor` cannot be `abstract new (...args: any[]) => Entity<PropertiesShapeBase>`

That looks like the obvious base type, but `Entity<Shape>`'s `toJSON()`/`get()` return types are
shape-dependent in a way that makes a concrete `Entity<SomeShape>`'s construct signature
structurally incompatible with `Entity<PropertiesShapeBase>`'s (the aggregate
`SerializedEntity<PropertiesShapeBase>` needs a string index signature a concrete blueprint's
serialized shape doesn't have) — pinning the mixin base there makes every decorated subclass fail
to type-check against its own blueprint.

`EntityConstructor` instead targets a narrow, blueprint-independent structural slice
(`EntityLike`: `[Source]`, `updatedAt`, `isDestroyed`, `setMany`, `destroy` — exactly what the
decorators touch), sidestepping the incompatibility entirely.

The same incompatibility is why `collectResult`/`collectDomainEvents` use a **structural** bound
(`{ pullDomainEvents(...): readonly IDomainEvent[] }`) rather than the nominal `Entity` class.

## `any[]` and `abstract class Decorated`

- The base constructor type's rest parameter must be exactly `any[]` (TS2545 otherwise —
  `never[]`, the usual "widest signature" trick, does not satisfy this specific check), each
  carrying a `biome-ignore lint/suspicious/noExplicitAny`.
- The generated wrapper class (`class Decorated extends target`) must be declared `abstract`
  (TS2515 otherwise — the compiler can't see through the generic constructor type that `target`
  already implements `defineEntity`), even though `Decorated` is never constructed directly and is
  always cast away (`as unknown as typeof target`) before returning.

## Reaching `raiseEvent` needs a cast

Reaching `raiseEvent` (protected) from the generated wrapper needs
`(this as unknown as { raiseEvent(event: unknown): void }).raiseEvent(event)` — TypeScript's
protected-access rules don't resolve reliably through a generic mixin parameter. The same
pragmatic-cast spirit `entity.ts` itself already uses in `buildProperty`/`readDefinition`.

The method decorators need the identical cast for a different reason: a method decorator's `This`
type parameter has no way to be constrained to "has a protected `raiseEvent`" (a protected member
can't appear in a structural constraint checked against an unrelated type). No dedicated named
type exists for this cast shape; it stays inline.

## The method decorators are a different TC39 shape

A method decorator receives `(target, context)` where `target` is the method function itself and
`context` is a `ClassMethodDecoratorContext`, and returns a replacement function with the same
signature — there is no `class Decorated extends target`, no mixin, and none of the
TS2515/TS2545 traps that shape requires.

`EntityMethodDecorator` (internal) needs three type parameters — `<This, Args extends unknown[],
Return>` — where `EntityLifecycleDecorator` needed only one (`Class`). A class decorator's mixin
base collapses to a single constructor type; a method's receiver, argument tuple and return type
vary independently per decorated method, so each needs its own generic slot. `Args extends
unknown[]`, not `any[]`: with no mixin base class here, none of the TS2545/TS2515 traps apply, so
`unknown[]` is strictly safer and needs no `biome-ignore`.
