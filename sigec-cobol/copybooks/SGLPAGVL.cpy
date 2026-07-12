      *****************************************************************
      * COPYBOOK.: SGLPAGVL                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLPAGVL - PAGAMENTOS APROVADOS EM SGCB0040         *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 150     BLKSIZE: 27000                *
      * PROG ....: SGCB0040 (SAIDA) - SGCB0050 (ENTRADA)               *
      *****************************************************************
       01  REG-SGLPAGVL.
           05  PAGVL-TIPO-REG            PIC X(01).
               88  PAGVL-E-HEADER                 VALUE 'H'.
               88  PAGVL-E-DETAIL                 VALUE 'D'.
               88  PAGVL-E-TRAILER                VALUE 'T'.
           05  PAGVL-CORPO               PIC X(149).
      *
       01  REG-SGLPAGVL-HDR.
           05  PAGVL-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  PAGVL-HDR-DT-PROC         PIC 9(08).
           05  PAGVL-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0040'.
           05  PAGVL-HDR-QTD-VALIDOS     PIC 9(09).
           05  PAGVL-HDR-SOMA-VALIDOS    PIC 9(15)V99.
           05  PAGVL-HDR-FILLER          PIC X(107).
      *
       01  REG-SGLPAGVL-DET.
           05  PAGVL-DET-TIPO            PIC X(01) VALUE 'D'.
           05  PAGVL-DET-ID-CONTRATO     PIC 9(12).
           05  PAGVL-DET-NR-PARCELA      PIC 9(03).
           05  PAGVL-DET-VALOR           PIC 9(13)V99.
           05  PAGVL-DET-DATA-PAGTO      PIC 9(08).
           05  PAGVL-DET-CANAL           PIC X(03).
           05  PAGVL-DET-NR-DOC-PAGTO    PIC X(20).
           05  PAGVL-DET-SALDO-ANT       PIC 9(13)V99.
           05  PAGVL-DET-SALDO-NOVO      PIC 9(13)V99.
           05  PAGVL-DET-FL-PARCIAL      PIC X(01).
               88  PAGVL-E-PARCIAL                VALUE 'S'.
               88  PAGVL-NAO-PARCIAL              VALUE 'N'.
           05  PAGVL-DET-FL-EXCESSO      PIC X(01).
               88  PAGVL-COM-EXCESSO              VALUE 'S'.
               88  PAGVL-SEM-EXCESSO              VALUE 'N'.
           05  PAGVL-DET-VLR-EXCESSO     PIC 9(13)V99.
           05  PAGVL-DET-DT-APROVACAO    PIC 9(08).
           05  PAGVL-DET-CD-VALIDADOR    PIC X(08) VALUE 'SGCB0040'.
           05  PAGVL-DET-FILLER          PIC X(15).
      *
       01  REG-SGLPAGVL-TRL.
           05  PAGVL-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  PAGVL-TRL-QTD-REGS        PIC 9(09).
           05  PAGVL-TRL-SOMA-VALORES    PIC 9(15)V99.
           05  PAGVL-TRL-DT-PROC         PIC 9(08).
           05  PAGVL-TRL-FILLER          PIC X(115).
