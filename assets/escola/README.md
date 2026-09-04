# ESCOLA · "Ensinar a IA" — o asset replicável

O cliente corrige a IA **em português**, a agência cuida do texto, e o cliente
**nunca encosta no prompt**. Esta pasta é o código que faz isso — extraído do
dogfood (agente da própria agência) já sanitizado, pronto pra colar em qualquer
cliente que já tenha a base do agente serverless.

> Fase 0 = **A CAIXA**. A correção vira dado estruturado; **nada é escrito no
> cérebro automaticamente**. Por isso ela não quebra ninguém — e por isso o
> `status` no manifest entra como `construcao`, nunca `ativo`.

Guia passo a passo (com os snippets de cada patch): **[INSTALAR.md](INSTALAR.md)**.

---

## 1. O que tem aqui

```
assets/escola/
├── README.md                          ← este arquivo (mapa + placeholders)
├── INSTALAR.md                        ← o guia de instalação, com os 7 patches
├── agente/                            → vai pro projeto do AGENTE (Vercel Functions)
│   ├── lib/escola-core.ts             núcleo PURO: 12 BLOCOS, 6 CHIPS, anonimizar(), blocoDosChips()
│   ├── lib/escola.ts                  o store (correções, filas por bloco, tickets, saudeEscola)
│   ├── lib/roteador.ts                triagem determinística de dado volátil (regex, zero modelo)
│   ├── lib/perfil.ts                  a trava de identidade: 'dono' × 'agencia', derivada do secret
│   ├── api/escola.ts                  o endpoint (capturar / conversas / marcar / resolver-ticket)
│   └── scripts/test-escola.ts         a PROVA: 49 asserções, sem env, sem rede
└── central/                           → vai pra CENTRAL do cliente (Next.js App Router)
    ├── components/Playground.tsx      o laboratório, com `onErrouAqui` OPCIONAL
    ├── components/Escola.tsx          a UI da aba inteira (card, conversas, colar, fila, barra)
    └── app/api/escola/route.ts        o proxy que mantém o secret fora do browser
```

Nenhum arquivo aqui carrega ID de location, pipeline, custom field, telefone ou
e-mail de cliente. O que era nome próprio virou placeholder (§4).

---

## 2. ORDEM DE INSTALAÇÃO — e o ciclo de import que ela evita

Copie **nesta ordem**. Não é preciosismo: `escola-core.ts` existe separado de
`escola.ts` exatamente porque `escola.ts` importa `CONFIG`, e `execlog.ts`
precisa de `anonimizar`.

```
execlog → escola → config → … → execlog     ❌ ciclo (se importar de escola.ts)
execlog → escola-core                        ✅ folha pura, sem CONFIG, sem Redis
```

1. `agente/lib/escola-core.ts` — **primeiro, sempre.** Folha da árvore de imports.
2. `agente/lib/roteador.ts` — só depende de um `type` de escola-core.
3. `agente/lib/perfil.ts` — depende de `CONFIG.centralSecret` → **exige o patch 1 antes de compilar**.
4. `agente/lib/escola.ts` — depende de `CONFIG.upstashUrl/Token` (já existe em todo cliente).
5. **PATCH em `lib/execlog.ts`** — `import { anonimizar } from './escola-core'` (nunca de `./escola`).
6. `agente/api/escola.ts` — depende de perfil + roteador + escola + execlog.
7. `agente/scripts/test-escola.ts` — rode aqui. **Tem que passar antes de subir qualquer coisa.**
8. `central/components/Playground.tsx` e `central/components/Escola.tsx`.
9. `central/app/api/escola/route.ts`.
10. **PATCHES** nos arquivos que já existem (§3) — inserção, nunca sobrescrita.

---

## 3. Os 7 PATCHES (arquivos do cliente que recebem INSERÇÃO)

Estes arquivos **já existem** no cliente e carregam a verdade dele (IDs, crons,
status de módulo). **NUNCA copie por cima** — insira. Os snippets completos estão
em [INSTALAR.md](INSTALAR.md).

| # | Arquivo | O que muda | Por que não replica inteiro |
|---|---------|-----------|------------------------------|
| 1 | `agente-ia/lib/config.ts` | 1 linha: `centralSecret` abaixo de `webhookSecret` | O arquivo carrega location ID, contact fields e IDs de UTM daquele CRM |
| 2 | `agente-ia/lib/execlog.ts` | 3 inserções: import de `escola-core`, 2 campos opcionais, teto + anonimização antes do `lpush` | O resto (KEY, MAX, getExecLog) fica intocado |
| 3 | `agente-ia/api/inbound.ts` | 2 linhas dentro do **único** `logExec` de sucesso | Carrega o gate por tag, o buffer e a orquestração daquele cliente |
| 4 | `agente-ia/api/prompt.ts` | 4 inserções: autenticação binária → **perfil** | 🩸 `chat` fica FORA da lista ESCRITA, de propósito |
| 5 | `agente-ia/lib/manifest.ts` | 1 objeto novo no bloco Inteligência | `status`/`prova`/`custo` são a verdade daquele cliente (SKILL.md §7.3) |
| 6 | `agente-ia/vercel.json` | 1 entrada em `functions` | O bloco `crons` é o horário acordado com aquele cliente |
| 7 | `area-cliente/app/cerebro/page.tsx` | A página vira **3 modos** (ler / ensinar / editar) | `COR_SECAO` mapeia os títulos literais do prompt.md do dogfood |

