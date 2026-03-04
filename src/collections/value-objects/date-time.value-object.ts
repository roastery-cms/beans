import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { DateTimeDTO } from "../dtos";
import { DateTimeSchema } from "../schemas";

export class DateTimeVO extends ValueObject<string, typeof DateTimeDTO> {
	protected override schema: Schema<typeof DateTimeDTO> = DateTimeSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	public static make(value: string, info: IValueObjectMetadata): DateTimeVO {
		const newVO = new DateTimeVO(value, info);

		newVO.validate();

		return newVO;
	}

	public static now(info: IValueObjectMetadata): DateTimeVO {
		return DateTimeVO.make(new Date().toISOString(), info);
	}
}
