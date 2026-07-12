      *****************************************************************
      * COPYBOOK.: SGCOMMAR                                            *
      * SISTEMA .: SIGEC - SISTEMA INTEGRADO DE GESTAO DE CONTRATOS    *
      * FUNCAO ..: AREA DE COMUNICACAO COMUM ENTRE PROGRAMAS SGCB      *
      * USO .....: WORKING-STORAGE OU LINKAGE-SECTION                  *
      *----------------------------------------------------------------*
      * ESTA AREA E PROPAGADA A CADA CALL ENTRE PROGRAMAS DO SIGEC.    *
      * O CAMPO SGC-PROG-CHAMADOR PERMITE RASTREAR A ORIGEM DA         *
      * INVOCACAO EM CASO DE ERRO. A DATA DE PROCESSAMENTO E FIXADA    *
      * POR SGCB0010 NO INICIO DA JANELA E NUNCA E ALTERADA.           *
      *****************************************************************
       01  SGCOMMAR.
           05  SGC-PROG-CHAMADOR         PIC X(08).
           05  SGC-PROG-CHAMADO          PIC X(08).
           05  SGC-DT-PROCESSAMENTO      PIC 9(08).
           05  SGC-DT-PROC-R    REDEFINES SGC-DT-PROCESSAMENTO.
               10  SGC-DT-PROC-AAAA      PIC 9(04).
               10  SGC-DT-PROC-MM        PIC 9(02).
               10  SGC-DT-PROC-DD        PIC 9(02).
           05  SGC-HORA-EXEC             PIC 9(06).
           05  SGC-RETURN-CODE           PIC 9(02).
           05  SGC-MENSAGEM              PIC X(80).
           05  SGC-USUARIO-EXEC          PIC X(08).
           05  SGC-AMBIENTE              PIC X(03).
               88  SGC-AMB-DES                    VALUE 'DES'.
               88  SGC-AMB-HML                    VALUE 'HML'.
               88  SGC-AMB-PRD                    VALUE 'PRD'.
           05  SGC-ID-EXECUCAO           PIC X(12).
           05  SGC-QT-REGS-LIDOS         PIC 9(09) COMP-3.
           05  SGC-QT-REGS-GRAV          PIC 9(09) COMP-3.
           05  SGC-QT-REGS-REJ           PIC 9(09) COMP-3.
           05  SGC-FILLER                PIC X(20).
