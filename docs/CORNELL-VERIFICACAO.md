# Verificação pedagógica do Cornell

A ação **Analisar com O Arquiteto**, dentro da Verificação do Arquiteto, avalia uma cópia das anotações originais, pares de pistas/notas e ambas as sínteses. Usa Gemini pela API já configurada do Arquiteto, sem fallback para créditos de IA Base44. Uma segunda chamada ocorre apenas ao solicitar **Avaliar minha resposta**.

## Instrução de análise

A instrução completa está em `src/lib/cornell-assessment.js`, na constante `CORNELL_ANALYSIS_INSTRUCTIONS`. Ela determina:

1. Examinar o conteúdo escrito, a precisão dos conceitos, as condições e os contrastes. Não confundir repetição de palavras, formatação ou cópia de uma fonte com entendimento.
2. Verificar as relações explicadas: causa/consequência, condição/exceção, diferenças entre conceitos próximos e aplicação a um exemplo.
3. Comparar com os trechos selecionados do acervo da matéria e com fontes originais fornecidas pelo estudante. Os enunciados C/E não são usados como fatos; somente seus fundamentos entram pelo coletor existente.
4. Usar o mapa como roteiro de possíveis lacunas, respeitando o recorte estudado. Ausência de um termo não comprova erro ou desconhecimento.
5. Devolver comentário específico, acertos com evidência nas notas, lacunas classificadas, nota provisória e orientação de estudo ativo.
6. Propor uma pergunta inédita de evocação/aplicação, sem entregar a resposta. Pedir confiança antes da avaliação. Comentar a resposta efetivamente fornecida e orientar o próximo passo.

## Nota e evidências

Quatro critérios de até 2,5 pontos: precisão conceitual; relações entre ideias; cobertura do assunto; síntese e evocação. Cada um exige uma justificativa. Notas positivas exigem evidência localizada nas anotações. Precisão exige também citação localizada em um trecho enviado; cobertura exige mapa. Critério sem base fica sem nota. Se houver critérios não avaliáveis, o painel avisa que a avaliação é parcial e a nota é proporcional aos critérios avaliados, em escala de 0 a 10.

Localizar uma citação no texto não comprova a vigência, autenticidade ou a interpretação correta da fonte. Conteúdos derivados do acervo podem ter erros. Um possível erro sem citação localizada recebe estado de conferência pendente.

A nota avalia o caderno, não mede a pessoa ou a retenção. Sem tentativa, o resultado é sempre **Compreensão ainda não testada**, mesmo que o modelo responda diferente. A confiança não aumenta a nota. Uma resposta pode demonstrar compreensão nesta tentativa, ser parcial ou revelar uma lacuna; não comprova retenção de sete dias.

## Contexto, estados e preservação

- O contexto é o acervo já carregado e autorizado na conta, limitado à matéria pelo coletor existente. A seleção prioriza o assunto, trechos relacionados às notas e fontes fornecidas. Não há busca externa automática nem acesso ao acervo de outras contas.
- Limites: caderno com até 40 mil caracteres; mapa com até 100 tópicos; até dez trechos com orçamento total de 22 mil caracteres; resposta com até três mil caracteres. O painel informa quando o contexto foi recortado.
- Caderno ou fontes alterados tornam o parecer desatualizado. Antes de avaliar a resposta, o outro caderno é novamente conferido. Uma resposta editada precisa ser avaliada novamente.
- O parecer, a nota e a tentativa ficam em memória no painel. Não alteram anotações, respostas históricas, SRS, status do edital ou estatísticas.
- Mantida a autorização administrativa do Cornell existente. Nenhum schema ou permissão foi ampliado.
- Em falha da API, não se inventa parecer e não se grava nada. Quando já disponível, a comparação local permanece acessível.

## Validação

165 testes automatizados aprovados, incluindo 16 novos testes de nota, evidências, preservação, contexto, autenticação, limites e integração do servidor. Integração Gemini testada com transporte simulado; nenhuma geração real foi feita para esta validação. Lint dos arquivos alterados aprovado; o lint global mantém cinco erros preexistentes de `URL` não definido em três arquivos de testes antigos.

Componentes reais verificados em navegador isolado, com respostas simuladas: Chromium 1280×900, 320×740 e 390×844; WebKit 768×600 e 844×390. Foram verificados nota, evocação, confiança obrigatória, avaliação da resposta, edição, parecer desatualizado, falha da API e ausência de rolagem horizontal. Capturas usam dados fictícios de teste, sem dados de estudantes.

As alterações ficam na prévia do Base44 até a publicação pelo responsável. Não houve publicação automática ou alteração de dados de produção.
