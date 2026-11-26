# LAB 06.8 — Motor de Decisão Cognitiva
## Contrato
Taxonomia: hierarchical, relational, comparative, sequential, conditional, temporal, architectural, quantitative, simulation. Texto é abstenção de representação, não décima modalidade. O objetivo determina as escolhas; preferências por matéria só desempatarão candidatos locais sustentados e orientam o prompt semântico. A decisão contém nove avaliações (strong/possible/unsupported), objetivo, justificativa, primary e secondary distintas ou ausência explícita, evidências literais com ID, referência e remissão, versão SHA-256 da fonte efetiva, versão do contrato e viabilidade apurada no código, nunca pelo provedor. Alternativa local exige outra estrutura sustentada e compatibilidade heurística; não comprova equivalência pedagógica. Parecer semântico requer revisão humana: correspondência literal não prova pertinência, completude, fidelidade jurídica ou adequação do backup.
## Integração
### Regra de roteamento do Laboratório Visual

A unidade da escolha é o conceito. O assunto fornece contexto e a matéria desempata escolhas com evidência equivalente. A pergunta de recuperação identifica a relação que o aluno precisa reconstruir.

| Pergunta de recuperação | Estrutura | Forma possível |
|---|---|---|
| A que classe ou nível pertence? | Hierárquica | Árvore ou escada classificatória |
| A que elemento se liga e por quê? | Relacional | Grafo ou quadro de encaixe |
| Em que diferem sob o mesmo critério? | Comparativa | Matriz ou escada de requisitos |
| Qual operação vem a seguir? | Sequencial | Fluxograma ou esteira |
| O que se aplica neste caso? | Condicional | Árvore decisória ou quadro condição × consequência |
| Quando ocorre ou vence? | Temporal | Linha do tempo ou linha do ato |
| O que cada componente faz e como interage? | Arquitetônica | Diagrama funcional |
| Como se interpreta esta medida? | Quantitativa | Gráfico |
| Que resultado muda quando altero a entrada? | Simulacional | Instrumento interativo com regra explícita |

O conceito pode ter uma variação de forma dentro da mesma estrutura. Uma estrutura secundária precisa permitir a mesma recuperação e preservar as condições e o gabarito. O parecer semântico pode propô-la para revisão. A triagem local preserva a abstenção quando a fonte não sustenta uma escolha.

O parecer ordena estruturas sustentadas antes de indícios. Na triagem local, a evidência estrutural define a ordem dentro do grau de adequação e a matéria desempata. No parecer semântico, a estrutura vem acompanhada do trecho de apoio e da justificativa. A primeira candidata sustentada é a primária. As secundárias recebem uma ordem própria, reservada às propostas que preservam a ação, as condições e o gabarito. A alternativa fica pendente de revisão.

Dentro de cada estrutura, o formato vinculado ao conceito ou registrado para a tarefa aparece primeiro. O formato geral da taxonomia pode aparecer como referência de design. A posição expressa uma preferência de roteamento. Uma probabilidade calibrada exige comparar as decisões com avaliações humanas em uma amostra independente.

Na avaliação cega, registre primeiro o objetivo, as estruturas aceitáveis, as alternativas que preservam o objetivo e as subformas adequadas. Compare depois a primeira escolha e as duas primeiras candidatas com as escolhas humanas. Registre também as secundárias que mudam a tarefa e as abstenções em casos com boa evidência. Essas medidas orientam ajustes nos critérios de decisão e no limiar de abstenção.

O formulário offline, a adjudicação e as métricas estão descritos no [procedimento da Rodada Cega 01](RODADA_CEGA.md).

### Tarefa explícita e suficiência da fonte

O campo opcional **Tarefa de recuperação** fixa o objetivo para o conceito selecionado. Escreva uma ação por linha, com até seis ações e 500 caracteres no total. Ao solicitar uma análise semântica, o parecer apresenta, para cada linha, o trecho de apoio ou a informação que falta. A resposta precisa cobrir todas as linhas com seus índices e citar a fonte efetiva para cada ação sustentada. Quando uma ação não tem cobertura, o parecer se abstém antes de ranquear. Com o campo vazio, o motor infere o objetivo e o exibe.

