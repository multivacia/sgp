      *****************************************************************
      * COPYBOOK.: SGLPAGPD                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLPAGPD - PAGAMENTOS PENDENTES DE CONCILIACAO      *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 180     BLKSIZE: 27000                *
      * PROG ....: SGCB0050 (SAIDA), SGCB0060 (LEITURA RECONCILIACAO)  *
      *----------------------------------------------------------------*
      * PAGAMENTOS ACEITOS EM SGCB0040 MAS QUE NAO PUDERAM SER         *
      * APLICADOS EM DB2 POR DEPENDENCIA (EX.: LIQUIDACAO ADQUIRENTE   *
      * AINDA NAO CONFIRMADA). REPROCESSADOS EM SGCB0060.              *
      *****************************************************************
       01  REG-SGLPAGPD.
           05  PAGPD-TIPO-REG            PIC X(01).
               88  PAGPD-E-HEADER                 VALUE 'H'.
               88  PAGPD-E-DETAIL                 VALUE 'D'.
               88  PAGPD-E-TRAILER                VALUE 'T'.
           05  PAGPD-CORPO               PIC X(179).
      *
       01  REG-SGLPAGPD-HDR.
           05  PAGPD-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  PAGPD-HDR-DT-PROC         PIC 9(08).
           05  PAGPD-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0050'.
           05  PAGPD-HDR-QTD-PENDENTES   PIC 9(09).
           05  PAGPD-HDR-FILLER          PIC X(154).
      *
       01  REG-SGLPAGPD-DET.
           05  PAGPD-DET-TIPO            PIC X(01) VALUE 'D'.
           05  PAGPD-DET-ID-CONTRATO     PIC 9(12).
           05  PAGPD-DET-NR-PARCELA      PIC 9(03).
           05  PAGPD-DET-VALOR           PIC 9(13)V99.
           05  PAGPD-DET-DATA-PAGTO      PIC 9(08).
           05  PAGPD-DET-CANAL           PIC X(03).
           05  PAGPD-DET-NR-DOC-PAGTO    PIC X(20).
           05  PAGPD-DET-CD-MOTIVO       PIC X(20).
           05  PAGPD-DET-MOTIVO          PIC X(40).
           05  PAGPD-DET-DT-INCLUSAO     PIC 9(08).
           05  PAGPD-DET-QTD-TENTATIVAS  PIC 9(03).
           05  PAGPD-DET-DT-ULT-TENT     PIC 9(08).
           05  PAGPD-DET-STATUS          PIC X(10).
               88  PAGPD-ST-PENDENTE              VALUE 'PENDENTE  '.
               88  PAGPD-ST-EM-RETRY              VALUE 'EM RETRY  '.
               88  PAGPD-ST-DESCARTADO            VALUE 'DESCARTADO'.
           05  PAGPD-DET-FILLER          PIC X(15).
      *
       01  REG-SGLPAGPD-TRL.
           05  PAGPD-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  PAGPD-TRL-QTD-REGS        PIC 9(09).
           05  PAGPD-TRL-SOMA-VALORES    PIC 9(15)V99.
           05  PAGPD-TRL-DT-PROC         PIC 9(08).
           05  PAGPD-TRL-FILLER          PIC X(145).
