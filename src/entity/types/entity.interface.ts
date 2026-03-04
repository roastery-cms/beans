import type { Schema } from "@roastery/terroir/schema";
import type { EntityContext, EntitySchema, EntitySource } from "../symbols";
import type { IRawEntity } from "./raw-entity.interface";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { t } from "@roastery/terroir";

export interface IEntity<SchemaType extends t.TSchema> extends IRawEntity {
	readonly [EntitySource]: string;
	readonly [EntitySchema]: Schema<SchemaType>;
	[EntityContext](name: string): IValueObjectMetadata;
}
