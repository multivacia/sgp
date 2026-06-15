# Runbook — Impressão silenciosa de tickets térmicos (80mm)

## 1. Objetivo

Operar o **SGP+ Web** em estação controlada (totem/PC da fábrica) para imprimir tickets térmicos de atividades **sem diálogo de confirmação** a cada `window.print()`.

**Modelo operacional atual (mantido):**

```
1 atividade → 1 ticket → 1 print job → guilhotina corta ao fim do job
```

Não voltar ao documento único em lote — isso gerava bobina contínua na impressora POS-80.

Este runbook cobre **configuração de estação** (Windows + Edge/Chrome + driver). O código do SGP+ **não** escolhe impressora nem suprime o diálogo por JavaScript.

---

## 2. Pré-requisitos

| Item | Detalhe |
|------|---------|
| Estação dedicada | PC ou tablet fixo só para SGP+ / impressão |
| Navegador | Microsoft Edge ou Google Chrome (Chromium) |
| Impressora térmica | Ex.: POS-80, 80mm, guilhotina automática |
| Driver instalado | Driver do fabricante (não só “Generic / Text Only”) |
| SGP+ acessível | URL local (`http://localhost:5173`) ou homolog/produção |
| Permissão de admin | Para atalho, política de grupo ou registro (silent print) |

---

## 3. Impressora padrão do Windows

1. **Configurações → Bluetooth e dispositivos → Impressoras e scanners**
2. Selecione a térmica (ex.: `POS-80(copy of 1)`)
3. **Gerenciar → Definir como padrão**
4. Confirme: ao imprimir um arquivo de teste do Windows, sai na térmica

> Com impressão silenciosa, **todos** os jobs vão para a impressora padrão. Não há como o SGP+ escolher outra impressora via código.

---

## 4. Configuração do driver (POS-80 e similares)

Abra **Propriedades da impressora → Configurações do dispositivo** (ou utilitário do fabricante).

| Opção | Valor recomendado | Motivo |
|-------|-------------------|--------|
| **Largura do papel** | 80mm (ou 72mm se o driver usar área útil menor) | Alinha com CSS `--thermal-ticket-width: 80mm` |
| **Formulário / tamanho** | Página curta ou automática — **evitar** rolo contínuo tipo `80×3276mm` para jobs únicos | Job único por atividade já é curto |
| **Paper Cutting** | **After document** | Cada `window.print()` = 1 job = 1 corte |
| **Margens** | Mínimas / 0 | Evita corte lateral e desperdício |
| **Escala** | 100% | Sem “Ajustar à página” |
| **Feed distance after print** | Padrão do fabricante (ex.: 27mm) | Ajuste fino da posição do corte |
| **Blank space at page's end** | Do not print | Reduz papel em branco no fim |

No diálogo de impressão do navegador (quando **não** estiver em modo silencioso):

- Destino: impressora térmica
- Margens: **Nenhuma**
- Escala: **100%**
- Cabeçalho/rodapé do navegador: **desativados** (se disponível)

---

## 5. Limitações do `window.print()` (SGP+)

| Comportamento | Detalhe |
|---------------|---------|
| Sem silent printing | O navegador **sempre** pode exibir diálogo de impressão |
| Com silent printing | Job vai direto para a **impressora padrão** com opções padrão |
| Escolha de impressora | **Impossível** via JavaScript (segurança do browser) |
| Fila do SGP+ | N atividades = N chamadas a `window.print()` = N jobs |
| Corte físico | Depende do driver cortar **ao fim de cada job/documento** |
| Próximo passo técnico | Se silent + driver não bastarem: **ESC/POS/raw** com comando de corte explícito |

---

## 6. Impressão silenciosa — Microsoft Edge

### 6.1 Atalho com flags (estação local)

1. Clique com o botão direito na área de trabalho → **Novo → Atalho**
2. Em **Destino**, use (ajuste URL e caminho do Edge):

```text
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --kiosk=http://localhost:5173 --edge-kiosk-type=fullscreen --no-first-run --kiosk-printing
```

**Homologação / produção** — troque a URL:

```text
--kiosk=https://hml.suaempresa.com.br
```

3. Nome sugerido: `SGP+ Impressão térmica`
4. Sempre abra o SGP+ **por este atalho** na estação de impressão

> Em versões recentes do Edge (112+), `--kiosk-printing` costuma exigir também `--kiosk` e `--edge-kiosk-type=fullscreen` para silent print confiável.

### 6.2 Política corporativa (opcional)

Para deploy em várias estações (GPO / Intune):

| Política | Valor |
|----------|-------|
| **SilentPrintingEnabled** | `true` (habilitado) |

Registro (máquina ou usuário):

```text
HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Microsoft\Edge
  SilentPrintingEnabled = 1 (DWORD)
```

Documentação: [SilentPrintingEnabled — Microsoft Learn](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/silentprintingenabled)

Reinicie o Edge após aplicar política.

### 6.3 Modo app (menos restritivo que kiosk fullscreen)

Se fullscreen bloquear navegação do gestor:

