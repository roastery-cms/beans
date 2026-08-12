/**
 * @module @roastery/beans/collections/value-objects/new
 *
 * Value-objects escritos sobre a **base nova** (`@/value-object/new`) — a que
 * valida no próprio construtor e obtém schema e default de um `defineMeta()`
 * declarado pela subclasse.
 *
 * Vivem à parte dos VOs de `collections/value-objects/*.value-object.ts`, que
 * continuam sobre a base antiga, porque as duas bases coexistem enquanto a
 * `BetterEntity` não substitui a `Entity`. Os **DTOs e Schemas são os mesmos** —
 * só a base do VO muda.
 *
 * Estes três existem porque a `BetterEntity` precisa deles para os campos de
 * identidade (`id`, `createdAt`, `updatedAt`); de quebra, servem de referência
 * do padrão para os demais.
 *
 * Re-exports:
 * - {@link DateTimeVO} — string ISO 8601.
 * - {@link DefinedStringVO} — string não-vazia.
 * - {@link UuidVO} — string UUID.
 *
 * @see {@link ValueObject} — a base nova.
 */

import { generateUUID } from "@/entity/helpers";
import { ValueObject } from "@/value-object/new";
import type { IValueObjectMetadata } from "@/value-object/types";
import type { DateTimeDTO, StringDTO, UuidDTO } from "../dtos";
import { DateTimeSchema, StringSchema, UuidSchema } from "../schemas";

/**
 * Valor padrão de {@link DefinedStringVO} no modo demo.
 *
 * Não pode ser `""`: `StringDTO` exige `minLength: 1`, e a base valida o
 * default como valida qualquer outro valor — um default inválido faria
 * `DefinedStringVO.demo(...)` lançar. Vale para qualquer VO: **o `meta.default`
 * precisa passar no próprio `meta.model`.**
 */
const DEFINED_STRING_PLACEHOLDER = "string";

/**
 * String não-vazia (`minLength: 1`), sobre a base nova.
 *
 * Reusa {@link StringDTO} / {@link StringSchema} em vez de declarar os
 * próprios — é um alias semântico de "string definida", não uma forma
 * estruturalmente distinta.
 *
 * @see {@link DefinedStringVO} em `defined-string.value-object.ts` — o
 *   equivalente sobre a base antiga.
 *
 * @example
 * ```ts
 * new DefinedStringVO("alan", { name: "name", source: "bean" });
 * DefinedStringVO.demo({ name: "name", source: "bean" });
 * ```
 */
export class DefinedStringVO extends ValueObject<string, typeof StringDTO> {
	/** @returns O schema de string não-vazia e o placeholder do modo demo. */
	protected defineMeta(): IValueObjectMetadata<string, typeof StringDTO> {
		return { default: DEFINED_STRING_PLACEHOLDER, model: StringSchema };
	}
}

/**
 * String ISO 8601, sobre a base nova.
 *
 * O `meta.default` é o **thunk** `() => new Date().toISOString()`, e não o
 * timestamp já calculado: `defineMeta` roda a cada construção, então um valor
 * pronto seria calculado também nas construções que informam uma data real e o
 * descartariam. O thunk só é chamado no modo demo, e aí cada instância carrega
 * o instante em que nasceu — que é o que se espera de um `createdAt`.
 *
 * @see {@link DateTimeVO} em `date-time.value-object.ts` — o equivalente sobre
 *   a base antiga, que expõe a mesma ideia como `DateTimeVO.now(info)`.
 *
 * @example
 * ```ts
 * new DateTimeVO("2026-08-07T10:00:00.000Z", { name: "createdAt", source: "bean" });
 * // equivalente ao antigo DateTimeVO.now(info):
 * DateTimeVO.demo({ name: "createdAt", source: "bean" });
 * ```
 */
export class DateTimeVO extends ValueObject<string, typeof DateTimeDTO> {
	/** @returns O schema ISO 8601 e um thunk que devolve o instante atual. */
	protected defineMeta(): IValueObjectMetadata<string, typeof DateTimeDTO> {
		return { default: () => new Date().toISOString(), model: DateTimeSchema };
	}
}

/**
 * String UUID, sobre a base nova.
 *
 * Como em {@link DateTimeVO}, o `meta.default` é um thunk — aqui o próprio
 * {@link generateUUID} (v7, ordenável por tempo), passado por referência. Só é
 * chamado no modo demo, então hidratar uma entidade com id conhecido não gera
 * um UUID para jogar fora. Duas instâncias em modo demo recebem ids diferentes,
 * que é o que identidade exige.
 *
 * @see {@link UuidVO} em `uuid.value-object.ts` — o equivalente sobre a base
 *   antiga, que expõe a mesma ideia como `UuidVO.generate(info)`.
 *
 * @example
 * ```ts
 * new UuidVO("018f5c8e-2e1f-7b3a-8c4d-9a8b7c6d5e4f", { name: "id", source: "bean" });
 * // equivalente ao antigo UuidVO.generate(info):
 * UuidVO.demo({ name: "id", source: "bean" });
 * ```
 */
export class UuidVO extends ValueObject<string, typeof UuidDTO> {
	/** @returns O schema de UUID e o gerador v7 como thunk. */
	protected defineMeta(): IValueObjectMetadata<string, typeof UuidDTO> {
		return { default: generateUUID, model: UuidSchema };
	}
}
