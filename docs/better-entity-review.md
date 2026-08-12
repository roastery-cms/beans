# `BetterEntity` vs `Entity` — comparação e plano de melhoria

> Revisão feita em 2026-08-12 sobre a branch `dev`, com a suíte `src/entity/better-entity.spec.ts` verde (35 pass).
>
> **Atualização (2026-08-12, mesma data):** o P0 inteiro, a memoização por classe, o `fromJSON` estático, os agregados e o `defineEntity` já foram implementados — ver a checklist abaixo. A comparação que segue descreve o estado **anterior** à implementação; ela fica registrada porque é o raciocínio que justificou as mudanças. As linhas de arquivo citadas são do código antigo.
> Arquivos analisados: `src/entity/entity.ts`, `src/entity/better-entity.ts`, `src/entity/entity-updater.ts`,
> `src/mapper/mapper.ts`, `src/value-object/value-object.ts`, `src/value-object/new.ts`,
> `src/collections/value-objects/new.ts`.

---

## Veredito

**A `BetterEntity` é melhor no eixo DX** — e por uma margem grande no caso comum (entidade de campos escalares, cada um coberto por um `ValueObject`).

**Mas ela ainda não é um substituto funcional da `Entity`.** Perde composição (entidades aninhadas), acesso tipado por propriedade e estado transiente. Hoje o resumo honesto é: *melhor para 80% das entidades, impossível para os outros 20%*.

---

## Comparação lado a lado

| Aspecto | `Entity` (base atual) | `BetterEntity` (v2) |
| --- | --- | --- |
| Declaração de campo | ~6 linhas (DTO + campo privado + linha no construtor + getter) | 1 linha no blueprint |
| Overhead fixo por entidade | ~20 linhas (DTO, `Schema.make`, type `Input`, `[EntitySchema]`, `super`, `static build`, `[EntityFactory]`) | ~8 linhas (blueprint + duas overloads) |
| Fonte de verdade do schema | **Duas** — o DTO e os VOs, que podem divergir em silêncio | **Uma** — schema derivado dos VOs |
| Leitura de campo | `post.title` (getter tipado) | `bean.get("name")` (string mágica) |
| Atualização | `EntityUpdater` + `Mapper` + `[EntityFactory]` + `@AutoUpdate` | `entity.set(key, value)` embutido |
| Custo de um update | Serializa a entidade inteira → muta → valida agregado → reconstrói tudo | Reconstrói **um** `ValueObject` |
| Serialização | `Mapper.toDTO` / `Mapper.toDomain` + factory do chamador | `toJSON()` / `fromJSON()` embutidos |
| Entidades aninhadas / arrays | Suportado (`ParseEntityToDTOService` recursa) | **Não suportado** |
| Campos não-VO (`views: number`) | Permitido | Proibido — tudo precisa ser VO |
| Estado transiente | `[EntityStorage]` por instância | **Proibido** (o `Object.create` do `fromJSON` apaga) |
| Validação do schema | `Schema` compilado uma vez por classe | Compilado **por instância** |
| Modo demo / fixture | Não existe | `new X(true)` |
| Integração com o ecossistema | `Mapper`, `EntityUpdater`, `AutoUpdate`, barrels | Nenhuma — não exportada em lugar nenhum |

---

## Onde a `BetterEntity` ganha

### 1. Fim da duplicação de fonte de verdade — o ganho estrutural, não cosmético

Na base antiga, schema e VOs são declarados separadamente e divergem em silêncio. No próprio spec do repo (`src/entity/entity-updater.spec.ts:26`):

```ts
title: t.String(),                          // aceita ""
private readonly _title: DefinedStringVO;   // recusa "" (minLength: 1)
```

O `PostDTO` mente sobre o domínio. `Mapper.toDTO` valida contra o DTO frouxo, o VO valida contra o estrito — a mesma entidade passa a ter duas noções de "válido". Na `BetterEntity` o schema é **derivado** dos VOs (`src/entity/better-entity.ts:523`), então a divergência é impossível por construção.

### 2. Custo por campo despenca

De ~6 linhas por campo para 1. O overhead fixo cai de ~20 para ~8 linhas.

### 3. `set` / `get` / `toJSON` / `fromJSON` de graça

Somem `Mapper` + `EntityUpdater` + `[EntityFactory]` + o decorator `@AutoUpdate`. E o `EntityUpdater` é caro: serializa a entidade inteira, muta, valida o agregado e reconstrói tudo via factory (`src/entity/entity-updater.ts:140-171`).

### 4. Some o contrato mais fácil de errar da API antiga

O `[EntityFactory]` precisa lembrar de mesclar `initialProperties`; quem esquece perde a identidade da entidade. Existe um `OperationFailedException` dedicado a policiar isso (`src/entity/entity-updater.ts:165`) e uma classe de teste só para exercitar o erro. Na `BetterEntity` esse modo de falha não existe.

