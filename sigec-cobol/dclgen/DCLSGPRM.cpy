      ******************************************************************
      * DCLGEN TABLE(SIGEC.SG_PARAMETRO)                                *
      *        LIBRARY(SIGEC.DCLGEN(DCLSGPRM))                          *
      *        ACTION(REPLACE)                                          *
      *        LANGUAGE(COBOL)                                          *
      *        QUOTE                                                    *
      *        INDVAR(YES)                                              *
      ******************************************************************
           EXEC SQL DECLARE SIGEC.SG_PARAMETRO TABLE
           ( CD_PARAMETRO        VARCHAR(30) NOT NULL,
             VR_PARAMETRO        VARCHAR(100) NOT NULL,
             DS_PARAMETRO        VARCHAR(240) NOT NULL,
             TP_PARAMETRO        CHAR(1) NOT NULL,
             DH_INCLUSAO         TIMESTAMP NOT NULL,
             DH_ALTERACAO        TIMESTAMP,
             USUARIO_INCLUSAO    VARCHAR(30) NOT NULL,
             USUARIO_ALTERACAO   VARCHAR(30),
             SITUACAO_REG        CHAR(1) NOT NULL
           ) END-EXEC.
      ******************************************************************
      * COBOL DECLARATION FOR TABLE SIGEC.SG_PARAMETRO                  *
      ******************************************************************
       01  DCLSG-PARAMETRO.
           10 SGPRM-CD-PARAMETRO.
              49 SGPRM-CD-PRM-LEN         PIC S9(4) USAGE COMP.
              49 SGPRM-CD-PRM-TXT         PIC X(30).
           10 SGPRM-VR-PARAMETRO.
              49 SGPRM-VR-PRM-LEN         PIC S9(4) USAGE COMP.
              49 SGPRM-VR-PRM-TXT         PIC X(100).
           10 SGPRM-DS-PARAMETRO.
              49 SGPRM-DS-PRM-LEN         PIC S9(4) USAGE COMP.
              49 SGPRM-DS-PRM-TXT         PIC X(240).
           10 SGPRM-TP-PARAMETRO          PIC X(1).
           10 SGPRM-DH-INCLUSAO           PIC X(26).
           10 SGPRM-DH-ALTERACAO          PIC X(26).
           10 SGPRM-USUARIO-INCLUSAO.
              49 SGPRM-USR-INC-LEN        PIC S9(4) USAGE COMP.
              49 SGPRM-USR-INC-TXT        PIC X(30).
           10 SGPRM-USUARIO-ALTERACAO.
              49 SGPRM-USR-ALT-LEN        PIC S9(4) USAGE COMP.
              49 SGPRM-USR-ALT-TXT        PIC X(30).
           10 SGPRM-SITUACAO-REG          PIC X(1).
      ******************************************************************
      * INDICATOR VARIABLES                                             *
      ******************************************************************
       01  DCLSG-PARAMETRO-IND.
           10 SGPRM-IND-CD-PARAMETRO      PIC S9(4) USAGE COMP.
           10 SGPRM-IND-VR-PARAMETRO      PIC S9(4) USAGE COMP.
           10 SGPRM-IND-DS-PARAMETRO      PIC S9(4) USAGE COMP.
           10 SGPRM-IND-TP-PARAMETRO      PIC S9(4) USAGE COMP.
           10 SGPRM-IND-DH-INCLUSAO       PIC S9(4) USAGE COMP.
           10 SGPRM-IND-DH-ALTERACAO      PIC S9(4) USAGE COMP.
           10 SGPRM-IND-USR-INCLUSAO      PIC S9(4) USAGE COMP.
           10 SGPRM-IND-USR-ALTERACAO     PIC S9(4) USAGE COMP.
           10 SGPRM-IND-SITUACAO-REG      PIC S9(4) USAGE COMP.
      ******************************************************************
      * THE NUMBER OF COLUMNS DESCRIBED BY THIS DECLARATION IS 9        *
      ******************************************************************
