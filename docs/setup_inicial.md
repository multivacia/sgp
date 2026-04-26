# Setup inicial — orientação operacional (reset da base)

Este guia descreve **como** executar com segurança o reset controlado para um ambiente em estado **“verde”** (um utilizador administrativo, sem colaboradores nem dados operacionais). O detalhe técnico dos scripts, parâmetros e tabelas está em [reset-base-inicial.md](./reset-base-inicial.md).

## Quando usar

- Reinício controlado da jornada após migrações e seeds base, ou
- Limpeza de dados operacionais mantendo RBAC, setores e schema.

**Regra de ouro:** validar o **fluxo completo** primeiro em **DEV** ou **HML** antes de repetir em qualquer ambiente mais sensível.

## Pré-requisitos

- Cliente SQL (psql, DBeaver, etc.) com acesso à base alvo.
- Identificar **um** `app_users` ativo a preservar: UUID (`master_user_id`) **ou** email (`master_email`) — ver [reset-base-inicial.md](./reset-base-inicial.md#parâmetros-obrigatório-exatamente-um).
- Scripts no repositório:
  - `scripts/sql/reset_to_initial_state_precheck.sql`
  - `scripts/sql/reset_to_initial_state.sql`
  - `scripts/sql/reset_to_initial_state_postcheck.sql`

## Fluxo obrigatório (DEV/HML primeiro)

Execute **nesta ordem** e só avance se o passo anterior tiver sucesso.

1. **Precheck**  
   Edite os parâmetros master em `reset_to_initial_state_precheck.sql` (o **mesmo** par a usar no passo 3). Execute o script e confirme as mensagens `NOTICE` e ausência de `EXCEPTION`.

2. **Backup**  
   Faça backup completo da base (por exemplo `pg_dump` em formato custom ou SQL plain). Guarde o ficheiro num local seguro e teste a restauração se a política do projeto o exigir.

3. **Reset**  
   Copie o **mesmo** `v_master_user_id` / `v_master_email` para `reset_to_initial_state.sql` e execute. É uma operação **destrutiva** numa transação.

4. **Postcheck**  
   Execute `reset_to_initial_state_postcheck.sql`. Deve terminar com `NOTICE` de sucesso e sem `EXCEPTION`.

5. **Teste manual de login**  
   Inicie sessão na aplicação com o utilizador preservado (credenciais existentes). Confirme que a conta é aceite e que o papel administrativo se comporta como esperado.

6. **Sanity check da aplicação**  
   Suba ou recarregue a aplicação contra esta base e percorra fluxos mínimos: arranque sem erros de API, páginas críticas com **sem** `collaborator` ligado ao utilizador e **sem** dados operacionais (esteiras, matriz, bases, etc.). Corrija bugs de produto à parte; o objetivo aqui é confirmar que o estado da base não quebra o arranque nem assumições óbvias.

## Promoção para outro ambiente

Só depois de o fluxo acima estar **verde** em DEV/HML:

- Repita **precheck → backup → reset → postcheck → login → sanity** no ambiente alvo, com janela e aprovação adequadas.

## Se aparecer erro de FK ou tabela desconhecida

Se durante o precheck, o reset ou o postcheck surgir falha de integridade referencial, tabela em falta ou ordem de `DELETE`/`TRUNCATE` incorreta:

1. Compare o schema real da base com `server/migrations/`.
2. **Ajuste** os três ficheiros em `scripts/sql/` conforme necessário.
3. **Atualize** [reset-base-inicial.md](./reset-base-inicial.md) (tabelas, ordem, riscos).
4. Volte a validar o fluxo completo em **DEV/HML** antes de promover.

## Referência rápida

| Documento | Conteúdo |
|-----------|----------|
| [setup_inicial.md](./setup_inicial.md) (este ficheiro) | Fluxo operacional e promoção |
| [reset-base-inicial.md](./reset-base-inicial.md) | O que apaga/preserva, parâmetros, validação técnica |
