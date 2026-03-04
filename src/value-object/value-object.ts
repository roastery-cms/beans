import type { IValueObjectMetadata } from "@/value-object/types";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import type { Schema } from "@roastery/terroir/schema";
import type { t } from "@roastery/terroir";

export abstract class ValueObject<ValueType, SchemaType extends t.TSchema> {
	protected abstract readonly schema: Schema<SchemaType>;

	protected constructor(
		public readonly value: ValueType,
		protected readonly info: IValueObjectMetadata,
	) {}

	protected validate(): void {
		if (!this.schema.match(this.value))
			throw new InvalidPropertyException(this.info.name, this.info.source);
	}
}
