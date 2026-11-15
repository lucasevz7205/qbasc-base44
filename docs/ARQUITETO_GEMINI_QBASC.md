# Piloto Gemini: O Arquiteto do QBAsc — A Ascensão

## Identidade e escopo
Este documento é EXCLUSIVO do aplicativo `QBAsc` (ID `6af8bc0e216be36fdba4378c`). Não altera a base de dados, os materiais de estudo ou o aplicativo original.

Arquivos:
- `src/lib/server-fns.js`: somente `askArchitectTutor` ganhou seletor de provedor. Preserva os sete modos (`socratico`, `feynman`, `banca`, `oral`, `retencao`, `armadilhas`, `analogia`).
- `src/lib/gemini-tutor.js`: transporte Gemini pelo backend; a chave nunca vai ao browser.
- `tests/gemini-tutor-ascensao.test.mjs`: 7 testes com mocks.

## Segurança
- A chamada `askArchitectTutor` exige autenticação e administrador da aplicação.
- O restante das ferramentas do Arquiteto (Feynman avaliado, Cornell, geração de flashcards/mapas) continua usando Base44 e pode consumir créditos de integração.
- Na falta ou erro da chave Gemini, quando Gemini estiver ligado, é retornado erro sem fallback automático à Base44.
- Não há chamada externa de teste enquanto o segredo não for confirmado.
- Os conteúdos de mensagens do tutor, tópicos e histórico recente são enviados ao Google ao ativar Gemini. Confirme regras de privacidade e consentimento.
- Os checkpoints conservam **código**, não substituem backup completo da base.

## Chave e ativação (passos separados)
1. No app QBAsc, instalar um segredo do backend com nome `Arquiteto` ou `ARQUITETO` (a API de segredos pode aceitar apenas letras maiúsculas; `GEMINI_API_KEY` também é reconhecido). O **valor** precisa ser a chave real gerada no Google AI Studio.
2. Confirmar que a chave é acessível no backend antes de ativar.
3. Deixar `QB_TUTOR_PROVIDER` ausente ou `base44` até validar publicação e consentimento.
4. Após publicar com autorização, definir `QB_TUTOR_PROVIDER=gemini` no backend **QBAsc**. Opcional `QB_GEMINI_MODEL=gemini-3.5-flash-lite`.
5. Rollback instantâneo: `QB_TUTOR_PROVIDER=base44` (retoma chat na integração original).
6. Fazer uma conversa real autenticada e medir custo/latência/qualidade; não foi executada neste preparo.

**Importante:** adicionar segredo no painel geralmente reimplanta as funções do backend. Não colocar o valor em repositório, chat, arquivos .env públicos ou VITE_*.

## Testes
O piloto usa respostas simuladas (sem chamada real e sem cobrança). Testes unitários e build devem ser executados antes do deploy.
