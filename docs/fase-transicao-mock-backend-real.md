# SGP — Fase de transição: mock consistente → base operacional real

## 1. Objetivo da fase

Transformar o SGP de uma base mockada consistente para uma base operacional real, **sem quebrar a experiência já aprovada no frontend**.

A ideia não é “refazer o sistema”.  
É **trocar o motor com o carro andando**, por etapas controladas.

---

## 2. Decisão arquitetural oficial

Manter a arquitetura que já faz mais sentido para o ecossistema:

**React / Web / PWA**  
→ consome apenas a **API principal em Node.js**  
→ que fala com **PostgreSQL**  
→ e, quando necessário no futuro, chama a **Analysis API em Python** para inteligência, saúde, previsão e ARGOS.

Ou seja:

| Camada | Tecnologia |
|--------|------------|
| Frontend | React + Vite + Tailwind |
| API principal | Node.js |
| Banco operacional | PostgreSQL |
| Análises / IA | Serviço Python separado, **depois** |

Essa separação evita misturar **CRUD operacional** com **inteligência**.

---

## 3. Princípios da transição

### 3.1 Não quebrar a UX aprovada

Tudo o que o mock já consolidou visualmente vira **contrato de experiência**.  
O backend entra para **sustentar a tela**, não para piorar a tela.

### 3.2 Fazer convivência híbrida

Durante a transição, o sistema poderá operar com:

- telas **100% mock**
- telas **híbridas**
- telas **100% reais**

Sem trauma e sem big bang.

### 3.3 Virar a chave por módulo

Nada de “integrar tudo de uma vez”.  
A troca deve ser **módulo a módulo**.

### 3.4 Backend guiado pelo frontend

Como o frontend já amadureceu, os **contratos da API** devem nascer a partir da **necessidade real das telas**.

### 3.5 ARGOS fica fora desta fase

Nada de puxar IA agora.  
Primeiro consolidamos o **operacional real**.

---

## 4. Estratégia macro de execução

A ordem recomendada continua sendo esta:

### Fase base

1. Fundação backend  
2. Autenticação  
3. Contratos e tratamento de erro  
4. Infra de acesso a dados  

### Módulos

5. Colaboradores real  
6. Matrizes real  
7. Esteiras real  
8. Atividades real  
9. Apontamentos real  
10. Jornada do Colaborador  
11. Dashboard real  

---

## 5. Estratégia de convivência mock + real

Esse é o ponto mais importante da fase.

### Modelo recomendado

Criar uma **camada de serviços** no frontend com três modos:

- `mock`
- `real`
- `auto` / **híbrido**

Exemplo mental:

- `colaboradoresService`
- `matrizesService`
- `esteirasService`

Cada serviço implementa o **mesmo contrato**, mas com dois adapters:

- **mock**
- **api**

Assim o frontend não fica acoplado ao mock atual nem ao `fetch` direto.

### Regra prática

- A **tela** chama sempre o **serviço**.  
- Quem decide de onde vem o dado é a **camada de infraestrutura**.

Isso permite:

- integrar por partes  
- testar sem travar evolução  
- voltar para mock em caso de falha  
- fazer rollout controlado  

---

## 6. Contrato de API: padrão oficial

A API precisa nascer padronizada.

### 6.1 Envelope de sucesso

```json
{
  "data": "..."
}
```

### 6.2 Envelope de erro

```json
{
  "error": {
    "code": "COLABORADOR_NOT_FOUND",
    "message": "Colaborador não encontrado.",
    "details": {}
  }
}
```

### 6.3 Padrões mínimos

- `GET /recurso`
- `GET /recurso/:id`
- `POST /recurso`
- `PUT` / `PATCH /recurso/:id`
- `DELETE /recurso/:id` quando fizer sentido
- paginação simples
- filtros por query string
- ordenação básica
- status HTTP coerente

### 6.4 Regras de erro

| HTTP | Significado |
|------|-------------|
| 400 | Requisição inválida |
| 401 | Não autenticado |
| 403 | Sem permissão |
| 404 | Não encontrado |
| 409 | Conflito de regra de negócio |
| 422 | Validação de domínio |
| 500 | Erro interno |

---

## 7. Fundação backend que precisa existir antes dos módulos

Antes de integrar Colaboradores, a base precisa ter:

### 7.1 Estrutura da API Node

Sugestão de camadas:

- `routes`
- `controllers`
- `services`
- `repositories`
- `schemas` / `validators`
- `middleware`
- `auth`
- `shared/errors`
- `shared/logger`

### 7.2 Banco PostgreSQL

Itens obrigatórios:

- migrations  
- seed inicial  
- conexão por pool  
- convenção de nomes  
- auditoria mínima (`created_at`, `updated_at`, `deleted_at` quando fizer sentido)  

### 7.3 Autenticação

Como base oficial:

- login  
- sessão / token  
- usuário autenticado  
- perfil / permissões preparadas  
- guardas no frontend  

RBAC pode começar simples, mas o **esqueleto** já deve nascer certo.

### 7.4 Observabilidade mínima

