import type { Schema } from "@roastery/terroir/schema";
import type { EntityContext, EntitySchema, EntitySource } from "../symbols";
import type { IRawEntity } from "./raw-entity.interface";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { t } from "@roastery/terroir";

/**
 * Behavioural contract of every domain entity, on top of the data fields
 * defined by {@link IRawEntity}. Implemented by the {@link Entity} abstract
 * class; consumed as a generic constraint by {@link Mapper.toDTO} and
 * `ParseEntityToDTOService.run`.
 *
 * The three symbol-keyed members tag the entity with the metadata required for
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
	 * Builds a fresh `IValueObjectMetadata` payload tagged with `[EntitySource]`.
	 * Subclasses pass the result into every value-object factory so validation
	 * errors carry both the field name and the owning entity type.
	 */
	[EntityContext](name: string): IValueObjectMetadata;
}
