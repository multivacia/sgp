       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0120.
       AUTHOR.        LAB-SIGEC.
      *****************************************************************
      * PROGRAMA .: SGCB0120                                          *
      * FUNCAO   .: RECALCULO E ATUALIZACAO DO SALDO DE UM CONTRATO   *
      *             A PARTIR DAS PARCELAS EM ABERTO/PARCIAL/VENCIDAS. *
      *             ATUALIZA CONTADORES E, SE APLICAVEL, MUDA         *
      *             ST_CONTRATO PARA 'EN' (ENCERRADO) QUANDO NAO      *
      *             HOUVER MAIS PARCELAS EM ABERTO.                   *
      *----------------------------------------------------------------*
      * TABELAS  .:                                                   *
      *   SIGEC.SG_PARCELA       (SELECT / AGGREGATE)                 *
      *   SIGEC.SG_CONTRATO      (SELECT + UPDATE)                    *
      *   SIGEC.SG_HIST_CONTRATO (INSERT)                             *
      *----------------------------------------------------------------*
      * REGRAS DE STATUS DA PARCELA:                                  *
      *   ABERTA/EM ABERTO -> ST_PARCELA IN ('AB','PP','VC')          *
      *   VENCIDA         -> ST_PARCELA = 'VC' OU DIAS_ATRASO > 0     *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE DCLSGCTR END-EXEC.
           EXEC SQL INCLUDE DCLSGHCT END-EXEC.
       COPY SGRETCOD.
       COPY SGERRMSG.
      *
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0120'.
           05  WS-SQLCODE-DISP           PIC -9(9).
           05  WS-USUARIO                PIC X(30)
                                          VALUE 'SGCB0120-BATCH'.
           05  WS-USR-LEN                PIC S9(4) COMP VALUE +14.
      *
      *   VARIAVEIS DE CALCULO -------------------------------------- *
       01  WS-CALC.
           05  WS-VR-SALDO-NOVO          PIC S9(13)V99 COMP-3
                                          VALUE ZEROES.
           05  WS-QT-ABERTAS-NOVO        PIC S9(4) COMP  VALUE ZEROES.
           05  WS-QT-VENCIDAS-NOVO       PIC S9(4) COMP  VALUE ZEROES.
           05  WS-DIAS-ATRASO-MAX-NOVO   PIC S9(4) COMP  VALUE ZEROES.
      *   contador auxiliar de iteracoes (uso pontual)                *
           05  WS-X1                     PIC S9(9) COMP  VALUE ZEROES.
      *
      *   SNAPSHOT ANTES/DEPOIS PARA HISTORICO ---------------------- *
       01  WS-ANTES.
           05  WS-ST-CTR-ANT             PIC X(02).
           05  WS-CL-INAD-ANT            PIC X(01).
           05  WS-VR-SALDO-ANT           PIC S9(13)V99 COMP-3.
           05  WS-DIAS-ATR-ANT           PIC S9(4)  COMP.
           05  WS-QT-ABERT-ANT           PIC S9(4)  COMP.
      *
       01  WS-FLAGS.
           05  WS-FL-MUDA-STATUS         PIC X(01) VALUE 'N'.
               88  WS-VAI-ENCERRAR              VALUE 'S'.
           05  WS-FL-OBS                 PIC X(240).
           05  WS-OBS-LEN                PIC S9(4)  COMP.
      *
       01  WS-OBS-TEMPLATE.
           05  FILLER                   PIC X(30)
                VALUE 'RECALCULO SALDO SGCB0120 CTR='.
           05  WS-OBS-CTR               PIC X(15).
      *
       LINKAGE SECTION.
       01  LK-CTR-AREA.
           05  LK-ID-CONTRATO            PIC X(15).
           05  LK-VR-SALDO-CALC          PIC S9(13)V99 COMP-3.
           05  LK-QT-ABERTAS-CALC        PIC 9(04).
           05  LK-QT-VENCIDAS-CALC       PIC 9(04).
           05  LK-ST-CONTRATO-NOVO       PIC X(02).
           05  LK-IND-ENCERRADO          PIC X(01).
               88  LK-CTR-ENCERRADO              VALUE 'S'.
               88  LK-CTR-NAO-ENCERRADO          VALUE 'N'.
           05  LK-RETURN-CODE            PIC 9(02).
           05  LK-MENSAGEM               PIC X(80).
      *
       COPY SGCOMMAR.
      *
       PROCEDURE DIVISION USING LK-CTR-AREA
                                SGCOMMAR.
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-VALIDAR-ENTRADA
           IF SG-RC-OK
              PERFORM 3000-LER-CONTRATO-ATUAL
           END-IF
           IF SG-RC-OK
              PERFORM 4000-CALCULAR-NOVO-SALDO
           END-IF
           IF SG-RC-OK
              PERFORM 5000-ATUALIZAR-CONTRATO
           END-IF
           IF SG-RC-OK OR SG-RC-WARN
              PERFORM 6000-GRAVAR-HISTORICO
           END-IF
           PERFORM 9000-FINALIZAR
           GOBACK.
      *
       1000-INICIALIZAR.
           MOVE SG-CT-RC-OK          TO WS-RC
           MOVE SPACES               TO LK-MENSAGEM
           MOVE ZEROES               TO WS-VR-SALDO-NOVO
                                        WS-QT-ABERTAS-NOVO
                                        WS-QT-VENCIDAS-NOVO
                                        WS-DIAS-ATRASO-MAX-NOVO
                                        WS-X1
           MOVE 'N'                  TO WS-FL-MUDA-STATUS
           MOVE 'N'                  TO LK-IND-ENCERRADO
           MOVE ZEROES               TO LK-VR-SALDO-CALC
                                        LK-QT-ABERTAS-CALC
                                        LK-QT-VENCIDAS-CALC
           MOVE SPACES               TO LK-ST-CONTRATO-NOVO
           MOVE WS-PROG              TO SGC-PROG-CHAMADO.
      *
       2000-VALIDAR-ENTRADA.
           IF LK-ID-CONTRATO = SPACES OR LOW-VALUES
              MOVE SG-CT-RC-ERR-FUNC TO WS-RC
              MOVE 'ID CONTRATO OBRIGATORIO'
                                     TO LK-MENSAGEM
           END-IF.
      *
      *****************************************************************
      *                                                               *
      *   3000-LER-CONTRATO-ATUAL                                     *
      *   ------------------------------------------------------------*
      *   Le a linha de SG_CONTRATO para capturar o estado ANTES da   *
      *   atualizacao. E necessario para:                             *
      *     - montar o registro de historico (colunas *_ANT)          *
      *     - decidir se a nova ST_CONTRATO substitui a atual         *
      *     - detectar contratos ja em EN ou CA que nao devem ser     *
      *       recalculados (retorna RC 04 - warning e nao faz nada)   *
      *                                                               *
      *****************************************************************
       3000-LER-CONTRATO-ATUAL.
           MOVE LENGTH OF LK-ID-CONTRATO
                                     TO SGCTR-ID-CTR-LEN
           MOVE LK-ID-CONTRATO       TO SGCTR-ID-CTR-TXT
      *
           EXEC SQL
             SELECT ST_CONTRATO,
                    CLASSIFICACAO_INAD,
                    VR_SALDO,
                    DIAS_ATRASO_MAX,
                    QT_PARCELAS_ABERTAS
               INTO :WS-ST-CTR-ANT,
                    :WS-CL-INAD-ANT
                       :SGCTR-IND-CLASSIF-INAD,
                    :WS-VR-SALDO-ANT,
                    :WS-DIAS-ATR-ANT,
                    :WS-QT-ABERT-ANT
               FROM SIGEC.SG_CONTRATO
              WHERE ID_CONTRATO = :SGCTR-ID-CONTRATO
                AND SITUACAO_REG = 'A'
              FETCH FIRST 1 ROWS ONLY
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    IF WS-ST-CTR-ANT = 'CA' OR WS-ST-CTR-ANT = 'EN'
                       MOVE SG-CT-RC-WARN TO WS-RC
                       MOVE 'CONTRATO JA ENCERRADO/CANCELADO -'
                            ' RECALC IGNORADO'
                                          TO LK-MENSAGEM
                    END-IF
               WHEN SQLCODE = +100
                    MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                    MOVE 'CONTRATO NAO ENCONTRADO PARA RECALCULO'
                                          TO LK-MENSAGEM
               WHEN OTHER
                    PERFORM 8000-TRATAR-ERRO-DB2
           END-EVALUATE.
      *
      *****************************************************************
      *                                                               *
      *   4000-CALCULAR-NOVO-SALDO                                    *
      *   ------------------------------------------------------------*
      *   Este e o paragrafo principal do modulo. Executa QUATRO      *
      *   agregacoes sobre SG_PARCELA na mesma consulta para          *
      *   minimizar acesso ao DB2:                                    *
      *     1) SUM(VR_SALDO) das parcelas em aberto/parcial/vencida   *
      *     2) COUNT das parcelas em aberto (AB,PP,VC)                *
      *     3) COUNT das parcelas vencidas (VC ou DIAS_ATRASO>0)      *
      *     4) MAX(DIAS_ATRASO) entre as parcelas ainda abertas       *
      *                                                               *
      *   Se todas as parcelas foram quitadas (QT_ABERTAS = 0), o     *
      *   contrato passa a EN e a classificacao de inadimplencia e    *
      *   zerada. Caso contrario, mantem a ST_CONTRATO existente.     *
      *                                                               *
      *   Regra especial: se o SUM retornar NULL (contrato sem        *
      *   parcelas), o saldo novo e 0 e o contrato tambem migra       *
      *   para EN (comportamento identico a "todas pagas").           *
      *                                                               *
      *****************************************************************
       4000-CALCULAR-NOVO-SALDO.
           EXEC SQL
             SELECT COALESCE(SUM(CASE
                       WHEN ST_PARCELA IN ('AB','PP','VC')
                            THEN VR_SALDO
                       ELSE 0
                    END), 0),
                    COALESCE(SUM(CASE
                       WHEN ST_PARCELA IN ('AB','PP','VC')
                            THEN 1
                       ELSE 0
                    END), 0),
                    COALESCE(SUM(CASE
                       WHEN ST_PARCELA = 'VC'
                            OR DIAS_ATRASO > 0
                            THEN 1
                       ELSE 0
                    END), 0),
                    COALESCE(MAX(CASE
                       WHEN ST_PARCELA IN ('AB','PP','VC')
                            THEN DIAS_ATRASO
                       ELSE 0
                    END), 0)
               INTO :WS-VR-SALDO-NOVO,
                    :WS-QT-ABERTAS-NOVO,
                    :WS-QT-VENCIDAS-NOVO,
                    :WS-DIAS-ATRASO-MAX-NOVO
               FROM SIGEC.SG_PARCELA
              WHERE ID_CONTRATO  = :SGCTR-ID-CONTRATO
                AND SITUACAO_REG = 'A'
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    CONTINUE
               WHEN SQLCODE = +100
      *             AGGREGATE SEM LINHAS RETORNA 0 EM COALESCE, MAS   *
      *             DEIXAMOS ESTE RAMO POR SEGURANCA                  *
                    MOVE ZEROES              TO WS-VR-SALDO-NOVO
                                                WS-QT-ABERTAS-NOVO
                                                WS-QT-VENCIDAS-NOVO
                                                WS-DIAS-ATRASO-MAX-NOVO
               WHEN OTHER
                    PERFORM 8000-TRATAR-ERRO-DB2
           END-EVALUATE
      *
      *    DECIDE SE HA MUDANCA DE STATUS (ENCERRAMENTO)              *
           IF SG-RC-OK
              IF WS-QT-ABERTAS-NOVO = 0
                 MOVE 'S'                    TO WS-FL-MUDA-STATUS
                 MOVE 'EN'                   TO LK-ST-CONTRATO-NOVO
                 MOVE 'S'                    TO LK-IND-ENCERRADO
              ELSE
                 MOVE WS-ST-CTR-ANT          TO LK-ST-CONTRATO-NOVO
                 IF WS-QT-VENCIDAS-NOVO > 0
                    AND WS-ST-CTR-ANT = 'AT'
                    MOVE 'IN'                TO LK-ST-CONTRATO-NOVO
                    MOVE 'S'                 TO WS-FL-MUDA-STATUS
                 END-IF
              END-IF
      *       incrementa contador auxiliar (uso restrito)             *
              ADD 1                          TO WS-X1
              MOVE WS-VR-SALDO-NOVO          TO LK-VR-SALDO-CALC
              MOVE WS-QT-ABERTAS-NOVO        TO LK-QT-ABERTAS-CALC
              MOVE WS-QT-VENCIDAS-NOVO       TO LK-QT-VENCIDAS-CALC
           END-IF.
      *
      *****************************************************************
      *   5000-ATUALIZAR-CONTRATO                                     *
      *   ------------------------------------------------------------*
      *   Aplica o UPDATE em SG_CONTRATO. Se WS-FL-MUDA-STATUS = 'S', *
      *   troca tambem a coluna ST_CONTRATO e zera CLASSIFICACAO_INAD *
      *   quando o novo status for EN.                                *
      *****************************************************************
       5000-ATUALIZAR-CONTRATO.
           IF WS-VAI-ENCERRAR
              EXEC SQL
                UPDATE SIGEC.SG_CONTRATO
                   SET VR_SALDO             = :WS-VR-SALDO-NOVO,
                       QT_PARCELAS_ABERTAS  = :WS-QT-ABERTAS-NOVO,
                       QT_PARCELAS_VENCIDAS = :WS-QT-VENCIDAS-NOVO,
                       DIAS_ATRASO_MAX      = :WS-DIAS-ATRASO-MAX-NOVO,
                       ST_CONTRATO          = 'EN',
                       CLASSIFICACAO_INAD   = 'N',
                       DH_ALTERACAO         = CURRENT TIMESTAMP,
                       USUARIO_ALTERACAO    = :WS-USUARIO
                 WHERE ID_CONTRATO          = :SGCTR-ID-CONTRATO
                   AND SITUACAO_REG         = 'A'
              END-EXEC
           ELSE
              EXEC SQL
                UPDATE SIGEC.SG_CONTRATO
                   SET VR_SALDO             = :WS-VR-SALDO-NOVO,
                       QT_PARCELAS_ABERTAS  = :WS-QT-ABERTAS-NOVO,
                       QT_PARCELAS_VENCIDAS = :WS-QT-VENCIDAS-NOVO,
                       DIAS_ATRASO_MAX      = :WS-DIAS-ATRASO-MAX-NOVO,
                       ST_CONTRATO          = :LK-ST-CONTRATO-NOVO,
                       DH_ALTERACAO         = CURRENT TIMESTAMP,
                       USUARIO_ALTERACAO    = :WS-USUARIO
                 WHERE ID_CONTRATO          = :SGCTR-ID-CONTRATO
                   AND SITUACAO_REG         = 'A'
              END-EXEC
           END-IF
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    CONTINUE
               WHEN SQLCODE = +100
                    MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                    MOVE 'CONTRATO PERDIDO ENTRE SELECT E UPDATE'
                                            TO LK-MENSAGEM
               WHEN OTHER
                    PERFORM 8000-TRATAR-ERRO-DB2
           END-EVALUATE.
      *
      *****************************************************************
      *   6000-GRAVAR-HISTORICO                                       *
      *   ------------------------------------------------------------*
      *   Registra a mudanca em SG_HIST_CONTRATO com o snapshot       *
      *   antes/depois de saldo, dias de atraso e status.             *
      *****************************************************************
       6000-GRAVAR-HISTORICO.
           MOVE LENGTH OF LK-ID-CONTRATO
                                     TO SGHCT-ID-CTR-LEN
           MOVE LK-ID-CONTRATO       TO SGHCT-ID-CTR-TXT
           MOVE 'RCS'                TO SGHCT-TP-EVENTO
           MOVE WS-ST-CTR-ANT        TO SGHCT-ST-CTR-ANT
           MOVE LK-ST-CONTRATO-NOVO  TO SGHCT-ST-CTR-NOV
           MOVE WS-CL-INAD-ANT       TO SGHCT-CL-INAD-ANT
           IF WS-VAI-ENCERRAR
              MOVE 'N'               TO SGHCT-CL-INAD-NOV
           ELSE
              MOVE WS-CL-INAD-ANT    TO SGHCT-CL-INAD-NOV
           END-IF
           MOVE WS-VR-SALDO-ANT      TO SGHCT-VR-SALDO-ANT
           MOVE WS-VR-SALDO-NOVO     TO SGHCT-VR-SALDO-NOV
           MOVE WS-DIAS-ATR-ANT      TO SGHCT-DIAS-ATRASO-ANT
           MOVE WS-DIAS-ATRASO-MAX-NOVO
                                      TO SGHCT-DIAS-ATRASO-NOV
      *
           MOVE LK-ID-CONTRATO       TO WS-OBS-CTR
           MOVE WS-OBS-TEMPLATE      TO SGHCT-OBS-TXT
           MOVE FUNCTION LENGTH(FUNCTION TRIM(SGHCT-OBS-TXT))
                                      TO SGHCT-OBS-LEN
      *
           MOVE WS-USR-LEN           TO SGHCT-USR-INC-LEN
           MOVE WS-USUARIO           TO SGHCT-USR-INC-TXT
           MOVE 'A'                  TO SGHCT-SITUACAO-REG
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_HIST_CONTRATO
                    (ID_HIST,
                     ID_CONTRATO,
                     DT_EVENTO,
                     TP_EVENTO,
                     ST_CONTRATO_ANT,
                     ST_CONTRATO_NOV,
                     CLASSIF_INAD_ANT,
                     CLASSIF_INAD_NOV,
                     VR_SALDO_ANT,
                     VR_SALDO_NOV,
                     DIAS_ATRASO_MAX_ANT,
                     DIAS_ATRASO_MAX_NOV,
                     OBSERVACAO,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (NEXT VALUE FOR SIGEC.SEQ_SG_HIST_CTR,
                     :SGHCT-ID-CONTRATO,
                     CURRENT TIMESTAMP,
                     :SGHCT-TP-EVENTO,
                     :SGHCT-ST-CTR-ANT,
                     :SGHCT-ST-CTR-NOV,
                     :SGHCT-CL-INAD-ANT,
                     :SGHCT-CL-INAD-NOV,
                     :SGHCT-VR-SALDO-ANT,
                     :SGHCT-VR-SALDO-NOV,
                     :SGHCT-DIAS-ATRASO-ANT,
                     :SGHCT-DIAS-ATRASO-NOV,
                     :SGHCT-OBSERVACAO,
                     CURRENT TIMESTAMP,
                     :SGHCT-USUARIO-INCLUSAO,
                     'A')
           END-EXEC
      *
           IF SQLCODE NOT = 0
              PERFORM 8000-TRATAR-ERRO-DB2
           END-IF.
      *
       8000-TRATAR-ERRO-DB2.
           MOVE SG-CT-RC-ERR-TEC     TO WS-RC
           MOVE SQLCODE              TO WS-SQLCODE-DISP
           STRING '12-DB2-SQLCODE=' DELIMITED BY SIZE
                  WS-SQLCODE-DISP    DELIMITED BY SIZE
                  ' SGCB0120'        DELIMITED BY SIZE
             INTO LK-MENSAGEM.
      *
       9000-FINALIZAR.
           MOVE WS-RC                TO LK-RETURN-CODE
           MOVE WS-RC                TO SGC-RETURN-CODE
           MOVE LK-MENSAGEM          TO SGC-MENSAGEM
           MOVE WS-RC                TO RETURN-CODE.
      *
      *****************************************************************
      *                                                               *
      *   9990-DEBUG-DUMP-CTR                                         *
      *   ------------------------------------------------------------*
      *   Rotina antiga usada em investigacao pontual de divergencia  *
      *   entre saldo agregado e saldo persistido. Nao e chamada no   *
      *   fluxo normal - mantida por compatibilidade historica com    *
      *   procedimentos de plantao (ver docs/FLUXO_PROCESSAMENTO).    *
      *                                                               *
      *****************************************************************
       9990-DEBUG-DUMP-CTR.
           DISPLAY '===== DUMP DEBUG SGCB0120 ====='
           DISPLAY 'CONTRATO         : ' LK-ID-CONTRATO
           DISPLAY 'ST_CONTRATO ANT  : ' WS-ST-CTR-ANT
           DISPLAY 'ST_CONTRATO NOV  : ' LK-ST-CONTRATO-NOVO
           DISPLAY 'SALDO ANTERIOR   : ' WS-VR-SALDO-ANT
           DISPLAY 'SALDO NOVO       : ' WS-VR-SALDO-NOVO
           DISPLAY 'QT ABERTAS NOVAS : ' WS-QT-ABERTAS-NOVO
           DISPLAY 'QT VENCIDAS NOVAS: ' WS-QT-VENCIDAS-NOVO
           DISPLAY 'DIAS ATRASO MAX  : ' WS-DIAS-ATRASO-MAX-NOVO
           DISPLAY 'CONTADOR AUX X1  : ' WS-X1
           DISPLAY 'RC APURADO       : ' WS-RC
           DISPLAY 'SQLCODE ULTIMO   : ' SQLCODE
           DISPLAY '==============================='
           EXIT.
