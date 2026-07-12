       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0040.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0040                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: CARGA EM DB2 DOS CONTRATOS VALIDADOS EM SGCB0020  *
      *                                                               *
      * ARQUIVOS .:                                                   *
      *   ENTRADA  - SGLCTRVL (DD CTRVL)   FB LRECL 220               *
      *   SAIDA    - SGLCTRCG (DD CTRCG)   FB LRECL 180 - CARREGADOS  *
      *              SGLDB2RE (DD DB2RE)   FB LRECL 220 - REJEICAO DB2*
      *                                                               *
      * TABELAS DB2:                                                  *
      *   SIGEC.SG_CLIENTE            - consulta/inclusao via         *
      *                                 SGCB0050 e SGCB0060           *
      *   SIGEC.SG_CONTRATO           - INSERT                        *
      *   SIGEC.SG_PARCELA            - INSERT (loop de parcelas)     *
      *   SIGEC.SG_HIST_PROCESSAMENTO - INSERT (auditoria de execucao)*
      *                                                               *
      * FLUXO POR CONTRATO:                                           *
      *   1. Consulta cliente por documento     (SGCB0050)            *
      *   2. Se nao existe: chama SGCB0060 INSERT (se permitido)      *
      *   3. INSERT contrato (SG_CONTRATO)                            *
      *   4. Loop 1..N: INSERT parcelas (SG_PARCELA)                  *
      *   5. Escreve SGLCTRCG                                         *
      *   6. COMMIT a cada N registros (parametro WS-CT-COMMIT)       *
      *                                                               *
      * ERROS DB2:                                                    *
      *   SQLCODE < 0                -> grava em SGLDB2RE + ROLLBACK  *
      *   SQLCODE = -803 (duplicata) -> tratado como AVISO (RC=04)    *
      *   SQLCODE = +100             -> tratado (nao encontrado)      *
      *                                                               *
      * CODIGOS DE RETORNO:                                           *
      *   00 - 00-CTR-CARGA-OK                                        *
      *   04 - 04-DB2-DUPL-IGNOR   duplicatas ignoradas               *
      *   08 - 08-CLI-INTEGR       cliente com integridade invalida   *
      *   12 - 12-DB2-SQLCODE      SQLCODE inesperado                 *
      *   16 - 16-DB2-DOWN         DB2 indisponivel                   *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SGLCTRVL-FILE
                  ASSIGN TO CTRVL
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-CTRVL-STATUS.
      *
           SELECT SGLCTRCG-FILE
                  ASSIGN TO CTRCG
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-CTRCG-STATUS.
      *
           SELECT SGLDB2RE-FILE
                  ASSIGN TO DB2RE
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-DB2RE-STATUS.
      *
       DATA DIVISION.
       FILE SECTION.
      *---------------------------------------------------------------*
       FD  SGLCTRVL-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLCTRVL.
      *
       FD  SGLCTRCG-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLCTRCG.
      *
       FD  SGLDB2RE-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLDB2RE.
      *
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * SQLCA E DCLGENS                                               *
      *---------------------------------------------------------------*
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE DCLSGCTR END-EXEC.
           EXEC SQL INCLUDE DCLSGPAR END-EXEC.
           EXEC SQL INCLUDE DCLSGHPR END-EXEC.
      *
      *---------------------------------------------------------------*
      * STATUS DE ARQUIVOS                                            *
      *---------------------------------------------------------------*
       01  WS-STATUS.
           05  WS-CTRVL-STATUS       PIC X(02) VALUE '00'.
               88  WS-CTRVL-OK               VALUE '00'.
               88  WS-CTRVL-EOF              VALUE '10'.
           05  WS-CTRCG-STATUS       PIC X(02) VALUE '00'.
               88  WS-CTRCG-OK               VALUE '00'.
           05  WS-DB2RE-STATUS       PIC X(02) VALUE '00'.
               88  WS-DB2RE-OK               VALUE '00'.
      *
      *---------------------------------------------------------------*
      * FLAGS                                                         *
      *---------------------------------------------------------------*
       01  WS-FLAGS.
           05  WS-FL-EOF             PIC X(01) VALUE 'N'.
               88  WS-EOF-CTRVL              VALUE 'S'.
           05  WS-FL-CTR-OK          PIC X(01) VALUE 'S'.
               88  WS-CTR-OK                 VALUE 'S'.
               88  WS-CTR-NOK                VALUE 'N'.
           05  WS-FL-CLI-NOVO        PIC X(01) VALUE 'N'.
               88  WS-CLI-NOVO               VALUE 'S'.
               88  WS-CLI-EXISTENTE          VALUE 'N'.
           05  WS-FL-PERMITE-CRIA    PIC X(01) VALUE 'S'.
      *
      *---------------------------------------------------------------*
      * CONTADORES E LIMITES                                          *
      *---------------------------------------------------------------*
       01  WS-CONTA.
           05  WS-QT-LIDOS           PIC 9(09) VALUE ZERO.
           05  WS-QT-CARREGADOS      PIC 9(09) VALUE ZERO.
           05  WS-QT-DUPL-IGN        PIC 9(09) VALUE ZERO.
           05  WS-QT-REJEITADOS      PIC 9(09) VALUE ZERO.
           05  WS-QT-CLI-CRIADOS     PIC 9(09) VALUE ZERO.
           05  WS-QT-PARC-GER        PIC 9(11) VALUE ZERO.
           05  WS-QT-DB2RE           PIC 9(09) VALUE ZERO.
           05  WS-SEQ-DB2RE          PIC 9(09) VALUE ZERO.
           05  WS-CT-COMMIT          PIC 9(05) VALUE 01000.
           05  WS-DESDE-COMMIT       PIC 9(05) VALUE ZERO.
           05  WS-QT-COMMITS         PIC 9(09) VALUE ZERO.
           05  WS-SOMA-VALORES       PIC 9(15)V99 VALUE ZERO.
      *
      *---------------------------------------------------------------*
      * DATA E HORA                                                   *
      *---------------------------------------------------------------*
       01  WS-DTHR.
           05  WS-CURR-DATE          PIC X(21) VALUE SPACES.
           05  WS-DATA-HOJE-N        PIC 9(08) VALUE ZERO.
           05  WS-HORA-HOJE-N        PIC 9(06) VALUE ZERO.
      *
      *---------------------------------------------------------------*
      * AREA DE DATAS COM REDEFINES ANINHADO (LEGADO)                 *
      *   Um mesmo buffer expoe as formas AAAAMMDD, ISO YYYY-MM-DD,   *
      *   partes soltas e digitos individuais. Padrao legado antigo   *
      *   herdado de SGCB0004 (1998) mantido por compatibilidade com  *
      *   utilitarios de conversao que assumem esta estrutura.        *
      *---------------------------------------------------------------*
       01  WS-DATA-LEGADO.
           05  WS-DL-BUFFER          PIC X(10) VALUE '2000-01-01'.
           05  WS-DL-ISO-R  REDEFINES WS-DL-BUFFER.
               10  WS-DL-ANO         PIC 9(04).
               10  WS-DL-SEP1        PIC X(01).
               10  WS-DL-MES         PIC 9(02).
               10  WS-DL-SEP2        PIC X(01).
               10  WS-DL-DIA         PIC 9(02).
           05  WS-DL-DIG-R  REDEFINES WS-DL-BUFFER.
               10  WS-DL-D-ANO       PIC 9(01) OCCURS 4 TIMES.
               10  WS-DL-D-SEP1      PIC X(01).
               10  WS-DL-D-MES       PIC 9(01) OCCURS 2 TIMES.
               10  WS-DL-D-SEP2      PIC X(01).
               10  WS-DL-D-DIA       PIC 9(01) OCCURS 2 TIMES.
      *
       01  WS-DATA-NUM               PIC 9(08) VALUE ZERO.
       01  WS-DATA-NUM-R REDEFINES WS-DATA-NUM.
           05  WS-DN-AAAA            PIC 9(04).
           05  WS-DN-AAAA-R REDEFINES WS-DN-AAAA.
               10  WS-DN-SECULO      PIC 9(02).
               10  WS-DN-DECADA      PIC 9(02).
           05  WS-DN-MM              PIC 9(02).
           05  WS-DN-DD              PIC 9(02).
      *
      *---------------------------------------------------------------*
      * CALCULO FINANCEIRO POR PARCELA                                *
      *---------------------------------------------------------------*
       01  WS-CALC.
           05  WS-VLR-PARCELA        PIC S9(13)V99 COMP-3 VALUE 0.
           05  WS-RESTO-CENTAVOS     PIC S9(13)V99 COMP-3 VALUE 0.
           05  WS-VLR-SOMA           PIC S9(13)V99 COMP-3 VALUE 0.
           05  WS-VLR-DIF            PIC S9(13)V99 COMP-3 VALUE 0.
           05  WS-IDX-PARC           PIC S9(04) COMP    VALUE 0.
           05  WS-NR-PARC-ATUAL      PIC S9(04) COMP    VALUE 0.
           05  WS-INT-DATA           PIC S9(09) COMP    VALUE 0.
           05  WS-DT-VCTO-N          PIC 9(08)          VALUE 0.
           05  WS-DT-VCTO-C          PIC X(10)          VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * CONTROLE DE SQL / DB2                                         *
      *---------------------------------------------------------------*
       01  WS-DB2.
           05  WS-SQLCODE-DISP       PIC -9(9).
           05  WS-TABELA-ERRO        PIC X(30).
           05  WS-CHAVE-ERRO         PIC X(60).
           05  WS-OPERACAO           PIC X(06).
           05  WS-ID-CONTRATO-DB2    PIC 9(12) VALUE ZERO.
      *
      *---------------------------------------------------------------*
      * IDENTIFICACAO / EXECUCAO                                      *
      *---------------------------------------------------------------*
       01  WS-EXEC.
           05  WS-PROG               PIC X(08) VALUE 'SGCB0040'.
           05  WS-USUARIO            PIC X(08) VALUE 'BATCHSGE'.
           05  WS-USUARIO-30         PIC X(30) VALUE
               'SGCB0040-BATCH-SIGEC          '.
           05  WS-JOB-NM             PIC X(30) VALUE
               'SGCJOB01-CARGA-CTR            '.
           05  WS-ID-EXEC            PIC X(12) VALUE 'SGCB0040-001'.
      *
      *---------------------------------------------------------------*
      * COPYBOOKS DE APOIO                                            *
      *---------------------------------------------------------------*
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
      *---------------------------------------------------------------*
      * AREAS CANONICAS PARA CALLS                                    *
      *---------------------------------------------------------------*
           COPY SGCLIDAT.
           COPY SGCOMMAR.
           COPY SGDATAS.
      *
      *---------------------------------------------------------------*
      * AREA DE LINKAGE PARA CHAMADA SGCB0050 (CONSULTA)              *
      * Layout definido em cobol/SGCB0050.cbl                         *
      *---------------------------------------------------------------*
       01  WS-LK-CLI-CONSULTA.
           05  WS-LKQ-FUNCAO         PIC X(01) VALUE 'D'.
           05  WS-LKQ-ID-CLIENTE     PIC 9(10) VALUE ZERO.
           05  WS-LKQ-TIPO-DOC       PIC X(03) VALUE SPACES.
           05  WS-LKQ-DOCUMENTO      PIC X(14) VALUE SPACES.
           05  WS-LKQ-IND-EXISTE     PIC X(01) VALUE 'N'.
           05  WS-LKQ-RETURN-CODE    PIC 9(02) VALUE ZERO.
           05  WS-LKQ-MENSAGEM       PIC X(80) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * AREA DE LINKAGE PARA CHAMADA SGCB0060 (INSERT/UPDATE)         *
      * Layout definido em cobol/SGCB0060.cbl                         *
      *---------------------------------------------------------------*
       01  WS-LK-CLI-MANUT.
           05  WS-LKM-OPERACAO       PIC X(01) VALUE 'I'.
           05  WS-LKM-USUARIO        PIC X(08) VALUE 'BATCHSGE'.
           05  WS-LKM-RETURN-CODE    PIC 9(02) VALUE ZERO.
           05  WS-LKM-MENSAGEM       PIC X(80) VALUE SPACES.
      *
       PROCEDURE DIVISION.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-ABRIR-ARQUIVOS
      *
           IF SG-RC-ROMPE-FLUXO
              PERFORM 6000-FECHAR-ARQUIVOS
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 2100-LER-E-VALIDAR-HEADER
      *
           PERFORM 3000-PROCESSAR-CONTRATO
              UNTIL WS-EOF-CTRVL
                 OR SG-RC-ABORTA-JANELA
      *
           IF WS-QT-CARREGADOS > 0
              PERFORM 4900-COMMIT-FINAL
           END-IF
      *
           PERFORM 5000-GRAVAR-CABEC-SAIDA
           PERFORM 5500-GRAVAR-HIST-PROCESSAMENTO
           PERFORM 6000-FECHAR-ARQUIVOS
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE SG-CT-RC-OK          TO WS-RC
           MOVE 'N'                  TO WS-FL-EOF
           MOVE ZERO                 TO WS-QT-LIDOS
                                        WS-QT-CARREGADOS
                                        WS-QT-DUPL-IGN
                                        WS-QT-REJEITADOS
                                        WS-QT-CLI-CRIADOS
                                        WS-QT-PARC-GER
                                        WS-QT-DB2RE
                                        WS-SEQ-DB2RE
                                        WS-DESDE-COMMIT
                                        WS-QT-COMMITS
                                        WS-SOMA-VALORES
      *
           MOVE FUNCTION CURRENT-DATE TO WS-CURR-DATE
           MOVE WS-CURR-DATE(1:8)     TO WS-DATA-HOJE-N
           MOVE WS-CURR-DATE(9:6)     TO WS-HORA-HOJE-N
      *
           INITIALIZE SGCOMMAR
           MOVE WS-PROG               TO SGC-PROG-CHAMADOR
           MOVE WS-DATA-HOJE-N        TO SGC-DT-PROCESSAMENTO
           MOVE WS-HORA-HOJE-N        TO SGC-HORA-EXEC
           MOVE WS-USUARIO            TO SGC-USUARIO-EXEC
           MOVE 'PRD'                 TO SGC-AMBIENTE
           MOVE WS-ID-EXEC            TO SGC-ID-EXECUCAO
      *
           DISPLAY '======================================='
           DISPLAY 'SGCB0040 - CARGA DB2 DE CONTRATOS'
           DISPLAY '  DT-PROC = ' WS-DATA-HOJE-N
                   '  HR-PROC = ' WS-HORA-HOJE-N
           DISPLAY '  COMMIT A CADA ' WS-CT-COMMIT ' REGISTROS'
           DISPLAY '=======================================' .
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-ARQUIVOS SECTION.
           OPEN INPUT SGLCTRVL-FILE
           IF NOT WS-CTRVL-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-CTRVL OPEN INPUT ST=' WS-CTRVL-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLCTRCG-FILE
           IF NOT WS-CTRCG-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-CTRCG OPEN OUTPUT ST=' WS-CTRCG-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLDB2RE-FILE
           IF NOT WS-DB2RE-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-DB2RE OPEN OUTPUT ST=' WS-DB2RE-STATUS
              GO TO 2000-FIM
           END-IF.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2100-LER-E-VALIDAR-HEADER SECTION.
           READ SGLCTRVL-FILE
              AT END
                 MOVE 'S' TO WS-FL-EOF
                 MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                 DISPLAY '08-CTRVL-VAZIO NADA A CARREGAR'
              NOT AT END
                 IF NOT CTRVL-E-HEADER
                    DISPLAY '04-CTRVL-SEM-HEADER PRIMEIRO REG ='
                            CTRVL-TIPO-REG
                    IF WS-RC < SG-CT-RC-WARN
                       MOVE SG-CT-RC-WARN TO WS-RC
                    END-IF
                 ELSE
                    DISPLAY 'CTRVL HEADER DT-PROC='
                            CTRVL-HDR-DT-PROC
                            ' QTD-VALIDOS='
                            CTRVL-HDR-QTD-VALIDOS
                 END-IF
           END-READ.
       2100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * LOOP PRINCIPAL - PROCESSA UM CONTRATO POR ITERACAO            *
      *---------------------------------------------------------------*
       3000-PROCESSAR-CONTRATO SECTION.
           READ SGLCTRVL-FILE
              AT END
                 MOVE 'S' TO WS-FL-EOF
                 GO TO 3000-FIM
              NOT AT END
                 CONTINUE
           END-READ
      *
           EVALUATE TRUE
              WHEN CTRVL-E-DETAIL
                 ADD 1 TO WS-QT-LIDOS
                 MOVE 'S' TO WS-FL-CTR-OK
                 PERFORM 3100-RESOLVER-CLIENTE
                 IF WS-CTR-OK
                    PERFORM 3200-INSERIR-CONTRATO
                 END-IF
                 IF WS-CTR-OK
                    PERFORM 3300-GERAR-PARCELAS
                 END-IF
                 IF WS-CTR-OK
                    PERFORM 3400-GRAVAR-SGLCTRCG
                    ADD 1                       TO WS-QT-CARREGADOS
                    ADD 1                       TO WS-DESDE-COMMIT
                    ADD CTRVL-DET-VALOR-TOTAL   TO WS-SOMA-VALORES
                    IF WS-DESDE-COMMIT >= WS-CT-COMMIT
                       PERFORM 4800-COMMIT-INTERMEDIARIO
                    END-IF
                 ELSE
                    ADD 1                       TO WS-QT-REJEITADOS
                    PERFORM 4700-ROLLBACK
                 END-IF
              WHEN CTRVL-E-TRAILER
                 MOVE 'S' TO WS-FL-EOF
              WHEN CTRVL-E-HEADER
                 CONTINUE
              WHEN OTHER
                 DISPLAY '04-CTRVL-TIPO-INVAL REG=' CTRVL-TIPO-REG
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
           END-EVALUATE.
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * RESOLUCAO DO CLIENTE - CONSULTA / INCLUSAO                    *
      *---------------------------------------------------------------*
       3100-RESOLVER-CLIENTE SECTION.
           MOVE 'N' TO WS-FL-CLI-NOVO
      *
      *---- MONTA AREA DE CONSULTA ---------------------------------- *
           MOVE 'D'                       TO WS-LKQ-FUNCAO
           MOVE ZERO                      TO WS-LKQ-ID-CLIENTE
           MOVE CTRVL-DET-TIPO-DOC        TO WS-LKQ-TIPO-DOC
           MOVE CTRVL-DET-DOCUMENTO       TO WS-LKQ-DOCUMENTO
           MOVE 'N'                       TO WS-LKQ-IND-EXISTE
           MOVE ZERO                      TO WS-LKQ-RETURN-CODE
           MOVE SPACES                    TO WS-LKQ-MENSAGEM
      *
           INITIALIZE SGCLIDAT
      *
           CALL 'SGCB0050' USING WS-LK-CLI-CONSULTA
                                 SGCLIDAT
                                 SGCOMMAR
      *
           EVALUATE TRUE
              WHEN WS-LKQ-IND-EXISTE = 'S'
                 MOVE 'N' TO WS-FL-CLI-NOVO
              WHEN WS-LKQ-RETURN-CODE = 08
                 AND WS-LKQ-IND-EXISTE = 'N'
                 MOVE 'S' TO WS-FL-CLI-NOVO
                 IF WS-FL-PERMITE-CRIA = 'S'
                    PERFORM 3150-INCLUIR-CLIENTE
                 ELSE
                    MOVE 'N' TO WS-FL-CTR-OK
                    MOVE 'INSERT '     TO WS-OPERACAO
                    MOVE 'SG_CLIENTE'  TO WS-TABELA-ERRO
                    MOVE CTRVL-DET-DOCUMENTO(1:14)
                                       TO WS-CHAVE-ERRO(1:14)
                    MOVE 0             TO SQLCODE
                    PERFORM 8000-GRAVAR-DB2RE
                    IF WS-RC < SG-CT-RC-ERR-FUNC
                       MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                    END-IF
                 END-IF
              WHEN WS-LKQ-RETURN-CODE >= 12
                 MOVE 'N' TO WS-FL-CTR-OK
                 MOVE 'SELECT'      TO WS-OPERACAO
                 MOVE 'SG_CLIENTE'  TO WS-TABELA-ERRO
                 MOVE CTRVL-DET-DOCUMENTO(1:14)
                                    TO WS-CHAVE-ERRO(1:14)
                 PERFORM 8000-GRAVAR-DB2RE
                 IF WS-RC < SG-CT-RC-ERR-TEC
                    MOVE SG-CT-RC-ERR-TEC TO WS-RC
                 END-IF
              WHEN OTHER
                 CONTINUE
           END-EVALUATE.
       3100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * INSERE CLIENTE VIA SGCB0060 A PARTIR DOS DADOS DO CONTRATO    *
      *---------------------------------------------------------------*
       3150-INCLUIR-CLIENTE SECTION.
           INITIALIZE SGCLIDAT
      *
           MOVE 0                            TO SG-CLI-ID
           MOVE CTRVL-DET-TIPO-DOC           TO SG-CLI-TIPO-DOC
           MOVE CTRVL-DET-DOCUMENTO          TO SG-CLI-DOCUMENTO
           MOVE CTRVL-DET-NOME               TO SG-CLI-NOME
           MOVE CTRVL-DET-NOME(1:20)         TO SG-CLI-NOME-REDUZ
           MOVE CTRVL-DET-TIPO-CLIENTE       TO SG-CLI-TIPO-CLI
           MOVE 'A'                          TO SG-CLI-SITUACAO
           MOVE WS-DATA-HOJE-N               TO SG-CLI-DT-CADASTRO
           MOVE WS-DATA-HOJE-N               TO SG-CLI-DT-ATUALIZACAO
           MOVE 'N'                          TO SG-CLI-IND-INADIMP
           MOVE 'A'                          TO SG-CLI-CLASSE-RISCO
           MOVE 0                            TO SG-CLI-SCORE
      *
           MOVE 'I'                          TO WS-LKM-OPERACAO
           MOVE WS-USUARIO                   TO WS-LKM-USUARIO
           MOVE ZERO                         TO WS-LKM-RETURN-CODE
           MOVE SPACES                       TO WS-LKM-MENSAGEM
      *
           CALL 'SGCB0060' USING WS-LK-CLI-MANUT
                                 SGCLIDAT
                                 SGCOMMAR
      *
           EVALUATE TRUE
              WHEN WS-LKM-RETURN-CODE = 00
                 ADD 1 TO WS-QT-CLI-CRIADOS
              WHEN WS-LKM-RETURN-CODE = 04
                 CONTINUE
              WHEN WS-LKM-RETURN-CODE >= 08
                 MOVE 'N' TO WS-FL-CTR-OK
                 MOVE 'INSERT'      TO WS-OPERACAO
                 MOVE 'SG_CLIENTE'  TO WS-TABELA-ERRO
                 MOVE CTRVL-DET-DOCUMENTO(1:14)
                                    TO WS-CHAVE-ERRO(1:14)
                 PERFORM 8000-GRAVAR-DB2RE
                 IF WS-RC < SG-CT-RC-ERR-FUNC
                    MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                 END-IF
           END-EVALUATE.
       3150-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * INSERT CONTRATO EM SIGEC.SG_CONTRATO                          *
      *---------------------------------------------------------------*
       3200-INSERIR-CONTRATO SECTION.
      *---- MAPEAMENTO CTRVL -> HOST VARS DCLGEN --------------------*
           MOVE LENGTH OF CTRVL-DET-NR-CONTRATO
                                            TO SGCTR-ID-CTR-LEN
           MOVE CTRVL-DET-NR-CONTRATO       TO SGCTR-ID-CTR-TXT
           MOVE SG-CLI-ID                   TO SGCTR-ID-CLIENTE
           MOVE CTRVL-DET-TIPO-CONTRATO     TO SGCTR-TP-CONTRATO
           MOVE CTRVL-DET-VALOR-TOTAL       TO SGCTR-VR-TOTAL
           MOVE CTRVL-DET-VALOR-TOTAL       TO SGCTR-VR-SALDO
           MOVE CTRVL-DET-QTD-PARCELAS      TO SGCTR-QT-PARCELAS
           MOVE CTRVL-DET-QTD-PARCELAS      TO SGCTR-QT-PARC-ABERTAS
           MOVE 0                           TO SGCTR-QT-PARC-VENCIDAS
           MOVE CTRVL-DET-TAXA-JUROS        TO SGCTR-TX-JUROS
           MOVE CTRVL-DET-PCT-MULTA         TO SGCTR-PC-MULTA
           MOVE 'AT'                        TO SGCTR-ST-CONTRATO
           MOVE 'N'                         TO SGCTR-IND-RENEG-ATIVA
           MOVE 0                           TO SGCTR-FAIXA-ATRASO
           MOVE 0                           TO SGCTR-DIAS-ATRASO-MAX
           MOVE 30                          TO SGCTR-USR-INC-LEN
           MOVE WS-USUARIO-30               TO SGCTR-USR-INC-TXT
           MOVE 'A'                         TO SGCTR-SITUACAO-REG
      *
      *---- DATA DE INICIO EM FORMATO ISO ---------------------------*
           MOVE CTRVL-DET-DATA-INICIO       TO WS-DATA-NUM
           PERFORM 3250-FORMATA-DATA-ISO
           MOVE WS-DL-BUFFER                TO SGCTR-DT-INICIO
      *
      *---- DATA FIM = DATA_INICIO + QTD_PARCELAS MESES (30 DIAS) --*
           PERFORM 3260-CALCULA-DATA-FIM
           MOVE WS-DL-BUFFER                TO SGCTR-DT-FIM
      *
      *---- INSERT ---------------------------------------------------*
           MOVE 'INSERT' TO WS-OPERACAO
           MOVE 'SG_CONTRATO' TO WS-TABELA-ERRO
           MOVE CTRVL-DET-NR-CONTRATO(1:15) TO WS-CHAVE-ERRO(1:15)
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_CONTRATO
                    (ID_CONTRATO,
                     ID_CLIENTE,
                     TP_CONTRATO,
                     VR_TOTAL,
                     VR_SALDO,
                     QT_PARCELAS,
                     QT_PARCELAS_ABERTAS,
                     QT_PARCELAS_VENCIDAS,
                     DT_INICIO,
                     DT_FIM,
                     TX_JUROS,
                     PC_MULTA,
                     ST_CONTRATO,
                     IND_RENEGOCIACAO_ATIVA,
                     FAIXA_ATRASO,
                     DIAS_ATRASO_MAX,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (:SGCTR-ID-CONTRATO,
                     :SGCTR-ID-CLIENTE,
                     :SGCTR-TP-CONTRATO,
                     :SGCTR-VR-TOTAL,
                     :SGCTR-VR-SALDO,
                     :SGCTR-QT-PARCELAS,
                     :SGCTR-QT-PARC-ABERTAS,
                     :SGCTR-QT-PARC-VENCIDAS,
                     DATE(:SGCTR-DT-INICIO),
                     DATE(:SGCTR-DT-FIM),
                     :SGCTR-TX-JUROS,
                     :SGCTR-PC-MULTA,
                     :SGCTR-ST-CONTRATO,
                     :SGCTR-IND-RENEG-ATIVA,
                     :SGCTR-FAIXA-ATRASO,
                     :SGCTR-DIAS-ATRASO-MAX,
                     CURRENT TIMESTAMP,
                     :SGCTR-USUARIO-INCLUSAO,
                     :SGCTR-SITUACAO-REG)
           END-EXEC
      *
           EVALUATE TRUE
              WHEN SQLCODE = 0
                 CONTINUE
              WHEN SQLCODE = -803
                 ADD 1 TO WS-QT-DUPL-IGN
                 PERFORM 8000-GRAVAR-DB2RE
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
                 MOVE 'N' TO WS-FL-CTR-OK
              WHEN SQLCODE = -911 OR SQLCODE = -913
                 PERFORM 8000-GRAVAR-DB2RE
                 MOVE 'N' TO WS-FL-CTR-OK
                 IF WS-RC < SG-CT-RC-CRITICO
                    MOVE SG-CT-RC-CRITICO TO WS-RC
                 END-IF
              WHEN SQLCODE < 0
                 PERFORM 8000-GRAVAR-DB2RE
                 MOVE 'N' TO WS-FL-CTR-OK
                 IF WS-RC < SG-CT-RC-ERR-TEC
                    MOVE SG-CT-RC-ERR-TEC TO WS-RC
                 END-IF
              WHEN OTHER
                 PERFORM 8000-GRAVAR-DB2RE
                 MOVE 'N' TO WS-FL-CTR-OK
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
           END-EVALUATE.
       3200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * CONVERTE PIC 9(08) AAAAMMDD -> WS-DL-BUFFER YYYY-MM-DD        *
      *---------------------------------------------------------------*
       3250-FORMATA-DATA-ISO SECTION.
           MOVE WS-DN-AAAA        TO WS-DL-ANO
           MOVE '-'               TO WS-DL-SEP1
           MOVE WS-DN-MM          TO WS-DL-MES
           MOVE '-'               TO WS-DL-SEP2
           MOVE WS-DN-DD          TO WS-DL-DIA.
       3250-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * CALCULA DATA FIM = DT_INICIO + QTD_PARCELAS * 30 DIAS         *
      *---------------------------------------------------------------*
       3260-CALCULA-DATA-FIM SECTION.
           INITIALIZE SGDATAS
           MOVE 'ADD'                        TO SG-DT-FUNCAO
           MOVE CTRVL-DET-DATA-INICIO        TO SG-DT-ENTRADA-1
           COMPUTE SG-DT-QTD-DIAS = CTRVL-DET-QTD-PARCELAS * 30
           MOVE 'N'                          TO SG-DT-IND-UTEIS
           CALL 'SGCB0180' USING SGDATAS
      *
           IF SG-DT-RETURN-CODE >= 08
      *      Fallback simples: mesma data                             *
              MOVE CTRVL-DET-DATA-INICIO TO WS-DATA-NUM
           ELSE
              MOVE SG-DT-SAIDA TO WS-DATA-NUM
           END-IF
      *
           PERFORM 3250-FORMATA-DATA-ISO.
       3260-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * GERA PARCELAS - INSERT LOOP EM SG_PARCELA                     *
      *---------------------------------------------------------------*
       3300-GERAR-PARCELAS SECTION.
      *---- VALOR DA PARCELA (COM AJUSTE DE CENTAVOS NA ULTIMA) ---- *
           COMPUTE WS-VLR-PARCELA ROUNDED =
                   CTRVL-DET-VALOR-TOTAL / CTRVL-DET-QTD-PARCELAS
           COMPUTE WS-VLR-SOMA =
                   WS-VLR-PARCELA * CTRVL-DET-QTD-PARCELAS
           COMPUTE WS-VLR-DIF =
                   CTRVL-DET-VALOR-TOTAL - WS-VLR-SOMA
      *
      *---- MONTA CHAVE DE CONTRATO (COMUM A TODAS AS PARCELAS) -----*
           MOVE LENGTH OF CTRVL-DET-NR-CONTRATO
                                          TO SGPAR-ID-CTR-LEN
           MOVE CTRVL-DET-NR-CONTRATO     TO SGPAR-ID-CTR-TXT
           MOVE 'A'                       TO SGPAR-SITUACAO-REG
           MOVE 30                        TO SGPAR-USR-INC-LEN
           MOVE WS-USUARIO-30             TO SGPAR-USR-INC-TXT
      *
           MOVE 1                         TO WS-NR-PARC-ATUAL
      *
           PERFORM VARYING WS-IDX-PARC FROM 1 BY 1
                     UNTIL WS-IDX-PARC > CTRVL-DET-QTD-PARCELAS
                        OR WS-CTR-NOK
      *
              MOVE WS-IDX-PARC              TO SGPAR-NR-PARCELA
      *
      *----   DATA DE VENCIMENTO = DT_INICIO + (N * 30 dias)  ----- *
              INITIALIZE SGDATAS
              MOVE 'ADD'                    TO SG-DT-FUNCAO
              MOVE CTRVL-DET-DATA-INICIO    TO SG-DT-ENTRADA-1
              COMPUTE SG-DT-QTD-DIAS = WS-IDX-PARC * 30
              MOVE 'N'                      TO SG-DT-IND-UTEIS
              CALL 'SGCB0180' USING SGDATAS
              IF SG-DT-RETURN-CODE >= 08
                 MOVE CTRVL-DET-DATA-INICIO TO WS-DT-VCTO-N
              ELSE
                 MOVE SG-DT-SAIDA           TO WS-DT-VCTO-N
              END-IF
              MOVE WS-DT-VCTO-N             TO WS-DATA-NUM
              PERFORM 3250-FORMATA-DATA-ISO
              MOVE WS-DL-BUFFER             TO SGPAR-DT-VENCIMENTO
      *
      *----   VALOR DA PARCELA (AJUSTE NA ULTIMA)                  *
              IF WS-IDX-PARC = CTRVL-DET-QTD-PARCELAS
                 COMPUTE SGPAR-VR-PARCELA =
                         WS-VLR-PARCELA + WS-VLR-DIF
              ELSE
                 MOVE WS-VLR-PARCELA        TO SGPAR-VR-PARCELA
              END-IF
              MOVE SGPAR-VR-PARCELA         TO SGPAR-VR-SALDO
              MOVE 0                        TO SGPAR-VR-JUROS
              MOVE 0                        TO SGPAR-VR-MULTA
              MOVE 'AB'                     TO SGPAR-ST-PARCELA
              MOVE 0                        TO SGPAR-DIAS-ATRASO
      *
              MOVE 'INSERT' TO WS-OPERACAO
              MOVE 'SG_PARCELA' TO WS-TABELA-ERRO
              STRING CTRVL-DET-NR-CONTRATO DELIMITED BY SIZE
                     '/'                    DELIMITED BY SIZE
                     WS-IDX-PARC            DELIMITED BY SIZE
                INTO WS-CHAVE-ERRO
              END-STRING
      *
              EXEC SQL
                INSERT INTO SIGEC.SG_PARCELA
                       (ID_CONTRATO,
                        NR_PARCELA,
                        DT_VENCIMENTO,
                        VR_PARCELA,
                        VR_SALDO,
                        VR_JUROS,
                        VR_MULTA,
                        ST_PARCELA,
                        DIAS_ATRASO,
                        DH_INCLUSAO,
                        USUARIO_INCLUSAO,
                        SITUACAO_REG)
                VALUES (:SGPAR-ID-CONTRATO,
                        :SGPAR-NR-PARCELA,
                        DATE(:SGPAR-DT-VENCIMENTO),
                        :SGPAR-VR-PARCELA,
                        :SGPAR-VR-SALDO,
                        :SGPAR-VR-JUROS,
                        :SGPAR-VR-MULTA,
                        :SGPAR-ST-PARCELA,
                        :SGPAR-DIAS-ATRASO,
                        CURRENT TIMESTAMP,
                        :SGPAR-USUARIO-INCLUSAO,
                        :SGPAR-SITUACAO-REG)
              END-EXEC
      *
              EVALUATE TRUE
                 WHEN SQLCODE = 0
                    ADD 1 TO WS-QT-PARC-GER
                 WHEN SQLCODE = -803
                    ADD 1 TO WS-QT-DUPL-IGN
                 WHEN SQLCODE < 0
                    PERFORM 8000-GRAVAR-DB2RE
                    MOVE 'N' TO WS-FL-CTR-OK
                    IF WS-RC < SG-CT-RC-ERR-TEC
                       MOVE SG-CT-RC-ERR-TEC TO WS-RC
                    END-IF
              END-EVALUATE
      *
           END-PERFORM.
       3300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * GRAVA REGISTRO EM SGLCTRCG                                    *
      *---------------------------------------------------------------*
       3400-GRAVAR-SGLCTRCG SECTION.
           MOVE SPACES                       TO REG-SGLCTRCG-DET
           MOVE 'D'                          TO CTRCG-DET-TIPO
           MOVE SG-CLI-ID                    TO CTRCG-DET-ID-CLIENTE
      *---- ID CONTRATO GERADO (usamos hash simples de nr contrato) *
           COMPUTE WS-ID-CONTRATO-DB2 =
                   FUNCTION MOD(FUNCTION NUMVAL(WS-DATA-HOJE-N)
                                * 1000
                                + WS-QT-CARREGADOS
                                999999999999)
           MOVE WS-ID-CONTRATO-DB2           TO CTRCG-DET-ID-CONTRATO
           MOVE CTRVL-DET-NR-CONTRATO        TO CTRCG-DET-NR-CONTRATO
           MOVE CTRVL-DET-TIPO-DOC           TO CTRCG-DET-TIPO-DOC
           MOVE CTRVL-DET-DOCUMENTO          TO CTRCG-DET-DOCUMENTO
           MOVE CTRVL-DET-TIPO-CLIENTE       TO CTRCG-DET-TIPO-CLIENTE
           MOVE CTRVL-DET-TIPO-CONTRATO      TO CTRCG-DET-TIPO-CONTRATO
           MOVE CTRVL-DET-VALOR-TOTAL        TO CTRCG-DET-VALOR-TOTAL
           MOVE CTRVL-DET-QTD-PARCELAS       TO CTRCG-DET-QTD-PARCELAS
           MOVE CTRVL-DET-QTD-PARCELAS       TO CTRCG-DET-PARCELAS-GER
           MOVE CTRVL-DET-DATA-INICIO        TO CTRCG-DET-DATA-INICIO
           MOVE CTRVL-DET-DATA-INICIO        TO CTRCG-DET-DATA-FIM
           MOVE WS-DATA-HOJE-N               TO CTRCG-DET-DT-CARGA
           MOVE WS-HORA-HOJE-N               TO CTRCG-DET-HR-CARGA
           IF WS-CLI-NOVO
              MOVE 'S' TO CTRCG-DET-FL-CLI-CRIADO
           ELSE
              MOVE 'N' TO CTRCG-DET-FL-CLI-CRIADO
           END-IF
           MOVE WS-PROG                      TO CTRCG-DET-USUARIO
      *
           WRITE REG-SGLCTRCG FROM REG-SGLCTRCG-DET
           IF NOT WS-CTRCG-OK
              DISPLAY '12-IO-CTRCG WRITE ST=' WS-CTRCG-STATUS
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
           END-IF.
       3400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * COMMIT INTERMEDIARIO                                          *
      *---------------------------------------------------------------*
       4800-COMMIT-INTERMEDIARIO SECTION.
           EXEC SQL COMMIT END-EXEC
           IF SQLCODE = 0
              ADD 1 TO WS-QT-COMMITS
              MOVE ZERO TO WS-DESDE-COMMIT
              DISPLAY 'COMMIT INTERMEDIARIO EFETUADO NRO='
                      WS-QT-COMMITS
                      ' CARREGADOS=' WS-QT-CARREGADOS
           ELSE
              DISPLAY '12-DB2-COMMIT SQLCODE=' SQLCODE
              IF WS-RC < SG-CT-RC-ERR-TEC
                 MOVE SG-CT-RC-ERR-TEC TO WS-RC
              END-IF
           END-IF.
       4800-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4900-COMMIT-FINAL SECTION.
           EXEC SQL COMMIT END-EXEC
           IF SQLCODE = 0
              ADD 1 TO WS-QT-COMMITS
              DISPLAY 'COMMIT FINAL EFETUADO. TOTAL COMMITS='
                      WS-QT-COMMITS
           ELSE
              DISPLAY '12-DB2-COMMIT FINAL SQLCODE=' SQLCODE
              IF WS-RC < SG-CT-RC-ERR-TEC
                 MOVE SG-CT-RC-ERR-TEC TO WS-RC
              END-IF
           END-IF.
       4900-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * ROLLBACK DE UM CONTRATO COM ERRO (LIMITADO AO PROXIMO COMMIT) *
      *---------------------------------------------------------------*
       4700-ROLLBACK SECTION.
           EXEC SQL ROLLBACK END-EXEC
           MOVE ZERO TO WS-DESDE-COMMIT.
       4700-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * HEADER E TRAILER DE SGLCTRCG / SGLDB2RE                       *
      *---------------------------------------------------------------*
       5000-GRAVAR-CABEC-SAIDA SECTION.
      *---- HEADER SGLCTRCG (escrito no fim para conter contadores) *
           MOVE SPACES                  TO REG-SGLCTRCG-HDR
           MOVE 'H'                     TO CTRCG-HDR-TIPO
           MOVE WS-DATA-HOJE-N          TO CTRCG-HDR-DT-PROC
           MOVE WS-HORA-HOJE-N          TO CTRCG-HDR-HR-PROC
           MOVE 'SGCB0040'              TO CTRCG-HDR-PROG-ORIGEM
           MOVE WS-QT-CARREGADOS        TO CTRCG-HDR-QTD-CARREGADOS
           MOVE WS-QT-DUPL-IGN          TO CTRCG-HDR-QTD-DUPL-IGN
           WRITE REG-SGLCTRCG FROM REG-SGLCTRCG-HDR
      *
      *---- TRAILER SGLCTRCG                                        *
           MOVE SPACES                  TO REG-SGLCTRCG-TRL
           MOVE 'T'                     TO CTRCG-TRL-TIPO
           MOVE WS-QT-CARREGADOS        TO CTRCG-TRL-QTD-REGS
           MOVE WS-SOMA-VALORES         TO CTRCG-TRL-SOMA-VALORES
           MOVE WS-QT-PARC-GER          TO CTRCG-TRL-QTD-PAR-GER
           MOVE WS-DATA-HOJE-N          TO CTRCG-TRL-DT-PROC
           WRITE REG-SGLCTRCG FROM REG-SGLCTRCG-TRL
      *
      *---- HEADER SGLDB2RE                                         *
           MOVE SPACES                  TO REG-SGLDB2RE-HDR
           MOVE 'H'                     TO DB2RE-HDR-TIPO
           MOVE WS-DATA-HOJE-N          TO DB2RE-HDR-DT-PROC
           MOVE 'SGCB0040'              TO DB2RE-HDR-PROG-ORIGEM
           MOVE WS-QT-DB2RE             TO DB2RE-HDR-QTD-REJEICOES
           WRITE REG-SGLDB2RE FROM REG-SGLDB2RE-HDR
      *
      *---- TRAILER SGLDB2RE                                        *
           MOVE SPACES                  TO REG-SGLDB2RE-TRL
           MOVE 'T'                     TO DB2RE-TRL-TIPO
           MOVE WS-QT-DB2RE             TO DB2RE-TRL-QTD-REGS
           MOVE WS-QT-DB2RE             TO DB2RE-TRL-QTD-SQLCODE-NEG
           MOVE WS-DATA-HOJE-N          TO DB2RE-TRL-DT-PROC
           WRITE REG-SGLDB2RE FROM REG-SGLDB2RE-TRL.
       5000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * REGISTRA ENTRADA EM SG_HIST_PROCESSAMENTO                     *
      *---------------------------------------------------------------*
       5500-GRAVAR-HIST-PROCESSAMENTO SECTION.
           MOVE 30                          TO SGHPR-NM-JOB-LEN
           MOVE WS-JOB-NM                   TO SGHPR-NM-JOB-TXT
           MOVE 30                          TO SGHPR-NM-PGM-LEN
           MOVE WS-USUARIO-30               TO SGHPR-NM-PGM-TXT
           MOVE WS-PROG                     TO SGHPR-NM-PGM-TXT(1:8)
      *
           MOVE WS-DATA-NUM                 TO WS-DATA-NUM
           MOVE WS-DATA-HOJE-N              TO WS-DATA-NUM
           PERFORM 3250-FORMATA-DATA-ISO
           MOVE WS-DL-BUFFER                TO SGHPR-DT-REFERENCIA
      *
           IF WS-RC >= SG-CT-RC-ERR-FUNC
              MOVE 'ER' TO SGHPR-ST-EXECUCAO
           ELSE
              MOVE 'OK' TO SGHPR-ST-EXECUCAO
           END-IF
           MOVE WS-RC                       TO SGHPR-CD-RETORNO
           MOVE WS-QT-LIDOS                 TO SGHPR-QT-REG-LIDOS
           MOVE WS-QT-CARREGADOS            TO SGHPR-QT-REG-GRAVADOS
           MOVE WS-QT-REJEITADOS            TO SGHPR-QT-REG-REJEITADOS
           MOVE WS-QT-COMMITS               TO SGHPR-QT-COMMITS
      *
           MOVE 30                          TO SGHPR-USR-INC-LEN
           MOVE WS-USUARIO-30               TO SGHPR-USR-INC-TXT
           MOVE 'A'                         TO SGHPR-SITUACAO-REG
      *
           STRING 'SGCB0040 CARGA CTR RC='   DELIMITED BY SIZE
                  WS-RC                      DELIMITED BY SIZE
                  ' LIDOS='                  DELIMITED BY SIZE
                  WS-QT-LIDOS                DELIMITED BY SIZE
                  ' GRAV='                   DELIMITED BY SIZE
                  WS-QT-CARREGADOS           DELIMITED BY SIZE
             INTO SGHPR-DS-MSG-TXT
           END-STRING
           MOVE 240                         TO SGHPR-DS-MSG-LEN
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_HIST_PROCESSAMENTO
                    (ID_PROCESSAMENTO,
                     NM_JOB,
                     NM_PROGRAMA,
                     DT_REFERENCIA,
                     DH_INICIO,
                     DH_FIM,
                     ST_EXECUCAO,
                     CD_RETORNO,
                     QT_REG_LIDOS,
                     QT_REG_GRAVADOS,
                     QT_REG_REJEITADOS,
                     QT_COMMITS,
                     DS_MENSAGEM,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (NEXT VALUE FOR SIGEC.SEQ_SG_HIST_PROC,
                     :SGHPR-NM-JOB,
                     :SGHPR-NM-PROGRAMA,
                     DATE(:SGHPR-DT-REFERENCIA),
                     CURRENT TIMESTAMP,
                     CURRENT TIMESTAMP,
                     :SGHPR-ST-EXECUCAO,
                     :SGHPR-CD-RETORNO,
                     :SGHPR-QT-REG-LIDOS,
                     :SGHPR-QT-REG-GRAVADOS,
                     :SGHPR-QT-REG-REJEITADOS,
                     :SGHPR-QT-COMMITS,
                     :SGHPR-DS-MENSAGEM,
                     CURRENT TIMESTAMP,
                     :SGHPR-USUARIO-INCLUSAO,
                     :SGHPR-SITUACAO-REG)
           END-EXEC
      *
           IF SQLCODE = 0
              EXEC SQL COMMIT END-EXEC
           ELSE
              DISPLAY '04-HIST-PROC INSERT SQLCODE=' SQLCODE
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
           END-IF.
       5500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * FECHA ARQUIVOS                                                *
      *---------------------------------------------------------------*
       6000-FECHAR-ARQUIVOS SECTION.
           CLOSE SGLCTRVL-FILE
           CLOSE SGLCTRCG-FILE
           CLOSE SGLDB2RE-FILE.
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * GRAVA REJEICAO DB2 EM SGLDB2RE                                *
      *---------------------------------------------------------------*
       8000-GRAVAR-DB2RE SECTION.
           ADD 1 TO WS-QT-DB2RE
           ADD 1 TO WS-SEQ-DB2RE
      *
           MOVE SPACES                       TO REG-SGLDB2RE-DET
           MOVE 'D'                          TO DB2RE-DET-TIPO
           MOVE WS-SEQ-DB2RE                 TO DB2RE-DET-SEQ
           MOVE WS-DATA-HOJE-N               TO DB2RE-DET-DT-OCORR
           MOVE WS-HORA-HOJE-N               TO DB2RE-DET-HR-OCORR
           MOVE WS-PROG                      TO DB2RE-DET-PROG-ORIGEM
           MOVE WS-OPERACAO                  TO DB2RE-DET-OPERACAO
           MOVE WS-TABELA-ERRO               TO DB2RE-DET-TABELA
           MOVE WS-CHAVE-ERRO                TO DB2RE-DET-CHAVE
           MOVE SQLCODE                      TO DB2RE-DET-SQLCODE
           MOVE SQLSTATE                     TO DB2RE-DET-SQLSTATE
           MOVE SQLERRMC                     TO DB2RE-DET-SQLERRMC
           MOVE WS-ID-EXEC                   TO DB2RE-DET-ID-EXECUCAO
      *
           WRITE REG-SGLDB2RE FROM REG-SGLDB2RE-DET
           IF NOT WS-DB2RE-OK
              DISPLAY '12-IO-DB2RE WRITE ST=' WS-DB2RE-STATUS
           END-IF
      *
           MOVE SQLCODE TO WS-SQLCODE-DISP
           DISPLAY '12-DB2-SQLCODE=' WS-SQLCODE-DISP
                   ' TAB=' WS-TABELA-ERRO
                   ' OP=' WS-OPERACAO
                   ' CHV=' WS-CHAVE-ERRO(1:20).
       8000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
           IF WS-QT-DUPL-IGN > 0 AND WS-RC < SG-CT-RC-WARN
              MOVE SG-CT-RC-WARN TO WS-RC
           END-IF
      *
           DISPLAY '---------------------------------------'
           DISPLAY 'SGCB0040 SUMARIO'
           DISPLAY '  LIDOS         = ' WS-QT-LIDOS
           DISPLAY '  CARREGADOS    = ' WS-QT-CARREGADOS
           DISPLAY '  REJEITADOS    = ' WS-QT-REJEITADOS
           DISPLAY '  DUPL-IGN      = ' WS-QT-DUPL-IGN
           DISPLAY '  CLI CRIADOS   = ' WS-QT-CLI-CRIADOS
           DISPLAY '  PARCELAS GER  = ' WS-QT-PARC-GER
           DISPLAY '  COMMITS       = ' WS-QT-COMMITS
           DISPLAY '  DB2 REJEIT    = ' WS-QT-DB2RE
           DISPLAY '  RC FINAL      = ' WS-RC
           DISPLAY '---------------------------------------'
      *
           MOVE WS-RC TO RETURN-CODE.
       9000-FIM. EXIT.
