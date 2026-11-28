# Kit LG-3.2 · Ideia principal e detalhes de apoio (Linguística · Câmara · ARR)

Gerado em 27/11/2026. Edital: Linguística, item 3.2. Meta no Tutory: sábado 28/11 (Resumo/Mapa mental, Exercício, Revisão). Nada foi marcado no Tutory.

## Fontes lidas
- `material/texto/Linguística/3. Leitura. Compreensão literal, Ide.txt` (Aula 3 de Linguística): seções do próprio PDF 1.5 Dissertação (p. 38 a 40) e 1.9 Interpretação e Compreensão (p. 62 a 67).
- `material/texto/Língua Portuguesa/.../11. Compreensão e intelecção de text.txt` (Aula 11 de Língua Portuguesa): estrutura argumentativa, fórmulas de introdução, tópico frasal e estratégias de desenvolvimento (p. 36 a 49), itens comentados (p. 43, 46, 68 e 69).
- Não usei NotebookLM, Downloads nem outro kit como fonte. Os números de página são os do rodapé dos próprios arquivos de texto.

## Arquivos
- `mapa.json`: 7 ramos (sem folhas), cada um com explicação `e`, exemplo `ex`, armadilha `trap` e fonte `src`; 5 ligações.
- `cartoes.json`: 21 cartões atômicos (3 por nó), com `tipo`, `fonte` e, quando há inferência ou divergência, `explicacao`.
- `itens.json`: 21 itens C/E (10 C, 11 E), todos "inédito Claude", com mecanismo V1/F, evidência, vacina e comentário que cita a aula entre aspas.

## Cobertura
Cada um dos 7 nós tem 6 itens (3 cartões + 3 questões), acima do mínimo de 5 da regra de 26/11. Conferido por script: nenhum nó abaixo de 5.

## Conferência feita
Script confere que cada trecho entre aspas “…” nos comentários, contextos, exemplos e cartões existe literalmente (espaços normalizados, cabeçalhos de página removidos) nas duas aulas: 52 trechos, 0 falhas. Os testes `central-kits`, `item-quality`, `flashcard-standard` e `flashcard-methodology` passam com o kit na pasta.

## Divergências e limites (não resolvidos em silêncio)
1. **Numeração.** O PDF da Aula 3 chama de "3.2" a Análise do Discurso; o item 3.2 do edital é "Ideia principal e detalhes de apoio". A Etapa 08 do Legislativo Facilitado lista o 3.2 como "outra etapa", que não está na pasta. Por isso este kit usa a Aula 3 (1.5 e 1.9) e a Aula 11. Se a etapa do 3.2 chegar, vale cruzar com ela.
2. **"Detalhes de apoio" não é definido literalmente** em nenhuma das aulas. Usei "argumentos de apoio" (Aula 11, p. 36) e "ideias secundárias" (Aula 3, p. 65). A definição de ideia secundária no cartão lg-3-2-c03 é inferência do kit, marcada como tal.
3. **Posição do tópico frasal.** A Aula 3 (p. 39) diz "em geral, é o primeiro período"; a Aula 11 (p. 40) diz "geralmente vem no início (não necessariamente)" e mostra exemplo em que ele vem após a estatística (p. 48). Os itens 7 e 8 e o cartão lg-3-2-c08 refletem a versão mais cautelosa.
4. **Erro de digitação do original**: Aula 3, p. 67, "baseada e pressupostos"; li como "baseada em pressupostos" e registrei no comentário do item 19.
5. A Aula 11 pertence ao curso do cargo Processo Legislativo e Gestão (mesma editora); o texto sobre estrutura dissertativa é praticamente o mesmo da Aula 3.
6. Os itens 11, 14, 20 e 21 partem de trechos e itens comentados nas aulas (FGV/MP-GO 2022, prova de introdução, CESPE 2023 Fortaleza, texto de Eco). Não tive os originais das provas, só o que está nas aulas.

## Pendências
- `gabaritoDiscriminador` está `null` em todos os itens: não rodei discriminador cego (GPT/Google). Os gabaritos são do gerador. Convém passar pelo fluxo de confronto antes de contar como validado.
- Não passei pelo fluxo completo de modelos (mapa, revisão, cartões, itens, conferência em modelos diferentes): a geração e a conferência por script foram feitas numa só sessão. Vale uma revisão cega, se o Lucas quiser.
- Forma visual no Laboratório (NEXO) não foi feita: o kit só entra com texto.
- Kit ainda não publicado: aparece no app só depois de merge e rebuild.
