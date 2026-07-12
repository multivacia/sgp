       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0070.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0070                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: APLICACAO DE PAGAMENTOS APROVADOS EM SGCB0040     *
      *             SOBRE PARCELAS EM ABERTO/PARCIAL/VENCIDA.         *
      *             GERA ARQUIVOS DE APLICADOS (SGLPAGAP) E           *
      *             PENDENTES (SGLPAGPD), ALEM DE HISTORICO           *
      *             FINANCEIRO EM DB2.                                *
      *---------------------------------------------------------------*
      * DEPENDENCIAS DE PROGRAMA (CALL ESTATICO):                     *
      *   SGCB0080 - CONSULTA CONTRATO+CLIENTE (LK-CTR-AREA + AREAS)  *
      *   SGCB0090 - CONSULTA PARCELA         (LK-PAR-AREA + AREAS)   *
      *   SGCB0110 - MOTOR DE CALCULO FINANCEIRO (SGFINANC)           *
      *   SGCB0120 - RECALCULO DE SALDO       (LK-CTR-AREA + SGCOMMAR)*
      *---------------------------------------------------------------*
      * ENTRADA .: DDNAME SGLPAGVL (FB LRECL 150)                     *
      * SAIDA   .: DDNAME SGLPAGAP (FB LRECL 200)                     *
      *            DDNAME SGLPAGPD (FB LRECL 180)                     *
      *---------------------------------------------------------------*
      * REGRAS DE APLICACAO:                                          *
      *   - SE VALOR-PAGO >= (SALDO + JUROS + MULTA) -> LIQUIDADA     *
      *     E EXCESSO E REGISTRADO EM PAGAP-DET-VLR-EXCESSO.          *
      *   - SE VALOR-PAGO <  (SALDO + JUROS + MULTA) -> PARCIAL       *
      *   - APOS APLICAR, RECALCULA SALDO DO CONTRATO (OPCIONAL).     *
      *---------------------------------------------------------------*
      * NOTA .: A ALIQUOTA DE MULTA MENCIONADA NO REGULAMENTO 2%      *
      *         E FORNECIDA PELO PARAMETRO DB2 PC_MULTA CARREGADO     *
      *         VIA SGCB0080. O CODIGO SEMPRE USA O VALOR VINDO DO    *
      *         DB2, NAO O LITERAL 2% ACIMA.                          *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (PAGAMENTOS PENDENTES GERADOS)                   *
      *   08 - ERRO FUNCIONAL (CONTRATO/PARCELA NAO ENCONTRADA)       *
      *   12 - ERRO TECNICO (FILE STATUS / SQLCODE)                   *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SGLPAGVL-FILE
                  ASSIGN TO SGLPAGVL
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-PAGVL.
      *
           SELECT SGLPAGAP-FILE
                  ASSIGN TO SGLPAGAP
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-PAGAP.
      *
           SELECT SGLPAGPD-FILE
                  ASSIGN TO SGLPAGPD
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-PAGPD.
      *
       DATA DIVISION.
       FILE SECTION.
       FD  SGLPAGVL-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPAGVL.
      *
       FD  SGLPAGAP-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPAGAP.
      *
       FD  SGLPAGPD-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPAGPD.
      *
       WORKING-STORAGE SECTION.
      *---- COMUNICACAO SQL ------------------------------------------*
           EXEC SQL INCLUDE SQLCA END-EXEC.
      *---- DCLGENS UTILIZADAS ---------------------------------------*
           EXEC SQL INCLUDE DCLSGCTR END-EXEC.
           EXEC SQL INCLUDE DCLSGPAR END-EXEC.
           EXEC SQL INCLUDE DCLSGPAG END-EXEC.
           EXEC SQL INCLUDE DCLSGHFI END-EXEC.
      *---- CODIGOS E MENSAGENS PADRAO -------------------------------*
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
      *---------------------------------------------------------------*
      * STATUS DE ARQUIVO                                             *
      *---------------------------------------------------------------*
       01  WS-FILE-STATUS.
           05  WS-FS-PAGVL               PIC X(02) VALUE '00'.
               88  FS-PAGVL-OK                    VALUE '00'.
               88  FS-PAGVL-EOF                   VALUE '10'.
           05  WS-FS-PAGAP               PIC X(02) VALUE '00'.
               88  FS-PAGAP-OK                    VALUE '00'.
           05  WS-FS-PAGPD               PIC X(02) VALUE '00'.
               88  FS-PAGPD-OK                    VALUE '00'.
      *
      *---------------------------------------------------------------*
      * CONTROLE GERAL                                                *
      *---------------------------------------------------------------*
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0070'.
           05  WS-SQLCODE-DISP           PIC -9(9).
           05  WS-USUARIO                PIC X(30)
                                          VALUE 'SGCB0070-BATCH'.
           05  WS-USR-LEN                PIC S9(4) COMP  VALUE +14.
           05  WS-DT-PROC                PIC 9(08)       VALUE ZEROES.
           05  WS-HR-PROC                PIC 9(06)       VALUE ZEROES.
           05  WS-LIMITE-COMMIT          PIC 9(05)       VALUE 00500.
           05  WS-QT-DESDE-COMMIT        PIC 9(05)       VALUE ZEROES.
      *
       01  WS-CONTADORES.
           05  WS-QT-LIDOS               PIC 9(09) VALUE ZEROES.
           05  WS-QT-APLICADOS           PIC 9(09) VALUE ZEROES.
           05  WS-QT-PENDENTES           PIC 9(09) VALUE ZEROES.
           05  WS-QT-REJEITADOS          PIC 9(09) VALUE ZEROES.
           05  WS-SOMA-APLICADOS         PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-SOMA-JUROS             PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-SOMA-MULTA             PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-SOMA-VALIDOS           PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
      *
       01  WS-FLAGS.
           05  WS-FL-EOF                 PIC X(01) VALUE 'N'.
               88  WS-EOF-PAGVL                   VALUE 'S'.
               88  WS-NAO-EOF-PAGVL               VALUE 'N'.
           05  WS-FL-ABORT               PIC X(01) VALUE 'N'.
               88  WS-DEVE-ABORTAR                VALUE 'S'.
           05  WS-FL-APLICOU             PIC X(01) VALUE 'N'.
      *
      *---------------------------------------------------------------*
      * AREA DE TRABALHO DE APLICACAO                                 *
      *---------------------------------------------------------------*
       01  WS-APLIC.
           05  WS-VLR-ENCARGO-TOTAL      PIC S9(13)V99 COMP-3.
           05  WS-VLR-DEVIDO             PIC S9(13)V99 COMP-3.
           05  WS-VLR-BAIXA-PRINC        PIC S9(13)V99 COMP-3.
           05  WS-VLR-BAIXA-JUROS        PIC S9(13)V99 COMP-3.
           05  WS-VLR-BAIXA-MULTA        PIC S9(13)V99 COMP-3.
           05  WS-VLR-EXCESSO            PIC S9(13)V99 COMP-3.
           05  WS-VLR-SALDO-NOVO         PIC S9(13)V99 COMP-3.
           05  WS-ST-PAR-NOVA-DB         PIC X(02).
           05  WS-SIT-PAR-CANONICA       PIC X(10).
           05  WS-IND-PARCIAL-APLIC      PIC X(01).
           05  WS-CTR-CHAR15             PIC X(15).
      *
       01  WS-MOTIVOS.
           05  WS-CD-MOTIVO              PIC X(20).
           05  WS-DS-MOTIVO              PIC X(40).
      *
      *---------------------------------------------------------------*
      * FLAG DE PARAMETRO DB2 - CONTROLE DE RECALCULO OPCIONAL        *
      *   O CHAMADOR PODE DESABILITAR SGCB0120 VIA SG_PARAMETRO       *
      *   CD_PARAMETRO = 'FL-RECALC-SALDO' (VALOR 'S'/'N').           *
      *---------------------------------------------------------------*
       01  WS-PARM-DB2.
           05  WS-FL-RECALC-SALDO        PIC X(01) VALUE 'S'.
               88  WS-FAZ-RECALC                  VALUE 'S'.
               88  WS-NAO-FAZ-RECALC              VALUE 'N'.
           05  WS-VR-PARM-DB2            PIC X(30) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * AREAS PARA CALL DE SUBROTINAS                                 *
      *---------------------------------------------------------------*
       01  WS-CALL-CTR.
           05  LK-CTR-ID-CONTRATO        PIC X(15).
           05  LK-CTR-IND-EXISTE         PIC X(01).
           05  LK-CTR-IND-BLOQUEADO      PIC X(01).
           05  LK-CTR-IND-RENEG-ATIVA    PIC X(01).
           05  LK-CTR-RETURN-CODE        PIC 9(02).
           05  LK-CTR-MENSAGEM           PIC X(80).
      *
       01  WS-CALL-PAR.
           05  LK-PAR-ID-CONTRATO        PIC X(15).
           05  LK-PAR-NR-PARCELA         PIC 9(03).
           05  LK-PAR-IND-EXISTE         PIC X(01).
           05  LK-PAR-RETURN-CODE        PIC 9(02).
           05  LK-PAR-MENSAGEM           PIC X(80).
      *
       01  WS-CALL-REC.
           05  LK-REC-ID-CONTRATO        PIC X(15).
           05  LK-REC-VR-SALDO-CALC      PIC S9(13)V99 COMP-3.
           05  LK-REC-QT-ABERTAS-CALC    PIC 9(04).
           05  LK-REC-QT-VENCIDAS-CALC   PIC 9(04).
           05  LK-REC-ST-CONTRATO-NOVO   PIC X(02).
           05  LK-REC-IND-ENCERRADO      PIC X(01).
           05  LK-REC-RETURN-CODE        PIC 9(02).
           05  LK-REC-MENSAGEM           PIC X(80).
      *
      *---- AREAS CANONICAS DEVOLVIDAS PELAS SUBROTINAS --------------*
       COPY SGCTRDAT.
       COPY SGCLIDAT.
       COPY SGPARDAT.
      *---- AREA DE COMUNICACAO -------------------------------------*
       COPY SGCOMMAR.
      *---- AREAS DE MOTOR FINANCEIRO / DATAS -----------------------*
       COPY SGFINANC.
      *
      *---------------------------------------------------------------*
       PROCEDURE DIVISION.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           IF WS-DEVE-ABORTAR
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 1500-CARREGAR-PARM-DB2
           PERFORM 2000-ABRIR-ARQUIVOS
           IF WS-DEVE-ABORTAR
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 2100-GRAVAR-HEADERS
      *
           PERFORM 3000-LOOP-PROCESSAR
              UNTIL WS-EOF-PAGVL OR WS-DEVE-ABORTAR
      *
           PERFORM 8000-GRAVAR-TRAILERS
           PERFORM 8500-COMMIT-FINAL
           PERFORM 8900-FECHAR-ARQUIVOS
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
           MOVE 'N'                      TO WS-FL-EOF
           MOVE 'N'                      TO WS-FL-ABORT
           MOVE ZEROES                   TO WS-QT-LIDOS
                                            WS-QT-APLICADOS
                                            WS-QT-PENDENTES
                                            WS-QT-REJEITADOS
                                            WS-SOMA-APLICADOS
                                            WS-SOMA-JUROS
                                            WS-SOMA-MULTA
                                            WS-SOMA-VALIDOS
                                            WS-QT-DESDE-COMMIT.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * LE UM PARAMETRO OPCIONAL DE SG_PARAMETRO PARA CONTROLAR SE    *
      * O RECALCULO DE SALDO POR SGCB0120 SERA EXECUTADO.             *
      *---------------------------------------------------------------*
       1500-CARREGAR-PARM-DB2 SECTION.
           MOVE 15                       TO SGPRM-CD-PRM-LEN
           MOVE 'FL-RECALC-SALDO'        TO SGPRM-CD-PRM-TXT
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
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    MOVE SGPRM-VR-PRM-TXT       TO WS-VR-PARM-DB2
                    IF WS-VR-PARM-DB2 (1:1) = 'N'
                       MOVE 'N' TO WS-FL-RECALC-SALDO
                    ELSE
                       MOVE 'S' TO WS-FL-RECALC-SALDO
                    END-IF
               WHEN SQLCODE = +100
                    MOVE 'S'                    TO WS-FL-RECALC-SALDO
               WHEN OTHER
                    PERFORM 8800-TRATAR-SQLCODE
                    MOVE 'N' TO WS-FL-RECALC-SALDO
           END-EVALUATE.
       1500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-ARQUIVOS SECTION.
      *---------------------------------------------------------------*
           OPEN INPUT  SGLPAGVL-FILE
           IF NOT FS-PAGVL-OK
              MOVE SG-CT-RC-ERR-TEC        TO WS-RC
              MOVE 'S'                     TO WS-FL-ABORT
              STRING '12-FILE OPEN SGLPAGVL FS='  DELIMITED BY SIZE
                     WS-FS-PAGVL                  DELIMITED BY SIZE
                INTO SGC-MENSAGEM
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLPAGAP-FILE
           IF NOT FS-PAGAP-OK
              MOVE SG-CT-RC-ERR-TEC        TO WS-RC
              MOVE 'S'                     TO WS-FL-ABORT
              STRING '12-FILE OPEN SGLPAGAP FS='  DELIMITED BY SIZE
                     WS-FS-PAGAP                  DELIMITED BY SIZE
                INTO SGC-MENSAGEM
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLPAGPD-FILE
           IF NOT FS-PAGPD-OK
              MOVE SG-CT-RC-ERR-TEC        TO WS-RC
              MOVE 'S'                     TO WS-FL-ABORT
              STRING '12-FILE OPEN SGLPAGPD FS='  DELIMITED BY SIZE
                     WS-FS-PAGPD                  DELIMITED BY SIZE
                INTO SGC-MENSAGEM
           END-IF.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2100-GRAVAR-HEADERS SECTION.
      *---------------------------------------------------------------*
           MOVE SPACES                   TO REG-SGLPAGAP
           MOVE 'H'                      TO PAGAP-HDR-TIPO
           MOVE WS-DT-PROC               TO PAGAP-HDR-DT-PROC
           MOVE 'SGCB0070'               TO PAGAP-HDR-PROG-ORIGEM
           MOVE ZEROES                   TO PAGAP-HDR-QTD-APLICADOS
                                            PAGAP-HDR-SOMA-APLICADOS
           MOVE REG-SGLPAGAP-HDR         TO REG-SGLPAGAP
           WRITE REG-SGLPAGAP
      *
           MOVE SPACES                   TO REG-SGLPAGPD
           MOVE 'H'                      TO PAGPD-HDR-TIPO
           MOVE WS-DT-PROC               TO PAGPD-HDR-DT-PROC
           MOVE 'SGCB0070'               TO PAGPD-HDR-PROG-ORIGEM
           MOVE ZEROES                   TO PAGPD-HDR-QTD-PENDENTES
           MOVE REG-SGLPAGPD-HDR         TO REG-SGLPAGPD
           WRITE REG-SGLPAGPD.
       2100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3000-LOOP-PROCESSAR SECTION.
      *---------------------------------------------------------------*
           READ SGLPAGVL-FILE
              AT END
                 MOVE 'S' TO WS-FL-EOF
                 GO TO 3000-FIM
           END-READ
      *
           IF NOT FS-PAGVL-OK AND NOT FS-PAGVL-EOF
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              MOVE 'S'                    TO WS-FL-ABORT
              STRING '12-READ SGLPAGVL FS='  DELIMITED BY SIZE
                     WS-FS-PAGVL             DELIMITED BY SIZE
                INTO SGC-MENSAGEM
              GO TO 3000-FIM
           END-IF
      *
           EVALUATE TRUE
               WHEN PAGVL-E-HEADER
                    CONTINUE
               WHEN PAGVL-E-TRAILER
                    CONTINUE
               WHEN PAGVL-E-DETAIL
                    ADD 1                    TO WS-QT-LIDOS
                    ADD PAGVL-DET-VALOR      TO WS-SOMA-VALIDOS
                    PERFORM 4000-APLICAR-PAGTO
                    IF WS-QT-DESDE-COMMIT >= WS-LIMITE-COMMIT
                       PERFORM 8600-COMMIT-PARCIAL
                    END-IF
           END-EVALUATE.
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * APLICACAO DO PAGAMENTO CORRENTE - REGRA CENTRAL DO PROGRAMA   *
      *---------------------------------------------------------------*
       4000-APLICAR-PAGTO SECTION.
           MOVE 'N'                      TO WS-FL-APLICOU
           MOVE SPACES                   TO WS-CD-MOTIVO
                                            WS-DS-MOTIVO
      *
           PERFORM 4100-CONSULTAR-CONTRATO
           IF LK-CTR-RETURN-CODE NOT = 0
              PERFORM 4900-GRAVAR-PENDENTE
              GO TO 4000-FIM
           END-IF
      *
           PERFORM 4200-CONSULTAR-PARCELA
           IF LK-PAR-RETURN-CODE NOT = 0
              PERFORM 4900-GRAVAR-PENDENTE
              GO TO 4000-FIM
           END-IF
      *
      *    NAO APLICAR EM PARCELAS JA LIQUIDADAS OU CANCELADAS
           IF SG-PAR-LIQUIDADA OR SG-PAR-CANCELADA
              MOVE 'PAR-JA-LIQUID'     TO WS-CD-MOTIVO
              MOVE 'PARCELA JA LIQUIDADA/CANCELADA'
                                       TO WS-DS-MOTIVO
              PERFORM 4900-GRAVAR-PENDENTE
              GO TO 4000-FIM
           END-IF
      *
      *    SE CONTRATO BLOQUEADO E NAO E CANAL FORCADO, PENDENTE
           IF LK-CTR-IND-BLOQUEADO = 'S'
              MOVE 'CTR-BLOQUEADO'     TO WS-CD-MOTIVO
              MOVE 'CONTRATO BLOQUEADO - APLICACAO SUSPENSA'
                                       TO WS-DS-MOTIVO
              PERFORM 4900-GRAVAR-PENDENTE
              GO TO 4000-FIM
           END-IF
      *
      *    CALCULA ENCARGOS SE HOUVER DIAS DE ATRASO
           MOVE ZEROES                 TO WS-VLR-BAIXA-JUROS
                                          WS-VLR-BAIXA-MULTA
           IF SG-PAR-DIAS-ATRASO > 0
              PERFORM 4300-CALCULAR-ENCARGOS
           END-IF
      *
      *    CALCULA VALOR DEVIDO E BAIXAS
           PERFORM 4400-CALCULAR-BAIXAS
      *
      *    APLICA EM DB2 (UPDATE PARCELA + INSERT PAGAMENTO + HIST)
           PERFORM 4500-UPDATE-PARCELA
           IF WS-RC >= 08
              PERFORM 4900-GRAVAR-PENDENTE
              GO TO 4000-FIM
           END-IF
      *
           PERFORM 4600-INSERT-PAGAMENTO
           IF WS-RC >= 08
              PERFORM 4900-GRAVAR-PENDENTE
              GO TO 4000-FIM
           END-IF
      *
           PERFORM 4700-INSERT-HIST-FINANC
      *
      *    RECALCULO DE SALDO E OPCIONAL - CONTROLADO POR PARAMETRO
           IF WS-FAZ-RECALC
              PERFORM 4800-RECALCULAR-SALDO
           END-IF
      *
           MOVE 'S'                    TO WS-FL-APLICOU
           ADD 1                       TO WS-QT-APLICADOS
           ADD 1                       TO WS-QT-DESDE-COMMIT
           ADD PAGVL-DET-VALOR         TO WS-SOMA-APLICADOS
           ADD WS-VLR-BAIXA-JUROS      TO WS-SOMA-JUROS
           ADD WS-VLR-BAIXA-MULTA      TO WS-SOMA-MULTA
      *
           PERFORM 4950-GRAVAR-APLICADO.
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4100-CONSULTAR-CONTRATO SECTION.
      *---------------------------------------------------------------*
           MOVE ZEROES                 TO WS-CTR-CHAR15
           MOVE PAGVL-DET-ID-CONTRATO  TO WS-CTR-CHAR15 (4:12)
           MOVE WS-CTR-CHAR15          TO LK-CTR-ID-CONTRATO
           MOVE 'N'                    TO LK-CTR-IND-EXISTE
                                          LK-CTR-IND-BLOQUEADO
                                          LK-CTR-IND-RENEG-ATIVA
           MOVE ZEROES                 TO LK-CTR-RETURN-CODE
           MOVE SPACES                 TO LK-CTR-MENSAGEM
      *
           CALL 'SGCB0080' USING WS-CALL-CTR
                                 SGCTRDAT
                                 SGCLIDAT
                                 SGCOMMAR
      *
           IF LK-CTR-RETURN-CODE NOT = 0
              MOVE 'CTR-NAO-LOCALIZ'   TO WS-CD-MOTIVO
              MOVE LK-CTR-MENSAGEM (1:40)
                                       TO WS-DS-MOTIVO
           END-IF.
       4100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4200-CONSULTAR-PARCELA SECTION.
      *---------------------------------------------------------------*
           MOVE WS-CTR-CHAR15          TO LK-PAR-ID-CONTRATO
           MOVE PAGVL-DET-NR-PARCELA   TO LK-PAR-NR-PARCELA
           MOVE 'N'                    TO LK-PAR-IND-EXISTE
           MOVE ZEROES                 TO LK-PAR-RETURN-CODE
           MOVE SPACES                 TO LK-PAR-MENSAGEM
      *
           CALL 'SGCB0090' USING WS-CALL-PAR
                                 SGPARDAT
                                 SGCOMMAR
      *
           IF LK-PAR-RETURN-CODE NOT = 0
              MOVE 'PAR-NAO-LOCALIZ'   TO WS-CD-MOTIVO
              MOVE LK-PAR-MENSAGEM (1:40)
                                       TO WS-DS-MOTIVO
           END-IF.
       4200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4300-CALCULAR-ENCARGOS SECTION.
      *---------------------------------------------------------------*
           INITIALIZE SGFINANC
           MOVE SG-PAR-VLR-SALDO       TO SG-FIN-PRINCIPAL
           MOVE SG-PAR-DIAS-ATRASO     TO SG-FIN-DIAS-ATRASO
           MOVE SG-CTR-TAXA-JUROS      TO SG-FIN-TAXA-MENSAL
           MOVE SG-CTR-PCT-MULTA       TO SG-FIN-PCT-MULTA
           MOVE SG-CTR-TIPO-CTR        TO SG-FIN-TIPO-CTR
      *    TIPO DE CLIENTE VEM DA AREA DEVOLVIDA PELO SGCB0080
           MOVE SG-CLI-TIPO-CLI        TO SG-FIN-TIPO-CLI
           MOVE SG-PAR-IND-PARCIAL     TO SG-FIN-IND-PARCIAL
           MOVE 'N'                    TO SG-FIN-IND-SIMULACAO
           MOVE SG-PAR-DT-VCTO         TO SG-FIN-DT-VCTO
           MOVE WS-DT-PROC             TO SG-FIN-DT-BASE
      *
           CALL 'SGCB0110' USING SGFINANC
      *
           IF SG-FIN-RETURN-CODE >= 08
              MOVE ZEROES              TO WS-VLR-BAIXA-JUROS
                                          WS-VLR-BAIXA-MULTA
           ELSE
              MOVE SG-FIN-JUROS        TO WS-VLR-BAIXA-JUROS
              MOVE SG-FIN-MULTA        TO WS-VLR-BAIXA-MULTA
           END-IF.
       4300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * CALCULA VALOR DEVIDO (SALDO + JUROS + MULTA), DECIDE          *
      * LIQUIDACAO/PARCIAL E DISTRIBUI O VALOR PAGO NAS BAIXAS.       *
      * REGRA COMENTADA: MULTA FIXA DE 2% - NA REALIDADE USAMOS       *
      * SG-CTR-PCT-MULTA VINDO DO DB2, JA APLICADO EM 4300.           *
      *---------------------------------------------------------------*
       4400-CALCULAR-BAIXAS SECTION.
           COMPUTE WS-VLR-ENCARGO-TOTAL =
                   WS-VLR-BAIXA-JUROS + WS-VLR-BAIXA-MULTA
           COMPUTE WS-VLR-DEVIDO =
                   SG-PAR-VLR-SALDO + WS-VLR-ENCARGO-TOTAL
      *
           IF PAGVL-DET-VALOR >= WS-VLR-DEVIDO
              MOVE SG-PAR-VLR-SALDO    TO WS-VLR-BAIXA-PRINC
              COMPUTE WS-VLR-EXCESSO   =
                      PAGVL-DET-VALOR - WS-VLR-DEVIDO
              MOVE ZEROES              TO WS-VLR-SALDO-NOVO
              MOVE 'PG'                TO WS-ST-PAR-NOVA-DB
              MOVE 'LIQUIDADA '        TO WS-SIT-PAR-CANONICA
              MOVE 'N'                 TO WS-IND-PARCIAL-APLIC
           ELSE
      *       PAGAMENTO PARCIAL - PRIORIZA JUROS/MULTA E DEPOIS PRINC.
              IF PAGVL-DET-VALOR <= WS-VLR-ENCARGO-TOTAL
                 MOVE ZEROES           TO WS-VLR-BAIXA-PRINC
                 COMPUTE WS-VLR-BAIXA-JUROS =
                         FUNCTION MIN(WS-VLR-BAIXA-JUROS
                                      PAGVL-DET-VALOR)
                 COMPUTE WS-VLR-BAIXA-MULTA =
                         PAGVL-DET-VALOR - WS-VLR-BAIXA-JUROS
                 MOVE SG-PAR-VLR-SALDO TO WS-VLR-SALDO-NOVO
              ELSE
                 COMPUTE WS-VLR-BAIXA-PRINC =
                         PAGVL-DET-VALOR - WS-VLR-ENCARGO-TOTAL
                 COMPUTE WS-VLR-SALDO-NOVO =
                         SG-PAR-VLR-SALDO - WS-VLR-BAIXA-PRINC
              END-IF
              MOVE ZEROES              TO WS-VLR-EXCESSO
              MOVE 'PP'                TO WS-ST-PAR-NOVA-DB
              MOVE 'PARCIAL   '        TO WS-SIT-PAR-CANONICA
              MOVE 'S'                 TO WS-IND-PARCIAL-APLIC
           END-IF.
       4400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4500-UPDATE-PARCELA SECTION.
      *---------------------------------------------------------------*
           MOVE WS-CTR-CHAR15          TO SGPAR-ID-CTR-TXT
           MOVE 15                     TO SGPAR-ID-CTR-LEN
           MOVE PAGVL-DET-NR-PARCELA   TO SGPAR-NR-PARCELA
           MOVE WS-VLR-SALDO-NOVO      TO SGPAR-VR-SALDO
           MOVE WS-VLR-BAIXA-JUROS     TO SGPAR-VR-JUROS
           MOVE WS-VLR-BAIXA-MULTA     TO SGPAR-VR-MULTA
           MOVE WS-ST-PAR-NOVA-DB      TO SGPAR-ST-PARCELA
           MOVE WS-USR-LEN             TO SGPAR-USR-ALT-LEN
           MOVE WS-USUARIO             TO SGPAR-USR-ALT-TXT
      *
           EXEC SQL
             UPDATE SIGEC.SG_PARCELA
                SET VR_SALDO          = :SGPAR-VR-SALDO,
                    VR_JUROS          = :SGPAR-VR-JUROS,
                    VR_MULTA          = :SGPAR-VR-MULTA,
                    ST_PARCELA        = :SGPAR-ST-PARCELA,
                    DT_ULTIMO_PAGTO   = CURRENT DATE,
                    DIAS_ATRASO       = 0,
                    DH_ALTERACAO      = CURRENT TIMESTAMP,
                    USUARIO_ALTERACAO = :SGPAR-USUARIO-ALTERACAO
              WHERE ID_CONTRATO       = :SGPAR-ID-CONTRATO
                AND NR_PARCELA        = :SGPAR-NR-PARCELA
                AND SITUACAO_REG      = 'A'
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    CONTINUE
               WHEN SQLCODE = +100
                    MOVE SG-CT-RC-ERR-FUNC TO WS-RC
                    MOVE 'PAR-UPD-NAO-ATU'  TO WS-CD-MOTIVO
                    MOVE 'PARCELA DESAPARECEU ENTRE SELECT E UPDATE'
                                            TO WS-DS-MOTIVO
               WHEN OTHER
                    PERFORM 8800-TRATAR-SQLCODE
                    MOVE 'DB2-UPD-PARCELA'  TO WS-CD-MOTIVO
                    MOVE 'ERRO DB2 NO UPDATE DE PARCELA'
                                            TO WS-DS-MOTIVO
           END-EVALUATE.
       4500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4600-INSERT-PAGAMENTO SECTION.
      *---------------------------------------------------------------*
           MOVE WS-CTR-CHAR15          TO SGPAG-ID-CTR-TXT
           MOVE 15                     TO SGPAG-ID-CTR-LEN
           MOVE PAGVL-DET-NR-PARCELA   TO SGPAG-NR-PARCELA
           MOVE PAGVL-DET-VALOR        TO SGPAG-VR-PAGO
           MOVE PAGVL-DET-CANAL        TO SGPAG-CD-CANAL
           MOVE PAGVL-DET-NR-DOC-PAGTO TO SGPAG-NR-DOC-TXT
           MOVE 20                     TO SGPAG-NR-DOC-LEN
           MOVE 'AP'                   TO SGPAG-ST-PAGAMENTO
           COMPUTE SGPAG-VR-DIFERENCA =
                   PAGVL-DET-VALOR - WS-VLR-DEVIDO
           MOVE WS-USR-LEN             TO SGPAG-USR-INC-LEN
           MOVE WS-USUARIO             TO SGPAG-USR-INC-TXT
           MOVE 'A'                    TO SGPAG-SITUACAO-REG
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_PAGAMENTO
                    (ID_PAGAMENTO,
                     ID_CONTRATO,
                     NR_PARCELA,
                     VR_PAGO,
                     DT_PAGAMENTO,
                     CD_CANAL,
                     NR_DOC_PAGTO,
                     ST_PAGAMENTO,
                     VR_DIFERENCA,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (NEXT VALUE FOR SIGEC.SEQ_SG_PAGAMENTO,
                     :SGPAG-ID-CONTRATO,
                     :SGPAG-NR-PARCELA,
                     :SGPAG-VR-PAGO,
                     CURRENT DATE,
                     :SGPAG-CD-CANAL,
                     :SGPAG-NR-DOC-PAGTO,
                     :SGPAG-ST-PAGAMENTO,
                     :SGPAG-VR-DIFERENCA,
                     CURRENT TIMESTAMP,
                     :SGPAG-USUARIO-INCLUSAO,
                     'A')
           END-EXEC
      *
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
              MOVE 'DB2-INS-PAGAMENTO'  TO WS-CD-MOTIVO
              MOVE 'ERRO DB2 NO INSERT DE PAGAMENTO'
                                        TO WS-DS-MOTIVO
              MOVE SG-CT-RC-ERR-TEC     TO WS-RC
           ELSE
      *       RECUPERA ID GERADO PARA USO NO HISTORICO
              EXEC SQL
                SELECT IDENTITY_VAL_LOCAL()
                  INTO :SGPAG-ID-PAGAMENTO
                  FROM SYSIBM.SYSDUMMY1
              END-EXEC
           END-IF.
       4600-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4700-INSERT-HIST-FINANC SECTION.
      *---------------------------------------------------------------*
           MOVE WS-CTR-CHAR15          TO SGHFI-ID-CTR-TXT
           MOVE 15                     TO SGHFI-ID-CTR-LEN
           MOVE PAGVL-DET-NR-PARCELA   TO SGHFI-NR-PARCELA
           MOVE SGPAG-ID-PAGAMENTO     TO SGHFI-ID-PAGAMENTO
           MOVE 'PAG'                  TO SGHFI-TP-EVENTO
           MOVE PAGVL-DET-VALOR        TO SGHFI-VR-EVENTO
           MOVE SG-PAR-VLR-SALDO       TO SGHFI-VR-SALDO-ANT
           MOVE WS-VLR-SALDO-NOVO      TO SGHFI-VR-SALDO-NOV
           MOVE SPACES                 TO SGHFI-DS-EVT-TXT
           STRING 'PAG APLICADO CANAL=' DELIMITED BY SIZE
                  PAGVL-DET-CANAL       DELIMITED BY SIZE
                  ' DOC='               DELIMITED BY SIZE
                  PAGVL-DET-NR-DOC-PAGTO
                                        DELIMITED BY SIZE
                  ' SIT='               DELIMITED BY SIZE
                  WS-SIT-PAR-CANONICA   DELIMITED BY SIZE
             INTO SGHFI-DS-EVT-TXT
           END-STRING
           MOVE FUNCTION LENGTH(FUNCTION TRIM(SGHFI-DS-EVT-TXT))
                                        TO SGHFI-DS-EVT-LEN
           MOVE WS-USR-LEN             TO SGHFI-USR-INC-LEN
           MOVE WS-USUARIO             TO SGHFI-USR-INC-TXT
           MOVE 'A'                    TO SGHFI-SITUACAO-REG
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
                     :SGHFI-ID-PAGAMENTO,
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
       4700-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4800-RECALCULAR-SALDO SECTION.
      *---------------------------------------------------------------*
           MOVE WS-CTR-CHAR15          TO LK-REC-ID-CONTRATO
           MOVE ZEROES                 TO LK-REC-VR-SALDO-CALC
                                          LK-REC-QT-ABERTAS-CALC
                                          LK-REC-QT-VENCIDAS-CALC
           MOVE SPACES                 TO LK-REC-ST-CONTRATO-NOVO
                                          LK-REC-MENSAGEM
           MOVE 'N'                    TO LK-REC-IND-ENCERRADO
           MOVE ZEROES                 TO LK-REC-RETURN-CODE
      *
           CALL 'SGCB0120' USING WS-CALL-REC
                                 SGCOMMAR.
       4800-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4900-GRAVAR-PENDENTE SECTION.
      *---------------------------------------------------------------*
           ADD 1                       TO WS-QT-PENDENTES
           MOVE SPACES                 TO REG-SGLPAGPD
           MOVE 'D'                    TO PAGPD-DET-TIPO
           MOVE PAGVL-DET-ID-CONTRATO  TO PAGPD-DET-ID-CONTRATO
           MOVE PAGVL-DET-NR-PARCELA   TO PAGPD-DET-NR-PARCELA
           MOVE PAGVL-DET-VALOR        TO PAGPD-DET-VALOR
           MOVE PAGVL-DET-DATA-PAGTO   TO PAGPD-DET-DATA-PAGTO
           MOVE PAGVL-DET-CANAL        TO PAGPD-DET-CANAL
           MOVE PAGVL-DET-NR-DOC-PAGTO TO PAGPD-DET-NR-DOC-PAGTO
           MOVE WS-CD-MOTIVO           TO PAGPD-DET-CD-MOTIVO
           MOVE WS-DS-MOTIVO           TO PAGPD-DET-MOTIVO
           MOVE WS-DT-PROC             TO PAGPD-DET-DT-INCLUSAO
           MOVE 1                      TO PAGPD-DET-QTD-TENTATIVAS
           MOVE WS-DT-PROC             TO PAGPD-DET-DT-ULT-TENT
           MOVE 'PENDENTE  '           TO PAGPD-DET-STATUS
           MOVE REG-SGLPAGPD-DET       TO REG-SGLPAGPD
           WRITE REG-SGLPAGPD
           IF NOT FS-PAGPD-OK
              MOVE SG-CT-RC-ERR-TEC    TO WS-RC
              STRING '12-WRITE SGLPAGPD FS=' DELIMITED BY SIZE
                     WS-FS-PAGPD             DELIMITED BY SIZE
                INTO SGC-MENSAGEM
              MOVE 'S'                 TO WS-FL-ABORT
           END-IF.
       4900-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4950-GRAVAR-APLICADO SECTION.
      *---------------------------------------------------------------*
           MOVE SPACES                 TO REG-SGLPAGAP
           MOVE 'D'                    TO PAGAP-DET-TIPO
           MOVE PAGVL-DET-ID-CONTRATO  TO PAGAP-DET-ID-CONTRATO
           MOVE SGPAG-ID-PAGAMENTO     TO PAGAP-DET-ID-PARCELA
           MOVE PAGVL-DET-NR-PARCELA   TO PAGAP-DET-NR-PARCELA
           MOVE PAGVL-DET-VALOR        TO PAGAP-DET-VALOR-PAGO
           MOVE WS-VLR-BAIXA-JUROS     TO PAGAP-DET-VLR-JUROS-BX
           MOVE WS-VLR-BAIXA-MULTA     TO PAGAP-DET-VLR-MULTA-BX
           MOVE WS-VLR-BAIXA-PRINC     TO PAGAP-DET-VLR-PRINC-BX
           MOVE WS-VLR-SALDO-NOVO      TO PAGAP-DET-SALDO-REMANESC
           MOVE PAGVL-DET-DATA-PAGTO   TO PAGAP-DET-DATA-PAGTO
           MOVE WS-DT-PROC             TO PAGAP-DET-DT-APLICACAO
           MOVE WS-HR-PROC             TO PAGAP-DET-HR-APLICACAO
           MOVE PAGVL-DET-CANAL        TO PAGAP-DET-CANAL
           MOVE PAGVL-DET-NR-DOC-PAGTO TO PAGAP-DET-NR-DOC-PAGTO
           MOVE WS-SIT-PAR-CANONICA    TO PAGAP-DET-SIT-PAR-NOVA
           IF WS-VLR-EXCESSO > 0
              MOVE 'S'                 TO PAGAP-DET-FL-EXCESSO
              MOVE WS-VLR-EXCESSO      TO PAGAP-DET-VLR-EXCESSO
           ELSE
              MOVE 'N'                 TO PAGAP-DET-FL-EXCESSO
              MOVE ZEROES              TO PAGAP-DET-VLR-EXCESSO
           END-IF
           MOVE REG-SGLPAGAP-DET       TO REG-SGLPAGAP
           WRITE REG-SGLPAGAP
           IF NOT FS-PAGAP-OK
              MOVE SG-CT-RC-ERR-TEC    TO WS-RC
              STRING '12-WRITE SGLPAGAP FS=' DELIMITED BY SIZE
                     WS-FS-PAGAP             DELIMITED BY SIZE
                INTO SGC-MENSAGEM
              MOVE 'S'                 TO WS-FL-ABORT
           END-IF.
       4950-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8000-GRAVAR-TRAILERS SECTION.
      *---------------------------------------------------------------*
           MOVE SPACES                 TO REG-SGLPAGAP
           MOVE 'T'                    TO PAGAP-TRL-TIPO
           MOVE WS-QT-APLICADOS        TO PAGAP-TRL-QTD-REGS
           MOVE WS-SOMA-APLICADOS      TO PAGAP-TRL-SOMA-VALORES
           MOVE WS-SOMA-JUROS          TO PAGAP-TRL-SOMA-JUROS
           MOVE WS-SOMA-MULTA          TO PAGAP-TRL-SOMA-MULTA
           MOVE WS-DT-PROC             TO PAGAP-TRL-DT-PROC
           MOVE REG-SGLPAGAP-TRL       TO REG-SGLPAGAP
           WRITE REG-SGLPAGAP
      *
           MOVE SPACES                 TO REG-SGLPAGPD
           MOVE 'T'                    TO PAGPD-TRL-TIPO
           MOVE WS-QT-PENDENTES        TO PAGPD-TRL-QTD-REGS
           MOVE ZEROES                 TO PAGPD-TRL-SOMA-VALORES
           MOVE WS-DT-PROC             TO PAGPD-TRL-DT-PROC
           MOVE REG-SGLPAGPD-TRL       TO REG-SGLPAGPD
           WRITE REG-SGLPAGPD.
       8000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8500-COMMIT-FINAL SECTION.
      *---------------------------------------------------------------*
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
      *---------------------------------------------------------------*
       8800-TRATAR-SQLCODE SECTION.
      *---------------------------------------------------------------*
           MOVE SQLCODE                TO WS-SQLCODE-DISP
           MOVE SG-CT-RC-ERR-TEC       TO WS-RC
           STRING '12-DB2-SQLCODE=' DELIMITED BY SIZE
                  WS-SQLCODE-DISP    DELIMITED BY SIZE
                  ' SGCB0070'        DELIMITED BY SIZE
             INTO SGC-MENSAGEM.
       8800-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8900-FECHAR-ARQUIVOS SECTION.
      *---------------------------------------------------------------*
           CLOSE SGLPAGVL-FILE
           CLOSE SGLPAGAP-FILE
           CLOSE SGLPAGPD-FILE.
       8900-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
      *---------------------------------------------------------------*
           IF WS-QT-PENDENTES > 0 AND WS-RC < 04
              MOVE SG-CT-RC-WARN       TO WS-RC
           END-IF
           MOVE WS-RC                  TO SGC-RETURN-CODE
           MOVE WS-QT-LIDOS            TO SGC-QT-REGS-LIDOS
           MOVE WS-QT-APLICADOS        TO SGC-QT-REGS-GRAV
           MOVE WS-QT-PENDENTES        TO SGC-QT-REGS-REJ
           IF SGC-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0070 CONCLUIDO'
                                       TO SGC-MENSAGEM
           END-IF
           MOVE WS-RC                  TO RETURN-CODE.
       9000-FIM. EXIT.
