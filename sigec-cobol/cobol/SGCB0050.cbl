       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0050.
       AUTHOR.        LAB-SIGEC.
      *****************************************************************
      * PROGRAMA .: SGCB0050                                          *
      * SISTEMA  .: SIGEC - LABORATORIO                               *
      * FUNCAO   .: CONSULTA CADASTRAL DE CLIENTE POR ID OU POR       *
      *             (TIPO DOCUMENTO + NUMERO DOCUMENTO)               *
      * TABELA   .: SIGEC.SG_CLIENTE (SELECT SOMENTE)                 *
      * ENTRADA  .: LK-CLI-AREA (funcao, chave), SGCLIDAT (retorno),  *
      *             SGCOMMAR (rastreio da CALL)                       *
      * SAIDA    .: SGCLIDAT preenchido, LK-IND-EXISTE, LK-RC, msg    *
      *----------------------------------------------------------------*
      * REGRA DE RETORNO                                              *
      *   00 - CLIENTE ENCONTRADO E ATIVO                             *
      *   04 - CLIENTE ENCONTRADO PORAM INATIVO/BLOQUEADO             *
      *   08 - FUNCAO OU CHAVE INVALIDA (VALIDACAO DE ENTRADA)        *
      *   08 - CLIENTE NAO EXISTE (SQLCODE +100)                      *
      *   12 - ERRO DB2 INESPERADO (SQLCODE < 0)                      *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
      *---- AREA DE COMUNICACAO SQL --------------------------------- *
           EXEC SQL INCLUDE SQLCA END-EXEC.
      *---- DCLGEN DA TABELA SG_CLIENTE ----------------------------- *
           EXEC SQL INCLUDE DCLSGCLI END-EXEC.
      *---- CODIGOS DE RETORNO PADRAO SIGEC ------------------------- *
       COPY SGRETCOD.
      *---- CATALOGO DE MENSAGENS ----------------------------------- *
       COPY SGERRMSG.
      *
       01  WS-TRACE.
           05  WS-PROG-NAME              PIC X(08) VALUE 'SGCB0050'.
           05  WS-SQLCODE-DISP           PIC -9(9).
      *
       LINKAGE SECTION.
       01  LK-CLI-AREA.
           05  LK-FUNCAO                 PIC X(01).
               88  LK-FN-POR-ID                  VALUE 'I'.
               88  LK-FN-POR-DOC                 VALUE 'D'.
               88  LK-FN-VALIDA                  VALUES 'I' 'D'.
           05  LK-ID-CLIENTE             PIC 9(10).
           05  LK-TIPO-DOC               PIC X(03).
               88  LK-DOC-VALIDO                 VALUES
                   'CPF' 'CNP' 'LE '.
           05  LK-DOCUMENTO              PIC X(14).
           05  LK-IND-EXISTE             PIC X(01).
               88  LK-EXISTE                     VALUE 'S'.
               88  LK-NAO-EXISTE                 VALUE 'N'.
           05  LK-RETURN-CODE            PIC 9(02).
           05  LK-MENSAGEM               PIC X(80).
      *
       COPY SGCLIDAT.
       COPY SGCOMMAR.
      *
       PROCEDURE DIVISION USING LK-CLI-AREA
                                SGCLIDAT
                                SGCOMMAR.
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-VALIDAR-ENTRADA
           IF SG-RC-OK
              PERFORM 3000-SELECIONAR-CLIENTE
           END-IF
           PERFORM 9000-FINALIZAR
           GOBACK.
      *
       1000-INICIALIZAR.
           MOVE SG-CT-RC-OK          TO WS-RC
           MOVE 'N'                  TO LK-IND-EXISTE
           MOVE SPACES               TO LK-MENSAGEM
           INITIALIZE SGCLIDAT
           MOVE WS-PROG-NAME         TO SGC-PROG-CHAMADO.
      *
       2000-VALIDAR-ENTRADA.
           IF NOT LK-FN-VALIDA
              MOVE SG-CT-RC-ERR-FUNC TO WS-RC
              MOVE 'FUNCAO INVALIDA (USE I=ID / D=DOCUMENTO)'
                   TO LK-MENSAGEM
              GO TO 2099-FIM-VALIDA
           END-IF
           IF LK-FN-POR-ID
              IF LK-ID-CLIENTE = ZEROES
                 MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                 MOVE 'ID CLIENTE OBRIGATORIO PARA FUNCAO I'
                      TO LK-MENSAGEM
              END-IF
           ELSE
              IF NOT LK-DOC-VALIDO
                 MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                 MOVE 'TIPO DOC INVALIDO (CPF/CNP/LE)'
                      TO LK-MENSAGEM
              ELSE IF LK-DOCUMENTO = SPACES
                 MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                 MOVE 'NR DOCUMENTO OBRIGATORIO PARA FUNCAO D'
                      TO LK-MENSAGEM
              END-IF
           END-IF.
       2099-FIM-VALIDA.
           EXIT.
      *
       3000-SELECIONAR-CLIENTE.
           IF LK-FN-POR-ID
              PERFORM 3100-SELECT-POR-ID
           ELSE
              PERFORM 3200-SELECT-POR-DOC
           END-IF
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    MOVE 'S'                  TO LK-IND-EXISTE
                    PERFORM 4000-MAPEAR-RETORNO
               WHEN SQLCODE = +100
                    MOVE 'N'                  TO LK-IND-EXISTE
                    MOVE SG-CT-RC-ERR-FUNC    TO WS-RC
                    MOVE 'CLIENTE NAO ENCONTRADO'
                                              TO LK-MENSAGEM
               WHEN OTHER
                    PERFORM 8000-TRATAR-ERRO-DB2
           END-EVALUATE.
      *
       3100-SELECT-POR-ID.
           MOVE LK-ID-CLIENTE        TO SGCLI-ID-CLIENTE
           EXEC SQL
             SELECT ID_CLIENTE,
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
                    SITUACAO_REG
               INTO :SGCLI-ID-CLIENTE,
                    :SGCLI-TP-DOCUMENTO,
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
                    :SGCLI-SITUACAO-REG
               FROM SIGEC.SG_CLIENTE
              WHERE ID_CLIENTE = :SGCLI-ID-CLIENTE
              FETCH FIRST 1 ROWS ONLY
           END-EXEC.
      *
       3200-SELECT-POR-DOC.
           MOVE LK-TIPO-DOC          TO SGCLI-TP-DOCUMENTO
           MOVE LENGTH OF LK-DOCUMENTO
                                     TO SGCLI-NR-DOCUMENTO-LEN
           MOVE LK-DOCUMENTO         TO SGCLI-NR-DOCUMENTO-TXT
           EXEC SQL
             SELECT ID_CLIENTE,
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
                    SITUACAO_REG
               INTO :SGCLI-ID-CLIENTE,
                    :SGCLI-TP-DOCUMENTO,
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
                    :SGCLI-SITUACAO-REG
               FROM SIGEC.SG_CLIENTE
              WHERE TP_DOCUMENTO = :SGCLI-TP-DOCUMENTO
                AND NR_DOCUMENTO = :SGCLI-NR-DOCUMENTO
              FETCH FIRST 1 ROWS ONLY
           END-EXEC.
      *
       4000-MAPEAR-RETORNO.
      *    MAPEIA COLUNAS DCLGEN -> AREA CANONICA SGCLIDAT             *
           MOVE SGCLI-ID-CLIENTE      TO SG-CLI-ID
           MOVE SGCLI-TP-DOCUMENTO    TO SG-CLI-TIPO-DOC
           MOVE SGCLI-NR-DOCUMENTO-TXT
                                       TO SG-CLI-DOCUMENTO
           MOVE SGCLI-NM-CLIENTE-TXT  TO SG-CLI-NOME
           MOVE SGCLI-NM-CLIENTE-TXT (1:20)
                                       TO SG-CLI-NOME-REDUZ
           MOVE SGCLI-TP-CLIENTE      TO SG-CLI-TIPO-CLI
           MOVE SGCLI-SITUACAO-REG    TO SG-CLI-SITUACAO
           IF SGCLI-IND-CEP = 0
              MOVE SGCLI-CEP          TO SG-CLI-CEP
           ELSE
              MOVE ZEROES             TO SG-CLI-CEP
           END-IF
           IF SGCLI-IND-CIDADE = 0
              MOVE SGCLI-CIDADE-TXT   TO SG-CLI-CIDADE
           END-IF
           IF SGCLI-IND-UF = 0
              MOVE SGCLI-UF           TO SG-CLI-UF
           END-IF
           MOVE SGCLI-IND-REINCIDENTE TO SG-CLI-IND-INADIMP
           IF SGCLI-IND-CLASSIF-RISCO = 0
              MOVE SGCLI-CLASSIFICACAO-RISCO
                                       TO SG-CLI-CLASSE-RISCO
           END-IF
      *    SITUACAO INATIVA GERA RC 04 (AVISO)                         *
           IF SGCLI-SITUACAO-REG NOT = 'A'
              MOVE SG-CT-RC-WARN      TO WS-RC
              MOVE 'CLIENTE ENCONTRADO EM SITUACAO INATIVA'
                                       TO LK-MENSAGEM
           END-IF.
      *
       8000-TRATAR-ERRO-DB2.
           MOVE SG-CT-RC-ERR-TEC     TO WS-RC
           MOVE SQLCODE              TO WS-SQLCODE-DISP
           STRING '12-DB2-SQLCODE=' DELIMITED BY SIZE
                  WS-SQLCODE-DISP    DELIMITED BY SIZE
                  ' SGCB0050 SG_CLIENTE'
                                     DELIMITED BY SIZE
             INTO LK-MENSAGEM.
      *
       9000-FINALIZAR.
           MOVE WS-RC                TO LK-RETURN-CODE
           MOVE WS-RC                TO SGC-RETURN-CODE
           MOVE LK-MENSAGEM          TO SGC-MENSAGEM
           MOVE WS-RC                TO RETURN-CODE.
