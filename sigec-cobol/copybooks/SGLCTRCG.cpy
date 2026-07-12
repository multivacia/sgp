      *****************************************************************
      * COPYBOOK.: SGLCTRCG                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLCTRCG - CONTRATOS CARREGADOS EFETIVAMENTE EM DB2 *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 180     BLKSIZE: 27000                *
      * PROG ....: SGCB0030 (SAIDA)                                    *
      *----------------------------------------------------------------*
      * REGISTRO POR CONTRATO EFETIVAMENTE INSERIDO EM SGT_CTR_CONTRATO*
      * COM ID GERADO PELA IDENTITY DA TABELA E QTD PARCELAS GERADAS.  *
      *****************************************************************
       01  REG-SGLCTRCG.
           05  CTRCG-TIPO-REG            PIC X(01).
               88  CTRCG-E-HEADER                 VALUE 'H'.
               88  CTRCG-E-DETAIL                 VALUE 'D'.
               88  CTRCG-E-TRAILER                VALUE 'T'.
           05  CTRCG-CORPO               PIC X(179).
      *
       01  REG-SGLCTRCG-HDR.
           05  CTRCG-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  CTRCG-HDR-DT-PROC         PIC 9(08).
           05  CTRCG-HDR-HR-PROC         PIC 9(06).
           05  CTRCG-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0030'.
           05  CTRCG-HDR-QTD-CARREGADOS  PIC 9(09).
           05  CTRCG-HDR-QTD-DUPL-IGN    PIC 9(09).
           05  CTRCG-HDR-FILLER          PIC X(138).
      *
       01  REG-SGLCTRCG-DET.
           05  CTRCG-DET-TIPO            PIC X(01) VALUE 'D'.
           05  CTRCG-DET-ID-CONTRATO     PIC 9(12).
           05  CTRCG-DET-NR-CONTRATO     PIC X(15).
           05  CTRCG-DET-ID-CLIENTE      PIC 9(10).
           05  CTRCG-DET-TIPO-DOC        PIC X(03).
           05  CTRCG-DET-DOCUMENTO       PIC X(14).
           05  CTRCG-DET-TIPO-CLIENTE    PIC X(02).
           05  CTRCG-DET-TIPO-CONTRATO   PIC X(02).
           05  CTRCG-DET-VALOR-TOTAL     PIC 9(13)V99.
           05  CTRCG-DET-QTD-PARCELAS    PIC 9(03).
           05  CTRCG-DET-PARCELAS-GER    PIC 9(03).
           05  CTRCG-DET-DATA-INICIO     PIC 9(08).
           05  CTRCG-DET-DATA-FIM        PIC 9(08).
           05  CTRCG-DET-DT-CARGA        PIC 9(08).
           05  CTRCG-DET-HR-CARGA        PIC 9(06).
           05  CTRCG-DET-FL-CLI-CRIADO   PIC X(01).
               88  CTRCG-CLI-CRIADO               VALUE 'S'.
               88  CTRCG-CLI-JA-EXIST             VALUE 'N'.
           05  CTRCG-DET-USUARIO         PIC X(08) VALUE 'SGCB0030'.
           05  CTRCG-DET-FILLER          PIC X(50).
      *
       01  REG-SGLCTRCG-TRL.
           05  CTRCG-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  CTRCG-TRL-QTD-REGS        PIC 9(09).
           05  CTRCG-TRL-SOMA-VALORES    PIC 9(15)V99.
           05  CTRCG-TRL-QTD-PAR-GER     PIC 9(11).
           05  CTRCG-TRL-DT-PROC         PIC 9(08).
           05  CTRCG-TRL-FILLER          PIC X(134).
