       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0140.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0140                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: CLASSIFICACAO DE RISCO DE CLIENTE / CONTRATO      *
      * CHAMADO  .: CALL 'SGCB0140' USING SGRISCOM.                   *
      *---------------------------------------------------------------*
      * ENTRADAS CONSIDERADAS PARA COMPOR O PESO:                     *
      *   - DIAS MAXIMOS DE ATRASO                                    *
      *   - VALOR DE SALDO E ENCARGOS ACUMULADOS                      *
      *   - QUANTIDADE DE PARCELAS EM CARTEIRA (WS INTERNA)           *
      *   - HISTORICO RECENTE DE PAGAMENTOS (OCCURS DEPENDING ON)     *
      *   - TIPO DE CLIENTE (PF/PJ/ES)                                *
      *   - REINCIDENCIA (RISCO ANTERIOR DIFERENTE DE 'A')            *
      *---------------------------------------------------------------*
      * SAIDA: CLASSE A/B/C/D/E POR FAIXA DE PESO.                    *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (DADOS PARCIAIS)                                 *
      *   08 - ERRO FUNCIONAL (DADOS INSUFICIENTES)                   *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       DATA DIVISION.
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * TABELA DE PESOS - MATRIZ SIMPLIFICADA                         *
      *---------------------------------------------------------------*
       01  WS-PESOS-DIAS.
           05  WS-PD-FAIXA OCCURS 4 TIMES.
               10  WS-PD-LIMITE     PIC 9(05).
               10  WS-PD-PESO       PIC 9(02).
       01  WS-PESOS-DIAS-INIT.
           05  FILLER PIC 9(05) VALUE 00030.
           05  FILLER PIC 9(02) VALUE 01.
           05  FILLER PIC 9(05) VALUE 00090.
           05  FILLER PIC 9(02) VALUE 03.
           05  FILLER PIC 9(05) VALUE 00180.
           05  FILLER PIC 9(02) VALUE 05.
           05  FILLER PIC 9(05) VALUE 99999.
           05  FILLER PIC 9(02) VALUE 08.
      *
       01  WS-PESOS-SALDO.
           05  WS-PS-FAIXA OCCURS 4 TIMES.
               10  WS-PS-LIMITE     PIC S9(13)V99 COMP-3.
               10  WS-PS-PESO       PIC 9(02).
       01  WS-PESOS-SALDO-INIT.
           05  FILLER PIC S9(13)V99 COMP-3 VALUE 00000000001000.00.
           05  FILLER PIC 9(02)          VALUE 01.
           05  FILLER PIC S9(13)V99 COMP-3 VALUE 00000000010000.00.
           05  FILLER PIC 9(02)          VALUE 02.
           05  FILLER PIC S9(13)V99 COMP-3 VALUE 00000000100000.00.
           05  FILLER PIC 9(02)          VALUE 04.
           05  FILLER PIC S9(13)V99 COMP-3 VALUE 09999999999999.99.
           05  FILLER PIC 9(02)          VALUE 06.
      *
       01  WS-PESOS-PARCELAS.
           05  WS-PP-FAIXA OCCURS 3 TIMES.
               10  WS-PP-LIMITE     PIC 9(03).
               10  WS-PP-PESO       PIC 9(02).
       01  WS-PESOS-PARCELAS-INIT.
           05  FILLER PIC 9(03) VALUE 006.
           05  FILLER PIC 9(02) VALUE 01.
           05  FILLER PIC 9(03) VALUE 024.
           05  FILLER PIC 9(02) VALUE 02.
           05  FILLER PIC 9(03) VALUE 999.
           05  FILLER PIC 9(02) VALUE 04.
      *
      *---------------------------------------------------------------*
      * HISTORICO RECENTE DE PAGAMENTOS (SIMULADO EM WORKING).        *
      * EM PRODUCAO O CHAMADOR CARREGA A TABELA A PARTIR DE DB2       *
      * (PAG.PAGAMENTOS ULTIMOS 12 MESES). MANTIDO AQUI PARA TESTE    *
      * ISOLADO DA ROTINA.                                            *
      *---------------------------------------------------------------*
       01  WS-HIST.
           05  WS-HIST-QTD          PIC 9(02) VALUE 06.
           05  WS-HIST-ITEM  OCCURS 1 TO 12 TIMES
                            DEPENDING ON WS-HIST-QTD.
               10  WS-HIST-DIAS-ATR PIC 9(03).
               10  WS-HIST-VLR-PGO  PIC S9(11)V99 COMP-3.
               10  WS-HIST-STATUS   PIC X(01).
                   88  WS-HIST-PGO-OK           VALUE 'P'.
                   88  WS-HIST-PGO-ATRASO       VALUE 'A'.
                   88  WS-HIST-INAD             VALUE 'I'.
      *
      *---------------------------------------------------------------*
       01  WS-VARS.
           05  WS-IDX            PIC 9(02) VALUE ZERO.
           05  WS-PESO-DIAS      PIC 9(02) VALUE ZERO.
           05  WS-PESO-SALDO     PIC 9(02) VALUE ZERO.
           05  WS-PESO-PARC      PIC 9(02) VALUE ZERO.
           05  WS-PESO-HIST      PIC 9(02) VALUE ZERO.
           05  WS-PESO-TIPO      PIC 9(02) VALUE ZERO.
           05  WS-PESO-REINC     PIC 9(02) VALUE ZERO.
           05  WS-PESO-TOTAL     PIC 9(03) VALUE ZERO.
           05  WS-QTD-PARCELAS   PIC 9(03) VALUE 012.
           05  WS-MOD7           PIC 9(01) VALUE ZERO.
           05  WS-REINCIDENTE    PIC X(01) VALUE 'N'.
               88  WS-E-REINCIDENTE          VALUE 'S'.
               88  WS-NAO-REINCIDENTE        VALUE 'N'.
      *
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
       LINKAGE SECTION.
           COPY SGRISCOM.
      *
       PROCEDURE DIVISION USING SGRISCOM.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
           PERFORM 1500-CARREGAR-TABELAS
           PERFORM 2000-VALIDAR-ENTRADA
           IF SG-RC-RETURN-CODE >= 08
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 3000-CALC-PESOS
           PERFORM 4000-CLASSIFICAR
           PERFORM 5000-AJUSTE-ES-LIVRE
           PERFORM 6000-VARIACAO-PROVISAO
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE 'A'   TO SG-RC-CLASSE-RISCO
           MOVE ZEROS TO SG-RC-VARIACAO
                          SG-RC-PCT-PROVISAO
                          SG-RC-RETURN-CODE
           MOVE 'N'   TO SG-RC-IND-PROVISAO
           MOVE SPACES TO SG-RC-JUSTIFICATIVA
                          SG-RC-MENSAGEM
           MOVE ZEROS TO WS-PESO-TOTAL
                          WS-PESO-DIAS
                          WS-PESO-SALDO
                          WS-PESO-PARC
                          WS-PESO-HIST
                          WS-PESO-TIPO
                          WS-PESO-REINC.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1500-CARREGAR-TABELAS SECTION.
           MOVE WS-PESOS-DIAS-INIT     TO WS-PESOS-DIAS
           MOVE WS-PESOS-SALDO-INIT    TO WS-PESOS-SALDO
           MOVE WS-PESOS-PARCELAS-INIT TO WS-PESOS-PARCELAS.
       1500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-VALIDAR-ENTRADA SECTION.
           IF SG-RC-CTR-ID = 0 OR SG-RC-CLI-ID = 0
              MOVE 08                     TO SG-RC-RETURN-CODE
              MOVE '08-RISCO-DADOS      ' TO SG-RC-MENSAGEM(1:20)
              MOVE 'CTR-ID / CLI-ID OBRIGATORIOS'
                                          TO SG-RC-MENSAGEM(21:60)
              GO TO 2000-FIM
           END-IF
      *
           IF SG-RC-TIPO-CLI NOT = 'PF'
              AND SG-RC-TIPO-CLI NOT = 'PJ'
              AND SG-RC-TIPO-CLI NOT = 'ES'
              MOVE 08                     TO SG-RC-RETURN-CODE
              MOVE '08-RISCO-DADOS      ' TO SG-RC-MENSAGEM(1:20)
              MOVE 'TIPO-CLI DEVE SER PF/PJ/ES'
                                          TO SG-RC-MENSAGEM(21:60)
              GO TO 2000-FIM
           END-IF
      *
           IF SG-RC-RISCO-ANTERIOR NOT = 'A'
              AND SG-RC-RISCO-ANTERIOR NOT = ' '
              MOVE 'S' TO WS-REINCIDENTE
           ELSE
              MOVE 'N' TO WS-REINCIDENTE
           END-IF.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3000-CALC-PESOS SECTION.
           PERFORM 3100-PESO-DIAS-ATRASO
           PERFORM 3200-PESO-SALDO
           PERFORM 3300-PESO-PARCELAS
           PERFORM 3400-PESO-HISTORICO
           PERFORM 3500-PESO-TIPO-CLI
           PERFORM 3600-PESO-REINCIDENCIA
      *
           COMPUTE WS-PESO-TOTAL =
                   WS-PESO-DIAS
                 + WS-PESO-SALDO
                 + WS-PESO-PARC
                 + WS-PESO-HIST
                 + WS-PESO-TIPO
                 + WS-PESO-REINC.
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3100-PESO-DIAS-ATRASO SECTION.
           PERFORM VARYING WS-IDX FROM 1 BY 1
                     UNTIL WS-IDX > 4
                        OR WS-PESO-DIAS > 0
              IF SG-RC-DIAS-MAX-ATRASO <= WS-PD-LIMITE(WS-IDX)
                 MOVE WS-PD-PESO(WS-IDX) TO WS-PESO-DIAS
              END-IF
           END-PERFORM.
       3100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3200-PESO-SALDO SECTION.
           PERFORM VARYING WS-IDX FROM 1 BY 1
                     UNTIL WS-IDX > 4
                        OR WS-PESO-SALDO > 0
              IF SG-RC-VLR-SALDO <= WS-PS-LIMITE(WS-IDX)
                 MOVE WS-PS-PESO(WS-IDX) TO WS-PESO-SALDO
              END-IF
           END-PERFORM.
       3200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * PARCELAS: NA AUSENCIA DO CAMPO DEDICADO NA LINKAGE, USAMOS    *
      * SG-RC-QT-DIAS-GRAVE-180 COMO PROXY (LEGADO).                  *
      *---------------------------------------------------------------*
       3300-PESO-PARCELAS SECTION.
           IF SG-RC-QT-DIAS-GRAVE-180 > 0
              MOVE SG-RC-QT-DIAS-GRAVE-180 TO WS-QTD-PARCELAS
           END-IF
      *
           PERFORM VARYING WS-IDX FROM 1 BY 1
                     UNTIL WS-IDX > 3
                        OR WS-PESO-PARC > 0
              IF WS-QTD-PARCELAS <= WS-PP-LIMITE(WS-IDX)
                 MOVE WS-PP-PESO(WS-IDX) TO WS-PESO-PARC
              END-IF
           END-PERFORM.
       3300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * HISTORICO: SOMA 1 POR ITEM COM STATUS ATRASO OU INADIMPLENTE. *
      *---------------------------------------------------------------*
       3400-PESO-HISTORICO SECTION.
           MOVE ZERO TO WS-PESO-HIST
           PERFORM VARYING WS-IDX FROM 1 BY 1
                     UNTIL WS-IDX > WS-HIST-QTD
              EVALUATE WS-HIST-STATUS(WS-IDX)
                 WHEN 'A' ADD 1 TO WS-PESO-HIST
                 WHEN 'I' ADD 2 TO WS-PESO-HIST
              END-EVALUATE
           END-PERFORM
      *
           IF WS-PESO-HIST > 8
              MOVE 8 TO WS-PESO-HIST
           END-IF.
       3400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3500-PESO-TIPO-CLI SECTION.
           EVALUATE SG-RC-TIPO-CLI
              WHEN 'PF' MOVE 1 TO WS-PESO-TIPO
              WHEN 'PJ' MOVE 2 TO WS-PESO-TIPO
              WHEN 'ES' MOVE 0 TO WS-PESO-TIPO
           END-EVALUATE.
       3500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       3600-PESO-REINCIDENCIA SECTION.
           IF WS-E-REINCIDENTE
              MOVE 3 TO WS-PESO-REINC
           ELSE
              MOVE 0 TO WS-PESO-REINC
           END-IF.
       3600-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * CLASSIFICACAO PADRAO POR FAIXA DE PESO TOTAL:                 *
      *   0..3   -> A                                                 *
      *   4..7   -> B                                                 *
      *   8..12  -> C                                                 *
      *   13..17 -> D                                                 *
      *   >=18   -> E                                                 *
      *---------------------------------------------------------------*
       4000-CLASSIFICAR SECTION.
           EVALUATE TRUE
              WHEN WS-PESO-TOTAL <= 3   MOVE 'A' TO SG-RC-CLASSE-RISCO
              WHEN WS-PESO-TOTAL <= 7   MOVE 'B' TO SG-RC-CLASSE-RISCO
              WHEN WS-PESO-TOTAL <= 12  MOVE 'C' TO SG-RC-CLASSE-RISCO
              WHEN WS-PESO-TOTAL <= 17  MOVE 'D' TO SG-RC-CLASSE-RISCO
              WHEN OTHER                MOVE 'E' TO SG-RC-CLASSE-RISCO
           END-EVALUATE
      *
           COMPUTE WS-MOD7 = FUNCTION MOD(WS-PESO-TOTAL 7)
           IF WS-MOD7 = 3 AND WS-E-REINCIDENTE
              MOVE 'D' TO SG-RC-CLASSE-RISCO
           END-IF
      *
           STRING 'PESO-TOTAL='  WS-PESO-TOTAL
                  ' D='          WS-PESO-DIAS
                  ' S='          WS-PESO-SALDO
                  ' P='          WS-PESO-PARC
                  ' H='          WS-PESO-HIST
                  ' T='          WS-PESO-TIPO
                  ' R='          WS-PESO-REINC
                  DELIMITED BY SIZE
                  INTO SG-RC-JUSTIFICATIVA
           END-STRING.
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * ES-LIVRE: SE FLAG ATIVO, ES NAO DESCE ABAIXO DE C SEM         *
      * APROVACAO MANUAL (REGRA SGLPARM).                             *
      *---------------------------------------------------------------*
       5000-AJUSTE-ES-LIVRE SECTION.
           IF SG-RC-TIPO-CLI = 'ES'
              AND NOT SG-RC-ES-LIVRE-ATIVO
              IF SG-RC-CLASSE-RISCO > 'C'
                 MOVE 'C' TO SG-RC-CLASSE-RISCO
              END-IF
           END-IF.
       5000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VARIACAO E PROVISAO                                           *
      *---------------------------------------------------------------*
       6000-VARIACAO-PROVISAO SECTION.
           IF SG-RC-RISCO-ANTERIOR = ' '
              MOVE 0 TO SG-RC-VARIACAO
           ELSE
              COMPUTE SG-RC-VARIACAO =
                      FUNCTION ORD(SG-RC-CLASSE-RISCO)
                    - FUNCTION ORD(SG-RC-RISCO-ANTERIOR)
           END-IF
      *
           EVALUATE SG-RC-CLASSE-RISCO
              WHEN 'A'
                 MOVE 0.50 TO SG-RC-PCT-PROVISAO
                 MOVE 'N'  TO SG-RC-IND-PROVISAO
              WHEN 'B'
                 MOVE 1.00 TO SG-RC-PCT-PROVISAO
                 MOVE 'N'  TO SG-RC-IND-PROVISAO
              WHEN 'C'
                 MOVE 3.00 TO SG-RC-PCT-PROVISAO
                 MOVE 'S'  TO SG-RC-IND-PROVISAO
              WHEN 'D'
                 MOVE 10.00 TO SG-RC-PCT-PROVISAO
                 MOVE 'S'   TO SG-RC-IND-PROVISAO
              WHEN 'E'
                 MOVE 50.00 TO SG-RC-PCT-PROVISAO
                 MOVE 'S'   TO SG-RC-IND-PROVISAO
           END-EVALUATE
      *
           MOVE 00                     TO SG-RC-RETURN-CODE
           MOVE '00-RISCO-CLASS-OK   ' TO SG-RC-MENSAGEM(1:20)
           MOVE 'CLASSIFICACAO REALIZADA'
                                       TO SG-RC-MENSAGEM(21:60).
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
           IF SG-RC-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0140 CONCLUIDO'
                                          TO SG-RC-MENSAGEM
           END-IF.
       9000-FIM. EXIT.
