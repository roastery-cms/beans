import type { t } from "@roastery/terroir";
import type { Schema } from "@roastery/terroir/schema";

export interface IValueObjectMetadata<ValueType, SchemaType extends t.TSchema> {
    readonly default: ValueType | (() => ValueType);
    readonly model: Schema<SchemaType>;
}
