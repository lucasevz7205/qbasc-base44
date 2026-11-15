# QBAsc: salvar reformulação diretamente sobre questão existente

Ação exclusiva para **questões cadastradas**, pelo botão **Salvar em cima da anterior** em O Arquiteto → Reformular questão. Mantém opção **Aprovar e salvar nova versão** sem escrever no banco de questões.

## Regras
- A curadoria só fica disponível após o gabarito ser revelado na sessão e não depende de a resposta ter sido certa ou errada.
- A IA sugere e o estudante pode editar enunciado, gabarito, comentário e referência antes de optar pelo modo de salvamento.
- O botão de sobrescrita só é ativado após a pessoa marcar a confirmação de revisão; aparece um segundo diálogo para confirmar a ação.
- Antes da escrita, salva em `curadoria` uma versão imutável com `status=sobrescrita`, `rawAnterior`, `exibidaAnterior`, `original`, versão e parecer.
- Apenas depois do backup ser concluído, escreve na coleção `questoes` do **mesmo ID**, preservando campos originais que não foram editados (assunto, remissão do nó, tags, mecanismo, etc.).
- Grava `reformuladaPeloArquiteto=true`, `versaoCuradoriaDireta`, `curadoriaDiretaId` e data no registro. A interface exibe badge de questão reformulada.
- Versões antigas de overlay não podem ocultar a questão sobrescrita: o adaptador compara a versão gravada diretamente com as versões editoriais.
- Cálculo de acerto mais recente prioriza `hist[].ok`, que guarda se a resposta foi considerada correta no momento em que foi respondida. Os contadores de acerto/erro, respostas e rodadas anteriores não são alterados pela reformulação.
- Questões sem registro original editável não oferecem o modo de sobrescrita.
- Se o backup falhar, não inicia a gravação da questão; se a gravação original falhar, a cópia de segurança fica preservada. Não há redefinição de desempenho.

## Limites
- Para registros originais grandes demais para a operação de atualização existente da Base44, o sistema recusa a sobrescrita e deixa o material como estava. A opção de nova versão editorial segue disponível.
- A possibilidade de confirmar uma substituição na UI não prova que ela já foi executada em dados reais; teste manual com uma questão de homologação, conferindo cópia, atualização e histórico.
- Checkpoints protegem o **código**; backups editoriais são documentos na **base de dados**.
