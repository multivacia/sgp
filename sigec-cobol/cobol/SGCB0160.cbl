       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0160.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0160                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: GERACAO DE PROPOSTAS DE RENEGOCIACAO A PARTIR DE  *
      *             CONTRATOS INADIMPLENTES ELEGIVEIS. GERA ARQUIVO   *
      *             SGLPROP (RASCUNHO INTERNO) E INTERFACE SGLINTRG   *
      *             (PARA O SISTEMA EXTERNO SGRNG). INSERE UMA        *
      *             RENEGOCIACAO 'PR' (PROPOSTA) POR CONTRATO E UMA   *
      *             LINHA POR OPCAO EM SG_OPCAO_RENEGOCIACAO.         *
      *---------------------------------------------------------------*
      * DEPENDENCIAS DE PROGRAMA (CALL ESTATICO):                     *
      *   SGCB0110 - MOTOR FINANCEIRO (JUROS/MULTA POR OPCAO)         *
      *   SGCB0140 - CLASSIFICACAO DE RISCO                           *
      *   SGCB0180 - UTILITARIO DE DATAS (ADD DIAS PARA VALIDADE)     *
      *---------------------------------------------------------------*
      * CRITERIO DE ELEGIBILIDADE:                                    *
      *   - CLASSIFICACAO_INAD IN ('L','M','G')                       *
      *   - SEM RENEG_ATIVA                                           *
      *   - ST_CONTRATO IN ('AT','IN','CB')                           *
      *---------------------------------------------------------------*
      * PARAMETROS DE POLICY (SG_PARAMETRO):                          *
      *   PCT-ENTRADA-MINIMA (default 10.00)                          *
      *   MAX-PARCELAS-RENEG (default 24)                             *
      *   TAXA-JUROS-RENEG   (default 1.99)                           *
      *   PCT-DESC-MOD / PCT-DESC-GRAVE / PCT-DESC-CRIT               *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (SEM ELEGIVEIS)                                  *
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
           SELECT SGLPROP-FILE
                  ASSIGN TO SGLPROP
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-PROP.
      *
           SELECT SGLINTRG-FILE
                  ASSIGN TO SGLINTRG
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-INTRG.
      *
       DATA DIVISION.
       FILE SECTION.
       FD  SGLPROP-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLPROP.
      *
       FD  SGLINTRG-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLINTRG.
      *
       WORKING-STORAGE SECTION.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE DCLSGCTR END-EXEC.
           EXEC SQL INCLUDE DCLSGREN END-EXEC.
           EXEC SQL INCLUDE DCLSGOPC END-EXEC.
           EXEC SQL INCLUDE DCLSGPRM END-EXEC.
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
       01  WS-FILE-STATUS.
           05  WS-FS-PROP                PIC X(02) VALUE '00'.
               88  FS-PROP-OK                     VALUE '00'.
           05  WS-FS-INTRG               PIC X(02) VALUE '00'.
               88  FS-INTRG-OK                    VALUE '00'.
      *
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0160'.
           05  WS-SQLCODE-DISP           PIC -9(9).
           05  WS-USUARIO                PIC X(30)
                                          VALUE 'SGCB0160-BATCH'.
           05  WS-USR-LEN                PIC S9(4) COMP VALUE +14.
           05  WS-DT-PROC                PIC 9(08)  VALUE ZEROES.
           05  WS-HR-PROC                PIC 9(06)  VALUE ZEROES.
           05  WS-DT-VALIDADE            PIC 9(08)  VALUE ZEROES.
           05  WS-LIMITE-COMMIT          PIC 9(05)  VALUE 00300.
           05  WS-QT-DESDE-COMMIT        PIC 9(05)  VALUE ZEROES.
           05  WS-SEQ-INTRG              PIC 9(09)  VALUE ZEROES.
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
           05  WS-QT-CONTRATOS-OK        PIC 9(09) VALUE ZEROES.
           05  WS-QT-PROPOSTAS           PIC 9(09) VALUE ZEROES.
           05  WS-QT-ERROS               PIC 9(09) VALUE ZEROES.
           05  WS-SOMA-DESCONTO          PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
           05  WS-SOMA-BASE-REN          PIC S9(15)V99 COMP-3
                                                    VALUE ZEROES.
      *
      *---------------------------------------------------------------*
      * POLICY DE RENEGOCIACAO (SG_PARAMETRO)                         *
      *---------------------------------------------------------------*
       01  WS-POLICY.
           05  WS-PCT-ENTRADA-MIN        PIC S9(03)V99 COMP-3
                                                    VALUE 10.00.
           05  WS-MAX-PARCELAS           PIC 9(03) VALUE 024.
           05  WS-TAXA-REN               PIC S9(03)V99 COMP-3
                                                    VALUE 1.99.
           05  WS-PCT-DESC-MOD           PIC S9(03)V99 COMP-3
                                                    VALUE 5.00.
           05  WS-PCT-DESC-GRAVE         PIC S9(03)V99 COMP-3
                                                    VALUE 15.00.
           05  WS-PCT-DESC-CRIT          PIC S9(03)V99 COMP-3
                                                    VALUE 25.00.
           05  WS-DIAS-VALIDADE-PROP     PIC S9(05) COMP-3 VALUE 15.
      *
       01  WS-PARM-BUFFER.
           05  WS-PB-KEY                 PIC X(30).
           05  WS-PB-VAL                 PIC X(100).
      *
      *---------------------------------------------------------------*
      * VARIAVEIS DO CURSOR                                           *
      *---------------------------------------------------------------*
       01  WS-HV.
           05  HV-ID-CONTRATO            PIC X(15).
           05  HV-ID-CLIENTE             PIC S9(18) COMP-3.
           05  HV-TP-CONTRATO            PIC X(02).
           05  HV-VR-SALDO               PIC S9(13)V99 COMP-3.
           05  HV-DIAS-ATRASO-MAX        PIC S9(4)  COMP.
           05  HV-QT-PARC-VENC           PIC S9(4)  COMP.
           05  HV-CLASSIF-INAD           PIC X(01).
           05  HV-TX-JUROS               PIC S9(03)V99 COMP-3.
           05  HV-PC-MULTA               PIC S9(03)V99 COMP-3.
           05  HV-DOCUMENTO              PIC X(14).
           05  HV-NOME                   PIC X(60).
           05  HV-TP-CLIENTE             PIC X(02).
      *
      *---------------------------------------------------------------*
      * CALCULO DE UMA OPCAO                                          *
      *---------------------------------------------------------------*
       01  WS-CALC-OPCAO.
           05  WS-VR-BASE-REN            PIC S9(13)V99 COMP-3.
           05  WS-VR-DESCONTO            PIC S9(13)V99 COMP-3.
           05  WS-PCT-DESC-APLIC         PIC S9(03)V99 COMP-3.
           05  WS-VR-ENTRADA             PIC S9(13)V99 COMP-3.
           05  WS-VR-FINANCIAR           PIC S9(13)V99 COMP-3.
           05  WS-VR-JUROS-OPC           PIC S9(13)V99 COMP-3.
           05  WS-VR-PARCELA             PIC S9(13)V99 COMP-3.
           05  WS-VR-TOTAL               PIC S9(13)V99 COMP-3.
           05  WS-QT-PARC-OPC            PIC S9(4)  COMP.
           05  WS-FAIXA-ORIG             PIC X(08).
      *
      *---------------------------------------------------------------*
      * OPCOES A OFERECER (ATE 3 - LIMITE DO SGLPROP)                 *
      *---------------------------------------------------------------*
       01  WS-OPCOES-TAB.
           05  WS-OPC-QT-PARC   OCCURS 3 TIMES PIC 9(03).
       01  WS-OPCOES-INIT.
           05  FILLER PIC 9(03) VALUE 006.
           05  FILLER PIC 9(03) VALUE 012.
           05  FILLER PIC 9(03) VALUE 024.
      *
       01  WS-ID-RENEG                   PIC S9(18) COMP-3
                                                    VALUE ZEROES.
       01  WS-ID-PROP-SEQ                PIC 9(12)  VALUE ZEROES.
       01  WS-IDX                        PIC 9(02)  VALUE ZEROES.
      *
       COPY SGFINANC.
       COPY SGDATAS.
       COPY SGRISCOM.
       COPY SGCOMMAR.
      *
      *---------------------------------------------------------------*
      * CURSOR DE CONTRATOS ELEGIVEIS                                 *
      *---------------------------------------------------------------*
           EXEC SQL DECLARE C-CTR-ELEG CURSOR WITH HOLD FOR
             SELECT C.ID_CONTRATO,
                    C.ID_CLIENTE,
                    C.TP_CONTRATO,
                    C.VR_SALDO,
                    C.DIAS_ATRASO_MAX,
                    C.QT_PARCELAS_VENCIDAS,
                    C.CLASSIFICACAO_INAD,
                    C.TX_JUROS,
                    C.PC_MULTA,
                    K.NR_DOCUMENTO,
                    K.NM_CLIENTE,
                    K.TP_CLIENTE
               FROM SIGEC.SG_CONTRATO C
               JOIN SIGEC.SG_CLIENTE  K
                 ON K.ID_CLIENTE = C.ID_CLIENTE
                AND K.SITUACAO_REG = 'A'
              WHERE C.SITUACAO_REG          = 'A'
                AND C.IND_RENEGOCIACAO_ATIVA = 'N'
                AND C.CLASSIFICACAO_INAD IN ('L','M','G')
                AND C.ST_CONTRATO IN ('AT','IN','CB')
                AND C.QT_PARCELAS_VENCIDAS > 0
                AND NOT EXISTS
                    (SELECT 1
                       FROM SIGEC.SG_RENEGOCIACAO R
                      WHERE R.ID_CONTRATO = C.ID_CONTRATO
                        AND R.ST_RENEGOCIACAO IN ('AT','PR')
                        AND R.SITUACAO_REG = 'A')
              ORDER BY C.CLASSIFICACAO_INAD DESC,
                       C.DIAS_ATRASO_MAX     DESC,
                       C.ID_CONTRATO
              FOR READ ONLY
           END-EXEC.
      *
       PROCEDURE DIVISION.
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 1500-CARREGAR-POLICY
           PERFORM 1700-CALC-VALIDADE
           PERFORM 2000-ABRIR-SAIDAS
           IF WS-DEVE-ABORTAR
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 2100-GRAVAR-HEADERS
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
           PERFORM 8100-GRAVAR-TRAILERS
           PERFORM 8500-COMMIT-FINAL
           PERFORM 8900-FECHAR-SAIDAS
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
           MOVE 'N'                      TO WS-FL-ABORT
           MOVE WS-OPCOES-INIT           TO WS-OPCOES-TAB.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1500-CARREGAR-POLICY SECTION.
      *---------------------------------------------------------------*
           MOVE 'PCT-ENTRADA-MINIMA'     TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              COMPUTE WS-PCT-ENTRADA-MIN =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF
      *
           MOVE 'MAX-PARCELAS-RENEG'     TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              COMPUTE WS-MAX-PARCELAS =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF
      *
           MOVE 'TAXA-JUROS-RENEG'       TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              COMPUTE WS-TAXA-REN =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF
      *
           MOVE 'PCT-DESC-MOD'           TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              COMPUTE WS-PCT-DESC-MOD =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF
      *
           MOVE 'PCT-DESC-GRAVE'         TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              COMPUTE WS-PCT-DESC-GRAVE =
                      FUNCTION NUMVAL(WS-PB-VAL)
           END-IF
      *
           MOVE 'PCT-DESC-CRIT'          TO WS-PB-KEY
           PERFORM 1550-LE-PARM
           IF SQLCODE = 0
              COMPUTE WS-PCT-DESC-CRIT =
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
      * CALCULA DATA DE VALIDADE DA PROPOSTA (WS-DT-VALIDADE)         *
      * UTILIZANDO SGCB0180 EM MODO 'ADD' COM DIAS CORRIDOS.          *
      *---------------------------------------------------------------*
       1700-CALC-VALIDADE SECTION.
           INITIALIZE SGDATAS
           MOVE 'ADD'                  TO SG-DT-FUNCAO
           MOVE WS-DT-PROC             TO SG-DT-ENTRADA-1
           MOVE WS-DIAS-VALIDADE-PROP  TO SG-DT-QTD-DIAS
           MOVE 'N'                    TO SG-DT-IND-UTEIS
           CALL 'SGCB0180' USING SGDATAS
           IF SG-DT-RETURN-CODE < 08
              MOVE SG-DT-SAIDA         TO WS-DT-VALIDADE
           ELSE
              COMPUTE WS-DT-VALIDADE = WS-DT-PROC + 15
           END-IF.
       1700-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-SAIDAS SECTION.
      *---------------------------------------------------------------*
           OPEN OUTPUT SGLPROP-FILE
           IF NOT FS-PROP-OK
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              MOVE 'S'                    TO WS-FL-ABORT
              STRING '12-FILE OPEN SGLPROP FS='  DELIMITED BY SIZE
                     WS-FS-PROP                  DELIMITED BY SIZE
                INTO SGC-MENSAGEM
              GO TO 2000-FIM
           END-IF
      *
           OPEN OUTPUT SGLINTRG-FILE
           IF NOT FS-INTRG-OK
              MOVE SG-CT-RC-ERR-TEC       TO WS-RC
              MOVE 'S'                    TO WS-FL-ABORT
              STRING '12-FILE OPEN SGLINTRG FS='  DELIMITED BY SIZE
                     WS-FS-INTRG                  DELIMITED BY SIZE
                INTO SGC-MENSAGEM
           END-IF.
       2000-FIM. EXIT.
      *
       2100-GRAVAR-HEADERS SECTION.
           MOVE SPACES                 TO REG-SGLPROP
           MOVE 'H'                    TO PROP-HDR-TIPO
           MOVE WS-DT-PROC             TO PROP-HDR-DT-REF
           MOVE 'SGCB0160'             TO PROP-HDR-PROG-ORIGEM
           MOVE ZEROES                 TO PROP-HDR-QTD-PROPOSTAS
                                          PROP-HDR-QTD-CONTRATOS
           MOVE REG-SGLPROP-HDR        TO REG-SGLPROP
           WRITE REG-SGLPROP
      *
           MOVE SPACES                 TO REG-SGLINTRG
           MOVE 'H'                    TO INTRG-HDR-TIPO
           MOVE 'INTRG '               TO INTRG-HDR-COD-INTERFACE
           MOVE WS-DT-PROC             TO INTRG-HDR-DT-REF
           MOVE WS-HR-PROC             TO INTRG-HDR-HR-GERACAO
           MOVE 'SGCB0160'             TO INTRG-HDR-ORIGEM
           MOVE 'SGRNG   '             TO INTRG-HDR-DESTINO
           MOVE 'V001'                 TO INTRG-HDR-VERSAO
           MOVE ZEROES                 TO INTRG-HDR-QTD-PROPOSTAS
           MOVE REG-SGLINTRG-HDR       TO REG-SGLINTRG
           WRITE REG-SGLINTRG.
       2100-FIM. EXIT.
      *
       2500-ABRIR-CURSOR SECTION.
           EXEC SQL OPEN C-CTR-ELEG END-EXEC
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
             FETCH C-CTR-ELEG
               INTO :HV-ID-CONTRATO,
                    :HV-ID-CLIENTE,
                    :HV-TP-CONTRATO,
                    :HV-VR-SALDO,
                    :HV-DIAS-ATRASO-MAX,
                    :HV-QT-PARC-VENC,
                    :HV-CLASSIF-INAD,
                    :HV-TX-JUROS,
                    :HV-PC-MULTA,
                    :HV-DOCUMENTO,
                    :HV-NOME,
                    :HV-TP-CLIENTE
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    ADD 1 TO WS-QT-LIDOS
                    PERFORM 4000-PROCESSAR-CONTRATO
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
      * PROCESSA UM CONTRATO ELEGIVEL - GERA RENEGOCIACAO E OPCOES    *
      *---------------------------------------------------------------*
       4000-PROCESSAR-CONTRATO SECTION.
      *    CLASSE DE RISCO CORRENTE VIA SGCB0140 (INFORMATIVO)
           PERFORM 4050-CLASSIF-RISCO
      *
           PERFORM 4100-DECIDIR-DESCONTO
      *
      *    INSERE RENEGOCIACAO 'PR' (PROPOSTA)
           PERFORM 4200-INSERT-RENEG
           IF WS-RC >= 12
              ADD 1 TO WS-QT-ERROS
              GO TO 4000-FIM
           END-IF
      *
      *    ITERA AS 3 OPCOES
           PERFORM 4300-GERAR-OPCOES
      *
           ADD 1 TO WS-QT-CONTRATOS-OK.
       4000-FIM. EXIT.
      *
       4050-CLASSIF-RISCO SECTION.
           INITIALIZE SGRISCOM
           MOVE HV-ID-CONTRATO (4:12)  TO SG-RC-CTR-ID
           MOVE HV-ID-CLIENTE          TO SG-RC-CLI-ID
           MOVE HV-TP-CLIENTE          TO SG-RC-TIPO-CLI
           MOVE WS-DT-PROC             TO SG-RC-DT-BASE
           EVALUATE HV-CLASSIF-INAD
              WHEN 'L' MOVE 'LEVE    ' TO SG-RC-FAIXA-INAD-ATU
                       MOVE 'LEVE    ' TO WS-FAIXA-ORIG
              WHEN 'M' MOVE 'MODERADA' TO SG-RC-FAIXA-INAD-ATU
                       MOVE 'MODERADA' TO WS-FAIXA-ORIG
              WHEN 'G' MOVE 'GRAVE   ' TO SG-RC-FAIXA-INAD-ATU
                       MOVE 'GRAVE   ' TO WS-FAIXA-ORIG
              WHEN OTHER
                       MOVE 'CRITICA ' TO SG-RC-FAIXA-INAD-ATU
                       MOVE 'CRITICA ' TO WS-FAIXA-ORIG
           END-EVALUATE
           MOVE HV-DIAS-ATRASO-MAX     TO SG-RC-DIAS-MAX-ATRASO
           MOVE HV-QT-PARC-VENC        TO SG-RC-QT-DIAS-GRAVE-180
           MOVE HV-VR-SALDO            TO SG-RC-VLR-SALDO
           MOVE ZEROES                 TO SG-RC-VLR-ENC-ACUM
           MOVE ' '                    TO SG-RC-RISCO-ANTERIOR
           MOVE 'N'                    TO SG-RC-FL-ES-LIVRE
           CALL 'SGCB0140' USING SGRISCOM.
       4050-FIM. EXIT.
      *
       4100-DECIDIR-DESCONTO SECTION.
           EVALUATE HV-CLASSIF-INAD
              WHEN 'M' MOVE WS-PCT-DESC-MOD   TO WS-PCT-DESC-APLIC
              WHEN 'G' MOVE WS-PCT-DESC-GRAVE TO WS-PCT-DESC-APLIC
              WHEN OTHER MOVE 0.00            TO WS-PCT-DESC-APLIC
           END-EVALUATE
           COMPUTE WS-VR-DESCONTO ROUNDED =
                   HV-VR-SALDO * (WS-PCT-DESC-APLIC / 100)
           COMPUTE WS-VR-BASE-REN =
                   HV-VR-SALDO - WS-VR-DESCONTO
           COMPUTE WS-VR-ENTRADA ROUNDED =
                   WS-VR-BASE-REN * (WS-PCT-ENTRADA-MIN / 100)
           COMPUTE WS-VR-FINANCIAR =
                   WS-VR-BASE-REN - WS-VR-ENTRADA.
       4100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4200-INSERT-RENEG SECTION.
      *---------------------------------------------------------------*
           MOVE HV-ID-CONTRATO         TO SGREN-ID-CTR-TXT
           MOVE 15                     TO SGREN-ID-CTR-LEN
           MOVE 'PR'                   TO SGREN-ST-RENEGOCIACAO
           MOVE WS-VR-ENTRADA          TO SGREN-VR-ENTRADA
           MOVE 3                      TO SGREN-QT-OPCOES
           MOVE -1                     TO SGREN-IND-DT-APROVACAO
           MOVE -1                     TO SGREN-IND-DT-ENCERRAMENTO
           MOVE SG-RC-CLASSE-RISCO     TO SGREN-CLASS-RISCO
           MOVE 0                      TO SGREN-IND-CLASS-RISCO
           MOVE HV-VR-SALDO            TO SGREN-VR-SALDO-ORIGEM
           MOVE WS-USR-LEN             TO SGREN-USR-INC-LEN
           MOVE WS-USUARIO             TO SGREN-USR-INC-TXT
           MOVE 'A'                    TO SGREN-SITUACAO-REG
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_RENEGOCIACAO
                    (ID_RENEGOCIACAO,
                     ID_CONTRATO,
                     ST_RENEGOCIACAO,
                     VR_ENTRADA,
                     QT_OPCOES,
                     DT_PROPOSTA,
                     DT_APROVACAO,
                     DT_ENCERRAMENTO,
                     CLASS_RISCO,
                     VR_SALDO_ORIGEM,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (NEXT VALUE FOR SIGEC.SEQ_SG_RENEGOCIACAO,
                     :SGREN-ID-CONTRATO,
                     :SGREN-ST-RENEGOCIACAO,
                     :SGREN-VR-ENTRADA,
                     :SGREN-QT-OPCOES,
                     CURRENT DATE,
                     :SGREN-DT-APROVACAO :SGREN-IND-DT-APROVACAO,
                     :SGREN-DT-ENCERRAMENTO
                        :SGREN-IND-DT-ENCERRAMENTO,
                     :SGREN-CLASS-RISCO :SGREN-IND-CLASS-RISCO,
                     :SGREN-VR-SALDO-ORIGEM,
                     CURRENT TIMESTAMP,
                     :SGREN-USUARIO-INCLUSAO,
                     'A')
           END-EXEC
      *
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
              GO TO 4200-FIM
           END-IF
      *
      *    RECUPERA ID GERADO
           EXEC SQL
             SELECT IDENTITY_VAL_LOCAL()
               INTO :SGREN-ID-RENEGOCIACAO
               FROM SYSIBM.SYSDUMMY1
           END-EXEC
           MOVE SGREN-ID-RENEGOCIACAO  TO WS-ID-RENEG
      *
      *    MARCA CONTRATO COM RENEGOCIACAO ATIVA
           EXEC SQL
             UPDATE SIGEC.SG_CONTRATO
                SET IND_RENEGOCIACAO_ATIVA = 'S',
                    DH_ALTERACAO           = CURRENT TIMESTAMP,
                    USUARIO_ALTERACAO      = :WS-USUARIO
              WHERE ID_CONTRATO            = :SGREN-ID-CONTRATO
                AND SITUACAO_REG           = 'A'
           END-EXEC.
       4200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4300-GERAR-OPCOES SECTION.
      *---------------------------------------------------------------*
           PERFORM VARYING WS-IDX FROM 1 BY 1
                     UNTIL WS-IDX > 3
              MOVE WS-OPC-QT-PARC (WS-IDX) TO WS-QT-PARC-OPC
              IF WS-QT-PARC-OPC > WS-MAX-PARCELAS
                 MOVE WS-MAX-PARCELAS      TO WS-QT-PARC-OPC
              END-IF
      *
              PERFORM 4400-CALC-OPCAO
              PERFORM 4500-INSERT-OPCAO
              PERFORM 4600-GRAVAR-PROP-DET
              PERFORM 4700-GRAVAR-INTRG-DET
      *
              ADD 1 TO WS-QT-PROPOSTAS
              ADD 1 TO WS-QT-DESDE-COMMIT
              ADD WS-VR-DESCONTO TO WS-SOMA-DESCONTO
              ADD WS-VR-BASE-REN TO WS-SOMA-BASE-REN
           END-PERFORM.
       4300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * CALCULA UMA OPCAO INVOCANDO SGCB0110 SOBRE O VLR A FINANCIAR  *
      *---------------------------------------------------------------*
       4400-CALC-OPCAO SECTION.
           INITIALIZE SGFINANC
           MOVE WS-VR-FINANCIAR        TO SG-FIN-PRINCIPAL
           COMPUTE SG-FIN-DIAS-ATRASO = WS-QT-PARC-OPC * 30
           MOVE WS-TAXA-REN            TO SG-FIN-TAXA-MENSAL
           MOVE 0                      TO SG-FIN-PCT-MULTA
           MOVE HV-TP-CONTRATO         TO SG-FIN-TIPO-CTR
           MOVE HV-TP-CLIENTE          TO SG-FIN-TIPO-CLI
           MOVE 'N'                    TO SG-FIN-IND-PARCIAL
           MOVE 'S'                    TO SG-FIN-IND-SIMULACAO
           MOVE WS-DT-PROC             TO SG-FIN-DT-BASE
           CALL 'SGCB0110' USING SGFINANC
      *
           MOVE SG-FIN-JUROS           TO WS-VR-JUROS-OPC
           COMPUTE WS-VR-TOTAL =
                   WS-VR-FINANCIAR + WS-VR-JUROS-OPC
           IF WS-QT-PARC-OPC > 0
              COMPUTE WS-VR-PARCELA ROUNDED =
                      WS-VR-TOTAL / WS-QT-PARC-OPC
           ELSE
              MOVE WS-VR-TOTAL         TO WS-VR-PARCELA
           END-IF.
       4400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4500-INSERT-OPCAO SECTION.
      *---------------------------------------------------------------*
           MOVE WS-ID-RENEG            TO SGOPC-ID-RENEGOCIACAO
           MOVE WS-IDX                 TO SGOPC-NR-OPCAO
           MOVE WS-QT-PARC-OPC         TO SGOPC-QT-PARCELAS
           MOVE WS-VR-PARCELA          TO SGOPC-VR-PARCELA
           MOVE WS-VR-TOTAL            TO SGOPC-VR-TOTAL
           MOVE WS-TAXA-REN            TO SGOPC-TX-APLICADA
           MOVE 'N'                    TO SGOPC-IND-SELECIONADA
           MOVE WS-USR-LEN             TO SGOPC-USR-INC-LEN
           MOVE WS-USUARIO             TO SGOPC-USR-INC-TXT
           MOVE 'A'                    TO SGOPC-SITUACAO-REG
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_OPCAO_RENEGOCIACAO
                    (ID_RENEGOCIACAO,
                     NR_OPCAO,
                     QT_PARCELAS,
                     VR_PARCELA,
                     VR_TOTAL,
                     TX_APLICADA,
                     IND_SELECIONADA,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (:SGOPC-ID-RENEGOCIACAO,
                     :SGOPC-NR-OPCAO,
                     :SGOPC-QT-PARCELAS,
                     :SGOPC-VR-PARCELA,
                     :SGOPC-VR-TOTAL,
                     :SGOPC-TX-APLICADA,
                     :SGOPC-IND-SELECIONADA,
                     CURRENT TIMESTAMP,
                     :SGOPC-USUARIO-INCLUSAO,
                     'A')
           END-EXEC
      *
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       4500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4600-GRAVAR-PROP-DET SECTION.
      *---------------------------------------------------------------*
           MOVE SPACES                 TO REG-SGLPROP
           MOVE 'D'                    TO PROP-DET-TIPO
           MOVE WS-ID-RENEG            TO PROP-DET-ID-PROPOSTA
           MOVE WS-DT-PROC             TO PROP-DET-DT-GERACAO
           MOVE HV-ID-CONTRATO (4:12)  TO PROP-DET-ID-CONTRATO
           MOVE HV-ID-CONTRATO         TO PROP-DET-NR-CONTRATO
           MOVE HV-ID-CLIENTE          TO PROP-DET-ID-CLIENTE
           MOVE HV-DOCUMENTO           TO PROP-DET-DOCUMENTO
           MOVE HV-NOME                TO PROP-DET-NOME
           MOVE WS-IDX                 TO PROP-DET-NR-OPCAO
           MOVE HV-VR-SALDO            TO PROP-DET-VLR-SALDO-ORIG
           MOVE WS-VR-DESCONTO         TO PROP-DET-VLR-DESCONTO
           MOVE WS-PCT-DESC-APLIC      TO PROP-DET-PCT-DESCONTO
           MOVE WS-VR-BASE-REN         TO PROP-DET-VLR-BASE-REN
           MOVE WS-PCT-ENTRADA-MIN     TO PROP-DET-PCT-ENTRADA
           MOVE WS-VR-ENTRADA          TO PROP-DET-VLR-ENTRADA
           MOVE WS-QT-PARC-OPC         TO PROP-DET-QT-PARC-NOVAS
           MOVE WS-TAXA-REN            TO PROP-DET-TAXA-JUROS-REN
           MOVE WS-VR-PARCELA          TO PROP-DET-VLR-PARCELA
           MOVE WS-VR-TOTAL            TO PROP-DET-VLR-TOTAL-REN
           MOVE WS-DT-VALIDADE         TO PROP-DET-DT-VALIDADE
           MOVE WS-FAIXA-ORIG          TO PROP-DET-FAIXA-ORIG
           MOVE SG-RC-CLASSE-RISCO     TO PROP-DET-RISCO-ORIG
           MOVE 'GERADA    '           TO PROP-DET-STATUS
           MOVE REG-SGLPROP-DET        TO REG-SGLPROP
           WRITE REG-SGLPROP
           IF NOT FS-PROP-OK
              MOVE SG-CT-RC-ERR-TEC    TO WS-RC
              MOVE 'S'                 TO WS-FL-ABORT
              STRING '12-WRITE SGLPROP FS=' DELIMITED BY SIZE
                     WS-FS-PROP             DELIMITED BY SIZE
                INTO SGC-MENSAGEM
           END-IF.
       4600-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4700-GRAVAR-INTRG-DET SECTION.
      *---------------------------------------------------------------*
           ADD 1 TO WS-SEQ-INTRG
           MOVE SPACES                 TO REG-SGLINTRG
           MOVE 'D'                    TO INTRG-DET-TIPO
           MOVE WS-SEQ-INTRG           TO INTRG-DET-SEQ
           MOVE WS-ID-RENEG            TO INTRG-DET-ID-PROPOSTA
           MOVE WS-DT-PROC             TO INTRG-DET-DT-GERACAO
           MOVE WS-DT-VALIDADE         TO INTRG-DET-DT-VALIDADE
           MOVE HV-ID-CONTRATO (4:12)  TO INTRG-DET-ID-CONTRATO
           MOVE HV-ID-CONTRATO         TO INTRG-DET-NR-CONTRATO
           MOVE HV-ID-CLIENTE          TO INTRG-DET-ID-CLIENTE
           MOVE HV-DOCUMENTO           TO INTRG-DET-DOCUMENTO
           MOVE HV-NOME                TO INTRG-DET-NOME
           MOVE WS-IDX                 TO INTRG-DET-NR-OPCAO
           MOVE HV-VR-SALDO            TO INTRG-DET-VLR-SALDO
           MOVE WS-VR-DESCONTO         TO INTRG-DET-VLR-DESCONTO
           MOVE WS-VR-ENTRADA          TO INTRG-DET-VLR-ENTRADA
           MOVE WS-QT-PARC-OPC         TO INTRG-DET-QT-PARCELAS
           MOVE WS-TAXA-REN            TO INTRG-DET-TAXA-JUROS
           MOVE WS-VR-PARCELA          TO INTRG-DET-VLR-PARCELA
           MOVE WS-VR-TOTAL            TO INTRG-DET-VLR-TOTAL
           MOVE WS-FAIXA-ORIG          TO INTRG-DET-FAIXA-ORIG
           MOVE SG-RC-CLASSE-RISCO     TO INTRG-DET-RISCO-ORIG
           MOVE 'EML'                  TO INTRG-DET-CANAL-COMUNIC
           MOVE 'https://reneg.sigec/aceite'
                                        TO INTRG-DET-URL-ACEITE
           MOVE REG-SGLINTRG-DET       TO REG-SGLINTRG
           WRITE REG-SGLINTRG
           IF NOT FS-INTRG-OK
              MOVE SG-CT-RC-ERR-TEC    TO WS-RC
              MOVE 'S'                 TO WS-FL-ABORT
              STRING '12-WRITE SGLINTRG FS=' DELIMITED BY SIZE
                     WS-FS-INTRG             DELIMITED BY SIZE
                INTO SGC-MENSAGEM
           END-IF.
       4700-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8000-FECHAR-CURSOR SECTION.
      *---------------------------------------------------------------*
           EXEC SQL CLOSE C-CTR-ELEG END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       8000-FIM. EXIT.
      *
       8100-GRAVAR-TRAILERS SECTION.
           MOVE SPACES                 TO REG-SGLPROP
           MOVE 'T'                    TO PROP-TRL-TIPO
           MOVE WS-QT-PROPOSTAS        TO PROP-TRL-QTD-REGS
           MOVE WS-QT-CONTRATOS-OK     TO PROP-TRL-QTD-CONTRATOS
           MOVE WS-SOMA-DESCONTO       TO PROP-TRL-SOMA-DESCONTO
           MOVE WS-SOMA-BASE-REN       TO PROP-TRL-SOMA-BASE-REN
           MOVE WS-DT-PROC             TO PROP-TRL-DT-REF
           MOVE REG-SGLPROP-TRL        TO REG-SGLPROP
           WRITE REG-SGLPROP
      *
           MOVE SPACES                 TO REG-SGLINTRG
           MOVE 'T'                    TO INTRG-TRL-TIPO
           MOVE WS-QT-PROPOSTAS        TO INTRG-TRL-QTD-REGS
           MOVE WS-QT-CONTRATOS-OK     TO INTRG-TRL-QTD-CONTRATOS
           MOVE WS-SOMA-DESCONTO       TO INTRG-TRL-SOMA-DESCONTO
           MOVE WS-SOMA-BASE-REN       TO INTRG-TRL-SOMA-BASE
           MOVE WS-DT-PROC             TO INTRG-TRL-DT-REF
           MOVE REG-SGLINTRG-TRL       TO REG-SGLINTRG
           WRITE REG-SGLINTRG.
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
                  ' SGCB0160'        DELIMITED BY SIZE
             INTO SGC-MENSAGEM.
       8800-FIM. EXIT.
      *
       8900-FECHAR-SAIDAS SECTION.
           CLOSE SGLPROP-FILE
           CLOSE SGLINTRG-FILE.
       8900-FIM. EXIT.
      *
       9000-FINALIZAR SECTION.
           IF WS-QT-CONTRATOS-OK = 0 AND WS-RC < 04
              MOVE SG-CT-RC-WARN       TO WS-RC
              MOVE MS-REN-SEM-ELEG     TO SGC-MENSAGEM (1:20)
              MOVE 'NENHUM CONTRATO ELEGIVEL PARA RENEGOCIACAO'
                                       TO SGC-MENSAGEM (21:60)
           END-IF
           MOVE WS-QT-LIDOS            TO SGC-QT-REGS-LIDOS
           MOVE WS-QT-PROPOSTAS        TO SGC-QT-REGS-GRAV
           MOVE WS-QT-ERROS            TO SGC-QT-REGS-REJ
           MOVE WS-RC                  TO SGC-RETURN-CODE
           IF SGC-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0160 CONCLUIDO'
                                       TO SGC-MENSAGEM
           END-IF
           MOVE WS-RC                  TO RETURN-CODE.
       9000-FIM. EXIT.
