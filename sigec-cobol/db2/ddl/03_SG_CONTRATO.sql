--*********************************************************************
--* SIGEC.SG_CONTRATO                                                  *
--* Contratos de credito/cobranca vinculados a um cliente.             *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

CREATE TABLE SIGEC.SG_CONTRATO (
  ID_CONTRATO             VARCHAR(15)   NOT NULL,
  ID_CLIENTE              BIGINT        NOT NULL,
  TP_CONTRATO             CHAR(2)       NOT NULL,
  VR_TOTAL                DECIMAL(15,2) NOT NULL WITH DEFAULT 0,
  VR_SALDO                DECIMAL(15,2) NOT NULL WITH DEFAULT 0,
  QT_PARCELAS             SMALLINT      NOT NULL WITH DEFAULT 0,
  QT_PARCELAS_ABERTAS     SMALLINT      NOT NULL WITH DEFAULT 0,
  QT_PARCELAS_VENCIDAS    SMALLINT      NOT NULL WITH DEFAULT 0,
  DT_INICIO               DATE          NOT NULL,
  DT_FIM                  DATE,
  TX_JUROS                DECIMAL(5,2)  NOT NULL WITH DEFAULT 0,
  PC_MULTA                DECIMAL(5,2)  NOT NULL WITH DEFAULT 0,
  ST_CONTRATO             CHAR(2)       NOT NULL WITH DEFAULT 'AT',
  CLASSIFICACAO_INAD      CHAR(1),
  IND_RENEGOCIACAO_ATIVA  CHAR(1)       NOT NULL WITH DEFAULT 'N',
  FAIXA_ATRASO            SMALLINT      NOT NULL WITH DEFAULT 0,
  DIAS_ATRASO_MAX         SMALLINT      NOT NULL WITH DEFAULT 0,
  DH_INCLUSAO             TIMESTAMP     NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  DH_ALTERACAO            TIMESTAMP,
  USUARIO_INCLUSAO        VARCHAR(30)   NOT NULL,
  USUARIO_ALTERACAO       VARCHAR(30),
  SITUACAO_REG            CHAR(1)       NOT NULL WITH DEFAULT 'A',
  CONSTRAINT PK_SG_CONTRATO PRIMARY KEY (ID_CONTRATO),
  CONSTRAINT FK_SG_CTR_CLI  FOREIGN KEY (ID_CLIENTE)
    REFERENCES SIGEC.SG_CLIENTE (ID_CLIENTE) ON DELETE RESTRICT,
  CONSTRAINT CK_SG_CTR_TPCTR  CHECK (TP_CONTRATO IN ('PF','PJ','ES','SP')),
  CONSTRAINT CK_SG_CTR_STATUS CHECK (ST_CONTRATO IN
    ('AT','BL','IN','RN','EN','CA')),
  CONSTRAINT CK_SG_CTR_CLINAD CHECK (CLASSIFICACAO_INAD IN
    ('N','L','M','G','R') OR CLASSIFICACAO_INAD IS NULL),
  CONSTRAINT CK_SG_CTR_RENEG  CHECK (IND_RENEGOCIACAO_ATIVA IN ('S','N')),
  CONSTRAINT CK_SG_CTR_SITREG CHECK (SITUACAO_REG IN ('A','I')),
  CONSTRAINT CK_SG_CTR_VLR    CHECK (VR_TOTAL >= 0 AND VR_SALDO >= 0)
);

CREATE INDEX SIGEC.IX_SG_CTR_CLI
  ON SIGEC.SG_CONTRATO (ID_CLIENTE);

CREATE INDEX SIGEC.IX_SG_CTR_STATUS
  ON SIGEC.SG_CONTRATO (ST_CONTRATO, CLASSIFICACAO_INAD);

CREATE INDEX SIGEC.IX_SG_CTR_ATRASO
  ON SIGEC.SG_CONTRATO (DIAS_ATRASO_MAX DESC);

COMMENT ON TABLE SIGEC.SG_CONTRATO IS
  'Contratos de credito vinculados a clientes.';

COMMENT ON COLUMN SIGEC.SG_CONTRATO.ID_CONTRATO            IS 'PK textual (formato livre do banco de origem, ate 15 pos).';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.ID_CLIENTE             IS 'FK para SG_CLIENTE.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.TP_CONTRATO            IS 'Tipo contrato: PF, PJ, ES, SP (Especial legado).';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.VR_TOTAL               IS 'Valor total contratado (principal).';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.VR_SALDO               IS 'Saldo devedor consolidado atual.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.QT_PARCELAS            IS 'Quantidade total de parcelas do contrato.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.QT_PARCELAS_ABERTAS    IS 'Quantidade de parcelas em aberto (AB/PP/VC).';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.QT_PARCELAS_VENCIDAS   IS 'Quantidade de parcelas vencidas nao quitadas.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.DT_INICIO              IS 'Data de assinatura / inicio do contrato.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.DT_FIM                 IS 'Data de encerramento previsto ou realizado.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.TX_JUROS               IS 'Taxa de juros mensal do contrato (percentual).';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.PC_MULTA               IS 'Percentual de multa por atraso.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.ST_CONTRATO            IS 'Status: AT ativo, BL bloqueado, IN inadimplente, RN renegociacao, EN encerrado, CA cancelado.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.CLASSIFICACAO_INAD     IS 'Classe de inadimplencia: N nenhum, L leve, M medio, G grave, R renegociado.';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.IND_RENEGOCIACAO_ATIVA IS 'Indicador de renegociacao vigente (S/N).';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.FAIXA_ATRASO           IS 'Codigo de faixa de atraso (0=em dia, 1=1-30, 2=31-60, 3=61-90, 4=90+).';
COMMENT ON COLUMN SIGEC.SG_CONTRATO.DIAS_ATRASO_MAX        IS 'Maior atraso observado entre as parcelas em aberto.';

COMMIT;
