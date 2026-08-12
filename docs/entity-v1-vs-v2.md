# `Entity` (v1) vs `BetterEntity` (v2)

> Estado em 2026-08-12, com P0–P3 concluídos. Compara as duas bases **como elas estão hoje**, não como estavam quando a migração começou — para o raciocínio que motivou cada mudança, ver `better-entity-review.md`.
>
> Contexto: `Mapper`, `ParseEntityToDTOService` e `EntityUpdater` foram removidos nesta rodada. A v1 perdeu com eles o único caminho de serialização que tinha.

---

## A mesma entidade, nas duas bases

**v1** — 30 linhas, e o `PostDTO` precisa ser mantido em sincronia com os VOs à mão:

```ts
const PostDTO = t.Object({
	id: UuidDTO,
	createdAt: DateTimeDTO,
	updatedAt: t.Optional(DateTimeDTO),
	title: StringDTO,
	slug: SlugDTO,
});

const PostSchema = Schema.make(PostDTO);
type PostInput = { title: string; slug: string };

class Post extends Entity<typeof PostDTO> {
	public readonly [EntitySchema] = PostSchema;

	private _title: DefinedStringVO;
	private _slug: SlugVO;

	public get title(): string {
		return this._title.value;
	}

	public get slug(): string {
		return this._slug.value;
	}

	public constructor(data: EntityDTO & PostInput) {
		super(data, "post");
		this._title = DefinedStringVO.make(data.title, this[EntityContext]("title"));
		this._slug = SlugVO.make(data.slug, this[EntityContext]("slug"));
	}
}
```

**v2** — 9 linhas, e o schema é *derivado* dos VOs:

```ts
const postProperties = {
	title: DefinedStringVO,
	slug: SlugVO,
};

// biome-ignore lint/correctness/noUnusedVariables: o merge com a classe abaixo é o uso.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends BetterEntity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}
}
```

Uso:

```ts
const post = new Post({ title: "Olá", slug: "Olá Mundo" });

post.title;                   // "Olá"
post.slug;                    // "ola-mundo" — o transform do VO rodou
post.id;                      // UUID v7 gerado
post.setMany({ title: "Oi", slug: "oi" }); // um único carimbo de updatedAt
post.toJSON();                // objeto puro
Post.fromJSON(row);           // hidratação validada, identidade preservada
Post.demo();                  // instância sem dados, cada VO no seu default
```

---

## Quadro comparativo

| | v1 `Entity` | v2 `BetterEntity` |
| --- | --- | --- |
| **Declaração de campo** | ~6 linhas (DTO + campo privado + linha no construtor + getter) | 1 linha no blueprint |
| **Overhead fixo** | ~20 linhas | ~9 linhas (blueprint + interface + `defineEntity`) |
| **Fonte de verdade do schema** | Duas — DTO e VOs, que divergem em silêncio | Uma — derivado dos VOs |
| **Leitura de campo** | `post.title` (getter escrito à mão) | `post.title` (accessor derivado do blueprint) |
| **Leitura de identidade** | `post.id` | `post.id` |
| **Serializar** | ~~`Mapper.toDTO`~~ — **não existe mais** | `toJSON()` |
| **Hidratar** | ~~`Mapper.toDomain`~~ — **não existe mais** | `Post.fromJSON(row)`, estático e estrito |
| **Atualizar campo** | ~~`EntityUpdater`~~ — **não existe mais** | `set` / `setMany`, atômico |
| **Carimbo de `updatedAt`** | decorator `@AutoUpdate` | automático em `set`/`setMany`, e só quando algo muda |
| **Compilação do schema** | uma por classe (`Schema.make` no módulo) | uma por blueprint, memoizada em `WeakMap` |
| **Chave extra em payload** | — | recusada (`additionalProperties: false` em todo nível) |
| **Entidade aninhada** | recursão no mapper | no blueprint; `get` devolve a instância, encadeia |
| **Array de entidades** | recursão no mapper | **não suportado** |
| **Campo simples (`views: number`)** | permitido | **precisa ser VO** |
| **Declarar um `ValueObject`** | classe + `schema` protegido + construtor + `static make` | classe + `defineMeta()` |
| **Estado transiente** | `[EntityStorage]` | `[Storage]` |
| **Fixture sem dados** | — | `Post.demo()` |
| **Exportado no pacote** | sim | **não ainda** |

---

## Onde a v2 ganha

**1. Uma fonte de verdade, não duas.** É o ganho estrutural. Na v1 o `PostDTO` e os VOs são declarados separadamente, e nada obriga que concordem — o spec do próprio repo tinha `title: t.String()` no DTO contra um `DefinedStringVO` (`minLength: 1`) no campo, ou seja duas noções de "válido" para o mesmo dado. Na v2 o schema é derivado das classes do blueprint, então a divergência é impossível por construção.

**2. Custo por campo.** De ~6 linhas para 1.

**3. Atualização atômica e barata.** O `EntityUpdater` serializava a entidade inteira, mutava, revalidava o agregado e reconstruía tudo via factory. O `setMany` valida as chaves, constrói só os VOs afetados e só então atribui — se um valor for recusado, a entidade fica intocada, e `updatedAt` é carimbado uma vez.

**4. Hidratação sem cerimônia.** `Post.fromJSON(row)` é estático, valida o payload inteiro contra o schema agregado antes de construir qualquer VO e recusa chave faltando **ou sobrando**. Na v1 era `Mapper.toDomain` com uma factory escrita pelo chamador.

