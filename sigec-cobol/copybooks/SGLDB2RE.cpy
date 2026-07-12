      *****************************************************************
      * COPYBOOK.: SGLDB2RE                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLDB2RE - REJEICOES DB2 DURANTE CARGA/APLICACAO    *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 220     BLKSIZE: 26400                *
      * PROG ....: SGCB0030, SGCB0050 (SAIDA)                          *
      *----------------------------------------------------------------*
      * REGISTRA TODO INSERT/UPDATE QUE DEVOLVEU SQLCODE <> 0 E <> +100*
      * PARA POSSIBILITAR RETRABALHO OPERACIONAL.                      *
      *****************************************************************
       01  REG-SGLDB2RE.
           05  DB2RE-TIPO-REG            PIC X(01).
               88  DB2RE-E-HEADER                 VALUE 'H'.
               88  DB2RE-E-DETAIL                 VALUE 'D'.
               88  DB2RE-E-TRAILER                VALUE 'T'.
           05  DB2RE-CORPO               PIC X(219).
      *
       01  REG-SGLDB2RE-HDR.
           05  DB2RE-HDR-TIPO            PIC X(01) VALUE 'H'.
           05  DB2RE-HDR-DT-PROC         PIC 9(08).
           05  DB2RE-HDR-PROG-ORIGEM     PIC X(08).
           05  DB2RE-HDR-QTD-REJEICOES   PIC 9(09).
           05  DB2RE-HDR-FILLER          PIC X(193).
      *
       01  REG-SGLDB2RE-DET.
           05  DB2RE-DET-TIPO            PIC X(01) VALUE 'D'.
           05  DB2RE-DET-SEQ             PIC 9(09).
           05  DB2RE-DET-DT-OCORR        PIC 9(08).
           05  DB2RE-DET-HR-OCORR        PIC 9(06).
           05  DB2RE-DET-PROG-ORIGEM     PIC X(08).
           05  DB2RE-DET-OPERACAO        PIC X(06).
               88  DB2RE-OP-INSERT                VALUE 'INSERT'.
               88  DB2RE-OP-UPDATE                VALUE 'UPDATE'.
               88  DB2RE-OP-DELETE                VALUE 'DELETE'.
               88  DB2RE-OP-MERGE                 VALUE 'MERGE '.
           05  DB2RE-DET-TABELA          PIC X(30).
           05  DB2RE-DET-CHAVE           PIC X(60).
           05  DB2RE-DET-SQLCODE         PIC S9(09) SIGN LEADING.
           05  DB2RE-DET-SQLSTATE        PIC X(05).
           05  DB2RE-DET-SQLERRMC        PIC X(50).
           05  DB2RE-DET-ID-EXECUCAO     PIC X(12).
           05  DB2RE-DET-FILLER          PIC X(15).
      *
       01  REG-SGLDB2RE-TRL.
           05  DB2RE-TRL-TIPO            PIC X(01) VALUE 'T'.
           05  DB2RE-TRL-QTD-REGS        PIC 9(09).
           05  DB2RE-TRL-QTD-SQLCODE-NEG PIC 9(09).
           05  DB2RE-TRL-DT-PROC         PIC 9(08).
           05  DB2RE-TRL-FILLER          PIC X(192).
