# SGP+ V2 — Demonstração

Versão de demonstração do **SGP+ V2** para apresentar à gestora da Bravo.
É o mesmo app da V2 (`apps/sgp-v2`). A diferença é que **não usa o servidor nem o banco**: as chamadas da API são respondidas no próprio navegador, com dados de exemplo.

- **Online (privada):** https://claude.ai/artifact/RFAWgUFLAB541XT4839dhW
- **Na VPS:** `https://<domínio>/V2-demo/` (depois de publicar, veja abaixo)
- **Documento vivo da V2:** [`docs/v2/SGP_V2.md`](docs/v2/SGP_V2.md)

---

## O que a demonstração tem

| | |
|---|---|
| **Dados** | Matriz "Gol GTI completo" com as **20 etapas, 15 setores e 138 atividades** da planilha mestra (`docs/Nova Esteira v1.0 - MESTRA - Gol GTI - OS7945.xlsx`), com os tempos reais. Pessoas com **nomes fictícios**. |
| **Esteiras prontas** | Gol GT · DEF-4G56 (em andamento, com uma atividade parada) · Gol GTI · TUV-1A23 (em planejamento, matriz inteira) · Gol GTI · ZAB-7C89 (atrasada) · Polo · GHI-2J34 (em elaboração, para mostrar o "Liberar"). |
| **Semana** | A semana atual (ou a próxima, no fim de semana) já vem publicada com atividades da DEF-4G56 e da ZAB-7C89. |
| **Usuária** | Gestora logada com todas as permissões (criar e alterar esteira, planejar, liberar, corrigir apontamento, fotos das etapas). |
| **Tablet** | Qualquer colaborador da grade entra com **qualquer PIN de 4 números** (o PIN `0000` simula "PIN errado"). |

Cada pessoa que abre tem os **próprios dados**: o que um faz não aparece para o outro. **Recarregar a página (ou "Recomeçar") volta ao início.**

A faixa amarela no topo (**DEMONSTRAÇÃO · dados de exemplo**) troca entre **Gestora** e **Tablet** e tem **Recomeçar**.

---

## Roteiro sugerido para a apresentação (~15 min)

1. **Início** → saudação, "Nova esteira" em destaque e os atalhos.
2. **Hoje** → "Precisa de você": a atividade **parada** e a esteira **atrasada**, com "Ver esteira". "Pessoas hoje" (quem não apontou e quem está sem tarefa) aparece só em dia útil.
3. **Esteiras → Gol GT · DEF-4G56** → progresso, etapas → setores → atividades com responsável. Mostre **Dados da esteira** e o botão **Horas** numa atividade feita (a gestora corrige ou remove um lançamento, sempre com motivo).
4. **Nova esteira (o "cardápio")** → matriz → etapas com figura (tirar/incluir) → **Personalizar** uma etapa (tirar atividade, trocar responsável do setor inteiro) → placa, veículo, modelo, cliente, **fotos do carro** (Tirar foto / Galeria) → prazo, prioridade, responsável → **Criar esteira** → **Liberar para planejar**.
5. **Alterar esteira** (na DEF-4G56) → as **mesmas telas da criação**; o que já foi feito vem com **cadeado**; incluir uma etapa da matriz (ex.: Volante); alterar o prazo nos **Dados da esteira** → **O que muda** → motivo obrigatório → Confirmar.
6. **Semana** → **Sugerir semana** → "Escolher início" mostra em que dia cada esteira termina e se cabe no prazo → **Lotação** por dia → abrir um dia → **Ajustar** (mudar o dia ou a pessoa) → **Publicar semana**.
7. **Fotos das etapas** (Início) → escolher uma etapa → **Tirar foto** ou **Galeria** → a foto fica **"Neste aparelho"** → **Enviar para o banco** → voltar à Nova esteira e ver a foto no cardápio. Na **Esteira criada!** e no detalhe da esteira, **Fotos do carro** funcionam do mesmo jeito (guarda no aparelho → Enviar).
8. **Tablet** (faixa amarela → Tablet) → tocar no nome → PIN → **Sua próxima tarefa** → **COMEÇAR** (cronômetro com segundos) → **PAUSAR** (motivo) → **TERMINEI** → **Quanto ficou pronto?** → **Registrado!** → **Tempo errado? Corrigir** (o colaborador corrige o próprio lançamento de hoje enquanto a atividade não terminou). Mostre também **Já fiz · lançar horas** e **Fiz outra atividade**.

