# Estratégia de branches, releases e deploy (SGP + ARGOS)

Documento curto alinhado ao uso de **main** (produção), **homol** (homologação controlada) e **develop** (integração das sprints).

## Branches

| Branch | Papel |
|--------|--------|
| **main** | Produção. Única origem de **deploy automatizado para EC2** (produção) neste fluxo. |
| **homol** | Homologação / validação de pacote antes de produção. |
| **develop** | Integração contínua do trabalho da sprint. |

## Fluxo de trabalho

- **feature/\*** ou **fix/\*** nasce a partir de **develop**.
- Pull request para **develop** durante o desenvolvimento.
- Merge de **develop** → **homol** quando houver pacote para validação.
- Merge de **homol** → **main** somente após validação aceita.
- **Hotfix** nasce de **main** e deve ser retrocompatibilizado para **homol** e **develop** depois.

## Deploy EC2 (produção)

- O workflow `.github/workflows/deploy-ec2.yml` deste repositório dispara deploy para EC2 **somente** a partir da branch **main**:
  - `push` restrito a **main**;
  - execução manual (`workflow_dispatch`) deve ser iniciada com a branch **main** selecionada — outras refs falham na checagem de segurança.
- **develop** e **homol** não disparam deploy de produção por esse pipeline.

Detalhes operacionais do deploy: [deploy-ec2-automatico.md](deploy-ec2-automatico.md) e [deploy-sgp-ec2.md](deploy-sgp-ec2.md).

## Repositório ARGOS (gateway)

O **ARGOS Gateway** costuma residir em repositório próprio; a mesma regra de negócio aplica-se: deploy de produção na EC2 deve estar restrito a **main**. Ajustar o workflow equivalente lá, se ainda não estiver explícito.
