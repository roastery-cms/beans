import type { ReshapeShapeBase } from "./reshape-shape-base.type";

/**
 * The domain property keys of a **reshape target** — its string keys,
 * excluding the symbol slot a ruled blueprint carries its rules under.
 *
 * `DomainKeys`' counterpart for the wider shape, and a deliberate duplicate of
 * its one-line body rather than a widening of its bound. `DomainKeys` is the
 * gate CLAUDE.md names: every mapped type over a *blueprint* goes through it,
 * and its constraint is what states that the thing being mapped is a real
 * blueprint. Loosening that to serve two callers here would weaken the promise
 * for the ~20 that rely on it. The package already answers this exact question
 * the same way — `CommandDomainKeys` is a duplicate because a command shape is
 * a different concept, while `RecordDomainKeys` is a true alias because a
 * record blueprint is the same concept. A reshape target is the former case.
 *
 * @typeParam Shape - The reshape target.
 *
 * @example
 * ```ts
 * type Keys = ReshapeKeys<typeof postCard>; // "title" | "author" | "tags"
 * ```
 *
 * @see `DomainKeys` in `./domain-keys.type` — the blueprint counterpart, and
 *   why the rules slot has to be filtered out of both.
 * @see `CommandDomainKeys` in `@/application/command/types` — the same
 *   duplicate-rather-than-widen call, made for the same reason.
 */
export type ReshapeKeys<Shape extends ReshapeShapeBase> = Extract<
	keyof Shape,
	string
>;
