# QUESTIONÁRIO CANÔNICO DO CLIENTE — conhecimento, operação da IA e resultado

> Este é o padrão de entrada da Metrik. O formulário do ClickUp é a porta principal e deve exibir todas as perguntas críticas, agrupadas em blocos didáticos. Os cinco documentos aprofundam e organizam as respostas, mas nunca substituem perguntas visíveis no formulário.

## 1 · O desenho em três camadas

### Camada A — o cliente explica o negócio

O cliente preenche cinco documentos, sempre com fatos reais e linguagem própria:

1. **Perfil da Empresa** — identidade, proposta de valor, público, canais, horários, equipe, tom e políticas.
2. **Processo Comercial** — caminho real do lead, etapas, gatilhos de avanço, ficha, fechamento, follow-up, ferramentas e gargalos.
3. **Guia de Produtos e Serviços** — catálogo, preços/condições, quando oferecer, quando não oferecer, exceções e casos fora do escopo.
4. **Fluxo de Qualificação** — perguntas, critérios positivos/eliminatórios, racional, fallback, limites e escalonamento.
5. **Glossário de Objeções** — frase real, resposta-base, racional e objeções que devem ser antecipadas.

Qualidade vence quantidade. Documento em branco ou resposta “a confirmar” é melhor que conteúdo inventado por IA. Se o cliente usar IA para redigir, ele precisa revisar e assumir cada resposta.

### Camada B — decisões da IA e do resultado

O cliente responde e a Metrik valida em reunião:

#### Objetivo e alçada

- Qual é o resultado final da conversa: agendar, vender no chat, solicitar documentos, visitar ou outro?
- Quais caminhos diferentes existem por perfil, interesse ou produto?
- Até onde a IA pode agir? O padrão Metrik termina em **Agendado**.
- Em quais situações a IA deve parar imediatamente e chamar uma pessoa?
- Quem recebe cada tipo de handoff e em qual horário?
- O que a IA nunca pode dizer, prometer, conceder ou interpretar?

#### Preço, agenda e políticas

- A IA pode informar preço? De quais ofertas? Qual valor e condição vigentes?
- Se não puder informar, qual resposta oficial e qual próximo passo?
- Quais descontos ou condições exigem aprovação humana?
- Quais dias, horários, duração, antecedência e regras de remarcação valem para agenda?

#### Canal e mídia

- Qual canal/número receberá a IA e ele já existe em outro sistema ou bot?
- Os leads enviam áudio, imagem ou PDF? O que a IA deve extrair de cada mídia?
- A IA responderá em áudio? Só confirmar depois de E2E no celular.
- A empresa envia links, arquivos, contratos, catálogos ou comprovantes? Em qual momento?

#### Follow-up e recuperação

- Em quais situações começa o follow-up?
- Quantos contatos, depois de quanto tempo e em quais horários?
- O que interrompe a cadência: resposta, handoff, agendamento, perda ou pedido explícito?
- Quando a empresa desiste e qual motivo de perda deve ser registrado?
- O que significa **voltou a conversar**?
- O que significa **concretizou o objetivo comercial**?
- Qual evento do CRM prova cada uma dessas conversões e qual janela de atribuição será usada?

#### Governança

- Quem aprova conteúdo, preço, política e mudança do comportamento da IA?
- Quem pode ligar/desligar a IA em um lead?
- Como a equipe avisará que assumiu o atendimento?
- Quem recebe alertas de erro e relatórios?
- Quais assuntos ficam sempre fora da IA: suporte, financeiro, reclamação, urgência ou cliente ativo?

#### Resultado e mensuração

- Qual é a métrica norte do projeto?
- Quais até cinco métricas de apoio serão acompanhadas?
- Qual período representa o “Antes” — padrão: últimos 30 dias?
- Onde cada número vive e quem confirma que está correto?
- O que a Metrik controla e o que depende do cliente?
- Como separar receita direta, assistida, estimada, protegida e economia operacional?
- Qual meta inicial e em qual data será revisada?

#### Foto do Antes — números atuais obrigatórios

Pedir um período explícito, padrão últimos 30 dias completos, e coletar: leads totais e por origem; respondidos e tempo da primeira resposta; qualificados; reuniões agendadas, realizadas e faltas; propostas; ganhos e perdidos; valor vendido e efetivamente recebido; ticket médio; ciclo de venda; investimento em mídia. Cada número declara **fonte** (CRM, planilha, financeiro ou estimativa) e **confiança**. `NÃO SEI` é resposta válida; número inventado não é.

#### Pessoas, rastreamento e operação existente

- nomes, papéis, horários, distribuição de leads, SLA esperado e responsável interno pelo CRM;
- todas as origens de lead, campanhas/UTMs, regra de atribuição e onde a base vive hoje;
- volume aproximado, necessidade de importação, duplicidades e dados mínimos de identificação;
- CRM, WhatsApp, calendários, formulários, proposta, contrato, cobrança, pagamento, integrações, bots e automações já ativos;
- o que não pode parar durante a implantação e quem libera os acessos — sem senha ou token no formulário;
- dados sensíveis/regras legais, proibições, urgências, definição de ganho/perda e motivos de perda;
- quem aprova funil, campos, prompt, testes e entrada com leads reais.

