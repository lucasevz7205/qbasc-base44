# Complemento de Ciência Política com o Estratégia (aulas 00 a 05)

Rascunho para validação do Lucas. **Não está em `src/data/kits`**, portanto não é carregado pelo app e não altera nada.

Fonte única: Estratégia Concursos, Ciência Política para a Câmara dos Deputados (Analista Legislativo, Registro e Redação), Prof. Ale Lopes, aulas 00 a 05. Nada do Legislativo Facilitado nem conhecimento externo.

| Aula | Assunto | Tópico (mapa) | Nós | Cartões | Itens |
|---|---|---|---|---|---|
| 00 | Ciência Política e teoria política | cp-0 | 101 | 191 | 119 (61C/58E) |
| 01 | Teoria do Estado | cp-9 | 80 | 118 | 98 (49C/49E) |
| 02 | Regimes, formas e sistemas de governo, democracia | cp-2 | 83 | 155 | 105 (53C/52E) |
| 03 | Separação e relações entre poderes | cp-4 | 67 | 105 | 88 (44C/44E) |
| 04 | Partidos, representação e sistemas eleitorais | cp-6 | 95 | 129 | 114 (61C/53E) |
| 05 | Formação do Estado brasileiro, partidos e voto | cp-10 | 58 | 75 | 75 (37C/38E) |
| | Total | | 484 | 773 | 599 |

## Regra de fonte literal com página
Cada nó do mapa (`x.cit`), cada cartão (`citacao`) e cada item (`evidencia`) traz um trecho copiado da página do PDF indicada (`Aula NN, p. X`). O validador `_ferramentas/validar_complemento.py` confere a literalidade contra o texto extraído por página e a cobertura (todo nó com cartão e item). As seis aulas passam. A página é a do rodapé "n/total" do PDF.

## Fluxo seguido (kit-de-estudo)
1. Mapa: Haiku. 2. Revisão do mapa: Sonnet (aulas 00, 02 e 05 reprovadas e corrigidas em uma rodada; 01, 03 e 04 aprovadas com pendências leves). 3. Cartões: Opus. Itens C/E: Sonnet, origem `inédito Claude`. 4. Conferência: Opus, com classificação cega do gabarito antes de ver o registrado; 0 discordâncias de gabarito. Descartados 7 itens e corrigidos 58; 8 itens de reposição cobriram os nós que ficaram sem item. 5. Formatação e validador.
Os revisores ficaram em `_revisao/`.

## Pendências e cuidados (registradas, não resolvidas)
- Tópicos: a Aula 00 (Ciência Política e teoria política) não é tópico numerado do Cargo 11; foi marcada `cp-0`. Cada mapa tem `topicosEdital`, e cada item e cartão traz `topico`. Para importar, é preciso decidir se vira kit separado ou se é mesclado em cp-1 a cp-11 (ids já são únicos, prefixo `cp-eNN`, nós `est-aNN`).
- Divergências e erros do texto-fonte estão em `nota` nos nós (por exemplo p. 36 da Aula 02 "sistema e governo"; CVM/SEC na p. 51 da Aula 01; Comício da Central 300 mil x 150 mil na Aula 05). Itens que dependiam disso foram evitados ou descartados.
- Páginas com texto embaralhado na extração (colunas): só usei trechos contíguos. Se quiser conferência visual, os PDFs são os da pasta material.
- Mecanismo (F1 a F6, V1 a V4): o revisor registrou em `mecanismo_cego` onde discordou do rótulo; os gabaritos coincidem em todos.
- Nada foi gravado em `respostas` nem em `status` do edital.
