      *****************************************************************
      * COPYBOOK.: SGLINTCB                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLINTCB - INTERFACE PARA SISTEMA DE COBRANCA SGXCOB*
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 250     BLKSIZE: 27000                *
      * PROG ....: SGCB0160 (SAIDA)                                    *
      *----------------------------------------------------------------*
      * ESTRUTURA: HEADER + N DETAIL + TRAILER                         *
      *****************************************************************
       01  REG-SGLINTCB.
           05  INTCB-TIPO-REG            PIC X(01).
               88  INTCB-E-HEADER                 VALUE 'H'.
               88  INTCB-E-DETAIL                 VALUE 'D'.
               88  INTCB-E-TRAILER                VALUE 'T'.
           05  INTCB-CORPO               PIC X(249).
      *
      *---------------------------------------------------------------*
      *  HEADER                                                       *
      *---------------------------------------------------------------*
       01  REG-SGLINTCB-HDR.
           05  INTCB-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  INTCB-HDR-COD-INTERFACE   PIC X(06) VALUE 'INTCB '.
           05  INTCB-HDR-DT-REF          PIC 9(08).
           05  INTCB-HDR-HR-GERACAO      PIC 9(06).
           05  INTCB-HDR-ORIGEM          PIC X(08) VALUE 'SGCB0160'.
           05  INTCB-HDR-DESTINO         PIC X(08) VALUE 'SGXCOB  '.
           05  INTCB-HDR-VERSAO          PIC X(04) VALUE 'V001'.
           05  INTCB-HDR-QTD-DECLARADA   PIC 9(09).
           05  INTCB-HDR-ID-EXECUCAO     PIC X(12).
           05  INTCB-HDR-FILLER          PIC X(188).
      *
      *---------------------------------------------------------------*
      *  DETAIL - FILA DE COBRANCA                                    *
      *---------------------------------------------------------------*
       01  REG-SGLINTCB-DET.
           05  INTCB-DET-TIPO            PIC X(01) VALUE 'D'.
           05  INTCB-DET-SEQ             PIC 9(09).
           05  INTCB-DET-DT-REF          PIC 9(08).
           05  INTCB-DET-ID-CLIENTE      PIC 9(10).
           05  INTCB-DET-DOCUMENTO       PIC X(14).
           05  INTCB-DET-NOME            PIC X(60).
           05  INTCB-DET-NR-CONTRATO     PIC X(15).
           05  INTCB-DET-VLR-DIVIDA-TOT  PIC S9(13)V99 COMP-3.
           05  INTCB-DET-DIAS-ATRASO     PIC 9(05).
           05  INTCB-DET-FAIXA           PIC X(08).
           05  INTCB-DET-CLASSE-RISCO    PIC X(01).
           05  INTCB-DET-PRIORIDADE      PIC 9(02).
               88  INTCB-PRI-BAIXA                VALUE 10.
               88  INTCB-PRI-MEDIA                VALUE 20.
               88  INTCB-PRI-ALTA                 VALUE 30.
               88  INTCB-PRI-CRITICA              VALUE 40.
           05  INTCB-DET-CANAL-PREF      PIC X(03).
           05  INTCB-DET-DDD             PIC 9(02).
           05  INTCB-DET-TELEFONE        PIC 9(09).
           05  INTCB-DET-CELULAR         PIC 9(11).
           05  INTCB-DET-EMAIL           PIC X(60).
           05  INTCB-DET-CD-ACAO         PIC X(10).
           05  INTCB-DET-OBS             PIC X(15).
           05  INTCB-DET-FILLER          PIC X(15).
      *
      *---------------------------------------------------------------*
      *  TRAILER                                                      *
      *---------------------------------------------------------------*
       01  REG-SGLINTCB-TRL.
           05  INTCB-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  INTCB-TRL-QTD-REGS        PIC 9(09).
           05  INTCB-TRL-QTD-CLIENTES    PIC 9(09).
           05  INTCB-TRL-SOMA-DIVIDA     PIC 9(17)V99.
           05  INTCB-TRL-QT-CRITICA      PIC 9(09).
           05  INTCB-TRL-DT-REF          PIC 9(08).
           05  INTCB-TRL-FILLER          PIC X(191).