A triagem local não confirma suficiência semântica de tarefas livres. O parecer para uma tarefa explícita pode recomendar a estrutura e a forma, e a construção da atividade precisa de validação própria para a mesma tarefa. Os testes da Rodada Cega 01 usam respostas de provedor simuladas para verificar o contrato e a abstenção pelos dados que faltam. A nova medição semântica exige uma amostra independente e execução com provedor real.

Entradas já implementadas no piloto incluem a linha do ato para plebiscito e referendo, o quadro de competências para titularidade e artigos, a escada de requisitos para idades por cargo e a esteira para a ordem das etapas da IA generativa. Cada vínculo é revalidado contra o nó efetivo e os trechos de apoio. O conceito selecionado segue para análise quando não tem atividade própria.

### Implementação da decisão
src/lib/nexo/cognitive-decision.js implementa decisão independente; effective-sources.js inclui filhos diretos limitados (2–8) no snapshot. server-fns.js: decideNexoRepresentation exige sessão/admin, refaz fonte efetiva, verifica hash antes de chamadas explícitas Base44/Gemini, não gera nem grava modelo. NexoDecisionDetails mostra primária, secundária, formato e viabilidade. NexoGeneratedAssociation e NexoRepresentationPlan usam a decisão; construção local somente da primária quando receita existente e revalidada; consulta semântica retorna parecer, construção é ação separada. Geração associativa anterior permanece explícita, vinculada ao provedor escolhido e expectedStructure. Encaixes relacionais não equivalem a grafo completo. Não há execução automática do backup, simplificação técnica, persistência ou autorização de publicação. Modelos específicos existentes permanecem.
## Auditoria reproduzível
node scripts/nexo/decision-audit.mjs
node scripts/nexo/decision-audit.mjs --effective
A primeira leitura inclui 403 nós de kits com referência específica: 44 escolhas, 359 abstenções, 2 backups, 8 modelos existentes, 16 receitas construídas, 20 sem gerador. A segunda normaliza os 11 kits reais via adaptStudy com entradas sintéticas de edital para escopo: 509 conceitos, 70 escolhas, 439 abstenções, 8 backups, 8 modelos existentes, 25 receitas construídas, 37 sem gerador; 0 bloqueios estruturais/falhas de gabarito. Ambas são auditorias locais, sem banco integral ou chamadas externas; não medem acerto pedagógico. Nove modalidades aparecem na segunda varredura, sem garantir correção. Exemplos a contestar: classificação condicional de Bobbio, temporal de sequência de fases/inversão, dependência dos sinais lexicais, relações com filhos, correspondência do objetivo entre primária/backup. Baixa cobertura local é conhecida. Dois sorteios por matéria disponível nos kits; não confundir com todos os assuntos do edital.
Regressão: 216 testes combinados, lint direcionado, build e inventário aprovados. Testes de provedor são simulados, não homologação real. Browser não inspecionado.
## Roteiro para auditor independente
1. Conferir diff desde 1e68e8c7afe404568f9c33d0dbf17b130345d397; revisar contrato, critérios de seleção e distinção entre classificação pedagógica e renderizador.
2. Executar ambos os scripts e testes; amostrar decisões, inclusive abstenções, fontes sem referência individual e casos com backup. Julgar semanticamente exemplos reais sem presumir que testes estruturais bastam. Verificar ambiguidades, falsos positivos/negativos, colisão de remissões, versionamento, privacidade, corridas na UI e compatibilidade do schema com provedores.
3. Verificar endpoint real no ambiente autenticado, somente com autorização/cota, pelo menos duas amostras por matéria, com registro de resposta, latência e falhas. Não expor chaves nem confundir mock com resposta real.
4. Verificar que a geração respeita primária, não executa código da IA e não ativa fallback, publicação, domínio ou SRS. Conferir se a UI mantém o contexto atual e se gerador secundário ainda não é acionado.
5. Emitir parecer independente com evidências, severidade e proposta de correção. Não alterar arquivos, não publicar nem promover branch sem autorização.
