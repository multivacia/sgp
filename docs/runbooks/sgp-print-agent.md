# Runbook — SGP Print Agent (impressão térmica direta)

## 1. Objetivo

Permitir que o **SGP+ Web** imprima tickets térmicos de atividades **diretamente** na impressora 80mm, **sem diálogo do navegador**, sem silent printing global e **sem alterar a impressora padrão** do Windows.

```
SGP+ Web  →  http://127.0.0.1:8765  →  SGP Print Agent  →  Impressora térmica (RAW ESC/POS)
```

**Modelo mantido:**

- 1 atividade = 1 ticket = 1 job de impressão = 1 corte (guilhotina)
- PDFs, relatórios e outros documentos continuam com `window.print()` normal

Se o agente estiver offline, o SGP+ usa **fallback** pelo navegador.

---

## 2. Pré-requisitos

| Item | Detalhe |
|------|---------|
| Windows | Agente MVP suporta impressão RAW via PowerShell |
| Node.js 20+ | Para rodar o agente |
| Impressora térmica 80mm | Ex.: POS-80, ESC/POS |
| Driver instalado | Nome exato visível em Impressoras e scanners |
| SGP+ Web | Com variáveis `VITE_PRINT_AGENT_URL` e `VITE_PRINT_AGENT_TOKEN` |

---

## 3. Instalação

Na raiz do repositório:

```powershell
npm run print-agent:install
cd sgp-print-agent
copy sgp-print-agent.config.example.json sgp-print-agent.config.json
```

Edite `sgp-print-agent/sgp-print-agent.config.json`:

```json
{
  "port": 8765,
  "printerName": "POS-80(copy of 1)",
  "paperWidthMm": 80,
  "charsPerLine": 42,
  "cutMode": "partial",
  "authToken": "troque-este-token-local",
  "allowedOrigins": [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://app.suaempresa.com.br"
  ],
  "mockPrinter": false
}
```

No SGP+ Web (`.env` local):

```env
VITE_PRINT_AGENT_URL=http://127.0.0.1:8765
VITE_PRINT_AGENT_TOKEN=troque-este-token-local
```

O **token deve ser idêntico** nos dois lados.

---

## 4. Configuração da impressora

1. Instale o driver da térmica (não precisa ser impressora **padrão** do Windows).
2. Copie o **nome exato** da impressora para `printerName` no config.
3. No driver (Configurações do dispositivo):
   - **Paper Cutting:** `After document` (cada job = 1 corte)
   - **Largura:** 80mm
   - **Margens:** mínimas
   - Evite formulário contínuo `80×3276mm` se possível

### Modo mock (sem impressora física)

```json
"mockPrinter": true
```

O agente apenas registra logs, útil para desenvolvimento.

---

## 5. Iniciar o agente

```powershell
# Na raiz do repo
npm run print-agent:dev
```

Ou:

```powershell
cd sgp-print-agent
npm run dev
```

Logs em: `sgp-print-agent/logs/sgp-print-agent.log`

O agente escuta **somente** em `127.0.0.1:8765` (não expõe na rede).

---

## 6. Endpoints

| Método | Rota | Auth | Descrição |
|--------|------|------|-----------|
| GET | `/health` | Não | Status do agente |
| POST | `/print/activity-ticket` | Sim | 1 ticket |
| POST | `/print/activity-tickets/batch` | Sim | Lote (imprime e corta um a um) |
| POST | `/print/test` | Sim | Ticket de teste |

Header obrigatório (exceto `/health`):

```http
X-SGP-Print-Token: troque-este-token-local
Content-Type: application/json
```

---

## 7. Testar

### Health

```powershell
curl http://127.0.0.1:8765/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "sgp-print-agent",
  "version": "0.1.0",
  "printerName": "POS-80(copy of 1)",
  "mockPrinter": false,
  "paperWidthMm": 80
}
```

### Teste de impressão (API)

```powershell
curl -X POST http://127.0.0.1:8765/print/test `
  -H "Content-Type: application/json" `
  -H "X-SGP-Print-Token: troque-este-token-local"
```

### Teste pelo SGP+ Web

