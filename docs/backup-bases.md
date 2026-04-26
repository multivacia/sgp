# Backup de todas as bases PostgreSQL (`pg_dumpall`)

## Objetivo

Fornecer um fluxo **operacional, simples e auditável** para gerar **um único ficheiro lógico** (plain SQL) com **timestamp**, contendo:

- **Globals** do cluster (roles, atributos de roles, etc., conforme o `pg_dumpall`)
- **Todas as databases** do cluster

A ferramenta correta no ecossistema PostgreSQL para isto é **`pg_dumpall`**, não SQL puro executado no servidor como substituto de backup.

Scripts no repositório:

- `scripts/db/backup_all_databases.ps1` (Windows / PowerShell)
- `scripts/db/backup_all_databases.sh` (Linux / macOS / bash)

SQL auxiliar (apenas inspeção):

- `scripts/sql/list_databases_precheck.sql` — lista `pg_database`; **não** realiza backup.

---

## O que esta solução cobre

- Backup **lógico** completo via **`pg_dumpall`** num único ficheiro `.sql` (plain).
- Inclui, em geral, a parte de **globals** e o conteúdo das **databases** do cluster (comportamento documentado do `pg_dumpall` na versão do teu cliente).

## O que esta solução **não** cobre

- Backup **físico** (ficheiros de dados do cluster)
- **PITR** / arquivo de **WAL** / recuperação contínua
- **Alta disponibilidade** ou replicação
- **Retenção automática** ou rotação de ficheiros (os scripts **não apagam** backups antigos)
- **Restore automatizado** (apenas orientação básica mais abaixo)

---

## Pré-requisitos

1. **Cliente PostgreSQL** instalado na máquina onde corres o script, com **`pg_dumpall`** disponível no **PATH** (inclui a pasta `bin` da instalação).
2. **Permissões** no servidor: utilizador com capacidade de correr `pg_dumpall` (tipicamente superuser ou role com privilégios adequados; depende da política do servidor).
3. **Conectividade** de rede até ao `PGHOST`:`PGPORT`.
4. **Versão do cliente** (`pg_dumpall --version`) idealmente compatível com a do servidor (ver limitações).

### Linux / macOS — permissão de execução

Na primeira utilização:

```bash
chmod +x scripts/db/backup_all_databases.sh
```

---

## Variáveis e parâmetros

### Variáveis de ambiente PostgreSQL (recomendado)

| Variável    | Significado        |
|------------|--------------------|
| `PGHOST`   | Host do servidor   |
| `PGPORT`   | Porta (ex.: 5432) |
| `PGUSER`   | Utilizador de ligação |
| `PGPASSWORD` | Senha (ver riscos abaixo) |
| `PGSSLMODE`| Modo SSL, se aplicável |

Os scripts **não** exigem estes nomes além dos padrões do PostgreSQL; o `pg_dumpall` respeita-os automaticamente.

### Variáveis específicas dos scripts

| Variável             | Efeito |
|----------------------|--------|
| `BACKUP_OUTPUT_DIR`  | Diretório onde gravar o `.sql` (predefinição: diretório atual) |
| `BACKUP_FILE_PREFIX` | Prefixo opcional no nome do ficheiro (ex.: `sgp-`) |
| `BACKUP_HOST_LABEL`  | Texto usado no nome do ficheiro (host/ambiente/cluster); sanitizado |
| `BACKUP_ENV_LABEL`   | Se `BACKUP_HOST_LABEL` estiver vazio, usa-se isto (ex.: `dev`, `hml`, `prd`); senão cai para `PGHOST`; senão `cluster` |

### PowerShell — parâmetros opcionais

- `-OutputDir`, `-FilePrefix`, `-HostLabel`, `-EnvLabel`  
  Preenchem o mesmo que as variáveis acima quando indicados (têm prioridade sobre env onde aplicável no script).

### Formato do nome do ficheiro

```
{prefix}backup_all_databases_{label}_YYYYMMDD_HHMMSS.sql
```

Se já existir um ficheiro com o mesmo nome base no mesmo segundo, é acrescentado `_1`, `_2`, … — **nunca** se sobrescreve um ficheiro existente.

---

## Estratégia de credenciais (segurança)

1. **Preferir** ficheiro **`.pgpass`** (Linux/macOS: `~/.pgpass`) ou **`pgpass.conf`** no Windows:  
   `%APPDATA%\postgresql\pgpass.conf`  
   Formato: `hostname:port:database:username:password` (permissões restritas no Unix).

2. **Variável `PGPASSWORD`**: aceite pelo cliente PostgreSQL, mas **evitar** em produção em scripts partilhados; em shells pode ficar em **histórico** ou em listagens de processos. Usar só com consciência do risco.

