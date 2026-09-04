# INSTALAR a ESCOLA em outro cliente

Guia de instalação da aba **"Ensinar a IA"** (Fase 0 — A CAIXA) num cliente que
já tem o agente serverless de pé. Mapa do asset e tabela de placeholders:
[README.md](README.md).

**Tempo real no GHL:** ~1 tarde (copiar 9 arquivos + 7 patches + deploy + teste).
**No Kommo:** some ~1 dia de port ANTES (§0).

---

## 0. ⚠️ ANTES DE QUALQUER COISA — GHL × KOMMO

**No GHL o agente já tem tudo.** Pode seguir direto pro §1.

**No KOMMO falta a base e a Escola não faz sentido ainda.** O que falta:

- `lib/prompt-store.ts` — o cérebro versionado no Redis (vigente + histórico + rollback)
- `api/prompt.ts` + os **evals server-side** — o porteiro que impede publicar prompt pior
- por consequência, o `acao: 'chat'` que o Playground usa pra rodar o prompt vigente

Sem isso: o laboratório não tem prompt pra rodar, o "errou aqui" não tem de onde
sair, e a fila de correções não tem por onde virar delta publicado. **≈1 dia de
port. Faça primeiro.** Instalar a Escola antes entrega uma aba que captura
correção que ninguém consegue aplicar — pior que não ter a aba.

---

## 1. PRÉ-REQUISITOS (confira um por um)

No projeto do **agente** (`<cliente>/agente-ia/`):

- [ ] `lib/config.ts` com `CONFIG.upstashUrl` / `CONFIG.upstashToken` **funcionando** (a Escola grava tudo no Redis)
- [ ] `lib/config.ts` com `CONFIG.webhookSecret`
- [ ] `lib/prompt-store.ts` — cérebro versionado (vigente/histórico)
- [ ] `api/prompt.ts` com `acao: 'chat'` (o laboratório) e `acao: 'publicar'` (com evals na frente)
- [ ] `lib/evals.ts` rodando server-side como porteiro da publicação
- [ ] `lib/execlog.ts` — o diário de execuções (é ele que vira "conversas reais")
- [ ] `lib/manifest.ts` — o inventário de módulos da Central
- [ ] `api/inbound.ts` com pelo menos um `logExec({ resultado: 'respondeu' })`

Na **Central** (`<cliente>/area-cliente/`):

- [ ] Next.js **App Router**, com `app/api/prompt/route.ts` já fazendo proxy pro agente
- [ ] `AGENT_URL` e `AGENT_SECRET` como env da Central (o browser nunca vê o secret)
- [ ] `app/cerebro/page.tsx` existente (é ele que ganha o 3º modo)
- [ ] `framer-motion` e `lucide-react` instalados
- [ ] as classes do design system usadas pelos componentes: `tech-card`, `text-body-light`,
      `text-body-muted`, `text-body-faint`, `font-mono`, `font-impact`, `text-cyan`,
      `text-warning`, `text-success`, `text-danger`, `scroll-thin`

> 🚨 **LEIA ISTO ANTES DE COMEÇAR — esta pasta NÃO instala a Escola do zero.**
>
> Ela instala a Escola **em cima de um agente que já existe e já roda**. Nenhum
> dos pré-requisitos acima está aqui dentro: `prompt-store.ts`, `evals.ts`,
> `execlog.ts`, `manifest.ts`, o `api/prompt.ts` base e a Central inteira
> (layout, `globals.css`, `tailwind.config.ts`, Sidebar) **não são assets desta
> skill** — eles nascem do playbook, não deste diretório.
>
> **A ordem certa é:**
>
> | # | O quê | Onde |
> |---|---|---|
> | 1 | Agente no ar, atendendo lead de verdade | `ghl/PLAYBOOK.md` (11 etapas) ou `kommo/PLAYBOOK.md` (7 passos) |
> | 2 | Central no ar, com `/cerebro` e o laboratório | `comum/PLAYGROUND.md` |
> | 3 | Cérebro editável com o eval como porteiro | `comum/EVALS.md` |
> | 4 | **← só então, esta pasta** | você está aqui |
>
> Tentar a Escola antes do degrau 3 é montar a sala de aula antes da escola.
> E o caminho real de partida de um cliente novo é **copiar o projeto base**
> (`ghl/PLAYBOOK.md` Etapa 1), não montar arquivo por arquivo.

