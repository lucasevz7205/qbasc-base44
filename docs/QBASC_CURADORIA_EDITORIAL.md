# QBAsc — Curadoria editorial e seleção do Arquiteto (15/11/2026)

Aplicativo de destino: **QBAsc — A Ascensão**, ID `6af8bc0e216be36fdba4378c`. Nenhuma alteração no Quebrando a Banca original.

## Interface
1. `FlashcardCorrection`: começa recolhido; botão expande/recolhe, preserva resposta digitada e feedback ao recolher.
2. `EditorialCurator`: botão recolhível `O Arquiteto · Reformular questão/flashcard`, seleção de problema, observação, proposta Gemini, comparação original/proposta, campos editáveis e confirmação explícita.
3. `SocraticChat`: seleção de matéria e assunto pelo `StudyTopicPicker` já usado na Ascensão, com pesquisa e hierarquia, no lugar dos dois selects HTML.

## Processo editorial
- A IA apenas **sugere** alterações sob clique, usando exclusivamente os textos do item fornecido. Sem fallback para Base44 na curadoria.
- Para questões, a ação aparece após a resposta ser revelada e somente para itens presentes no banco; evita vazamento prematuro de gabarito e gravações de itens temporários do GAN.
- Para flashcards, a proposta aparece em painel separado da correção ativa e da autoavaliação SRS.
- A proposta é editável e **nunca** aplicada antes de `Aprovar e salvar nova versão` + checkbox de revisão humana.
- A coleção `ClaudeDocument` usa `collection=curadoria` e IDs `question:<id>:v1`, `flashcard:<id>:v1` etc.; cada versão é um novo documento imutável (sem sobrescrever `questoes`, `revisao` ou `cartoes_aval`).
- `adaptStudy` aplica a revisão aprovada somente na apresentação e em tentativas futuras; os registros originais permanecem em `records`.
- Vínculos e identificadores de questões e nós permanecem os mesmos.
- Questões reformuladas recebem aviso `Reformulada · não é item original`.
- A classificação das respostas de uma sessão é congelada em `keyAtAnswer`; a resposta persistida registra `gabaritoUsado` e versão editorial. O histórico anterior não é recalculado.
- A revisão editorial de cartões não altera a classificação subjetiva, intervalos, SRS e agendamentos.

## Segurança/custos
- `proposeEditorialRevision` exige `requireUser` e papel admin, valida tipos e comprimentos e só chama `invokeGeminiTutor`.
- Uma chamada à IA é enviada apenas quando o usuário clica `Analisar e propor reformulação`; a aprovação salva a versão sem gastar tokens de IA.
- O segredo é lido exclusivamente no backend, priorizando `Arquiteto` (ou `ARQUITETO`/`GEMINI_API_KEY`).
- A Base44 não é fallback automático na curadoria.
- Não há validação factual automática de legislação e jurisprudência; o usuário deve conferir a fonte antes de aceitar mudanças de mérito.

## Homologação
- `node --test tests/*.test.mjs`: **19/19**
- `npm run build`: aprovado
- `npm run lint`: aprovado
- Testes com Gemini real autenticado **ainda não realizados**; não afirmar que a chave/cota estão confirmadas só pela presença na tela de Secrets.
- Revisão visual de fluxo autenticado pendente de execução manual no domínio publicado.
- Outros agentes atualizaram paralelamente componentes de mapas e flashcards na mesma main; checkpoint inclui o estado de código completo, inclusive essas mudanças.

## Recomendações de teste
1. `/flashcards`: verificar expansão/recolhimento da correção, digitar resposta, executar correção, fechar/reabrir sem perder feedback, propor revisão e descartar proposta.
2. Revisar um cartão, confirmar a nova versão e verificar que ID/nó/agendamento permanecem iguais.
3. `/questoes`: responder uma questão e só após gabarito usar botão de reformulação; verificar parecer, aprovação e distinção do item original.
4. `/tutor`: abrir seletor, buscar matéria/assunto, confirmar mudança de contexto e retorno sem recarregar.
5. Conferir no painel da API Gemini a chamada e o custo antes de uso em volume.
