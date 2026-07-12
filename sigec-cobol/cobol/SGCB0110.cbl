       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0110.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0110                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: MOTOR DE CALCULO FINANCEIRO (JUROS + MULTA)       *
      * CHAMADO  .: CALL 'SGCB0110' USING SGFINANC.                   *
      *---------------------------------------------------------------*
      * REGRAS POR TIPO DE CLIENTE (SG-FIN-TIPO-CLI):                 *
      *   PF - JUROS SIMPLES: PRINC * (TAXA/100) * (DIAS/30)          *
      *        + MULTA = PRINC * (PCT/100) SE DIAS-ATRASO > 0         *
      *   PJ - JUROS COMPOSTOS APROX.: PRINC * ((1+TAXA/100)^MESES-1) *
      *        + MULTA IGUAL PF                                       *
      *   ES - FORMULA BASE * FATOR ESPECIAL 0,873 (AJUSTE DIR. 2009) *
      *   SP - REGRA COM GO TO DEPENDING ON SUBTIPO INTERNO           *
      *---------------------------------------------------------------*
      * OBS: PAGAMENTO PARCIAL (SG-FIN-IND-PARCIAL='S') REDUZ A MULTA *
      * EM 50%.                                                       *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (LIMITE ATINGIDO / DIAS ZERO)                    *
      *   08 - ERRO FUNCIONAL (PRINCIPAL 0 / TAXA INVALIDA / TIPO)    *
      *   12 - ERRO TECNICO (OVERFLOW)                                *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       DATA DIVISION.
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * PARAMETROS INTERNOS FIXOS                                     *
      *---------------------------------------------------------------*
       01  WS-CONST.
      *    AJUSTE DIR. 2009 - ORIGEM HISTORICA NAO DOCUMENTADA.
      *    MANTIDO POR COMPATIBILIDADE COM CALCULO ANTERIOR.
           05  WS-FATOR-ES          PIC 9V999 VALUE 0.873.
           05  WS-LIM-JUROS-PF      PIC 9(03)V99 VALUE 20.00.
           05  WS-LIM-JUROS-ES      PIC 9(03)V99 VALUE 08.00.
           05  WS-DIAS-MES          PIC 9(03)V99 VALUE 30.00.
      *
      *---------------------------------------------------------------*
      * AREA DE CALCULO                                               *
      *---------------------------------------------------------------*
       01  WS-CALC.
           05  WS-TAXA-DEC          PIC S9(03)V9(06) COMP-3 VALUE ZERO.
           05  WS-MESES-DEC         PIC S9(05)V9(06) COMP-3 VALUE ZERO.
           05  WS-FATOR-JR          PIC S9(05)V9(08) COMP-3 VALUE ZERO.
           05  WS-EXP               PIC S9(05)V99    COMP-3 VALUE ZERO.
           05  WS-JR-BRUTO          PIC S9(13)V99    COMP-3 VALUE ZERO.
           05  WS-MU-BRUTO          PIC S9(13)V99    COMP-3 VALUE ZERO.
           05  WS-LIM-EFET          PIC S9(03)V99    COMP-3 VALUE ZERO.
           05  WS-SUBTIPO-SP        PIC 9(01) VALUE 1.
      *
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
       LINKAGE SECTION.
           COPY SGFINANC.
      *
       PROCEDURE DIVISION USING SGFINANC.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-VALIDAR-ENTRADA
           IF SG-FIN-RETURN-CODE > 04
              PERFORM 9000-FINALIZAR
              GOBACK
           END-IF
      *
           PERFORM 3000-DISPATCH-TIPO-CLI
           PERFORM 4000-APLICAR-PARCIAL
           PERFORM 5000-APLICAR-LIMITE
           PERFORM 6000-CALCULAR-ATUALIZADO
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE ZEROS   TO SG-FIN-JUROS
                            SG-FIN-MULTA
                            SG-FIN-ATUALIZADO
                            SG-FIN-JUROS-EFET
                            SG-FIN-BASE-CALC
                            SG-FIN-RETURN-CODE
           MOVE 'N'     TO SG-FIN-IND-LIMITE
           MOVE SPACES  TO SG-FIN-MENSAGEM
           MOVE SG-FIN-PRINCIPAL TO SG-FIN-BASE-CALC.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       2000-VALIDAR-ENTRADA SECTION.
           IF SG-FIN-PRINCIPAL <= 0
              MOVE 08                     TO SG-FIN-RETURN-CODE
              MOVE '08-FIN-PRINC-ZERO   ' TO SG-FIN-MENSAGEM(1:20)
              MOVE 'PRINCIPAL DEVE SER MAIOR QUE ZERO'
                                          TO SG-FIN-MENSAGEM(21:60)
              GO TO 2000-FIM
           END-IF
      *
           IF SG-FIN-TAXA-MENSAL < 0 OR SG-FIN-TAXA-MENSAL > 99.99
              MOVE 08                     TO SG-FIN-RETURN-CODE
              MOVE '08-FIN-TAXA-INVAL   ' TO SG-FIN-MENSAGEM(1:20)
              MOVE 'TAXA FORA DA FAIXA PERMITIDA'
                                          TO SG-FIN-MENSAGEM(21:60)
              GO TO 2000-FIM
           END-IF
      *
           IF SG-FIN-PCT-MULTA < 0 OR SG-FIN-PCT-MULTA > 10.00
              MOVE 08                     TO SG-FIN-RETURN-CODE
              MOVE '08-FIN-TAXA-INVAL   ' TO SG-FIN-MENSAGEM(1:20)
              MOVE 'MULTA FORA DA FAIXA PERMITIDA'
                                          TO SG-FIN-MENSAGEM(21:60)
              GO TO 2000-FIM
           END-IF
      *
           IF SG-FIN-DIAS-ATRASO = 0
              MOVE 04                     TO SG-FIN-RETURN-CODE
              MOVE '04-FIN-DIAS-ZERO    ' TO SG-FIN-MENSAGEM(1:20)
              MOVE 'SEM DIAS DE ATRASO - JUROS E MULTA ZERADOS'
                                          TO SG-FIN-MENSAGEM(21:60)
              MOVE SG-FIN-PRINCIPAL       TO SG-FIN-ATUALIZADO
              GO TO 2000-FIM
           END-IF.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * DISPATCH POR TIPO DE CLIENTE                                  *
      * OBS: A LINKAGE SUPORTA PF/PJ/ES. ACEITAMOS TAMBEM 'SP'        *
      * PARA COMPATIBILIDADE COM SUBROTINAS CHAMADORAS ANTIGAS.       *
      *---------------------------------------------------------------*
       3000-DISPATCH-TIPO-CLI SECTION.
           EVALUATE SG-FIN-TIPO-CLI
              WHEN 'PF'
                 PERFORM 3100-CALC-PF
              WHEN 'PJ'
                 PERFORM 3200-CALC-PJ
              WHEN 'ES'
                 PERFORM 3300-CALC-ES
              WHEN 'SP'
                 PERFORM 3400-CALC-SP
              WHEN OTHER
                 MOVE 08                     TO SG-FIN-RETURN-CODE
                 MOVE '08-TIPO-INVALIDO    ' TO SG-FIN-MENSAGEM(1:20)
                 MOVE 'TIPO DE CLIENTE NAO SUPORTADO'
                                             TO SG-FIN-MENSAGEM(21:60)
           END-EVALUATE.
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * PF - JUROS SIMPLES + MULTA                                    *
      *---------------------------------------------------------------*
       3100-CALC-PF SECTION.
           COMPUTE WS-JR-BRUTO ROUNDED =
                   SG-FIN-PRINCIPAL
                 * (SG-FIN-TAXA-MENSAL / 100)
                 * (SG-FIN-DIAS-ATRASO / WS-DIAS-MES)
           MOVE WS-JR-BRUTO   TO SG-FIN-JUROS
      *
           IF SG-FIN-DIAS-ATRASO > 0
              COMPUTE WS-MU-BRUTO ROUNDED =
                      SG-FIN-PRINCIPAL * (SG-FIN-PCT-MULTA / 100)
              MOVE WS-MU-BRUTO TO SG-FIN-MULTA
           END-IF.
       3100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * PJ - JUROS COMPOSTOS APROXIMADOS                              *
      * FATOR = (1 + TAXA/100) ** (DIAS/30)                           *
      * JUROS = PRINCIPAL * (FATOR - 1)                               *
      *---------------------------------------------------------------*
       3200-CALC-PJ SECTION.
           COMPUTE WS-TAXA-DEC  = SG-FIN-TAXA-MENSAL / 100
           COMPUTE WS-MESES-DEC = SG-FIN-DIAS-ATRASO / WS-DIAS-MES
           COMPUTE WS-FATOR-JR  =
                   (1 + WS-TAXA-DEC) ** WS-MESES-DEC
           COMPUTE WS-JR-BRUTO ROUNDED =
                   SG-FIN-PRINCIPAL * (WS-FATOR-JR - 1)
           MOVE WS-JR-BRUTO TO SG-FIN-JUROS
      *
           IF SG-FIN-DIAS-ATRASO > 0
              COMPUTE WS-MU-BRUTO ROUNDED =
                      SG-FIN-PRINCIPAL * (SG-FIN-PCT-MULTA / 100)
              MOVE WS-MU-BRUTO TO SG-FIN-MULTA
           END-IF.
       3200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * ES - CONTRATO ESPECIAL                                        *
      * FORMULA BASE PJ * 0.873. AJUSTE DIR. 2009.                    *
      *---------------------------------------------------------------*
       3300-CALC-ES SECTION.
           PERFORM 3200-CALC-PJ
      *
      *    AJUSTE DIR. 2009 - APLICA FATOR HISTORICO.
           COMPUTE SG-FIN-JUROS ROUNDED =
                   SG-FIN-JUROS * WS-FATOR-ES
           COMPUTE SG-FIN-MULTA ROUNDED =
                   SG-FIN-MULTA * WS-FATOR-ES.
       3300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * SP - REGRA HISTORICA COM DESPACHO INTERNO                     *
      * SUBTIPO DERIVADO DE SG-FIN-TIPO-CTR (CR=1, CD=2, FI=3, ELSE=4)*
      *---------------------------------------------------------------*
       3400-CALC-SP SECTION.
           EVALUATE SG-FIN-TIPO-CTR
              WHEN 'CR' MOVE 1 TO WS-SUBTIPO-SP
              WHEN 'CD' MOVE 2 TO WS-SUBTIPO-SP
              WHEN 'FI' MOVE 3 TO WS-SUBTIPO-SP
              WHEN OTHER MOVE 4 TO WS-SUBTIPO-SP
           END-EVALUATE
      *
           GO TO 3410-SP1
                 3420-SP2
                 3430-SP3
                 3440-SP4
              DEPENDING ON WS-SUBTIPO-SP.
      *
       3410-SP1.
           PERFORM 3100-CALC-PF
           GO TO 3400-FIM.
       3420-SP2.
           PERFORM 3200-CALC-PJ
           GO TO 3400-FIM.
       3430-SP3.
           PERFORM 3200-CALC-PJ
           COMPUTE SG-FIN-JUROS = SG-FIN-JUROS * 1.05
           GO TO 3400-FIM.
       3440-SP4.
           PERFORM 3100-CALC-PF
           COMPUTE SG-FIN-JUROS = SG-FIN-JUROS * 0.95
           GO TO 3400-FIM.
       3400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * PAGAMENTO PARCIAL - MULTA REDUZIDA 50%                        *
      *---------------------------------------------------------------*
       4000-APLICAR-PARCIAL SECTION.
           IF SG-FIN-E-PARCIAL
              COMPUTE SG-FIN-MULTA ROUNDED = SG-FIN-MULTA * 0.5
           END-IF.
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * APLICA LIMITE MAXIMO DE JUROS EFETIVOS AO MES POR TIPO CLI    *
      *---------------------------------------------------------------*
       5000-APLICAR-LIMITE SECTION.
           IF SG-FIN-PRINCIPAL = 0 OR SG-FIN-DIAS-ATRASO = 0
              MOVE ZEROS TO SG-FIN-JUROS-EFET
              GO TO 5000-FIM
           END-IF
      *
           COMPUTE SG-FIN-JUROS-EFET ROUNDED =
                   (SG-FIN-JUROS / SG-FIN-PRINCIPAL) * 100
                 * (WS-DIAS-MES / SG-FIN-DIAS-ATRASO)
      *
           MOVE 99.99 TO WS-LIM-EFET
           EVALUATE SG-FIN-TIPO-CLI
              WHEN 'PF' MOVE WS-LIM-JUROS-PF TO WS-LIM-EFET
              WHEN 'ES' MOVE WS-LIM-JUROS-ES TO WS-LIM-EFET
           END-EVALUATE
      *
           IF SG-FIN-JUROS-EFET > WS-LIM-EFET
              MOVE 'S'                    TO SG-FIN-IND-LIMITE
              COMPUTE SG-FIN-JUROS ROUNDED =
                      SG-FIN-PRINCIPAL
                    * (WS-LIM-EFET / 100)
                    * (SG-FIN-DIAS-ATRASO / WS-DIAS-MES)
              MOVE WS-LIM-EFET            TO SG-FIN-JUROS-EFET
              IF SG-FIN-RETURN-CODE < 04
                 MOVE 04                     TO SG-FIN-RETURN-CODE
                 MOVE '04-FIN-LIMITE-AJUST' TO SG-FIN-MENSAGEM(1:20)
                 MOVE 'JUROS LIMITADO PELO TETO DO TIPO DE CLIENTE'
                                             TO SG-FIN-MENSAGEM(21:60)
              END-IF
           END-IF.
       5000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       6000-CALCULAR-ATUALIZADO SECTION.
           COMPUTE SG-FIN-ATUALIZADO ROUNDED =
                   SG-FIN-PRINCIPAL + SG-FIN-JUROS + SG-FIN-MULTA
      *
           IF SG-FIN-RETURN-CODE = 0
              MOVE 00                     TO SG-FIN-RETURN-CODE
              MOVE '00-ENC-CALC-OK      ' TO SG-FIN-MENSAGEM(1:20)
              MOVE 'CALCULO REALIZADO COM SUCESSO'
                                          TO SG-FIN-MENSAGEM(21:60)
           END-IF.
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
           IF SG-FIN-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0110 CONCLUIDO'
                                          TO SG-FIN-MENSAGEM
           END-IF.
       9000-FIM. EXIT.
