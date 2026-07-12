      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_HIST_CLIENTE)                             *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGHCL))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_HIST_CLIENTE TABLE
           ( ID_HIST             BIGINT NOT NULL,
             ID_CLIENTE          BIGINT NOT NULL,
             DT_EVENTO           TIMESTAMP NOT NULL,
             TP_EVENTO           CHAR(3) NOT NULL,
             TP_DOCUMENTO        CHAR(3),
             NR_DOCUMENTO        VARCHAR(14),
             NM_CLIENTE          VARCHAR(80),
             TP_CLIENTE          CHAR(2),
             ENDERECO            VARCHAR(120),
             CIDADE              VARCHAR(60),
             UF                  CHAR(2),
             CEP                 CHAR(8),
             IND_REINCIDENTE     CHAR(1),
             CLASSIFICACAO_RISCO CHAR(1),
             OBSERVACAO          VARCHAR(240),
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_HIST_CLIENTE               *
      ******************************************************************
       01  DCLSG-HIST-CLIENTE.
           10 SGHCL-ID-HIST               PIC S9(18) COMP-3.
           10 SGHCL-ID-CLIENTE            PIC S9(18) COMP-3.
           10 SGHCL-DT-EVENTO             PIC X(26).
           10 SGHCL-TP-EVENTO             PIC X(3).
           10 SGHCL-TP-DOCUMENTO          PIC X(3).
           10 SGHCL-NR-DOCUMENTO.
              49 SGHCL-NR-DOC-LEN         PIC S9(4) USAGE COMP.
              49 SGHCL-NR-DOC-TXT         PIC X(14).
           10 SGHCL-NM-CLIENTE.
              49 SGHCL-NM-CLI-LEN         PIC S9(4) USAGE COMP.
              49 SGHCL-NM-CLI-TXT         PIC X(80).
           10 SGHCL-TP-CLIENTE            PIC X(2).
           10 SGHCL-ENDERECO.
              49 SGHCL-END-LEN            PIC S9(4) USAGE COMP.
              49 SGHCL-END-TXT            PIC X(120).
           10 SGHCL-CIDADE.
              49 SGHCL-CID-LEN            PIC S9(4) USAGE COMP.
              49 SGHCL-CID-TXT            PIC X(60).
           10 SGHCL-UF                    PIC X(2).
           10 SGHCL-CEP                   PIC X(8).
           10 SGHCL-IND-REINCIDENTE       PIC X(1).
           10 SGHCL-CLASSIFICACAO-RISCO   PIC X(1).
           10 SGHCL-OBSERVACAO.
              49 SGHCL-OBS-LEN            PIC S9(4) USAGE COMP.
              49 SGHCL-OBS-TXT            PIC X(240).
           10 SGHCL-DH-INCLUSAO           PIC X(26).
           10 SGHCL-DH-ALTERACAO          PIC X(26).
           10 SGHCL-USUARIO-INCLUSAO.
              49 SGHCL-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGHCL-USR-INC-TXT        PIC X(30).
           10 SGHCL-USUARIO-ALTERACAO.
              49 SGHCL-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGHCL-USR-ALT-TXT        PIC X(30).
           10 SGHCL-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-HIST-CLIENTE-IND.
           10 SGHCL-IND-ID-HIST           PIC S9(4) USAGE COMP.
           10 SGHCL-IND-ID-CLIENTE        PIC S9(4) USAGE COMP.
           10 SGHCL-IND-DT-EVENTO         PIC S9(4) USAGE COMP.
           10 SGHCL-IND-TP-EVENTO         PIC S9(4) USAGE COMP.
           10 SGHCL-IND-TP-DOCUMENTO      PIC S9(4) USAGE COMP.
           10 SGHCL-IND-NR-DOCUMENTO      PIC S9(4) USAGE COMP.
           10 SGHCL-IND-NM-CLIENTE        PIC S9(4) USAGE COMP.
           10 SGHCL-IND-TP-CLIENTE        PIC S9(4) USAGE COMP.
           10 SGHCL-IND-ENDERECO          PIC S9(4) USAGE COMP.
           10 SGHCL-IND-CIDADE            PIC S9(4) USAGE COMP.
           10 SGHCL-IND-UF                PIC S9(4) USAGE COMP.
           10 SGHCL-IND-CEP               PIC S9(4) USAGE COMP.
           10 SGHCL-IND-REINCIDENTE       PIC S9(4) USAGE COMP.
           10 SGHCL-IND-CLASSIF-RISCO     PIC S9(4) USAGE COMP.
           10 SGHCL-IND-OBSERVACAO        PIC S9(4) USAGE COMP.
           10 SGHCL-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGHCL-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGHCL-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGHCL-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGHCL-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 20       *
      ******************************************************************