**5. Um modo de falha a menos.** O `[EntityFactory]` da v1 precisava lembrar de mesclar `initialProperties`; quem esquecia perdia a identidade da entidade — havia um `OperationFailedException` dedicado a policiar isso. Na v2 esse contrato não existe.

**6. Schema por classe.** Memoizado por blueprint num `WeakMap`, então hidratar mil linhas compila o validador uma vez. E como é derivado do blueprint e não do contexto vivo, existe sem instância — que é o que torna o `fromJSON` estático possível.

---

## Onde a v2 ainda não cobre a v1

Três lacunas reais, sem rodeio:

**1. Array de entidades não é modelável.** O blueprint aceita uma classe de `ValueObject` ou uma classe de entidade — não uma *coleção* de entidades. `Post → Tag[]` não tem como ser expresso. O `ParseEntityToDTOService` da v1 recursava em array, então isso é uma capacidade que a v2 ainda não recuperou. Precisa de um wrapper (`many(Tag)`) no blueprint e do tratamento correspondente em `buildProperty`, `toJSON`, `schema` e `set`.

**2. Todo campo precisa ser um `ValueObject`.** Na v1 dava para ter `public views: number` cru. Na v2, não: o blueprint só aceita classes. Isso é uniformidade ganha e conveniência perdida — e hoje pesa mais do que deveria, porque o catálogo de VOs v2 tem só três entradas (`DefinedStringVO`, `DateTimeVO`, `UuidVO`); os demais esperam a remodelagem planejada da API de `ValueObject`.

**3. A v1 é a que está publicada.** A v2 não está em nenhum barrel nem no `package.json`. Quem consome o pacote hoje só alcança a v1 — que, sem o `Mapper`, virou uma base só de validação.

Duas assimetrias menores, que são escolha de design e não falta:

- O accessor é **somente leitura**; mutar passa obrigatoriamente por `set`/`setMany`, para o carimbo de `updatedAt` não ficar implícito.
- Uma exceção levantada dentro de uma entidade aninhada carrega o `source` **dela**, não o caminho a partir do pai (`("name", "author")`, não `("author", "post")`). Mais preciso, mas perde o rastro externo.

---

## Notas de migração

| v1 | v2 |
| --- | --- |
| `Mapper.toDTO(post)` | `post.toJSON()` |
| `Mapper.toDomain(dto, factory)` | `Post.fromJSON(dto)` |
| `new EntityUpdater(post).run("title", v)` | `post.set("title", v)` |
| `[EntityFactory]` | — (não tem equivalente; `fromJSON` cobre o caso) |
| `@AutoUpdate` | — (o carimbo é automático) |
| `this[EntityStorage]` | `this[Storage]` |
| `PostDTO` + `Schema.make(PostDTO)` | `post.schema`, derivado do blueprint |
| `post.title` (getter à mão) | `post.title` (accessor derivado) |

**Armadilhas ao portar**, todas documentadas no `CLAUDE.md`. As quatro primeiras falham alto e nomeiam a causa:

- `defineEntity` precisa ser **método de protótipo**, nunca class field — a base o chama dentro do construtor, antes de qualquer initializer de campo rodar. Guardado: `OperationFailedException` explicando a ordem, em vez de `TypeError`.
- Uma subclasse que declara **construtor próprio** precisa aceitar o payload da base — basta uma das sobrecargas — e repassar ao `super` o argumento que não reconhecer, porque `demo()` manda um sentinela por esse mesmo canal. O `Tag` do spec é a referência.
- O `meta.default` de cada VO **precisa passar no próprio `meta.model`** — o default é validado como qualquer outro valor, então um default inválido faz `demo()` lançar. Não afeta a derivação do schema, que lê o modelo direto do `defineMeta` da classe sem construir VO nenhum.
- Uma chave de blueprint **não pode colidir** com membro existente (`schema`, `toJSON`, `get`, `set`, `id`, …), porque vira accessor no protótipo. Guardado, e a instalação é atômica.
- **Ciclo no blueprint** (`A → B → A`) é detectado nas duas recursões — derivação de schema e construção — e vira `OperationFailedException` nomeando a entidade, não `RangeError`. Duas propriedades da mesma classe num blueprint continuam válidas: são irmãs, não ciclo.

Sobra **uma** que ainda falha em silêncio: esquecer a linha `interface X extends AccessorsOf<…> {}`. Os accessors são instalados em runtime de qualquer jeito; a linha é só como o TS fica sabendo. Sem ela, `x.campo` existe mas não compila. Não tem conserto em runtime — é assimetria de tipo, não de execução.

**Class field na subclasse deixou de ser armadilha.** `fromJSON` e `demo` constroem via `Reflect.construct`, então o construtor da subclasse roda e os field initializers junto — os três caminhos produzem a mesma forma. O preço é que efeitos colaterais do construtor também rodam na hidratação.

---

## Próximo passo natural

A v2 cobre hoje tudo que a v1 cobria, menos array de entidades e campo não-VO. O caminho para a substituição completa:

1. Remodelar a API de `ValueObject` (planejado) e migrar o catálogo — destrava a lacuna nº 2.
2. Suporte a coleção de entidades no blueprint — fecha a lacuna nº 1.
3. Exportar nos barrels e renomear `BetterEntity` → `Entity`, removendo a v1.
