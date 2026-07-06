import type { Schema } from "@roastery/terroir/schema";
import type {
	EntityContext,
	EntityFactory as EntityFactorySymbol,
	EntitySchema,
	EntitySource,
} from "../symbols";
import type { EntityDTO } from "../dtos";
import type { IRawEntity } from "./raw-entity.interface";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { t } from "@roastery/terroir";

/**
 * Behavioural contract of every domain entity, on top of the data fields
 * defined by {@link IRawEntity}. Implemented by the {@link Entity} abstract
 * class; consumed as a generic constraint by {@link Mapper.toDTO} and
 * `ParseEntityToDTOService.run`.
 *
 * The symbol-keyed members tag the entity with the metadata required for
 * validation and DTO mapping. Symbols (rather than string keys) keep these
 * properties invisible to the mapper's iteration walk so they never leak into
 * the produced DTO.
 *
 * @typeParam SchemaType - TypeBox schema type validating the full DTO. Constrained
 *   to {@link t.TSchema}; flows into the `[EntitySchema]` field type.
 *
 * @see {@link Entity} — the abstract class implementing this contract.
 * @see {@link IRawEntity} — the data fields this interface extends.
 */
export interface IEntity<SchemaType extends t.TSchema> extends IRawEntity {
	/** Stable entity-type identifier (e.g. `"post"`, `"user"`). */
	readonly [EntitySource]: string;

	/** Validation schema for the entity's DTO; bound by each subclass. */
	readonly [EntitySchema]: Schema<SchemaType>;

	/**
	 * Rebuilds an instance of this entity's own type from domain-content
	 * input, optionally preserving the base props of an already-persisted
	 * entity. Declared as a method (not a property) so each subclass can
	 * narrow `data` to its own concrete input type — see
	 * {@link EntityFactory} (the symbol) for why that requires method syntax.
	 */
	[EntityFactorySymbol](
		data: Omit<t.Static<SchemaType>, keyof IRawEntity>,
		initialProperties?: EntityDTO,
	): this;

	/**
	 * Builds a fresh `IValueObjectMetadata` payload tagged with `[EntitySource]`.
	 * Subclasses pass the result into every value-object factory so validation
	 * errors carry both the field name and the owning entity type.
	 */
	[EntityContext](name: string): IValueObjectMetadata;
}
