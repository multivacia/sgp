      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_HIST_PROCESSAMENTO)                       *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGHPR))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_HIST_PROCESSAMENTO TABLE
           ( ID_PROCESSAMENTO    BIGINT NOT NULL,
             NM_JOB              VARCHAR(30) NOT NULL,
             NM_PROGRAMA         VARCHAR(30) NOT NULL,
             DT_REFERENCIA       DATE NOT NULL,
             DH_INICIO           TIMESTAMP NOT NULL,
             DH_FIM              TIMESTAMP,
             ST_EXECUCAO         CHAR(2) NOT NULL,
             CD_RETORNO          INTEGER NOT NULL,
             QT_REG_LIDOS        INTEGER NOT NULL,
             QT_REG_GRAVADOS     INTEGER NOT NULL,
             QT_REG_REJEITADOS   INTEGER NOT NULL,
             QT_COMMITS          INTEGER NOT NULL,
             DS_MENSAGEM         VARCHAR(240),
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_HIST_PROCESSAMENTO         *
      ******************************************************************
       01  DCLSG-HIST-PROCESSAMENTO.
           10 SGHPR-ID-PROCESSAMENTO      PIC S9(18) COMP-3.
           10 SGHPR-NM-JOB.
              49 SGHPR-NM-JOB-LEN         PIC S9(4) USAGE COMP.
              49 SGHPR-NM-JOB-TXT         PIC X(30).
           10 SGHPR-NM-PROGRAMA.
              49 SGHPR-NM-PGM-LEN         PIC S9(4) USAGE COMP.
              49 SGHPR-NM-PGM-TXT         PIC X(30).
           10 SGHPR-DT-REFERENCIA         PIC X(10).
           10 SGHPR-DH-INICIO             PIC X(26).
           10 SGHPR-DH-FIM                PIC X(26).
           10 SGHPR-ST-EXECUCAO           PIC X(2).
           10 SGHPR-CD-RETORNO            PIC S9(9) USAGE COMP.
           10 SGHPR-QT-REG-LIDOS          PIC S9(9) USAGE COMP.
           10 SGHPR-QT-REG-GRAVADOS       PIC S9(9) USAGE COMP.
           10 SGHPR-QT-REG-REJEITADOS     PIC S9(9) USAGE COMP.
           10 SGHPR-QT-COMMITS            PIC S9(9) USAGE COMP.
           10 SGHPR-DS-MENSAGEM.
              49 SGHPR-DS-MSG-LEN         PIC S9(4) USAGE COMP.
              49 SGHPR-DS-MSG-TXT         PIC X(240).
           10 SGHPR-DH-INCLUSAO           PIC X(26).
           10 SGHPR-DH-ALTERACAO          PIC X(26).
           10 SGHPR-USUARIO-INCLUSAO.
              49 SGHPR-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGHPR-USR-INC-TXT        PIC X(30).
           10 SGHPR-USUARIO-ALTERACAO.
              49 SGHPR-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGHPR-USR-ALT-TXT        PIC X(30).
           10 SGHPR-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-HIST-PROCESSAMENTO-IND.
           10 SGHPR-IND-ID-PROC           PIC S9(4) USAGE COMP.
           10 SGHPR-IND-NM-JOB            PIC S9(4) USAGE COMP.
           10 SGHPR-IND-NM-PROGRAMA       PIC S9(4) USAGE COMP.
           10 SGHPR-IND-DT-REFERENCIA     PIC S9(4) USAGE COMP.
           10 SGHPR-IND-DH-INICIO         PIC S9(4) USAGE COMP.
           10 SGHPR-IND-DH-FIM            PIC S9(4) USAGE COMP.
           10 SGHPR-IND-ST-EXECUCAO       PIC S9(4) USAGE COMP.
           10 SGHPR-IND-CD-RETORNO        PIC S9(4) USAGE COMP.
           10 SGHPR-IND-QT-REG-LIDOS      PIC S9(4) USAGE COMP.
           10 SGHPR-IND-QT-REG-GRAVAD     PIC S9(4) USAGE COMP.
           10 SGHPR-IND-QT-REG-REJEIT     PIC S9(4) USAGE COMP.
           10 SGHPR-IND-QT-COMMITS        PIC S9(4) USAGE COMP.
           10 SGHPR-IND-DS-MENSAGEM       PIC S9(4) USAGE COMP.
           10 SGHPR-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGHPR-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGHPR-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGHPR-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGHPR-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 18       *
      ******************************************************************
