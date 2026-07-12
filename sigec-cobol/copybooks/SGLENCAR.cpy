      *****************************************************************
      * COPYBOOK.: SGLENCAR                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLENCAR - ENCARGOS CALCULADOS PELO MOTOR SGCB0110  *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 200     BLKSIZE: 27800                *
      * PROG ....: SGCB0070 (SAIDA)                                    *
      *----------------------------------------------------------------*
      * UMA LINHA POR PARCELA VENCIDA CALCULADA NO DIA.                *
      *****************************************************************
       01  REG-SGLENCAR.
           05  ENCAR-TIPO-REG            PIC X(01).
               88  ENCAR-E-HEADER                 VALUE 'H'.
               88  ENCAR-E-DETAIL                 VALUE 'D'.
               88  ENCAR-E-TRAILER                VALUE 'T'.
           05  ENCAR-CORPO               PIC X(199).
      *
       01  REG-SGLENCAR-HDR.
           05  ENCAR-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  ENCAR-HDR-DT-REF          PIC 9(08).
           05  ENCAR-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0070'.
           05  ENCAR-HDR-QTD-CALC        PIC 9(09).
           05  ENCAR-HDR-FILLER          PIC X(174).
      *
       01  REG-SGLENCAR-DET.
           05  ENCAR-DET-TIPO            PIC X(01) VALUE 'D'.
           05  ENCAR-DET-DT-REF          PIC 9(08).
           05  ENCAR-DET-ID-CONTRATO     PIC 9(12).
           05  ENCAR-DET-NR-CONTRATO     PIC X(15).
           05  ENCAR-DET-ID-PARCELA      PIC 9(14).
           05  ENCAR-DET-NR-PARCELA      PIC 9(03).
           05  ENCAR-DET-TIPO-CONTRATO   PIC X(02).
           05  ENCAR-DET-TIPO-CLIENTE    PIC X(02).
           05  ENCAR-DET-DT-VCTO         PIC 9(08).
           05  ENCAR-DET-DIAS-ATRASO     PIC S9(05) COMP-3.
           05  ENCAR-DET-VLR-PRINCIPAL   PIC S9(13)V99 COMP-3.
           05  ENCAR-DET-TAXA-JUROS      PIC S9(03)V99 COMP-3.
           05  ENCAR-DET-PCT-MULTA       PIC S9(03)V99 COMP-3.
           05  ENCAR-DET-VLR-JUROS       PIC S9(13)V99 COMP-3.
           05  ENCAR-DET-VLR-MULTA       PIC S9(13)V99 COMP-3.
           05  ENCAR-DET-VLR-ATUALIZADO  PIC S9(13)V99 COMP-3.
           05  ENCAR-DET-VLR-BASE-CALC   PIC S9(13)V99 COMP-3.
           05  ENCAR-DET-FL-PARCIAL      PIC X(01).
           05  ENCAR-DET-FL-LIMITE       PIC X(01).
           05  ENCAR-DET-RC-MOTOR        PIC 9(02).
           05  ENCAR-DET-DT-CALC         PIC 9(08).
           05  ENCAR-DET-HR-CALC         PIC 9(06).
           05  ENCAR-DET-FILLER          PIC X(60).
      *
       01  REG-SGLENCAR-TRL.
           05  ENCAR-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  ENCAR-TRL-QTD-REGS        PIC 9(09).
           05  ENCAR-TRL-SOMA-JUROS      PIC 9(15)V99.
           05  ENCAR-TRL-SOMA-MULTA      PIC 9(15)V99.
           05  ENCAR-TRL-SOMA-ATUAL      PIC 9(15)V99.
           05  ENCAR-TRL-DT-REF          PIC 9(08).
           05  ENCAR-TRL-FILLER          PIC X(115).
