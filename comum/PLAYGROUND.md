# PLAYGROUND — "Testar ao vivo" (sandbox de prompt na Central)

> O cliente edita o cérebro e conversa com ele **ali mesmo**, antes de qualquer coisa ir pro ar. As tools rodam em **dry-run**: a IA decide chamá-las, mas ninguém encosta no CRM.
> **Vale pros dois CRMs.** O componente é o mesmo; muda só o conjunto de tools simuladas e onde a página é servida.

---

## 1 · O que é (explique assim pro cliente/aluno)

**"Testar ao vivo" = sandbox de prompt.** Um chat de teste **dentro da Central `/cerebro`** onde o cliente manda mensagem como se fosse o lead e a IA responde ali mesmo, usando **o prompt CANDIDATO** — o texto que ele está editando naquele instante — e não o prompt vigente em produção.

As tools rodam em **DRY-RUN**: a IA decide chamar `mover_etapa_funil`, mas em vez de tocar o CRM a UI mostra

```
🔧 mover_etapa_funil(etapa: Qualificado) · simulado
```

Ou seja: o cliente **vê o que a IA faria por trás**, não só o que ela fala.

| | Sandbox ("Testar ao vivo") | Evals (`comum/EVALS.md`) |
|---|---|---|
| Natureza | **feel manual** — como soa, como conversa | **exame automático** — nota objetiva, comparável |
| Prompt testado | o **candidato** (o do editor, sem salvar) | o **de produção** (baixado de `/api/config`) |
| Quem roda | o cliente, à vontade, quantas vezes quiser | você/CI, antes de todo deploy de prompt |
| Portão | nenhum (é laboratório) | nota < 7 → `exit 1` → não sobe |

**Decisão registrada: o playground COMPLEMENTA os evals, não substitui.** Exame automático **+** feel manual — as duas coisas juntas. Quem só tem sandbox acha que melhorou; quem só tem eval não sente o tom.

---

## 2 · Estado por CRM (o que está no ar hoje)

| | **GHL** | **KOMMO** |
|---|---|---|
| Onde a página vive | Central Next.js separada — `area-cliente/app/cerebro/page.tsx` | **Self-contained, servida pelo PRÓPRIO agente** — `api/cerebro.ts` (HTML puro), **sem app Next.js separado** |
| Como abrir | Central do cliente → `/cerebro` (proxy Next carrega o `?secret=` server-side) | `/api/cerebro?secret=WEBHOOK_SECRET` — o secret fica só na URL |
| Cérebro de simulação | `lib/claude.ts` → `simulateChat` (aditivo no arquivo existente) | `lib/playground.ts` (arquivo NOVO — **não toca `claude.ts`**) |
| Editar prompt candidato | ✅ | ✅ |
| Testar no chat (dry-run) | ✅ | ✅ |
| Publicar ao vivo (sem deploy) | ✅ `prompt-store.ts` | ❌ ainda não (ver §9) |
| 10 evals como porteiro do Publicar | ✅ `lib/evals.ts` server-side | ❌ ainda não (ver §9) |
| Histórico 20 versões + rollback + voltar-ao-de-fábrica | ✅ | ❌ ainda não |
| No ar desde | Metrik, **19/07/2026** | Metrik (dogfood Kommo), **19/07/2026** |

**Referências de implementação:**
- GHL: `clientes/metriksales/agente-ia/` + `clientes/metriksales/area-cliente/app/cerebro/page.tsx`
- Kommo: `clientes/metriksales/agente-ia-kommo/` (deploy `agente-ia-kommo-metriksales.vercel.app`)

> **📌 Decisão de arquitetura (Kommo, 19/07):** servir o painel do próprio agente elimina um projeto Vercel, um deploy e um conjunto de envs por cliente. O preço é HTML na mão (sem componentes React) e auth por query string. Pra cliente que já tem Central completa (GHL), a página fica na Central; pra cliente que só quer o laboratório, o self-contained ganha.

---

## 3 · Onde vive o cérebro editável (o mapa dos arquivos)

O playground é **uma peça** do cérebro editável. O conjunto completo (padrão GHL):

| Arquivo | Papel |
|---|---|
| `lib/prompt-store.ts` | override publicado (Redis, lido ANTES do `prompt.md` do bundle) + histórico de versões |
| `lib/evals.ts` | o **exame server-side** — roda os 10 cenários no candidato; é o **porteiro** do botão Publicar |
| `api/prompt.ts` | as ações: **GET** (prompt atual/de fábrica) · **testar** · **chat** (o playground) · **publicar** · **restaurar** · **rollback** |
| Central `/cerebro` | a página: editor + evals + sandbox |
| `lib/playground.ts` *(Kommo)* | `simulateChat` isolado do caminho de conversa |
| `api/cerebro.ts` *(Kommo)* | a página HTML self-contained |

