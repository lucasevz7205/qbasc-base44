# QBAsc — Importação dos mecanismos e pegadinhas da versão 1 (15/11/2026)

Aplicativo alvo: **QBAsc / A Ascensão** (`6af8bc0e216be36fdba4378c`). O aplicativo original `6aef9673577cba58a2c91a3c` foi consultado em modo leitura e NÃO modificado.

## Proveniência V1

- `scripts/claude-seed/codigo_fonte/servicos/app.js` / `MEC`: 14 nomes, definições, sinais e vacinas.
- `scripts/pegadinhas-redesign.js` / `MEC_MEMORIA`: lemas curtos, perguntas de recuperação e ações preventivas.
- `public/claude-export/strategies.js` / `QBStrategy`: máximas estratégicas originais e adaptações inspiradas em Sun Tzu, Musashi, Clausewitz, Jomini e Maquiavel. **Não são citações textuais dos autores.**
- `src/lib/omnistudy-ai.js` / `ITEM_RULES`, `TUTOR_RULES`: regras de fidelidade à fonte, evidência e gabarito, confiança antes de correção, não inventar jurisprudência/incidência, e retorno à evocação ativa.
- `scripts/claude-seed/pegadinhas.json`: 186 pegadinhas únicas (80 com código F/V explícito; 106 sem código), com regra, sinal, referência, tipo, assunto e IDs de questões; copiadas sem atribuir classificações ausentes.

## Taxonomia canônica

Itens errados: F1 generalização, F2 restrição indevida, F3 troca de conceito, F4 detalhe alterado, F5 regra/exceção, F6 relação lógica alterada, F7 extrapolação, F8 fonte superada, F9 composição, F10 reescrita.

Itens certos que parecem errados: V1 paráfrase fiel, V2 incompleto não é errado, V3 alcance verdadeiro, V4 exceção real.

**Esta nomenclatura é uma taxonomia pedagógica interna do Quebrando a Banca, NÃO um sistema oficial de classificação publicado pelo CEBRASPE.**

## Implementação no QBAsc

- `src/lib/cebraspe-v1-taxonomy.js`: única fonte de verdade para os 14 mecanismos, lemas, máximas, perguntas, vacinas, classificação válida (F→E; V→C) e regras textuais para IA.
- `src/lib/mindmap-gan.js`: geração de questões e análise GAN passam a usar V1; não inserir F3/V1 como classificação arbitrária. Um resultado com código F/V incompatível com o gabarito final é bloqueado.
- `src/lib/question-feedback.js`: opções de identificação de mecanismo e feedback seguem V1; registros GAN de outra taxonomia com mesmo código e nome diferente são sinalizados, não convertidos nem sobrescritos.
- `src/components/qb/questions/QuestionFeedback.jsx`: exibe pistas, pergunta preventiva, vacina, ação e máxima adaptada após revelar a resposta; preserva o recurso de análise posterior do Arquiteto adicionado por outro agente.
- `src/lib/server-fns.js`: o tutor em modos Banca/Armadilhas, o tutor geral e a curadoria incorporaram regras V1: evidência para C/E, referência verificável, apenas uma pergunta por vez e nenhuma alegação inventada de frequência da banca.
- `src/lib/cebraspe-v1-performance.js`: desempenho calculado apenas a partir dos dados reais do aluno, sem atribuir incidências de provas.
- `src/components/qb/study/PegadinhasLab.jsx`: 14 cartões acessíveis e recolhíveis, filtros por matéria e necessidade de prática, estatísticas individuais e remissão para treinar questões cujo vínculo existe.
- `src/data/pegadinhas-v1.json` e `src/components/qb/study/AcervoPegadinhasV1.jsx`: 186 registros em acervo pesquisável com referência histórica e treino direto por qids que também existam no QBAsc. Os 106 sem classificação permanecem sem F/V. As fontes do acervo não foram verificadas independentemente.

## Preservação
Nenhuma escrita foi realizada nas coleções de produção `questoes`, `respostas`, `revisao`, `cartoes_aval`, `analise` ou `pegadinhas`; o acervo V1 foi armazenado como **recurso estático de referência**, não como migração de registros para o banco. O histórico de estudo, identidade das questões, links entre nós e notas individuais permanecem intactos.

## Validação / limitações
- Testes automatizados: 56/56 aprovados, incluindo 9 testes novos sobre nomenclatura, compatibilidade, acervo, estatísticas, GAN, remissões e instruções.
- Build aprovado; lint aprovado após a resolução de uma falha de lint transitória em arquivo editado simultaneamente por outro agente.
- Pendente: validação visual navegando por sessão autenticada e conferência manual de correspondência de qids da V1 no banco QBAsc.
- Geração com IA ao vivo não foi acionada neste processo; a validade substantiva das questões geradas depende da qualidade da fonte e de auditoria.
