      *****************************************************************
      * COPYBOOK.: SGRETCOD                                            *
      * SISTEMA .: SIGEC                                               *
      * FUNCAO ..: CODIGOS DE RETORNO PADRAO COM NIVEIS 88             *
      * USO .....: WORKING-STORAGE DE TODOS OS PROGRAMAS SGCB          *
      *----------------------------------------------------------------*
      * ESCALA:                                                        *
      *   00 - SUCESSO                                                 *
      *   04 - AVISO (WARNING)                                         *
      *   08 - ERRO FUNCIONAL                                          *
      *   12 - ERRO TECNICO                                            *
      *   16 - CRITICO                                                 *
      *****************************************************************
       01  WS-RC                         PIC 9(02) VALUE 00.
           88  SG-RC-OK                            VALUE 00.
           88  SG-RC-WARN                          VALUE 04.
           88  SG-RC-ERR-FUNC                      VALUE 08.
           88  SG-RC-ERR-TEC                       VALUE 12.
           88  SG-RC-CRITICO                       VALUE 16.
           88  SG-RC-ACEITAVEL                     VALUES 00 04.
           88  SG-RC-ROMPE-FLUXO                   VALUES 08 12 16.
           88  SG-RC-ABORTA-JANELA                 VALUES 12 16.
      *
       01  WS-RC-CONSTANTES.
           05  SG-CT-RC-OK               PIC 9(02) VALUE 00.
           05  SG-CT-RC-WARN             PIC 9(02) VALUE 04.
           05  SG-CT-RC-ERR-FUNC         PIC 9(02) VALUE 08.
           05  SG-CT-RC-ERR-TEC          PIC 9(02) VALUE 12.
           05  SG-CT-RC-CRITICO          PIC 9(02) VALUE 16.
      *
      * RC DEVOLVIDO POR SUBROTINAS EM AREAS DE LINKAGE PROPRIAS
      * USAR SEMPRE PIC 9(02) COM OS MESMOS 88-LEVELS ACIMA.