**A trava que faz isso ser seguro:** `POST /api/prompt {acao:'publicar'}` roda os 10 evals no candidato e **só publica se passar** — o botão nem destrava sem aprovação. Validado: prompt sabotado (inventava preço, pedia nome antes, vendia pra quem pedia suporte) foi **bloqueado com 5.7/10, 4/10 aprovados**, produção intacta.

---

## 4 · GHL — as 3 mudanças (todas ADITIVAS)

### 4.1 · `lib/claude.ts` — o cérebro de simulação

Adicione `simulateChat(promptTexto, turns)`, **espelho de `generateReply`** com exatamente **duas trocas**:

| Troca | No runtime real | No sandbox |
|---|---|---|
| **system** | `buildSystem(contact)` — prompt vigente + contato real | **`buildSystemFromText(promptTexto)`** — o prompt **CANDIDATO** (texto do editor). Mesmo bloco dinâmico (data/hora, lead stub) |
| **tools** | `runTool(...)` — toca o CRM | **`simulateTool(name, input)`** — devolve resultado plausível com sufixo `(SIMULADO)` e **REGISTRA** a chamada. Zero efeito no CRM |

Todo o resto é idêntico: `MAX_STEPS`, retry de `max_tokens`, fallback final sem tools.

**Bloco de contexto (o mesmo do harness de evals)** — o segundo bloco do system simula o runtime:

```
# Contexto
Data: ${agora}
Lead: (desconhecido)
Tags: ia
```

Sem esse bloco o modelo perde a noção de data/hora e vira outro agente — o teste deixa de representar produção.

**Retorno:**
```ts
{ reply, toolCalls: [{ name, input, resultado }], voice }
```

**🩸 Cicatriz — `consultar_horarios_livres` precisa devolver slots FAKE.** O simulado tem que retornar **2 slots ISO fake**, senão `agendar_reuniao` não consegue fluir no teste e o cliente conclui que "a IA não agenda". O resultado simulado precisa ser *plausível o bastante pro próximo passo existir*.

### 4.2 · `api/prompt.ts` — a ação `chat`

Nova ação no switch (o proxy Next já repassa o body cru — **nada muda lá**):

```ts
case 'chat': {
  const texto = String(body.texto || '')
  if (texto.length < 50) return res.status(400).json({ error: 'prompt muito curto pra testar' })
  return res.status(200).json(await simulateChat(texto, body.mensagens || []))
}
```

- **Limiar:** `texto.length < 50` → **HTTP 400** `{ error: 'prompt muito curto pra testar' }` (evita queimar tokens com editor vazio / colagem quebrada).
- No tipo do `body`, acrescente `mensagens?: SimTurn[]` e **importe `simulateChat`**.

### 4.3 · Central `app/cerebro/page.tsx` — o chat

No **MODO EDIÇÃO**, um card **"Testar ao vivo — sandbox"**:

- lista de mensagens em **bolha user/assistant**
- **input + Enviar** · botão **Limpar**
- cada resposta mostra:
  - os **tool calls como chips ROXOS** no formato `nome(args) · simulado`
  - 🔊 **"responderia em áudio"** quando o modelo marca `[AUDIO]`
  - o texto — ou **"(só ações, sem texto)"** quando o turno foi puro tool

**Payload:** `POST /api/prompt` com `{ acao: 'chat', texto /* candidato */, mensagens }`.

> **Decisão: o teste é LIVE.** O payload usa `texto` = **o conteúdo atual do editor**. Por isso editar o prompt e testar no chat funciona **sem salvar nem publicar antes** — é o loop apertado que faz o cliente afinar sozinho.

---

## 5 · KOMMO — o port (3 arquivos + 1 entrada no `vercel.json`)

Port **aditivo — NÃO toca no caminho de conversa** (`claude.ts` e `api/inbound.ts` ficam intocados). É essa escolha que permitiu subir o playground em produção no mesmo dia sem risco de regressão no atendimento.