### 5. Modo demo

`new X(true)` dá fixture e schema sem dados. Não há equivalente na base antiga.

---

## Onde ela perde

### 1. Acesso a campo deixa de ser propriedade tipada

`post.title` vira `bean.get("name")`. É a maior regressão de DX **para quem consome** o domínio: sem destructuring, sem autocomplete natural, string mágica em todo call site.

### 2. Não suporta agregados

O blueprint só aceita classes de `ValueObject` (`AnyValueObjectClass`, `src/entity/better-entity.ts:55`). Não há como declarar uma propriedade que seja outra entidade, ou um array de entidades. Para um CMS com `Post → Author` / `Tag[]`, isso é bloqueante.

### 3. Todo campo precisa virar VO

`views: number` e `tags: string[]` eram campos simples; agora exigem `NumberVO` / `StringArrayVO` na base nova — e `src/collections/value-objects/new.ts` só tem 3 VOs migrados.

### 4. Zero estado fora do blueprint

O `Object.create` do `fromJSON` (`src/entity/better-entity.ts:641`) proíbe qualquer class field na subclasse, o que mata o equivalente do `[EntityStorage]` (cache, flags transientes) que a base antiga oferece de propósito.

### 5. `fromJSON` é método de instância

`new Bean(true).fromJSON(row)` obriga a construir uma instância descartável só para hidratar — e obriga todo VO a ter um `default` válido mesmo quando o modo demo nunca é usado. Somado ao `new X(true)` (boolean trap), é a parte mais desconfortável da API.

### 6. Boilerplate de construtor vazando internals

Toda subclasse repete três vezes o nome do blueprint e passa `properties` / `source` no `super()`.

### 7. Custo de validação por instância

`[Model]` / `[Validator]` são memos **de instância** (`src/entity/better-entity.ts:314-317`). Na antiga, `PostSchema` é compilado uma vez por classe. Hidratando 1000 linhas com `fromJSON`, roda-se `TypeCompiler.Compile` 1000 vezes.

### 8. Desperdício em toda construção

`meta.default` é avaliado sempre, mesmo com valor real presente: todo `UuidVO` chama `generateUUID()` e todo `DateTimeVO` chama `new Date().toISOString()` para jogar fora (`src/collections/value-objects/new.ts:135,167`). Três descartes por entidade hidratada.

### 9. `set` muda a instância no lugar

Retorno `void`, enquanto o `EntityUpdater` devolvia instância nova. Mudança de filosofia legítima, mas com aliasing: quem guardou a referência vê a mutação.

---

## Achados verificados

| # | Achado | Como foi verificado |
| --- | --- | --- |
| A | **Código de rascunho vivo no fim de `better-entity.ts`** (`:740-778`): `DefinedStringVO` duplicado, classe `User`, `new User(...)`, `user.set(...)` e `console.log` no topo do módulo — executa na importação. | O `console.log` apareceu na saída de `bun test src/entity/better-entity.spec.ts`. |
| B | **`fromJSON` não recusa chave extra**, ao contrário do que o `CLAUDE.md` afirma ("rejecting missing/extra keys"). `t.Object` do TypeBox permite `additionalProperties` por padrão. | Spec temporária: payload com chave `rogue` extra passou sem exceção. |
| C | `IEntity` declarado três vezes: `src/entity/types/entity.interface.ts`, `src/entity/better-entity.ts:204`, `src/entity/new.ts`. | Leitura direta; já anotado no `CLAUDE.md` como colisão **não** intencional. |

---

## Checklist de melhoria

### P0 — Bloqueadores ✅ concluído

- [x] **Remover o rascunho do fim de `better-entity.ts`**: `DefinedStringVO` duplicado, `userProperties`, `class User`, `const user`, `user.set(...)` e o `console.log`.
- [x] **Resolver o achado B — chaves extras no `fromJSON`.** Escolhida a opção (a): `t.Object(properties, { additionalProperties: false })` em **todos** os níveis, inclusive nos aninhados. Coberto por teste no nível raiz e no aninhado.
- [x] **Resolver a tripla declaração de `IEntity`.** `src/entity/new.ts` apagado (esboço morto); o do `better-entity.ts` virou `IBetterEntity`. `grep -rn "interface IEntity" src/` devolve uma ocorrência.

### P1 — Correções estruturais

