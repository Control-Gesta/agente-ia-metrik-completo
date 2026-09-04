# AUTONOMIA — como o agente pede MENOS suporte (dossiê de evolução pela lente do operador)

> **O que é este documento.** O `FRONTEIRA.md` julgou o backlog por três lentes — negócio, engenharia, ineditismo. Falta a lente que o mestre nomeou em 03/08/2026: **"deixar ainda mais autônomo, com menos suporte pra nós"**. Este arquivo re-olha o organismo inteiro por essa lente e vira o mapa de onde a casa é chamada hoje e o que fecha cada chamado.
>
> **Regra de admissão:** a ideia só entra se **corta um chamado real** — do cliente pra Metrik, ou de um humano da Metrik pra dentro da própria operação. Feature bonita que não tira ninguém do meio não entra aqui (vai pro `FRONTEIRA.md`).
>
> **Este dossiê conversa com:** `FRONTEIRA.md` (reaproveita 4 peças do pódio, agora reordenadas), `CENTRAL.md` (é onde quase toda autonomia do cliente aparece), `ESCOLA.md` (o maior ralo de suporte recorrente), `SKILL.md §1` (o organismo que já existe).

**Legenda de estado:**

| Marca | Significado |
|---|---|
| ✅ | **Já existe e está no ar** — não reconstruir; no máximo expor melhor na Central |
| ⚠️ | **Meio-caminho** — a peça existe mas não fecha o chamado (ex.: detecta, mas fala só no grupo interno) |
| ❌ | **Não existe** — é build novo |
| 🩸 | nasce de dor real com data |

**Legenda de sentido:** **[A]** corta suporte que a Metrik dá ao cliente · **[B]** corta trabalho interno da casa.

---

## §0 · A DOUTRINA DA AUTONOMIA (o filtro antes de construir)

Três leis, e elas evitam o erro clássico de "automatizar" gerando um chamado novo:

**LEI 1 — AUTONOMIA SEM AUTOEXPLICAÇÃO É CHAMADO DISFARÇADO.** Se o sistema faz algo sozinho e o cliente não entende o que aconteceu, ele liga pra perguntar — e você trocou uma tarefa por uma dúvida. Toda ação autônoma **conta o que fez, em português, na Central** (é o §1.1 do CENTRAL: "a inteligência aparece como consequência em português, nunca como painel técnico").

**LEI 2 — O CLIENTE SÓ PODE FAZER SOZINHO O QUE NÃO QUEBRA O AGENTE.** Autonomia do cliente para no eval-porteiro. Ele pausa, dá recado, muda preço, corrige tom — tudo com trava. Ele **não** edita prompt cru, não mexe em alçada, não muda etapa da IA. A régua §2 do CENTRAL e o perfil dono×agência (`ESCOLA.md`) são o limite. Violou → é a Escola virando editor cru, a armadilha que a casa existe pra evitar.

**LEI 3 — AUTO-CURA NUNCA CORRIGE CÓDIGO, SÓ DESTRAVA OPERAÇÃO.** O sistema pode re-disparar um lead mudo, reconectar um webhook, avisar de token expirando, pausar por custo. Ele **jamais** reescreve prompt, tool ou lógica sozinho. Correção de código é sempre humana e passa por eval (é a lição do guardião, `SKILL.md §1`). A fronteira: destravar ≠ consertar.

> 🩸 **Por que a Lei 1 é dura:** o guardião hoje detecta B.O. e **alerta no grupo interno da Metrik**. Do ponto de vista do cliente, isso é invisível — ele continua ligando "a IA parou". A detecção existe; a autonomia **não**, porque a informação não chega em quem tomaria a ação. Autonomia é a informação certa na mão de quem age, não o alerta no lugar errado.

---

## §1 · O MAPA DOS RALOS (de onde vem o suporte hoje)

Cada linha é uma razão pela qual o telefone toca. A cura está no §2/§3.

