import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { Schema } from "@roastery/terroir/schema";
import type { UrlDTO } from "../dtos";
import { UrlSchema } from "../schemas";

export class UrlVO extends ValueObject<string, typeof UrlDTO> {
	protected override schema: Schema<typeof UrlDTO> = UrlSchema;

	protected constructor(value: string, info: IValueObjectMetadata) {
		super(value, info);
	}

	public static make(value: string, info: IValueObjectMetadata): UrlVO {
		const newVO = new UrlVO(value, info);

		newVO.validate();

		return newVO;
	}
}
