import { Context } from "@/actions/context";
import { Meta } from "@/actions/meta";
import type { t } from "@roastery/terroir";
import {
	InvalidPropertyException,
	OperationFailedException,
} from "@roastery/terroir/exceptions/domain";
import type { IValueObjectMetadata } from "./types";
import type { IValueObjectContext } from "./types/value-object-context.interface";

/**
 * Sentinela de construção em modo demo. Privado do módulo de propósito: é o
 * canal por onde {@link ValueObject.demo} pede o `meta.default` sem que a
 * assinatura pública do construtor precise de um segundo modo.
 */
const Demo = Symbol("demo");

/**
 * Uma referência de classe de `ValueObject` — não uma instância. É o mínimo
 * que {@link metaOf} precisa para montar a sonda.
 */
type AnyValueObjectClass = {
	readonly prototype: object;
};

/**
 * Resolve o `meta.default`, que pode vir como valor pronto ou como thunk.
 *
 * O thunk existe para o default caro — `generateUUID()`, `new Date()` — não ser
 * avaliado nas construções que informam um valor real e o descartariam. A
 * discriminação é `typeof === "function"`, então um VO cujo `ValueType` *seja*
 * uma função precisaria envolvê-la num thunk; nenhum VO do domínio embrulha
 * função.
 *
 * @typeParam ValueType - Tipo do valor cru que o VO embrulha.
 *
 * @param value - O `meta.default` da subclasse: valor ou thunk.
 * @returns O valor, já avaliado.
 */
function resolveDefault<ValueType>(
	value: ValueType | (() => ValueType),
): ValueType {
	return typeof value === "function" ? (value as () => ValueType)() : value;
}

/**
 * Invoca o `defineMeta` de um objeto, guardando a armadilha do class field.
 *
 * A base chama `this.defineMeta()` **dentro** do construtor, porque precisa do
 * `model` para validar. O initializer de um class field só roda depois do
 * `super()` retornar, então um `protected defineMeta = () => …` chegaria tarde
 * demais e a construção morreria com `TypeError: this.defineMeta is not a
 * function`. O TypeScript não recusa isso (uma propriedade pode sobrescrever um
 * método), então o guarda é de runtime — e troca o `TypeError` cru por uma
 * exceção que explica a ordem de inicialização.
 *
 * @typeParam ValueType - Tipo do valor cru que o VO embrulha.
 * @typeParam SchemaType - Schema TypeBox que valida `ValueType`.
 *
 * @param valueObject - A instância (ou sonda) que deve implementar `defineMeta`.
 * @param source - Identificador para a exceção; `"value-object"` quando não há contexto.
 * @returns O metadado da subclasse.
 *
 * @throws `OperationFailedException` — quando `defineMeta` não é um método de protótipo.
 */
function readMeta<ValueType, SchemaType extends t.TSchema>(
	valueObject: object,
	source: string,
): IValueObjectMetadata<ValueType, SchemaType> {
	const define = (
		valueObject as {
			defineMeta?: () => IValueObjectMetadata<ValueType, SchemaType>;
		}
	).defineMeta;

	if (typeof define !== "function")
		throw new OperationFailedException(
			source,
			"ValueObject: defineMeta precisa ser um método de protótipo. Declarado como class field, seu initializer só roda depois do super(), e a base o invoca durante a construção.",
		);

	return define.call(valueObject);
}

/**
 * Lê o metadado de uma **classe** de `ValueObject`, sem construir instância
 * nenhuma: monta uma sonda com `Object.create` e chama o `defineMeta` que vive
 * no protótipo.
 *
 * É o que permite a `BetterEntity` derivar o schema agregado a partir do
 * blueprint sem instanciar um VO por propriedade — e, por consequência, sem que
 * a derivação dependa de o `meta.default` ser válido. Só funciona porque
 * `defineMeta` é **puro** por contrato: devolve um literal, sem olhar o estado
 * da instância.
 *
 * @typeParam ValueType - Tipo do valor cru que o VO embrulha.
 * @typeParam SchemaType - Schema TypeBox que valida `ValueType`.
 *
 * @param valueObjectClass - A classe de `ValueObject`.
 * @returns O `{ default, model }` declarado pela classe.
 *
 * @throws `OperationFailedException` — quando `defineMeta` não é um método de protótipo.
 */
export function metaOf<ValueType, SchemaType extends t.TSchema>(
	valueObjectClass: AnyValueObjectClass,
): IValueObjectMetadata<ValueType, SchemaType> {
	return readMeta<ValueType, SchemaType>(
		Object.create(valueObjectClass.prototype) as object,
		"value-object",
	);
}

