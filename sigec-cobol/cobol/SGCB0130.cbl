       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0130.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0130                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: DETECCAO DE INADIMPLENCIA - CLASSIFICA CONTRATOS  *
      *             COM PARCELAS VENCIDAS EM FAIXAS LEVE/MODERADA/    *
      *             GRAVE/CRITICA, ATUALIZA CLASSIFICACAO NO CONTRATO,*
      *             INSERE EVENTO DE COBRANCA E GRAVA SGLINADI.       *
      *---------------------------------------------------------------*
      * DEPENDENCIAS DE PROGRAMA (CALL ESTATICO):                     *
      *   SGCB0050 - CONSULTA CLIENTE     (LK-CLI-AREA + AREAS)       *
      *   SGCB0080 - CONSULTA CONTRATO    (LK-CTR-AREA + AREAS)       *
      *   SGCB0140 - CLASSIFICACAO DE RISCO (SGRISCOM)                *
      *---------------------------------------------------------------*
      * ARQUIVOS:                                                     *
      *   DDNAME SGLBLOQ  (OPCIONAL, FILE STATUS 35 = SEGUE SEM)      *
      *   DDNAME SGLINADI (SAIDA - FB LRECL 240)                      *
      *---------------------------------------------------------------*
      * FAIXAS DE ATRASO:                                             *
      *   LEVE     - 001..030 DIAS                                    *
      *   MODERADA - 031..090 DIAS                                    *
      *   GRAVE    - 091..180 DIAS                                    *
      *   CRITICA  - >  180 DIAS                                      *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (SEM INADIMPLENTES OU BLOQUEIO OPCIONAL AUSENTE) *
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
           SELECT SGLINADI-FILE
                  ASSIGN TO SGLINADI
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-INADI.
      *
           SELECT SGLBLOQ-FILE
                  ASSIGN TO SGLBLOQ
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FS-BLOQ.
      *
       DATA DIVISION.
       FILE SECTION.
       FD  SGLINADI-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLINADI.
      *
       FD  SGLBLOQ-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLBLOQ.
      *
       WORKING-STORAGE SECTION.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE DCLSGCTR END-EXEC.
           EXEC SQL INCLUDE DCLSGEVC END-EXEC.
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
       01  WS-FILE-STATUS.
           05  WS-FS-INADI               PIC X(02) VALUE '00'.
               88  FS-INADI-OK                    VALUE '00'.
           05  WS-FS-BLOQ                PIC X(02) VALUE '00'.
               88  FS-BLOQ-OK                     VALUE '00'.
               88  FS-BLOQ-EOF                    VALUE '10'.
               88  FS-BLOQ-INDISP                 VALUES '35' '37'
                                                         '39' '93'.
      *
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0130'.
           05  WS-SQLCODE-DISP           PIC -9(9).
           05  WS-USUARIO                PIC X(30)
                                          VALUE 'SGCB0130-BATCH'.
           05  WS-USR-LEN                PIC S9(4) COMP VALUE +14.
           05  WS-DT-PROC                PIC 9(08) VALUE ZEROES.
           05  WS-HR-PROC                PIC 9(06) VALUE ZEROES.
           05  WS-LIMITE-COMMIT          PIC 9(05) VALUE 00300.
           05  WS-QT-DESDE-COMMIT        PIC 9(05) VALUE ZEROES.
      *
       01  WS-FLAGS.
           05  WS-FL-EOF-CUR             PIC X(01) VALUE 'N'.
               88  WS-EOF-CURSOR                  VALUE 'S'.
               88  WS-NAO-EOF-CURSOR              VALUE 'N'.
           05  WS-FL-ABORT               PIC X(01) VALUE 'N'.
               88  WS-DEVE-ABORTAR                VALUE 'S'.
           05  WS-FL-BLOQ-ABERTO         PIC X(01) VALUE 'N'.
               88  WS-BLOQ-ABERTO                 VALUE 'S'.
               88  WS-BLOQ-FECHADO                VALUE 'N'.
           05  WS-FL-CTR-BLOQ            PIC X(01) VALUE 'N'.
               88  WS-CTR-BLOQUEADO               VALUE 'S'.
      *
       01  WS-CONTADORES.
           05  WS-QT-LIDOS               PIC 9(09) VALUE ZEROES.
           05  WS-QT-GRAVADOS            PIC 9(09) VALUE ZEROES.
           05  WS-QT-LEVE                PIC 9(09) VALUE ZEROES.
           05  WS-QT-MOD                 PIC 9(09) VALUE ZEROES.
           05  WS-QT-GRAVE               PIC 9(09) VALUE ZEROES.
           05  WS-QT-CRIT                PIC 9(09) VALUE ZEROES.
           05  WS-SOMA-SALDO             PIC S9(17)V99 COMP-3
                                                    VALUE ZEROES.
      *
       01  WS-CURSOR-HV.
           05  HV-ID-CONTRATO            PIC X(15).
           05  HV-ID-CLIENTE             PIC S9(18) COMP-3.
           05  HV-TP-CONTRATO            PIC X(02).
           05  HV-ST-CONTRATO            PIC X(02).
           05  HV-DIAS-ATRASO-MAX        PIC S9(4)  COMP.
           05  HV-QT-PARC-VENCIDAS       PIC S9(4)  COMP.
           05  HV-VR-SALDO               PIC S9(13)V99 COMP-3.
           05  HV-CLASSIF-INAD-ANT       PIC X(01).
           05  HV-CLASSIF-INAD-IND       PIC S9(4)  COMP.
      *
       01  WS-CLASSIF.
           05  WS-FAIXA-CALC             PIC X(08) VALUE SPACES.
           05  WS-CLASSIF-INAD-NOV       PIC X(01) VALUE 'N'.
           05  WS-CD-EVENTO-COB          PIC X(03) VALUE 'INA'.
           05  WS-IND-ELEG-REN           PIC X(01) VALUE 'N'.
      *
       01  WS-BLOQ-CACHE.
           05  WS-BLOQ-QT                PIC 9(05) VALUE ZEROES.
           05  WS-BLOQ-TAB.
               10  WS-BLOQ-ITEM  OCCURS 500 TIMES.
                   15  WS-BLOQ-CTR       PIC 9(12).
      *
       01  WS-CALL-CTR.
           05  LK-CTR-ID-CONTRATO        PIC X(15).
           05  LK-CTR-IND-EXISTE         PIC X(01).
           05  LK-CTR-IND-BLOQUEADO      PIC X(01).
           05  LK-CTR-IND-RENEG-ATIVA    PIC X(01).
           05  LK-CTR-RETURN-CODE        PIC 9(02).
           05  LK-CTR-MENSAGEM           PIC X(80).
      *
       01  WS-CALL-CLI.
           05  LK-CLI-FUNCAO             PIC X(01).
           05  LK-CLI-ID-CLIENTE         PIC 9(10).
           05  LK-CLI-TIPO-DOC           PIC X(03).
           05  LK-CLI-DOCUMENTO          PIC X(14).
           05  LK-CLI-IND-EXISTE         PIC X(01).
           05  LK-CLI-RETURN-CODE        PIC 9(02).
           05  LK-CLI-MENSAGEM           PIC X(80).
      *
       01  WS-CTR-CHAR12                 PIC 9(12).
      *
       COPY SGCTRDAT.
       COPY SGCLIDAT.
       COPY SGRISCOM.
       COPY SGCOMMAR.
      *
      *---------------------------------------------------------------*
      * CURSOR DE CONTRATOS COM PARCELAS VENCIDAS AGREGADAS           *
      *---------------------------------------------------------------*
           EXEC SQL DECLARE C-CTR-INAD CURSOR WITH HOLD FOR
             SELECT C.ID_CONTRATO,
                    C.ID_CLIENTE,
                    C.TP_CONTRATO,
                    C.ST_CONTRATO,
                    C.DIAS_ATRASO_MAX,
                    C.QT_PARCELAS_VENCIDAS,
                    C.VR_SALDO,
                    C.CLASSIFICACAO_INAD
               FROM SIGEC.SG_CONTRATO C
              WHERE C.QT_PARCELAS_VENCIDAS > 0
                AND C.DIAS_ATRASO_MAX      > 0
                AND C.SITUACAO_REG          = 'A'
                AND C.ST_CONTRATO NOT IN ('EN','CA')
              ORDER BY C.ID_CONTRATO
              FOR READ ONLY
           END-EXEC.
      *
       PROCEDURE DIVISION.
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 1500-CARREGAR-BLOQUEIOS
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
      * TENTA CARREGAR SGLBLOQ. SE O DD NAO ESTIVER ALOCADO (FILE     *
      * STATUS 35/37/39/93), SEGUE SEM CACHE E TODOS OS CONTRATOS SAO *
      * TRATADOS COMO NAO BLOQUEADOS. WARN SO E EMITIDO SE FALHOU     *
      * POR OUTRO MOTIVO.                                             *
      *---------------------------------------------------------------*
       1500-CARREGAR-BLOQUEIOS SECTION.
           MOVE ZEROES                 TO WS-BLOQ-QT
           OPEN INPUT SGLBLOQ-FILE
           IF FS-BLOQ-INDISP
              MOVE 'N'                 TO WS-FL-BLOQ-ABERTO
              GO TO 1500-FIM
           END-IF
           IF NOT FS-BLOQ-OK
              MOVE SG-CT-RC-WARN       TO WS-RC
              MOVE 'N'                 TO WS-FL-BLOQ-ABERTO
              GO TO 1500-FIM
           END-IF
           MOVE 'S'                    TO WS-FL-BLOQ-ABERTO
      *
           PERFORM UNTIL FS-BLOQ-EOF OR WS-BLOQ-QT >= 500
              READ SGLBLOQ-FILE
                 AT END EXIT PERFORM
                 NOT AT END
                    IF BLOQ-TIPO-CONTRATO AND BLOQ-ATIVO
                       ADD 1 TO WS-BLOQ-QT
                       MOVE BLOQ-ID-CONTRATO
                            TO WS-BLOQ-CTR (WS-BLOQ-QT)
                    END-IF
              END-READ
           END-PERFORM
      *
           CLOSE SGLBLOQ-FILE
           MOVE 'N'                    TO WS-FL-BLOQ-ABERTO.
       1500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-ABRIR-SAIDA SECTION.
      *---------------------------------------------------------------*
           OPEN OUTPUT SGLINADI-FILE
           IF NOT FS-INADI-OK
              MOVE SG-CT-RC-ERR-TEC        TO WS-RC
              MOVE 'S'                     TO WS-FL-ABORT
              STRING '12-FILE OPEN SGLINADI FS='  DELIMITED BY SIZE
                     WS-FS-INADI                  DELIMITED BY SIZE
                INTO SGC-MENSAGEM
           END-IF.
       2000-FIM. EXIT.
      *
       2100-GRAVAR-HEADER SECTION.
           MOVE SPACES                 TO REG-SGLINADI
           MOVE 'H'                    TO INADI-HDR-TIPO
           MOVE WS-DT-PROC             TO INADI-HDR-DT-REF
           MOVE 'SGCB0130'             TO INADI-HDR-PROG-ORIGEM
           MOVE ZEROES                 TO INADI-HDR-QTD-CTR
           MOVE REG-SGLINADI-HDR       TO REG-SGLINADI
           WRITE REG-SGLINADI.
       2100-FIM. EXIT.
      *
       2500-ABRIR-CURSOR SECTION.
           EXEC SQL OPEN C-CTR-INAD END-EXEC
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
             FETCH C-CTR-INAD
               INTO :HV-ID-CONTRATO,
                    :HV-ID-CLIENTE,
                    :HV-TP-CONTRATO,
                    :HV-ST-CONTRATO,
                    :HV-DIAS-ATRASO-MAX,
                    :HV-QT-PARC-VENCIDAS,
                    :HV-VR-SALDO,
                    :HV-CLASSIF-INAD-ANT :HV-CLASSIF-INAD-IND
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
       4000-PROCESSAR-CONTRATO SECTION.
      *---------------------------------------------------------------*
           MOVE 'N'                    TO WS-FL-CTR-BLOQ
           MOVE HV-ID-CONTRATO         TO LK-CTR-ID-CONTRATO
           MOVE ZEROES                 TO LK-CTR-RETURN-CODE
           MOVE SPACES                 TO LK-CTR-MENSAGEM
           MOVE 'N'                    TO LK-CTR-IND-BLOQUEADO
      *
           CALL 'SGCB0080' USING WS-CALL-CTR
                                 SGCTRDAT
                                 SGCLIDAT
                                 SGCOMMAR
      *
           IF LK-CTR-RETURN-CODE NOT = 0
              GO TO 4000-FIM
           END-IF
      *
      *    CONSULTA CADASTRAL COMPLETA DO CLIENTE (SGCB0050)
           MOVE 'I'                    TO LK-CLI-FUNCAO
           MOVE SG-CLI-ID              TO LK-CLI-ID-CLIENTE
           MOVE SPACES                 TO LK-CLI-TIPO-DOC
                                          LK-CLI-DOCUMENTO
                                          LK-CLI-MENSAGEM
           MOVE 'N'                    TO LK-CLI-IND-EXISTE
           MOVE ZEROES                 TO LK-CLI-RETURN-CODE
      *
           CALL 'SGCB0050' USING WS-CALL-CLI
                                 SGCLIDAT
                                 SGCOMMAR
      *
      *    VERIFICA BLOQUEIO NO CACHE
           PERFORM 4100-VER-BLOQUEIO
      *
      *    CLASSIFICA FAIXA
           PERFORM 4200-CLASSIFICAR-FAIXA
      *
      *    OBTEM CLASSE DE RISCO (SGCB0140)
           PERFORM 4300-OBTER-RISCO
      *
      *    DECIDE ELEGIBILIDADE DE RENEGOCIACAO
           IF WS-CTR-BLOQUEADO
              MOVE 'N' TO WS-IND-ELEG-REN
           ELSE
              IF WS-FAIXA-CALC = 'CRITICA '
                 MOVE 'N' TO WS-IND-ELEG-REN
              ELSE
                 MOVE 'S' TO WS-IND-ELEG-REN
              END-IF
           END-IF
      *
           PERFORM 4400-UPDATE-CTR-CLASSIF
           IF WS-RC >= 12 GO TO 4000-FIM END-IF
      *
           PERFORM 4500-INSERT-EVENTO-COB
      *
           PERFORM 4600-GRAVAR-INADI-DET
      *
           ADD 1 TO WS-QT-GRAVADOS
           ADD 1 TO WS-QT-DESDE-COMMIT
           ADD HV-VR-SALDO TO WS-SOMA-SALDO.
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4100-VER-BLOQUEIO SECTION.
      *---------------------------------------------------------------*
           MOVE 'N' TO WS-FL-CTR-BLOQ
           IF WS-BLOQ-QT = 0 GO TO 4100-FIM END-IF
      *
           PERFORM VARYING WS-USR-LEN FROM 1 BY 1
                     UNTIL WS-USR-LEN > WS-BLOQ-QT
                        OR WS-CTR-BLOQUEADO
              MOVE HV-ID-CONTRATO (4:12) TO WS-CTR-CHAR12
              IF WS-BLOQ-CTR (WS-USR-LEN) = WS-CTR-CHAR12
                 MOVE 'S' TO WS-FL-CTR-BLOQ
              END-IF
           END-PERFORM
           MOVE +14 TO WS-USR-LEN.
       4100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4200-CLASSIFICAR-FAIXA SECTION.
      *---------------------------------------------------------------*
           EVALUATE TRUE
              WHEN HV-DIAS-ATRASO-MAX <= 30
                 MOVE 'LEVE    ' TO WS-FAIXA-CALC
                 MOVE 'L'        TO WS-CLASSIF-INAD-NOV
                 ADD 1           TO WS-QT-LEVE
              WHEN HV-DIAS-ATRASO-MAX <= 90
                 MOVE 'MODERADA' TO WS-FAIXA-CALC
                 MOVE 'M'        TO WS-CLASSIF-INAD-NOV
                 ADD 1           TO WS-QT-MOD
              WHEN HV-DIAS-ATRASO-MAX <= 180
                 MOVE 'GRAVE   ' TO WS-FAIXA-CALC
                 MOVE 'G'        TO WS-CLASSIF-INAD-NOV
                 ADD 1           TO WS-QT-GRAVE
              WHEN OTHER
                 MOVE 'CRITICA ' TO WS-FAIXA-CALC
                 MOVE 'C'        TO WS-CLASSIF-INAD-NOV
                 ADD 1           TO WS-QT-CRIT
           END-EVALUATE.
       4200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4300-OBTER-RISCO SECTION.
      *---------------------------------------------------------------*
           INITIALIZE SGRISCOM
           MOVE HV-ID-CONTRATO (4:12)  TO SG-RC-CTR-ID
           MOVE SG-CLI-ID              TO SG-RC-CLI-ID
           MOVE SG-CLI-TIPO-CLI        TO SG-RC-TIPO-CLI
           MOVE WS-DT-PROC             TO SG-RC-DT-BASE
           MOVE WS-FAIXA-CALC          TO SG-RC-FAIXA-INAD-ATU
           MOVE HV-DIAS-ATRASO-MAX     TO SG-RC-DIAS-MAX-ATRASO
           MOVE HV-QT-PARC-VENCIDAS    TO SG-RC-QT-DIAS-GRAVE-180
           MOVE HV-VR-SALDO            TO SG-RC-VLR-SALDO
           MOVE ZEROES                 TO SG-RC-VLR-ENC-ACUM
           IF HV-CLASSIF-INAD-IND = 0
              MOVE HV-CLASSIF-INAD-ANT TO SG-RC-RISCO-ANTERIOR
           ELSE
              MOVE ' '                 TO SG-RC-RISCO-ANTERIOR
           END-IF
           MOVE ZEROES                 TO SG-RC-DT-ULT-CLASS
           MOVE 'N'                    TO SG-RC-FL-ES-LIVRE
      *
           CALL 'SGCB0140' USING SGRISCOM.
       4300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4400-UPDATE-CTR-CLASSIF SECTION.
      *---------------------------------------------------------------*
           MOVE HV-ID-CONTRATO         TO SGCTR-ID-CTR-TXT
           MOVE 15                     TO SGCTR-ID-CTR-LEN
           MOVE WS-CLASSIF-INAD-NOV    TO SGCTR-CLASSIF-INAD
      *
           EXEC SQL
             UPDATE SIGEC.SG_CONTRATO
                SET CLASSIFICACAO_INAD = :SGCTR-CLASSIF-INAD,
                    DIAS_ATRASO_MAX    = :HV-DIAS-ATRASO-MAX,
                    DH_ALTERACAO       = CURRENT TIMESTAMP,
                    USUARIO_ALTERACAO  = :WS-USUARIO
              WHERE ID_CONTRATO        = :SGCTR-ID-CONTRATO
                AND SITUACAO_REG       = 'A'
           END-EXEC
      *
           IF SQLCODE NOT = 0 AND SQLCODE NOT = +100
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       4400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4500-INSERT-EVENTO-COB SECTION.
      *---------------------------------------------------------------*
           MOVE HV-ID-CONTRATO         TO SGEVC-ID-CTR-TXT
           MOVE 15                     TO SGEVC-ID-CTR-LEN
           MOVE -1                     TO SGEVC-IND-NR-PARCELA
           MOVE ZEROES                 TO SGEVC-NR-PARCELA
           MOVE WS-CD-EVENTO-COB       TO SGEVC-TP-EVENTO
           MOVE 'SIS'                  TO SGEVC-CD-CANAL
           MOVE 'AB'                   TO SGEVC-ST-EVENTO
           MOVE SPACES                 TO SGEVC-DS-EVT-TXT
           STRING 'INADIMPLENCIA FAIXA=' DELIMITED BY SIZE
                  WS-FAIXA-CALC         DELIMITED BY SIZE
                  ' DIAS='              DELIMITED BY SIZE
                  HV-DIAS-ATRASO-MAX    DELIMITED BY SIZE
                  ' RISCO='             DELIMITED BY SIZE
                  SG-RC-CLASSE-RISCO    DELIMITED BY SIZE
             INTO SGEVC-DS-EVT-TXT
           END-STRING
           MOVE FUNCTION LENGTH(FUNCTION TRIM(SGEVC-DS-EVT-TXT))
                                        TO SGEVC-DS-EVT-LEN
           MOVE -1                     TO SGEVC-IND-DT-PROX-ACAO
           MOVE WS-USR-LEN             TO SGEVC-USR-INC-LEN
           MOVE WS-USUARIO             TO SGEVC-USR-INC-TXT
           MOVE 'A'                    TO SGEVC-SITUACAO-REG
      *
           EXEC SQL
             INSERT INTO SIGEC.SG_EVENTO_COBRANCA
                    (ID_EVENTO,
                     ID_CONTRATO,
                     NR_PARCELA,
                     DT_EVENTO,
                     TP_EVENTO,
                     CD_CANAL,
                     ST_EVENTO,
                     DS_EVENTO,
                     DT_PROX_ACAO,
                     DH_INCLUSAO,
                     USUARIO_INCLUSAO,
                     SITUACAO_REG)
             VALUES (NEXT VALUE FOR SIGEC.SEQ_SG_EVENTO_COB,
                     :SGEVC-ID-CONTRATO,
                     :SGEVC-NR-PARCELA :SGEVC-IND-NR-PARCELA,
                     CURRENT TIMESTAMP,
                     :SGEVC-TP-EVENTO,
                     :SGEVC-CD-CANAL,
                     :SGEVC-ST-EVENTO,
                     :SGEVC-DS-EVENTO,
                     :SGEVC-DT-PROX-ACAO :SGEVC-IND-DT-PROX-ACAO,
                     CURRENT TIMESTAMP,
                     :SGEVC-USUARIO-INCLUSAO,
                     'A')
           END-EXEC
      *
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       4500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4600-GRAVAR-INADI-DET SECTION.
      *---------------------------------------------------------------*
           MOVE SPACES                 TO REG-SGLINADI
           MOVE 'D'                    TO INADI-DET-TIPO
           MOVE WS-DT-PROC             TO INADI-DET-DT-REF
           MOVE HV-ID-CONTRATO (4:12)  TO INADI-DET-ID-CONTRATO
           MOVE HV-ID-CONTRATO         TO INADI-DET-NR-CONTRATO
           MOVE SG-CLI-ID              TO INADI-DET-ID-CLIENTE
           MOVE SG-CLI-DOCUMENTO       TO INADI-DET-DOCUMENTO
           MOVE SG-CLI-NOME            TO INADI-DET-NOME
           MOVE SG-CLI-TIPO-CLI        TO INADI-DET-TIPO-CLIENTE
           MOVE HV-TP-CONTRATO         TO INADI-DET-TIPO-CONTRATO
           MOVE WS-FAIXA-CALC          TO INADI-DET-FAIXA
           MOVE HV-DIAS-ATRASO-MAX     TO INADI-DET-DIAS-ATRASO
           MOVE HV-QT-PARC-VENCIDAS    TO INADI-DET-QT-PAR-VENC
           MOVE HV-VR-SALDO            TO INADI-DET-VLR-SALDO
           MOVE ZEROES                 TO INADI-DET-VLR-ENC-ACUM
           MOVE HV-VR-SALDO            TO INADI-DET-VLR-ATUALIZADO
           MOVE SG-RC-CLASSE-RISCO     TO INADI-DET-RISCO-ATUAL
           IF HV-CLASSIF-INAD-IND = 0
              MOVE HV-CLASSIF-INAD-ANT TO INADI-DET-RISCO-ANTERIOR
           ELSE
              MOVE ' '                 TO INADI-DET-RISCO-ANTERIOR
           END-IF
           MOVE SG-RC-VARIACAO         TO INADI-DET-VARIACAO-RISCO
           MOVE WS-IND-ELEG-REN        TO INADI-DET-IND-ELEG-REN
           IF WS-CTR-BLOQUEADO
              MOVE 'S'                 TO INADI-DET-IND-PROTESTO
           ELSE
              MOVE 'N'                 TO INADI-DET-IND-PROTESTO
           END-IF
           MOVE ZEROES                 TO INADI-DET-DT-ULT-PAG
           MOVE SPACES                 TO INADI-DET-CANAL-ULT-PAG
           MOVE REG-SGLINADI-DET       TO REG-SGLINADI
           WRITE REG-SGLINADI
           IF NOT FS-INADI-OK
              MOVE SG-CT-RC-ERR-TEC    TO WS-RC
              MOVE 'S'                 TO WS-FL-ABORT
              STRING '12-WRITE SGLINADI FS=' DELIMITED BY SIZE
                     WS-FS-INADI             DELIMITED BY SIZE
                INTO SGC-MENSAGEM
           END-IF.
       4600-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       8000-FECHAR-CURSOR SECTION.
      *---------------------------------------------------------------*
           EXEC SQL CLOSE C-CTR-INAD END-EXEC
           IF SQLCODE NOT = 0
              PERFORM 8800-TRATAR-SQLCODE
           END-IF.
       8000-FIM. EXIT.
      *
       8100-GRAVAR-TRAILER SECTION.
           MOVE SPACES                 TO REG-SGLINADI
           MOVE 'T'                    TO INADI-TRL-TIPO
           MOVE WS-QT-GRAVADOS         TO INADI-TRL-QTD-REGS
           MOVE WS-QT-LEVE             TO INADI-TRL-QT-LEVE
           MOVE WS-QT-MOD              TO INADI-TRL-QT-MOD
           MOVE WS-QT-GRAVE            TO INADI-TRL-QT-GRAVE
           MOVE WS-QT-CRIT             TO INADI-TRL-QT-CRIT
           MOVE WS-SOMA-SALDO          TO INADI-TRL-SOMA-SALDO
           MOVE WS-DT-PROC             TO INADI-TRL-DT-REF
           MOVE REG-SGLINADI-TRL       TO REG-SGLINADI
           WRITE REG-SGLINADI.
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
                  ' SGCB0130'        DELIMITED BY SIZE
             INTO SGC-MENSAGEM.
       8800-FIM. EXIT.
      *
       8900-FECHAR-SAIDA SECTION.
           CLOSE SGLINADI-FILE.
       8900-FIM. EXIT.
      *
       9000-FINALIZAR SECTION.
           IF WS-QT-GRAVADOS = 0 AND WS-RC < 04
              MOVE SG-CT-RC-WARN       TO WS-RC
              MOVE MS-INA-VAZIO        TO SGC-MENSAGEM (1:20)
              MOVE 'NENHUM CONTRATO INADIMPLENTE ENCONTRADO'
                                       TO SGC-MENSAGEM (21:60)
           END-IF
           MOVE WS-QT-LIDOS            TO SGC-QT-REGS-LIDOS
           MOVE WS-QT-GRAVADOS         TO SGC-QT-REGS-GRAV
           MOVE WS-RC                  TO SGC-RETURN-CODE
           IF SGC-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0130 CONCLUIDO'
                                       TO SGC-MENSAGEM
           END-IF
           MOVE WS-RC                  TO RETURN-CODE.
       9000-FIM. EXIT.
