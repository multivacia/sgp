# Deploy do SGP na EC2

Documentação de operação do **SGP** (este repositório) implantado na EC2 com Nginx, systemd e pipeline GitHub Actions. Não descreve o deploy do **ARGOS Gateway** (ver `docs/deploy-automatico-argos-ec2.md` no repositório ARGOS).

## Visão geral

O fluxo automatizado compila frontend e backend, envia um release para a instância, atualiza o symlink `current`, reinicia o serviço `sgp-api` e valida health localmente. O **Nginx** na EC2 expõe **HTTP/HTTPS** (80/443), serve o **SPA** estático e faz **reverse proxy** do prefixo `/api/` para o processo Node do SGP em **127.0.0.1:3334**.

Resumo da pilha:

```text
Internet → Nginx (:80 / :443)
              ├── arquivos estáticos → /opt/sgp/current/frontend-dist
              └── /api/* → http://127.0.0.1:3334/api/…

Node SGP (systemd: sgp-api) ← /opt/sgp/shared/server.env

ARGOS Gateway (mesma EC2, uso interno) → :8080  [não alterado por este doc]
SGM API (quando existir na mesma máquina) → :3333
```

Detalhes do workflow e segredos GitHub continuam em [`deploy-ec2-automatico.md`](deploy-ec2-automatico.md).

## Diretórios oficiais na EC2

| Caminho | Função |
|---------|--------|
| `/opt/sgp/current` | Symlink para a release ativa (WorkingDirectory do backend: `…/current/server`) |
| `/opt/sgp/current/frontend-dist` | Build do frontend servido pelo Nginx (`root`) |
| `/opt/sgp/shared/server.env` | Variáveis do backend (**não** versionado; não commitar) |
| `/opt/sgp/releases` | Histórico de releases implantadas |

A variável `EC2_APP_DIR` no GitHub Actions costuma ser `/opt/sgp` (base que contém `current`, `releases`, `shared`).

## Portas oficiais

| Porta | Serviço |
|------:|---------|
| **3333** | SGM API (quando rodando na mesma EC2) |
| **3334** | SGP API (backend Node deste repositório; destino do `proxy_pass` para `/api/`) |
| **8080** | ARGOS Gateway (HTTP interno; sem exposição pública recomendada) |
| **80 / 443** | Nginx (frontend + proxy `/api/` para o SGP) |

O backend SGP deve escutar na porta definida em `PORT` em `server.env`; em produção o padrão operacional alinhado ao deploy é **3334** (ver também `scripts/deploy/ec2-remote-deploy.sh`).

## Padrão Nginx correto

O template versionado é **`deploy/nginx/sgp.conf.example`**. Em produção, copiar ou incluir a partir de **`/etc/nginx/conf.d/sgp.conf`** (ou convenção equivalente da imagem).

Requisitos:

- **`root /opt/sgp/current/frontend-dist;`**
- **`location ^~ /api/`** com **`proxy_pass http://127.0.0.1:3334/api/;`** (preserva o prefixo `/api/` no upstream)
- Headers de proxy: pelo menos `Host`, `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`
- SPA: **`try_files $uri $uri/ /index.html;`** na `location /`
- **Não** apontar o `root` para caminhos legados fora de `/opt/sgp/current/frontend-dist`

TLS (443) costuma ser configurado no mesmo host com `listen 443 ssl` e certificados; o exemplo do repositório mostra `listen 80` como base — estender no servidor conforme certbot ou ACM.

## Comandos de validação

Na EC2 ou a partir de uma máquina com acesso à URL pública:

```bash
# Sintaxe Nginx
sudo nginx -t

# Serviço da API SGP
sudo systemctl status sgp-api --no-pager -l

# Health da API direto no loopback (porta SGP)
curl -i http://127.0.0.1:3334/api/v1/health

# Frontend e API via domínio (HTTPS)
curl -I https://sgp.multivacia.com/
curl -I https://sgp.multivacia.com/api/v1/health
```

Respostas esperadas: **HTTP 200** nos health checks quando stack e roteamento estão corretos; `curl -I` no site deve retornar cabeçalhos do Nginx e do bundle estático.

## Troubleshooting: frontend antigo ou bundle errado

**Sintoma:** interface desatualizada, assets 404, ou comportamento de SPA quebrado após deploy.

**Causa comum:** o `root` do `server` Nginx apontava para um diretório legado fora do symlink atual (por exemplo configuração antiga com caminho incorreto).

**O que fazer:**

1. Abrir o arquivo de site ativo (ex.: **`/etc/nginx/conf.d/sgp.conf`**) e confirmar **`root /opt/sgp/current/frontend-dist;`**
2. Garantir que **`/opt/sgp/current`** é o symlink para a release recém-implantada (`readlink -f /opt/sgp/current`)
3. Validar e recarregar:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Não versionar credenciais nem copiar `.env` de produção para o repositório.

## Checklist para nova EC2

- [ ] Diretório base `/opt/sgp` com permissões adequadas para o usuário de deploy
- [ ] `releases/`, `shared/server.env` presente (conteúdo gerido fora do Git)
- [ ] Node instalado e caminho correto em `ExecStart` do systemd se não usar `/usr/bin/node`
- [ ] Unit **`sgp-api`** habilitada e apontando para `/opt/sgp/current/server` e `EnvironmentFile=/opt/sgp/shared/server.env`
- [ ] **`PORT=3334`** (ou a mesma porta usada no `proxy_pass`) em `server.env`
- [ ] Nginx: `root` e `/api/` conforme `deploy/nginx/sgp.conf.example`; **`sudo nginx -t`** ok
- [ ] Firewall / security group: 80 e 443 para o balanceador ou público conforme política; **não** expor 3334 publicamente se apenas Nginx deve frontear a API
- [ ] ARGOS na mesma máquina: `ARGOS_BASE_URL=http://127.0.0.1:8080` no `server.env` quando aplicável (sem mudanças de contrato)
- [ ] Primeiro deploy via Actions ou procedimento manual equivalente; validar com os `curl` desta página

## Referência cruzada

- Fluxo GitHub Actions, segredos e envs do backend: [`deploy-ec2-automatico.md`](deploy-ec2-automatico.md)
- ARGOS Gateway na EC2 (outro repositório): [`deploy-automatico-argos-ec2.md`](deploy-automatico-argos-ec2.md)
