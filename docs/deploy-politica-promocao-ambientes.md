# SGP+ — política de promoção DEV → HML → PROD

## Estado da mudança

Esta branch é apenas uma proposta. NÃO promover nem executar deploy antes de validar a infraestrutura e as proteções de branches. A configuração DEV começa desativada: `DEV_DEPLOY_ENABLED` precisa ser explicitamente `true` para o job existir.

## Fluxo obrigatório

1. Push em `develop` publica **somente DEV**, quando a infraestrutura DEV estiver aprovada.
2. PR `develop → homol`: exigir verificações e aprovação. **Aprovar não faz merge**; somente merge autorizado publica HML.
3. PR `homol → main`: exigir verificações e aprovação. Somente merge autorizado publica PROD.
4. Nenhum workflow deve efetuar push ou merge para outra branch.
5. Bloquear push direto, force push, exclusão e bypass de administradores em `homol` e `main` via Rulesets/Branch protection do GitHub. Aplicar exigência de revisões humanas e checks. Proteções devem ser configuradas pela administração do GitHub e verificadas antes da ativação.
6. Não habilitar auto-merge, atualizações automáticas de branches ou promoções por aprovação isolada.
7. `workflow_dispatch` dos workflows HML e PROD deve ser removido ou restringido mediante controle explícito de ambiente, após revisão, para evitar execução manual inadvertida.
8. Avaliar uso de GitHub Environments e aprovações de produção, sempre revisando triggers e bypass.

## Infraestrutura DEV necessária — ainda não provisionada/verificada

- Código: `/opt/sgp/sgp-dev`
- Frontend: `/var/www/sgp-web-dev`
- Processo: `sgp-api-dev`
- Banco independente: `sgp_dev` (nunca `sgp_prod` nem `sgp_homol`)
- Porta própria, Nginx próprio, domínio e certificado HTTPS próprios.
- Segredos `DEV_VPS_HOST`, `DEV_VPS_PORT`, `DEV_VPS_USER`, `DEV_VPS_SSH_KEY`, `DEV_VPS_KNOWN_HOSTS` e variável `DEV_HEALTH_URL`, idealmente escopados ao Environment `development`.
- Variável do repositório `DEV_DEPLOY_ENABLED` começa ausente ou `false`.
- Confirmar isolamentos de diretórios, banco de dados, usuário SSH, permissões PM2 e Nginx antes de alterar essa variável.
- O workflow DEV não executa migrations automaticamente, à semelhança dos workflows existentes.
- Verificar se a branch contém as dependências e a versão de Node compatíveis antes da primeira execução.

## Pré-requisitos para homologação do fluxo

- Auditar e registrar proteção/Rulesets de `develop`, `homol` e `main`.
- Auditar triggers reais de todos os GitHub Actions e permissões de tokens.
- Confirmar que a aprovação de PR não habilita merge automático.
- Executar dry run dos eventos `push`/`pull_request` e validar que somente a branch esperada pode publicar em cada ambiente.
- Validar manualmente saúde, logs e rollback de DEV, depois HML, e apenas então habilitar mudanças na produção.
- Revisar o workflow de produção da versão 1.11.0, que invoca backup pré-deploy, e validar a migration 0054 separadamente.

## Escopo desta PR em rascunho

Apenas acrescenta um workflow DEV com ativação explicitamente bloqueada por padrão e este documento. Não altera as branches principais nem os workflows atuais de HML/PROD. Não configura Rulesets e não cria infraestrutura de VPS.
