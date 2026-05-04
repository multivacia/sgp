# Deploy automático do ARGOS Gateway na EC2

Documentação de operação do pipeline validado no repositório **multivacia/argos** (ARGOS Gateway). Não descreve o deploy do SGP; apenas o gateway ARGOS na EC2.

## Visão geral

O deploy publica releases versionadas em `/opt/argos`, atualiza o symlink `current`, reinicia o serviço systemd `argos-gateway` e valida os endpoints HTTP internos (`/health`, `/ready`) com **retries**, para tolerar o intervalo entre `systemctl restart` e o processo Node ficar pronto.

Triggers aceitos:

- **Push em `main`**: deploy automático a cada merge/push.
- **`workflow_dispatch`**: deploy manual no GitHub Actions.

Artefato típico: tarball com o build do app em `apps/argos-gateway` (detalhes no workflow do repositório ARGOS).

## Arquitetura do deploy

```text
GitHub (multivacia/argos)
        │
        ▼ push main / workflow_dispatch
GitHub Actions (Ubuntu)
        │ build / empacota release
        │ SCP para EC2 (/tmp/…)
        ▼
EC2
  /opt/argos/releases/<release-id>   ← extração do pacote
  /opt/argos/current ───────────────► symlink para release ativa
  /opt/argos/shared/argos-gateway.env ← variáveis (não versionadas)
  systemd: argos-gateway.service
        │
        ▼ escuta em :8080 (localhost / rede interna conforme firewall)
curl /health, /ready (validação pós-deploy com retry)
```

Fluxo resumido:

1. Pipeline na Actions compila e envia o release para a EC2.
2. Script remoto (workflow) descompacta em `/opt/argos/releases/<id>`.
3. Atualiza `/opt/argos/current` para o novo diretório.
4. Reinicia `argos-gateway.service`.
5. Health checks com tentativas repetidas em `/health` e `/ready` até sucesso ou timeout.

## Workflow

- **Arquivo:** `.github/workflows/deploy-argos-gateway-ec2.yml` (no repo **argos**).
- **Eventos:** `push` em `main` e `workflow_dispatch`.
- **Input (manual):** `migrate_on_deploy` — opcional, padrão `0` (desligado). Quando `1`, executa migrations no deploy conforme implementado no script do workflow.

Referência de secrets e env no job: ver seção [Segredos](#segredos).

## Segredos

Configurar no repositório **multivacia/argos** (Settings → Secrets and variables → Actions). **Não** commitar chaves, tokens ou `.env` reais.

| Secret | Uso |
|--------|-----|
| `EC2_HOST` | Hostname ou IP da instância |
| `EC2_USER` | Usuário SSH (ex.: `ec2-user`) |
| `EC2_SSH_KEY` | Chave privada PEM para SSH/SCP |
| `EC2_ARGOS_APP_DIR` | Raiz da instalação; valor validado: `/opt/argos` |

O workflow não deve imprimir valores desses segredos nos logs.

## Diretórios na EC2

| Caminho | Função |
|---------|--------|
| `/opt/argos` | Base (`EC2_ARGOS_APP_DIR`) |
| `/opt/argos/releases` | Releases por timestamp ou id |
| `/opt/argos/releases/<release>` | Ex.: `20260504201242` — árvore de uma versão implantada |
| `/opt/argos/current` | Symlink para a release ativa |
| `/opt/argos/current/apps/argos-gateway` | App em execução (WorkingDirectory do systemd) |
| `/opt/argos/shared/argos-gateway.env` | Arquivo de ambiente carregado pelo serviço |

**Porta do processo:** `8080` (HTTP do gateway).

Template de unit file de referência no repo: `deploy/systemd/argos-gateway.service.example` (ajustar usuário e caminho do entrypoint do build se diferente).

## Comandos de validação

Na EC2 (ajuste host se testar de fora):

```bash
# Symlink e release ativa
readlink -f /opt/argos/current

# Serviço
sudo systemctl status argos-gateway.service --no-pager

# HTTP (gateway escuta em 8080)
curl -fsS http://127.0.0.1:8080/health
curl -fsS http://127.0.0.1:8080/ready
```

Respostas esperadas na validação bem-sucedida: **HTTP 200** em `/health` e `/ready`; `/ready` deve indicar dependências ok (ex.: banco).

## Comandos `journalctl`

```bash
# Últimas linhas do serviço
sudo journalctl -u argos-gateway.service -n 100 --no-pager

# Acompanhar em tempo real
sudo journalctl -u argos-gateway.service -f

# Desde o boot (útil após reinício da instância)
sudo journalctl -u argos-gateway.service -b --no-pager
```

## Rollback manual

1. Listar releases anteriores em `/opt/argos/releases` e identificar a pasta estável anterior à atual.
2. Apontar `current` para essa pasta e reiniciar o serviço:

```bash
sudo ln -sfn /opt/argos/releases/<release-anterior> /opt/argos/current
sudo systemctl restart argos-gateway.service
```

3. Validar com `curl` em `/health` e `/ready` como na seção de validação.

## Regra para migrations

- Controle via input **`migrate_on_deploy`** no `workflow_dispatch`.
- **Padrão:** `0` — migrations **não** rodam automaticamente no deploy.
- Definir como `1` apenas quando for seguro aplicar migrations naquele ambiente e com backup/plano compatível.

Política recomendada: habilitar migrations em produção somente em janela acordada e com revisão do script SQL/ORM.

## Troubleshooting: health check após restart

**Sintoma:** pipeline falha logo após `systemctl restart`, com timeout ou HTTP de erro nos checks, embora o serviço estabilize segundos depois.

**Causa:** o processo Node pode demorar para bind na porta e responder; um único `curl` imediato falha de forma intermitente.

**Mitigação aplicada no workflow:** retries com espera entre tentativas para **`/health`** e **`/ready`** (sem assumir que o primeiro request após restart será 200).

Se ainda falhar:

1. Ver `journalctl` do serviço e erros de bind, DB ou env ausente.
2. Confirmar que `/opt/argos/shared/argos-gateway.env` existe e contém variáveis necessárias (sem commitar o arquivo real).
3. Confirmar que `ExecStart` usa um `node` válido (ver próxima seção no template systemd).

## Status final da validação (sprint)

Validação registrada após correção do health check com retry:

| Item | Resultado |
|------|-----------|
| Deploy manual (`workflow_dispatch`) | Actions **verde** |
| Deploy automático (push `main`) | Actions **verde** |
| `/opt/argos/current` | Aponta para `/opt/argos/releases/20260504201242` |
| `argos-gateway.service` | **active (running)** |
| `GET /health` | **200 OK** |
| `GET /ready` | **200 OK**, database ok |

Este documento descreve o estado operacional validado; ajuste paths de release se o ambiente usar outro esquema de id.
