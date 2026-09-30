# Manual do Colaborador — SGP (Sistema de Gestão de Produção)

> **Para quem é este manual:** colaboradores que apontam atividades no SGP, seja pelo
> navegador (app web) ou pelo tablet fixo na fábrica (Modo Fábrica / Kiosk).

---

## 1. O que é o SGP e por que você usa ele

O SGP registra o tempo que você dedica a cada atividade de uma esteira (OS/veículo). Com
esses apontamentos o gestor enxerga o andamento real do serviço sem precisar perguntar a
ninguém.

**O seu papel é simples:** quando terminar um bloco de trabalho, registre quanto tempo você
dedicou. O restante acontece automaticamente.

---

## 2. Primeiro acesso

1. Abra o endereço do SGP no navegador (fornecido pelo gestor ou TI).
2. Digite seu **e-mail** e sua **senha** e clique em **Entrar**.
3. Se for o primeiro login, o sistema pode pedir para você **criar uma nova senha** — siga as
   instruções na tela e guarde bem.

> **Se esqueceu a senha:** peça ao gestor para fazer o reset administrativo.

---

## 3. Minhas Atividades

Caminho: menu lateral → **Minhas Atividades** (`/app/minhas-atividades`)

Esta é a tela principal do colaborador. Ela lista todas as atividades que foram designadas
para você nas esteiras ativas.

### O que você vê em cada card de atividade

| Campo | O que significa |
|-------|----------------|
| Nome da atividade | O passo que você precisa executar |
| Esteira | Veículo / OS ao qual pertence |
| Tarefa | Macro-bloco de trabalho (ex.: Desmontagem, Pintura) |
| Setor | Área técnica (ex.: Funilaria, Elétrica) |
| Seu papel | Responsável principal ou Apoio |
| Tempo previsto | Estimativa de horas planejada pelo gestor |
| Status | Em andamento, Não iniciado, Concluído, etc. |
| Prazo | Data-limite se houver |

### Cor dos indicadores de prazo

| Cor | Significado |
|-----|------------|
| Vermelho / **Em atraso** | A data-limite já passou |
| Verde / **Finalizadas** | Atividade concluída |
| Cinza | Dentro do prazo normal |

### Como chegar ao apontamento

Clique no card da atividade para abrir a tela de apontamento.

---

## 4. Fazer um Apontamento

Caminho: Minhas Atividades → clique na atividade (`/app/apontamento/:id`)

### Passo a passo

1. **Minutos trabalhados** — informe quantos minutos você dedicou nesta sessão (ex.: `90`).
2. **Quantidade executada** — quantas unidades você processou (ex.: `3` capas costuradas).
   Deixe `1` se a atividade não tem contagem de unidades.
3. **Data de realização** — automaticamente preenchida com hoje; altere se o trabalho foi
   feito em outro dia.
4. **Observação** *(opcional)* — anote qualquer ocorrência relevante.
5. **Justificativa** *(aparece quando necessário)* — se o tempo excede o previsto ou há outra
   condição especial, o sistema pede uma justificativa. Selecione a categoria mais adequada e,
   se necessário, descreva em texto livre.
6. Clique em **Salvar apontamento**.

Uma mensagem verde confirma o registro. Você pode fazer múltiplos apontamentos na mesma
atividade ao longo dos dias.

> **Dica:** você não precisa apontar tudo de uma vez. Registre parcialmente e continue
> apontando nas próximas sessões de trabalho.

---

## 5. Minha Fila

Caminho: menu lateral → **Minha Fila** (`/app/minha-fila`)

Exibe suas atividades organizadas **por data de trabalho**, com navegação de dia anterior /
dia seguinte.

- Use esta tela para ver o que está previsto para hoje ou para uma data específica.
- Clique no botão de apontamento rápido (ícone de relógio) em qualquer atividade para
  abrir o drawer lateral sem sair da fila.
- Atividades **bloqueadas por sequência** aparecem com indicador de aviso — você não pode
  apontar até que a atividade anterior esteja concluída.

---

## 6. Jornada

Caminho: menu lateral → **Jornada** (`/app/jornada`)

