# Revisão do mapa — Aula 02 (CP, Estratégia)

Arquivos: `saida/aula02/mapa.json` x `fontes/aula02.paginas.txt` (páginas = "=== PÁGINA N ===").

Checagens que passaram:
- Os 60 nós têm `x` (e, src, cit).
- Todos os `cit` aparecem literalmente na página citada.
- Não há ramo vazio nem nó solto, e a árvore ramo > microtópico > folha está correta.
- Nenhum conceito, nome, autor ou regra do mapa contradiz a fonte (Lenza, Dallari, Rua, Rui Barbosa, Bonavides, Duverger, Schumpeter, Dahl, Pateman, Habermas e V-Dem conferem).

Os problemas são omissões e citações de página imprecisas, em ordem de gravidade.

## Pendências (do mais grave ao menos grave)

1. **(sem nó) lacuna: tipos de democracia, pp. 58-62.** Tipo: `sem fonte` (conteúdo da fonte ausente do mapa).
   - Fonte, p. 58: "Tipos de democracia ... Democracia Deliberativa ... (Habermas)"; p. 59: "Democracia Igualitária ... (Rawls)"; p. 60: "Democracia Eleitoral"; p. 61: "Democracia Liberal" (autor associado: Schumpeter, na p. 61; Mill, na p. 62); p. 62: "Democracia Participativa (Pateman)".
   - Correção: criar microtópico sob `est-a02-r8` com os cinco tipos, a definição de cada um e o autor associado pela fonte.
2. **(sem nó) lacuna: características da democracia contemporânea segundo Bobbio (9) e Bonavides (8), pp. 57-58.** Tipo: `sem fonte`.
   - A fonte marca como "Queridinhos da Banca" (p. 57): "1) o órgão político máximo ... deve ser composto de membros direta ou indiretamente eleitos pelo povo ... 9) o órgão do Governo deve gozar de confiança do Parlamento". Bonavides, p. 57-58: "1) a soberania popular como fonte de legitimação ... 8) as minorias políticas podem se fazer presentes".
   - `est-a02-r8` usa como `cit` a frase de Bobbio da p. 57, mas nenhum filho a desenvolve.
   - Correção: criar um nó para Bobbio e outro para Bonavides com as listas, ou trocar o `cit` da raiz.
3. **(sem nó) lacuna: Tocqueville e Stuart Mill (liberdade x igualdade, tirania da maioria), pp. 12-15; soberania x autonomia, p. 10; remédios dos Federalistas, p. 11.** Tipo: `sem fonte`.
   - Fonte, p. 12: "atenção a essa parte da aula". Na p. 14 aparecem "tirania da maioria" e as três liberdades de Mill. A p. 15 traz a questão CEBRASPE/Câmara 2012 sobre Mill, que a fonte dá como Errado.
   - Na p. 10: "Soberania é o poder exclusivo e absoluto do Estado ... Autonomia é ..." e, na p. 11, a lista de quatro remédios dos Federalistas.
   - Correção: acrescentar microtópicos em `est-a02-r2` (soberania x autonomia, remédios dos Federalistas) e um ramo ou microtópico para Tocqueville e Mill.
4. **est-a02-r8.2.1 (Poliarquia e graus de regime).** Tipo: `sem fonte` (omissão) e `estrutura`.
   - O título promete "graus de regime", mas o nó não traz os quatro tipos de Dahl. Fonte, p. 50: "hegemonia fechada ... oligarquia competitiva"; p. 52: quadro Contestação x Participação (Poliarquia = alta/alta; Oligarquia competitiva = alta contestação/baixa participação; Hegemonia fechada = baixa/baixa; Hegemonia inclusiva = baixa contestação/alta participação).
   - A p. 52-53 traz uma questão sobre isso.
   - Correção: criar filhos para os quatro regimes ou incluí-los no `e`.