Dica: entre um tema e outro, use **Recomeçar** se quiser voltar aos dados iniciais.

---

## Fotos de exemplo (para escolher no lugar da câmera)

Coloque fotos de carros/interiores em `apps/sgp-v2/src/demo/fotos-exemplo/` (`.jpg`, `.png`, `.webp`; o nome do arquivo vira o nome mostrado) e gere o pacote de novo. Aparece o botão **Escolher entre as fotos de exemplo** em Fotos das etapas e Fotos do carro. Útil dentro da página do Claude, onde a câmera é bloqueada. Hoje a pasta está vazia (aguardando fotos da Bravo).

## Rodar no seu computador

Pré-requisito: Node 20+.

```bash
cd apps/sgp-v2
npm ci
npx vite --mode demo        # abre em http://localhost:5174/  (modo desenvolvimento)
```

Ou gerar o pacote e abrir como site estático:

```bash
cd apps/sgp-v2
npm run build:demo          # gera apps/sgp-v2/dist-demo/
python3 -m http.server 8080 -d dist-demo    # http://localhost:8080/
```

---

## Publicar na VPS (`/V2-demo/`)

Bloco do nginx e comentários completos: [`deploy/nginx/sgp-v2-demo.location.example`](deploy/nginx/sgp-v2-demo.location.example).

```bash
# 1) no seu computador
cd apps/sgp-v2 && npm ci && npm run build:demo

# 2) na VPS (uma vez)
sudo mkdir -p /var/www/sgp-v2-demo && sudo chown <usuario> /var/www/sgp-v2-demo

# 3) enviar
rsync -a --delete apps/sgp-v2/dist-demo/ <usuario>@<vps>:/var/www/sgp-v2-demo/

# 4) colar o bloco do arquivo de exemplo dentro do server { } existente, e:
sudo nginx -t && sudo systemctl reload nginx

# 5) abrir https://<domínio>/V2-demo/
```

> ⚠️ O destino do `rsync --delete` tem de ser **`/var/www/sgp-v2-demo/`**. Nunca a pasta da V1 nem `/var/www/sgp-v2` (V2 real): o `--delete` apaga o que estiver lá.

**Atualizar:** repita os passos 1 e 3. **Desfazer:** remova o bloco, `sudo nginx -t`, reload e apague `/var/www/sgp-v2-demo`.

---

## Cuidados

- É **só demonstração**: nada é gravado no banco e nada da V1 é afetado. Os números são de exemplo.
- **Não instale como app** no celular a partir da demo (o atalho instalado aponta para a V2 real, `/V2/`).
- A página online do Claude é **privada**: para outra pessoa abrir, compartilhe pelo menu "Compartilhar" da página.
- A página pede para não ser indexada por buscadores (`noindex`).
- **Câmera:** dentro da página do Claude, o visualizador bloqueia a câmera (use **Galeria**). Na VPS, no navegador do celular, **Tirar foto** abre a câmera.

## Diferenças para a V2 real

| Na demo | Na V2 real |
|---|---|
| Dados em memória no navegador | API da V1 (`/api/v1`) com o banco do SGP+ |
| Qualquer PIN entra | PIN real do colaborador (Modo Produção da V1) |
| Fotos "enviadas" ficam só no navegador | Fotos das etapas na tabela `v2_etapa_imagens` (migration `0054`) e do carro em `v2_esteira_fotos` (migration `0056`) |
| Correção pelo colaborador sem registro no banco | Tabela `v2_correcoes_apontamento` (migration `0055`) |
| Sem login | Mesmo e-mail e senha do SGP+ |

## Onde está o código da demo

- `apps/sgp-v2/src/demo/api.ts` — API simulada (as mesmas rotas da V1 que a V2 usa).
- `apps/sgp-v2/src/demo/DemoBar.tsx` — faixa "DEMONSTRAÇÃO".
- `apps/sgp-v2/src/demo/matriz.json` — matriz da planilha mestra (nomes trocados por fictícios).
- `apps/sgp-v2/src/main.tsx` — só no `--mode demo` carrega a demo; o build normal (`npm run build`) não inclui nada disso.
