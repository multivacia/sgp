       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0080.
       AUTHOR.        LAB-SIGEC.
      *****************************************************************
      * PROGRAMA .: SGCB0080                                          *
      * FUNCAO   .: CONSULTA COMPLETA DE CONTRATO COM DADOS DE        *
      *             CLIENTE E INDICADOR DE RENEGOCIACAO ATIVA.        *
      * TABELAS  .: SIGEC.SG_CONTRATO      (SELECT)                   *
      *             SIGEC.SG_CLIENTE       (SELECT via JOIN)          *
      *             SIGEC.SG_RENEGOCIACAO  (LEFT JOIN, ATIVAS)        *
      *----------------------------------------------------------------*
      * ENTRADA  .: LK-CTR-AREA.LK-ID-CONTRATO (PIC X(15))            *
      * SAIDA    .: SGCTRDAT + SGCLIDAT + LK-IND-BLOQ + LK-IND-RENEG  *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.

       DATA DIVISION.
       WORKING-STORAGE SECTION.
           EXEC SQL INCLUDE SQLCA END-EXEC.
           EXEC SQL INCLUDE DCLSGCTR END-EXEC.
           EXEC SQL INCLUDE DCLSGCLI END-EXEC.
       COPY SGRETCOD.
      *
       01  WS-CTRL.
           05  WS-PROG                   PIC X(08) VALUE 'SGCB0080'.
           05  WS-SQLCODE-DISP           PIC -9(9).
      *
       01  WS-HOST-VARS.
           05  WS-IND-RENEG-CALC         PIC X(01).
           05  WS-DT-INICIO-CTR          PIC X(10).
           05  WS-DT-FIM-CTR             PIC X(10).
           05  WS-IND-DT-FIM             PIC S9(4) COMP.
      *
       LINKAGE SECTION.
       01  LK-CTR-AREA.
           05  LK-ID-CONTRATO            PIC X(15).
           05  LK-IND-EXISTE             PIC X(01).
               88  LK-EXISTE                     VALUE 'S'.
               88  LK-NAO-EXISTE                 VALUE 'N'.
           05  LK-IND-BLOQUEADO          PIC X(01).
               88  LK-CTR-BLOQUEADO              VALUE 'S'.
               88  LK-CTR-DESBLOQ                VALUE 'N'.
           05  LK-IND-RENEG-ATIVA        PIC X(01).
               88  LK-RENEG-ATIVA                VALUE 'S'.
               88  LK-SEM-RENEG                  VALUE 'N'.
           05  LK-RETURN-CODE            PIC 9(02).
           05  LK-MENSAGEM               PIC X(80).
      *
       COPY SGCTRDAT.
       COPY SGCLIDAT.
       COPY SGCOMMAR.
      *
       PROCEDURE DIVISION USING LK-CTR-AREA
                                SGCTRDAT
                                SGCLIDAT
                                SGCOMMAR.
       0000-PRINCIPAL SECTION.
       0000-INIT.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-VALIDAR-ENTRADA
           IF SG-RC-OK
              PERFORM 3000-SELECIONAR-CONTRATO
           END-IF
           PERFORM 9000-FINALIZAR
           GOBACK.
      *
       1000-INICIALIZAR.
           MOVE SG-CT-RC-OK          TO WS-RC
           MOVE 'N'                  TO LK-IND-EXISTE
           MOVE 'N'                  TO LK-IND-BLOQUEADO
           MOVE 'N'                  TO LK-IND-RENEG-ATIVA
           MOVE SPACES               TO LK-MENSAGEM
           INITIALIZE SGCTRDAT
           INITIALIZE SGCLIDAT
           MOVE WS-PROG              TO SGC-PROG-CHAMADO.
      *
       2000-VALIDAR-ENTRADA.
           IF LK-ID-CONTRATO = SPACES OR LOW-VALUES
              MOVE SG-CT-RC-ERR-FUNC TO WS-RC
              MOVE 'ID CONTRATO OBRIGATORIO'
                                     TO LK-MENSAGEM
           END-IF.
      *
       3000-SELECIONAR-CONTRATO.
           MOVE LENGTH OF LK-ID-CONTRATO
                                     TO SGCTR-ID-CTR-LEN
           MOVE LK-ID-CONTRATO       TO SGCTR-ID-CTR-TXT
      *
           EXEC SQL
             SELECT C.ID_CONTRATO,
                    C.ID_CLIENTE,
                    C.TP_CONTRATO,
                    C.VR_TOTAL,
                    C.VR_SALDO,
                    C.QT_PARCELAS,
                    C.QT_PARCELAS_ABERTAS,
                    C.QT_PARCELAS_VENCIDAS,
                    C.ST_CONTRATO,
                    C.CLASSIFICACAO_INAD,
                    C.IND_RENEGOCIACAO_ATIVA,
                    C.FAIXA_ATRASO,
                    C.DIAS_ATRASO_MAX,
                    C.TX_JUROS,
                    C.PC_MULTA,
                    CHAR(C.DT_INICIO, ISO),
                    CHAR(C.DT_FIM,    ISO),
                    K.ID_CLIENTE,
                    K.NM_CLIENTE,
                    K.TP_DOCUMENTO,
                    K.NR_DOCUMENTO,
                    K.TP_CLIENTE,
                    K.IND_REINCIDENTE,
                    K.CLASSIFICACAO_RISCO,
                    CASE
                       WHEN R.ID_RENEGOCIACAO IS NULL THEN 'N'
                       ELSE 'S'
                    END
               INTO :SGCTR-ID-CONTRATO,
                    :SGCTR-ID-CLIENTE,
                    :SGCTR-TP-CONTRATO,
                    :SGCTR-VR-TOTAL,
                    :SGCTR-VR-SALDO,
                    :SGCTR-QT-PARCELAS,
                    :SGCTR-QT-PARC-ABERTAS,
                    :SGCTR-QT-PARC-VENCIDAS,
                    :SGCTR-ST-CONTRATO,
                    :SGCTR-CLASSIF-INAD
                       :SGCTR-IND-CLASSIF-INAD,
                    :SGCTR-IND-RENEG-ATIVA,
                    :SGCTR-FAIXA-ATRASO,
                    :SGCTR-DIAS-ATRASO-MAX,
                    :SGCTR-TX-JUROS,
                    :SGCTR-PC-MULTA,
                    :WS-DT-INICIO-CTR,
                    :WS-DT-FIM-CTR
                       :WS-IND-DT-FIM,
                    :SGCLI-ID-CLIENTE,
                    :SGCLI-NM-CLIENTE,
                    :SGCLI-TP-DOCUMENTO,
                    :SGCLI-NR-DOCUMENTO,
                    :SGCLI-TP-CLIENTE,
                    :SGCLI-IND-REINCIDENTE,
                    :SGCLI-CLASSIFICACAO-RISCO
                       :SGCLI-IND-CLASSIF-RISCO,
                    :WS-IND-RENEG-CALC
               FROM SIGEC.SG_CONTRATO C
               JOIN SIGEC.SG_CLIENTE  K
                 ON K.ID_CLIENTE = C.ID_CLIENTE
               LEFT OUTER JOIN SIGEC.SG_RENEGOCIACAO R
                 ON R.ID_CONTRATO = C.ID_CONTRATO
                AND R.ST_RENEGOCIACAO IN ('AT','PR')
                AND R.SITUACAO_REG = 'A'
              WHERE C.ID_CONTRATO = :SGCTR-ID-CONTRATO
                AND C.SITUACAO_REG = 'A'
              FETCH FIRST 1 ROWS ONLY
           END-EXEC
      *
           EVALUATE TRUE
               WHEN SQLCODE = 0
                    MOVE 'S'                  TO LK-IND-EXISTE
                    PERFORM 4000-MAPEAR-RETORNO
               WHEN SQLCODE = +100
                    MOVE 'N'                  TO LK-IND-EXISTE
                    MOVE SG-CT-RC-ERR-FUNC    TO WS-RC
                    MOVE 'CONTRATO NAO ENCONTRADO'
                                              TO LK-MENSAGEM
               WHEN OTHER
                    PERFORM 8000-TRATAR-ERRO-DB2
           END-EVALUATE.
      *
       4000-MAPEAR-RETORNO.
      *    CONTRATO ------------------------------------------------- *
           MOVE SGCTR-ID-CTR-TXT      TO SG-CTR-NUMERO
           MOVE SGCTR-ID-CLIENTE      TO SG-CTR-CLI-ID
           MOVE SGCTR-TP-CONTRATO     TO SG-CTR-TIPO-CTR
           MOVE SGCTR-VR-TOTAL        TO SG-CTR-VLR-TOTAL
           MOVE SGCTR-VR-SALDO        TO SG-CTR-VLR-SALDO
           MOVE SGCTR-QT-PARCELAS     TO SG-CTR-QT-PARCELAS
           COMPUTE SG-CTR-QT-PAR-PAGAS =
                   SGCTR-QT-PARCELAS - SGCTR-QT-PARC-ABERTAS
           MOVE SGCTR-QT-PARC-VENCIDAS
                                       TO SG-CTR-QT-PAR-VENC
           MOVE SGCTR-TX-JUROS        TO SG-CTR-TAXA-JUROS
           MOVE SGCTR-PC-MULTA        TO SG-CTR-PCT-MULTA
           MOVE SGCTR-ST-CONTRATO     TO SG-CTR-SITUACAO
           MOVE SGCTR-DIAS-ATRASO-MAX TO SG-CTR-DIAS-MAX-ATRASO
      *
      *    INDICADORES DE BLOQUEIO E RENEGOCIACAO                     *
           IF SGCTR-ST-CONTRATO = 'BL'
              MOVE 'S'                TO LK-IND-BLOQUEADO
              MOVE 'S'                TO SG-CTR-IND-BLOQ
           ELSE
              MOVE 'N'                TO LK-IND-BLOQUEADO
              MOVE 'N'                TO SG-CTR-IND-BLOQ
           END-IF
      *
           IF WS-IND-RENEG-CALC = 'S'
              OR SGCTR-IND-RENEG-ATIVA = 'S'
              MOVE 'S'                TO LK-IND-RENEG-ATIVA
           ELSE
              MOVE 'N'                TO LK-IND-RENEG-ATIVA
           END-IF
      *
      *    CLIENTE -------------------------------------------------- *
           MOVE SGCLI-ID-CLIENTE      TO SG-CLI-ID
           MOVE SGCLI-TP-DOCUMENTO    TO SG-CLI-TIPO-DOC
           MOVE SGCLI-NR-DOCUMENTO-TXT
                                       TO SG-CLI-DOCUMENTO
           MOVE SGCLI-NM-CLIENTE-TXT  TO SG-CLI-NOME
           MOVE SGCLI-NM-CLIENTE-TXT (1:20)
                                       TO SG-CLI-NOME-REDUZ
           MOVE SGCLI-TP-CLIENTE      TO SG-CLI-TIPO-CLI
           MOVE SGCLI-IND-REINCIDENTE TO SG-CLI-IND-INADIMP
           IF SGCLI-IND-CLASSIF-RISCO = 0
              MOVE SGCLI-CLASSIFICACAO-RISCO
                                       TO SG-CLI-CLASSE-RISCO
           END-IF.
      *
       8000-TRATAR-ERRO-DB2.
           MOVE SG-CT-RC-ERR-TEC     TO WS-RC
           MOVE SQLCODE              TO WS-SQLCODE-DISP
           STRING '12-DB2-SQLCODE=' DELIMITED BY SIZE
                  WS-SQLCODE-DISP    DELIMITED BY SIZE
                  ' SGCB0080'        DELIMITED BY SIZE
             INTO LK-MENSAGEM.
      *
       9000-FINALIZAR.
           MOVE WS-RC                TO LK-RETURN-CODE
           MOVE WS-RC                TO SGC-RETURN-CODE
           MOVE LK-MENSAGEM          TO SGC-MENSAGEM
           MOVE WS-RC                TO RETURN-CODE.