Mostra o **histórico dos seus apontamentos** agrupados por período:

| Período | Abrangência |
|---------|------------|
| Hoje | Apenas o dia atual |
| Esta semana | Segunda a hoje |
| Últimos 7 dias | Janela móvel |
| Últimos 30 dias | Janela móvel |
| Este mês | Do dia 1 até hoje |

Para cada atividade você vê: esteira, tarefa, setor, minutos acumulados, status atual e
prazo.

Use esta tela para conferir se não esqueceu de apontar alguma sessão de trabalho.

---

## 7. SGP+ Produção — Tablet / Totem (Kiosk)

Caminho: endereço especial do Kiosk fornecido pelo gestor (`/app/kiosk`)

O tablet fixo na fábrica roda o **Modo Kiosk** — uma interface touch-first projetada para
ser usada sem teclado.

### Fluxo no Kiosk

```
Grade de colaboradores → Toque no seu avatar
        ↓
Tela de PIN → Digite seu PIN de 4+ dígitos
        ↓
Cards de atividades → Toque na atividade que quer apontar
        ↓
Formulário de apontamento → Deslize o slider de progresso,
                             ajuste o tempo, toque em Salvar
        ↓
Volta para a grade (outros colaboradores podem usar)
```

### Tela de PIN — primeira vez

Se for o **primeiro login após criação do cadastro**, o sistema obriga a troca do PIN padrão:

1. Digite o PIN temporário fornecido pelo gestor.
2. O sistema leva para a tela **Criar novo PIN**.
3. Digite um PIN de sua escolha (mínimo 4 dígitos) e confirme.
4. Pronto — use o novo PIN nas próximas sessões.

> **PIN bloqueado?** Tentativas incorretas múltiplas bloqueiam o acesso. Peça ao gestor
> para desbloquear e resetar o PIN na tela de admin de colaboradores.

### Card de atividade no Kiosk

| Elemento | O que fazer |
|----------|------------|
| Anel de progresso | Mostra o % já concluído na atividade |
| Slider (0 – 100%) | Arraste para indicar o progresso atual |
| Botões de tempo (15 / 30 / 45 / 60 min) | Toque no tempo mais próximo desta sessão |
| Campo de minutos | Ou digite manualmente |
| Quantidade executada | Ajuste quantas unidades fez nesta sessão |
| Justificativa | Aparece automaticamente se o tempo excede o previsto |
| Botão Salvar | Confirma o apontamento |

### Bloqueio de sequência no Kiosk

Se uma atividade depende de outra que ainda não foi concluída, ela aparece com um aviso
**"Aguardando atividades anteriores"**. Você ainda pode apontar, mas precisa selecionar uma
justificativa para execução fora de sequência.

---

## 8. SGP+ Produção — Interface Web (navegador)

Caminho: endereço especial de produção fornecido pelo gestor (`/app/producao`)

Funciona de forma similar ao Kiosk, mas acessível no navegador de qualquer computador.

### Fluxo

1. Acesse `/app/producao`.
2. Selecione seu nome na lista de colaboradores (busca disponível).
3. Digite seu PIN.
4. Você entra na sua **fila de atividades de produção**.
5. Clique no botão de apontamento em qualquer atividade.
6. Preencha o formulário e clique em **Salvar**.

O filtro no topo da fila permite ver: **Todas**, **Pendentes** ou **Concluídas**.

---

## 9. Dúvidas frequentes

**Esqueci de apontar ontem — o que faço?**
Na tela de apontamento, altere o campo **Data de realização** para o dia correto antes de
salvar.

**Apontei o tempo errado — posso corrigir?**
Fale com o gestor. Gestores com permissão especial podem editar ou remover apontamentos.

**A atividade não aparece em Minhas Atividades**
Você ainda não foi designado(a) para ela. Peça ao gestor de esteira para verificar a
designação.

**O Kiosk não aceita meu PIN**
Confira se não há letras ou espaços — o PIN é só numérico. Se o problema persistir, o
gestor pode resetar o PIN na tela administrativa.

**Minha conta foi bloqueada por tentativas**
Fale com o gestor para desbloquear via painel de administração de colaboradores.