```text
"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --app=http://localhost:5173 --kiosk-printing --no-first-run
```

---

## 7. Impressão silenciosa — Google Chrome

### 7.1 Atalho com flags

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --app=http://localhost:5173 --kiosk-printing --no-first-run
```

Modo kiosk estrito (sem barra de endereço):

```text
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk=http://localhost:5173 --kiosk-printing --no-first-run
```

### 7.2 Política corporativa (opcional)

```text
HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome
  SilentPrintingEnabled = 1 (DWORD)
```

Disponível em Chrome 144+; comportamento alinhado a `--kiosk-printing`.

---

## 8. Subir o SGP+ na estação

**Desenvolvimento local:**

```powershell
# Terminal 1 — API
cd server
$env:DATABASE_URL="postgresql://postgres:SENHA@127.0.0.1:5432/sgp_dev"
npm run dev

# Terminal 2 — Frontend
npm run dev
```

Abra o atalho apontando para `http://localhost:5173` (ou rota desejada).

**Produção / homolog:** use a URL do ambiente no atalho `--kiosk` ou `--app`.

---

## 9. Como testar com 3 atividades

1. Estação com atalho **Edge/Chrome + `--kiosk-printing`**
2. Impressora térmica = **padrão** do Windows
3. Driver: **Paper Cutting = After document**
4. No SGP+:
   - Abra uma esteira com ≥ 3 atividades, ou
   - Planejamento operacional → **Imprimir tickets visíveis** (≥ 3 itens)
5. Inicie a impressão em lote
6. **Esperado com silent printing:**
   - Overlay: “Imprimindo ticket 1 de 3…”
   - **Sem** diálogo de impressão (pode haver flash rápido do preview)
   - 3 jobs na fila da impressora
   - 3 tickets físicos com corte entre eles
7. **Esperado sem silent printing:**
   - Diálogo de impressão **3 vezes** (limitação normal do browser)

---

## 10. Troubleshooting

### Ainda pede confirmação a cada ticket

| Verificação | Ação |
|-------------|------|
| Atalho correto? | Confirmar `--kiosk-printing` no destino do atalho |
| Edge recente? | Adicionar `--kiosk` + `--edge-kiosk-type=fullscreen` |
| Abriu pelo atalho? | Não usar Edge/Chrome “normal” da barra de tarefas |
| Política | Conferir `SilentPrintingEnabled = 1` e reiniciar browser |
| Perfil duplicado | Criar atalho dedicado só para a estação térmica |

### Não corta entre atividades

| Verificação | Ação |
|-------------|------|
| Driver | **Paper Cutting → After document** (cada job = 1 corte) |
| Jobs separados? | Ver fila da impressora: devem aparecer vários jobs seguidos |
| Bobina contínua? | Ver seção abaixo — não voltar a documento único no SGP+ |
| Próximo passo | ESC/POS com comando de corte explícito |

### Sai bobina contínua (linguição)

| Causa provável | Ação |
|----------------|------|
| Documento único antigo | Confirmar versão atual do SGP+ (fila 1 job/ticket) |
| Driver com formulário 80×3276mm tratando vários jobs como rolo | Ajustar formulário; manter **After document** |
| Silent print desligado + usuário confirma 1 job só | Reimprimir com fila completa; conferir overlay “X de Y” |

### Sai na impressora errada

| Causa | Ação |
|-------|------|
| Silent printing usa **padrão** | Definir térmica como impressora padrão do Windows |
| Outro usuário Windows | Configurar padrão no mesmo usuário que roda o atalho |

### Margem ou tamanho errado

| Ajuste | Onde |
|--------|------|
| Largura 76/72mm | CSS `src/features/operational-tickets/thermalActivityTicket.css` → `--thermal-ticket-width` |
| Escala | Diálogo do navegador 100% (ou padrão salvo com silent print) |
| Cortes laterais | Reduzir largura no CSS ou no driver |

### Edge trava ao imprimir (histórico)

Algumas versões antigas (94–96) falhavam com `--kiosk-printing` em jobs maiores. Atualize Edge/Chrome. Com 1 ticket por job, o risco é menor.

---

## 11. Referências no repositório

| Recurso | Caminho |
|---------|---------|
| Fila de impressão (1 job/ticket) | `src/features/operational-tickets/useActivityTicketPrint.ts` |
| Layout 80mm | `src/features/operational-tickets/thermalActivityTicket.css` |
| Texto na UI | `src/features/operational-tickets/activityTicketPrintCopy.ts` |
| Carga prod → dev (outro runbook) | `docs/runbooks/load-prod-data-into-dev.md` |

---

## 12. Resumo operacional

```
Estação Windows
  → Impressora térmica = padrão
  → Driver: 80mm, After document, margens mínimas
  → Atalho Edge/Chrome: --kiosk-printing (+ --kiosk em Edge)
  → SGP+ imprime fila: 1 atividade por window.print()
  → Guilhotina corta ao fim de cada job
```

Se após tudo isso ainda não cortar ou não for silencioso o suficiente, a limitação está no stack navegador/driver — planejar **impressão ESC/POS/raw** como evolução.
