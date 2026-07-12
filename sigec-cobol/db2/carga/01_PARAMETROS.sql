--*********************************************************************
--* Carga inicial de SIGEC.SG_PARAMETRO                                *
--* Parametros de negocio (seed) usados por batches e programas COBOL. *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

INSERT INTO SIGEC.SG_PARAMETRO
  (CD_PARAMETRO, VR_PARAMETRO, DS_PARAMETRO, TP_PARAMETRO, USUARIO_INCLUSAO)
VALUES
  ('TAXA_JUROS_PADRAO',    '1.00',
   'Taxa de juros mensal padrao aplicada a contratos sem taxa propria (%).',
   'P', 'SEED'),
  ('PCT_MULTA_PADRAO',     '2.00',
   'Percentual de multa padrao aplicado em parcelas vencidas (%).',
   'P', 'SEED'),
  ('LIMITE_JUROS_MAX',     '50.00',
   'Limite maximo de juros acumulados sobre o principal (% do principal).',
   'P', 'SEED'),
  ('DIAS_INAD_LEVE',       '30',
   'Dias de atraso para classificacao Leve.',
   'N', 'SEED'),
  ('DIAS_INAD_MEDIO',      '60',
   'Dias de atraso para classificacao Media.',
   'N', 'SEED'),
  ('DIAS_INAD_GRAVE',      '90',
   'Dias de atraso para classificacao Grave.',
   'N', 'SEED'),
  ('ENTRADA_MIN_RENEG',    '20.00',
   'Percentual minimo de entrada exigido em uma renegociacao (%).',
   'P', 'SEED'),
  ('MAX_PARCELAS_RENEG',   '24',
   'Numero maximo de parcelas permitido em uma renegociacao.',
   'N', 'SEED'),
  ('FATOR_ESPECIAL_LEGADO','0.873',
   'Fator historico aplicado a contratos tipo SP herdados do sistema legado.',
   'N', 'SEED'),
  ('COMMIT_INTERVAL',      '100',
   'Quantidade de registros processados entre COMMITs nos batches.',
   'N', 'SEED');

COMMIT;
