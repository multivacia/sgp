# CHANGELOG

## [1.8.3] - 2026-07-09

### Adicionado
- manifesto raiz `app-version.json` como fonte base de verdade da versão funcional do SGP+;
- identificação discreta de versão/ambiente no shell principal, no modo produção e no kiosk/mobile;
- endpoint público `GET /api/v1/version` com envelope `{ data, meta }`, sem acesso a banco;
- preparação de metadata de build/deploy para produção e homologação (`APP_ENV`, `APP_VERSION`, `APP_RELEASE_NAME`, `GIT_SHA`, `BUILD_TIME` e equivalentes Vite).

### Ajustado
- contraste do tema `light-executive` nas superfícies de apontamento, produção e kiosk, com foco em status, badges, mensagens de exceção, botões de tempo e rodapé de versão.

### Infra
- workflow real de produção atualizado para injetar metadata de build/deploy;
- workflow `deploy-hml.yml` adicionado como preparação de pipeline equivalente para homologação, sem promoção para produção nesta etapa.
