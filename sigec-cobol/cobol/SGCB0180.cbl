       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0180.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0180                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: UTILITARIO DE DATAS                               *
      *             (VALIDACAO / DIFERENCA / ADICAO / DIA-SEMANA /    *
      *              DIA UTIL / CONVERSAO)                            *
      * CHAMADO  .: CALL 'SGCB0180' USING SGDATAS.                    *
      *---------------------------------------------------------------*
      * OPERACOES SUPORTADAS EM SG-DT-FUNCAO (3 CARACTERES):          *
      *   'VAL' - VALIDA DATA AAAAMMDD                                *
      *   'DIF' - DIFERENCA EM DIAS ENTRE ENTRADA-1 E ENTRADA-2       *
      *   'ADD' - ADICIONA SG-DT-QTD-DIAS A ENTRADA-1 (UTIL/CORRIDO)  *
      *   'DSM' - DIA DA SEMANA DE ENTRADA-1                          *
      *   'DUT' - VERIFICA SE ENTRADA-1 E DIA UTIL                    *
      *---------------------------------------------------------------*
      * NOTA IMPORTANTE:                                              *
      * ESTA ROTINA CONSIDERA 'NAO UTIL' APENAS SABADO E DOMINGO.     *
      * FERIADOS SAO CONSIDERADOS SOMENTE SE O ARQUIVO SGLFERIA       *
      * ESTIVER ALOCADO NO DD 'SGLFERIA'. QUANDO O ARQUIVO NAO ESTA   *
      * DISPONIVEL, TODOS OS FERIADOS NACIONAIS/ESTADUAIS/BANCARIOS   *
      * SAO IGNORADOS - REGRA DE NEGOCIO CONSCIENTEMENTE INCOMPLETA   *
      * PARA AMBIENTES DE DESENVOLVIMENTO.                            *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (EX: FIM-DE-SEMANA / FERIADO)                    *
      *   08 - ERRO FUNCIONAL (DATA INVALIDA / FUNCAO DESCONHECIDA)   *
      *   12 - ERRO TECNICO (I/O SGLFERIA)                            *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       INPUT-OUTPUT SECTION.
       FILE-CONTROL.
           SELECT SGLFERIA-FILE
                  ASSIGN TO SGLFERIA
                  ORGANIZATION IS SEQUENTIAL
                  ACCESS MODE  IS SEQUENTIAL
                  FILE STATUS  IS WS-FERIA-STATUS.
      *
       DATA DIVISION.
       FILE SECTION.
       FD  SGLFERIA-FILE
           RECORDING MODE IS F
           BLOCK CONTAINS 0 RECORDS
           LABEL RECORDS ARE STANDARD.
           COPY SGLFERIA.
      *
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * STATUS DE ARQUIVO E FLAGS                                     *
      *---------------------------------------------------------------*
       01  WS-FERIA-STATUS           PIC X(02) VALUE '00'.
           88  WS-FERIA-OK           VALUE '00'.
           88  WS-FERIA-EOF          VALUE '10'.
           88  WS-FERIA-INDISP       VALUES '35' '37' '39' '93'.
      *
       01  WS-FLAGS.
           05  WS-FL-FERIA-ABERTO    PIC X(01) VALUE 'N'.
               88  WS-FERIA-ABERTO            VALUE 'S'.
               88  WS-FERIA-FECHADO           VALUE 'N'.
           05  WS-FL-ACHOU-FERIADO   PIC X(01) VALUE 'N'.
           05  WS-FL-FIM-ARQUIVO     PIC X(01) VALUE 'N'.
      *
      *---------------------------------------------------------------*
      * VARIAVEIS DE CALCULO                                          *
      *---------------------------------------------------------------*
       01  WS-CALC.
           05  WS-INT-1              PIC S9(09) COMP VALUE ZERO.
           05  WS-INT-2              PIC S9(09) COMP VALUE ZERO.
           05  WS-INT-AUX            PIC S9(09) COMP VALUE ZERO.
           05  WS-DIF                PIC S9(09) COMP VALUE ZERO.
           05  WS-DIAS-A-ADD         PIC S9(05) COMP-3 VALUE ZERO.
           05  WS-CONTA-UTEIS        PIC S9(05) COMP-3 VALUE ZERO.
           05  WS-PASSOS             PIC S9(05) COMP-3 VALUE ZERO.
           05  WS-DIA-SEM-N          PIC 9(01)   VALUE ZERO.
           05  WS-INCREMENTO         PIC S9(01)  VALUE +1.
           05  WS-DATA-TMP           PIC 9(08)   VALUE ZERO.
      *
      *---------------------------------------------------------------*
      * TABELA DE DIAS POR MES (BISSEXTO TRATADO NA PROCEDURE)        *
      *---------------------------------------------------------------*
       01  WS-DIAS-MES.
           05  FILLER PIC 9(02) VALUE 31.
           05  FILLER PIC 9(02) VALUE 28.
           05  FILLER PIC 9(02) VALUE 31.
           05  FILLER PIC 9(02) VALUE 30.
           05  FILLER PIC 9(02) VALUE 31.
           05  FILLER PIC 9(02) VALUE 30.
           05  FILLER PIC 9(02) VALUE 31.
           05  FILLER PIC 9(02) VALUE 31.
           05  FILLER PIC 9(02) VALUE 30.
           05  FILLER PIC 9(02) VALUE 31.
           05  FILLER PIC 9(02) VALUE 30.
           05  FILLER PIC 9(02) VALUE 31.
       01  WS-DIAS-MES-R REDEFINES WS-DIAS-MES.
           05  WS-DIA-MES OCCURS 12 TIMES PIC 9(02).
      *
      *---------------------------------------------------------------*
      * TABELA DE NOMES DE DIA DA SEMANA (1=DOM ... 7=SAB)            *
      *---------------------------------------------------------------*
       01  WS-NOMES-SEMANA.
           05  FILLER PIC X(10) VALUE 'DOMINGO   '.
           05  FILLER PIC X(10) VALUE 'SEGUNDA   '.
           05  FILLER PIC X(10) VALUE 'TERCA     '.
           05  FILLER PIC X(10) VALUE 'QUARTA    '.
           05  FILLER PIC X(10) VALUE 'QUINTA    '.
           05  FILLER PIC X(10) VALUE 'SEXTA     '.
           05  FILLER PIC X(10) VALUE 'SABADO    '.
       01  WS-NOMES-SEMANA-R REDEFINES WS-NOMES-SEMANA.
           05  WS-NOME-DIA OCCURS 7 TIMES PIC X(10).
      *
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
       LINKAGE SECTION.
           COPY SGDATAS.
      *
       PROCEDURE DIVISION USING SGDATAS.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
      *
           EVALUATE TRUE
              WHEN SG-DT-VALIDAR
                 PERFORM 2000-VALIDAR-DATA
              WHEN SG-DT-DIFERENCA
                 PERFORM 3000-DIFERENCA-DIAS
              WHEN SG-DT-ADD-DIAS
                 PERFORM 4000-ADICIONAR-DIAS
              WHEN SG-DT-DIA-SEMANA
                 PERFORM 5000-DIA-DA-SEMANA
              WHEN SG-DT-DIA-UTIL
                 PERFORM 6000-VERIFICAR-DIA-UTIL
              WHEN OTHER
                 MOVE 08                     TO SG-DT-RETURN-CODE
                 MOVE '08-DT-FORMATO       ' TO SG-DT-MENSAGEM(1:20)
                 MOVE 'FUNCAO NAO SUPORTADA'
                                             TO SG-DT-MENSAGEM(21:20)
           END-EVALUATE
      *
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE ZERO           TO SG-DT-RETURN-CODE
           MOVE SPACES         TO SG-DT-MENSAGEM
           MOVE 'S'            TO SG-DT-IND-VALIDO
           MOVE 'N'            TO SG-DT-IND-FIM-SEM
           MOVE 'N'            TO SG-DT-IND-FERIADO
           MOVE ZERO           TO SG-DT-DIF-DIAS
           MOVE ZERO           TO SG-DT-SAIDA
           MOVE ZERO           TO SG-DT-DIA-SEM-N
           MOVE SPACES         TO SG-DT-DIA-SEM-NM.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO DE DATA AAAAMMDD                                    *
      * ACEITA 1900..2099 - REJEITA 31/02, 30/02, ANO/MES/DIA ZERO    *
      *---------------------------------------------------------------*
       2000-VALIDAR-DATA SECTION.
           MOVE SG-DT-ENTRADA-1 TO WS-DATA-TMP
           PERFORM 2500-VAL-DATA-INTERNO
      *
           IF SG-DT-IND-VALIDO = 'S'
              MOVE 00                     TO SG-DT-RETURN-CODE
              MOVE '00-DT-OK            ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'DATA VALIDA'          TO SG-DT-MENSAGEM(21:20)
           ELSE
              MOVE 08                     TO SG-DT-RETURN-CODE
              MOVE '08-DT-INVAL         ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'DATA INVALIDA'       TO SG-DT-MENSAGEM(21:20)
           END-IF.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VALIDACAO INTERNA - USA WS-DATA-TMP E DEVOLVE SG-DT-IND-VALIDO*
      *---------------------------------------------------------------*
       2500-VAL-DATA-INTERNO SECTION.
           MOVE 'S' TO SG-DT-IND-VALIDO
      *
           IF WS-DATA-TMP(1:4) < '1900'
              OR WS-DATA-TMP(1:4) > '2099'
              MOVE 'N' TO SG-DT-IND-VALIDO
              GO TO 2500-FIM
           END-IF
      *
           IF WS-DATA-TMP(5:2) < '01'
              OR WS-DATA-TMP(5:2) > '12'
              MOVE 'N' TO SG-DT-IND-VALIDO
              GO TO 2500-FIM
           END-IF
      *
           IF WS-DATA-TMP(7:2) < '01'
              MOVE 'N' TO SG-DT-IND-VALIDO
              GO TO 2500-FIM
           END-IF
      *
           MOVE WS-DATA-TMP(5:2) TO WS-INT-1
           MOVE WS-DIA-MES(WS-INT-1) TO WS-INT-AUX
      *
      *---- BISSEXTO ------------------------------------------------ *
           IF WS-INT-1 = 2
              MOVE 28 TO WS-INT-AUX
              IF FUNCTION MOD(FUNCTION NUMVAL(WS-DATA-TMP(1:4)) 4) = 0
                 IF FUNCTION MOD(FUNCTION NUMVAL(WS-DATA-TMP(1:4))
                                 100) NOT = 0
                    MOVE 29 TO WS-INT-AUX
                 ELSE
                    IF FUNCTION MOD(FUNCTION NUMVAL(WS-DATA-TMP(1:4))
                                    400) = 0
                       MOVE 29 TO WS-INT-AUX
                    END-IF
                 END-IF
              END-IF
           END-IF
      *
           MOVE WS-DATA-TMP(7:2) TO WS-INT-2
           IF WS-INT-2 > WS-INT-AUX
              MOVE 'N' TO SG-DT-IND-VALIDO
           END-IF.
       2500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * DIFERENCA EM DIAS ENTRE ENTRADA-1 E ENTRADA-2                 *
      *---------------------------------------------------------------*
       3000-DIFERENCA-DIAS SECTION.
           MOVE SG-DT-ENTRADA-1 TO WS-DATA-TMP
           PERFORM 2500-VAL-DATA-INTERNO
           IF SG-DT-IND-VALIDO = 'N'
              MOVE 08                     TO SG-DT-RETURN-CODE
              MOVE '08-DT-INVAL         ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'DATA-1 INVALIDA'      TO SG-DT-MENSAGEM(21:20)
              GO TO 3000-FIM
           END-IF
      *
           MOVE SG-DT-ENTRADA-2 TO WS-DATA-TMP
           PERFORM 2500-VAL-DATA-INTERNO
           IF SG-DT-IND-VALIDO = 'N'
              MOVE 08                     TO SG-DT-RETURN-CODE
              MOVE '08-DT-INVAL         ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'DATA-2 INVALIDA'      TO SG-DT-MENSAGEM(21:20)
              GO TO 3000-FIM
           END-IF
      *
           COMPUTE WS-INT-1 =
                   FUNCTION INTEGER-OF-DATE(SG-DT-ENTRADA-1)
           COMPUTE WS-INT-2 =
                   FUNCTION INTEGER-OF-DATE(SG-DT-ENTRADA-2)
           COMPUTE SG-DT-DIF-DIAS = WS-INT-2 - WS-INT-1
      *
           MOVE 00                     TO SG-DT-RETURN-CODE
           MOVE '00-DT-OK            ' TO SG-DT-MENSAGEM(1:20)
           MOVE 'DIFERENCA CALCULADA'   TO SG-DT-MENSAGEM(21:20).
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * ADICIONAR DIAS (CORRIDOS OU UTEIS)                            *
      *---------------------------------------------------------------*
       4000-ADICIONAR-DIAS SECTION.
           MOVE SG-DT-ENTRADA-1 TO WS-DATA-TMP
           PERFORM 2500-VAL-DATA-INTERNO
           IF SG-DT-IND-VALIDO = 'N'
              MOVE 08                     TO SG-DT-RETURN-CODE
              MOVE '08-DT-INVAL         ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'DATA-1 INVALIDA'      TO SG-DT-MENSAGEM(21:20)
              GO TO 4000-FIM
           END-IF
      *
           MOVE SG-DT-QTD-DIAS TO WS-DIAS-A-ADD
      *
           IF WS-DIAS-A-ADD >= 0
              MOVE +1 TO WS-INCREMENTO
           ELSE
              MOVE -1 TO WS-INCREMENTO
              COMPUTE WS-DIAS-A-ADD = -1 * WS-DIAS-A-ADD
           END-IF
      *
           COMPUTE WS-INT-1 =
                   FUNCTION INTEGER-OF-DATE(SG-DT-ENTRADA-1)
      *
           IF SG-DT-CONSIDERA-CORRIDOS
              COMPUTE WS-INT-1 = WS-INT-1
                    + (WS-INCREMENTO * WS-DIAS-A-ADD)
           ELSE
              PERFORM 4500-ADD-UTEIS
           END-IF
      *
           COMPUTE SG-DT-SAIDA =
                   FUNCTION DATE-OF-INTEGER(WS-INT-1)
      *
           MOVE 00                     TO SG-DT-RETURN-CODE
           MOVE '00-DT-OK            ' TO SG-DT-MENSAGEM(1:20)
           MOVE 'DIAS ADICIONADOS'     TO SG-DT-MENSAGEM(21:20).
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       4500-ADD-UTEIS SECTION.
           MOVE ZERO TO WS-CONTA-UTEIS
           PERFORM UNTIL WS-CONTA-UTEIS >= WS-DIAS-A-ADD
              COMPUTE WS-INT-1 = WS-INT-1 + WS-INCREMENTO
              COMPUTE WS-DATA-TMP =
                      FUNCTION DATE-OF-INTEGER(WS-INT-1)
              PERFORM 5500-CALC-DIA-SEM
              IF WS-DIA-SEM-N NOT = 1 AND WS-DIA-SEM-N NOT = 7
                 ADD 1 TO WS-CONTA-UTEIS
              END-IF
           END-PERFORM.
       4500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * DIA DA SEMANA (1=DOM .. 7=SAB) - VIA INTEGER-OF-DATE          *
      *---------------------------------------------------------------*
       5000-DIA-DA-SEMANA SECTION.
           MOVE SG-DT-ENTRADA-1 TO WS-DATA-TMP
           PERFORM 2500-VAL-DATA-INTERNO
           IF SG-DT-IND-VALIDO = 'N'
              MOVE 08                     TO SG-DT-RETURN-CODE
              MOVE '08-DT-INVAL         ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'DATA-1 INVALIDA'      TO SG-DT-MENSAGEM(21:20)
              GO TO 5000-FIM
           END-IF
      *
           PERFORM 5500-CALC-DIA-SEM
           MOVE WS-DIA-SEM-N          TO SG-DT-DIA-SEM-N
           MOVE WS-NOME-DIA(WS-DIA-SEM-N) TO SG-DT-DIA-SEM-NM
      *
           IF WS-DIA-SEM-N = 1 OR WS-DIA-SEM-N = 7
              MOVE 'S' TO SG-DT-IND-FIM-SEM
           ELSE
              MOVE 'N' TO SG-DT-IND-FIM-SEM
           END-IF
      *
           MOVE 00                     TO SG-DT-RETURN-CODE
           MOVE '00-DT-OK            ' TO SG-DT-MENSAGEM(1:20)
           MOVE 'DIA-SEMANA CALCULADO'  TO SG-DT-MENSAGEM(21:20).
       5000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * INTEGER-OF-DATE(19000101) = 1  E  1=SEGUNDA. AJUSTAMOS PARA   *
      * CONVENCAO 1=DOM ... 7=SAB DEFINIDA EM SGDATAS.                *
      *---------------------------------------------------------------*
       5500-CALC-DIA-SEM SECTION.
           COMPUTE WS-INT-AUX =
                   FUNCTION INTEGER-OF-DATE(WS-DATA-TMP)
           COMPUTE WS-DIA-SEM-N =
                   FUNCTION MOD(WS-INT-AUX 7) + 1.
       5500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * VERIFICAR SE E DIA UTIL                                       *
      *---------------------------------------------------------------*
       6000-VERIFICAR-DIA-UTIL SECTION.
           MOVE SG-DT-ENTRADA-1 TO WS-DATA-TMP
           PERFORM 2500-VAL-DATA-INTERNO
           IF SG-DT-IND-VALIDO = 'N'
              MOVE 08                     TO SG-DT-RETURN-CODE
              MOVE '08-DT-INVAL         ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'DATA-1 INVALIDA'      TO SG-DT-MENSAGEM(21:20)
              GO TO 6000-FIM
           END-IF
      *
           PERFORM 5500-CALC-DIA-SEM
           MOVE WS-DIA-SEM-N              TO SG-DT-DIA-SEM-N
           MOVE WS-NOME-DIA(WS-DIA-SEM-N) TO SG-DT-DIA-SEM-NM
      *
           IF WS-DIA-SEM-N = 1 OR WS-DIA-SEM-N = 7
              MOVE 'S' TO SG-DT-IND-FIM-SEM
              MOVE 'N' TO SG-DT-IND-VALIDO
              MOVE 04                     TO SG-DT-RETURN-CODE
              MOVE '04-DT-FIM-SEM       ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'FIM DE SEMANA'        TO SG-DT-MENSAGEM(21:20)
              GO TO 6000-FIM
           END-IF
      *
      *---- CONSULTA OPCIONAL A SGLFERIA ---------------------------- *
           PERFORM 6500-CHECAR-FERIADO-OPCIONAL
      *
           IF SG-DT-E-FERIADO
              MOVE 'N' TO SG-DT-IND-VALIDO
              MOVE 04                     TO SG-DT-RETURN-CODE
              MOVE '04-DT-FERIADO       ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'FERIADO NA BASE'      TO SG-DT-MENSAGEM(21:20)
           ELSE
              MOVE 'S' TO SG-DT-IND-VALIDO
              MOVE 00                     TO SG-DT-RETURN-CODE
              MOVE '00-DT-OK            ' TO SG-DT-MENSAGEM(1:20)
              MOVE 'DIA UTIL'             TO SG-DT-MENSAGEM(21:20)
           END-IF.
       6000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * ABRE SGLFERIA E VARRE ATE ACHAR OU EOF. SE O DD NAO EXISTE    *
      * (STATUS 35/37/39/93) SEGUIMOS SEM FERIADO - COMPORTAMENTO     *
      * INTENCIONAL DOCUMENTADO.                                      *
      *---------------------------------------------------------------*
       6500-CHECAR-FERIADO-OPCIONAL SECTION.
           MOVE 'N' TO SG-DT-IND-FERIADO
           MOVE 'N' TO WS-FL-ACHOU-FERIADO
      *
           OPEN INPUT SGLFERIA-FILE
           IF WS-FERIA-INDISP
              MOVE 'N' TO WS-FL-FERIA-ABERTO
              GO TO 6500-FIM
           END-IF
           IF NOT WS-FERIA-OK
              MOVE 'N' TO WS-FL-FERIA-ABERTO
              GO TO 6500-FIM
           END-IF
           MOVE 'S' TO WS-FL-FERIA-ABERTO
      *
           MOVE 'N' TO WS-FL-FIM-ARQUIVO
           PERFORM UNTIL WS-FL-FIM-ARQUIVO = 'S'
                     OR  WS-FL-ACHOU-FERIADO = 'S'
              READ SGLFERIA-FILE
                 AT END MOVE 'S' TO WS-FL-FIM-ARQUIVO
                 NOT AT END
                    IF FERIA-DT-FERIADO = SG-DT-ENTRADA-1
                       MOVE 'S' TO WS-FL-ACHOU-FERIADO
                    END-IF
              END-READ
           END-PERFORM
      *
           CLOSE SGLFERIA-FILE
           MOVE 'N' TO WS-FL-FERIA-ABERTO
      *
           IF WS-FL-ACHOU-FERIADO = 'S'
              MOVE 'S' TO SG-DT-IND-FERIADO
           END-IF.
       6500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
           IF SG-DT-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0180 CONCLUIDO'
                                          TO SG-DT-MENSAGEM
           END-IF.
       9000-FIM. EXIT.
