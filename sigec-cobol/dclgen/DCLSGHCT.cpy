      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_HIST_CONTRATO)                            *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGHCT))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_HIST_CONTRATO TABLE
           ( ID_HIST              BIGINT NOT NULL,
             ID_CONTRATO          VARCHAR(15) NOT NULL,
             DT_EVENTO            TIMESTAMP NOT NULL,
             TP_EVENTO            CHAR(3) NOT NULL,
             ST_CONTRATO_ANT      CHAR(2),
             ST_CONTRATO_NOV      CHAR(2),
             CLASSIF_INAD_ANT     CHAR(1),
             CLASSIF_INAD_NOV     CHAR(1),
             VR_SALDO_ANT         DECIMAL(15,2),
             VR_SALDO_NOV         DECIMAL(15,2),
             DIAS_ATRASO_MAX_ANT  SMALLINT,
             DIAS_ATRASO_MAX_NOV  SMALLINT,
             OBSERVACAO           VARCHAR(240),
             DH_INCLUSAO          TIMESTAMP NOT NULL,
             DH_ALTERACAO         TIMESTAMP,
             USUARIO_INCLUSAO     VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO    VARCHAR(30),
             SITUACAO_REG         CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_HIST_CONTRATO              *
      ******************************************************************
       01  DCLSG-HIST-CONTRATO.
           10 SGHCT-ID-HIST               PIC S9(18) COMP-3.
           10 SGHCT-ID-CONTRATO.
              49 SGHCT-ID-CTR-LEN         PIC S9(4) USAGE COMP.
              49 SGHCT-ID-CTR-TXT         PIC X(15).
           10 SGHCT-DT-EVENTO             PIC X(26).
           10 SGHCT-TP-EVENTO             PIC X(3).
           10 SGHCT-ST-CTR-ANT            PIC X(2).
           10 SGHCT-ST-CTR-NOV            PIC X(2).
           10 SGHCT-CL-INAD-ANT           PIC X(1).
           10 SGHCT-CL-INAD-NOV           PIC X(1).
           10 SGHCT-VR-SALDO-ANT          PIC S9(13)V99 COMP-3.
           10 SGHCT-VR-SALDO-NOV          PIC S9(13)V99 COMP-3.
           10 SGHCT-DIAS-ATRASO-ANT       PIC S9(4) USAGE COMP.
           10 SGHCT-DIAS-ATRASO-NOV       PIC S9(4) USAGE COMP.
           10 SGHCT-OBSERVACAO.
              49 SGHCT-OBS-LEN            PIC S9(4) USAGE COMP.
              49 SGHCT-OBS-TXT            PIC X(240).
           10 SGHCT-DH-INCLUSAO           PIC X(26).
           10 SGHCT-DH-ALTERACAO          PIC X(26).
           10 SGHCT-USUARIO-INCLUSAO.
              49 SGHCT-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGHCT-USR-INC-TXT        PIC X(30).
           10 SGHCT-USUARIO-ALTERACAO.
              49 SGHCT-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGHCT-USR-ALT-TXT        PIC X(30).
           10 SGHCT-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-HIST-CONTRATO-IND.
           10 SGHCT-IND-ID-HIST           PIC S9(4) USAGE COMP.
           10 SGHCT-IND-ID-CONTRATO       PIC S9(4) USAGE COMP.
           10 SGHCT-IND-DT-EVENTO         PIC S9(4) USAGE COMP.
           10 SGHCT-IND-TP-EVENTO         PIC S9(4) USAGE COMP.
           10 SGHCT-IND-ST-CTR-ANT        PIC S9(4) USAGE COMP.
           10 SGHCT-IND-ST-CTR-NOV        PIC S9(4) USAGE COMP.
           10 SGHCT-IND-CL-INAD-ANT       PIC S9(4) USAGE COMP.
           10 SGHCT-IND-CL-INAD-NOV       PIC S9(4) USAGE COMP.
           10 SGHCT-IND-VR-SALDO-ANT      PIC S9(4) USAGE COMP.
           10 SGHCT-IND-VR-SALDO-NOV      PIC S9(4) USAGE COMP.
           10 SGHCT-IND-DIAS-ATR-ANT      PIC S9(4) USAGE COMP.
           10 SGHCT-IND-DIAS-ATR-NOV      PIC S9(4) USAGE COMP.
           10 SGHCT-IND-OBSERVACAO        PIC S9(4) USAGE COMP.
           10 SGHCT-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGHCT-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGHCT-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGHCT-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGHCT-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 18       *
      ******************************************************************
