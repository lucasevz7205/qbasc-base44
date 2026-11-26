# Revisão do mapa da aula 03 (Estratégia, CP)

Resultado: **APROVADO** (sem pendência grave). 67 nós conferidos contra `fontes/aula03.paginas.txt`.

Verificações feitas
- Fidelidade: conceitos, nomes, autores e regras conferem com a página citada (Aristóteles, Locke 1690, Montesquieu 1748, Federalistas, EUA 1787, Abranches, Linz, Bonavides, Almeida 2020, Arantes 2023, Campante, Avritzer, IPEA 2021, Evans, Santos). Art. 2º e art. 60, § 4º, III (p. 7-8) corretos; veto derrubado por maioria absoluta (p. 33); plebiscitos de 1963 e 1993 corretos; Senado por majoritário simples (p. 31).
- `cit`: automático, todos os 67 trechos são literais e aparecem na página indicada em `src`.
- Estrutura: árvore ramo, microtópico e folha, sem nó solto nem ramo vazio. Todo nó tem `n`, `e`, `trap`, `src` e `cit`.
- Erro conceitual: nenhum encontrado.

Pendências leves (não bloqueiam), da mais à menos relevante
1. est-a03-r2.3, tipo erro de redação em `trap`: "Tratar a separação como ampliação das pétreas" é obscuro. Fonte p. 7-8: "a abolição da separação dos Poderes é proibida, tratando-se de cláusula pétrea" (art. 60, § 4º, III). Correção: trocar por "Achar que a separação dos Poderes pode ser abolida por emenda; é cláusula pétrea".
2. est-a03-r3.3 (src p. 24) e est-a03-r3.3.1 (src p. 23), tipo estrutura: o filho cita página anterior à do pai. Fonte p. 23-24. Correção: conferir a ordem e, se quiser, inverter as `src` para seguir a sequência do texto.
3. est-a03-r5.1, tipo estrutura de `src`: a eleição indireta pelo Congresso aparece na p. 24 (final) e continua na p. 25; o `cit` está na p. 25. Correção: indicar "p. 24-25" em `src`.
4. `fontesCentral` está vazio ({}): sem pendência de fidelidade, só confirmar que é esperado nesse complemento.
