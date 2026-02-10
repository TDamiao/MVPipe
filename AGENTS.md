# AGENTS.md

Instrucoes para agentes que vao trabalhar neste repo.

## Visao geral
- App desktop Electron + React (Vite) para monitorar cargas no Oracle.
- Processo principal (Electron) faz conexao Oracle via `oracledb` (thick mode).
- Renderer (React) consome IPC via `window.api` (preload).

## Estrutura principal
- `electron/main.ts`: cria janela, inicializa Oracle client e registra IPC.
- `electron/oracleService.ts`: conecta, busca dados, faz fallback de query.
- `electron/preload.ts`: expor API `window.api` para o renderer.
- `src/`: UI e estado global via Context (`AppProvider`, `AppContext`).
- `src/queries.ts`: SQL principal e fallback.
- `vendor/instantclient`: Oracle Instant Client (nao versionado).

## Fluxo de dados
- `NewConnectionModal` chama `window.api.connect` e adiciona tab.
- `Dashboard` faz polling com `window.api.fetchData` e filtra/ordena localmente.
- `AppProvider` guarda conexoes, aba ativa e `dashboardData`.

## Comandos locais
- `npm install`
- `npm run dev` (modo dev)
- `npm run build` (build + electron-builder)

## Dependencias e ambiente
- Necessario baixar Oracle Instant Client e extrair em `vendor/instantclient`.
- O build inclui `vendor/instantclient` via `build.extraResources`.

## Boas praticas para edicoes
- Mantenha IPC consistente: canais `oracle:connect`, `oracle:fetchData`, `oracle:disconnect`.
- Edite queries em `src/queries.ts` e ajuste parsing em `electron/oracleService.ts`.
- Evite mudar o caminho do Instant Client sem atualizar `electron/main.ts`.
- Prefira TypeScript e mantenha tipos em `src/types.ts`.

## Observacoes
- Ha texto com caracteres acentuados que pode estar com encoding incorreto.
  Se precisar corrigir, use UTF-8 consistente em toda a base.
