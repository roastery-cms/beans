import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import { generateUUID } from "@/entity/helpers";
import type { UuidDTO } from "../dtos";
import { UuidSchema } from "../schemas";

export class UuidVO extends ValueObject<string, typeof UuidDTO> {
	protected override schema: Schema<typeof UuidDTO> = UuidSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	public static make(value: string, info: IValueObjectMetadata): UuidVO {
		const newVO = new UuidVO(value, info);

		newVO.validate();

		return newVO;
	}

	public static generate(info: IValueObjectMetadata): UuidVO {
		return UuidVO.make(generateUUID(), info);
	}
}
