      *****************************************************************
      * COPYBOOK.: SGLINADI                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLINADI - CONTRATOS INADIMPLENTES DETECTADOS       *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 240     BLKSIZE: 26400                *
      * PROG ....: SGCB0100 (SAIDA), SGCB0130 (LEITURA)                *
      *----------------------------------------------------------------*
      * UM REGISTRO POR CONTRATO INADIMPLENTE COM FAIXA E RISCO.       *
      *****************************************************************
       01  REG-SGLINADI.
           05  INADI-TIPO-REG            PIC X(01).
               88  INADI-E-HEADER                 VALUE 'H'.
               88  INADI-E-DETAIL                 VALUE 'D'.
               88  INADI-E-TRAILER                VALUE 'T'.
           05  INADI-CORPO               PIC X(239).
      *
       01  REG-SGLINADI-HDR.
           05  INADI-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  INADI-HDR-DT-REF          PIC 9(08).
           05  INADI-HDR-PROG-ORIGEM     PIC X(08) VALUE 'SGCB0100'.
           05  INADI-HDR-QTD-CTR         PIC 9(09).
           05  INADI-HDR-FILLER          PIC X(214).
      *
       01  REG-SGLINADI-DET.
           05  INADI-DET-TIPO            PIC X(01) VALUE 'D'.
           05  INADI-DET-DT-REF          PIC 9(08).
           05  INADI-DET-ID-CONTRATO     PIC 9(12).
           05  INADI-DET-NR-CONTRATO     PIC X(15).
           05  INADI-DET-ID-CLIENTE      PIC 9(10).
           05  INADI-DET-DOCUMENTO       PIC X(14).
           05  INADI-DET-NOME            PIC X(60).
           05  INADI-DET-TIPO-CLIENTE    PIC X(02).
           05  INADI-DET-TIPO-CONTRATO   PIC X(02).
           05  INADI-DET-FAIXA           PIC X(08).
               88  INADI-FX-LEVE                  VALUE 'LEVE    '.
               88  INADI-FX-MOD                   VALUE 'MODERADA'.
               88  INADI-FX-GRAVE                 VALUE 'GRAVE   '.
               88  INADI-FX-CRIT                  VALUE 'CRITICA '.
           05  INADI-DET-DIAS-ATRASO     PIC 9(05).
           05  INADI-DET-QT-PAR-VENC     PIC 9(03).
           05  INADI-DET-VLR-SALDO       PIC S9(13)V99 COMP-3.
           05  INADI-DET-VLR-ENC-ACUM    PIC S9(13)V99 COMP-3.
           05  INADI-DET-VLR-ATUALIZADO  PIC S9(13)V99 COMP-3.
           05  INADI-DET-RISCO-ATUAL     PIC X(01).
           05  INADI-DET-RISCO-ANTERIOR  PIC X(01).
           05  INADI-DET-VARIACAO-RISCO  PIC S9(02).
           05  INADI-DET-IND-ELEG-REN    PIC X(01).
               88  INADI-ELEG-REN                 VALUE 'S'.
               88  INADI-NAO-ELEG-REN             VALUE 'N'.
           05  INADI-DET-IND-PROTESTO    PIC X(01).
           05  INADI-DET-DT-ULT-PAG      PIC 9(08).
           05  INADI-DET-CANAL-ULT-PAG   PIC X(03).
           05  INADI-DET-FILLER          PIC X(28).
      *
       01  REG-SGLINADI-TRL.
           05  INADI-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  INADI-TRL-QTD-REGS        PIC 9(09).
           05  INADI-TRL-QT-LEVE         PIC 9(09).
           05  INADI-TRL-QT-MOD          PIC 9(09).
           05  INADI-TRL-QT-GRAVE        PIC 9(09).
           05  INADI-TRL-QT-CRIT         PIC 9(09).
           05  INADI-TRL-SOMA-SALDO      PIC 9(17)V99.
           05  INADI-TRL-DT-REF          PIC 9(08).
           05  INADI-TRL-FILLER          PIC X(157).
