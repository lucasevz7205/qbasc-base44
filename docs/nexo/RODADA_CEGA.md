# Nexo · Rodada Cega 01

O piloto avalia a adequação das decisões do Nexo com os kits efetivos da shadow. A amostra é dirigida e inclui dois controles de insuficiência de fonte. As tarefas são fixadas no pacote entregue aos avaliadores. O comparador atual é offline. Ele registra o que o motor local recomenda quando recebe a fonte e escolhe seu próprio objetivo. Os controles medem o efeito desse descompasso com a tarefa fixa e aparecem num grupo próprio.

## Avaliação independente

1. Entregue apenas `avaliadores/avaliacao.html` a cada um dos dois avaliadores. O arquivo abre no navegador e dispensa login, instalação ou internet.
2. Cada avaliador usa seu próprio identificador e registra a primária ideal, as outras primárias aceitáveis, as secundárias equivalentes, as subformas, a resposta esperada e a evidência. A opção **Abster** registra insuficiência para a tarefa.
3. Salvar rascunho permite continuar depois. Ao terminar, cada avaliador exporta seu parecer JSON. As duas respostas devem ser preenchidas independentemente.
4. Preserve `avaliadores/compromisso.json` junto com os pareceres. O HTML registra o mesmo hash em cada exportação e as previsões congeladas ficam em `operador/predicoes.json`.

## Concordância e adjudicação

Execute os comandos a partir do repositório. Para preparar uma nova cópia da rodada em outra pasta vazia, use:

```powershell
node scripts/nexo/blind-round.mjs preparar CAMINHO_NOVO
```

Depois de receber os dois pareceres completos, calcule a concordância:

```powershell
node scripts/nexo/blind-round.mjs concordar CASOS.json PARECER_A.json PARECER_B.json NOVA_PASTA
```

O comando produz `concordancia.json`, com acordo bruto, kappa de Cohen e matriz de discordâncias, e `adjudicacao-rascunho.json`. Abra o rascunho no mesmo formulário e resolva os campos em branco com a fonte. Consulte os pareceres originais em `concordancia.json`. Exporte o arquivo final de referência antes de abrir as previsões.

Execute a comparação após fechar a referência:

```powershell
node scripts/nexo/blind-round.mjs pontuar CASOS.json COMPROMISSO.json PREDICOES.json PARECER_A.json PARECER_B.json REFERENCIA.json NOVO_RELATORIO.json
```

O relatório contém acerto da primária ideal e das aceitáveis, presença de uma aceitável entre as duas primeiras candidatas, abstenção correta e indevida, precisão e cobertura das secundárias e concordância do rótulo da primeira subforma. As proporções incluem numerador, denominador e intervalo de Wilson de 95%. Sem casos no denominador, o resultado é indefinido. O rótulo da subforma é comparado após normalização de maiúsculas, acentos e pontuação. Sinônimos precisam ser consolidados na referência.

Resultados deste piloto orientam ajustes nos critérios. A calibração de probabilidades exige uma amostra independente. A adequação das escolhas e o ganho de aprendizagem exigem medidas distintas.