1. Suba `npm run dev` e o agente.
2. Abra Planejamento ou Detalhe da esteira.
3. Confirme **"Impressão direta disponível"**.
4. Clique **"Testar impressora térmica"**.
5. Imprima 3 atividades em lote — **sem diálogo** do navegador.

---

## 8. Integração no SGP+ Web

| Arquivo | Função |
|---------|--------|
| `src/services/printing/localPrintAgentService.ts` | Cliente HTTP do agente |
| `src/features/operational-tickets/useActivityTicketPrint.ts` | Agente primeiro, fallback `window.print()` |
| `src/features/operational-tickets/ThermalPrintAgentControls.tsx` | Status + teste na UI |

Fluxo:

1. `GET /health` ao carregar a tela (poll a cada 30s).
2. Se online → `POST /print/activity-tickets/batch`.
3. Se offline ou erro → fila `window.print()` + aviso amigável.

---

## 9. Troubleshooting

### Fallback para window.print()

Comportamento **intencional** quando o agente está offline ou falha:

- O SGP+ monta a fila de tickets no DOM e chama `window.print()` ticket a ticket.
- O usuário pode precisar confirmar cada impressão no navegador — isso é esperado sem o agente.
- PDFs, relatórios (ex.: evolução de esteiras) e outros documentos **sempre** usam `window.print()` normal; o agente não interfere nesses fluxos.

Para voltar à impressão direta: suba o agente, confirme **"Impressão direta disponível"** e reimprima.

### Agente offline / "Agente local indisponível"

- Confirme `npm run print-agent:dev` em execução.
- Teste `curl http://127.0.0.1:8765/health`.
- Verifique firewall bloqueando porta local (raro em 127.0.0.1).
- Confirme `VITE_PRINT_AGENT_URL` e reinicie o frontend.

### Ainda pede confirmação no navegador

- O agente não foi detectado — caiu no fallback.
- Token diferente entre `.env` e `sgp-print-agent.config.json` → 401 no agente.
- Origin não listada em `allowedOrigins` → erro CORS no console.

### Impressora não encontrada

- Ajuste `printerName` com o nome **exato** do Windows.
- Impressoras e scanners → Propriedades → nome na aba Geral.

### Não corta

- Driver: **Paper Cutting = After document**.
- Cada ticket é um job separado no agente.
- Teste `cutMode`: `"full"` em vez de `"partial"` no config.

### Caracteres estranhos / acentuação

- Agente usa codificação **CP850** (comum em térmicas ESC/POS).
- Acentos são transliterados (ex.: `Veículo` → `Veiculo`).
- Se persistir, ajuste charset no driver ou evolua para tabela UTF-8 da impressora.

### Impressão em branco

- `printerName` incorreto ou fila do Windows travada.
- Reinicie spooler: `Restart-Service Spooler` (PowerShell admin).
- Teste com `mockPrinter: false` e ticket de teste via `/print/test`.

### Porta 8765 ocupada

- Altere `port` no config e `VITE_PRINT_AGENT_URL` no SGP+.
- Verifique processo: `netstat -ano | findstr 8765`.

### Bobina contínua (linguição)

- **Não** deve ocorrer com o agente (1 job/ticket).
- Se ocorrer no fallback do navegador, o agente estava offline.
- Não voltar a documento único no SGP+.

### Impressão na impressora errada

- O agente usa **somente** `printerName` do config — não a padrão do Windows.
- Corrija o nome no JSON e reinicie o agente.

---

## 10. Segurança

- Bind em `127.0.0.1` apenas.
- CORS restrito a `allowedOrigins`.
- Token compartilhado local (`X-SGP-Print-Token`).
- Payload validado com Zod — sem impressão de texto livre arbitrário.
- Não exponha a porta 8765 na rede/LAN.

---

## 11. Próximo passo técnico

Se ESC/POS via RAW não atender (logo, QR, charset específico), evoluir para biblioteca dedicada ou comando de corte explícito por modelo de impressora.

---

## Referências

- Impressão silenciosa via navegador (fallback): [`thermal-ticket-silent-printing.md`](thermal-ticket-silent-printing.md)
- Código do agente: [`sgp-print-agent/`](../../sgp-print-agent/)
- Cliente web: [`src/services/printing/localPrintAgentService.ts`](../../src/services/printing/localPrintAgentService.ts)