- [x] **Memoizar o schema por classe, não por instância.** Os símbolos de instância `[Model]`/`[Validator]` sumiram; o schema passou a ser derivado do **blueprint** e memoizado num `WeakMap` de módulo, com chave na identidade do objeto de propriedades. Teste: `makeBean().schema` é o mesmo objeto entre instâncias distintas.
- [x] **Tornar `fromJSON` estático.** `X.fromJSON(row)`, sem instância descartável. Foi a mesma mudança do item anterior: com o schema derivado do blueprint, não é mais preciso ter uma entidade construída para validar.
- [x] **`meta.default` preguiçoso.** `IValueObjectMetadata["default"]` aceita `ValueType | (() => ValueType)` e a base só resolve o thunk quando `args.default === true`. `DateTimeVO` e `UuidVO` migraram; `DefinedStringVO` ficou com a constante. Coberto em `src/value-object/new.spec.ts` por um VO com contador — sem mock de módulo.
- [x] **Agregados.** O blueprint aceita classes de `ValueObject` **e** subclasses de `BetterEntity`. `get` devolve a instância aninhada, `set` recebe o payload cru, e `toJSON`/`fromJSON`/`schema` recursam. Semânticas documentadas no `CLAUDE.md`.

### P2 — DX

- [x] **Accessors tipados no lugar de `get("x")`.** Getters instalados no **protótipo** (não por instância, não via `Proxy`), derivados do blueprint e guardados num `WeakSet` — assim o caminho `Object.create` de `fromJSON`/`demo` os herda de graça, com custo zero por instância. A tipagem vem de um interface merge, `interface X extends AccessorsOf<typeof xProperties> {}`. `id`/`createdAt`/`updatedAt` viraram getters concretos na própria base. Com guarda de colisão de nome (atômica) e de herança.
- [x] **Eliminar o boilerplate de construção.** Resolvido por `defineEntity()`, método abstrato protegido que o construtor da base consome: a subclasse não precisa mais declarar construtor nenhum, e o nome do blueprint aparece uma vez só. Quem quiser um construtor próprio continua podendo declarar.
- [x] **Boolean trap eliminado.** `X.demo()` é estático, no mesmo padrão de `fromJSON`, e o construtor voltou a ter assinatura única. `new X(true)` não existe mais.
- [ ] ⏸️ **Migrar o catálogo de VOs para a base nova** — segue adiado, mas a *base* já foi remodelada: a subclasse agora declara só `defineMeta()`, sem construtor, sem `super`, sem payload aninhado (`withMeta`, `ValueObjectInput`, `ValueObjectConstructor`, `ValueObjectHas` e `ValueObjectConstructorArgs` foram apagados). Construção é `new XVO(value, { name, source })` e o modo demo é `XVO.demo({ name, source })`, no mesmo padrão da entidade. Falta migrar boolean/slug/string-array/url/uuid-array; hoje existem `DefinedStringVO`, `DateTimeVO` e `UuidVO`.
  - *Ganho colateral:* a `BetterEntity` lê o modelo de cada propriedade por `metaOf(Class)`, direto do protótipo, **sem construir VO**. Isso desfez o acoplamento introduzido na rodada 2, em que um `meta.default` inválido quebrava a derivação do schema inteiro. Agora ele só quebra o `demo()`, que é onde faz sentido.
- [x] **`get`/`set` em chave desconhecida lançam `InvalidPropertyException`.** A checagem é `Object.hasOwn` sobre o blueprint, mais as três chaves de identidade. `get("updatedAt")` em entidade não mutada continua devolvendo `undefined` — chave conhecida sem valor é outro caso. De quebra conserta um bug: `set("chaveInexistente", x)` vindo de JS puro morria com `TypeError: propertyClass is not a constructor`.
- [x] **`setMany` implementado**, e virou a primitiva: `set` delega a ele. Valida todas as chaves, constrói todos os valores e só então atribui — atômico —, com um único carimbo de `updatedAt`.

### P3 — Integração e paridade

- [x] **Estado transiente resolvido.** Símbolo `[Storage]` na `BetterEntity`, reusando a classe `EntityStorage` da base antiga. Protegido, exportado (para a subclasse conseguir nomeá-lo), inicializado nos três caminhos de construção e nascendo vazio em `fromJSON`/`demo`. Não vaza para `toJSON` nem para o `schema`.
- [x] **Interop dissolvida por descontinuação.** `Mapper`, `ParseEntityToDTOService` e `EntityUpdater` foram **removidos**, junto do símbolo `[EntityFactory]` e dos tipos `EntityFactory`/`EntityDTOOf`/`EntityUpdaterInput`. Consequência assumida: a `Entity` v1 ficou **só de validação**, sem caminho de serialização.
- [x] **`README.md` e `CHANGELOG.md` atualizados** — aviso no topo do README sobre a v1 ter perdido a serialização, seções de `Mapper`/`EntityUpdater` removidas, e entrada `[Unreleased]` com os dois breaking changes.
- [x] **Comparação final** em [`entity-v1-vs-v2.md`](entity-v1-vs-v2.md), com as lacunas que a v2 ainda tem.
- [x] ⏸️ **Benchmark comparativo** — sai de escopo: com o `EntityUpdater` removido, não existem mais os dois lados para medir.
- [ ] **Exportar nos barrels + subpath exports** (`src/entity/index.ts`, `package.json`) — o usuário optou por manter a v2 fora da API pública por enquanto.
- [ ] **Traduzir/decidir a língua da TSDoc** — a base antiga está em inglês, a nova em português. Escolher uma para o pacote publicado.

