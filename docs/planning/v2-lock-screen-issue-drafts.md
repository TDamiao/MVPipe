# Draft de Issues - Tela de Locks e Kill Session

## 1) [EPIC] Tela de Locks e Acoes de Sessao
**Objetivo**
Criar uma tela dedicada para identificar bloqueios (`locks`) e permitir encerrar sessoes Oracle com seguranca, sem sair da aplicacao.

**Escopo**
- Listagem de sessoes bloqueadas e bloqueadoras.
- Visualizacao de detalhes da sessao (SID, SERIAL#, usuario, maquina, programa, SQL, tempo de bloqueio).
- Acao de `kill session` com confirmacao.
- Feedback de sucesso/erro e atualizacao da grade.

**Fora de escopo (agora)**
- Automatizar kill sem intervencao humana.
- Rebalanceamento ou tuning automatico de SQL.

**Criterios de aceite**
- Usuario consegue identificar rapidamente quem bloqueia quem.
- Usuario consegue encerrar sessao com confirmacao explicita.
- Erros de permissao/conexao aparecem com mensagem clara.
- Fluxo funciona com polling sem travar o dashboard atual.

---

## 2) [Backend/Oracle] Consultas para mapa de bloqueios
**Objetivo**
Adicionar consultas SQL para listar cadeia de bloqueio e metadados de sessoes envolvidas.

**Tarefas**
- Criar query principal em `src/queries.ts` para locks.
- Adicionar fallback de query quando view/privilegio nao estiver disponivel.
- Ajustar parsing em `electron/oracleService.ts`.
- Definir tipagem em `src/types.ts`.

**Criterios de aceite**
- Endpoint de dados retorna bloqueado x bloqueador com campos minimos.
- Fallback retorna dados parciais sem quebrar a UI.
- Logs tecnicos suficientes para diagnostico.

---

## 3) [IPC] Novos canais para tela de locks
**Objetivo**
Padronizar comunicacao Electron <-> Renderer para a nova tela.

**Tarefas**
- Adicionar canal `oracle:fetchLocks`.
- Adicionar canal `oracle:killSession`.
- Expor metodos no `electron/preload.ts` (`window.api`).
- Registrar handlers no `electron/main.ts`.

**Criterios de aceite**
- Canais seguem convencao existente e validam payload.
- Renderer consome via `window.api` sem acesso direto ao Node.

---

## 4) [UI] Nova tela "Locks" com filtros e polling
**Objetivo**
Criar tela dedicada para monitoramento de locks.

**Tarefas**
- Criar componente/pagina da tela de locks.
- Mostrar tabela com status, bloqueado, bloqueador e duracao.
- Filtros por usuario, SID e tempo minimo.
- Atualizacao automatica (polling) e manual (botao atualizar).

**Criterios de aceite**
- Tabela responsiva e legivel.
- Ordenacao por tempo de bloqueio.
- Estado de carregamento e vazio tratados.

---

## 5) [UX/Seguranca] Fluxo de kill session com confirmacao forte
**Objetivo**
Reduzir risco operacional ao encerrar sessoes.

**Tarefas**
- Dialog de confirmacao com resumo da sessao alvo.
- Exigir confirmacao explicita (ex.: digitar SID/SERIAL#).
- Exibir resultado da execucao (sucesso/falha com motivo).
- Bloquear acao para sessoes protegidas (se regra definida).

**Criterios de aceite**
- Nao ha kill acidental com clique unico.
- Mensagens de erro/sucesso sao auditaveis pelo usuario.

---

## 6) [Qualidade] Testes e documentacao da feature
**Objetivo**
Garantir confiabilidade da nova funcionalidade.

**Tarefas**
- Testes unitarios para parsing/respostas de locks.
- Testes de integracao IPC para `fetchLocks` e `killSession`.
- Atualizar `README.md` com requisitos de privilegio Oracle.
- Criar roteiro de teste manual (cenarios de lock real/simulado).

**Criterios de aceite**
- Cobertura minima para caminhos de sucesso e erro.
- Documentacao permite reproduzir setup sem conhecimento implicito.
