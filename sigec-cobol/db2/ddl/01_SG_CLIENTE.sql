--*********************************************************************
--* SIGEC.SG_CLIENTE                                                   *
--* Cadastro de clientes (PF/PJ/Especial) do laboratorio de cobranca.  *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

CREATE TABLE SIGEC.SG_CLIENTE (
  ID_CLIENTE            BIGINT       NOT NULL
    GENERATED ALWAYS AS IDENTITY (START WITH 1 INCREMENT BY 1),
  TP_DOCUMENTO          CHAR(3)      NOT NULL,
  NR_DOCUMENTO          VARCHAR(14)  NOT NULL,
  NM_CLIENTE            VARCHAR(80)  NOT NULL,
  TP_CLIENTE            CHAR(2)      NOT NULL,
  ENDERECO              VARCHAR(120),
  CIDADE                VARCHAR(60),
  UF                    CHAR(2),
  CEP                   CHAR(8),
  IND_REINCIDENTE       CHAR(1)      NOT NULL WITH DEFAULT 'N',
  CLASSIFICACAO_RISCO   CHAR(1),
  DH_INCLUSAO           TIMESTAMP    NOT NULL WITH DEFAULT CURRENT TIMESTAMP,
  DH_ALTERACAO          TIMESTAMP,
  USUARIO_INCLUSAO      VARCHAR(30)  NOT NULL,
  USUARIO_ALTERACAO     VARCHAR(30),
  SITUACAO_REG          CHAR(1)      NOT NULL WITH DEFAULT 'A',
  CONSTRAINT PK_SG_CLIENTE PRIMARY KEY (ID_CLIENTE),
  CONSTRAINT UK_SG_CLIENTE_DOC UNIQUE (TP_DOCUMENTO, NR_DOCUMENTO),
  CONSTRAINT CK_SG_CLI_TPDOC   CHECK (TP_DOCUMENTO IN ('CPF','CNP','LE ')),
  CONSTRAINT CK_SG_CLI_TPCLI   CHECK (TP_CLIENTE   IN ('PF','PJ','ES')),
  CONSTRAINT CK_SG_CLI_REINC   CHECK (IND_REINCIDENTE IN ('S','N')),
  CONSTRAINT CK_SG_CLI_CLRISCO CHECK (CLASSIFICACAO_RISCO IN ('A','B','C','D','E')),
  CONSTRAINT CK_SG_CLI_SITREG  CHECK (SITUACAO_REG IN ('A','I'))
);

CREATE INDEX SIGEC.IX_SG_CLI_NOME
  ON SIGEC.SG_CLIENTE (NM_CLIENTE);

CREATE INDEX SIGEC.IX_SG_CLI_UF
  ON SIGEC.SG_CLIENTE (UF, CIDADE);

COMMENT ON TABLE SIGEC.SG_CLIENTE IS
  'Cadastro mestre de clientes do SIGEC (PF, PJ e Especial).';

COMMENT ON COLUMN SIGEC.SG_CLIENTE.ID_CLIENTE           IS 'PK numerica gerada pelo DB2 (IDENTITY).';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.TP_DOCUMENTO         IS 'Tipo do documento: CPF, CNP (CNPJ) ou LE (Legado/Especial).';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.NR_DOCUMENTO         IS 'Numero do documento (11 CPF / 14 CNPJ / livre para LE).';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.NM_CLIENTE           IS 'Nome / Razao Social do cliente.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.TP_CLIENTE           IS 'Tipo cliente: PF pessoa fisica, PJ juridica, ES especial.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.ENDERECO            IS 'Logradouro + numero + complemento.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.CIDADE              IS 'Cidade.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.UF                  IS 'Unidade da Federacao (sigla).';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.CEP                 IS 'CEP somente numeros (8 posicoes).';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.IND_REINCIDENTE     IS 'Reincidente em inadimplencia: S/N.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.CLASSIFICACAO_RISCO IS 'Rating interno de risco: A (melhor) a E (pior).';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.DH_INCLUSAO         IS 'Timestamp de inclusao do registro.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.DH_ALTERACAO        IS 'Timestamp da ultima alteracao.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.USUARIO_INCLUSAO    IS 'Usuario TSO/aplicativo que incluiu o registro.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.USUARIO_ALTERACAO   IS 'Usuario TSO/aplicativo da ultima alteracao.';
COMMENT ON COLUMN SIGEC.SG_CLIENTE.SITUACAO_REG        IS 'Situacao do registro: A ativo, I inativo (soft delete).';

COMMIT;