---

## Rodada de endurecimento (depois do P3)

Fechado o P3, sobraram sete armadilhas conhecidas — quatro que falhavam alto e nomeavam a causa, três que falhavam em silêncio. Esta rodada atacou as silenciosas:

- [x] **Class field na subclasse deixou de ser armadilha.** `fromJSON` e `demo` passaram de `Object.create` para **`Reflect.construct`**, então o construtor da subclasse roda e os field initializers junto — os três caminhos de construção produzem a mesma forma. Antes, `new X(...)` e `X.fromJSON(row)` divergiam em silêncio, e quem quebrava era o caminho de hidratação (produção), enquanto os testes tendiam a usar o construtor.
  - *Contrato novo:* subclasse com construtor próprio precisa aceitar o payload da base e repassar ao `super` o que não reconhecer — `demo()` manda um sentinela de módulo por esse canal. O `Tag` do spec é a prova.
  - *Preço:* efeitos colaterais do construtor da subclasse agora rodam na hidratação e no modo demo.
- [x] **Ciclo no blueprint agora é diagnóstico, não estouro de pilha.** Guardas nas duas recursões independentes (derivação de schema e construção), com `Set` de blueprints em progresso liberado no `finally` — o que mantém o caso irmão (duas propriedades da mesma classe) funcionando. Vira `OperationFailedException` nomeando a entidade em vez de `RangeError`.
- [x] **Accessors em subclasse de subclasse.** O `WeakSet` virou `WeakMap<protótipo, chaves instaladas>`: percorre a cadeia, instala só as chaves faltantes e roda a guarda de colisão apenas sobre elas. Uma subclasse que sobrescreva `defineEntity` com blueprint mais largo passa a ganhar accessors para as chaves novas.
- [ ] ⏸️ **Esquecer `interface X extends AccessorsOf<…> {}`** — segue silenciosa e **sem conserto em runtime**: os accessors são instalados de qualquer jeito, a linha é só como o TS fica sabendo. Só uma fábrica/mixin ou uma regra de lint resolveria.

**Correção de rumo registrada:** a defesa originalmente proposta para o class field — comparar `Object.getOwnPropertyNames(this)` dentro do construtor da base — **não funciona**. Dentro do construtor da base o retorno é `[]`, porque os class fields da subclasse só são inicializados depois do `super()` retornar. É a mesma ordem que cria a armadilha. O `Reflect.construct` surgiu de verificar isso.

---

## Ordem sugerida (restante)

P0 a P3 e o endurecimento estão fechados. O que resta são as duas lacunas de capacidade levantadas na comparação final, mais a promoção da v2 a API pública:

1. **Remodelar a API de `ValueObject`** (o usuário sinalizou que vem aí) e só então migrar o catálogo — é o que destrava "todo campo precisa ser VO".
2. **Coleção de entidades no blueprint** (`many(Tag)`) — a única capacidade da v1 que a v2 ainda não recuperou.
3. **Exportar nos barrels** e renomear `BetterEntity` → `Entity`, removendo a v1.

---

## Estado da suíte

```
bun test better-entity.spec.ts               → 83 pass, 0 fail
bun run test:unit                            → 287 pass, 0 fail
bunx tsc --noEmit                            → 0 erros
bunx biome check src/entity                  → limpo
bun run knip                                 → só os 5 órfãos pré-existentes em src/actions/
```

A contagem total caiu de 302 para 287 na remoção do P3: saíram ~30 testes junto com `Mapper`, `EntityUpdater` e `ParseEntityToDTOService`, e entraram os do `[Storage]` e os do endurecimento. O `tsc` chegou a zero quando os specs daqueles três — onde moravam os 5 erros pré-existentes — foram removidos.

Duas mudanças de escopo além do código, ambas registradas no `CLAUDE.md`:

- **`biome.json`** — `noUnsafeDeclarationMerging` desligado. O interface merge deixou de ser acidente e virou o padrão de declaração de entidade; a regra existe para pegar merge não intencional. `noUnusedVariables` continua ligada, então cada `interface X extends AccessorsOf<…>` carrega um `biome-ignore` de uma linha.
- **`src/value-object/new.spec.ts`** — arquivo novo. A base v2 de `ValueObject` não tinha nenhum teste direto; agora cobre construção, `transform`, exceção com nome/source, modo default e a preguiça do thunk.
