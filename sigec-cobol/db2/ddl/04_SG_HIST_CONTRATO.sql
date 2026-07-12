--*********************************************************************
--* SIGEC.SG_HIST_CONTRATO                                             *
--* Historico de alteracoes de status/valores em SG_CONTRATO.          *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

CREATE TABLE SIGEC.SG_HIST_CONTRATO (
  ID_HIST                 BIGINT       NOT NULL
    GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  ID_CONTRATO             VARCHAR(15)  NOT NULL,
  DT_EVENTO               TIMESTAMP    NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  TP_EVENTO               CHAR(3)      NOT NULL,
  ST_CONTRATO_ANT         CHAR(2),
  ST_CONTRATO_NOV         CHAR(2),
  CLASSIF_INAD_ANT        CHAR(1),
  CLASSIF_INAD_NOV        CHAR(1),
  VR_SALDO_ANT            DECIMAL(15,2),
  VR_SALDO_NOV            DECIMAL(15,2),
  DIAS_ATRASO_MAX_ANT     SMALLINT,
  DIAS_ATRASO_MAX_NOV     SMALLINT,
  OBSERVACAO              VARCHAR(240),
  DH_INCLUSAO             TIMESTAMP    NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  DH_ALTERACAO            TIMESTAMP,
  USUARIO_INCLUSAO        VARCHAR(30)  NOT NULL,
  USUARIO_ALTERACAO       VARCHAR(30),
  SITUACAO_REG            CHAR(1)      NOT NULL WITH DEFAULT 'A',
  CONSTRAINT PK_SG_HIST_CONTRATO PRIMARY KEY (ID_HIST),
  CONSTRAINT FK_HCTR_CONTRATO FOREIGN KEY (ID_CONTRATO)
    REFERENCES SIGEC.SG_CONTRATO (ID_CONTRATO) ON DELETE RESTRICT,
  CONSTRAINT CK_SG_HCTR_TPEVT CHECK (TP_EVENTO IN
    ('INC','ALT','STA','INA','REN','ENC','CAN','JUR','BLQ','DES')),
  CONSTRAINT CK_SG_HCTR_SITREG CHECK (SITUACAO_REG IN ('A','I'))
);

CREATE INDEX SIGEC.IX_SG_HCTR_CTR
  ON SIGEC.SG_HIST_CONTRATO (ID_CONTRATO, DT_EVENTO DESC);

COMMENT ON TABLE SIGEC.SG_HIST_CONTRATO IS
  'Historico de alteracoes de status/valores de contratos.';

COMMENT ON COLUMN SIGEC.SG_HIST_CONTRATO.TP_EVENTO IS
  'INC inclusao, ALT alteracao, STA mudanca status, INA inadimplencia, REN renegociacao, ENC encerramento, CAN cancelamento, JUR calculo juros, BLQ bloqueio, DES desbloqueio.';

COMMIT;
