/**
 * Fuses a union into an intersection: `A | B | C` becomes `A & B & C`.
 *
 * The only way to express this in TypeScript is inference from a
 * *contravariant* position — the union is distributed into a union of
 * one-parameter function types, and inferring a single parameter type back out
 * of that union forces the compiler to produce the intersection of every
 * candidate. There is no built-in for it.
 *
 * This pillar needs it because each selected method name resolves to a
 * **different, parametrized** contract (`ICanReadBy<E, "email">` is not the
 * same type as `ICanReadBy<E, "name">`), so there is no single object type to
 * `Pick` the selection out of — the selection has to be built up by fusion.
 *
 * `UnionToIntersection<never>` is `unknown`, not `never`: `never` distributes
 * to nothing, leaving no inference candidate, and an unconstrained `infer`
 * falls back to the top type. Callers that treat "nothing selected" as an
 * error must test for `never` **before** reaching this type —
 * {@link RepositoryOf} does, with `[Selected] extends [never]`.
 *
 * Kept local to this pillar rather than promoted to `@/shared`: the house rule
 * is that only what both pillars need *verbatim* moves up. Move it when a
 * second pillar needs it, not before.
 *
 * @typeParam Union - The union to fuse.
 *
 * @example
 * ```ts
 * type Fused = UnionToIntersection<{ a: 1 } | { b: 2 }>; // { a: 1 } & { b: 2 }
 * ```
 */
export type UnionToIntersection<Union> = (
	Union extends unknown
		? (distributed: Union) => void
		: never
) extends (merged: infer Intersection) => void
	? Intersection
	: never;
