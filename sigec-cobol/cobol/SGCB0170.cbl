       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0170.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0170                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: VALIDACAO DE DOCUMENTO (CPF / CNPJ / LE)          *
      * CHAMADO  .: CALL 'SGCB0170' USING SGDOCVAL.                   *
      *---------------------------------------------------------------*
      * TIPOS SUPORTADOS:                                             *
      *   CPF  - MODULO 11 CLASSICO, 2 DIGITOS VERIFICADORES          *
      *   CNPJ - MODULO 11 COM PESOS 5..2 / 6..2, 2 DVs               *
      *   LE   - LEGADO: SO CONFERE COMPRIMENTO >= 8 E CHARS NUMERICOS*
      *          NAO VALIDA DIGITO VERIFICADOR (ITEM FORA COBERTURA)  *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - DOCUMENTO OK                                           *
      *   04 - VAZIO PERMITIDO (WARN)                                 *
      *   08 - ERRO FUNCIONAL (LEN / DV / TIPO / CHAR / VAZIO)        *
      *   12 - ERRO TECNICO (NAO USADO NESTE PROGRAMA)                *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       DATA DIVISION.
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * AREA DE TRABALHO INTERNA                                      *
      *---------------------------------------------------------------*
       01  WS-CTRL.
           05  WS-DOC-NUMERICO       PIC X(14) VALUE SPACES.
           05  WS-LEN                PIC 9(02) VALUE ZERO.
           05  WS-IDX                PIC 9(02) VALUE ZERO.
           05  WS-SOMA               PIC 9(05) VALUE ZERO.
           05  WS-RESTO              PIC 9(02) VALUE ZERO.
           05  WS-DV1                PIC 9(01) VALUE ZERO.
           05  WS-DV2                PIC 9(01) VALUE ZERO.
           05  WS-DV1-DOC            PIC 9(01) VALUE ZERO.
           05  WS-DV2-DOC            PIC 9(01) VALUE ZERO.
           05  WS-PESO               PIC 9(02) VALUE ZERO.
           05  WS-VALOR-DIG          PIC 9(01) VALUE ZERO.
           05  WS-FL-IGUAIS          PIC X(01) VALUE 'S'.
           05  WS-ANT                PIC X(01) VALUE SPACE.
      *
      *---------------------------------------------------------------*
      * TABELAS DE PESO - MODULO 11                                   *
      *---------------------------------------------------------------*
       01  WS-PESOS-CPF-DV1.
           05  FILLER PIC 9(02) VALUE 10.
           05  FILLER PIC 9(02) VALUE 09.
           05  FILLER PIC 9(02) VALUE 08.
           05  FILLER PIC 9(02) VALUE 07.
           05  FILLER PIC 9(02) VALUE 06.
           05  FILLER PIC 9(02) VALUE 05.
           05  FILLER PIC 9(02) VALUE 04.
           05  FILLER PIC 9(02) VALUE 03.
           05  FILLER PIC 9(02) VALUE 02.
       01  WS-PESOS-CPF-DV1-R REDEFINES WS-PESOS-CPF-DV1.
           05  WS-PESO-CPF1 OCCURS 9 TIMES  PIC 9(02).
      *
       01  WS-PESOS-CPF-DV2.
           05  FILLER PIC 9(02) VALUE 11.
           05  FILLER PIC 9(02) VALUE 10.
           05  FILLER PIC 9(02) VALUE 09.
           05  FILLER PIC 9(02) VALUE 08.
           05  FILLER PIC 9(02) VALUE 07.
           05  FILLER PIC 9(02) VALUE 06.
           05  FILLER PIC 9(02) VALUE 05.
           05  FILLER PIC 9(02) VALUE 04.
           05  FILLER PIC 9(02) VALUE 03.
           05  FILLER PIC 9(02) VALUE 02.
       01  WS-PESOS-CPF-DV2-R REDEFINES WS-PESOS-CPF-DV2.
           05  WS-PESO-CPF2 OCCURS 10 TIMES PIC 9(02).
      *
       01  WS-PESOS-CNPJ-DV1.
           05  FILLER PIC 9(02) VALUE 05.
           05  FILLER PIC 9(02) VALUE 04.
           05  FILLER PIC 9(02) VALUE 03.
           05  FILLER PIC 9(02) VALUE 02.
           05  FILLER PIC 9(02) VALUE 09.
           05  FILLER PIC 9(02) VALUE 08.
           05  FILLER PIC 9(02) VALUE 07.
           05  FILLER PIC 9(02) VALUE 06.
           05  FILLER PIC 9(02) VALUE 05.
           05  FILLER PIC 9(02) VALUE 04.
           05  FILLER PIC 9(02) VALUE 03.
           05  FILLER PIC 9(02) VALUE 02.
       01  WS-PESOS-CNPJ-DV1-R REDEFINES WS-PESOS-CNPJ-DV1.
           05  WS-PESO-CNPJ1 OCCURS 12 TIMES PIC 9(02).
      *
       01  WS-PESOS-CNPJ-DV2.
           05  FILLER PIC 9(02) VALUE 06.
           05  FILLER PIC 9(02) VALUE 05.
           05  FILLER PIC 9(02) VALUE 04.
           05  FILLER PIC 9(02) VALUE 03.
           05  FILLER PIC 9(02) VALUE 02.
           05  FILLER PIC 9(02) VALUE 09.
           05  FILLER PIC 9(02) VALUE 08.
           05  FILLER PIC 9(02) VALUE 07.
           05  FILLER PIC 9(02) VALUE 06.
           05  FILLER PIC 9(02) VALUE 05.
           05  FILLER PIC 9(02) VALUE 04.
           05  FILLER PIC 9(02) VALUE 03.
           05  FILLER PIC 9(02) VALUE 02.
       01  WS-PESOS-CNPJ-DV2-R REDEFINES WS-PESOS-CNPJ-DV2.
           05  WS-PESO-CNPJ2 OCCURS 13 TIMES PIC 9(02).
      *
      *---------------------------------------------------------------*
      * CAMPOS AUXILIARES - LEGADO (POUCO USADOS, MANTIDOS POR        *
      * COMPATIBILIDADE COM VERSOES ANTERIORES DA ROTINA)             *
      *---------------------------------------------------------------*
       01  WS-LEGADO.
           05  WS-LG-COD-UF          PIC X(02) VALUE 'BR'.
           05  WS-LG-VERSAO          PIC X(04) VALUE 'V007'.
           05  WS-LG-CHAVE-INT       PIC X(08) VALUE '0170LEG '.
      *
      *---------------------------------------------------------------*
      * COPYBOOKS DE APOIO                                            *
      *---------------------------------------------------------------*
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
       LINKAGE SECTION.
           COPY SGDOCVAL.
      *
       PROCEDURE DIVISION USING SGDOCVAL.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
           PERFORM 2000-VALIDAR-TIPO
           IF SG-DV-RETURN-CODE = ZEROS
              PERFORM 3000-TRATAR-VAZIO
           END-IF
           IF SG-DV-RETURN-CODE = ZEROS
              PERFORM 4000-DISPATCH-TIPO
           END-IF
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE 'S'          TO SG-DV-IND-VALIDO
           MOVE SPACES       TO SG-DV-DOC-FORMATADO
           MOVE ZERO         TO SG-DV-COMPRIMENTO
           MOVE SPACES       TO SG-DV-MOTIVO
           MOVE ZERO         TO SG-DV-RETURN-CODE
           MOVE SPACES       TO SG-DV-MENSAGEM
           MOVE SPACES       TO WS-DOC-NUMERICO.
       1000-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
       2000-VALIDAR-TIPO SECTION.
           IF NOT SG-DV-TIPO-VALIDO
              MOVE 'N'                    TO SG-DV-IND-VALIDO
              MOVE 08                     TO SG-DV-RETURN-CODE
              MOVE '08-DOC-TIPO-INVAL   ' TO SG-DV-MOTIVO
              MOVE 'TIPO DE DOCUMENTO NAO SUPORTADO'
                                          TO SG-DV-MENSAGEM
           END-IF.
       2000-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
      * TRATAMENTO DE DOCUMENTO VAZIO                                 *
      *---------------------------------------------------------------*
       3000-TRATAR-VAZIO SECTION.
           IF SG-DV-DOCUMENTO = SPACES OR SG-DV-DOCUMENTO = ALL '0'
              IF SG-DV-PERMITE-VAZIO
                 MOVE 'S'                    TO SG-DV-IND-VALIDO
                 MOVE 04                     TO SG-DV-RETURN-CODE
                 MOVE '04-DOC-VAZIO        ' TO SG-DV-MOTIVO
                 MOVE 'DOCUMENTO VAZIO ACEITO POR PARAMETRO'
                                             TO SG-DV-MENSAGEM
              ELSE
                 MOVE 'N'                    TO SG-DV-IND-VALIDO
                 MOVE 08                     TO SG-DV-RETURN-CODE
                 MOVE '04-DOC-VAZIO        ' TO SG-DV-MOTIVO
                 MOVE 'DOCUMENTO OBRIGATORIO NAO INFORMADO'
                                             TO SG-DV-MENSAGEM
              END-IF
           END-IF.
       3000-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
      * DESPACHO POR TIPO                                             *
      *---------------------------------------------------------------*
       4000-DISPATCH-TIPO SECTION.
           IF SG-DV-RETURN-CODE > ZEROS
              GO TO 4000-FIM
           END-IF
      *
           PERFORM 4100-NORMALIZAR-DOC
      *
           EVALUATE TRUE
              WHEN SG-DV-TIPO-CPF
                 PERFORM 5000-VALIDAR-CPF
              WHEN SG-DV-TIPO-CNPJ
                 PERFORM 6000-VALIDAR-CNPJ
              WHEN SG-DV-TIPO-LE
                 PERFORM 7000-VALIDAR-LE-LEGADO
              WHEN OTHER
                 MOVE 'N'                    TO SG-DV-IND-VALIDO
                 MOVE 08                     TO SG-DV-RETURN-CODE
                 MOVE '08-DOC-TIPO-INVAL   ' TO SG-DV-MOTIVO
           END-EVALUATE.
       4000-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
      * REMOVE CARACTERES NAO NUMERICOS DO DOCUMENTO                  *
      *---------------------------------------------------------------*
       4100-NORMALIZAR-DOC SECTION.
           MOVE SPACES TO WS-DOC-NUMERICO
           MOVE ZERO   TO WS-LEN
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 14
              IF SG-DV-DOCUMENTO(WS-IDX:1) >= '0'
                 AND SG-DV-DOCUMENTO(WS-IDX:1) <= '9'
                 ADD 1 TO WS-LEN
                 MOVE SG-DV-DOCUMENTO(WS-IDX:1)
                                       TO WS-DOC-NUMERICO(WS-LEN:1)
              END-IF
           END-PERFORM
           MOVE WS-LEN TO SG-DV-COMPRIMENTO.
       4100-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO CPF - MODULO 11                                     *
      *---------------------------------------------------------------*
       5000-VALIDAR-CPF SECTION.
           IF WS-LEN NOT = 11
              MOVE 'N'                    TO SG-DV-IND-VALIDO
              MOVE 08                     TO SG-DV-RETURN-CODE
              MOVE '08-DOC-LEN-INVAL    ' TO SG-DV-MOTIVO
              MOVE 'CPF COM COMPRIMENTO INVALIDO'
                                          TO SG-DV-MENSAGEM
              GO TO 5000-FIM
           END-IF
      *
      *---- REJEITAR SEQUENCIAS 111111... 22222... ETC ---------------*
           MOVE 'S' TO WS-FL-IGUAIS
           MOVE WS-DOC-NUMERICO(1:1) TO WS-ANT
           PERFORM VARYING WS-IDX FROM 2 BY 1 UNTIL WS-IDX > 11
              IF WS-DOC-NUMERICO(WS-IDX:1) NOT = WS-ANT
                 MOVE 'N' TO WS-FL-IGUAIS
              END-IF
           END-PERFORM
           IF WS-FL-IGUAIS = 'S'
              MOVE 'N'                    TO SG-DV-IND-VALIDO
              MOVE 08                     TO SG-DV-RETURN-CODE
              MOVE '08-DOC-DV-ERR       ' TO SG-DV-MOTIVO
              MOVE 'CPF COM TODOS OS DIGITOS IGUAIS'
                                          TO SG-DV-MENSAGEM
              GO TO 5000-FIM
           END-IF
      *
      *---- CALCULO DO DV1 -------------------------------------------*
           MOVE ZERO TO WS-SOMA
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 9
              MOVE WS-DOC-NUMERICO(WS-IDX:1) TO WS-VALOR-DIG
              COMPUTE WS-SOMA = WS-SOMA
                    + (WS-VALOR-DIG * WS-PESO-CPF1(WS-IDX))
           END-PERFORM
           DIVIDE WS-SOMA BY 11 GIVING WS-RESTO REMAINDER WS-RESTO
           IF WS-RESTO < 2
              MOVE 0 TO WS-DV1
           ELSE
              COMPUTE WS-DV1 = 11 - WS-RESTO
           END-IF
      *
      *---- CALCULO DO DV2 -------------------------------------------*
           MOVE ZERO TO WS-SOMA
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 10
              MOVE WS-DOC-NUMERICO(WS-IDX:1) TO WS-VALOR-DIG
              COMPUTE WS-SOMA = WS-SOMA
                    + (WS-VALOR-DIG * WS-PESO-CPF2(WS-IDX))
           END-PERFORM
           DIVIDE WS-SOMA BY 11 GIVING WS-RESTO REMAINDER WS-RESTO
           IF WS-RESTO < 2
              MOVE 0 TO WS-DV2
           ELSE
              COMPUTE WS-DV2 = 11 - WS-RESTO
           END-IF
      *
      *---- CONFRONTO COM OS DVs INFORMADOS --------------------------*
           MOVE WS-DOC-NUMERICO(10:1) TO WS-DV1-DOC
           MOVE WS-DOC-NUMERICO(11:1) TO WS-DV2-DOC
      *
           IF WS-DV1 = WS-DV1-DOC AND WS-DV2 = WS-DV2-DOC
              MOVE 'S'                    TO SG-DV-IND-VALIDO
              MOVE 00                     TO SG-DV-RETURN-CODE
              MOVE '00-DOC-OK           ' TO SG-DV-MOTIVO
              MOVE 'CPF VALIDO'           TO SG-DV-MENSAGEM
              PERFORM 8100-FORMATAR-CPF
           ELSE
              MOVE 'N'                    TO SG-DV-IND-VALIDO
              MOVE 08                     TO SG-DV-RETURN-CODE
              MOVE '08-DOC-DV-ERR       ' TO SG-DV-MOTIVO
              MOVE 'CPF COM DIGITO VERIFICADOR INVALIDO'
                                          TO SG-DV-MENSAGEM
           END-IF.
       5000-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO CNPJ - MODULO 11                                    *
      *---------------------------------------------------------------*
       6000-VALIDAR-CNPJ SECTION.
           IF WS-LEN NOT = 14
              MOVE 'N'                    TO SG-DV-IND-VALIDO
              MOVE 08                     TO SG-DV-RETURN-CODE
              MOVE '08-DOC-LEN-INVAL    ' TO SG-DV-MOTIVO
              MOVE 'CNPJ COM COMPRIMENTO INVALIDO'
                                          TO SG-DV-MENSAGEM
              GO TO 6000-FIM
           END-IF
      *
      *---- DIGITOS IGUAIS -------------------------------------------*
           MOVE 'S' TO WS-FL-IGUAIS
           MOVE WS-DOC-NUMERICO(1:1) TO WS-ANT
           PERFORM VARYING WS-IDX FROM 2 BY 1 UNTIL WS-IDX > 14
              IF WS-DOC-NUMERICO(WS-IDX:1) NOT = WS-ANT
                 MOVE 'N' TO WS-FL-IGUAIS
              END-IF
           END-PERFORM
           IF WS-FL-IGUAIS = 'S'
              MOVE 'N'                    TO SG-DV-IND-VALIDO
              MOVE 08                     TO SG-DV-RETURN-CODE
              MOVE '08-DOC-DV-ERR       ' TO SG-DV-MOTIVO
              MOVE 'CNPJ COM TODOS OS DIGITOS IGUAIS'
                                          TO SG-DV-MENSAGEM
              GO TO 6000-FIM
           END-IF
      *
      *---- CALCULO DV1 ----------------------------------------------*
           MOVE ZERO TO WS-SOMA
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 12
              MOVE WS-DOC-NUMERICO(WS-IDX:1) TO WS-VALOR-DIG
              COMPUTE WS-SOMA = WS-SOMA
                    + (WS-VALOR-DIG * WS-PESO-CNPJ1(WS-IDX))
           END-PERFORM
           DIVIDE WS-SOMA BY 11 GIVING WS-RESTO REMAINDER WS-RESTO
           IF WS-RESTO < 2
              MOVE 0 TO WS-DV1
           ELSE
              COMPUTE WS-DV1 = 11 - WS-RESTO
           END-IF
      *
      *---- CALCULO DV2 ----------------------------------------------*
           MOVE ZERO TO WS-SOMA
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 13
              MOVE WS-DOC-NUMERICO(WS-IDX:1) TO WS-VALOR-DIG
              COMPUTE WS-SOMA = WS-SOMA
                    + (WS-VALOR-DIG * WS-PESO-CNPJ2(WS-IDX))
           END-PERFORM
           DIVIDE WS-SOMA BY 11 GIVING WS-RESTO REMAINDER WS-RESTO
           IF WS-RESTO < 2
              MOVE 0 TO WS-DV2
           ELSE
              COMPUTE WS-DV2 = 11 - WS-RESTO
           END-IF
      *
           MOVE WS-DOC-NUMERICO(13:1) TO WS-DV1-DOC
           MOVE WS-DOC-NUMERICO(14:1) TO WS-DV2-DOC
      *
           IF WS-DV1 = WS-DV1-DOC AND WS-DV2 = WS-DV2-DOC
              MOVE 'S'                    TO SG-DV-IND-VALIDO
              MOVE 00                     TO SG-DV-RETURN-CODE
              MOVE '00-DOC-OK           ' TO SG-DV-MOTIVO
              MOVE 'CNPJ VALIDO'          TO SG-DV-MENSAGEM
              PERFORM 8200-FORMATAR-CNPJ
           ELSE
              MOVE 'N'                    TO SG-DV-IND-VALIDO
              MOVE 08                     TO SG-DV-RETURN-CODE
              MOVE '08-DOC-DV-ERR       ' TO SG-DV-MOTIVO
              MOVE 'CNPJ COM DIGITO VERIFICADOR INVALIDO'
                                          TO SG-DV-MENSAGEM
           END-IF.
       6000-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO LE (LEGADO)                                         *
      *---------------------------------------------------------------*
      * ATENCAO: A INSCRICAO ESTADUAL POSSUI REGRA POR UF (COMPLEXA). *
      * NESTA ROTINA LEGADA APENAS CONFERIMOS COMPRIMENTO MINIMO E    *
      * QUE OS CARACTERES SEJAM NUMERICOS. A VALIDACAO COMPLETA DE DV *
      * NUNCA FOI IMPLEMENTADA (ITEM FORA DE COBERTURA DE TESTE).     *
      *---------------------------------------------------------------*
       7000-VALIDAR-LE-LEGADO SECTION.
           IF WS-LEN < 8
              MOVE 'N'                    TO SG-DV-IND-VALIDO
              MOVE 08                     TO SG-DV-RETURN-CODE
              MOVE '08-DOC-LEN-INVAL    ' TO SG-DV-MOTIVO
              MOVE 'IE MENOR QUE 8 DIGITOS - REJEITADA'
                                          TO SG-DV-MENSAGEM
              GO TO 7000-FIM
           END-IF
      *
           MOVE 'S'                    TO SG-DV-IND-VALIDO
           MOVE 00                     TO SG-DV-RETURN-CODE
           MOVE '00-DOC-OK           ' TO SG-DV-MOTIVO
           MOVE 'IE ACEITA SEM VALIDACAO DE DV (LEGADO)'
                                       TO SG-DV-MENSAGEM
           MOVE WS-DOC-NUMERICO(1:WS-LEN) TO SG-DV-DOC-FORMATADO.
       7000-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
      * FORMATACAO CPF NNN.NNN.NNN-NN                                 *
      *---------------------------------------------------------------*
       8100-FORMATAR-CPF SECTION.
           MOVE SPACES TO SG-DV-DOC-FORMATADO
           STRING WS-DOC-NUMERICO(1:3)  '.'
                  WS-DOC-NUMERICO(4:3)  '.'
                  WS-DOC-NUMERICO(7:3)  '-'
                  WS-DOC-NUMERICO(10:2)
                  DELIMITED BY SIZE
                  INTO SG-DV-DOC-FORMATADO
           END-STRING.
       8100-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
      * FORMATACAO CNPJ NN.NNN.NNN/NNNN-NN                            *
      *---------------------------------------------------------------*
       8200-FORMATAR-CNPJ SECTION.
           MOVE SPACES TO SG-DV-DOC-FORMATADO
           STRING WS-DOC-NUMERICO(1:2)  '.'
                  WS-DOC-NUMERICO(3:3)  '.'
                  WS-DOC-NUMERICO(6:3)  '/'
                  WS-DOC-NUMERICO(9:4)  '-'
                  WS-DOC-NUMERICO(13:2)
                  DELIMITED BY SIZE
                  INTO SG-DV-DOC-FORMATADO
           END-STRING.
       8200-FIM.  EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
           IF SG-DV-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0170 CONCLUIDO'
                                          TO SG-DV-MENSAGEM
           END-IF.
       9000-FIM.  EXIT.
