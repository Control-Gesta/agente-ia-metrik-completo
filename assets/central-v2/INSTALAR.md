# CENTRAL v2 — instalar num cliente

> O padrão da Central (`CENTRAL.md`) em código: a **régua de destino**, o
> **catálogo**, a **base de conhecimento**, as **mídias**, a tela unificada
> **Conteúdo** e os primitivos de UI com tema claro/escuro.
>
> **Pré-requisito:** o agente e a Central do cliente já no ar (`ghl/PLAYBOOK.md`
> → `comum/PLAYGROUND.md`). Isto **acrescenta** abas; não cria a Central do zero.

---

## 1 · BACKEND (o agente)

Copie para `<cliente>/agente-ia/`:

```
lib/catalogo-core.ts      lib/catalogo.ts          ← §4 a tabela viva
lib/conhecimento-core.ts  lib/conhecimento.ts      ← §5 RAG + a régua cérebro×RAG
lib/midias.ts                                      ← §7
lib/roteador.ts                                    ← §2 a régua dos 6 destinos
lib/escola-core.ts                                 ← tipos (DestinoTriagem etc.)
api/central.ts                                     ← o HUB
scripts/test-*.ts                                  ← 74 asserções
```

🚨 **`api/central.ts` é UM endpoint que serve catálogo + conhecimento + mídias +
diário**, roteado por `?recurso=`. **Não crie uma function por aba** — o Vercel
Hobby corta em **12 Serverless Functions** e a Central estoura o teto. Aba de
dados nova entra no hub.

**No `vercel.json`:**
```json
"api/central.ts": { "maxDuration": 60 }
```

**Se o cliente ainda tem `api/executions.ts`**, ele foi absorvido pelo hub
(`?recurso=execucoes`) — apague e aponte o proxy da Central (§2).

### O PATCH obrigatório — `lib/claude.ts`

Sem isto o catálogo e o conhecimento **não chegam na IA** e viram tabela
decorativa. Duas funções precisam do mesmo contexto:

```ts
import { catalogoDaIA } from './catalogo'
import { consultarConhecimento } from './conhecimento'
import { midiasDaIA } from './midias'

// dentro de buildSystem(contact, ultimaPergunta) E de buildSystemFromText(texto, ultimaPergunta):
const [catalogo, conhecimento, midias] = await Promise.all([
  catalogoDaIA().catch(() => ''),
  ultimaPergunta ? consultarConhecimento(ultimaPergunta).catch(() => '') : Promise.resolve(''),
  midiasDaIA().catch(() => ''),
])
const dynamic = [ /* …o contexto de sempre… */,
  catalogo && `\n# ${catalogo}`,
  conhecimento && `\n# ${conhecimento}`,
  midias && `\n# ${midias}`,
].filter(Boolean).join('\n')
```

🩸 **Duas leis aqui, e as duas custaram bug:**
1. **Vai no bloco DINÂMICO, nunca no estático cacheado.** Se for no estático,
   editar um preço invalida o cache de toda conversa — R$0,02 vira R$0,13 calado.
2. **`buildSystemFromText` (o playground) também precisa.** Se só o atendimento
   real receber, o "Testar a IA" **mente**: o dono testa sem catálogo e a IA se
   comporta diferente do que faz com o lead.

Cada carga tem `.catch(() => '')`: Redis fora do ar → a IA responde como antes,
nunca quebra.

---

## 2 · FRONTEND (a Central)

Copie para `<cliente>/area-cliente/`:

```
components/ui.tsx                 ← primitivos (Botao, Campo, Cabecalho, Vazio, Liga, Remover…)
components/PainelCatalogo.tsx
components/PainelConhecimento.tsx
components/PainelMidias.tsx
components/Playground.tsx         ← o laboratório com "errou aqui" inline
app/conteudo/page.tsx             ← a tela unificada (3 abas)
app/api/central/route.ts          ← proxy do hub (o secret nunca vai ao browser)
app/globals.css                   ← tokens de tema + .campo + .surface
```

**Sidebar** — **um** item, não três:
```ts
{ href: '/conteudo', label: 'Conteúdo', Icon: Library },
```

🩸 **Por que uma tela e não três:** catálogo, conhecimento e mídias respondem à
mesma pergunta do dono (*"o que a minha IA sabe?"*). Três entradas de menu fazem
ele caçar em qual mexer. Uma tela, três abas nomeadas pelo que ele entende:
**O que ela vende · O que ela responde · O que ela envia**.

**Se o cliente tinha `/api/exec` apontando pro `api/executions`:**
```ts
`${AGENT_URL}/api/central?recurso=execucoes&secret=${AGENT_SECRET}&limit=150`
```

---

## 3 · O TEMA (claro/escuro) — vem no `globals.css`

Tokens `--bg / --surface / --line / --text..--text-4`, com par claro e escuro.
**Nenhum componente escreve cor na mão.**

🩸 **A cicatriz do contraste:** no tema claro, superfície com alpha (`rgba(15,23,42,0.035)`)
sobre fundo branco fica **invisível** — o campo some e a tela parece quebrada. Por
isso o claro usa **cor sólida** (`#f2f4f8`) e a classe **`.campo`** (fundo branco +
borda visível) em todo input. Se criar campo novo, use `.campo` — não invente.

---

## 3.1 · 🩸 A TELA QUE PISCA (se a aba muda por perfil)

Tela cujo conteúdo depende do perfil (`dono` × `agencia`) **pisca**: nasce com o palpite
fail-closed, o GET responde outra coisa e o título/abas trocam depois de ~1s.

```tsx
const [pronto, setPronto] = useState(false)
// no carregador:  .finally(() => setPronto(true))
{!pronto ? <Esqueleto/> : <ConteudoReal/>}
```

Guarde **todos** os modos atrás de `pronto &&`, não só o cabeçalho. Confira lendo o HTML inicial:
se aparecer o título de qualquer perfil, ainda pisca — o certo é só o esqueleto.

---

## 4 · CONFERIR (não pule)

```bash
cd <cliente>/agente-ia
npx tsc --noEmit                        # limpo
npx tsx scripts/test-escola.ts          # 44 · a régua dos 6 destinos
npx tsx scripts/test-catalogo.ts        # 17 · parse de planilha
npx tsx scripts/test-conhecimento.ts    # 13 · régua cérebro×RAG e busca
cd ../area-cliente && npx tsc --noEmit  # limpo
```

**Na tela, depois do deploy:**
- [ ] `/conteudo` abre com as 3 abas e o menu tem **um** item "Conteúdo"
- [ ] troque o tema: **nenhum campo some**, nenhum texto fica ilegível
- [ ] adicione um produto no catálogo → pergunte o preço no laboratório →
      **ela cota o valor da tabela**. Se não cotar, o patch do §1 não foi aplicado.
- [ ] `SISTEMA_VERSAO` bumpado no `lib/manifest.ts`

---

## 5 · O QUE ISTO **NÃO** FAZ

| Não faz | O que fazer |
|---|---|
| upload de arquivo de mídia | hoje se cola a URL; storage é evolução |
| busca vetorial (embeddings) no RAG | é busca por palavra-chave com radical — suficiente até a base crescer (`CENTRAL.md` §5) |
| cérebro seccionado por função | o `prompt.md` segue em blocos `#`; o padrão está no `CENTRAL.md` §3 |
| criar a Central do zero | isto acrescenta abas a uma Central existente |