5. **est-a02-r4.2.2 (Veto).** Tipo: `erro` de citação de página.
   - O `e` afirma "meramente impeditivo e relativo ... por maioria de dois terços", mas `src` e `cit` apontam a p. 28, que só diz "o poder de veto para evitar o risco de uma ditadura legislativa".
   - O conteúdo está na p. 32, item e), de Bonavides: "caráter relativo daquela faculdade, meramente impeditiva ... maioria de dois terços".
   - Correção: `src` "pp. 28 e 32" e incluir a atribuição a Bonavides. O trap já cita p. 32.
6. **est-a02-r4.2.3 (Impeachment).** Tipo: `erro` de citação de página.
   - A regra "só cai por crime de responsabilidade" está na p. 31: "existem apenas duas formas institucionalizadas de derrubar ou mudar o governo: eleições ... ou impeachment ... por crime de responsabilidade".
   - O `src` aponta a p. 29, onde está só a opinião de Temer. A nota "texto embaralhado" subestima a p. 31, que é legível.
   - Correção: `src` "p. 31" e `cit` de lá.
7. **est-a02-r6.2.1 (Democracia direta e indireta).** Tipo: `erro` (conceito ambíguo, herdado da fonte).
   - A fonte p. 37 define direta/indireta pela escolha do presidente. A fonte p. 44, no outro ramo, define pelo exercício do poder: direta = povo; indireta = representantes; semidireta = "mix".
   - O mapa reproduz as duas definições sem avisar que são distintas, e `est-a02-r7.4` não as liga a `est-a02-r6.2.1`.
   - Correção: acrescentar nota/trap dizendo que p. 37 trata da escolha do presidente e p. 44 do exercício do poder, e ligar os dois nós.
8. **est-a02-r8 (raiz).** Tipo: `erro` (framing).
   - O `e` junta "desafio da democracia digital" à crise. A fonte (p. 66) trata democracia digital como seção própria, que complementa a representação, não como crise.
   - O `cit` (Bobbio, p. 57) não corresponde ao conteúdo que o nó resume.
   - Correção: reescrever `e` e `cit` da raiz para cobrir teorias (Schumpeter a Habermas) e crise.
9. **est-a02-r6.3.1 (Autocracia).** Tipo: `estrutura`.
   - Está sob "Autocracia e transição de regime" (r6.3), mas é par de "democrático" (r6.2). Fonte, p. 37-38: "⇨ Democracia ... ⇨ Ditaduras ... Transições de Regime Político".
   - Correção: mover para filho de `est-a02-r6.2`.
10. **est-a02-r5.4 (trap).** Tipo: `sem fonte`.
    - O trap diz "não é a regra do presidencialismo", mas a fonte (p. 31) só diz que o regime de coalizão é fundamental nos parlamentos multipartidaristas.
    - Correção: remover o trecho sobre o presidencialismo ou marcá-lo como inferência.
11. **est-a02-r8.3.1 (Pateman).** Tipo: `erro` de citação de página.
    - O `e` usa a "função só de proteção" da teoria contemporânea (p. 53) com `src` p. 54, e o `cit` é só um fragmento ("A principal função dessa participação, então, segundo a autora,").
    - Correção: `src` "pp. 53-54" e `cit` com "é educativa; educativa no mais amplo sentido da palavra".
12. **Lacunas menores (sem pendência de erro):**
    - p. 24-26 e 32: Azambuja, Bonavides (tripartição x equânime), requisitos do presidente do item a) ao g) e a ressalva de Dallari sobre o semipresidencialismo (partidos estruturados).
    - p. 41-42: Sólon, Clístenes e os 40 mil cidadãos de 320 mil em Atenas.
    - p. 43: Idade Média, absolutismo e Hobbes.
    - p. 45-46: Tocqueville sobre partidos e definição de Burke.
    - p. 47-48: Le Bon.
    - p. 49: as três condições de Dahl.
    - pp. 18-19: federalismo fiscal.
    - Correção: incluir os mais cobráveis (Azambuja, condições e garantias de Dahl, Burke) como folhas.

**Veredito: REPROVADO.** Bloqueiam as pendências 1 a 6; as 7 a 11 podem ir junto na mesma rodada de correção.