| # | O chamado (o que dizem) | Frequência | Quem resolve hoje | Cura | Sentido |
|---|---|---|---|---|---|
| R1 | "Desliga a IA agora" / "essa semana não oferece horário" | média, **crítica** | você: tira tag / desativa workflow / redeploy (~20 min) | Parada de emergência + Recado (§2.1) | [A] |
| R2 | "A IA parou / não respondeu o lead" | **alta** | você investiga (8/10 = gate/janela/credencial/pausa) | Guardião → autoatendimento (§2.2) | [A] |
| R3 | "Muda isso na IA" (tom, resposta, regra) | **alta, recorrente** | cliente escreve na Escola → **humano da Metrik lê a fila e escreve o delta** | Escola Fase 1-3, o alfaiate (§2.3) | [A] |
| R4 | "Mudou meu preço / meu produto" | média | ticket → humano edita | Catálogo self-service (§2.4) | [A] |
| R5 | "Tá funcionando? A IA vendeu?" | média | você manda print / explica | Conversão por versão + Briefing (§2.5) | [A] |
| R6 | "A IA marcou horário que não existe / card veio vazio" | baixa, **cara** (queima lead+closer) | você conserta e pede desculpa | Contrato default-FAIL + slot_token (§2.6) | [A] |
| R7 | "Meu WhatsApp desconectou" (e a IA parou junto) | média | você descobre depois, pela reclamação | Watchdog de canal + credencial (§2.7) | [A] |
| R8 | "Veio uma conta de IA maior que o esperado" | baixa, **corrói confiança** | você explica depois | Circuit breaker de custo (§2.8) | [A] |
| R9 | (interno) "Subiu versão do motor — quais clientes estão atrás?" | a cada release | você redeploya um a um na mão | Auto-propagação da frota (§3.1) | [B] |
| R10 | (interno) "Cliente novo — montar tudo do zero" | a cada cliente | discovery + build manual | Self-service de onboarding (§3.2) | [B] |
| R11 | (interno) "Modelo degradou e ninguém viu" | silencioso | cliente reclama primeiro | Canário de drift diário (§3.3) | [B] |

---

## §2 · AS CURAS QUE O CLIENTE OPERA [A] — menos suporte pro cliente

### §2.1 · PARADA DE EMERGÊNCIA + RECADO DO DIA ✅ 🥇 — NO AR (dogfood GHL, 03/08/2026)
**Corta:** R1. **Esforço:** horas + 30min de propagação. **Herança:** `FRONTEIRA.md §1` (pódio).

> ✅ **Construída e validada E2E em produção** (cobaia Metrik GHL, 03/08/2026). Código: `agente-ia/lib/controls.ts` (novo asset) + patches em `api/inbound.ts` (pausa é a 1ª coisa, fail-open), `lib/llm.ts` (recado no bloco dinâmico, NÃO no simulador), `lib/guardian.ts` (alerta pausa >24h), `api/central.ts` (`recurso=controle`, case não function — respeita teto Hobby). Front: `area-cliente/components/OperatorControls.tsx` no topo da Visão Geral (banner permanente + botão + recado com TTL, esqueleto anti-flash). E2E: pausou → lead bloqueado com registro no diário → reativou; recado gravado/limpo. Chaves Redis `agente:pausa` (sem TTL) e `agente:recado` (TTL). **Falta:** propagar pra frota (4ª perna) + empacotar em `assets/`.

Duas chaves no Redis lidas no topo do `api/inbound.ts`:
- `agente-<slug>:pausa` → agente responde 200 e não faz nada. Botão vermelho na Central com motivo + quem pausou + banner permanente.
- `agente-<slug>:recado` → texto curto com TTL, entra no **bloco dinâmico** do system (nunca no cacheado — `PEGADINHAS §30`). "Closer de férias até dia 10, não ofereça horário."