- logs estruturados  
- correlation / request id  
- health endpoint  
- tratamento global de erro  
- validação de ambiente  

---

## 8. Primeiro módulo real: Colaboradores

Essa é a melhor porta de entrada.

### Por que começar por Colaboradores

- domínio mais estável  
- menor risco  
- alto valor estrutural  
- destrava login, responsáveis, atribuições e filtros futuros  

### Escopo mínimo do módulo real

- listar colaboradores  
- detalhar colaborador  
- criar  
- editar  
- ativar / inativar  
- filtrar por setor / status  
- preparar campo de perfil / permissão  
- preparar skills / tags, mesmo que inicialmente simples  

### Entidades base sugeridas

**`colaboradores`**

| Campo | Observação |
|-------|------------|
| id | |
| nome | |
| email | |
| matrícula / código | opcional |
| setor_id | |
| status | |
| perfil_id | |
| cargo | opcional |
| telefone | opcional |
| avatar_url | opcional |
| created_at | |
| updated_at | |
| deleted_at | opcional |

**`setores`**

| Campo | Observação |
|-------|------------|
| id | |
| nome | |
| código | opcional |
| ativo | |

**`perfis`**

| Campo | Observação |
|-------|------------|
| id | |
| nome | |
| descrição | |

**Skills e vínculo com colaborador** — entra como base preparada, mesmo que uso funcional venha depois.

---

## 9. Segundo módulo real: Matrizes

Depois de Colaboradores, vem Matrizes.

### Objetivo

Tirar a estrutura operacional do campo mock e colocar em persistência real:

- matriz  
- tarefas  
- setores  
- atividades  
- ordenação  
- versionamento leve ou status de publicação  

### Valor estratégico

Matrizes viram a ponte entre:

- cadastro estrutural  
- esteira operacional real  

---

## 10. Terceiro módulo real: Esteiras

Só depois da base de pessoas e estrutura estar pronta.

### Motivo

Esteira é onde tudo se cruza:

- colaborador  
- matriz  
- atividade  
- status  
- progresso  
- apontamento futuro  

Se entrar cedo demais, o risco de retrabalho explode.

---

## 11. Dashboard real entra depois

O dashboard deve vir **por último** na integração total.

### Estratégia correta

No começo, o dashboard pode ser:

- parcialmente real  
- parcialmente mockado  
- ou baseado em endpoints agregados simples  

A recomendação é **não travar a operação** esperando analytics perfeito.

1. Primeiro fazer o sistema **operar**.  
2. Depois fazer o sistema **contar a própria história**.  

---

## 12. Critério de pronto por módulo

Cada módulo só é considerado “realmente virado” quando cumprir:

### Backend

- migrations prontas  
- CRUD principal funcional  
- validação  
- erros padronizados  
- logs  
- testes essenciais  

### Frontend

- tela consumindo API real  
- loading / empty / error states corretos  
- sem dependência do mock naquele fluxo principal  
- comportamento visual preservado  

### Negócio

- fluxo utilizável de ponta a ponta  
- dados persistindo corretamente  
- regras básicas validadas  

---

## 13. Riscos da transição

| Risco | Mitigação |
|-------|-----------|
| **13.1** Acoplamento do frontend ao mock atual | Camada de serviço antes de plugar API |
| **13.2** API nascer genérica demais | Endpoints a partir das telas reais |
| **13.3** Dashboard roubar prioridade | Analytics pesado para depois |
| **13.4** Querer resolver RBAC completo cedo demais | Esqueleto agora, refinamento depois |
| **13.5** Esteiras entrarem cedo demais | Ordem: Colaboradores → Matrizes → Esteiras |

---

## 14. Entregáveis desta Fase 1

Pacote de planejamento esperado:

### Entregável A — Blueprint da transição

Documento com:

- arquitetura alvo  
- estratégia mock + real  
- ordem oficial dos módulos  
- critérios de pronto  

### Entregável B — Contrato técnico do backend

- padrão de rotas  
- padrão de erro  
- convenções de resposta  
- autenticação  
- paginação / filtros  

### Entregável C — Modelo inicial do banco

Principalmente:

- auth  
- colaboradores  
- setores  
- perfis  
- skills  
- base de matrizes  

### Entregável D — Prompt do Cursor para começar a fundação

Um prompt grande e cirúrgico para:

- estruturar API Node  
- configurar PostgreSQL  
- criar migrations iniciais  
- implementar autenticação base  
- subir módulo Colaboradores real  

---

## 15. Decisão executiva final desta fase

> **O SGP entra agora em macrofase de transição controlada do mock para backend real, preservando a UX consolidada. A ordem oficial será: fundação backend → autenticação → Colaboradores → Matrizes → Esteiras → demais módulos operacionais → dashboard real.**

---

## 16. Próximo passo objetivo

O próximo passo mais útil é entregar o **pacote Fase 2 de preparação técnica**, com estes três blocos já mastigados:

1. Arquitetura de pastas da API Node  
2. Schema inicial PostgreSQL  
3. Prompt do Cursor para criar a fundação real do backend  