| Arquivo | O que faz |
|---|---|
| **`lib/playground.ts`** | `simulateChat(promptTexto, turns)`: espelha o loop de `generateReply` **trocando `runTool` por `simulateTool`** e usando o prompt candidato via `buildSystemFromText`. Retorna `{ reply, toolCalls[], voice }` |
| **`api/prompt.ts`** | **GET** devolve o **prompt de fábrica** (carrega no editor) · **POST** `{acao:'chat', texto, mensagens}` roda a simulação. Auth por `?secret=` |
| **`api/cerebro.ts`** | a página — **HTML self-contained**; lê o `secret` da URL pra falar com `/api/prompt` |
| **`vercel.json`** | registrar `api/prompt.ts` com **`maxDuration: 300`** + **`includeFiles: "prompt.md"`** (sem o includeFiles o GET não acha o prompt de fábrica no bundle) |

**Tools simuladas no Kommo:** `buscar_dados_lead` · `adicionar_tag` · `mover_etapa_funil` · `preencher_qualificacao` · `marcar_reuniao` · `escalar_para_humano`.

**✅ Validado E2E em produção 19/07/2026:** a IA respondeu **e** chamou `preencher_qualificacao("Origem do lead" = "Instagram")` + `mover_etapa_funil` — **tudo simulado, CRM intocado**.

> **Nota de adaptação do brain:** no GHL o `simulateChat` espelha `generateReply(contact, history)` e `runTool(contactId, ...)`; no Kommo espelha `generateReply(lead, history)` e `runTool(leadId, ...)`. O `simulateTool` cobre o conjunto de tools **daquele** CRM — é a única parte realmente específica de plataforma.

---

## 6 · Segurança e custo

| Item | Como fica |
|---|---|
| **Efeito no CRM** | **ZERO — tools simuladas.** É seguro deixar o cliente brincar à vontade (esse é o ponto do produto) |
| **Auth (GHL)** | herda o `?secret=` do proxy da Central — **o secret nunca chega ao browser** |
| **Auth (Kommo)** | `?secret=WEBHOOK_SECRET` na URL da página, repassado ao `/api/prompt` — o secret **fica na URL** (aceitável pra painel interno; não mande em canal público) |
| **Custo** | cada mensagem = algumas chamadas ao Claude (loop de tools). Sem tokens desperdiçados fora do teste |
| **Limite de entrada** | prompt < 50 chars é rejeitado antes de chamar o modelo |

---

## 7 · O fluxo completo que isso fecha

```
editar prompt  →  testar no chat (FEEL)  →  rodar os 10 evals (EXAME)  →  publicar (só destrava aprovado)  →  no ar
```

**O cliente afina sozinho, sem te acionar.** É o que transforma "mexer no prompt" de chamado de suporte em autonomia do cliente — e é o que sustenta preço na renovação.

---

## 8 · Registro obrigatório (senão some do radar)

- **`lib/manifest.ts`** → registre/atualize o **módulo do cérebro editável mencionando "Testar ao vivo"**. Sem isso a **Enciclopédia da Central não mostra** a peça e o cliente nunca descobre que ela existe. 🚩 **Componente que não está no manifesto não existe pro cliente.**
- **Bump do `SISTEMA_VERSAO`** no mesmo arquivo — é assim que você bate o olho e sabe qual cliente está atrás.
- **Nada entra como `ativo` sem `prova`** (data + evidência real). Manifesto que mente é pior que não ter.

### Propagação — a 4ª perna (`SKILL.md §7`)

"Testar ao vivo" é um **componente COMPARTILHADO do motor**: ele só chega na conta de um cliente quando você **redeploya o agente dele** (e a Central, se ela mudou).

```
1. Copia SÓ os arquivos compartilhados que mudaram (NUNCA prompt.md / crm-map / .env)
2. npm i (se package.json mudou) → npm run typecheck
3. Mexeu em prompt/tools? node scripts/evals.mjs   (10/10 ou não sobe)
4. vercel --prod   (agente e, se a Central mudou, area-cliente)
5. Verifica no ar: POST /api/prompt {acao:'chat'} e confirma { ok }
```

> **📌 Este foi o PRIMEIRO CASO da 4ª perna:** o playground "Testar ao vivo" entrou no ar **na Metrik em 19/07/2026** e ficou **pendente propagar aos demais clientes**. Componente que só vive no template é igual conhecimento que só vive no `.md`: **não chegou em quem usa.**

---

## 9 · O que falta (roadmap do componente)

### 9.1 · Completar a Central no Kommo
Hoje no Kommo é **SÓ o playground (testar)**. Editar + publicar ao vivo (sem deploy) + os 10 evals — a **Central completa** — é o próximo passo:

- portar **`lib/prompt-store.ts`** (override + histórico)
- portar **`lib/evals.ts`** (exame server-side)
- portar as ações **publicar / restaurar / rollback** do `api/prompt.ts` do **template GHL**
- portar a página (ou expandir o `api/cerebro.ts` self-contained)

