# Nova Esteira — camada mock (governada)

Esta pasta concentra o **domínio**, **cenários**, **persistência local** e **pipeline de materialização** usados pela rota `/app/nova-esteira`. Não há backend nem ARGOS aqui.

## Pontos de troca futuros

| Área | Arquivos atuais | Evolução esperada |
|------|-------------------|-------------------|
| Persistência | `nova-esteira-drafts-storage.ts`, `nova-esteira-drafts-repository.ts` | Adapter assíncrono (API/DB) preservando `NovaEsteiraRascunhoPersistido` e operações do repositório. |
| Cenários | `nova-esteira-cenarios-mock.ts` | Templates remotos ou catálogo versionado; manter `NovaEsteiraDraft` e `NovaEsteiraCenarioId` estáveis ou migrar com versão de schema. |
| Materialização | `nova-esteira-pipeline.ts`, `nova-esteira-materialize.ts`, `runtime-esteiras.ts` | Substituir gravação mock por criação real de esteira; manter determinismo em testes ou contrato equivalente. |
| Mensagens / cópia | `nova-esteira-mensagens.ts` | Opcional: i18n ou CMS; evitar regras de negócio na camada de texto. |

## Contratos a preservar

- **`NovaEsteiraDraft`** e composição (`nova-esteira-composicao.ts`) como fonte de verdade ao retomar rascunho.
- **`deriveStatusJornada`** / snapshot resumido como derivados persistidos, não como substituto do domínio em tempo real.
- **Materialização determinística** (`nova-esteira-deterministic.ts`) para testes e auditoria até haver IDs reais.

## Checklist de fluxo (consistência)

1. **Montagem** → estado de domínio via `snapshotComposicaoMontagem` / `podeMaterializar`.
2. **Revisão** → mesmo snapshot; checkpoint só leitura (`nova-esteira-estado-visual`).
3. **Salvar rascunho** → `draftAtualMontagemParaPersistencia` + repositório; primeiro save cria id.
4. **Autosave** (com rascunho vinculado) → `atualizarRascunhoNovaEsteira`; **não** atualiza se `materializado` ou `arquivado`.
5. **Retomada** → `?rascunho=id` hidrata e remove querystring; id inválido → aviso e estado intacto.
6. **Cenário** → fábrica + persistência imediata; cenário ausente → aviso.
7. **Duplicar** → novo id, cópia do `draft`, sem vínculo de materialização.
8. **Arquivar** → marca `arquivado`, some da listagem padrão.
9. **Materializar** → `materializarNovaEsteira` + `marcarMaterializacaoRascunhoNovaEsteira`; UI bloqueia edição até “Criar outra esteira”.
10. **Pós-sucesso** → pode voltar ao backlog ou iniciar nova montagem com estado limpo.

## Definição de “done” (frente mock)

- Domínio e composição centralizados; UI sem regra crítica duplicada.
- Persistência lateral defensiva (storage corrompido/vazio, gravação falha).
- Textos operacionais coerentes em extremos (retomada inválida, persistência indisponível, sucesso).
- Testes cobrindo repositório, snapshot vs domínio e materialização.

## Débitos conscientes

- Sem sincronização multiaba/multiusuário.
- Sem migração pesada de schemas antigos além do envelope `schemaVersion`.
- ARGOS e permissões reais ficam fora deste escopo.
