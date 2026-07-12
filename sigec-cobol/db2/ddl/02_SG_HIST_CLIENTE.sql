--*********************************************************************
--* SIGEC.SG_HIST_CLIENTE                                              *
--* Historico de alteracoes em SG_CLIENTE (snapshot por evento).       *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

CREATE TABLE SIGEC.SG_HIST_CLIENTE (
  ID_HIST               BIGINT       NOT NULL
    GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  ID_CLIENTE            BIGINT       NOT NULL,
  DT_EVENTO             TIMESTAMP    NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  TP_EVENTO             CHAR(3)      NOT NULL,
  -- Snapshot dos campos mais relevantes de SG_CLIENTE no instante do evento
  TP_DOCUMENTO          CHAR(3),
  NR_DOCUMENTO          VARCHAR(14),
  NM_CLIENTE            VARCHAR(80),
  TP_CLIENTE            CHAR(2),
  ENDERECO              VARCHAR(120),
  CIDADE                VARCHAR(60),
  UF                    CHAR(2),
  CEP                   CHAR(8),
  IND_REINCIDENTE       CHAR(1),
  CLASSIFICACAO_RISCO   CHAR(1),
  OBSERVACAO            VARCHAR(240),
  DH_INCLUSAO           TIMESTAMP    NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  DH_ALTERACAO          TIMESTAMP,
  USUARIO_INCLUSAO      VARCHAR(30)  NOT NULL,
  USUARIO_ALTERACAO     VARCHAR(30),
  SITUACAO_REG          CHAR(1)      NOT NULL WITH DEFAULT 'A',
  CONSTRAINT PK_SG_HIST_CLIENTE PRIMARY KEY (ID_HIST),
  CONSTRAINT FK_HCLI_CLIENTE FOREIGN KEY (ID_CLIENTE)
    REFERENCES SIGEC.SG_CLIENTE (ID_CLIENTE) ON DELETE RESTRICT,
  CONSTRAINT CK_SG_HCLI_TPEVT CHECK (TP_EVENTO IN
    ('INC','ALT','INA','REA','RSC','REI','END','OBS')),
  CONSTRAINT CK_SG_HCLI_SITREG CHECK (SITUACAO_REG IN ('A','I'))
);

CREATE INDEX SIGEC.IX_SG_HCLI_CLI
  ON SIGEC.SG_HIST_CLIENTE (ID_CLIENTE, DT_EVENTO DESC);

COMMENT ON TABLE SIGEC.SG_HIST_CLIENTE IS
  'Historico de eventos/alteracoes de clientes (snapshot por evento).';

COMMENT ON COLUMN SIGEC.SG_HIST_CLIENTE.ID_HIST     IS 'PK IDENTITY do historico.';
COMMENT ON COLUMN SIGEC.SG_HIST_CLIENTE.ID_CLIENTE  IS 'FK para SG_CLIENTE.';
COMMENT ON COLUMN SIGEC.SG_HIST_CLIENTE.DT_EVENTO   IS 'Timestamp do evento registrado.';
COMMENT ON COLUMN SIGEC.SG_HIST_CLIENTE.TP_EVENTO   IS 'Tipo evento: INC inclusao, ALT alteracao, INA inativacao, REA reativacao, RSC reclassificacao risco, REI reincidencia, END mudanca endereco, OBS observacao.';
COMMENT ON COLUMN SIGEC.SG_HIST_CLIENTE.OBSERVACAO  IS 'Texto livre para o evento (ex.: motivo da reclassificacao).';

COMMIT;
