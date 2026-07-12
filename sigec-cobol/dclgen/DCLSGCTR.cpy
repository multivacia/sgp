      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_CONTRATO)                                 *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGCTR))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_CONTRATO TABLE
           ( ID_CONTRATO            VARCHAR(15) NOT NULL,
             ID_CLIENTE             BIGINT NOT NULL,
             TP_CONTRATO            CHAR(2) NOT NULL,
             VR_TOTAL               DECIMAL(15,2) NOT NULL,
             VR_SALDO               DECIMAL(15,2) NOT NULL,
             QT_PARCELAS            SMALLINT NOT NULL,
             QT_PARCELAS_ABERTAS    SMALLINT NOT NULL,
             QT_PARCELAS_VENCIDAS   SMALLINT NOT NULL,
             DT_INICIO              DATE NOT NULL,
             DT_FIM                 DATE,
             TX_JUROS               DECIMAL(5,2) NOT NULL,
             PC_MULTA               DECIMAL(5,2) NOT NULL,
             ST_CONTRATO            CHAR(2) NOT NULL,
             CLASSIFICACAO_INAD     CHAR(1),
             IND_RENEGOCIACAO_ATIVA CHAR(1) NOT NULL,
             FAIXA_ATRASO           SMALLINT NOT NULL,
             DIAS_ATRASO_MAX        SMALLINT NOT NULL,
             DH_INCLUSAO            TIMESTAMP NOT NULL,
             DH_ALTERACAO           TIMESTAMP,
             USUARIO_INCLUSAO       VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO      VARCHAR(30),
             SITUACAO_REG           CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_CONTRATO                   *
      ******************************************************************
       01  DCLSG-CONTRATO.
           10 SGCTR-ID-CONTRATO.
              49 SGCTR-ID-CTR-LEN         PIC S9(4) USAGE COMP.
              49 SGCTR-ID-CTR-TXT         PIC X(15).
           10 SGCTR-ID-CLIENTE            PIC S9(18) COMP-3.
           10 SGCTR-TP-CONTRATO           PIC X(2).
           10 SGCTR-VR-TOTAL              PIC S9(13)V99 COMP-3.
           10 SGCTR-VR-SALDO              PIC S9(13)V99 COMP-3.
           10 SGCTR-QT-PARCELAS           PIC S9(4) USAGE COMP.
           10 SGCTR-QT-PARC-ABERTAS       PIC S9(4) USAGE COMP.
           10 SGCTR-QT-PARC-VENCIDAS      PIC S9(4) USAGE COMP.
           10 SGCTR-DT-INICIO             PIC X(10).
           10 SGCTR-DT-FIM                PIC X(10).
           10 SGCTR-TX-JUROS              PIC S9(3)V99 COMP-3.
           10 SGCTR-PC-MULTA              PIC S9(3)V99 COMP-3.
           10 SGCTR-ST-CONTRATO           PIC X(2).
           10 SGCTR-CLASSIF-INAD          PIC X(1).
           10 SGCTR-IND-RENEG-ATIVA       PIC X(1).
           10 SGCTR-FAIXA-ATRASO          PIC S9(4) USAGE COMP.
           10 SGCTR-DIAS-ATRASO-MAX       PIC S9(4) USAGE COMP.
           10 SGCTR-DH-INCLUSAO           PIC X(26).
           10 SGCTR-DH-ALTERACAO          PIC X(26).
           10 SGCTR-USUARIO-INCLUSAO.
              49 SGCTR-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGCTR-USR-INC-TXT        PIC X(30).
           10 SGCTR-USUARIO-ALTERACAO.
              49 SGCTR-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGCTR-USR-ALT-TXT        PIC X(30).
           10 SGCTR-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-CONTRATO-IND.
           10 SGCTR-IND-ID-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGCTR-IND-ID-CLIENTE        PIC S9(4) USAGE COMP.
           10 SGCTR-IND-TP-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGCTR-IND-VR-TOTAL          PIC S9(4) USAGE COMP.
           10 SGCTR-IND-VR-SALDO          PIC S9(4) USAGE COMP.
           10 SGCTR-IND-QT-PARCELAS       PIC S9(4) USAGE COMP.
           10 SGCTR-IND-QT-PARC-ABERTAS   PIC S9(4) USAGE COMP.
           10 SGCTR-IND-QT-PARC-VENCIDAS  PIC S9(4) USAGE COMP.
           10 SGCTR-IND-DT-INICIO         PIC S9(4) USAGE COMP.
           10 SGCTR-IND-DT-FIM            PIC S9(4) USAGE COMP.
           10 SGCTR-IND-TX-JUROS          PIC S9(4) USAGE COMP.
           10 SGCTR-IND-PC-MULTA          PIC S9(4) USAGE COMP.
           10 SGCTR-IND-ST-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGCTR-IND-CLASSIF-INAD      PIC S9(4) USAGE COMP.
           10 SGCTR-IND-IND-RENEG         PIC S9(4) USAGE COMP.
           10 SGCTR-IND-FAIXA-ATRASO      PIC S9(4) USAGE COMP.
           10 SGCTR-IND-DIAS-ATR-MAX      PIC S9(4) USAGE COMP.
           10 SGCTR-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGCTR-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGCTR-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGCTR-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGCTR-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 22       *
      ******************************************************************
