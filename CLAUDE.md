# SGP+ — Instruções para Claude Code

**Última revisão:** 2026-10-01

Este arquivo deve ser curto. Ele define o protocolo de trabalho do Claude Code.
Contexto de produto e arquitetura fica em `docs/ai/context/PROJECT_CONTEXT.md`.
Estado transitório da sessão fica em `docs/ai/context/SESSION_CHECKPOINT.md`.

## 1. Inicialização obrigatória de toda sessão

Antes de alterar qualquer arquivo:

1. Leia `AGENTS.md`.
2. Leia `docs/ai/context/PROJECT_CONTEXT.md`.
3. Leia `docs/ai/context/SESSION_CHECKPOINT.md`.
4. Identifique branch, HEAD e estado do working tree.
5. Leia somente os arquivos necessários para a atividade atual.
6. Se houver conflito entre documentação e código real, use o código/Git como fonte factual e registre a divergência.
7. Se houver conflito de governança ou regra de negócio que não possa ser resolvido pelo prompt atual, pare e peça decisão humana.

Não varra o repositório inteiro sem necessidade.

## 2. Fonte da verdade

Para fatos técnicos atuais:

1. código e histórico Git atuais;
2. instrução humana explícita da atividade;
3. `AGENTS.md` e este `CLAUDE.md` para governança;
4. `docs/ai/context/PROJECT_CONTEXT.md` para contexto estável;
5. `docs/ai/context/SESSION_CHECKPOINT.md` para continuidade transitória.

O checkpoint nunca substitui a validação do estado real do repositório.

## 3. Identificador obrigatório da atividade

Toda atividade deve possuir um `TASK_ID`.

Formato:

- minúsculas;
- kebab-case;
- sem acentos;
- descritivo e curto;
- manter o mesmo identificador até a conclusão da atividade.

Exemplo:

`ajustar-esteiras-cores`

Se o prompt informar um `TASK_ID`, use exatamente esse valor.
Se não informar, derive um antes de começar e informe qual será usado.

Quando o prompt da atividade for salvo no repositório, usar:

`docs/ai/prompts/<TASK_ID>.md`

## 4. Retorno obrigatório no repositório

Ao final de **toda atividade**, inclusive análise sem alteração de código, gere:

`docs/ai/returns/<TASK_ID>-retorno.md`

Exemplo:

- prompt: `docs/ai/prompts/ajustar-esteiras-cores.md`
- retorno: `docs/ai/returns/ajustar-esteiras-cores-retorno.md`

Se a mesma atividade continuar em outra sessão, atualize o mesmo arquivo de retorno.
O histórico Git preservará as versões anteriores.

O retorno deve conter, de forma objetiva:

- `TASK_ID`;
- data/hora;
- objetivo;
- status final;
- branch;
- SHA inicial;
- SHA final;
- resumo do que foi feito;
- arquivos criados, alterados ou removidos;
- migrations envolvidas;
- decisões técnicas ou de negócio relevantes;
- comandos de validação executados;
- resultado real de build, lint e testes;
- pendências, riscos e ressalvas;
- próximo passo recomendado, quando houver;
- estado final do `git status`;
- informação de commit/push/PR, quando aplicável;
- percentual de uso/tokens ainda disponível na sessão, **somente se esse dado estiver disponível de forma confiável**.

Nunca invente o percentual de tokens. Se a ferramenta não expuser esse dado, registre:

`Uso/tokens disponíveis: INDISPONÍVEL — a sessão não fornece métrica confiável.`

No encerramento da resposta ao usuário, informe explicitamente o caminho do arquivo de retorno.

Se houver autorização para commit/push, inclua o arquivo de retorno na entrega ao GitHub.
Se não houver autorização para commit/push, crie o arquivo localmente e informe que ele ainda não está publicado.
Nunca faça force-push ou reescrita de histórico apenas para incluir o retorno.

## 5. Economia de contexto e tokens

Use contexto de forma seletiva:

- prefira busca direcionada a leitura integral de diretórios;
- não repita arquivos completos no chat quando um resumo ou diff for suficiente;
- não replique logs extensos; registre comando, resultado e trecho relevante;
- não releia documentos estáveis sem motivo;
- use `git diff`, buscas pontuais e testes focados antes de ampliar a investigação.

### Checkpoint de continuidade

Se a interface fornecer uma métrica confiável de uso:

- a partir de **75% utilizado**, atualize `docs/ai/context/SESSION_CHECKPOINT.md` após cada marco relevante;
- a partir de **85% utilizado**, antes de iniciar uma nova etapa grande, atualize o checkpoint e recomende continuar em uma nova sessão/chat.

Se a porcentagem não estiver disponível, atualize o checkpoint antes de:

- compactação/reset de contexto;
- troca planejada de sessão;
- interrupção de uma atividade longa;
- handoff para outro agente/chat.

O checkpoint deve ser compacto. Não copie logs grandes, diffs completos ou arquivos inteiros.

## 6. Regras de alteração

- Somente o agente implementador definido em `AGENTS.md` altera código-fonte.
- Não faça refatoração oportunista fora do escopo.
- Preserve histórico e integridade de dados.
- Migrations devem respeitar a sequência real encontrada em `server/migrations/`.
- Backend é a fonte de verdade para regra de negócio.
- Alterações de permissão devem usar o RBAC existente.
- Não alterar secrets.
- Não executar migration em ambiente compartilhado sem aprovação humana.
- Não fazer merge, deploy ou promoção para `main` sem aprovação humana explícita.
- Na ausência de instrução específica, prefira PR.
- Se houver autorização explícita para promoção direta, valide fast-forward e nunca use `--force`.

## 7. Validação

Relatório não é evidência suficiente.

Sempre que aplicável, registre a execução real de:

- build;
- testes focados;
- testes de regressão pertinentes;
- lint/typecheck;
- `git diff`;
- `git status`.

Falha deve ser registrada como falha. Não maquiar resultados.

## 8. Encerramento obrigatório

Antes de encerrar:

1. confirme o `TASK_ID`;
2. atualize `SESSION_CHECKPOINT.md` se houver handoff ou contexto alto;
3. gere/atualize `docs/ai/returns/<TASK_ID>-retorno.md`;
4. informe o caminho do retorno;
5. informe branch e SHA final;
6. informe o estado do working tree;
7. informe o percentual de tokens/uso disponível, se confiável; caso contrário, declare `INDISPONÍVEL`.

A resposta final deve ser curta; os detalhes ficam no arquivo de retorno.
