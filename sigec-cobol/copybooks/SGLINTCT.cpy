      *****************************************************************
      * COPYBOOK.: SGLINTCT                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLINTCT - INTERFACE PARA CONTABILIDADE (CONTAB)    *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 240     BLKSIZE: 26400                *
      * PROG ....: SGCB0160 (SAIDA)                                    *
      *----------------------------------------------------------------*
      * LANCAMENTOS CONTABEIS DO DIA: ENCARGOS, PAGAMENTOS APLICADOS   *
      * E PROVISOES DE RISCO (VARIACAO A->B, B->C, ETC.).              *
      *****************************************************************
       01  REG-SGLINTCT.
           05  INTCT-TIPO-REG            PIC X(01).
               88  INTCT-E-HEADER                 VALUE 'H'.
               88  INTCT-E-DETAIL                 VALUE 'D'.
               88  INTCT-E-TRAILER                VALUE 'T'.
           05  INTCT-CORPO               PIC X(239).
      *
       01  REG-SGLINTCT-HDR.
           05  INTCT-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  INTCT-HDR-COD-INTERFACE   PIC X(06) VALUE 'INTCT '.
           05  INTCT-HDR-DT-REF          PIC 9(08).
           05  INTCT-HDR-HR-GERACAO      PIC 9(06).
           05  INTCT-HDR-ORIGEM          PIC X(08) VALUE 'SGCB0160'.
           05  INTCT-HDR-DESTINO         PIC X(08) VALUE 'CONTAB  '.
           05  INTCT-HDR-EMPRESA         PIC 9(04).
           05  INTCT-HDR-QTD-LANC        PIC 9(09).
           05  INTCT-HDR-FILLER          PIC X(190).
      *
       01  REG-SGLINTCT-DET.
           05  INTCT-DET-TIPO            PIC X(01) VALUE 'D'.
           05  INTCT-DET-SEQ             PIC 9(09).
           05  INTCT-DET-DT-LANC         PIC 9(08).
           05  INTCT-DET-DT-COMPETENCIA  PIC 9(08).
           05  INTCT-DET-CD-EVENTO       PIC X(10).
               88  INTCT-EV-ENCARGO               VALUE 'ENCARGO   '.
               88  INTCT-EV-PAG-BAIXA             VALUE 'PAG-BAIXA '.
               88  INTCT-EV-PROV-RISCO            VALUE 'PROV-RISCO'.
               88  INTCT-EV-DESC-RENEG            VALUE 'DESC-RENEG'.
               88  INTCT-EV-PROTESTO              VALUE 'PROTESTO  '.
           05  INTCT-DET-CD-CONTA-DEB    PIC X(15).
           05  INTCT-DET-CD-CONTA-CRE    PIC X(15).
           05  INTCT-DET-CD-CENTRO-CUS   PIC X(10).
           05  INTCT-DET-ID-CONTRATO     PIC 9(12).
           05  INTCT-DET-NR-CONTRATO     PIC X(15).
           05  INTCT-DET-DOCUMENTO       PIC X(14).
           05  INTCT-DET-VLR-DEBITO      PIC S9(15)V99 COMP-3.
           05  INTCT-DET-VLR-CREDITO     PIC S9(15)V99 COMP-3.
           05  INTCT-DET-MOEDA           PIC X(03) VALUE 'BRL'.
           05  INTCT-DET-HISTORICO       PIC X(80).
           05  INTCT-DET-CD-LOTE         PIC X(10).
           05  INTCT-DET-FILLER          PIC X(15).
      *
       01  REG-SGLINTCT-TRL.
           05  INTCT-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  INTCT-TRL-QTD-REGS        PIC 9(09).
           05  INTCT-TRL-SOMA-DEBITO     PIC 9(17)V99.
           05  INTCT-TRL-SOMA-CREDITO    PIC 9(17)V99.
           05  INTCT-TRL-DT-REF          PIC 9(08).
           05  INTCT-TRL-FILLER          PIC X(173).
