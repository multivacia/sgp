      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_CLIENTE)                                  *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGCLI))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      * ... IS THE DCLGEN COMMAND THAT MADE THE FOLLOWING STATEMENTS    *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_CLIENTE TABLE
           ( ID_CLIENTE          BIGINT NOT NULL,
             TP_DOCUMENTO        CHAR(3) NOT NULL,
             NR_DOCUMENTO        VARCHAR(14) NOT NULL,
             NM_CLIENTE          VARCHAR(80) NOT NULL,
             TP_CLIENTE          CHAR(2) NOT NULL,
             ENDERECO            VARCHAR(120),
             CIDADE              VARCHAR(60),
             UF                  CHAR(2),
             CEP                 CHAR(8),
             IND_REINCIDENTE     CHAR(1) NOT NULL,
             CLASSIFICACAO_RISCO CHAR(1),
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_CLIENTE                    *
      ******************************************************************
       01  DCLSG-CLIENTE.
           10 SGCLI-ID-CLIENTE            PIC S9(18) COMP-3.
           10 SGCLI-TP-DOCUMENTO          PIC X(3).
           10 SGCLI-NR-DOCUMENTO.
              49 SGCLI-NR-DOCUMENTO-LEN   PIC S9(4) USAGE COMP.
              49 SGCLI-NR-DOCUMENTO-TXT   PIC X(14).
           10 SGCLI-NM-CLIENTE.
              49 SGCLI-NM-CLIENTE-LEN     PIC S9(4) USAGE COMP.
              49 SGCLI-NM-CLIENTE-TXT     PIC X(80).
           10 SGCLI-TP-CLIENTE            PIC X(2).
           10 SGCLI-ENDERECO.
              49 SGCLI-ENDERECO-LEN       PIC S9(4) USAGE COMP.
              49 SGCLI-ENDERECO-TXT       PIC X(120).
           10 SGCLI-CIDADE.
              49 SGCLI-CIDADE-LEN         PIC S9(4) USAGE COMP.
              49 SGCLI-CIDADE-TXT         PIC X(60).
           10 SGCLI-UF                    PIC X(2).
           10 SGCLI-CEP                   PIC X(8).
           10 SGCLI-IND-REINCIDENTE       PIC X(1).
           10 SGCLI-CLASSIFICACAO-RISCO   PIC X(1).
           10 SGCLI-DH-INCLUSAO           PIC X(26).
           10 SGCLI-DH-ALTERACAO          PIC X(26).
           10 SGCLI-USUARIO-INCLUSAO.
              49 SGCLI-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGCLI-USR-INC-TXT        PIC X(30).
           10 SGCLI-USUARIO-ALTERACAO.
              49 SGCLI-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGCLI-USR-ALT-TXT        PIC X(30).
           10 SGCLI-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-CLIENTE-IND.
           10 SGCLI-IND-ID-CLIENTE        PIC S9(4) USAGE COMP.
           10 SGCLI-IND-TP-DOCUMENTO      PIC S9(4) USAGE COMP.
           10 SGCLI-IND-NR-DOCUMENTO      PIC S9(4) USAGE COMP.
           10 SGCLI-IND-NM-CLIENTE        PIC S9(4) USAGE COMP.
           10 SGCLI-IND-TP-CLIENTE        PIC S9(4) USAGE COMP.
           10 SGCLI-IND-ENDERECO          PIC S9(4) USAGE COMP.
           10 SGCLI-IND-CIDADE            PIC S9(4) USAGE COMP.
           10 SGCLI-IND-UF                PIC S9(4) USAGE COMP.
           10 SGCLI-IND-CEP               PIC S9(4) USAGE COMP.
           10 SGCLI-IND-REINCIDENTE       PIC S9(4) USAGE COMP.
           10 SGCLI-IND-CLASSIF-RISCO     PIC S9(4) USAGE COMP.
           10 SGCLI-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGCLI-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGCLI-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGCLI-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGCLI-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 16       *
      ******************************************************************
