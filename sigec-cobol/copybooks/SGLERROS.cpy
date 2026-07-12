      *****************************************************************
      * COPYBOOK.: SGLERROS                                            *
      * SISTEMA .: SIGEC                                               *
      * ARQUIVO .: SGLERROS - CONSOLIDADO DE ERROS DA JANELA BATCH     *
      * ORGANIZ .: SEQUENCIAL                                          *
      * RECFM ...: FB     LRECL: 200     BLKSIZE: 27800                *
      * PROG ....: TODOS OS SGCB* GRAVAM (APPEND), SGCB0190 LE         *
      *----------------------------------------------------------------*
      * ARQUIVO DE APPEND. TODO PROGRAMA QUE ELEVA RC > 0 GRAVA UMA    *
      * LINHA PADRAO AQUI PARA CONSOLIDACAO EM RELATORIO.              *
      *****************************************************************
       01  REG-SGLERROS.
           05  ERROS-DT-OCORR            PIC 9(08).
           05  ERROS-HR-OCORR            PIC 9(06).
           05  ERROS-ID-EXECUCAO         PIC X(12).
           05  ERROS-PROG-ORIGEM         PIC X(08).
           05  ERROS-PROG-CHAMADOR       PIC X(08).
           05  ERROS-SEVERIDADE          PIC 9(02).
               88  ERROS-SEV-WARN                 VALUE 04.
               88  ERROS-SEV-ERR-FUNC             VALUE 08.
               88  ERROS-SEV-ERR-TEC              VALUE 12.
               88  ERROS-SEV-CRITICO              VALUE 16.
           05  ERROS-CD-CHAVE            PIC X(20).
           05  ERROS-MENSAGEM            PIC X(80).
           05  ERROS-CTX-1               PIC X(30).
           05  ERROS-CTX-2               PIC X(20).
           05  ERROS-FILLER              PIC X(06).