**Por que é a primeira peça:** é o único chamado da lista que hoje **exige você acordado**. Vira 2 segundos de autoatendimento. Já verificado contra a doc oficial no FRONTEIRA. Trava obrigatória: guardião **alerta se pausado > 24h** (senão a pausa vira esquecimento e o cliente jura que a IA não funciona — a cicatriz #1 reencarnada).

### §2.2 · GUARDIÃO → AUTOATENDIMENTO ⚠️→❌ 🥇
**Corta:** R2 (o chamado #1). **Esforço:** ~1-2 dias. **Herança:** o guardião já existe (`lib/guardian.ts`), falta a **cara pro cliente**.

Hoje o guardião diagnostica e fala **no grupo interno**. A autonomia é traduzir isso num **painel de saúde autoexplicativo na Central**, em português de dono, com **a ação que o CLIENTE toma**:

| O guardião detecta | O cliente lê na Central | A ação dele |
|---|---|---|
| pausa ligada há 2 dias | "Sua IA está pausada desde terça (motivo: X)" | botão **Reativar** |
| webhook uazapi caiu / 401 | "Seu WhatsApp desconectou — as mensagens não estão chegando" | passo a passo de reconexão |
| PIT/token com 401 | "A conexão com seu CRM expirou" | "clique aqui / fale com a gente" (este ainda escala, mas **avisado**, não surpresa) |
| lead sem resposta > X min | "3 leads aguardando — reenviamos automaticamente" | nada (só informa a auto-cura) |

**Regra (Lei 1):** cada card diz **o que aconteceu + o que fazer**. Sem jargão, sem "erro 401". É o que transforma "a IA parou" de telefonema em clique.

### §2.3 · ESCOLA FASE 1-3 — O ALFAIATE ❌ 🥇 (o prêmio grande)
**Corta:** R3 (o maior ralo recorrente). **Esforço:** dias (a skill estima ~8,5d p/ o pacote; Fase 1 sozinha é menor). **Herança:** `ESCOLA.md` — Fase 0 já construída (captura+triagem+trava de perfil), Fases 1-3 não.

Hoje: cliente corrige → vira ticket triado → **um humano da Metrik lê a fila e escreve o delta no prompt**. O alfaiate fecha esse loop:
- **Fase 1 (o alfaiate):** o sistema pega a correção em português, roteia pela régua §2 (CENTRAL), **escreve o delta** na seção certa, **roda o eval-porteiro** e **propõe** — o cliente confirma. Sem Metrik no meio no caso comum.
- **Fase 2 (o caderno):** memória das correções já feitas, pra não repetir.
- **Fase 3 (a faxina):** detecta correções que se contradizem e pede desempate.

**É o maior corte de suporte da lista**, e o mais caro. Por isso vem **depois** de §2.1 e §2.2 provarem o padrão de autonomia no cobaia. Riscos de pé em `ESCOLA.md §8-B` — ler antes.

### §2.4 · CATÁLOGO SELF-SERVICE ⚠️
**Corta:** R4. **Esforço:** baixo se o catálogo já existe. **Herança:** `CENTRAL.md §4` + `lib/catalogo.ts` no cobaia.

O catálogo já é tabela viva. Falta confirmar que **o cliente edita sozinho** (preço/produto) pela Central, sem ticket. Se já edita → é só expor melhor (autoexplicação). Se não → é a tela de edição com import de planilha. **Verificar no cobaia antes de classificar como build.**

### §2.5 · CONVERSÃO POR VERSÃO + "A IA VENDEU?" ⚠️→❌
**Corta:** R5. **Esforço:** 1 dia. **Herança:** `FRONTEIRA.md §5` (pódio) — as 3 pontas já existem.

Carimbar `prompt_versao`+`sistema_versao` em toda conversa no diário e cruzar com o funil do `lib/auditor.ts`: *"v7 · 340 leads · 23% viraram reunião"*. É o número que responde "vendeu?" sem você abrir o CRM. **Trava:** nunca mostrar com n<100 (amostra pequena engana). Briefing diário (`lib/daily-report.ts`) já cobre o "tá funcionando?".

### §2.6 · CONTRATO DEFAULT-FAIL + SLOT_TOKEN ❌
**Corta:** R6. **Esforço:** 2-3 dias. **Herança:** `FRONTEIRA.md §2` (pódio, nota 9/9).

Impede card "Qualificado" vazio e horário inventado — no código, não no prompt. `slot_token` HMAC torna o modelo **fisicamente incapaz** de inventar horário. Corta o chamado mais caro (queima lead + closer). Armadilha conhecida: cada bloqueio **queima um step** do `MAX_STEPS≤6` — descontar do orçamento e forçar saída em texto.

### §2.7 · WATCHDOG DE CANAL + CREDENCIAL ❌
**Corta:** R7 (e parte do R2). **Esforço:** ~1 dia. **Novo** (não está no FRONTEIRA).

Sonda proativa: ping no canal (uazapi `/status`, ou detectar sequência de outbound `failed`) e nas credenciais (401 recorrente = token morrendo). Avisa **antes** de o cliente perceber — "seu WhatsApp cai em breve", "renove o token até dia X". Alimenta o painel §2.2. 🩸 nasce da lição `reference_ihouse_canal_uazapi` (canal GHL entregava 2xx e depois `failed` — olhar o `status`, não o corpo).

### §2.9 · SELF-SERVICE: BYO OpenAI KEY + TOGGLES + CUSTO ESTIMADO ✅ — NO AR (dogfood GHL, 03/08/2026)
**Corta:** um ralo novo (R12: "configura pra mim" — key, ligar/desligar voz/mídia, "quanto custa?"). **Esforço:** ~meio dia. **Pedido direto do mestre 03/08.** [B]+[A]: o custo de IA passa pra conta do cliente (BYO) e ele liga só o que usa.

O cliente, na Central, **põe a própria chave OpenAI** (BYO — custo vira dele), **liga/desliga** voz/imagem/PDF/áudio, e vê o **custo estimado** por tipo de interação. Reusa a arquitetura da §2.1 (chave Redis + `recurso=` + Central).

> ✅ **Construída e validada E2E** (cobaia Metrik GHL, 03/08/2026). Código: `agente-ia/lib/settings.ts` (novo asset — key **cifrada AES-256-GCM** com segredo derivado do WEBHOOK_SECRET, nunca devolvida ao browser, só hint `...ABCD`; validada na OpenAI `/models` antes de gravar; toggles `agente:cfg:features` default tudo-on; `estimarCustos()` com preços do CONFIG). Refatorados os 5 pontos que criavam cliente OpenAI (`llm/llm-json/media/stt/voice`) pra usar `getOpenAI()`/`getOpenAIKey()` (key vigente = cliente ou fallback env, cache 30s). Gating no orquestrador `api/inbound.ts` (mídia/voz respeitam toggle). Endpoint `api/central.ts recurso=settings`. Front: `area-cliente/components/AISettings.tsx` + rota `/inteligencia` + card no hub Configurações. E2E: GET estado, toggle liga/desliga, validador **rejeitou key inválida (422)**, custos calculados (conversa típica R$0,08). **Falta:** propagar pra frota + empacotar em `assets/`.
>
> 🩸 **Cicatriz — `required('OPENAI_API_KEY')` no boot:** no modelo BYO puro (cliente sem key da Metrik no env), o `config.ts` derrubaria o boot. No cobaia a Metrik TEM env de fallback, então não quebra. Ao replicar pra cliente BYO-only, tornar a env opcional e exigir que ele configure a key antes do 1º atendimento.

### §2.8 · CIRCUIT BREAKER DE CUSTO ❌
**Corta:** R8. **Esforço:** meio dia. **Novo.**

Teto diário de gasto de LLM por cliente (o ledger já mede tudo — `CENTRAL.md §7.1`). Estourou → pausa + alerta ("gasto acima do normal hoje, pausei por segurança"). Evita conta-surpresa e loop custoso. Reaproveita `lib/cost.ts`. **Trava:** teto generoso + alerta antes de pausar (pausar cedo demais é o oposto do que se quer).

---

## §3 · AS CURAS QUE A CASA OPERA [B] — menos trabalho interno

### §3.1 · AUTO-PROPAGAÇÃO DA FROTA ❌ 🥈
**Corta:** R9 (a "4ª perna" feita na mão, `SKILL.md §7.3`). **Esforço:** 1-2 dias. **Novo — e é puro [B].**

Hoje, subir versão do motor = redeployar cliente a cliente na mão, torcendo pra não esquecer ninguém. A cura:
- **Registro de frota** (quem está em qual `SISTEMA_VERSAO`) — o manifesto já tem a versão; falta um índice central.
- **Painel "quem está atrás"** + botão/CLI que redeploya os atrasados e roda o smoke (`typecheck` + evals + E2E) por cliente.
- Escala com a carteira: a `ESCALA.md` diz que a 4ª perna é o que quebra primeiro ao dobrar de clientes. Isto é o antídoto.

### §3.2 · SELF-SERVICE DE ONBOARDING ⚠️
**Corta:** R10. **Esforço:** médio. **Herança:** `ONBOARDING.md` (Compiler) + `QUESTIONARIO-CLIENTE.md` já existem.

O cliente preenche o questionário (já é formulário ClickUp) e o Compiler gera o **rascunho** de diagnóstico/prompt/crm-map. A Metrik revisa em vez de escrever do zero. Já há muito construído — o gap é ligar a entrada do cliente na saída do Compiler sem digitação manual. **Verificar o estado real antes de dimensionar.**

### §3.3 · CANÁRIO DE DRIFT DIÁRIO ❌
**Corta:** R11. **Esforço:** meio dia. **Herança:** `FRONTEIRA.md §3` (pódio).

3 cenários bloqueantes (alucina preço · vende pra quem pede suporte · cai em injection) contra o prompt vigente de cada cliente, todo dia. Reprovou → alerta na hora. Automatiza o "rode mensalmente mesmo sem mexer" que ninguém cumpre. **Trava dura:** endpoint próprio + QStash, **nunca** no `cron-daily` (teto 300s, o rabo morre calado — a cicatriz #1 dentro do próprio vigia).

---

## §4 · O ROADMAP (priorizado por corte-de-suporte ÷ esforço)

```
ONDA 1 — os quick wins de autonomia (dias, não semanas)
  §2.1 Parada de emergência + Recado    ✅ NO AR  → cliente para/ajusta sozinho     [A] R1  (03/08)
  §2.9 Self-service key+toggles+custo    ✅ NO AR  → cliente configura sozinho a IA  [A/B] R12 (03/08)
  §2.2 Guardião → autoatendimento        (1-2d)    → mata o chamado #1 "a IA parou"  [A] R2
  §2.8 Circuit breaker de custo          (½d)      → sem conta-surpresa              [A] R8
  §2.7 Watchdog de canal + credencial    (1d)      → avisa antes de cair             [A] R7
  ──────── aqui a operação do cliente já respira sem você ────────

ONDA 2 — a máquina de valor e a frota
  §2.5 Conversão por versão              (1d)      → "a IA vendeu?" sem você          [A] R5
  §3.1 Auto-propagação da frota          (1-2d)    → você para de redeployar na mão   [B] R9
  §3.3 Canário de drift                  (½d)      → degradação vira alerta, não churn[B] R11
  §2.6 Contrato default-FAIL + slot_token(2-3d)    → fim do card vazio/horário fake   [A] R6

ONDA 3 — o prêmio grande (só depois das ondas 1-2 provarem o padrão)
  §2.3 Escola Fase 1 (o alfaiate)        (dias)    → cliente corrige, sistema aplica  [A] R3
       Fase 2 (caderno) + Fase 3 (faxina) na sequência
  §2.4 Catálogo self-service             (verificar) → preço/produto sem ticket        [A] R4
  §3.2 Self-service de onboarding        (verificar) → cliente novo com menos mão      [B] R10
```

**Por que essa ordem:** a Onda 1 são ~3-4 dias de build e devolve as autonomias que **hoje exigem você no meio em tempo real** (pausar, diagnosticar, controlar custo). A Onda 2 fecha "vendeu?" e tira o trabalho interno de propagar. A Onda 3 é o corte de suporte recorrente — o mais valioso e o mais caro, deixado por último de propósito: o alfaiate só é confiável depois que o padrão de "autonomia com trava" foi provado nas peças baratas.

---

## §5 · O QUE JÁ É AUTÔNOMO (não reconstruir — no máximo expor melhor)

| Autonomia | Onde | Estado |
|---|---|---|
| Briefing executivo diário (07h) | `lib/daily-report.ts` | ✅ |
| Analista semanal (sugestões, nunca auto-aplicadas) | `lib/analyst.ts` | ✅ |
| Auditora de funil (sextas) | `lib/auditor.ts` | ✅ |
| Guardião (detecta + retrigger máx 3) | `lib/guardian.ts` | ✅ (falta a cara pro cliente — §2.2) |
| Rastreador de origem (lead nasce rastreado) | `lib/tracker.ts` | ✅ |
| Followup gerado por IA com cadência | `lib/followup.ts` | ✅ |
| Eval-porteiro (bloqueia deploy que quebra) | `lib/evals.ts` + `api/prompt.ts` | ✅ |
| Escola Fase 0 (captura + triagem + trava de perfil) | `assets/escola/` | ✅ |
| Central se explica (Briefing, Pergunte à Central, Flight Recorder) | `assets/central-v4/` | ✅ |
| Ledger de custo por execução | `lib/cost.ts` | ✅ |

> A casa já é forte em **auto-operação** (rotinas rodando) e **auto-explicação** (a Central conta). Os buracos de autonomia estão em **auto-serviço do cliente** (§2.1, §2.3, §2.4) e **auto-cura visível** (§2.2, §2.7, §2.8) — e em **um** buraco interno grande: a propagação da frota (§3.1).

---

## §5.1 · TRACKING FASE A — anúncio + atribuição nativa ✅ (dogfood GHL, 03/08/2026)

Pedido do mestre (03/08): capturar origem/UTM/click-IDs na 1ª mensagem, pra todo cliente. A investigação (subagente) achou o terreno real:

- **Os campos JÁ existem** na location: `Rastreio fbclid/gclid/ctwa_clid/igclid`, Referrer, Anúncio, Canal de entrada, Landing page + os 5 UTMs (first/last). Nada a criar.
- 🩸 **O GHL nativo NÃO entrega click IDs** — nem em CTWA. Testado num lead real de anúncio (`gbwuvyE1NE0t4UvuUPz4`): o `lastAttributionSource` dá `adId`, `adName`, `sessionSource: Paid Social`, `medium: whatsapp`, `url` — **mas nenhum fbclid/gclid/ctwa_clid**. Pro click id real precisa de captura própria (link rastreável, como o Kommo já faz, ou `contextInfo` da uazapi — Fase B, ainda não existe nem no Kommo).

**Fase A construída e validada E2E:** `tracker.ts` agora lê `adId/adName/sessionSource/medium/url/referrer` do attribution nativo → grava em `Rastreio Anúncio/Canal/Landing/Referrer` (IDs em `config.ts TRACKER_AD_FIELDS`), merge só-vazio, e **reforça a Origem** (lead CTWA vem sem utm_source → seria marcado "Orgânico"; adId/"Paid Social" corrige pra Meta Ads). `/api/tracker?force=1` re-rastreia ignorando o marker. **Prova:** campo Anúncio (vazio → "Crie seu primeiro Vendedor de IA 🤖 (120249414017830524)") relido do CRM. **Falta:** Fase B (click id via link/uazapi) + propagar.

### 🩸 Cicatrizes de token descobertas neste trabalho (replicar em `ghl/PEGADINHAS.md`)

- **`GHL_TOKEN` de produção com `\r\n` literal no fim** (env da Vercel): 44 chars em vez de 40. O agente funciona porque o servidor GHL **trima whitespace no header** — mas qualquer curl/script que passe o valor cru leva **401 "Invalid Private Integration token"**. Extrair sempre com `pit-[a-f0-9-]{36}` (regex), nunca confiar no valor bruto do env. Vale limpar o env na Vercel.
- **O PIT `pit-628944…` responde `/contacts` e `/conversations` mas dá 401 em `/locations/{id}/customFields`** — escopo do PIT não cobre a listagem de definições de campo. Pra descobrir IDs de campo, usar um token com escopo de location, ou validar por **escrita+releitura** num contato (que é a prova definitiva contra campo-morto-200 mesmo).
- **`config.yaml` do cliente com PIT desatualizado** (`pit-684281b4…` inválido): docs de credencial apodrecem. A fonte da verdade é o env de produção, não o `config.yaml`.

## §6 · REGRAS DE PROPAGAÇÃO DESTE DOSSIÊ

Toda peça construída aqui segue o ritual normal da `SKILL.md §7`: cicatriz na fonte, Códex, plugin, e a 4ª perna (redeploy da frota — que §3.1 quer justamente automatizar). Peça de autonomia **sempre** nasce no cobaia GHL da Metrik (`clientes/metriksales/agente-ia/` + `area-cliente/`), prova E2E, e só então vira asset/patch replicável. Autonomia sem prova é a pior — porque o cliente confia nela e para de vigiar.
</content>
</invoke>