3. **Não** commitar senhas no repositório nem passar password em linha de comando para `pg_dumpall` nos scripts fornecidos (não há `-W` forçado; o cliente pede ou usa `.pgpass` / `PGPASSWORD`).

4. Para evitar password no histórico do PowerShell, preferir `.pgpass` / `pgpass.conf` ou pedir credenciais por mecanismo seguro da vossa política.

---

## Uso — Windows (PowerShell)

```powershell
cd caminho\para\sgp-argos

$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
# Opcional: definir PGPASSWORD apenas se aceitarem o risco, ou configurar pgpass.conf

$env:BACKUP_OUTPUT_DIR = "D:\backups\postgres"
$env:BACKUP_ENV_LABEL = "hml"

.\scripts\db\backup_all_databases.ps1
```

Com parâmetros:

```powershell
.\scripts\db\backup_all_databases.ps1 -OutputDir "D:\backups\postgres" -HostLabel "db-prod-01"
```

---

## Uso — Linux / macOS (bash)

```bash
cd /caminho/para/sgp-argos

export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres

export BACKUP_OUTPUT_DIR=/var/backups/postgresql
export BACKUP_ENV_LABEL=dev

chmod +x scripts/db/backup_all_databases.sh   # uma vez
./scripts/db/backup_all_databases.sh
```

---

## Inspeção prévia (SQL auxiliar)

Para listar databases antes do backup (opcional):

```bash
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d postgres -f scripts/sql/list_databases_precheck.sql
```

Isto **não** substitui o `pg_dumpall`.

---

## Como validar o backup gerado

1. **Existência**: o script imprime o caminho completo do ficheiro no fim.
2. **Tamanho**: deve ser **> 0** bytes (os scripts abortam se for zero).
3. **Cabeçalho**: ficheiros `pg_dumpall` em plain costumam começar por comentários do tipo `--` e referências a `PostgreSQL database dump`:

   ```bash
   head -n 30 /caminho/para/backup_all_databases_....sql
   ```

4. **Conteúdo mínimo**: procurar por `CREATE ROLE`, `CREATE DATABASE`, ou tabelas conhecidas:

   ```bash
   grep -E "CREATE (ROLE|DATABASE)" backup_all_databases_....sql | head
   ```

5. **Recomendação**: fazer **restore de teste** num servidor ou database **de homologação** (nome novo, cluster de teste), nunca primeiro ensaio em produção.

---

## Restore básico do dump plain (orientação segura)

**Atenção:** restaurar um dump completo pode **sobrepor** roles e databases existentes com o mesmo nome. Só executar em ambiente controlado e com backup prévio.

- Criar/cluster de destino vazio ou isolado, utilizador com permissões adequadas.
- Exemplo (linux), após criar o role `postgres` de destino conforme política:

```bash
psql -h <host_destino> -p <porta> -U <superuser> -d postgres -f backup_all_databases_YYYYMMDD_HHMMSS.sql
```

Ajustar host, porta e utilizador. Em Windows, `psql` do mesmo cliente PostgreSQL.

**Não** automatizar restore destrutivo neste repositório; validar sempre o plano com a equipa de base de dados.

---

## Compatibilidade e limitações

| Tópico | Notas |
|--------|--------|
| **Versão cliente vs servidor** | Cliente mais novo que o servidor costuma funcionar; cliente mais velho que o servidor pode falhar ou omitir objetos. Alinhar versões quando possível. |
| **Tablespaces** | Caminhos no sistema de ficheiros podem exigir ajuste manual na restauração noutra máquina. |
| **Tamanho** | Dumps plain podem ser muito grandes; tempo de I/O e espaço em disco. |
| **Impacto** | `pg_dumpall` lê dados; pode haver carga no servidor; preferir janelas acordadas. |
| **Encriptação** | Ligações TLS conforme `PGSSLMODE` / servidor; o ficheiro `.sql` em disco é **texto** — proteger permissões e local de armazenamento. |

---

## Resumo operacional

| Passo | Ação |
|-------|------|
| 1 | Garantir `pg_dumpall` no PATH |
| 2 | Configurar credenciais (`.pgpass` / env) |
| 3 | Definir `BACKUP_OUTPUT_DIR` e opcionalmente `BACKUP_HOST_LABEL` / `BACKUP_ENV_LABEL` |
| 4 | Executar o script `.ps1` ou `.sh` |
| 5 | Validar ficheiro e, em HML, testar restore |

---

## Relação com outros scripts

O reset operacional da aplicação (quando aplicável) está documentado noutros ficheiros; **backup com `pg_dumpall` é independente** e deve ser feito **antes** de operações destrutivas na base, conforme a vossa política.
