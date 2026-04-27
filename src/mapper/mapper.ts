import type { t } from "@roastery/terroir";
import { ParseEntityToDTOService } from "../entity/services";
import { EntitySchema, EntitySource } from "../entity/symbols";
import type { IEntity, IRawEntity } from "../entity/types";
import { InvalidDomainDataException } from "@roastery/terroir/exceptions/domain";
import { Entity } from "@/entity";

/**
 * Bidirectional bridge between {@link Entity} instances and their DTOs.
 *
 * Frozen as `as const` so it acts as a type-safe namespace rather than a
 * stateful service: there is nothing to instantiate. The two operations are
 * deliberately asymmetric:
 *
 * - {@link Mapper.toDTO} is a *pure* conversion — the entity already has the
 *   shape we need, so the mapper just walks it and validates the output.
 * - {@link Mapper.toDomain} is a *factory invocation* — reconstructing an entity
 *   requires subclass-specific logic (which value-objects to build, which
 *   private fields to assign), so the mapper splits the DTO and hands the
 *   pieces to a caller-provided factory.
 *
 * @see {@link Entity}
 * @see {@link IEntity}
 * @see {@link ParseEntityToDTOService} — implementation of the recursive walk.
 *
 * @example
 * ```ts
 * import { Mapper } from "@roastery/beans/mapper";
 *
 * // Entity → DTO (validated against entity[EntitySchema])
 * const dto = Mapper.toDTO(post);
 *
 * // DTO → Entity (factory receives domain data and entity props split)
 * const post = Mapper.toDomain<typeof PostDTO>(dto, (data, entityProps) => {
 *   return new Post({ ...entityProps, title: data.title, slug: data.slug });
 * });
 * ```
 */
export const Mapper = {
	/**
	 * Flattens an entity into its plain-object DTO and validates the result
	 * against `entity[EntitySchema]`.
	 *
	 * Delegates the recursive walk to {@link ParseEntityToDTOService.run} —
	 * see its doc-block for the full mapping table (private-field underscore
	 * stripping, value-object unwrapping, nested entity recursion, etc.).
	 *
	 * Validation runs *after* the walk completes, so any malformed nested data
	 * surfaces here as a single top-level exception rather than a deep stack.
	 *
	 * @typeParam SchemaType - TypeBox schema describing the entity's DTO.
	 *
	 * @param data - The entity instance to convert.
	 * @returns The validated DTO, typed as `t.Static<SchemaType>`.
	 *
	 * @throws `InvalidDomainDataException` — when the produced DTO fails the
	 *   schema match. The exception's identifier is the entity's `[EntitySource]`,
	 *   so the caller can tell which entity type failed.
	 */
	toDTO: <SchemaType extends t.TSchema>(
		data: IEntity<SchemaType>,
	): t.Static<SchemaType> => {
		const entityMapped = ParseEntityToDTOService.run<
			SchemaType,
			IEntity<SchemaType>
		>(data);

		if (!data[EntitySchema].match(entityMapped))
			throw new InvalidDomainDataException(data[EntitySource]);

		return entityMapped;
	},
	/**
	 * Splits a DTO into its base entity props (`id`, `createdAt`, `updatedAt`)
	 * and the remaining domain content, then hands both to a caller-provided
	 * factory that builds the entity instance.
	 *
	 * The split is purely structural: the rest-spread `{ id, createdAt, updatedAt, ...content }`
	 * extracts the three universal fields by name and groups everything else
	 * into `content`. The cast `content as Input` is structurally checked at
	 * compile time but **not** runtime-validated — callers that produced the
	 * DTO from a non-`Mapper.toDTO` source should validate it themselves before
	 * invoking this method.
	 *
	 * @typeParam SchemaType - TypeBox schema describing the entity's DTO.
	 * @typeParam Input - The domain-content slice of the DTO. Defaults to
	 *   `Omit<t.Static<SchemaType>, keyof IRawEntity>` so callers that don't
	 *   specify it get the schema's static type minus the three entity props.
	 *   Override when the DTO carries denormalised fields you want excluded
	 *   from the factory's `data` argument. (Generic added in commit `7d83eea`,
	 *   closing issue #6.)
	 * @typeParam Output - Whatever shape the factory produces. Defaults to
	 *   `unknown` so the mapper stays agnostic: factories typically return an
	 *   `IEntity<SchemaType>`, but they may also return a domain-specific
	 *   sub-interface (e.g. `IPostTag`) or any other wrapper without the
	 *   mapper having to widen its constraint. Specify it explicitly — or let
	 *   it be inferred from the factory — when you want the call site to
	 *   preserve the concrete return type.
	 *
	 * @param dto - DTO carrying both the entity props (`IRawEntity`) and the
	 *   domain content (`Input`). The two halves are split before the factory runs.
	 * @param factory - Builds the entity from the split data. The factory owns
	 *   the choice of which value-objects to instantiate and how to wire them
	 *   to private fields; the mapper does not look at the resulting entity,
	 *   it just forwards whatever the factory returns.
	 * @returns The value produced by `factory`, propagated as-is and typed as `Output`.
	 */
	toDomain: <
		SchemaType extends t.TSchema,
		Input = Omit<t.Static<SchemaType>, keyof IRawEntity>,
		Output = unknown,
	>(
		dto: Input & IRawEntity,
		factory: (data: Input, entityProps: IRawEntity) => Output,
	): Output => {
		const { id, createdAt, updatedAt, ...content } = dto;
		return factory(content as Input, {
			id,
			createdAt,
			updatedAt,
		});
	},
} as const;
