      *****************************************************************
      * COPYBOOK.: SGLBLOQ                                             *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLBLOQ - BLOQUEIOS MANUAIS DA JANELA BATCH         *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 200     BLKSIZE: 27800                *
      * PROG ....: SGCB0010 (LEITURA), SGCB0130 (LEITURA POR CONTRATO) *
      *----------------------------------------------------------------*
      * BLOQUEIOS OPERACIONAIS: JANELA INTEIRA, CONTRATO ESPECIFICO,   *
      * CLIENTE OU CARTEIRA. TODO BLOQUEIO EXIGE JUSTIFICATIVA E       *
      * APROVADOR NOMEADO.                                             *
      *****************************************************************
       01  REG-SGLBLOQ.
           05  BLOQ-ID                   PIC 9(09).
           05  BLOQ-TIPO                 PIC X(03).
               88  BLOQ-TIPO-JANELA               VALUE 'JAN'.
               88  BLOQ-TIPO-CONTRATO             VALUE 'CTR'.
               88  BLOQ-TIPO-CLIENTE              VALUE 'CLI'.
               88  BLOQ-TIPO-CARTEIRA             VALUE 'CRT'.
               88  BLOQ-TIPO-INTERFACE            VALUE 'INT'.
      *---- ESCOPO ---------------------------------------------------*
           05  BLOQ-ESCOPO.
               10  BLOQ-ID-CONTRATO      PIC 9(12).
               10  BLOQ-ID-CLIENTE       PIC 9(10).
               10  BLOQ-CD-CARTEIRA      PIC X(08).
               10  BLOQ-CD-INTERFACE     PIC X(06).
      *---- VIGENCIA -------------------------------------------------*
           05  BLOQ-DT-INICIO            PIC 9(08).
           05  BLOQ-DT-FIM               PIC 9(08).
           05  BLOQ-IND-ATIVO            PIC X(01).
               88  BLOQ-ATIVO                     VALUE 'S'.
               88  BLOQ-INATIVO                   VALUE 'N'.
      *---- MOTIVO E AUDITORIA ---------------------------------------*
           05  BLOQ-CD-MOTIVO            PIC X(10).
           05  BLOQ-MOTIVO               PIC X(60).
           05  BLOQ-APROVADOR            PIC X(08).
           05  BLOQ-DT-APROVACAO         PIC 9(08).
           05  BLOQ-USUARIO-INCL         PIC X(08).
           05  BLOQ-DT-INCL              PIC 9(08).
           05  BLOQ-HR-INCL              PIC 9(06).
           05  BLOQ-USUARIO-BAIXA        PIC X(08).
           05  BLOQ-DT-BAIXA             PIC 9(08).
           05  BLOQ-JUSTIF-BAIXA         PIC X(30).
           05  BLOQ-FILLER               PIC X(05).