**Sobre as classes de design:** `tech-card` vem do `globals.css`; `text-body-*`,
`font-impact` e `font-mono` vêm do `theme.extend` do `tailwind.config.ts`.
⚠️ `scroll-thin` é usada nos `.tsx` mas **não está definida em lugar nenhum** do
dogfood — é uma classe fantasma herdada. Ou você a define no `globals.css`, ou
remove das cópias; não perca tempo procurando de onde ela vem.

Falta alguma? Resolva antes. Nenhum dos patches abaixo cria essas peças.

---

## 2. COPIAR OS ARQUIVOS (nesta ordem)

`escola-core.ts` **antes** de tudo. Ele é a folha da árvore de imports — se
`execlog.ts` importar `anonimizar` de `escola.ts` em vez de `escola-core.ts`,
você cria o ciclo `execlog → escola → config → … → execlog`.

| # | De (asset) | Para (cliente) |
|---|-----------|----------------|
| 1 | `agente/lib/escola-core.ts` | `<cliente>/agente-ia/lib/escola-core.ts` |
| 2 | `agente/lib/roteador.ts` | `<cliente>/agente-ia/lib/roteador.ts` |
| 3 | `agente/lib/perfil.ts` | `<cliente>/agente-ia/lib/perfil.ts` |
| 4 | `agente/lib/escola.ts` | `<cliente>/agente-ia/lib/escola.ts` |
| 5 | `agente/api/escola.ts` | `<cliente>/agente-ia/api/escola.ts` |
| 6 | `agente/scripts/test-escola.ts` | `<cliente>/agente-ia/scripts/test-escola.ts` |
| 7 | `central/components/Playground.tsx` | `<cliente>/area-cliente/components/Playground.tsx` |
| 8 | `central/components/Escola.tsx` | `<cliente>/area-cliente/components/Escola.tsx` |
| 9 | `central/app/api/escola/route.ts` | `<cliente>/area-cliente/app/api/escola/route.ts` |

