       IDENTIFICATION DIVISION.
       PROGRAM-ID.    SGCB0200 IS INITIAL PROGRAM.
       AUTHOR.        SIGEC-LAB.
      *****************************************************************
      * PROGRAMA .: SGCB0200                                          *
      * SISTEMA  .: SIGEC                                             *
      * FUNCAO   .: FORMATACAO DE LINHA DE INTERFACE (CB/CT/RG)       *
      *             COM MASCARAMENTO DE DOCUMENTO, DIGITO DE CONTROLE *
      *             E "CRIPTOGRAFIA" LEVE (XOR/ROTACAO).              *
      * CHAMADO  .: CALL 'SGCB0200' USING SGINTFMT.  (DINAMICO)       *
      *---------------------------------------------------------------*
      * REGRAS DE TIPO DE REGISTRO:                                   *
      *   H (HEADER)  - MONTA CABECALHO DA REMESSA                    *
      *   D (DETAIL)  - MONTA LINHA DETALHE, MASCARA CPF/CNPJ         *
      *                 CALCULA DIGITO DE CONTROLE (SOMA MOD 10)      *
      *   T (TRAILER) - MONTA TRAILER COM HASH FICTICIO               *
      *---------------------------------------------------------------*
      * ATENCAO - SEGURANCA:                                          *
      * A "CRIPTOGRAFIA" AQUI E APENAS XOR COM CHAVE FIXA + ROTACAO.  *
      * ESTE MECANISMO NAO E CRIPTOGRAFICAMENTE SEGURO E NAO DEVE SER *
      * USADO PARA PROTEGER DADOS SIGILOSOS. UTILIZAR APENAS PARA     *
      * OFUSCACAO DE CAMPOS EM ARQUIVOS INTERNOS DE INTERFACE.        *
      *---------------------------------------------------------------*
      * CODIGOS DE RETORNO:                                           *
      *   00 - OK                                                     *
      *   04 - AVISO (LINHA TRUNCADA)                                 *
      *   08 - ERRO FUNCIONAL (TIPO INVALIDO / CAMPO OBRIGATORIO)     *
      *****************************************************************
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       SOURCE-COMPUTER. IBM-ZOS.
       OBJECT-COMPUTER. IBM-ZOS.
      *
       DATA DIVISION.
       WORKING-STORAGE SECTION.
      *---------------------------------------------------------------*
      * BUFFER DE TRABALHO (300 = LRECL MAXIMO)                       *
      *---------------------------------------------------------------*
       01  WS-BUFFER.
           05  WS-BUFFER-LINHA      PIC X(300) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * VARIAVEIS DE MASCARAMENTO E CALCULO                           *
      *---------------------------------------------------------------*
       01  WS-VARS.
           05  WS-DOC-LIMPO         PIC X(14) VALUE SPACES.
           05  WS-DOC-MASCARADO     PIC X(18) VALUE SPACES.
           05  WS-DOC-LEN           PIC 9(02) VALUE ZERO.
           05  WS-IDX               PIC 9(03) VALUE ZERO.
           05  WS-IDX2              PIC 9(03) VALUE ZERO.
           05  WS-CHAR              PIC X(01) VALUE SPACE.
           05  WS-BYTE              PIC 9(03) VALUE ZERO.
           05  WS-BYTE-XOR          PIC 9(03) VALUE ZERO.
           05  WS-SOMA              PIC 9(09) VALUE ZERO.
           05  WS-DIG-CTL           PIC 9(01) VALUE ZERO.
           05  WS-HASH              PIC 9(10) VALUE ZERO.
           05  WS-HASH-X            PIC X(10) VALUE '0000000000'.
           05  WS-VLR-EDIT          PIC ZZZZZZZZZZZZZ9.99.
           05  WS-DT-EDIT           PIC 9(08) VALUE ZERO.
           05  WS-SEQ-EDIT          PIC 9(09) VALUE ZERO.
      *
      *---------------------------------------------------------------*
      * CHAVE FIXA XOR (NAO SEGURA - APENAS OFUSCACAO)                *
      *---------------------------------------------------------------*
       01  WS-CRIPTO.
           05  WS-CHAVE-XOR         PIC 9(03) VALUE 042.
           05  WS-ROTACAO           PIC 9(02) VALUE 05.
           05  WS-TEXTO-CRIPTO      PIC X(40) VALUE SPACES.
      *
      *---------------------------------------------------------------*
      * TABELA DE PESOS PARA HASH FICTICIO                            *
      *---------------------------------------------------------------*
       01  WS-PESOS-HASH.
           05  FILLER PIC 9(02) VALUE 07.
           05  FILLER PIC 9(02) VALUE 11.
           05  FILLER PIC 9(02) VALUE 13.
           05  FILLER PIC 9(02) VALUE 17.
           05  FILLER PIC 9(02) VALUE 19.
       01  WS-PESOS-HASH-R REDEFINES WS-PESOS-HASH.
           05  WS-PESO-HASH OCCURS 5 TIMES PIC 9(02).
      *
           COPY SGRETCOD.
           COPY SGERRMSG.
      *
       LINKAGE SECTION.
           COPY SGINTFMT.
      *
       PROCEDURE DIVISION USING SGINTFMT.
      *---------------------------------------------------------------*
       0000-PRINCIPAL SECTION.
           PERFORM 1000-INICIALIZAR
      *
           EVALUATE TRUE
              WHEN SG-IF-REG-HEADER
                 PERFORM 2000-MONTA-HEADER
              WHEN SG-IF-REG-DETAIL
                 PERFORM 3000-MONTA-DETAIL
              WHEN SG-IF-REG-TRAILER
                 PERFORM 4000-MONTA-TRAILER
              WHEN OTHER
                 MOVE 08                     TO SG-IF-RETURN-CODE
                 MOVE '08-INT-FORMAT       ' TO SG-IF-MENSAGEM(1:20)
                 MOVE 'TIPO DE REGISTRO INVALIDO'
                                             TO SG-IF-MENSAGEM(21:60)
           END-EVALUATE
      *
           PERFORM 9000-FINALIZAR
           GOBACK.
       0000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       1000-INICIALIZAR SECTION.
           MOVE SPACES     TO SG-IF-LINHA-FORMATADA
                              WS-BUFFER-LINHA
                              SG-IF-MENSAGEM
                              WS-DOC-MASCARADO
                              WS-DOC-LIMPO
                              WS-TEXTO-CRIPTO
           MOVE ZERO       TO SG-IF-LRECL-SAIDA
                              SG-IF-RETURN-CODE
                              WS-HASH
                              WS-SOMA
                              WS-DIG-CTL
                              WS-DOC-LEN
           MOVE 'N'        TO SG-IF-IND-TRUNCADO.
       1000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * HEADER: TIPO-INT + DATA-REF + SEQUENCIAL + LITERAL FIXO       *
      *---------------------------------------------------------------*
       2000-MONTA-HEADER SECTION.
           MOVE SG-IF-DT-REFERENCIA TO WS-DT-EDIT
           MOVE SG-IF-SEQ-REGISTRO  TO WS-SEQ-EDIT
      *
           STRING 'H|'
                  SG-IF-TIPO-INTERFACE  '|'
                  WS-DT-EDIT            '|'
                  WS-SEQ-EDIT           '|'
                  'SIGEC-REMESSA-V1'
                  DELIMITED BY SIZE
                  INTO WS-BUFFER-LINHA
           END-STRING
      *
           PERFORM 8000-DEVOLVER-LINHA.
       2000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * DETAIL: MASCARA DOCUMENTO, MONTA CAMPOS, CALCULA DIG. CONTROLE*
      *---------------------------------------------------------------*
       3000-MONTA-DETAIL SECTION.
           MOVE SG-IF-CLI-DOCUMENTO TO WS-DOC-LIMPO
           PERFORM 3100-CONTAR-DIG-DOC
      *
           IF WS-DOC-LEN = 11
              PERFORM 3200-MASCARAR-CPF
           ELSE
              IF WS-DOC-LEN = 14
                 PERFORM 3300-MASCARAR-CNPJ
              ELSE
                 MOVE SG-IF-CLI-DOCUMENTO TO WS-DOC-MASCARADO
              END-IF
           END-IF
      *
           MOVE SG-IF-VLR-1 TO WS-VLR-EDIT
      *
           STRING 'D|'
                  SG-IF-CTR-NUMERO      '|'
                  WS-DOC-MASCARADO      '|'
                  FUNCTION TRIM (SG-IF-CLI-NOME) '|'
                  WS-VLR-EDIT           '|'
                  DELIMITED BY SIZE
                  INTO WS-BUFFER-LINHA
           END-STRING
      *
           PERFORM 3400-CRIPTO-TEXTO-1
           STRING FUNCTION TRIM (WS-BUFFER-LINHA)
                  FUNCTION TRIM (WS-TEXTO-CRIPTO) '|'
                  DELIMITED BY SIZE
                  INTO WS-BUFFER-LINHA
           END-STRING
      *
           PERFORM 3500-CALC-DIG-CTL
           STRING FUNCTION TRIM (WS-BUFFER-LINHA)
                  WS-DIG-CTL
                  DELIMITED BY SIZE
                  INTO WS-BUFFER-LINHA
           END-STRING
      *
           PERFORM 8000-DEVOLVER-LINHA.
       3000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * CONTA DIGITOS NUMERICOS EM CLI-DOCUMENTO                      *
      *---------------------------------------------------------------*
       3100-CONTAR-DIG-DOC SECTION.
           MOVE ZERO   TO WS-DOC-LEN
           MOVE SPACES TO WS-DOC-LIMPO
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 14
              IF SG-IF-CLI-DOCUMENTO(WS-IDX:1) >= '0'
                 AND SG-IF-CLI-DOCUMENTO(WS-IDX:1) <= '9'
                 ADD 1 TO WS-DOC-LEN
                 MOVE SG-IF-CLI-DOCUMENTO(WS-IDX:1)
                                       TO WS-DOC-LIMPO(WS-DOC-LEN:1)
              END-IF
           END-PERFORM.
       3100-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * MASCARAR CPF: ***.***.***-XX (ULTIMOS 2 DIGITOS EXPOSTOS)     *
      *---------------------------------------------------------------*
       3200-MASCARAR-CPF SECTION.
           STRING '***.***.***-'
                  WS-DOC-LIMPO(10:2)
                  DELIMITED BY SIZE
                  INTO WS-DOC-MASCARADO
           END-STRING.
       3200-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * MASCARAR CNPJ: **.***.***/****-XX (ULTIMOS 2 DIGITOS)         *
      *---------------------------------------------------------------*
       3300-MASCARAR-CNPJ SECTION.
           STRING '**.***.***/****-'
                  WS-DOC-LIMPO(13:2)
                  DELIMITED BY SIZE
                  INTO WS-DOC-MASCARADO
           END-STRING.
       3300-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * "CRIPTOGRAFIA" FICTICIA (XOR + ROTACAO) - NAO SEGURA          *
      *---------------------------------------------------------------*
       3400-CRIPTO-TEXTO-1 SECTION.
           MOVE SPACES TO WS-TEXTO-CRIPTO
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 40
              MOVE SG-IF-TEXTO-1(WS-IDX:1) TO WS-CHAR
              IF WS-CHAR = SPACE
                 MOVE SPACE TO WS-TEXTO-CRIPTO(WS-IDX:1)
              ELSE
                 COMPUTE WS-BYTE = FUNCTION ORD(WS-CHAR) - 1
                 COMPUTE WS-BYTE-XOR =
                         FUNCTION MOD((WS-BYTE + WS-ROTACAO)
                                      256)
                 COMPUTE WS-BYTE-XOR =
                         FUNCTION MOD(
                           FUNCTION REM(WS-BYTE-XOR WS-CHAVE-XOR)
                           + WS-CHAVE-XOR
                           256)
      *          FALLBACK: SE O CARACTERE RESULTANTE FICAR FORA DA
      *          FAIXA IMPRIMIVEL, TROCA POR '#'. EVITA POLUIR ARQ.
                 IF WS-BYTE-XOR < 32 OR WS-BYTE-XOR > 126
                    MOVE '#' TO WS-TEXTO-CRIPTO(WS-IDX:1)
                 ELSE
                    ADD 1 TO WS-BYTE-XOR
                    MOVE FUNCTION CHAR(WS-BYTE-XOR)
                                       TO WS-TEXTO-CRIPTO(WS-IDX:1)
                 END-IF
              END-IF
           END-PERFORM.
       3400-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * DIGITO DE CONTROLE SIMPLES: SOMA POSICOES MOD 10              *
      *---------------------------------------------------------------*
       3500-CALC-DIG-CTL SECTION.
           MOVE ZERO TO WS-SOMA
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 300
              MOVE WS-BUFFER-LINHA(WS-IDX:1) TO WS-CHAR
              IF WS-CHAR NOT = SPACE
                 ADD FUNCTION ORD(WS-CHAR) TO WS-SOMA
              END-IF
           END-PERFORM
           COMPUTE WS-DIG-CTL = FUNCTION MOD(WS-SOMA 10).
       3500-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * TRAILER: TIPO-INT + SEQ + HASH FICTICIO                       *
      *---------------------------------------------------------------*
       4000-MONTA-TRAILER SECTION.
           PERFORM 4100-HASH-FICTICIO
           MOVE WS-HASH TO WS-HASH-X
           MOVE SG-IF-SEQ-REGISTRO TO WS-SEQ-EDIT
      *
           STRING 'T|'
                  SG-IF-TIPO-INTERFACE  '|'
                  WS-SEQ-EDIT           '|'
                  WS-HASH-X
                  DELIMITED BY SIZE
                  INTO WS-BUFFER-LINHA
           END-STRING
      *
           PERFORM 8000-DEVOLVER-LINHA.
       4000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * HASH FICTICIO: SOMA PONDERADA DOS BYTES DOS CAMPOS PRINCIPAIS *
      * NAO E CRIPTOGRAFICAMENTE SEGURO. APENAS PARA CONTROLE INTERNO.*
      *---------------------------------------------------------------*
       4100-HASH-FICTICIO SECTION.
           MOVE ZERO TO WS-HASH
           MOVE 1    TO WS-IDX2
      *
           PERFORM 4110-HASH-CAMPO
           PERFORM 4120-HASH-VALORES.
       4100-FIM. EXIT.
      *
       4110-HASH-CAMPO SECTION.
           PERFORM VARYING WS-IDX FROM 1 BY 1 UNTIL WS-IDX > 15
              MOVE SG-IF-CTR-NUMERO(WS-IDX:1) TO WS-CHAR
              IF WS-CHAR NOT = SPACE
                 COMPUTE WS-HASH =
                         FUNCTION MOD(
                           WS-HASH
                           + (FUNCTION ORD(WS-CHAR)
                              * WS-PESO-HASH(WS-IDX2))
                           9999999999)
                 ADD 1 TO WS-IDX2
                 IF WS-IDX2 > 5
                    MOVE 1 TO WS-IDX2
                 END-IF
              END-IF
           END-PERFORM.
       4110-FIM. EXIT.
      *
       4120-HASH-VALORES SECTION.
           COMPUTE WS-HASH =
                   FUNCTION MOD(
                     WS-HASH
                     + (SG-IF-VLR-1 * 7)
                     + (SG-IF-VLR-2 * 11)
                     + (SG-IF-VLR-3 * 13)
                     + SG-IF-QTD-1
                     + SG-IF-QTD-2
                     9999999999).
       4120-FIM. EXIT.
      *
      *---------------------------------------------------------------*
      * COPIA WS-BUFFER-LINHA PARA A LINKAGE E CALCULA LRECL / TRUNC. *
      *---------------------------------------------------------------*
       8000-DEVOLVER-LINHA SECTION.
           MOVE WS-BUFFER-LINHA TO SG-IF-LINHA-FORMATADA
      *
           MOVE 300 TO SG-IF-LRECL-SAIDA
           PERFORM VARYING WS-IDX FROM 300 BY -1
                     UNTIL WS-IDX < 1
                        OR WS-BUFFER-LINHA(WS-IDX:1) NOT = SPACE
              CONTINUE
           END-PERFORM
           IF WS-IDX < 1
              MOVE 0 TO SG-IF-LRECL-SAIDA
           ELSE
              MOVE WS-IDX TO SG-IF-LRECL-SAIDA
           END-IF
      *
           IF SG-IF-LRECL-SAIDA >= 300
              MOVE 'S' TO SG-IF-IND-TRUNCADO
              MOVE 04                     TO SG-IF-RETURN-CODE
              MOVE '04-INT-TRUNC        ' TO SG-IF-MENSAGEM(1:20)
              MOVE 'LINHA ATINGIU LRECL MAXIMO - VERIFICAR CAMPOS'
                                          TO SG-IF-MENSAGEM(21:60)
           ELSE
              MOVE 'N' TO SG-IF-IND-TRUNCADO
              IF SG-IF-RETURN-CODE = 0
                 MOVE 00                     TO SG-IF-RETURN-CODE
                 MOVE '00-INT-GER-OK       ' TO SG-IF-MENSAGEM(1:20)
                 MOVE 'LINHA GERADA COM SUCESSO'
                                             TO SG-IF-MENSAGEM(21:60)
              END-IF
           END-IF.
       8000-FIM. EXIT.
      *
      *---------------------------------------------------------------*
       9000-FINALIZAR SECTION.
           IF SG-IF-MENSAGEM = SPACES
              MOVE 'PROCESSAMENTO SGCB0200 CONCLUIDO'
                                          TO SG-IF-MENSAGEM
           END-IF.
       9000-FIM. EXIT.