/**
 * Base imutável e auto-validada para valores de domínio.
 *
 * A subclasse declara **apenas** `defineMeta()` — o schema que valida o valor e
 * o default do modo demo. Construtor, validação e modo demo vêm da base:
 *
 * ```ts
 * class DefinedStringVO extends ValueObject<string, typeof StringDTO> {
 *   protected defineMeta(): IValueObjectMetadata<string, typeof StringDTO> {
 *     return { default: "string", model: StringSchema };
 *   }
 * }
 *
 * new DefinedStringVO("alan", { name: "name", source: "bean" });
 * DefinedStringVO.demo({ name: "name", source: "bean" });
 * ```
 *
 * Sobrescreva {@link ValueObject.transform} quando o valor precisar ser
 * normalizado antes da validação (ex.: `slugify`).
 *
 * @typeParam ValueType - Tipo do valor cru que o VO embrulha.
 * @typeParam SchemaType - Schema TypeBox que valida `ValueType`.
 *
 * @see {@link metaOf} — lê o metadado da classe sem construir instância.
 * @see {@link IValueObjectMetadata} — o `{ default, model }` que `defineMeta` devolve.
 */
export abstract class ValueObject<ValueType, SchemaType extends t.TSchema> {
	/** O valor embrulhado, já normalizado por {@link ValueObject.transform} e validado. */
	public readonly value: ValueType;

	/** Schema e default da classe, obtidos de {@link ValueObject.defineMeta} na construção. */
	public readonly [Meta]: IValueObjectMetadata<ValueType, SchemaType>;

	/** De quem é este valor: `{ name, source }`, usado nas mensagens de erro. */
	public readonly [Context]: IValueObjectContext;

	/**
	 * Declara o que a classe **é**: o schema que valida seus valores e o default
	 * que o modo demo usa.
	 *
	 * **Precisa ser um método de protótipo, nunca um class field** — a base o
	 * invoca dentro do construtor, antes de qualquer initializer de campo rodar.
	 * E precisa ser **puro**: {@link metaOf} o chama sobre uma sonda sem
	 * construtor executado.
	 */
	protected abstract defineMeta(): IValueObjectMetadata<ValueType, SchemaType>;

	/**
	 * @param value - O valor cru. Passa por `transform` e depois pela validação.
	 * @param context - `{ name, source }` — de quem é o valor, para a mensagem de erro.
	 *
	 * @throws `InvalidPropertyException` — quando o valor não passa no `meta.model`.
	 * @throws `OperationFailedException` — quando `defineMeta` não é método de protótipo.
	 */
	public constructor(value: ValueType, context: IValueObjectContext) {
		this[Context] = context;
		this[Meta] = readMeta<ValueType, SchemaType>(this, context.source);

		this.value =
			(value as unknown) === Demo
				? resolveDefault(this[Meta].default)
				: this.transform(value);

		this.validate();
	}

	/**
	 * Constrói o VO com o `meta.default` da própria classe em vez de um valor
	 * informado. É o ponto de entrada sem dados, equivalente ao `demo()` da
	 * `BetterEntity`.
	 *
	 * @param context - `{ name, source }` — de quem é o valor.
	 * @returns Uma instância da subclasse que recebeu a chamada.
	 *
	 * @throws `InvalidPropertyException` — quando o próprio default não passa no
	 *   `meta.model`. O default é validado como qualquer outro valor.
	 */
	public static demo<
		Self extends { readonly prototype: { readonly value: unknown } },
	>(this: Self, context: IValueObjectContext): Self["prototype"] {
		// biome-ignore lint/complexity/noThisInStatic: `this` é a subclasse concreta que recebeu a chamada; trocar por `ValueObject` construiria a base abstrata.
		return Reflect.construct(this as never, [
			Demo,
			context,
		]) as Self["prototype"];
	}

	/** @returns O schema da classe serializado como string JSON. */
	public get schema(): string {
		return this[Meta].model.toString();
	}

	/**
	 * Normaliza o valor antes da validação. A base devolve-o intacto; sobrescreva
	 * quando a classe tiver uma forma canônica (ex.: `slugify`).
	 *
	 * @param value - O valor cru recebido pelo construtor.
	 * @returns O valor normalizado, que será validado e armazenado.
	 */
	protected transform(value: ValueType): ValueType {
		return value;
	}

	/**
	 * Roda o schema contra o valor e lança se não casar.
	 *
	 * @throws `InvalidPropertyException` — carregando `name` e `source` do
	 *   contexto, para o chamador localizar qual campo de qual entidade falhou.
	 */
	protected validate(): void {
		if (!this[Meta].model.match(this.value))
			throw new InvalidPropertyException(
				this[Context].name,
				this[Context].source,
			);
	}
}
