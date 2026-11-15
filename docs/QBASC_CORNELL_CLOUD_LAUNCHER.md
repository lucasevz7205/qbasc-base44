# QBAsc — Caderno Cornell na nuvem e atalho móvel do Arquiteto

Aplicativo afetado: QBAsc · A Ascensão (`6af8bc0e216be36fdba4378c`).
Não altera o aplicativo Quebrando a Banca original.

## Caderno Cornell
- Novas entidades `CornellNote` (nota atual) e `CornellNoteVersion` (versões imutáveis).
- Todos os registros têm `owner_id` autenticado e `topic_id` estável, sem indexação por rótulo visual.
- Permissão de leitura e escrita de Cornell restrita a contas administradoras do QBAsc. O cliente também filtra por usuário e assunto.
- Notas, pistas e síntese são salvas automaticamente após uma pausa de 1,3 s; existe botão `Salvar agora` e status visível de sincronização.
- A cada 15 min de edição (ou no primeiro salvamento) cria-se uma versão. O usuário também pode criar versão manual e restaurar versões anteriores sem excluir as antigas.
- As anotações pré-existentes em `localStorage['qb-cornell::'+topicLabel]` são **apenas lidas**, nunca apagadas, e importadas para a nuvem quando não existe nota remota.
- Rascunhos novos continuam guardados em `qb-cornell-v2::<user>::<topic>` para segurança.
- Se existir nota na nuvem diferente da nota local, prevalece a nuvem, e o rascunho local é oferecido como recuperação com confirmação. Não há sobrescrita silenciosa.
- Se não foi possível consultar a nuvem, os campos continuam editáveis localmente e **nenhum envio automático é realizado** antes da reconexão, evitando sobrescrever um registro remoto desconhecido. O status exibe que o conteúdo ainda não foi sincronizado.
- Escritas têm verificação da última revisão lida, e conflitos não são sobrescritos silenciosamente. Não é edição colaborativa simultânea em tempo real.

## Gemini no Cornell
- `generateCornellCues` requer autenticação de administrador.
- Utiliza `invokeGeminiTutor` com o segredo `Arquiteto` (compatibilidade: `ARQUITETO` e `GEMINI_API_KEY`).
- **Não há fallback pago para `Core.InvokeLLM` da Base44** nesta função.
- A geração exige clique em `Sugerir pistas com Gemini`, envia notas do tópico à API Google e valida JSON antes de alterar os campos locais.
- A chave permanece no servidor. Acesso real à API e disponibilidade do segredo devem ser testados em sessão autenticada; testes automatizados usam simulações.

## Atalho do Arquiteto
- Substituiu a posição inferior direita fixa por lateral esquerda, aproximadamente 55% da altura.
- Uma alça com ícone de arrastar permite movimentar com mouse/toque; as setas também movem e Home restaura a posição padrão.
- O atalho fica limitado à área visível e sua posição é memorizada em `localStorage['qbasc-architect-launcher-position-v1']`.
- Clique em `O Arquiteto` continua abrindo o chat lateral normalmente.
- O botão `Continuar` da sessão de questões permanece intacto.

## Testes e ressalvas
- Testes de reconciliação e migração de notas, parsing Gemini, limites de posição, contrato de autenticação, modelos e regressões.
- Validar manualmente numa conta autenticada: criar Cornell, aguardar confirmação `Salvo na nuvem`, fechar e reabrir em outro dispositivo, editar, restaurar versão e mover atalho.
- Backup do código não substitui exportação independente dos dados da Base44.
