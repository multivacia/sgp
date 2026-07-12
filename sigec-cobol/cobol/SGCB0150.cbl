       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0150.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0150                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: MANUTENCAO DA FILA VSAM DE COBRANCA SGVCOBRA A    *
      *             PARTIR DO ARQUIVO DIARIO DE INADIMPLENTES SGLINADI*
      *                                                               *
      * ARQUIVOS .:                                                   *
      *   ENTRADA  - SGLINADI (DD INADI)   FB LRECL 240   SEQUENCIAL  *
      *   E/S      - SGVCOBRA (DD COBRA)   VSAM KSDS      LRECL 250   *
      *              CHAVE COMPOSTA: CLIENTE(10)+CONTRATO(12)+PAD(1)  *
      *   SAIDA    - SGLAUDVS (DD AUDVS)   FB LRECL 300   SEQUENCIAL  *
      *              (em producao e VSAM KSDS mas aqui gravamos       *
      *              sequencialmente para consumo posterior por       *
      *              utilitario IDCAMS que faz o LOAD para o KSDS)    *
      *                                                               *
      * ACOES POR REGISTRO DE INADIMPLENTE:                           *
      *   - INADI-DET-DIAS-ATRASO = 0 ...........: DELETE do VSAM     *
      *     (contrato regularizado - saiu da fila de cobranca)        *
      *   - JA EXISTE NO VSAM (FS 00 na READ) ...: REWRITE (update)   *
      *   - NAO EXISTE (FS 23 na READ) ..........: WRITE (insert)     *
      *   - DUPLICATA NA INSERCAO (FS 22) .......: log e vira UPDATE  *
      *   - NAO ENCONTRADO NA EXCLUSAO (FS 23) ..: log e ignora       *
      *                                                               *
      * PARA CADA ACAO GERA UMA LINHA DE AUDITORIA EM SGLAUDVS COM    *
      * CHAVE COMPOSTA DE 36 BYTES DEFINIDA EM SGLAUDVS.cpy.          *
      *                                                               *
      * -------------------------------------------------------------- *
      * PONTO FORA DE COBERTURA (LEGADO):                             *
      *                                                               *
      * Em producao o modulo tambem chama a rotina ASM SGXASM01 (que  *
      * grava uma copia offline em fita SGXTAPE via macro EXCP). Essa *
      * rotina nao existe neste laboratorio - a chamada esta contida  *
      * no paragrafo 8500 que so e alcancado se o parametro           *
      * SG-PX-JANELA-EXTRA estiver ativo e o registro de inadimplente *
      * for de FAIXA CRITICA. O caminho normal nunca aciona esse trecho*
      * e o compilador aceita a CALL como referencia externa nao      *
      * resolvida em tempo de link (LNKERR TOLERADO conforme          *
      * documentacao interna do time SIGEC-INFRA).                    *
      *                                                               *
      * Alem disso ha uma referencia ao arquivo SGXTAPE em comentario *
      * no proprio FILE-CONTROL, apenas como memoria para o time de   *
      * infra: o DD SGXTAPE NAO esta declarado no JCL principal e nao *
      * deve ser adicionado sem revisao arquitetural.                 *
      * -------------------------------------------------------------- *
      *                                                               *
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (duplicatas / regularizados sem entrada)         *
      *   08 - ERRO FUNCIONAL (chave invalida)                        *
      *   12 - ERRO TECNICO (I/O VSAM ou sequencial)                  *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SGLINADI-FILE
                  ASSIGN TO INADI
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-INADI-STATUS.
      *
           SELECT SGVCOBRA-FILE
                  ASSIGN TO COBRA
                  ORGANIZATION IS INDEXED
                  ACCESS MODE  IS DYNAMIC
                  RECORD KEY   IS SGVC-CHAVE
                  FILE STATUS  IS WS-COBRA-STATUS.
      *
           SELECT SGLAUDVS-FILE
                  ASSIGN TO AUDVS
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-AUDVS-STATUS.
      *
      *---------------------------------------------------------------*
      * REFERENCIA DOCUMENTAL AO ARQUIVO EXTERNO SGXTAPE (PONTO       *
      * FORA DE COBERTURA). O DD NAO ESTA NO JCL PRINCIPAL E O SELECT *
      * ABAIXO PERMANECE COMENTADO. NAO DESCOMENTAR SEM APROVACAO DE  *
      * ARQUITETURA - VER TICKET SIGEC-INFRA-2018-0731.               *
      *---------------------------------------------------------------*
      *    SELECT SGXTAPE-FILE                                        *
      *           ASSIGN TO SGXTAPE                                   *
      *           ORGANIZATION IS SEQUENTIAL                          *
      *           ACCESS MODE  IS SEQUENTIAL                          *
      *           FILE STATUS  IS WS-XTAPE-STATUS.                    *
      *
       DATA DIVISION.
       FILE SECTION.
      *---------------------------------------------------------------*
       FD  SGLINADI-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLINADI.
      *
       FD  SGVCOBRA-FILE
           RECORD CONTAINS 250 CHARACTERS.
           COPY SGLVSAM.
      *
       FD  SGLAUDVS-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLAUDVS.
      *
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * STATUS DE ARQUIVOS                                            *
      *---------------------------------------------------------------*
       01  WS-STATUS.
           05  WS-INADI-STATUS       PIC X(02) VALUE '00'.
               88  WS-INADI-OK               VALUE '00'.
               88  WS-INADI-EOF              VALUE '10'.
           05  WS-COBRA-STATUS       PIC X(02) VALUE '00'.
               88  WS-COBRA-OK               VALUE '00'.
               88  WS-COBRA-EOF              VALUE '10'.
               88  WS-COBRA-DUPKEY           VALUE '22'.
               88  WS-COBRA-NOTFOUND         VALUE '23'.
               88  WS-COBRA-INDISP           VALUES '35' '37' '39' '93'.
           05  WS-AUDVS-STATUS       PIC X(02) VALUE '00'.
               88  WS-AUDVS-OK               VALUE '00'.
      *
      *---------------------------------------------------------------*
      * FLAGS                                                         *
      *---------------------------------------------------------------*
       01  WS-FLAGS.
           05  WS-FL-EOF             PIC X(01) VALUE 'N'.
               88  WS-EOF-INADI              VALUE 'S'.
           05  WS-FL-HDR-INADI       PIC X(01) VALUE 'N'.
           05  WS-FL-JANELA-EXTRA    PIC X(01) VALUE 'N'.
               88  WS-JANELA-EXTRA           VALUE 'S'.
           05  WS-FL-ACHOU           PIC X(01) VALUE 'N'.
               88  WS-VSAM-ACHOU             VALUE 'S'.
      *
      *---------------------------------------------------------------*
      * CONTADORES                                                    *
      *---------------------------------------------------------------*
       01  WS-CONTA.
           05  WS-QT-LIDOS           PIC 9(09) VALUE ZERO.
           05  WS-QT-INSERIDOS       PIC 9(09) VALUE ZERO.
           05  WS-QT-ATUALIZADOS     PIC 9(09) VALUE ZERO.
           05  WS-QT-EXCLUIDOS       PIC 9(09) VALUE ZERO.
           05  WS-QT-DUP             PIC 9(09) VALUE ZERO.
           05  WS-QT-NOT-FOUND       PIC 9(09) VALUE ZERO.
           05  WS-QT-AUDIT           PIC 9(09) VALUE ZERO.
           05  WS-SEQ-AUDIT          PIC 9(06) VALUE ZERO.
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
      * IDENTIFICACAO                                                 *
      *---------------------------------------------------------------*
       01  WS-EXEC.
           05  WS-PROG               PIC X(08) VALUE 'SGCB0150'.
           05  WS-USUARIO            PIC X(08) VALUE 'BATCHSGE'.
           05  WS-ID-EXEC            PIC X(12) VALUE 'SGCB0150-001'.
      *
      *---------------------------------------------------------------*
      * VARIAVEIS AUXILIARES                                          *
      *---------------------------------------------------------------*
       01  WS-AUX.
           05  WS-TIPO-EVENTO        PIC X(20) VALUE SPACES.
           05  WS-VLR-ANT            PIC X(30) VALUE SPACES.
           05  WS-VLR-NOVO           PIC X(30) VALUE SPACES.
           05  WS-CAMPO-ALT          PIC X(30) VALUE SPACES.
           05  WS-JUSTIFICATIVA      PIC X(80) VALUE SPACES.
           05  WS-CD-REGRA           PIC X(10) VALUE 'SGCB0150' .
           05  WS-VLR-EDIT-ANT       PIC S9(13)V99 COMP-3 VALUE 0.
           05  WS-VLR-EDIT-NEW       PIC S9(13)V99 COMP-3 VALUE 0.
      *
      *---------------------------------------------------------------*
      * COPYBOOKS DE APOIO                                            *
      *---------------------------------------------------------------*
           COPY SGRETCOD.
           COPY SGERRMSG.
      * AREA LEGADA DE FITA OFFLINE - COPYBOOK EXTERNO NAO VERSIONADO *
      * NESTE REPOSITORIO (DEPENDENCIA DE BIBLIOTECA CORPORATIVA).    *
           COPY SGXTAPE.
      *
       PROCEDURE DIVISION.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-ABRIR-ARQUIVOS
      *
           IF SG-RC-ABORTA-JANELA
              PERFORM 6000-FECHAR-ARQUIVOS
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 2100-LER-HEADER-INADI
      *
           PERFORM 3000-PROCESSAR-DETAIL
              UNTIL WS-EOF-INADI
                 OR SG-RC-ABORTA-JANELA
      *
           PERFORM 6000-FECHAR-ARQUIVOS
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE SG-CT-RC-OK          TO WS-RC
           MOVE 'N'                  TO WS-FL-EOF
                                        WS-FL-HDR-INADI
                                        WS-FL-JANELA-EXTRA
                                        WS-FL-ACHOU
           MOVE ZERO                 TO WS-QT-LIDOS
                                        WS-QT-INSERIDOS
                                        WS-QT-ATUALIZADOS
                                        WS-QT-EXCLUIDOS
                                        WS-QT-DUP
                                        WS-QT-NOT-FOUND
                                        WS-QT-AUDIT
                                        WS-SEQ-AUDIT
      *
           MOVE FUNCTION CURRENT-DATE TO WS-CURR-DATE
           MOVE WS-CURR-DATE(1:8)     TO WS-DATA-HOJE-N
           MOVE WS-CURR-DATE(9:6)     TO WS-HORA-HOJE-N
      *
           DISPLAY '======================================='
           DISPLAY 'SGCB0150 - MANUT VSAM COBRANCA SGVCOBRA'
           DISPLAY '  DT-PROC = ' WS-DATA-HOJE-N
                   '  HR-PROC = ' WS-HORA-HOJE-N
           DISPLAY '======================================='.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-ARQUIVOS SECTION.
           OPEN INPUT SGLINADI-FILE
           IF NOT WS-INADI-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-INADI OPEN INPUT ST=' WS-INADI-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN I-O SGVCOBRA-FILE
           IF WS-COBRA-INDISP
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-VSAM COBRA INDISP ST=' WS-COBRA-STATUS
              GO TO 2000-FIM
           END-IF
           IF NOT WS-COBRA-OK
              MOVE SG-CT-RC-ERR-TEC TO WS-RC
              DISPLAY '12-IO-VSAM COBRA OPEN I-O ST=' WS-COBRA-STATUS
              GO TO 2000-FIM
           END-IF
      *
           OPEN EXTEND SGLAUDVS-FILE
           IF NOT WS-AUDVS-OK
              OPEN OUTPUT SGLAUDVS-FILE
              IF NOT WS-AUDVS-OK
                 MOVE SG-CT-RC-ERR-TEC TO WS-RC
                 DISPLAY '12-IO-AUDVS OPEN ST=' WS-AUDVS-STATUS
                 GO TO 2000-FIM
              END-IF
           END-IF.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2100-LER-HEADER-INADI SECTION.
           READ SGLINADI-FILE
              AT END
                 MOVE 'S' TO WS-FL-EOF
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
                 DISPLAY '04-INADI-VAZIO ARQUIVO SEM REGISTROS'
              NOT AT END
                 IF INADI-E-HEADER
                    MOVE 'S' TO WS-FL-HDR-INADI
                    DISPLAY 'INADI HEADER DT-REF='
                            INADI-HDR-DT-REF
                            ' ORIGEM='
                            INADI-HDR-PROG-ORIGEM
                            ' QTD-CTR='
                            INADI-HDR-QTD-CTR
                 ELSE
                    DISPLAY '04-INADI-SEM-HEADER TIPO='
                            INADI-TIPO-REG
                    IF WS-RC < SG-CT-RC-WARN
                       MOVE SG-CT-RC-WARN TO WS-RC
                    END-IF
                 END-IF
           END-READ.
       2100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * LOOP PRINCIPAL - UM DETAIL POR ITERACAO                       *
      *---------------------------------------------------------------*
       3000-PROCESSAR-DETAIL SECTION.
           READ SGLINADI-FILE
              AT END
                 MOVE 'S' TO WS-FL-EOF
                 GO TO 3000-FIM
              NOT AT END
                 CONTINUE
           END-READ
      *
           EVALUATE TRUE
              WHEN INADI-E-DETAIL
                 ADD 1 TO WS-QT-LIDOS
                 PERFORM 3100-MONTAR-CHAVE-VSAM
                 PERFORM 3200-DECIDIR-ACAO-VSAM
              WHEN INADI-E-TRAILER
                 MOVE 'S' TO WS-FL-EOF
                 DISPLAY 'INADI TRAILER QTD='
                         INADI-TRL-QTD-REGS
                         ' SOMA-SALDO='
                         INADI-TRL-SOMA-SALDO
              WHEN INADI-E-HEADER
                 CONTINUE
              WHEN OTHER
                 DISPLAY '04-INADI-TIPO-INVAL TIPO=' INADI-TIPO-REG
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
           END-EVALUATE.
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * MONTA CHAVE VSAM A PARTIR DO DETAIL DE INADI                  *
      *---------------------------------------------------------------*
       3100-MONTAR-CHAVE-VSAM SECTION.
           MOVE SPACES                    TO REG-SGVCOBRA
           MOVE INADI-DET-ID-CLIENTE      TO SGVC-ID-CLIENTE
           MOVE INADI-DET-ID-CONTRATO     TO SGVC-ID-CONTRATO
           MOVE ' '                       TO SGVC-PAD.
       3100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * DECIDE ENTRE INSERT / UPDATE / DELETE                         *
      *---------------------------------------------------------------*
       3200-DECIDIR-ACAO-VSAM SECTION.
      *---- 1. Faz READ para saber se existe -----------------------*
           MOVE 'N' TO WS-FL-ACHOU
           READ SGVCOBRA-FILE
              INVALID KEY
                 IF WS-COBRA-NOTFOUND
                    MOVE 'N' TO WS-FL-ACHOU
                 ELSE
                    DISPLAY '12-VSAM READ ST=' WS-COBRA-STATUS
                    IF WS-RC < SG-CT-RC-ERR-TEC
                       MOVE SG-CT-RC-ERR-TEC TO WS-RC
                    END-IF
                    GO TO 3200-FIM
                 END-IF
              NOT INVALID KEY
                 MOVE 'S' TO WS-FL-ACHOU
           END-READ
      *
      *---- 2. Regularizado -> DELETE (se existir no VSAM) ----------*
           IF INADI-DET-DIAS-ATRASO = 0
              IF WS-VSAM-ACHOU
                 PERFORM 3300-EXCLUIR-VSAM
              ELSE
                 ADD 1 TO WS-QT-NOT-FOUND
                 DISPLAY '04-VSAM-NOT-FOUND CTR='
                         INADI-DET-ID-CONTRATO
                         ' REGULARIZADO SEM ENTRADA PREVIA'
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
              END-IF
              GO TO 3200-FIM
           END-IF
      *
      *---- 3. Nao regularizado --------------------------------------*
           IF WS-VSAM-ACHOU
              PERFORM 3500-ATUALIZAR-VSAM
           ELSE
              PERFORM 3400-INSERIR-VSAM
           END-IF
      *
      *---- 4. Trecho legado - so alcancado com janela extra e critico
           IF WS-JANELA-EXTRA
              AND INADI-DET-FAIXA = 'CRITICA '
              PERFORM 8500-INTEGRACAO-LEGADO-TAPE
           END-IF.
       3200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * DELETE VSAM                                                   *
      *---------------------------------------------------------------*
       3300-EXCLUIR-VSAM SECTION.
           DELETE SGVCOBRA-FILE RECORD
           EVALUATE TRUE
              WHEN WS-COBRA-OK
                 ADD 1 TO WS-QT-EXCLUIDOS
                 MOVE 'CONTRATO-REGULARIZ '  TO WS-TIPO-EVENTO
                 MOVE 'DIAS_ATRASO'          TO WS-CAMPO-ALT
                 MOVE 'DELETE VSAM SGVCOBRA - CTR REGULARIZADO'
                                             TO WS-JUSTIFICATIVA
                 PERFORM 7000-GRAVAR-AUDITORIA
              WHEN WS-COBRA-NOTFOUND
                 ADD 1 TO WS-QT-NOT-FOUND
                 DISPLAY '04-VSAM-DEL-NOT-FOUND CTR='
                         INADI-DET-ID-CONTRATO
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
              WHEN OTHER
                 DISPLAY '12-VSAM DELETE ST=' WS-COBRA-STATUS
                 IF WS-RC < SG-CT-RC-ERR-TEC
                    MOVE SG-CT-RC-ERR-TEC TO WS-RC
                 END-IF
           END-EVALUATE.
       3300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * INSERT VSAM (WRITE)                                           *
      *---------------------------------------------------------------*
       3400-INSERIR-VSAM SECTION.
           PERFORM 3450-MONTAR-CORPO-NOVO
      *
           WRITE REG-SGVCOBRA
           EVALUATE TRUE
              WHEN WS-COBRA-OK
                 ADD 1 TO WS-QT-INSERIDOS
                 MOVE 'INAD-DETECTADA      ' TO WS-TIPO-EVENTO
                 MOVE 'STATUS'               TO WS-CAMPO-ALT
                 MOVE 'INSERT VSAM SGVCOBRA - NA FILA DE COBRANCA'
                                             TO WS-JUSTIFICATIVA
                 PERFORM 7000-GRAVAR-AUDITORIA
              WHEN WS-COBRA-DUPKEY
      *          Corrida: alguem inseriu entre READ e WRITE.
      *          Recorremos ao caminho de UPDATE.
                 ADD 1 TO WS-QT-DUP
                 DISPLAY '04-VSAM-DUP CTR='
                         INADI-DET-ID-CONTRATO
                         ' CONVERTIDO EM UPDATE'
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
      *          READ novamente para poder emitir REWRITE
                 READ SGVCOBRA-FILE
                    INVALID KEY
                       DISPLAY '12-VSAM READ POS-DUP ST='
                               WS-COBRA-STATUS
                    NOT INVALID KEY
                       PERFORM 3500-ATUALIZAR-VSAM
                 END-READ
              WHEN OTHER
                 DISPLAY '12-VSAM WRITE ST=' WS-COBRA-STATUS
                 IF WS-RC < SG-CT-RC-ERR-TEC
                    MOVE SG-CT-RC-ERR-TEC TO WS-RC
                 END-IF
           END-EVALUATE.
       3400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * UPDATE VSAM (REWRITE)                                         *
      *---------------------------------------------------------------*
       3500-ATUALIZAR-VSAM SECTION.
           MOVE SGVC-VLR-SALDO             TO WS-VLR-EDIT-ANT
           PERFORM 3550-ATUALIZAR-CORPO-EXIST
      *
           REWRITE REG-SGVCOBRA
           EVALUATE TRUE
              WHEN WS-COBRA-OK
                 ADD 1 TO WS-QT-ATUALIZADOS
                 MOVE 'RISCO-ALTERADO      ' TO WS-TIPO-EVENTO
                 MOVE 'VLR-SALDO'            TO WS-CAMPO-ALT
                 MOVE 'REWRITE VSAM SGVCOBRA - ATUALIZACAO DIARIA'
                                             TO WS-JUSTIFICATIVA
                 MOVE SGVC-VLR-SALDO         TO WS-VLR-EDIT-NEW
                 PERFORM 7000-GRAVAR-AUDITORIA
              WHEN WS-COBRA-NOTFOUND
                 ADD 1 TO WS-QT-NOT-FOUND
                 DISPLAY '04-VSAM-UPD-NOT-FOUND CTR='
                         INADI-DET-ID-CONTRATO
                 IF WS-RC < SG-CT-RC-WARN
                    MOVE SG-CT-RC-WARN TO WS-RC
                 END-IF
              WHEN OTHER
                 DISPLAY '12-VSAM REWRITE ST=' WS-COBRA-STATUS
                 IF WS-RC < SG-CT-RC-ERR-TEC
                    MOVE SG-CT-RC-ERR-TEC TO WS-RC
                 END-IF
           END-EVALUATE.
       3500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * MONTA CORPO PARA INSERT (registro novo)                       *
      *---------------------------------------------------------------*
       3450-MONTAR-CORPO-NOVO SECTION.
           MOVE INADI-DET-NR-CONTRATO      TO SGVC-NR-CONTRATO
           MOVE 'CPF'                      TO SGVC-TIPO-DOC
           MOVE INADI-DET-DOCUMENTO        TO SGVC-DOCUMENTO
           MOVE INADI-DET-NOME             TO SGVC-NOME
           MOVE WS-DATA-HOJE-N             TO SGVC-DT-INCLUSAO
           MOVE WS-DATA-HOJE-N             TO SGVC-DT-ULT-ACAO
           MOVE WS-DATA-HOJE-N             TO SGVC-DT-PROX-ACAO
           MOVE INADI-DET-DIAS-ATRASO      TO SGVC-DIAS-EM-COBR
           MOVE INADI-DET-FAIXA            TO SGVC-FAIXA-INAD
           MOVE INADI-DET-RISCO-ATUAL      TO SGVC-CLASSE-RISCO
      *
           EVALUATE INADI-DET-FAIXA
              WHEN 'LEVE    ' MOVE 05 TO SGVC-PRIORIDADE
              WHEN 'MODERADA' MOVE 10 TO SGVC-PRIORIDADE
              WHEN 'GRAVE   ' MOVE 20 TO SGVC-PRIORIDADE
              WHEN 'CRITICA ' MOVE 30 TO SGVC-PRIORIDADE
              WHEN OTHER      MOVE 01 TO SGVC-PRIORIDADE
           END-EVALUATE
      *
           MOVE 'NA-FILA   '               TO SGVC-STATUS
           MOVE INADI-DET-VLR-SALDO        TO SGVC-VLR-SALDO
           MOVE 0                          TO SGVC-VLR-JUROS-ACUM
           MOVE 0                          TO SGVC-VLR-MULTA-ACUM
           MOVE INADI-DET-VLR-ATUALIZADO   TO SGVC-VLR-DIVIDA-TOT
           MOVE 0                          TO SGVC-VLR-PROMESSA
           MOVE 0                          TO SGVC-QT-CONTATOS
           MOVE 0                          TO SGVC-QT-PROMESSAS
           MOVE 0                          TO SGVC-QT-QUEBRAS
           MOVE INADI-DET-CANAL-ULT-PAG    TO SGVC-CANAL-ULT-CONT
           MOVE 'SGCB0150'                 TO SGVC-CD-OPERADOR
           MOVE WS-USUARIO                 TO SGVC-USUARIO-INCL
           MOVE WS-USUARIO                 TO SGVC-USUARIO-ALT
           MOVE WS-CURR-DATE(1:21)         TO SGVC-TS-ATUALIZACAO(1:21).
       3450-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * ATUALIZA CORPO PARA UPDATE (mantem campos historicos)         *
      *---------------------------------------------------------------*
       3550-ATUALIZAR-CORPO-EXIST SECTION.
           MOVE WS-DATA-HOJE-N             TO SGVC-DT-ULT-ACAO
           MOVE INADI-DET-DIAS-ATRASO      TO SGVC-DIAS-EM-COBR
           MOVE INADI-DET-FAIXA            TO SGVC-FAIXA-INAD
           MOVE INADI-DET-RISCO-ATUAL      TO SGVC-CLASSE-RISCO
           MOVE INADI-DET-VLR-SALDO        TO SGVC-VLR-SALDO
           MOVE INADI-DET-VLR-ATUALIZADO   TO SGVC-VLR-DIVIDA-TOT
      *
           EVALUATE INADI-DET-FAIXA
              WHEN 'LEVE    ' MOVE 05 TO SGVC-PRIORIDADE
              WHEN 'MODERADA' MOVE 10 TO SGVC-PRIORIDADE
              WHEN 'GRAVE   ' MOVE 20 TO SGVC-PRIORIDADE
              WHEN 'CRITICA ' MOVE 30 TO SGVC-PRIORIDADE
              WHEN OTHER      MOVE 01 TO SGVC-PRIORIDADE
           END-EVALUATE
      *
           MOVE WS-USUARIO                 TO SGVC-USUARIO-ALT
           MOVE WS-CURR-DATE(1:21)         TO SGVC-TS-ATUALIZACAO(1:21).
       3550-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * ESCREVE LINHA DE AUDITORIA EM SGLAUDVS                        *
      *---------------------------------------------------------------*
       7000-GRAVAR-AUDITORIA SECTION.
           ADD 1                            TO WS-SEQ-AUDIT
           ADD 1                            TO WS-QT-AUDIT
      *
           MOVE SPACES                      TO REG-SGLAUDVS
      *---- Chave composta -----------------------------------------*
           MOVE WS-DATA-HOJE-N              TO AUDVS-CH-DT-REF
           MOVE INADI-DET-ID-CONTRATO       TO AUDVS-CH-ID-CONTRATO
           MOVE WS-SEQ-AUDIT                TO AUDVS-CH-SEQ
           MOVE WS-PROG                     TO AUDVS-CH-PROG-ORIGEM
           MOVE '  '                        TO AUDVS-CH-PAD
      *
      *---- Corpo --------------------------------------------------*
           MOVE WS-DATA-HOJE-N              TO AUDVS-DT-EVENTO
           MOVE WS-HORA-HOJE-N              TO AUDVS-HR-EVENTO
           MOVE WS-USUARIO                  TO AUDVS-USUARIO
           MOVE WS-ID-EXEC                  TO AUDVS-ID-EXECUCAO
           MOVE WS-TIPO-EVENTO              TO AUDVS-TIPO-EVENTO
      *
           MOVE WS-VLR-ANT                  TO AUDVS-VALOR-ANTERIOR
           MOVE WS-VLR-NOVO                 TO AUDVS-VALOR-NOVO
           MOVE WS-CAMPO-ALT                TO AUDVS-CAMPO-ALTERADO
           MOVE WS-JUSTIFICATIVA            TO AUDVS-JUSTIFICATIVA
           MOVE WS-CD-REGRA                 TO AUDVS-CD-REGRA
           MOVE INADI-DET-VLR-SALDO         TO AUDVS-VLR-BASE
           MOVE 'S'                         TO AUDVS-IND-REVERSIVEL
      *
           WRITE REG-SGLAUDVS
           IF NOT WS-AUDVS-OK
              DISPLAY '12-IO-AUDVS WRITE ST=' WS-AUDVS-STATUS
              IF WS-RC < SG-CT-RC-ERR-TEC
                 MOVE SG-CT-RC-ERR-TEC TO WS-RC
              END-IF
           END-IF.
       7000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * INTEGRACAO LEGADO COM ROTINA ASSEMBLER SGXASM01               *
      * (ponto fora de cobertura - so alcancado quando janela extra   *
      *  esta ativa e faixa CRITICA - condicao raramente satisfeita   *
      *  no laboratorio; ver ticket SIGEC-INFRA-2018-0731).           *
      *---------------------------------------------------------------*
       8500-INTEGRACAO-LEGADO-TAPE SECTION.
           DISPLAY '04-LEGADO-TAPE INVOCANDO SGXASM01 CTR='
                   INADI-DET-ID-CONTRATO
      *
      *    A rotina SGXASM01 nao esta linkeditada no load module do
      *    laboratorio. Em producao ela grava a copia offline em fita
      *    SGXTAPE via macro EXCP.
           CALL 'SGXASM01' USING REG-SGVCOBRA
           IF RETURN-CODE NOT = 0
              DISPLAY '04-LEGADO-TAPE SGXASM01 RC=' RETURN-CODE
              IF WS-RC < SG-CT-RC-WARN
                 MOVE SG-CT-RC-WARN TO WS-RC
              END-IF
           END-IF.
       8500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       6000-FECHAR-ARQUIVOS SECTION.
           CLOSE SGLINADI-FILE
           CLOSE SGVCOBRA-FILE
           CLOSE SGLAUDVS-FILE.
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
           DISPLAY '---------------------------------------'
           DISPLAY 'SGCB0150 SUMARIO'
           DISPLAY '  LIDOS         = ' WS-QT-LIDOS
           DISPLAY '  INSERIDOS     = ' WS-QT-INSERIDOS
           DISPLAY '  ATUALIZADOS   = ' WS-QT-ATUALIZADOS
           DISPLAY '  EXCLUIDOS     = ' WS-QT-EXCLUIDOS
           DISPLAY '  DUP-KEY (22)  = ' WS-QT-DUP
           DISPLAY '  NOT-FOUND (23)= ' WS-QT-NOT-FOUND
           DISPLAY '  AUDITORIAS    = ' WS-QT-AUDIT
           DISPLAY '  RC FINAL      = ' WS-RC
           DISPLAY '---------------------------------------'
      *
           MOVE WS-RC TO RETURN-CODE.
       9000-FIM. EXIT.
