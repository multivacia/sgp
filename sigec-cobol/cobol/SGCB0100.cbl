       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0100.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0100                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: CALCULO DIARIO DE JUROS E MULTA SOBRE PARCELAS    *
      *             VENCIDAS EM ABERTO/PARCIAL/VC. GRAVA O DETALHE    *
      *             EM SGLENCAR E ATUALIZA SG_PARCELA + HISTORICO.    *
      *---------------------------------------------------------------*
      * DEPENDENCIAS DE PROGRAMA (CALL ESTATICO):                     *
      *   SGCB0180 - UTILITARIO DE DATAS (DIF EM DIAS)                *
      *   SGCB0110 - MOTOR FINANCEIRO (JUROS/MULTA)                   *
      *---------------------------------------------------------------*
      * ENTRADAS DB2:                                                 *
      *   SIGEC.SG_PARCELA   (CURSOR)                                 *
      *   SIGEC.SG_CONTRATO  (JOIN)                                   *
      *   SIGEC.SG_CLIENTE   (JOIN - TP_CLIENTE)                      *
      *   SIGEC.SG_PARAMETRO (TAXA/MULTA/LIMITE/FATOR-ESPECIAL)       *
      *---------------------------------------------------------------*
      * SAIDAS:                                                       *
      *   DDNAME SGLENCAR (FB LRECL 200) - HEADER/DETAIL/TRAILER      *
      *   UPDATE SG_PARCELA (VR_JUROS, VR_MULTA, DIAS_ATRASO)         *
      *   INSERT SG_HIST_FINANCEIRO (TP_EVENTO='ENC')                 *
      *---------------------------------------------------------------*
      * REGRA: TAXA E MULTA VEM DE SG_PARAMETRO QUANDO DISPONIVEIS;   *
      * CASO CONTRARIO SAO USADOS OS VALORES DE CADA CONTRATO.        *
      * COMENTARIO DE POLICY: "MULTA ATE 2% AO MES" - IMPLEMENTACAO   *
      * REAL USA O PARAMETRO PC_MULTA-GLOBAL DO DB2 (PODE DIFERIR).   *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (NAO HOUVE PARCELAS ELEGIVEIS OU CALCULO PARCIAL)*
      *   08 - ERRO FUNCIONAL                                         *
      *   12 - ERRO TECNICO                                           *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SGLENCAR-FILE
                  ASSIGN TO SGLENCAR
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-ENCAR.
      *
       DATA DIVISION.
       FILE SECTION.
       FD  SGLENCAR-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLENCAR.
      *
       WORKING-STORAGE SECTION.
      *---- COMUNICACAO SQL ------------------------------------------*
           EXEC SQL INCLUDE SQLCA END-EXEC.
      *---- DCLGENS UTILIZADAS ---------------------------------------*
           EXEC SQL INCLUDE DCLSGPAR END-EXEC.
           EXEC SQL INCLUDE DCLSGCTR END-EXEC.
           EXEC SQL INCLUDE DCLSGHFI END-EXEC.
           EXEC SQL INCLUDE DCLSGPRM END-EXEC.
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
       01  WS-FILE-STATUS.
           05  WS-FS-ENCAR               PIC X(02) VALUE '00'.
               88  FS-ENCAR-OK                    VALUE '00'.
      *
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0100'.
           05  WS-SQLCODE-DISP           PIC -9(9).
           05  WS-USUARIO                PIC X(30)
                                          VALUE 'SGCB0100-BATCH'.
           05  WS-USR-LEN                PIC S9(4) COMP  VALUE +14.
           05  WS-DT-PROC                PIC 9(08)  VALUE ZEROES.
           05  WS-HR-PROC                PIC 9(06)  VALUE ZEROES.
           05  WS-LIMITE-COMMIT          PIC 9(05)  VALUE 00500.
           05  WS-QT-DESDE-COMMIT        PIC 9(05)  VALUE ZEROES.
      *
       01  WS-FLAGS.
           05  WS-FL-EOF-CUR             PIC X(01) VALUE 'N'.
               88  WS-EOF-CURSOR                  VALUE 'S'.
               88  WS-NAO-EOF-CURSOR              VALUE 'N'.
           05  WS-FL-ABORT               PIC X(01) VALUE 'N'.
               88  WS-DEVE-ABORTAR                VALUE 'S'.
      *
       01  WS-CONTADORES.
           05  WS-QT-LIDOS               PIC 9(09) VALUE ZEROES.
           05  WS-QT-CALCULADAS          PIC 9(09) VALUE ZEROES.
           05  WS-QT-ATUALIZADAS         PIC 9(09) VALUE ZEROES.
           05  WS-QT-ERROS               PIC 9(09) VALUE ZEROES.
           05  WS-SOMA-JUROS             PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-SOMA-MULTA             PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-SOMA-ATUAL             PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
      *
      *---------------------------------------------------------------*
      * PARAMETROS DE POLICY LIDOS DE SG_PARAMETRO                    *
      *---------------------------------------------------------------*
       01  WS-POLICY.
           05  WS-POL-TAXA               PIC S9(03)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-POL-MULTA              PIC S9(03)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-POL-LIMITE             PIC S9(03)V99 COMP-3
                                                    VALUE 20.00.
           05  WS-POL-FATOR-ESP          PIC 9V999
                                                    VALUE 0.873.
           05  WS-POL-FL-USA-TAXA        PIC X(01) VALUE 'N'.
           05  WS-POL-FL-USA-MULTA       PIC X(01) VALUE 'N'.
      *
       01  WS-PARM-BUFFER.
           05  WS-PB-KEY                 PIC X(30).
           05  WS-PB-VAL                 PIC X(100).
           05  WS-PB-NUM   REDEFINES WS-PB-VAL.
              10  WS-PB-NUM-X            PIC X(100).
      *
      *---------------------------------------------------------------*
      * VARIAVEIS DE HOST DO CURSOR                                   *
      *---------------------------------------------------------------*
       01  WS-HV.
           05  HV-ID-CONTRATO            PIC X(15).
           05  HV-NR-PARCELA             PIC S9(4) COMP.
           05  HV-DT-VENCIMENTO          PIC X(10).
           05  HV-VR-SALDO               PIC S9(13)V99 COMP-3.
           05  HV-ST-PARCELA             PIC X(02).
           05  HV-TX-JUROS               PIC S9(03)V99 COMP-3.
           05  HV-PC-MULTA               PIC S9(03)V99 COMP-3.
           05  HV-TP-CONTRATO            PIC X(02).
           05  HV-TP-CLIENTE             PIC X(02).
           05  HV-ID-CLIENTE             PIC S9(18) COMP-3.
           05  HV-DIAS-ATR-DB            PIC S9(4)  COMP.
      *
      *---------------------------------------------------------------*
      * AREA DE CONVERSAO DE DATA VCTO PARA AAAAMMDD                  *
      *---------------------------------------------------------------*
       01  WS-DATA-CONV.
           05  WS-DT-VCTO-NUM            PIC 9(08).
           05  WS-DT-VCTO-CHAR           PIC X(10).
      *
      *---------------------------------------------------------------*
      * AREAS DE CALL                                                 *
      *---------------------------------------------------------------*
       COPY SGDATAS.
       COPY SGFINANC.
       COPY SGCOMMAR.
      *
      *---------------------------------------------------------------*
      * DECLARACAO DO CURSOR DE PARCELAS VENCIDAS                     *
      *---------------------------------------------------------------*
           EXEC SQL DECLARE C-PARC-VEN CURSOR WITH HOLD FOR
             SELECT P.ID_CONTRATO,
                    P.NR_PARCELA,
                    CHAR(P.DT_VENCIMENTO, ISO),
                    P.VR_SALDO,
                    P.ST_PARCELA,
                    C.TX_JUROS,
                    C.PC_MULTA,
                    C.TP_CONTRATO,
                    C.ID_CLIENTE,
                    K.TP_CLIENTE,
                    P.DIAS_ATRASO
               FROM SIGEC.SG_PARCELA  P
               JOIN SIGEC.SG_CONTRATO C
                 ON C.ID_CONTRATO   = P.ID_CONTRATO
                AND C.SITUACAO_REG  = 'A'
               JOIN SIGEC.SG_CLIENTE K
                 ON K.ID_CLIENTE    = C.ID_CLIENTE
                AND K.SITUACAO_REG  = 'A'
              WHERE P.ST_PARCELA   IN ('AB','VC','PP')
                AND P.DT_VENCIMENTO < CURRENT DATE
                AND P.SITUACAO_REG  = 'A'
                AND C.ST_CONTRATO   NOT IN ('EN','CA')
              ORDER BY P.ID_CONTRATO, P.NR_PARCELA
              FOR READ ONLY
           END-EXEC.
      *
       PROCEDURE DIVISION.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 1500-CARREGAR-PARAMETROS
           PERFORM 2000-ABRIR-SAIDA
           IF WS-DEVE-ABORTAR
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 2100-GRAVAR-HEADER
           PERFORM 2500-ABRIR-CURSOR
           IF WS-DEVE-ABORTAR
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 3000-LOOP-FETCH
              UNTIL WS-EOF-CURSOR OR WS-DEVE-ABORTAR
      *
           PERFORM 8000-FECHAR-CURSOR
           PERFORM 8100-GRAVAR-TRAILER
           PERFORM 8500-COMMIT-FINAL
           PERFORM 8900-FECHAR-SAIDA
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
      *---------------------------------------------------------------*
           MOVE SG-CT-RC-OK              TO WS-RC
           MOVE WS-PROG                  TO SGC-PROG-CHAMADO
           MOVE FUNCTION CURRENT-DATE (1:8)
                                          TO WS-DT-PROC
           MOVE FUNCTION CURRENT-DATE (9:6)
                                          TO WS-HR-PROC
           MOVE WS-DT-PROC               TO SGC-DT-PROCESSAMENTO
           MOVE WS-HR-PROC               TO SGC-HORA-EXEC
           MOVE 'N'                      TO WS-FL-EOF-CUR
           MOVE 'N'                      TO WS-FL-ABORT.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * LE PARAMETROS OPCIONAIS DE POLICY DE SG_PARAMETRO.            *
      *   TAXA-JUROS-GLOBAL, PC-MULTA-GLOBAL, LIMITE-JUROS-EFET,      *
      *   FATOR-ESPECIAL-LEGADO.                                      *
      *---------------------------------------------------------------*
       1500-CARREGAR-PARAMETROS SECTION.
           MOVE 'TAXA-JUROS-GLOBAL'      TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              MOVE 'S'                   TO WS-POL-FL-USA-TAXA
              COMPUTE WS-POL-TAXA =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF
      *
           MOVE 'PC-MULTA-GLOBAL'        TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              MOVE 'S'                   TO WS-POL-FL-USA-MULTA
              COMPUTE WS-POL-MULTA =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF
      *
           MOVE 'LIMITE-JUROS-EFET'      TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              COMPUTE WS-POL-LIMITE =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF
      *
           MOVE 'FATOR-ESPECIAL-LEGADO'  TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              COMPUTE WS-POL-FATOR-ESP =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF.
       1500-FIM. EXIT.
      *
       1550-LE-PARM SECTION.
           MOVE FUNCTION LENGTH(FUNCTION TRIM(WS-PB-KEY))
                                          TO SGPRM-CD-PRM-LEN
           MOVE WS-PB-KEY                 TO SGPRM-CD-PRM-TXT
           MOVE SPACES                    TO WS-PB-VAL
      *
           EXEC SQL
             SELECT VR_PARAMETRO
               INTO :SGPRM-VR-PARAMETRO
               FROM SIGEC.SG_PARAMETRO
              WHERE CD_PARAMETRO = :SGPRM-CD-PARAMETRO
                AND SITUACAO_REG = 'A'
              FETCH FIRST 1 ROWS ONLY
           END-EXEC
      *
           IF SQLCODE = 0
              MOVE SGPRM-VR-PRM-TXT       TO WS-PB-VAL
           END-IF.
       1550-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-SAIDA SECTION.
      *---------------------------------------------------------------*
           OPEN OUTPUT SGLENCAR-FILE
           IF NOT FS-ENCAR-OK
              MOVE SG-CT-RC-ERR-TEC        TO WS-RC
              MOVE 'S'                     TO WS-FL-ABORT
              STRING '12-FILE OPEN SGLENCAR FS='  DELIMITED BY SIZE
                     WS-FS-ENCAR                  DELIMITED BY SIZE
                INTO SGC-MENSAGEM
           END-IF.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2100-GRAVAR-HEADER SECTION.
      *---------------------------------------------------------------*
           MOVE SPACES                 TO REG-SGLENCAR
           MOVE 'H'                    TO ENCAR-HDR-TIPO
           MOVE WS-DT-PROC             TO ENCAR-HDR-DT-REF
           MOVE 'SGCB0100'             TO ENCAR-HDR-PROG-ORIGEM
           MOVE ZEROES                 TO ENCAR-HDR-QTD-CALC
           MOVE REG-SGLENCAR-HDR       TO REG-SGLENCAR
           WRITE REG-SGLENCAR.
       2100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2500-ABRIR-CURSOR SECTION.
      *---------------------------------------------------------------*
           EXEC SQL OPEN C-PARC-VEN END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
              MOVE 'S' TO WS-FL-ABORT
           END-IF.
       2500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3000-LOOP-FETCH SECTION.
      *---------------------------------------------------------------*
           EXEC SQL
             FETCH C-PARC-VEN
               INTO :HV-ID-CONTRATO,
                    :HV-NR-PARCELA,
                    :HV-DT-VENCIMENTO,
                    :HV-VR-SALDO,
                    :HV-ST-PARCELA,
                    :HV-TX-JUROS,
                    :HV-PC-MULTA,
                    :HV-TP-CONTRATO,
                    :HV-ID-CLIENTE,
                    :HV-TP-CLIENTE,
                    :HV-DIAS-ATR-DB
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    ADD 1 TO WS-QT-LIDOS
                    PERFORM 4000-PROCESSAR-PARCELA
               WHEN SQLCODE = +100
                    MOVE 'S' TO WS-FL-EOF-CUR
               WHEN OTHER
                    PERFORM 8800-TRATAR-SQLCODE
                    MOVE 'S' TO WS-FL-ABORT
           END-EVALUATE
      *
           IF WS-QT-DESDE-COMMIT >= WS-LIMITE-COMMIT
              PERFORM 8600-COMMIT-PARCIAL
           END-IF.
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * PROCESSAMENTO DE UMA PARCELA VENCIDA:                         *
      *   1) CALCULA DIAS DE ATRASO VIA SGCB0180                      *
      *   2) MONTA SGFINANC E CHAMA SGCB0110                          *
      *   3) UPDATE SG_PARCELA + INSERT SG_HIST_FINANCEIRO            *
      *   4) GRAVA DETALHE EM SGLENCAR                                *
      *---------------------------------------------------------------*
       4000-PROCESSAR-PARCELA SECTION.
           PERFORM 4100-CALC-DIAS-ATRASO
           IF SG-DT-RETURN-CODE >= 08
              ADD 1 TO WS-QT-ERROS
              GO TO 4000-FIM
           END-IF
      *
           PERFORM 4200-CALCULAR-ENCARGOS
           IF SG-FIN-RETURN-CODE >= 08
              ADD 1 TO WS-QT-ERROS
              GO TO 4000-FIM
           END-IF
      *
           PERFORM 4300-UPDATE-PARCELA
           IF WS-RC >= 12
              ADD 1 TO WS-QT-ERROS
              GO TO 4000-FIM
           END-IF
      *
           PERFORM 4400-INSERT-HIST-FIN
      *
           PERFORM 4500-GRAVAR-ENCAR-DET
      *
           ADD 1 TO WS-QT-CALCULADAS
           ADD 1 TO WS-QT-ATUALIZADAS
           ADD 1 TO WS-QT-DESDE-COMMIT
           ADD SG-FIN-JUROS      TO WS-SOMA-JUROS
           ADD SG-FIN-MULTA      TO WS-SOMA-MULTA
           ADD SG-FIN-ATUALIZADO TO WS-SOMA-ATUAL.
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4100-CALC-DIAS-ATRASO SECTION.
      *---------------------------------------------------------------*
           INITIALIZE SGDATAS
           MOVE 'DIF'                  TO SG-DT-FUNCAO
      *    CONVERTE DATA CHAR ISO -> AAAAMMDD
           MOVE HV-DT-VENCIMENTO       TO WS-DT-VCTO-CHAR
           MOVE WS-DT-VCTO-CHAR (1:4)  TO WS-DT-VCTO-NUM (1:4)
           MOVE WS-DT-VCTO-CHAR (6:2)  TO WS-DT-VCTO-NUM (5:2)
           MOVE WS-DT-VCTO-CHAR (9:2)  TO WS-DT-VCTO-NUM (7:2)
           MOVE WS-DT-VCTO-NUM         TO SG-DT-ENTRADA-1
           MOVE WS-DT-PROC             TO SG-DT-ENTRADA-2
      *
           CALL 'SGCB0180' USING SGDATAS
      *
           IF SG-DT-DIF-DIAS < 0
              MOVE 0 TO SG-DT-DIF-DIAS
           END-IF.
       4100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4200-CALCULAR-ENCARGOS SECTION.
      *---------------------------------------------------------------*
           INITIALIZE SGFINANC
           MOVE HV-VR-SALDO            TO SG-FIN-PRINCIPAL
           MOVE SG-DT-DIF-DIAS         TO SG-FIN-DIAS-ATRASO
      *
      *    POLICY: SE PARAMETRO GLOBAL EXISTIR, ELE PREVALECE
      *    (COMENTARIO HISTORICO NA HEADER MENCIONA "ATE 2%",
      *     PORAM O CODIGO USA O VALOR CORRENTE DE DB2).
           IF WS-POL-FL-USA-TAXA = 'S'
              MOVE WS-POL-TAXA         TO SG-FIN-TAXA-MENSAL
           ELSE
              MOVE HV-TX-JUROS         TO SG-FIN-TAXA-MENSAL
           END-IF
      *
           IF WS-POL-FL-USA-MULTA = 'S'
              MOVE WS-POL-MULTA        TO SG-FIN-PCT-MULTA
           ELSE
              MOVE HV-PC-MULTA         TO SG-FIN-PCT-MULTA
           END-IF
      *
           MOVE HV-TP-CONTRATO         TO SG-FIN-TIPO-CTR
           MOVE HV-TP-CLIENTE          TO SG-FIN-TIPO-CLI
           IF HV-ST-PARCELA = 'PP'
              MOVE 'S' TO SG-FIN-IND-PARCIAL
           ELSE
              MOVE 'N' TO SG-FIN-IND-PARCIAL
           END-IF
           MOVE 'N'                    TO SG-FIN-IND-SIMULACAO
           MOVE WS-DT-VCTO-NUM         TO SG-FIN-DT-VCTO
           MOVE WS-DT-PROC             TO SG-FIN-DT-BASE
      *
           CALL 'SGCB0110' USING SGFINANC.
       4200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4300-UPDATE-PARCELA SECTION.
      *---------------------------------------------------------------*
           EXEC SQL
             UPDATE SIGEC.SG_PARCELA
                SET VR_JUROS         = :SG-FIN-JUROS,
                    VR_MULTA         = :SG-FIN-MULTA,
                    DIAS_ATRASO      = :SG-DT-DIF-DIAS,
                    ST_PARCELA       =
                       CASE WHEN :SG-DT-DIF-DIAS > 0
                                 AND ST_PARCELA = 'AB'
                            THEN 'VC'
                            ELSE ST_PARCELA
                       END,
                    DH_ALTERACAO     = CURRENT TIMESTAMP,
                    USUARIO_ALTERACAO = :WS-USUARIO
              WHERE ID_CONTRATO      = :HV-ID-CONTRATO
                AND NR_PARCELA       = :HV-NR-PARCELA
                AND SITUACAO_REG     = 'A'
           END-EXEC
      *
           IF SQLCODE NOT = 0 AND SQLCODE NOT = +100
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       4300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4400-INSERT-HIST-FIN SECTION.
      *---------------------------------------------------------------*
           MOVE HV-ID-CONTRATO         TO SGHFI-ID-CTR-TXT
           MOVE 15                     TO SGHFI-ID-CTR-LEN
           MOVE HV-NR-PARCELA          TO SGHFI-NR-PARCELA
           MOVE ZEROES                 TO SGHFI-ID-PAGAMENTO
           MOVE 'ENC'                  TO SGHFI-TP-EVENTO
           MOVE SG-FIN-ATUALIZADO      TO SGHFI-VR-EVENTO
           MOVE HV-VR-SALDO            TO SGHFI-VR-SALDO-ANT
           MOVE HV-VR-SALDO            TO SGHFI-VR-SALDO-NOV
           MOVE SPACES                 TO SGHFI-DS-EVT-TXT
           STRING 'ENC DIA REF='       DELIMITED BY SIZE
                  WS-DT-PROC           DELIMITED BY SIZE
                  ' JR='               DELIMITED BY SIZE
                  SG-FIN-JUROS         DELIMITED BY SIZE
                  ' MU='               DELIMITED BY SIZE
                  SG-FIN-MULTA         DELIMITED BY SIZE
             INTO SGHFI-DS-EVT-TXT
           END-STRING
           MOVE FUNCTION LENGTH(FUNCTION TRIM(SGHFI-DS-EVT-TXT))
                                        TO SGHFI-DS-EVT-LEN
           MOVE WS-USR-LEN             TO SGHFI-USR-INC-LEN
           MOVE WS-USUARIO             TO SGHFI-USR-INC-TXT
           MOVE 'A'                    TO SGHFI-SITUACAO-REG
           MOVE -1                     TO SGHFI-IND-ID-PAGAMENTO
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_HIST_FINANCEIRO
                    (ID_HIST_FIN,
                     ID_CONTRATO,
                     NR_PARCELA,
                     ID_PAGAMENTO,
                     DT_EVENTO,
                     TP_EVENTO,
                     VR_EVENTO,
                     VR_SALDO_ANT,
                     VR_SALDO_NOV,
                     DS_EVENTO,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (NEXT VALUE FOR SIGEC.SEQ_SG_HIST_FIN,
                     :SGHFI-ID-CONTRATO,
                     :SGHFI-NR-PARCELA,
                     :SGHFI-ID-PAGAMENTO :SGHFI-IND-ID-PAGAMENTO,
                     CURRENT TIMESTAMP,
                     :SGHFI-TP-EVENTO,
                     :SGHFI-VR-EVENTO,
                     :SGHFI-VR-SALDO-ANT,
                     :SGHFI-VR-SALDO-NOV,
                     :SGHFI-DS-EVENTO,
                     CURRENT TIMESTAMP,
                     :SGHFI-USUARIO-INCLUSAO,
                     'A')
           END-EXEC
      *
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       4400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4500-GRAVAR-ENCAR-DET SECTION.
      *---------------------------------------------------------------*
           MOVE SPACES                 TO REG-SGLENCAR
           MOVE 'D'                    TO ENCAR-DET-TIPO
           MOVE WS-DT-PROC             TO ENCAR-DET-DT-REF
           MOVE HV-ID-CLIENTE          TO ENCAR-DET-ID-CONTRATO
           MOVE HV-ID-CONTRATO         TO ENCAR-DET-NR-CONTRATO
           MOVE ZEROES                 TO ENCAR-DET-ID-PARCELA
           MOVE HV-NR-PARCELA          TO ENCAR-DET-NR-PARCELA
           MOVE HV-TP-CONTRATO         TO ENCAR-DET-TIPO-CONTRATO
           MOVE HV-TP-CLIENTE          TO ENCAR-DET-TIPO-CLIENTE
           MOVE WS-DT-VCTO-NUM         TO ENCAR-DET-DT-VCTO
           MOVE SG-DT-DIF-DIAS         TO ENCAR-DET-DIAS-ATRASO
           MOVE HV-VR-SALDO            TO ENCAR-DET-VLR-PRINCIPAL
           MOVE SG-FIN-TAXA-MENSAL     TO ENCAR-DET-TAXA-JUROS
           MOVE SG-FIN-PCT-MULTA       TO ENCAR-DET-PCT-MULTA
           MOVE SG-FIN-JUROS           TO ENCAR-DET-VLR-JUROS
           MOVE SG-FIN-MULTA           TO ENCAR-DET-VLR-MULTA
           MOVE SG-FIN-ATUALIZADO      TO ENCAR-DET-VLR-ATUALIZADO
           MOVE SG-FIN-BASE-CALC       TO ENCAR-DET-VLR-BASE-CALC
           IF SG-FIN-IND-PARCIAL = 'S'
              MOVE 'S' TO ENCAR-DET-FL-PARCIAL
           ELSE
              MOVE 'N' TO ENCAR-DET-FL-PARCIAL
           END-IF
           MOVE SG-FIN-IND-LIMITE      TO ENCAR-DET-FL-LIMITE
           MOVE SG-FIN-RETURN-CODE     TO ENCAR-DET-RC-MOTOR
           MOVE WS-DT-PROC             TO ENCAR-DET-DT-CALC
           MOVE WS-HR-PROC             TO ENCAR-DET-HR-CALC
           MOVE REG-SGLENCAR-DET       TO REG-SGLENCAR
           WRITE REG-SGLENCAR
           IF NOT FS-ENCAR-OK
              MOVE SG-CT-RC-ERR-TEC    TO WS-RC
              MOVE 'S'                 TO WS-FL-ABORT
              STRING '12-WRITE SGLENCAR FS=' DELIMITED BY SIZE
                     WS-FS-ENCAR             DELIMITED BY SIZE
                INTO SGC-MENSAGEM
           END-IF.
       4500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8000-FECHAR-CURSOR SECTION.
      *---------------------------------------------------------------*
           EXEC SQL CLOSE C-PARC-VEN END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       8000-FIM. EXIT.
      *
       8100-GRAVAR-TRAILER SECTION.
           MOVE SPACES                 TO REG-SGLENCAR
           MOVE 'T'                    TO ENCAR-TRL-TIPO
           MOVE WS-QT-CALCULADAS       TO ENCAR-TRL-QTD-REGS
           MOVE WS-SOMA-JUROS          TO ENCAR-TRL-SOMA-JUROS
           MOVE WS-SOMA-MULTA          TO ENCAR-TRL-SOMA-MULTA
           MOVE WS-SOMA-ATUAL          TO ENCAR-TRL-SOMA-ATUAL
           MOVE WS-DT-PROC             TO ENCAR-TRL-DT-REF
           MOVE REG-SGLENCAR-TRL       TO REG-SGLENCAR
           WRITE REG-SGLENCAR.
       8100-FIM. EXIT.
      *
       8500-COMMIT-FINAL SECTION.
           EXEC SQL COMMIT END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       8500-FIM. EXIT.
      *
       8600-COMMIT-PARCIAL SECTION.
           EXEC SQL COMMIT END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF
           MOVE ZEROES TO WS-QT-DESDE-COMMIT.
       8600-FIM. EXIT.
      *
       8800-TRATAR-SQLCODE SECTION.
           MOVE SQLCODE                TO WS-SQLCODE-DISP
           MOVE SG-CT-RC-ERR-TEC       TO WS-RC
           STRING '12-DB2-SQLCODE=' DELIMITED BY SIZE
                  WS-SQLCODE-DISP    DELIMITED BY SIZE
                  ' SGCB0100'        DELIMITED BY SIZE
             INTO SGC-MENSAGEM.
       8800-FIM. EXIT.
      *
       8900-FECHAR-SAIDA SECTION.
           CLOSE SGLENCAR-FILE.
       8900-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
      *---------------------------------------------------------------*
           IF WS-QT-CALCULADAS = 0 AND WS-RC < 04
              MOVE SG-CT-RC-WARN       TO WS-RC
              MOVE MS-INA-VAZIO        TO SGC-MENSAGEM (1:20)
              MOVE 'NENHUMA PARCELA VENCIDA ELEGIVEL PARA CALCULO'
                                       TO SGC-MENSAGEM (21:60)
           END-IF
           MOVE WS-QT-LIDOS            TO SGC-QT-REGS-LIDOS
           MOVE WS-QT-ATUALIZADAS      TO SGC-QT-REGS-GRAV
           MOVE WS-QT-ERROS            TO SGC-QT-REGS-REJ
           MOVE WS-RC                  TO SGC-RETURN-CODE
           IF SGC-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0100 CONCLUIDO'
                                       TO SGC-MENSAGEM
           END-IF
           MOVE WS-RC                  TO RETURN-CODE.
       9000-FIM. EXIT.