O padrão do componente e o dry-run estão **neste arquivo**; a propagação pros demais clientes segue a **4ª perna** (`SKILL.md §7`).

### 9.2 · Conversa longa por voz
O sandbox mostra 🔊 "responderia em áudio", mas o marcador é só sinalização. Refinamento futuro (comum aos dois CRMs): gravar o **texto da fala** no Redis/CRM e reinjetar — hoje a nota de voz vira **marcador**, não conteúdo (`comum/PEGADINHAS.md` §1).

---

## 10 · 🩸 O que o sandbox NÃO prova (leia antes de prometer)

O playground prova **decisão** (o que a IA fala e quais tools ela chamaria). Ele **não prova ENTREGA**. Essa distinção já custou caro:

### 10.1 · Voz: só prometa depois de testar a entrega REAL
No **Bloco 3 do diagnóstico**, a pergunta **3.4 — "Você quer que a IA responda em áudio?"** tem resposta condicionada: **só PROMETA depois de testar a entrega real** (`comum/PEGADINHAS.md` §1) — e voz **exige uazapi**.

> **A lição mais cara do produto:** a validação antiga logava **`voz: true`** (a *decisão do modelo*) e **ninguém tinha confirmado entrega no celular**. **Achávamos que funcionava há dias.** O provedor de WhatsApp do GHL **descarta áudio outbound** — status `delivered`, só o texto chega. **SEMPRE teste voz em número real antes de vender.**

Ou seja: o chip 🔊 do sandbox é **exatamente o mesmo tipo de sinal** que nos enganou. Ele diz que o modelo *quis* mandar áudio — não que o áudio *chegou*. Prova de voz = número real, celular na mão.

### 10.2 · STT: teste com Node, não com curl
Testar STT com **`curl -F` no Git Bash do Windows falha com exit 26** — **não é bug do provedor, é do ambiente**. O caminho real (Node fetch + FormData + Blob → Groq) funciona. E **injetar inbound com attachment via API NÃO testa STT** (o GHL apaga o anexo do inbound injetado): **teste de áudio real só com WhatsApp de verdade.** (Groq engole ogg/opus direto.)

Bônus de ambiente: **curl no Git Bash Windows corrompe UTF-8** — body JSON com acento → `invalid_unicode`. Use Python/Node pra qualquer chamada com texto em português (inclusive testando o `/api/prompt`).

### 10.3 · Simular `tool_result` é o que faz o teste valer
Tanto no sandbox quanto no harness de evals: **simular o `tool_result` é o que permite ver o que o lead REALMENTE receberia depois da tool rodar.** Sem devolver um resultado e pegar o texto final, você lê a intenção do modelo e não a mensagem que sai — que é justamente onde a venda é ganha ou perdida.

### 10.4 · Lei permanente
**Prova antes de promessa.** Sandbox é laboratório; evals são exame; **E2E em número real é a prova**. As três, nessa ordem, antes de rampar por tag.

---

## 11 · Checklist de implantação (marque tudo)

- [ ] `simulateChat` criado (`lib/claude.ts` no GHL · `lib/playground.ts` no Kommo) espelhando o loop real
- [ ] `buildSystemFromText` usando o **candidato** + bloco `# Contexto` (data/hora, lead stub, tags)
- [ ] `simulateTool` cobrindo **todas** as tools daquele CRM, com sufixo `(SIMULADO)` e registro da chamada
- [ ] `consultar_horarios_livres` simulado devolvendo **2 slots ISO fake**
- [ ] `api/prompt.ts` com `case 'chat'` + guarda de **50 chars** + `mensagens?: SimTurn[]` no body
- [ ] *(Kommo)* `vercel.json` com `maxDuration: 300` + `includeFiles: "prompt.md"` pro `api/prompt.ts`
- [ ] UI: card "Testar ao vivo — sandbox" no modo edição, bolhas user/assistant, **chips roxos** `nome(args) · simulado`, 🔊 áudio, "(só ações, sem texto)", botão Limpar
- [ ] Payload usando `texto` do editor (**live**, sem salvar)
- [ ] `lib/manifest.ts` atualizado (módulo + `SISTEMA_VERSAO` + `prova` com data)
- [ ] Redeploy do agente (+ Central) do cliente e **verificação no ar** (`POST /api/prompt {acao:'chat'}` → `{ ok }`)
- [ ] Anotado quem ainda **não** recebeu o componente (4ª perna)
