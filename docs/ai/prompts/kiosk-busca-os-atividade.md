# SGP+ — alinhar busca de atividade do Kiosk ao apontamento da esteira

**Modelo recomendado:** Claude Opus (maior capacidade disponível)  
**Nível de esforço:** alto

## Objetivo

No modo **Kiosk**, alterar **somente a lógica de pesquisa de atividades** para que use o mesmo critério já existente no apontamento realizado dentro de uma esteira no SGP+ — a pesquisa por **OS & Atividade**.

Hoje, no Kiosk, a pesquisa considera somente a atividade. A busca deve passar a localizar os mesmos candidatos que o apontamento dentro da esteira localiza ao pesquisar por OS e/ou atividade, respeitando integralmente as regras já existentes nessa tela de referência.

## Fora de escopo — obrigatório

Não alterar:

- a forma como os resultados do Kiosk são exibidos;
- textos, cards, labels, ordem, layout, seleção ou navegação dos resultados;
- fluxo de apontamento, PIN, permissões, validações, toasts ou regras de negócio do Kiosk;
- busca ou comportamento de outras telas;
- `main`, `develop` ou `homol` diretamente;
- banco, migrations, seeds, `.env`, `server/.env` ou dados reais.

Não recrie uma regra aproximada. Localize a implementação usada pelo apontamento dentro da esteira e reutilize/extraia a regra de pesquisa de forma pequena e segura, preservando o comportamento atual dessa tela.

## Governança e base

Repositório: `multivacia/sgp`.

1. Leia integralmente, nesta ordem, antes de editar: `AGENTS.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md` e `docs/ai/context/SESSION_CHECKPOINT.md`. Se algum arquivo não existir, registre isso no retorno e prossiga somente com os existentes.
2. Execute `git fetch origin --prune`.
3. Confira que `origin/develop` está no tip atual. A base conhecida desta solicitação é `a4a3d5d636164dba020498397a65f6f2e66e280e`; se ela tiver avançado, use o tip atual de `origin/develop` e registre o SHA efetivamente usado.
4. Crie uma branch nova a partir desse tip: `fix/kiosk-busca-os-atividade`.
5. Não faça merge, rebase, push --force, deploy ou alteração em branches protegidas.

## Implementação esperada

1. Inspecione o fluxo de apontamento dentro da esteira para identificar, com evidência em código, onde e como a pesquisa de **OS & Atividade** é aplicada.
2. Inspecione o fluxo correspondente do Kiosk e identifique a lógica atual que limita a busca ao texto da atividade.
3. Faça a menor alteração possível para que o Kiosk use o mesmo critério de pesquisa da referência.
4. Mantenha o componente/markup que renderiza os resultados inalterado, salvo ajuste técnico estritamente inevitável para conectar o novo filtro. Não redesenhe a tela.
5. Preserve pesquisa por atividade que já funcionava e acrescente a localização por OS conforme a referência. Casos de acentos, maiúsculas/minúsculas e combinação de termos devem seguir exatamente a regra da tela de apontamento, não uma regra nova.
6. Se o critério de busca estiver no backend, ajuste endpoint/serviço de maneira retrocompatível e limitada ao Kiosk; se estiver no frontend, prefira reutilizar uma função pura já existente ou extrair uma função compartilhada bem testada. Decida a partir do código, não por suposição.

## Critérios de aceite

- No Kiosk, pesquisar pelo mesmo texto de **atividade** continua encontrando os mesmos itens de antes.
- No Kiosk, pesquisar por uma **OS** encontra o mesmo candidato que a tela de apontamento dentro da esteira encontraria.
- Para termos combinados, acentos e capitalização, Kiosk e apontamento dentro da esteira se comportam da mesma forma.
- A apresentação do resultado no Kiosk é visualmente e textualmente idêntica à anterior; a mudança é apenas de critério de busca.
- Selecionar um resultado e concluir/apontar não sofre regressão.
- Não há mudança de schema, migration, seed, variável de ambiente ou endpoint não relacionado.

## Validação obrigatória

1. Adicione ou ajuste testes automatizados que cubram busca por atividade e por OS no fluxo/regra alterado, no nível mais próximo da implementação (unidade, integração ou componente).
2. Execute os testes novos e os testes diretamente afetados.
3. Execute typecheck e build aplicáveis ao escopo.
4. Faça validação manual local do Kiosk com dados fictícios ou mocks: busca por atividade, por OS, seleção do resultado e apontamento. Compare diretamente com a tela de apontamento dentro da esteira.
5. Não rode migrations.

## Entrega

- Registre o prompt usado em `docs/ai/prompts/kiosk-busca-os-atividade.md`.
- Registre o retorno completo em `docs/ai/returns/kiosk-busca-os-atividade-retorno.md`, incluindo: SHA de base e final, arquivos modificados, decisão técnica com referências aos arquivos/funções reutilizados, testes/comandos executados e seus resultados, evidência da validação manual, limitações e pendências.
- Faça commit com mensagem convencional clara.
- Faça push normal da branch nova para `origin`.
- Não abra PR e não integre em `develop`; aguarde autorização explícita após a revisão/homologação.
