       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0060.
       AUTHOR.        LAB-SIGEC.
       DATE-WRITTEN.  ANO 2026 - LABORATORIO SIGEC.
       DATE-COMPILED.
      *****************************************************************
      *                                                               *
      *   P R O G R A M A  ...........:  SGCB0060                     *
      *   S I S T E M A    ...........:  SIGEC                        *
      *   S U B S I S T E M A ........:  CADASTRO DE CLIENTES         *
      *   T I P O    .................:  MODULO CHAMADO (LINKAGE)    *
      *                                                               *
      *   F U N C A O   ..............:                               *
      *      REALIZA INCLUSAO OU ATUALIZACAO DE CLIENTE NA TABELA     *
      *      SIGEC.SG_CLIENTE E GRAVA A OCORRENCIA CORRESPONDENTE     *
      *      NA TABELA DE HISTORICO SIGEC.SG_HIST_CLIENTE, PROP-      *
      *      AGANDO A OPERACAO PELO CODIGO DE OPERACAO INFORMADO      *
      *      NA AREA DE LINKAGE (I=INSERT, U=UPDATE).                 *
      *                                                               *
      *   T A B E L A S ..............:                               *
      *      SIGEC.SG_CLIENTE       (INSERT / UPDATE)                 *
      *      SIGEC.SG_HIST_CLIENTE  (INSERT)                          *
      *                                                               *
      *   R E T O R N O ...............:                              *
      *      00 - OPERACAO EXECUTADA COM SUCESSO                      *
      *      04 - OPERACAO EXECUTADA COM AVISO (EX: JA EXISTIA)       *
      *      08 - VALIDACAO DE CAMPO FALHOU                           *
      *      08 - REGISTRO INEXISTENTE PARA UPDATE                    *
      *      12 - SQLCODE INESPERADO NO DB2                           *
      *                                                               *
      *   C O M M I T ................:                               *
      *      O COMMIT NAO E EMITIDO NESTE MODULO. O PROGRAMA          *
      *      CHAMADOR (BATCH DRIVER SGCB0010 OU EQUIVALENTE) E        *
      *      RESPONSAVEL PELO COMMIT/ROLLBACK CONFORME A JANELA       *
      *      OPERACIONAL. VER docs/FLUXO_PROCESSAMENTO.md.            *
      *                                                               *
      *   H I S T O R I C O ..........:                               *
      *      2026-07 - VERSAO INICIAL - LAB SIGEC                     *
      *                                                               *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
      *----------------------------------------------------------------*
      *           A R E A    D E    C O M U N I C A C A O    S Q L    *
      *----------------------------------------------------------------*
           EXEC SQL INCLUDE SQLCA END-EXEC.
      *----------------------------------------------------------------*
      *           D C L G E N S    U T I L I Z A D O S                *
      *----------------------------------------------------------------*
           EXEC SQL INCLUDE DCLSGCLI END-EXEC.
           EXEC SQL INCLUDE DCLSGHCL END-EXEC.
      *----------------------------------------------------------------*
      *           C O D I G O S    D E    R E T O R N O               *
      *----------------------------------------------------------------*
       COPY SGRETCOD.
       COPY SGERRMSG.
      *----------------------------------------------------------------*
      *           V A R I A V E I S    D E    T R A B A L H O         *
      *----------------------------------------------------------------*
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0060'.
           05  WS-OPERACAO-VAL           PIC X(01).
               88  WS-OP-INSERT                  VALUE 'I'.
               88  WS-OP-UPDATE                  VALUE 'U'.
               88  WS-OP-VALIDA                  VALUES 'I' 'U'.
           05  WS-SQLCODE-DISP           PIC -9(9).
           05  WS-TP-EVENTO              PIC X(03).
           05  WS-USUARIO                PIC X(30).
           05  WS-USUARIO-LEN            PIC S9(4) COMP VALUE +30.
           05  WS-OBS-TXT                PIC X(240).
           05  WS-OBS-LEN                PIC S9(4) COMP VALUE +240.
      *
       01  WS-VALIDA-FLAGS.
           05  WS-FL-VALIDACAO           PIC X(01) VALUE 'S'.
               88  WS-VL-OK                       VALUE 'S'.
               88  WS-VL-NOK                      VALUE 'N'.
      *
       LINKAGE SECTION.
       01  LK-CLI-AREA.
           05  LK-OPERACAO               PIC X(01).
               88  LK-OP-INSERT                  VALUE 'I'.
               88  LK-OP-UPDATE                  VALUE 'U'.
           05  LK-USUARIO                PIC X(08).
           05  LK-RETURN-CODE            PIC 9(02).
           05  LK-MENSAGEM               PIC X(80).
      *
       COPY SGCLIDAT.
       COPY SGCOMMAR.
      *
       PROCEDURE DIVISION USING LK-CLI-AREA
                                SGCLIDAT
                                SGCOMMAR.
      *****************************************************************
      *                                                               *
      *        P R O C E D U R E    D I V I S I O N                   *
      *                                                               *
      *        FLUXO:                                                 *
      *          0000 - PRINCIPAL                                     *
      *          1000 - INICIALIZAR VARIAVEIS DE TRABALHO             *
      *          2000 - VALIDAR CAMPOS DA AREA DE LINKAGE             *
      *          3000 - MAPEAR AREA CANONICA PARA HOST VARS DB2       *
      *          4000 - EXECUTAR OPERACAO DE ACORDO COM O CODIGO      *
      *              4100 - INSERIR CLIENTE (SG_CLIENTE)              *
      *              4200 - ATUALIZAR CLIENTE (SG_CLIENTE)            *
      *          5000 - GRAVAR HISTORICO EM SG_HIST_CLIENTE           *
      *          8000 - TRATAR ERRO DB2 INESPERADO                    *
      *          9000 - FINALIZAR E DEVOLVER RC                       *
      *                                                               *
      *****************************************************************
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-VALIDAR-ENTRADA
           IF SG-RC-OK
              PERFORM 3000-MAPEAR-HOSTVARS
              PERFORM 4000-EXECUTAR-OPERACAO
           END-IF
           IF SG-RC-OK OR SG-RC-WARN
              PERFORM 5000-GRAVAR-HISTORICO
           END-IF
           PERFORM 9000-FINALIZAR
           GOBACK.
      *
      *----------------------------------------------------------------*
       1000-INICIALIZAR.
      *----------------------------------------------------------------*
           MOVE SG-CT-RC-OK          TO WS-RC
           MOVE SPACES               TO LK-MENSAGEM
           MOVE LK-OPERACAO          TO WS-OPERACAO-VAL
           MOVE WS-PROG              TO SGC-PROG-CHAMADO
           MOVE LK-USUARIO           TO WS-USUARIO(1:8)
           MOVE 'BATCH-SIGEC-LAB'    TO WS-OBS-TXT
           MOVE +15                  TO WS-OBS-LEN
      *    TIPO DE EVENTO PARA A TABELA DE HISTORICO                   *
           IF WS-OP-INSERT
              MOVE 'INC'             TO WS-TP-EVENTO
           ELSE IF WS-OP-UPDATE
              MOVE 'ALT'             TO WS-TP-EVENTO
           ELSE
              MOVE 'DES'             TO WS-TP-EVENTO
           END-IF.
      *
      *----------------------------------------------------------------*
       2000-VALIDAR-ENTRADA.
      *----------------------------------------------------------------*
           MOVE 'S'                  TO WS-FL-VALIDACAO
      *
           IF NOT WS-OP-VALIDA
              MOVE 'N'               TO WS-FL-VALIDACAO
              MOVE 'OPERACAO INVALIDA (USE I=INSERT / U=UPDATE)'
                                     TO LK-MENSAGEM
           END-IF
      *
           IF WS-VL-OK
              IF NOT SG-CLI-DOC-VALIDO
                 MOVE 'N'            TO WS-FL-VALIDACAO
                 MOVE MS-DOC-TIPO-INVAL
                                     TO WS-EMS-CHAVE
                 MOVE 'TP DOC DEVE SER CPF, CNPJ OU LE'
                                     TO LK-MENSAGEM
              END-IF
           END-IF
      *
           IF WS-VL-OK
              IF SG-CLI-DOCUMENTO = SPACES
                 MOVE 'N'            TO WS-FL-VALIDACAO
                 MOVE 'NR DOCUMENTO NAO PODE SER VAZIO'
                                     TO LK-MENSAGEM
              END-IF
           END-IF
      *
           IF WS-VL-OK
              IF SG-CLI-NOME = SPACES
                 MOVE 'N'            TO WS-FL-VALIDACAO
                 MOVE 'NOME DO CLIENTE E OBRIGATORIO'
                                     TO LK-MENSAGEM
              END-IF
           END-IF
      *
           IF WS-VL-OK
              IF SG-CLI-TIPO-CLI NOT = 'PF'
                 AND SG-CLI-TIPO-CLI NOT = 'PJ'
                 AND SG-CLI-TIPO-CLI NOT = 'ES'
                 MOVE 'N'            TO WS-FL-VALIDACAO
                 MOVE 'TP CLIENTE INVALIDO (PF/PJ/ES)'
                                     TO LK-MENSAGEM
              END-IF
           END-IF
      *
           IF WS-VL-OK
              IF WS-OP-UPDATE AND SG-CLI-ID = ZEROES
                 MOVE 'N'            TO WS-FL-VALIDACAO
                 MOVE 'ID CLIENTE OBRIGATORIO PARA UPDATE'
                                     TO LK-MENSAGEM
              END-IF
           END-IF
      *
           IF WS-VL-NOK
              MOVE SG-CT-RC-ERR-FUNC TO WS-RC
           END-IF.
      *
      *----------------------------------------------------------------*
       3000-MAPEAR-HOSTVARS.
      *----------------------------------------------------------------*
      *    CONVERTE AREA CANONICA SGCLIDAT -> HOST VARS DCLGEN         *
           IF SG-CLI-ID NOT = ZEROES
              MOVE SG-CLI-ID           TO SGCLI-ID-CLIENTE
           END-IF
           MOVE SG-CLI-TIPO-DOC        TO SGCLI-TP-DOCUMENTO
           MOVE FUNCTION LENGTH(FUNCTION TRIM(SG-CLI-DOCUMENTO))
                                        TO SGCLI-NR-DOCUMENTO-LEN
           MOVE SG-CLI-DOCUMENTO       TO SGCLI-NR-DOCUMENTO-TXT
      *
           MOVE FUNCTION LENGTH(FUNCTION TRIM(SG-CLI-NOME))
                                        TO SGCLI-NM-CLIENTE-LEN
           MOVE SG-CLI-NOME            TO SGCLI-NM-CLIENTE-TXT
      *
           MOVE SG-CLI-TIPO-CLI        TO SGCLI-TP-CLIENTE
      *
      *    ENDERECO CONCATENA LOGRADOURO/NR/COMPL PARA CABER NO VARCHAR
           MOVE SPACES                 TO SGCLI-ENDERECO-TXT
           STRING FUNCTION TRIM(SG-CLI-LOGRADOURO)
                                       DELIMITED BY SIZE
                  ', '                 DELIMITED BY SIZE
                  FUNCTION TRIM(SG-CLI-NUMERO)
                                       DELIMITED BY SIZE
                  ' '                  DELIMITED BY SIZE
                  FUNCTION TRIM(SG-CLI-COMPLEMENTO)
                                       DELIMITED BY SIZE
             INTO SGCLI-ENDERECO-TXT
           END-STRING
           MOVE FUNCTION LENGTH(FUNCTION TRIM(SGCLI-ENDERECO-TXT))
                                        TO SGCLI-ENDERECO-LEN
           MOVE 0                       TO SGCLI-IND-ENDERECO
      *
           MOVE SG-CLI-CIDADE          TO SGCLI-CIDADE-TXT
           MOVE FUNCTION LENGTH(FUNCTION TRIM(SG-CLI-CIDADE))
                                        TO SGCLI-CIDADE-LEN
           MOVE 0                       TO SGCLI-IND-CIDADE
      *
           MOVE SG-CLI-UF              TO SGCLI-UF
           MOVE 0                       TO SGCLI-IND-UF
           MOVE SG-CLI-CEP             TO SGCLI-CEP
           MOVE 0                       TO SGCLI-IND-CEP
      *
           MOVE SG-CLI-IND-INADIMP     TO SGCLI-IND-REINCIDENTE
           IF SG-CLI-CLASSE-RISCO = SPACES OR LOW-VALUES
              MOVE -1                   TO SGCLI-IND-CLASSIF-RISCO
           ELSE
              MOVE SG-CLI-CLASSE-RISCO TO SGCLI-CLASSIFICACAO-RISCO
              MOVE 0                    TO SGCLI-IND-CLASSIF-RISCO
           END-IF
      *
           MOVE WS-USUARIO-LEN         TO SGCLI-USR-INC-LEN
           MOVE WS-USUARIO             TO SGCLI-USR-INC-TXT
           MOVE WS-USUARIO-LEN         TO SGCLI-USR-ALT-LEN
           MOVE WS-USUARIO             TO SGCLI-USR-ALT-TXT
           MOVE 'A'                    TO SGCLI-SITUACAO-REG.
      *
      *----------------------------------------------------------------*
       4000-EXECUTAR-OPERACAO.
      *----------------------------------------------------------------*
           IF WS-OP-INSERT
              PERFORM 4100-INSERIR-CLIENTE
           ELSE
              PERFORM 4200-ATUALIZAR-CLIENTE
           END-IF.
      *
      *----------------------------------------------------------------*
       4100-INSERIR-CLIENTE.
      *----------------------------------------------------------------*
           EXEC SQL
             INSERT INTO SIGEC.SG_CLIENTE
                    (TP_DOCUMENTO,
                     NR_DOCUMENTO,
                     NM_CLIENTE,
                     TP_CLIENTE,
                     ENDERECO,
                     CIDADE,
                     UF,
                     CEP,
                     IND_REINCIDENTE,
                     CLASSIFICACAO_RISCO,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (:SGCLI-TP-DOCUMENTO,
                     :SGCLI-NR-DOCUMENTO,
                     :SGCLI-NM-CLIENTE,
                     :SGCLI-TP-CLIENTE,
                     :SGCLI-ENDERECO
                        :SGCLI-IND-ENDERECO,
                     :SGCLI-CIDADE
                        :SGCLI-IND-CIDADE,
                     :SGCLI-UF
                        :SGCLI-IND-UF,
                     :SGCLI-CEP
                        :SGCLI-IND-CEP,
                     :SGCLI-IND-REINCIDENTE,
                     :SGCLI-CLASSIFICACAO-RISCO
                        :SGCLI-IND-CLASSIF-RISCO,
                     CURRENT TIMESTAMP,
                     :SGCLI-USUARIO-INCLUSAO,
                     'A')
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    CONTINUE
               WHEN SQLCODE = -803
                    MOVE SG-CT-RC-WARN     TO WS-RC
                    MOVE 'CLIENTE JA EXISTE (CHAVE DUPLICADA)'
                                            TO LK-MENSAGEM
               WHEN OTHER
                    PERFORM 8000-TRATAR-ERRO-DB2
           END-EVALUATE
      *
      *    RECUPERA O ID GERADO PELO IDENTITY PARA DEVOLVER AO CHAMADOR
           IF SQLCODE = 0
              EXEC SQL
                SELECT IDENTITY_VAL_LOCAL()
                  INTO :SGCLI-ID-CLIENTE
                  FROM SYSIBM.SYSDUMMY1
              END-EXEC
              IF SQLCODE = 0
                 MOVE SGCLI-ID-CLIENTE   TO SG-CLI-ID
              END-IF
           END-IF.
      *
      *----------------------------------------------------------------*
       4200-ATUALIZAR-CLIENTE.
      *----------------------------------------------------------------*
           EXEC SQL
             UPDATE SIGEC.SG_CLIENTE
                SET NM_CLIENTE          = :SGCLI-NM-CLIENTE,
                    TP_CLIENTE          = :SGCLI-TP-CLIENTE,
                    ENDERECO            = :SGCLI-ENDERECO
                                             :SGCLI-IND-ENDERECO,
                    CIDADE              = :SGCLI-CIDADE
                                             :SGCLI-IND-CIDADE,
                    UF                  = :SGCLI-UF
                                             :SGCLI-IND-UF,
                    CEP                 = :SGCLI-CEP
                                             :SGCLI-IND-CEP,
                    IND_REINCIDENTE     = :SGCLI-IND-REINCIDENTE,
                    CLASSIFICACAO_RISCO = :SGCLI-CLASSIFICACAO-RISCO
                                             :SGCLI-IND-CLASSIF-RISCO,
                    DH_ALTERACAO        = CURRENT TIMESTAMP,
                    USUARIO_ALTERACAO   = :SGCLI-USUARIO-ALTERACAO
              WHERE ID_CLIENTE          = :SGCLI-ID-CLIENTE
                AND SITUACAO_REG        = 'A'
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    CONTINUE
               WHEN SQLCODE = +100
                    MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                    MOVE 'CLIENTE NAO ENCONTRADO PARA UPDATE'
                                             TO LK-MENSAGEM
               WHEN OTHER
                    PERFORM 8000-TRATAR-ERRO-DB2
           END-EVALUATE.
      *
      *----------------------------------------------------------------*
       5000-GRAVAR-HISTORICO.
      *----------------------------------------------------------------*
      *    O ID_HIST E GERADO PELA SEQUENCE SIGEC.SEQ_SG_HIST_CLI.     *
      *    OS CAMPOS SNAPSHOT SAO COPIADOS DAS HOST VARS DE CLIENTE.   *
      *----------------------------------------------------------------*
           MOVE WS-TP-EVENTO           TO SGHCL-TP-EVENTO
           MOVE SGCLI-ID-CLIENTE       TO SGHCL-ID-CLIENTE
           MOVE SGCLI-TP-DOCUMENTO     TO SGHCL-TP-DOCUMENTO
           MOVE SGCLI-NR-DOCUMENTO-LEN TO SGHCL-NR-DOC-LEN
           MOVE SGCLI-NR-DOCUMENTO-TXT TO SGHCL-NR-DOC-TXT
           MOVE SGCLI-NM-CLIENTE-LEN   TO SGHCL-NM-CLI-LEN
           MOVE SGCLI-NM-CLIENTE-TXT   TO SGHCL-NM-CLI-TXT
           MOVE SGCLI-TP-CLIENTE       TO SGHCL-TP-CLIENTE
           MOVE SGCLI-ENDERECO-LEN     TO SGHCL-END-LEN
           MOVE SGCLI-ENDERECO-TXT     TO SGHCL-END-TXT
           MOVE SGCLI-CIDADE-LEN       TO SGHCL-CID-LEN
           MOVE SGCLI-CIDADE-TXT       TO SGHCL-CID-TXT
           MOVE SGCLI-UF               TO SGHCL-UF
           MOVE SGCLI-CEP              TO SGHCL-CEP
           MOVE SGCLI-IND-REINCIDENTE  TO SGHCL-IND-REINCIDENTE
           MOVE SGCLI-CLASSIFICACAO-RISCO
                                        TO SGHCL-CLASSIFICACAO-RISCO
           MOVE WS-OBS-LEN             TO SGHCL-OBS-LEN
           MOVE WS-OBS-TXT             TO SGHCL-OBS-TXT
           MOVE WS-USUARIO-LEN         TO SGHCL-USR-INC-LEN
           MOVE WS-USUARIO             TO SGHCL-USR-INC-TXT
           MOVE 'A'                    TO SGHCL-SITUACAO-REG
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_HIST_CLIENTE
                    (ID_HIST,
                     ID_CLIENTE,
                     DT_EVENTO,
                     TP_EVENTO,
                     TP_DOCUMENTO,
                     NR_DOCUMENTO,
                     NM_CLIENTE,
                     TP_CLIENTE,
                     ENDERECO,
                     CIDADE,
                     UF,
                     CEP,
                     IND_REINCIDENTE,
                     CLASSIFICACAO_RISCO,
                     OBSERVACAO,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (NEXT VALUE FOR SIGEC.SEQ_SG_HIST_CLI,
                     :SGHCL-ID-CLIENTE,
                     CURRENT TIMESTAMP,
                     :SGHCL-TP-EVENTO,
                     :SGHCL-TP-DOCUMENTO,
                     :SGHCL-NR-DOCUMENTO,
                     :SGHCL-NM-CLIENTE,
                     :SGHCL-TP-CLIENTE,
                     :SGHCL-ENDERECO,
                     :SGHCL-CIDADE,
                     :SGHCL-UF,
                     :SGHCL-CEP,
                     :SGHCL-IND-REINCIDENTE,
                     :SGHCL-CLASSIFICACAO-RISCO,
                     :SGHCL-OBSERVACAO,
                     CURRENT TIMESTAMP,
                     :SGHCL-USUARIO-INCLUSAO,
                     'A')
           END-EXEC
      *
           IF SQLCODE NOT = 0 AND SQLCODE NOT = -803
              PERFORM 8000-TRATAR-ERRO-DB2
           END-IF.
      *
      *----------------------------------------------------------------*
       8000-TRATAR-ERRO-DB2.
      *----------------------------------------------------------------*
           MOVE SG-CT-RC-ERR-TEC     TO WS-RC
           MOVE SQLCODE              TO WS-SQLCODE-DISP
           STRING '12-DB2-SQLCODE=' DELIMITED BY SIZE
                  WS-SQLCODE-DISP    DELIMITED BY SIZE
                  ' SGCB0060'        DELIMITED BY SIZE
             INTO LK-MENSAGEM.
      *
      *----------------------------------------------------------------*
       9000-FINALIZAR.
      *----------------------------------------------------------------*
           MOVE WS-RC                TO LK-RETURN-CODE
           MOVE WS-RC                TO SGC-RETURN-CODE
           MOVE LK-MENSAGEM          TO SGC-MENSAGEM
           MOVE WS-RC                TO RETURN-CODE.
