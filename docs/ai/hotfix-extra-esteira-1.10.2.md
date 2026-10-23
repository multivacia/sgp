# Hotfix SGP+ 1.10.2 — Correção gerencial Extra Esteira

Origem: main 1.10.1, commit ababbd812b81948e0eb5b5583e90ac1334d34e13.
Branch isolada: hotfix/correcao-extra-esteira-1.10.2.

## Escopo
- Jornada por colaborador: ações Editar e Remover por lançamento Extra Esteira.
- Correção de descrição, data de trabalho, minutos e observação; justificativa obrigatória.
- Remoção lógica (deleted_at), preservando o histórico.
- Registros WEB e PRODUCTION, sem alterar autor/origem.
- Permissões existentes time_entries.edit_any e time_entries.delete_any.
- Auditoria transacional com identificador, justificativa e instantâneos antes/depois.
- Controle otimista por updatedAt; respostas antigas geram conflito HTTP 409.
- Totais da jornada recalculados após a mutação.
- Versão do app em app-version.json: 1.10.2, exibida por AppVersionStamp no rodapé da barra lateral.

## API
PATCH /api/v1/extra-time-entries/:timeEntryId
DELETE /api/v1/extra-time-entries/:timeEntryId

A API requer sessão de usuário comum com a permissão gerencial correspondente.
O Kiosk não recebe endpoints de correção. Os apontamentos feitos pelo Kiosk são corrigíveis na visão gerencial.

## Homologação obrigatória antes de produção
1. Confirmar com Admin/Gestor as ações na Jornada por colaborador, inclusive em seleção múltipla.
2. Corrigir minutos, data, descrição e observação; verificar novo total, categoria e Excel da jornada.
3. Remover apontamento WEB e PRODUCTION; conferir total e ausência no histórico ativo.
4. Confirmar obrigatoriedade da justificativa e trilha de auditoria (antes/depois, ator, colaborador).
5. Verificar retorno 403 quando faltam permissões de edição/remoção.
6. Corrigir descrição histórica inativa sem alterar a descrição; testar rejeição de nova inativa.
7. Testar duas telas simultâneas: a segunda correção deve falhar com conflito 409.
8. Conferir rodapé da barra lateral no desktop e mobile e API /api/v1/version exibindo 1.10.2.
9. Executar build e testes frontend/backend em checkout limpo com dependências instaladas.

Sem merge, sem deploy e sem alteração das branches main, develop ou homol nesta etapa.

## Consultas com histórico e remoções

- As telas Jornada por colaborador (Gestor/Admin) e Minha Jornada (somente leitura)
  mostram registros Extra Esteira excluídos juntamente com os ativos no período pesquisado.
- Registros excluídos têm identificação `Excluído`, motivo visível, responsável,
  data e hora da exclusão, quando esses dados existem na trilha de auditoria.
- Registros corrigidos têm identificação `Corrigido`, justificativa visível e
  histórico expansível com valores anteriores e posteriores (descrição, minutos,
  data e observação), responsável e momento da correção.
- Excluídos não oferecem ações de nova correção ou remoção, e não participam
  da contagem de lançamentos ativos ou dos totais de minutos.
- O histórico utiliza os eventos já gravados na tabela `admin_audit_events`.
  Exclusões anteriores sem evento correspondente aparecem com a indicação
  `Motivo não registrado no histórico` — nunca se inventa justificativa.
- As listas continuam limitadas pela consulta da jornada (20 registros por
  padrão); o período deve ser ajustado para consultar lançamentos mais antigos.
- A exportação Excel existente mantém a regra anterior de somente registros
  ativos; esta hotfix não altera o contrato nem o leiaute da exportação.

### Testes adicionais

- Consulta da jornada inclui registros excluídos e devolve histórico da auditoria.
- Sumarização continua filtrando `deleted_at IS NULL`.
- A interface apresenta justificativa de exclusão, valores anteriores e
  posteriores, sem permitir editar um registro excluído.
- Perfis sem permissão só consultam: os botões de ação continuam indisponíveis.

**Atenção:** testes adicionados ao repositório; build e suítes devem ser executados
na validação da branch antes de qualquer merge/deploy.
