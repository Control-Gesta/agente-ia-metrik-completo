# MÍDIA E PROVEDORES — uma conta simples sem confundir uma conta com um modelo

> **Leia quando:** decidir visão, PDF, transcrição ou voz; antes de pedir Groq ou
> ElevenLabs; quando alguém disser “quero fazer tudo pela OpenAI”.
>
> Preços são fotografia de **24/07/2026**. Confirme a documentação oficial e o
> ledger antes de prometer custo.

## 1 · A verdade que evita arquitetura errada

**Uma conta OpenAI pode centralizar a operação, mas GPT-5.4 Mini não faz tudo
sozinho.** São modelos/rotas especializados sob a mesma chave:

```text
texto, imagem e PDF ───────→ GPT-5.4 Mini
áudio recebido ────────────→ GPT-4o Mini Transcribe ou Whisper-1 → texto
texto que deve virar voz ──→ TTS-1 → arquivo de áudio
arquivo de áudio ──────────→ uazapi type:ptt → WhatsApp
```

O transporte do WhatsApp continua existindo. Trocar ElevenLabs por OpenAI não
faz o GHL entregar áudio outbound nem remove a necessidade da uazapi/PTT.

## 2 · Padrões que o professor oferece

| Padrão | Conversa/visão | STT | TTS | Quando recomendar |
|---|---|---|---|---|
| **OpenAI simples** | GPT-5.4 Mini | GPT-4o Mini Transcribe | TTS-1 | cliente novo, baixo/médio volume, menos credenciais e suporte |
| **Custo/velocidade** | GPT-5.4 Mini | Groq Whisper V3 Turbo | TTS-1 | muito áudio recebido; aceita uma chave extra |
| **Voz premium** | GPT-5.4 Mini | OpenAI ou Groq | ElevenLabs | voz/clonagem é parte mensurável da experiência ou conversão |
| **Fallback comprovado** | Sonnet 5 | Groq/OpenAI | Eleven/OpenAI | GPT em canário, incidente ou caso sensível |

**Padrão de partida da casa para projeto novo:** OpenAI simples. Não peça Groq
nem ElevenLabs automaticamente. Só acrescente fornecedor quando houver requisito
ou volume que pague a complexidade.

## 3 · Régua econômica honesta

| Serviço | Preço de referência | Leitura |
|---|---:|---|
| Groq Whisper Large V3 Turbo | US$0,04/h de áudio | muito barato e rápido; outra conta/chave |
| Groq Whisper Large V3 | US$0,111/h | mais precisão, ainda barato |
| OpenAI Whisper-1 | US$0,006/min = US$0,36/h | simples na mesma conta OpenAI |
| OpenAI GPT-4o Mini Transcribe | US$1,25/M áudio input + US$5/M output | melhor reconhecimento que Whisper original; medir por áudio real |
| OpenAI TTS-1 | US$15/M caracteres = US$0,015/1k | voz simples e barata |
| ElevenLabs Flash/Turbo | US$0,05/1k caracteres | baixa latência e voz mais trabalhável |
| ElevenLabs Multilingual v2/v3 | US$0,10/1k caracteres | qualidade/expressão premium |

Exemplo: 10 horas de áudio/mês custam aproximadamente US$0,40 no Groq Turbo e
US$3,60 no Whisper-1. Economizar US$3,20 pode não compensar suporte e credencial
extra. Com 100 horas, a economia sobe para US$32 e já merece atenção.

Preço por caractere não mede qualidade. Para voz, compare em português real:
nomes, números, moedas, datas, velocidade e naturalidade no áudio recebido pelo
celular — não só no player do provedor.

## 4 · Visão e documentos

- GPT-5.4 Mini recebe imagem diretamente.
- No `input_file` da Responses API, PDF vira **texto extraído + imagem de cada
  página**; isso enxerga diagramas, mas cobra mais tokens.
- DOCX/PPTX entram como texto; imagens e gráficos embutidos não são preservados.
  Converta para PDF quando o visual importar.
- Descreva a mídia **uma vez na entrada** e grave o resultado textual no
  histórico. Não reenvie a imagem/PDF em cada turno.
- Valide `content-type` por GET; extensão e HEAD não são prova do tipo do anexo.

## 5 · Perguntas que o professor faz antes de escolher

1. O agente precisa receber áudio, responder por voz, ou ambos?
2. Quantas horas de áudio e quantos caracteres de voz por mês?
3. Voz genérica basta ou a marca exige clonagem/expressão?
4. A prioridade é uma chave, menor custo ou maior qualidade?
5. Imagem/PDF contém documento sensível? Qual política de dados foi aprovada?
6. O canal realmente entrega PTT? Qual E2E no celular vai provar?

Depois explique a recomendação com uma frase de ganho e uma de preço:

> “Vamos começar OpenAI-only porque o volume é baixo e reduz suporte; abrimos
> Groq quando o ledger mostrar que a economia de transcrição paga outra chave.”

## 6 · Contratos de implementação

Não espalhe SDKs pelo inbound:

```ts
interface VisionProvider {
  describe(input: MediaInput): Promise<MediaDescription>
}

interface SpeechToTextProvider {
  transcribe(input: AudioInput): Promise<Transcript>
}

interface TextToSpeechProvider {
  synthesize(text: string): Promise<AudioFile>
}
```

Seleção por env:

```text
VISION_PROVIDER=openai|anthropic|kimi
STT_PROVIDER=openai|groq|elevenlabs
TTS_PROVIDER=openai|elevenlabs
```

Cada adapter normaliza usage, custo, duração, modelo e erro. O ledger registra
`provider`, `model`, `input`, `output`, `durationMs` e `costBrl`. Trocar provedor
não altera buffer, histórico, prompt, tools nem transporte.

## 7 · Prova obrigatória

Antes de escolher ou trocar:

- 10 áudios reais: silêncio, ruído, sotaque, nome próprio, número e áudio longo;
- 5 imagens e 3 PDFs reais, incluindo documento ruim e página com tabela;
- 10 respostas de voz no celular, com data, moeda, telefone e nome;
- custo e latência p50/p95;
- falha clara e fallback; nunca descartar mídia silenciosamente;
- confirmação de que o PTT chegou e tocou no WhatsApp.

Só centralize porque passou. Só mantenha fornecedor extra porque ganhou por
qualidade, custo ou requisito medido.

## 8 · Dogfood OpenAI-only da Metrik — 24/07/2026

Produção migrada para:

```text
conversa + tools + imagem/PDF → gpt-5.4-mini-2026-03-17
áudio recebido                → gpt-4o-mini-transcribe
resposta falada               → tts-1, voz nova → GHL storage → uazapi ptt
```

**Provas da rodada:** evals 10/10 (média 9,7); GPT leu PNG real e PDF real;
roundtrip `TTS-1 → Opus → GPT-4o Mini Transcribe` devolveu a frase exata; upload
no GHL passou e a uazapi aceitou o PTT de produção. O aceite HTTP da uazapi não
substitui ouvir no celular: a confirmação visual/sonora continua sendo o último
gate de voz.

**Cicatriz corrigida:** o dogfood ainda sintetizava e enviava attachment pelo
GHL, embora a documentação já dissesse uazapi. Manifesto certo com código errado
é mentira operacional. Anticorpo: o teste de voz precisa inspecionar a rota real
e provar `send/media {type:'ptt'}`, não apenas `voice:true`.
