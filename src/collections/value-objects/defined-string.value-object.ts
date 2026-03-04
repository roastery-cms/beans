import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { StringDTO } from "../dtos";
import { StringSchema } from "../schemas";

export class DefinedStringVO extends ValueObject<string, typeof StringDTO> {
	protected override schema: Schema<typeof StringDTO> = StringSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	public static make(
		value: string,
		info: IValueObjectMetadata,
	): DefinedStringVO {
		const newVO = new DefinedStringVO(value, info);

		newVO.validate();

		return newVO;
	}
}
