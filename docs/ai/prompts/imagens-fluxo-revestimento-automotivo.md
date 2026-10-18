# TASK_ID: imagens-fluxo-revestimento-automotivo

Objetivo: integrar, apenas na interface correta do SGP+ V2, as 20 ilustrações do fluxo de revestimento automotivo.

Assets já publicados:
- Repositório: multivacia/sgp
- Branch de assets: assets/fluxo-revestimento-automotivo-2026-10-18
- Commit dos assets: 30dc5cb86a73119c4d8256726682de9c42340883
- Diretório: public/assets/revestimento-automotivo/
- Mapeamento: public/assets/revestimento-automotivo/manifesto.json
- Licença: MIT, em LICENSE-TABLER.txt

Instruções:
1. Ler CLAUDE.md, AGENTS.md, PROJECT_CONTEXT.md e SESSION_CHECKPOINT.md.
2. Examinar branch de trabalho e verificar o caminho correto da V2; NÃO supor que a V2 compartilha arquivos com a V1.
3. Criar branch de implementação isolada sobre a base aprovada para homologação; integrar os assets por cherry-pick ou cópia dos 20 SVGs da branch acima, evitando merges desnecessários da develop.
4. Aplicar ilustrações apenas onde fizer sentido na interface do fluxo, preservando os 20 títulos de etapa e a configuração real de sequência. Não transformar uma representação do documento em regra de negócio obrigatória.
5. Usar termos em português na interface: 'Etapa', jamais 'STEP'. Não alterar símbolos internos de domínio sem necessidade.
6. As ilustrações SVG são aproximadas e abstratas, não fotografias das peças; se for exigida fidelidade à imagem de referência, apresentar a opção dos recortes PNG fornecidos separadamente e solicitar validação de direitos de uso.
7. Preservar completamente a V1 e todas as funcionalidades existentes: não alterar backend, APIs, permissões, fluxos, banco, migrations, kiosk nem deploy.
8. Usar carregamento local, responsivo, sem distorção, com texto alternativo acessível.
9. Executar build, testes focados e validação visual mobile; informar resultados REAIS e caminhos das alterações.
10. Gerar docs/ai/returns/imagens-fluxo-revestimento-automotivo-retorno.md com evidências; não promover nem fazer deploy sem autorização expressa.
