      *****************************************************************
      * COPYBOOK.: SGFINANC                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: AREA DE COMUNICACAO DO MOTOR FINANCEIRO SGCB0110    *
      * USO .....: LINKAGE-SECTION DE SGCB0110 E CHAMADORES (SGCB0070, *
      *            SGCB0120, SGCB0130).                                *
      *----------------------------------------------------------------*
      * O CHAMADOR PREENCHE OS CAMPOS DE ENTRADA E ZERA OS DE SAIDA.   *
      * SGCB0110 RETORNA JUROS, MULTA, VALOR ATUALIZADO E RC.          *
      * REGRAS ADICIONAIS POR TIPO DE CONTRATO ESTAO EM               *
      * docs/REGRAS_NEGOCIO.md SECAO 4.                                *
      *****************************************************************
       01  SGFINANC.
      *---------------- ENTRADA ---------------------------------------*
           05  SG-FIN-ENTRADA.
               10  SG-FIN-PRINCIPAL      PIC S9(13)V99 COMP-3.
               10  SG-FIN-DIAS-ATRASO    PIC S9(05)    COMP-3.
               10  SG-FIN-TAXA-MENSAL    PIC S9(03)V99 COMP-3.
               10  SG-FIN-PCT-MULTA      PIC S9(03)V99 COMP-3.
               10  SG-FIN-TIPO-CTR       PIC X(02).
                   88  SG-FIN-CTR-CR              VALUE 'CR'.
                   88  SG-FIN-CTR-CD              VALUE 'CD'.
                   88  SG-FIN-CTR-FI              VALUE 'FI'.
                   88  SG-FIN-CTR-CO              VALUE 'CO'.
                   88  SG-FIN-CTR-EM              VALUE 'EM'.
                   88  SG-FIN-CTR-VALIDO          VALUES
                       'CR' 'CD' 'FI' 'CO' 'EM'.
               10  SG-FIN-TIPO-CLI       PIC X(02).
                   88  SG-FIN-CLI-PF              VALUE 'PF'.
                   88  SG-FIN-CLI-PJ              VALUE 'PJ'.
                   88  SG-FIN-CLI-ES              VALUE 'ES'.
                   88  SG-FIN-CLI-VALIDO          VALUES
                       'PF' 'PJ' 'ES'.
               10  SG-FIN-IND-PARCIAL    PIC X(01).
                   88  SG-FIN-E-PARCIAL           VALUE 'S'.
                   88  SG-FIN-NAO-PARCIAL         VALUE 'N'.
               10  SG-FIN-IND-SIMULACAO  PIC X(01).
                   88  SG-FIN-E-SIMULACAO         VALUE 'S'.
                   88  SG-FIN-NAO-SIMULA          VALUE 'N'.
               10  SG-FIN-DT-VCTO        PIC 9(08).
               10  SG-FIN-DT-BASE        PIC 9(08).
      *
      *---------------- SAIDA -----------------------------------------*
           05  SG-FIN-SAIDA.
               10  SG-FIN-JUROS          PIC S9(13)V99 COMP-3.
               10  SG-FIN-MULTA          PIC S9(13)V99 COMP-3.
               10  SG-FIN-ATUALIZADO     PIC S9(13)V99 COMP-3.
               10  SG-FIN-JUROS-EFET     PIC S9(03)V99 COMP-3.
               10  SG-FIN-BASE-CALC      PIC S9(13)V99 COMP-3.
               10  SG-FIN-IND-LIMITE     PIC X(01).
                   88  SG-FIN-LIMITE-ATINGIDO     VALUE 'S'.
                   88  SG-FIN-LIMITE-OK           VALUE 'N'.
      *
           05  SG-FIN-RETURN-CODE        PIC 9(02).
           05  SG-FIN-MENSAGEM           PIC X(80).