🩸 **A cicatriz mais cara está no patch 7**: no dogfood o Playground morava
DENTRO do `{modo === 'editar' && (…)}`. Esconder o editor do perfil `dono`
esconderia o laboratório junto — matando exatamente a feature que a trava existe
pra proteger. Por isso ele virou componente próprio (`central/components/Playground.tsx`).

🩸 **A segunda está no patch 4**: `chat` **não** entra em `ESCRITA`. Bloquear o
chat junto com publicar/restaurar/rollback/testar (o reflexo natural de quem
escreve o guard) desliga o laboratório do cliente — e a Escola morre em silêncio,
com a UI mostrando um campo que nunca responde.

---

## 4. PLACEHOLDERS — troque antes de subir

Rode um grep por `{NOME_` no que você copiou. Nada pode sobrar.

| Placeholder | Onde aparece | Trocar por |
|---|---|---|
| `{NOME_AGENCIA}` | `agente/lib/roteador.ts` (`explicacao` do ticket) · `agente/lib/perfil.ts` (comentário + `RECADO_SEM_PERMISSAO`) · `agente/api/escola.ts` (`rodape` do ticket) · `central/components/Escola.tsx` (título "Chamados abertos com a …") · patch 5 do manifest (`{AGENCIA}` no `resumo`) | O nome da agência que atende o cliente |
| `{NOME_AGENTE}` | `central/components/Escola.tsx` (o `placeholder` do textarea de colar conversa) | O nome da IA daquele cliente (o mesmo do prompt.md) |
| **os 12 `BLOCOS`** | `agente/lib/escola-core.ts` (`BLOCOS` + `BLOCO_LABEL`) | ⚠️ **Re-derive do `prompt.md` DAQUELE cliente.** Os 12 de fábrica espelham os `# Título` do prompt do dogfood. Bloco que não existe no prompt = lote que nunca vira delta na Fase 1. |
| prefixo `agente:` das chaves | `agente/lib/escola.ts` linhas 30-34 | **GHL: deixe.** **Kommo: troque para `ak:`** — Upstash free é 1 DB só, e agente GHL + agente Kommo do mesmo cliente colidem (comum/PEGADINHAS.md §18). |

Os `CHIPS` (6) e os textos de produto (a trava do par completo, a confirmação
fria, o "não é bem isso") são **genéricos de propósito** — não personalize.
Eles são o produto, não a marca.

---

## 5. CRITÉRIO DE PRONTO

```bash
cd <cliente>/agente-ia
npx tsx scripts/test-escola.ts
```

Tem que sair **`✅ 49 passaram · 0 falharam`** (49 é o número de hoje; o que vale
como critério é **0 falharam**). Roda sem env, sem Redis, sem rede, sem modelo.

Foi esse arquivo que pegou os 2 bugs da anonimização antes do ar:
`\b` não casa antes de `(` (sobrava `"([telefone]"`), e celular com DDD tem 11
dígitos igual CPF (`11987654321` virava `[cpf]` — rótulo errado em dado sensível).
**Sem ele o asset é código sem porteiro.**

---

## 6. ⚠️ AVISO DO KOMMO — leia antes de prometer prazo

| | GHL | Kommo |
|---|---|---|
| `lib/prompt-store.ts` (cérebro versionado no Redis) | ✅ existe | ❌ **não existe** |
| `api/prompt.ts` + evals server-side (o porteiro) | ✅ existe | ❌ **não existe** |
| Playground `acao:'chat'` | ✅ existe | ❌ depende do acima |
| Central com aba do cérebro | ✅ existe | ⚠️ parcial |

**No GHL a Escola é 1 tarde** (copiar + 7 patches + deploy).
**No Kommo ela não faz sentido ainda**: sem `prompt-store` não há prompt vigente
pro laboratório rodar, sem `api/prompt.ts` não há `acao:'chat'`, e sem os evals
não há porteiro pra publicar o delta que a fila gera. **Port primeiro (≈1 dia),
Escola depois.** Instalar antes entrega uma aba que captura correção que ninguém
consegue aplicar — que é pior que não ter aba.
