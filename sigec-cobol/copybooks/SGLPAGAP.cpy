      *****************************************************************
      * COPYBOOK.: SGLPAGAP                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLPAGAP - PAGAMENTOS APLICADOS COM SUCESSO EM DB2  *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 200     BLKSIZE: 27800                *
      * PROG ....: SGCB0050 (SAIDA)                                    *
      *****************************************************************
       01  REG-SGLPAGAP.
           05  PAGAP-TIPO-REG            PIC X(01).
               88  PAGAP-E-HEADER                 VALUE 'H'.
               88  PAGAP-E-DETAIL                 VALUE 'D'.
               88  PAGAP-E-TRAILER                VALUE 'T'.
           05  PAGAP-CORPO               PIC X(199).
      *
       01  REG-SGLPAGAP-HDR.
           05  PAGAP-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  PAGAP-HDR-DT-PROC         PIC 9(08).
           05  PAGAP-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0050'.
           05  PAGAP-HDR-QTD-APLICADOS   PIC 9(09).
           05  PAGAP-HDR-SOMA-APLICADOS  PIC 9(15)V99.
           05  PAGAP-HDR-FILLER          PIC X(159).
      *
       01  REG-SGLPAGAP-DET.
           05  PAGAP-DET-TIPO            PIC X(01) VALUE 'D'.
           05  PAGAP-DET-ID-CONTRATO     PIC 9(12).
           05  PAGAP-DET-ID-PARCELA      PIC 9(14).
           05  PAGAP-DET-NR-PARCELA      PIC 9(03).
           05  PAGAP-DET-VALOR-PAGO      PIC 9(13)V99.
           05  PAGAP-DET-VLR-JUROS-BX    PIC 9(13)V99.
           05  PAGAP-DET-VLR-MULTA-BX    PIC 9(13)V99.
           05  PAGAP-DET-VLR-PRINC-BX    PIC 9(13)V99.
           05  PAGAP-DET-SALDO-REMANESC  PIC 9(13)V99.
           05  PAGAP-DET-DATA-PAGTO      PIC 9(08).
           05  PAGAP-DET-DT-APLICACAO    PIC 9(08).
           05  PAGAP-DET-HR-APLICACAO    PIC 9(06).
           05  PAGAP-DET-CANAL           PIC X(03).
           05  PAGAP-DET-NR-DOC-PAGTO    PIC X(20).
           05  PAGAP-DET-SIT-PAR-NOVA    PIC X(10).
               88  PAGAP-PAR-LIQUIDADA            VALUE 'LIQUIDADA '.
               88  PAGAP-PAR-PARCIAL              VALUE 'PARCIAL   '.
           05  PAGAP-DET-FL-EXCESSO      PIC X(01).
           05  PAGAP-DET-VLR-EXCESSO     PIC 9(13)V99.
           05  PAGAP-DET-FILLER          PIC X(29).
      *
       01  REG-SGLPAGAP-TRL.
           05  PAGAP-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  PAGAP-TRL-QTD-REGS        PIC 9(09).
           05  PAGAP-TRL-SOMA-VALORES    PIC 9(15)V99.
           05  PAGAP-TRL-SOMA-JUROS      PIC 9(15)V99.
           05  PAGAP-TRL-SOMA-MULTA      PIC 9(15)V99.
           05  PAGAP-TRL-DT-PROC         PIC 9(08).
           05  PAGAP-TRL-FILLER          PIC X(133).
