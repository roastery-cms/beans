import { BoundEntity } from "@/domain/entity/entity";
import type {
	EntityClassOf,
	EntityDefinition,
	PropertiesShapeBase,
} from "@/domain/entity/types";

/**
 * Builds an `Entity` base class already bound to a blueprint, so a subclass
 * declares only its own behaviour.
 *
 * It replaces three pieces of boilerplate at once: the `defineEntity()` method,
 * the `interface X extends AccessorsOf<…> {}` declaration merge, and the
 * `biome-ignore` that merge requires. The accessors come out **typed** without
 * the merge — which matters, because forgetting that line is the package's one
 * silent failure mode: the getters still work at runtime, they just vanish from
 * the type system.
 *
 * Both forms stay supported. Extending `Entity` directly and implementing
 * `defineEntity` is unchanged and still the way to go when a subclass wants to
 * compute its definition rather than state it.
 *
 * **Call it once, at module scope**, exactly as with the value-object
 * factories: each call mints a fresh class, and the blueprint object's identity
 * is what memoizes the derived schema and the compiled validator.
 *
 * @typeParam PropertiesShape - The blueprint shape.
 *
 * @param properties - The blueprint: one `ValueObject` or nested `Entity`
 *   class per domain property. `id`/`createdAt`/`updatedAt` must not appear.
 * @param source - Stable entity-type name (e.g. `"author"`), the `source` of
 *   every validation error this class raises.
 * @param extra - The rest of the definition, if any — currently the
 *   `sensitive` key list.
 * @returns A concrete base class to extend.
 *
 * @example
 * ```ts
 * const authorProperties = blueprint({ name: StringVO, slug: SlugVO })
 *   .with({ slug: { derive: (raw) => raw.name } });
 *
 * class Author extends entityOf(authorProperties, "author") {
 *   public rename(value: string): void {
 *     this.set("name", value);
 *     this.raiseEvent(AuthorRenamed); // protected members stay reachable
 *   }
 * }
 *
 * const author = new Author({ name: "Alan Reis" });
 * author.slug;    // "alan-reis" — typed, with no interface merge
 * Author.demo();  // an Author, not the base
 * ```
 *
 * @see `EntityClassOf` in `../types/entity-class-of.type` — the returned shape.
 */
export function entityOf<const PropertiesShape extends PropertiesShapeBase>(
	properties: PropertiesShape,
	source: string,
	extra?: Omit<EntityDefinition<PropertiesShape>, "properties" | "source">,
): EntityClassOf<PropertiesShape> {
	// Stamped onto the class as a static rather than closed over, so
	// `BoundEntity.defineEntity` stays pure and prototype-borne: `fromJSON`
	// reads it off an `Object.create` probe, which has no closure but does
	// resolve `constructor` to this class. Built once here, so the schema memo
	// keeps seeing one blueprint object.
	class BlueprintEntity extends BoundEntity<PropertiesShape> {
		public static readonly definition: EntityDefinition<PropertiesShape> = {
			...extra,
			properties,
			source,
		};
	}

	// The cast covers the accessors alone: they are installed on the prototype
	// at construction, derived from the blueprint, so the class expression
	// above cannot describe them. Everything else matches structurally.
	return BlueprintEntity as unknown as EntityClassOf<PropertiesShape>;
}