#### Prova e aceite

- Liste uma conversa típica que deve funcionar.
- Liste uma objeção difícil que deve ser tratada corretamente.
- Liste um caso que deve ser recusado.
- Liste um caso que deve ir para humano.
- Liste uma pergunta de preço.
- Liste um pedido de suporte, uma tentativa de manipular a IA e um caso fora do escopo.
- Quem aprova os cenários e quem assina o teste E2E no WhatsApp real?

### Camada C — a Metrik descobre e registra

Não perguntar IDs técnicos ao cliente. Com os acessos, a Metrik descobre e valida:

- CRM real e canal que o time usa;
- pipelines, etapas, ordem, campos, opções/enums e responsáveis;
- automações/bots já ativos e risco de resposta dupla;
- origem/UTM e fonte de cada métrica;
- calendário ou janela de reunião;
- credenciais somente por estado: pendente, recebida, validada;
- baseline real e qualidade do dado;
- limitações técnicas do canal;
- `crm-map`, prompt, evals, handoff e pendências gerados pelo Compiler.

## 2 · Como isso aparece para o cliente

Uma mensagem, uma pasta e uma reunião:

1. mensagem de boas-vindas explica o porquê;
2. pasta contém os cinco documentos nomeados e numerados;
3. formulário do ClickUp contém, de forma visível, os blocos completos de empresa, processo comercial, produtos, qualificação, objeções, operação da IA, follow-up, Foto do Antes, equipe/SLA, origens/UTM/base, ferramentas/automações, riscos e aprovação;
4. reunião de 45–60 minutos resolve contradições e confirma pontos críticos;
5. Metrik compila, audita o CRM e devolve o resumo para aprovação.

O formulário é a checklist do cliente e da Metrik: se a pergunta é necessária para implementar ou validar, ela precisa aparecer nele. **Uma pergunta deve pedir uma única resposta ou decisão.** É proibido colocar listas numeradas de subperguntas dentro da descrição de um campo.

Use o tipo de campo mais simples para cada resposta:

- texto curto: nome, responsável, função, CRM e respostas objetivas;
- texto longo: somente explicações, exemplos, objeções, regras e jornadas;
- número/moeda: cada indicador da Foto do Antes em seu próprio campo;
- opção única: sim/não, período, fonte, nível de confiança e escolhas excludentes;
- múltipla escolha: canais, formatos de mídia e situações que podem coexistir;
- upload: materiais, planilhas e documentos de apoio.

Os títulos de seção são apenas blocos visuais — EMPRESA, PROCESSO, QUALIFICAÇÃO, IA, FOLLOW-UP, FOTO DO ANTES, SISTEMAS e APROVAÇÃO — e nunca caixas de resposta. O formulário canônico deve ser criado na lista central **Projetos › Onboarding › Onboarding** (`901714002657`), não dentro da lista operacional de um cliente. Assim, os campos do briefing não poluem as tarefas e subtarefas do projeto.

Os documentos continuam como material de apoio e aprofundamento. Um formulário resumido com cinco caixas genéricas ou um formulário com perguntas-pacote é inválido.

O formulário canônico está em `FORMULARIO-ONBOARDING-METRIK.md` no workspace de Gestão de Projetos. Ele possui no máximo 20 perguntas, em linguagem simples. Os documentos de Perfil, Processo Comercial, Produtos, Qualificação e Objeções são fontes internas para orientar essas perguntas — nunca devem virar centenas de campos para o cliente. Nenhuma versão pode ser publicada com perguntas-pacote numeradas ou sem a Foto do Antes.

## 3 · Gate de prontidão

`readyForBuild:true` somente quando houver:

- o pacote 5+1 recebido ou pendências explicitamente aceitas;
- CRM confirmado e acessível;
- oferta, público, objetivo, preço/política e portas confirmados;
- qualificação comportamental e campos necessários;
- alçada até Agendado, handoff e dono humano;
- follow-up e recuperação em duas conversões;
- canal, mídia, coexistência e gate definidos;
- métrica norte, baseline e fontes definidos quando houver mensuração;
- Foto do Antes com período, fonte e confiança; se o dado não for confiável, a primeira entrega vira instrumentação;
- dono interno do CRM, SLA, distribuição, origens/UTM e definição de ganho/perda confirmados;
- automações coexistentes, riscos sensíveis/legais e cadeia de aprovação mapeados;
- cenários de eval e responsável pelo aceite;
- credenciais obrigatórias disponíveis sem segredo no ClickUp.

## 4 · Saída obrigatória da reunião

Em linguagem simples, registrar:

1. o que a IA fará;
2. o que a IA não fará;
3. quem ela procura quando precisa de ajuda;
4. como um lead avança no CRM;
5. como e quando ela faz follow-up;
6. quais números provarão resultado;
7. o que ainda falta e de quem depende;
8. cinco a dez testes que precisam passar.

Se qualquer item crítico estiver contraditório, marcar `A CONFIRMAR`; nunca escolher silenciosamente.
