import { t } from "@roastery/terroir";

/**
 * TypeBox schema describing the three universal fields stamped on by every
 * {@link Entity} subclass: `id` (UUID), `createdAt` (ISO 8601), and the optional
 * `updatedAt` (ISO 8601).
 *
 * Concrete entities compose this shape with their domain fields when declaring
 * their own DTO, e.g. `t.Object({ ...EntityDTO.properties, title: StringDTO })`,
 * or feed it directly to a factory like {@link makeEntity}.
 *
 * The `examples` metadata is consumed by JSON-Schema renderers (Swagger, etc.)
 * and is intentionally distinct from the `description` strings, which are
 * surfaced in TypeBox's introspection output.
 *
 * **Naming note:** the const and the `EntityDTO` type below share their name —
 * an idiomatic TypeScript schema/type pair. The const is the runtime schema;
 * the type is `t.Static<typeof EntityDTO>`.
 *
 * @see {@link Entity} — the abstract class that consumes this shape.
 * @see {@link EntitySchema} (runtime instance) — `Schema.make(EntityDTO)`.
 */
export const EntityDTO = t.Object(
	{
		id: t.String({ format: "uuid", description: "Entity's Id" }),
		createdAt: t.String({
			format: "date-time",
			description: "When Entity was Created.",
		}),
		updatedAt: t.Optional(
			t.String({
				format: "date-time",
				description: "When Entity was Updated.",
			}),
		),
	},
	{
		description:
			"Base entity structure containing common fields like ID and timestamps.",
		examples: [
			{
				id: "550e8400-e29b-41d4-a716-446655440000",
				createdAt: "2024-01-01T12:00:00Z",
				updatedAt: "2024-01-02T12:00:00Z",
			},
		],
	},
);

/**
 * Static type extracted from the {@link EntityDTO} schema — the plain-object
 * shape of the three universal entity fields.
 *
 * Consumed by `Entity`'s constructor signature and by {@link makeEntity}'s
 * return type so callers get the same view of the base contract whether they
 * came in through validation or through a fresh-data factory.
 */
export type EntityDTO = t.Static<typeof EntityDTO>;