Depois de copiar: **troque os placeholders** (`{NOME_AGENCIA}`, `{NOME_AGENTE}`)
e **re-derive os 12 `BLOCOS`** do `prompt.md` daquele cliente — tabela completa
no [README §4](README.md#4-placeholders--troque-antes-de-subir).

> **Kommo:** troque o prefixo `agente:` das chaves de `lib/escola.ts` (linhas
> 30-34) por `ak:`. Upstash free é 1 DB só e as chaves colidem com o agente GHL
> do mesmo cliente (comum/PEGADINHAS.md §18).

---

## 3. OS 7 PATCHES — inserção, **nunca** sobrescrita

Todos esses arquivos já existem no cliente e carregam a verdade dele. Copiar por
cima destrói configuração de produção.

### PATCH 1 · `<cliente>/agente-ia/lib/config.ts`

**UMA linha nova** dentro do objeto `CONFIG`, logo abaixo de `webhookSecret`.
Não é `required()`: ausente = só existe o secret de sempre, e o comportamento
fica **idêntico ao de hoje** (retrocompatível por construção).

> Nunca copie o `config.ts` do dogfood inteiro: ele carrega o location ID em
> comentário, os contact fields e os IDs de UTM/tracker — todos exclusivos
> daquela location.

```ts
  webhookSecret: required('WEBHOOK_SECRET'),
  // ⬇️ NOVO (Escola) — Secret da Central do CLIENTE (perfil 'dono', sem editor de prompt cru).
  // Ausente = so existe o secret de sempre, e ele e 'agencia'. Ver lib/perfil.ts.
  centralSecret: process.env.CENTRAL_SECRET || '',
```

### PATCH 2 · `<cliente>/agente-ia/lib/execlog.ts`

3 inserções. `KEY`, `MAX` e `getExecLog` ficam **intocados**.

(a) o import vem de **`./escola-core`**, nunca de `./escola` — senão vira ciclo.
(b) os dois campos são **opcionais** porque os ~500 registros já gravados no
Redis não os têm.
(c) o teto por turno e a anonimização acontecem **ANTES** do `lpush`.

```ts
// (a) topo do arquivo
import { anonimizar } from './escola-core'

// (b) dentro de `export interface ExecRecord`
  /**
   * Os turnos da conversa — alimentam a porta PREFERIDA da Escola ("escolher do
   * diario"): sem parser, sem risco de o cliente cortar o contexto.
   * 🩸 Gravados so a partir deste deploy — execucoes anteriores nao tem texto,
   * entao a lista de conversas nasce vazia e vai enchendo.
   */
  turnoLead?: string
  respostaIA?: string

// (c) teto por turno + anonimizacao ANTES de gravar
/** Teto por turno: o suficiente pra ensinar, sem inflar 500 registros no Redis. */
const MAX_TURNO = 1200

export async function logExec(rec: ExecRecord): Promise<void> {
  if (!redis) return
  try {
    const seguro: ExecRecord = {
      ...rec,
      turnoLead: rec.turnoLead ? anonimizar(rec.turnoLead).slice(0, MAX_TURNO) : undefined,
      respostaIA: rec.respostaIA ? anonimizar(rec.respostaIA).slice(0, MAX_TURNO) : undefined,
    }
    await redis.lpush(KEY, JSON.stringify(seguro))
    await redis.ltrim(KEY, 0, MAX - 1)
  } catch (e) {
    console.error('[execlog] falha ao gravar (ignorado):', e)
  }
}
```

### PATCH 3 · `<cliente>/agente-ia/api/inbound.ts`

**Duas linhas**, dentro de **UM único** `logExec`: o do caminho de SUCESSO
(`resultado: 'respondeu'`). Os outros três `logExec` do arquivo (tag humano,
MAX_ROUNDS, catch) ficam **sem turno de propósito** — não há resposta da IA pra
corrigir.

> O `inbound.ts` inteiro não é asset: ele carrega o `extractContactId`, o gate
> por tag e a orquestração do buffer daquele cliente.

```ts
      await logExec({
        ts: new Date().toISOString(), contactId, nome: nomeContato, resultado: 'respondeu',
        detalhe: sentAsVoice ? 'resposta por voz' : `${reply.parts.length} mensagem(ns) de texto`,
        duracaoMs: Date.now() - t0, tools: reply.toolsUsed, voz: sentAsVoice,
        // ⬇️ NOVO (Escola): os turnos alimentam a aba "Ensinar a IA" (porta preferida
        // da correcao: escolher uma conversa REAL em vez de colar). O execlog anonimiza.
        turnoLead: target.body || '',
        respostaIA: sentAsVoice ? reply.voiceText : reply.parts.join('\n'),
      })
```

### PATCH 4 · `<cliente>/agente-ia/api/prompt.ts`

4 inserções que trocam a autenticação binária (secret certo/errado) por **PERFIL**.

🩸 **A linha que mais importa é a que NÃO está lá:** `chat` fica **FORA** de
`ESCRITA`. Bloquear o chat junto com publicar/restaurar/rollback/testar — o
reflexo natural de quem escreve o guard — desliga o laboratório do cliente e a
Escola morre em silêncio, com a UI mostrando um campo que nunca responde.

```ts
// (1) import
import { RECADO_SEM_PERMISSAO, perfilDoSecret, podeEditarPromptCru } from '../lib/perfil'

// (2) substitui o antigo `if (secret !== CONFIG.webhookSecret) return 401`
const perfil = perfilDoSecret(req.query.secret)
if (!perfil) return res.status(401).json({ error: 'unauthorized' })
const admin = podeEditarPromptCru(perfil)

// (3) no GET — o 'dono' LE o cerebro (transparencia e produto), mas nao ve versoes
return res.status(200).json({
  perfil,
  texto: vigente.texto,
  origem: vigente.origem,
  /* … versao, fabricaChars … */
  historico: admin ? await getHistorico() : [],
})

// (4) a TRAVA DE IDENTIDADE — 'chat' fica de fora DE PROPOSITO
const ESCRITA = ['publicar', 'restaurar', 'rollback', 'testar']
if (ESCRITA.includes(String(body.acao)) && !admin) {
  return res.status(403).json({ error: 'forbidden', mensagem: RECADO_SEM_PERMISSAO })
}
```

### PATCH 5 · `<cliente>/agente-ia/lib/manifest.ts`

Um objeto novo no array `MODULOS`, no bloco **Inteligência** (depois de `auditor`).

Regra da casa: entra como **`construcao`**, nunca `ativo` — a prova em produção
ainda não existe. O `manifest.ts` inteiro não replica: `status`, `prova` e
`custo` de cada módulo são a verdade daquele cliente (SKILL.md §7.3 lista o
manifest como "do cliente, JAMAIS sobrescreva").

Troque `{AGENCIA}` pelo nome da agência e `DD/MM/AAAA` pela data real.

```ts
  {
    id: 'escola',
    nome: 'Ensinar a IA (Escola)',
    categoria: 'Inteligência',
    status: 'construcao',
    resumo: 'Você corrige a IA em português e a {AGENCIA} cuida do texto — sem você nunca encostar no prompt.',
    oQueFaz: [
      'Testou no laboratório e ela errou? Clique em "errou aqui" e diga o que ela deveria ter dito',
      'Escolha uma conversa REAL que ela teve e marque a mensagem que saiu torta',
      'Marque em 1 clique o que houve: ficou seca, faltou o preço, perguntou antes de responder…',
      'Pedido de preço/prazo/horário vira chamado — nunca texto fixo no cérebro',
      'Nada muda na hora: sua correção é lida junto com as outras do mesmo assunto',
    ],
    comoFunciona:
      'A correção só é aceita em PAR: a resposta que saiu (travada, vinda da conversa) mais o que ela deveria ter dito. ' +
      'Sem a segunda metade é reclamação, e reclamação não se conserta. Antes de qualquer inteligência entrar, um filtro de ' +
      'código varre o pedido atrás de dado que muda com o tempo (preço, prazo, vaga, horário): se achar, o assunto vira ' +
      'chamado e o cérebro nem é cogitado. Nesta fase NADA é escrito no cérebro automaticamente.',
    quandoRoda: 'Quando você corrige — na aba "Ensinar a IA" da Central',
    onde: 'api/escola.ts + lib/escola.ts + lib/roteador.ts + lib/perfil.ts',
    prova: 'Fase 0 (captura) construída DD/MM/AAAA — sem prova em produção ainda',
    custo: 'R$0 — a captura e a triagem não chamam modelo nenhum',
  },
```

### PATCH 6 · `<cliente>/agente-ia/vercel.json`

Uma entrada nova no bloco `functions`. Repare no que **não** tem: sem
`includeFiles: "prompt.md"` (a Escola não lê o prompt) e `maxDuration` **60**,
não 300 (captura e triagem são síncronas e sem modelo).

O arquivo inteiro não replica porque o bloco `crons` é o horário acordado com
aquele cliente.

```json
    "api/prompt.ts": {
      "maxDuration": 300,
      "includeFiles": "prompt.md"
    },
    "api/escola.ts": {
      "maxDuration": 60
    }
```

### PATCH 7 · `<cliente>/area-cliente/app/cerebro/page.tsx`

> ⚠️ **LEGADO/BASELINE:** este patch existe para instalar a Escola numa Central
> antiga sem a camada v4.1. No golden path de cliente novo, aplique o motor,
> API e componentes da Escola, depois instale `assets/central-v4/` **por
> último**. O arquivo
> `assets/central-v4/central/app/cerebro/page.tsx` é a autoridade final e entrega
> os seis modos `inicio/ler/ensinar/mapa/laboratorio/editar`. Não reconverta essa
> página para três modos.

A página vira **TRÊS MODOS** (ler / ensinar / editar) em vez de dois.

Não é asset porque o `COR_SECAO` mapeia os títulos **literais** das seções do
`prompt.md` do dogfood, e a copy do hero carrega a marca.

🩸 **A cicatriz que este patch conserta:** o playground morava DENTRO do
`{modo === 'editar' && (…)}`. Esconder o editor do perfil `dono` esconderia o
laboratório junto — matando a feature que a trava existe pra proteger. Por isso
ele saiu pra `components/Playground.tsx`.

Repare também no **fail-closed** do perfil: nasce `'dono'` e só vira `'agencia'`
quando o GET responde. O primeiro paint não pode piscar a aba de editar pra quem
não pode nem vê-la.

```tsx
// (1) imports
import Playground from '@/components/Playground'
import {
  BarraEscola, CardCorrecao, ColarConversa, ConversasReais, FilaEnsinada,
  type EscolaData, type Par,
} from '@/components/Escola'

// (2) estado — perfil FAIL-CLOSED (nasce 'dono' ate o GET responder: o primeiro paint
//     nao pode piscar a aba de editar pra quem nao pode ver)
type Modo = 'ler' | 'ensinar' | 'editar'
const [perfil, setPerfil] = useState<'dono' | 'agencia'>('dono')
const [modo, setModo] = useState<Modo>('ler')
const [escola, setEscola] = useState<EscolaData | null>(null)
const [par, setPar] = useState<Par | null>(null)

const carregarEscola = () =>
  fetch('/api/escola').then(r => r.json()).then(d => { if (!d.error) setEscola(d) }).catch(() => {})
useEffect(() => { carregar(); carregarEscola() }, [])
const admin = perfil === 'agencia'

// (3) as abas — 'editar' NAO EXISTE na navegacao do dono
const TABS: { id: Modo; label: string; admin?: boolean }[] = [
  { id: 'ler',     label: '👁 O cérebro' },
  { id: 'ensinar', label: '🎓 Ensinar a IA' },
  { id: 'editar',  label: '✎ Editar texto', admin: true },
]
{TABS.filter(t => !t.admin || admin).map(/* … */)}

// (3b) o abridor do card — SEM ISTO O BUILD QUEBRA com TS2304 em (4).
//      O scroll nao e enfeite: sem ele o card abre fora da tela e o cliente
//      clica em "errou aqui" achando que nao aconteceu nada.
const [par, setPar] = useState<Par | null>(null)
const abrirCorrecao = (p: Par) => {
  setPar(p)
  if (typeof window !== 'undefined') {
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 80)
  }
}

// (3c) o estado da Escola + o carregador (usado por (4) e pelo onGravou)
const [escola, setEscola] = useState<EscolaData | null>(null)
const carregarEscola = () =>
  fetch('/api/escola').then(r => r.json()).then(d => { if (!d.error) setEscola(d) }).catch(() => {})
useEffect(() => { carregarEscola() }, [])

// (4) modo ENSINAR — laboratorio roda o prompt VIGENTE e mostra o botao de correcao
{modo === 'ensinar' && (
  <div className="space-y-4">
    <Playground
      prompt={original}
      titulo="Laboratório — converse com a sua IA"
      onErrouAqui={p => abrirCorrecao({ ...p, origem: 'playground' })}
    />
    <ConversasReais onEscolher={abrirCorrecao} />
    <ColarConversa onEscolher={abrirCorrecao} />
    <AnimatePresence>
      {par && escola && (
        <CardCorrecao par={par} chips={escola.chips}
          onFechar={() => setPar(null)} onGravou={() => carregarEscola()} />
      )}
    </AnimatePresence>
    {escola && <FilaEnsinada data={escola} />}
  </div>
)}

// (5) modo EDITAR — MESMO componente, mas com o CANDIDATO e SEM onErrouAqui
//     (corrigir um prompt que talvez nunca suba gera evidencia orfa)
{modo === 'editar' && admin && (
  <Playground prompt={texto} subtitulo="Converse com a IA usando o prompt que você está editando acima." />
)}
```

**Os imports que os snippets acima exigem:**

```ts
import { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import Playground from '@/components/Playground'
import {
  BarraEscola, CardCorrecao, ColarConversa, ConversasReais, FilaEnsinada,
  type EscolaData, type Par,
} from '@/components/Escola'
```

**E duas coisas que NÃO estão nos snippets porque vivem no seu código existente:**

1. `setPerfil(d.perfil)` onde o GET de `/api/prompt` é lido — sem isso `admin` fica `false` pra sempre e **você** perde o editor. Inicie o estado como `'dono'` (fail-closed no primeiro paint, antes do GET responder).
2. `<BarraEscola saude={escola.saude} />` no topo do modo `ensinar`.

> ⚠️ **Por que este patch é o mais trabalhoso dos 7, e por que não existe arquivo pronto.** O `page.tsx` do dogfood tem 15.673 bytes de copy de marca e um `COR_SECAO` que mapeia os títulos **literais** do `prompt.md` daquele cliente. Copiar inteiro levaria a identidade de um cliente pro outro. Então aqui vai o **esqueleto do que muda**, e a montagem é sua. Se depois de aplicar o `tsc` reclamar de nome não encontrado, é quase sempre um dos itens acima.

---

## 4. ENV — `CENTRAL_SECRET` (opcional, e retrocompatível)

O perfil é derivado do secret. Não há login: a Central guarda o secret
server-side e o browser nunca o vê.

| Secret | Perfil | Onde vive |
|---|---|---|
| `WEBHOOK_SECRET` (o de sempre) | `agencia` — edita o prompt cru, vê histórico, resolve tickets | env do agente; `AGENT_SECRET` da **sua** Central |
| `CENTRAL_SECRET` (novo, opcional) | `dono` — só a aba "Ensinar a IA"; o editor cru **não existe** | env do agente; `AGENT_SECRET` da Central **do cliente** |

**Enquanto `CENTRAL_SECRET` não existir, nada muda**: só há o secret de sempre e
todo mundo é `agencia`. Ligue no dia em que o cliente ganhar acesso.

```bash
# no projeto do AGENTE
vercel env add CENTRAL_SECRET production      # gere algo longo e aleatório

# na CENTRAL DO CLIENTE (projeto separado)
vercel env add AGENT_SECRET production        # cole o MESMO valor do CENTRAL_SECRET
```

⚠️ Se você puser o `CENTRAL_SECRET` na Central da **agência** por engano, você
mesmo perde o editor de prompt. É a trava funcionando — troque a env e redeploy.

---

## 5. DEPLOY

```bash
cd <cliente>/agente-ia && vercel --prod
cd <cliente>/area-cliente && vercel --prod
```

Ordem importa pouco: se a Central subir primeiro, o `lerJson()` do proxy traduz
o HTML de 404 da Vercel num **503 honesto** ("A Escola ainda não está publicada
neste agente") em vez de estourar `Unexpected token` no browser.

---

## 6. O TESTE — critério de pronto

```bash
cd <cliente>/agente-ia
npx tsx scripts/test-escola.ts
```

Esperado: **`✅ 49 passaram · 0 falharam`**. (49 é o número da versão de hoje —
o que vale como critério é **`0 falharam`**.) Roda sem env, sem Redis, sem rede
e sem modelo: se falhar, é código, não ambiente.

⚠️ **Uma ressalva honesta sobre "sem rede":** o `tsx` não está em
`devDependencies` do agente, então o `npx` vai **baixá-lo** na primeira vez. Em
máquina offline ou com registry travado, o comando falha por download — e não
por código. Se isso for te atrapalhar, `npm i -D tsx` uma vez e rode
`npx --no-install tsx scripts/test-escola.ts`.

O que ele prova:

- **triagem** — dado volátil (preço/%/parcela/vaga/data de oferta) sempre vira chamado
- **os 3 falsos positivos medidos em produção** — "dar mais **valor** ao lead",
  "sem **prazo** pra fechar" e a correção **datada** ("outro dia, 15/07, ela…")
  continuam indo pro caderno. Datar a correção é o hábito mais natural do cliente;
  transformar isso em chamado inútil o faz parar de escrever o contexto
- **anonimização** — telefone (com/sem parênteses, com +55, fixo), e-mail, CPF
  (pontuado e cru), CEP saem; preço, "12x" e ano **ficam** (não são PII)
- **chips → bloco** — determinístico, e empate vai pra triagem humana em vez de chute

Se você mexeu na ordem dos `PADROES` de `escola-core.ts` e o teste quebrou:
**a ordem é parte da correção.** Celular com DDD tem 11 dígitos igual CPF; o
padrão de telefone tem que rodar antes do CPF cru.

### Checklist final (manual, 5 min na Central)

- [ ] aba **"Ensinar a IA"** aparece; a aba **"Editar texto"** só aparece pra `agencia`
- [ ] laboratório responde no modo `ensinar` (é o teste do patch 4: `chat` fora de `ESCRITA`)
- [ ] "errou aqui" abre o card com o par **travado** (lead + resposta, não editáveis)
- [ ] enviar sem preencher "o que ela deveria ter dito" → recado do produto, não erro técnico
- [ ] corrigir com "o valor agora é R$X" → vira **chamado** com o número, e mostra "não é bem isso"
- [ ] clicar em "não é bem isso" → volta pra fila de conhecimento
- [ ] correção normal de tom → confirmação **fria** ("nada muda agora, de propósito")
- [ ] "Escolher uma conversa de verdade" lista vazio no começo — **é esperado**: só entram
      execuções gravadas DEPOIS do patch 2+3. Vai enchendo sozinha.

---

## 7. O QUE ESTA FASE **NÃO** FAZ (e a promessa a fazer ao cliente)

- ❌ não escreve no prompt automaticamente
- ❌ não chama modelo nenhum (custo R$0)
- ❌ não muda o comportamento da IA na hora

Ela **captura** correção com contexto travado, **tria** dado volátil pra ticket
e **enfileira** por bloco. Quem lê a fila e escreve o delta é gente, pelo
`/api/prompt` de sempre — com os evals como porteiro.

Diga isso ao cliente com essas palavras. Cliente que vê a IA mudar na hora
aprende que o sistema é um textarea com passos a mais e volta a pedir ajuste de
tom toda tarde. Cliente que lê "vou juntar com as outras do mesmo assunto"
aprende que existe **processo**.
