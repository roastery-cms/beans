import type { DomainKeys } from "./domain-keys.type";
import type { PropertiesShapeBase } from "./properties-shape-base.type";
import type { ReadValueOf } from "./read-value-of.type";

/**
 * The read-only accessors an entity derives from its blueprint: one property
 * per blueprint key, typed exactly like `get` for that key.
 *
 * The getters are installed on the prototype at runtime regardless; merging
 * this interface is how TypeScript learns about them — declare
 * `interface X extends AccessorsOf<typeof xProperties> {}` next to the class.
 * Skip the line and the accessors still work but stay invisible to the type
 * system.
 *
 * @typeParam PropertiesShape - The entity's blueprint shape.
 *
 * @example
 * ```ts
 * const postProperties = { title: StringVO };
 *
 * interface Post extends AccessorsOf<typeof postProperties> {}
 * class Post extends Entity<typeof postProperties> { ... }
 *
 * post.title; // string — typed by the merge
 * ```
 */
export type AccessorsOf<PropertiesShape extends PropertiesShapeBase> = {
	readonly [Key in DomainKeys<PropertiesShape>]: ReadValueOf<
		PropertiesShape,
		Key
	>;
};
