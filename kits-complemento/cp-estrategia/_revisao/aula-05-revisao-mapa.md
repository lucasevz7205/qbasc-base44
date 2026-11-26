# Revisão do mapa da Aula 05 (cp-10/cp-11/cp-7)

Fonte: fontes/aula05.paginas.txt. Verificado por script: todos os nós têm `x.e`, `x.src` e `x.cit`; 66 de 67 `cit` aparecem literais na página citada (exceção no item 3). Estrutura ok (ramo -> microtópico -> folha, sem nó solto).

## Pendências (da mais grave à menos grave)

1. **est-a05-r6.3** | tipo: `erro` | Mapa diz que as regras do AC-4 "tornaram viável apenas a criação de dois partidos". Fonte p. 78: "Era necessário a presença de, no mínimo, 120 deputados federais e 20 senadores... Na prática seria possível três partidos, mas a maioria dos Congressistas preferiu aderir à legenda de apoio ao regime. Assim, formaram-se 2 partidos". | Correção: trocar por "o AC-4 permitia na prática três partidos, mas a maioria aderiu à legenda governista e só dois se formaram (ARENA e MDB)", e ajustar o `trap`/`n` conforme.

2. **est-a05-r7.1** | tipo: `erro` (de redação, induz a confusão) | `trap` diz "O texto atribui à EC 25 o voto dos analfabetos (p. 95), e à CF de 1988 a sua constitucionalização", sem que `x.e` fale disso. Fonte p. 95: "esse direito foi conquistado com a Emenda Constitucional número 25, de 1985, mas constitucionalizado em 1988". A p. 87 e a p. 96 de 1988 dizem que os analfabetos passaram a votar "pela primeira vez em cem anos" com a Constituição, o que o próprio texto trata de forma ambígua. | Correção: reescrever o `trap` em uma frase clara ("a p. 95 diz que o voto do analfabeto foi conquistado pela EC 25/1985 e constitucionalizado em 1988; a p. 87 o associa à CF/88") e incluir esse ponto em `x.e`, sinalizando a ambiguidade da fonte.

3. **est-a05-r7.2.1** | tipo: `cit` não literal | `cit` é "I - obrigatórios para os maiores de dezoito anos; [...] II - facultativos para:" (colagem com "[...]"). Fonte p. 96: "§ 1º O alistamento eleitoral e o voto são: I - obrigatórios para os maiores de dezoito anos; II - facultativos para: a) os analfabetos; b)..." | Correção: usar um trecho contíguo, por exemplo "I - obrigatórios para os maiores de dezoito anos; II - facultativos para: a) os analfabetos;".

4. **est-a05-r1.2.2** | tipo: `fidelidade` (página) | `src` p. 20 e `x.e` listam "nomear e destituir ministros e senadores, ... vetar leis, ... nomear presidentes de província". Fonte p. 20 só cita "destituir e nomear ministros, dissolver a Câmara... e adiar a escolha dos senadores"; "nomear senadores, juízes, presidentes de província" e "vetar" estão na p. 19 (Lúcia Bastos Pereira Neves). | Correção: citar p. 19-20 e separar "nomear senadores" (p. 19) de "adiar a escolha dos senadores indicados pelas províncias" (p. 20).

5. **est-a05-r2.2.1** | tipo: `sem explicação` (decodificação vazia) | `x.e` diz "Frase do texto sobre a alternância" sem citar a frase. Fonte p. 30: "nada se assemelha mais a um saquarema do que um luzia no poder". | Correção: escrever a frase na explicação e explicar "luzia = liberal" e "saquarema = conservador".

6. **est-a05-r3.4 / r3.4.1 / r4 / r3.1** | tipo: `fidelidade` (página) | `src` p. 42 (r3.4), p. 40 (r3.1) e p. 51 (r4) não cobrem tudo o que a explicação afirma: a ruptura da aliança São Paulo-Minas e a Aliança Liberal estão na p. 49 e a posse em 3/11/1930 na p. 50; mandato de quatro anos e sufrágio direto de 1891 na p. 41. | Correção: ajustar o `src` para as páginas que de fato contêm cada afirmação (p. 49-50; p. 41).

7. **est-a05-r8.2** | tipo: `fidelidade` (página) | `x.e` cita "tabela da p. 86", mas `src` e `cit` apontam a p. 85; a tabela com 1891, 1930, 1937, 1966, 1968 e 1977 está na p. 86. | Correção: `src` "p. 85-86".

## Conferido sem pendência
Datas, nomes e regras de: Independência (p. 9-10), Poder Moderador, parlamentarismo de 1847 (p. 31), renda 400/800 mil réis (p. 24), Lei Saraiva (p. 38), Política dos Governadores (p. 42), Código de 1932 e classistas (p. 51-52), Lei Agamenon (p. 54), PSD/UDN/PTB/PCB (p. 56), plebiscito de 1963 (p. 65), Reformas de Base (p. 66-67), Castelo Branco (p. 74), Código de 1965 e Lei Falcão (p. 77, 79), PT e Meneguello (p. 82), Diretas Já e Emenda Dante (p. 83), EC 25 (p. 87), Constituinte (p. 88), art. 14 e 17 (p. 96-98) e urna eletrônica (p. 103). Todos batem com a fonte.

**REPROVADO** (bloqueia o item 1, erro conceitual sobre o AC-4; os itens 2 e 3 também devem ser corrigidos antes da geração de itens).
