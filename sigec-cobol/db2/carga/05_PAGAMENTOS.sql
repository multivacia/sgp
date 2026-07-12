--*********************************************************************
--* Carga de SIGEC.SG_PAGAMENTO                                        *
--*                                                                    *
--* Registra apenas alguns pagamentos por contrato (nao exaustivo),    *
--* suficientes para demonstrar canais, estornos e pagamento parcial   *
--* (PP) do CTR0000000010 parc 5.                                      *
--*********************************************************************

SET CURRENT SCHEMA = SIGEC;

--------------------------------------------------------------------
-- CTR0000000002 - 3 parcelas pagas via canais diferentes
--------------------------------------------------------------------
INSERT INTO SIGEC.SG_PAGAMENTO
  (ID_CONTRATO, NR_PARCELA, VR_PAGO, DT_PAGAMENTO, CD_CANAL,
   NR_DOC_PAGTO, ST_PAGAMENTO, VR_DIFERENCA, USUARIO_INCLUSAO)
VALUES
  ('CTR0000000002', 1, 1000.00, DATE('2026-02-14'), 'BOL', 'BOL2026021400001', 'CF',  0.00, 'SEED'),
  ('CTR0000000002', 2, 1000.00, DATE('2026-03-15'), 'PIX', 'E2K2026031500001', 'CF',  0.00, 'SEED'),
  ('CTR0000000002', 3, 1000.00, DATE('2026-04-13'), 'PIX', 'E2K2026041300001', 'CF',  0.00, 'SEED');

--------------------------------------------------------------------
-- CTR0000000004 - 1 parcela paga
--------------------------------------------------------------------
INSERT INTO SIGEC.SG_PAGAMENTO
  (ID_CONTRATO, NR_PARCELA, VR_PAGO, DT_PAGAMENTO, CD_CANAL,
   NR_DOC_PAGTO, ST_PAGAMENTO, VR_DIFERENCA, USUARIO_INCLUSAO)
VALUES
  ('CTR0000000004', 1, 800.00, DATE('2026-03-05'), 'BOL', 'BOL2026030500002', 'CF', 0.00, 'SEED');

--------------------------------------------------------------------
-- CTR0000000005 - 1 parcela paga
--------------------------------------------------------------------
INSERT INTO SIGEC.SG_PAGAMENTO
  (ID_CONTRATO, NR_PARCELA, VR_PAGO, DT_PAGAMENTO, CD_CANAL,
   NR_DOC_PAGTO, ST_PAGAMENTO, VR_DIFERENCA, USUARIO_INCLUSAO)
VALUES
  ('CTR0000000005', 1, 600.00, DATE('2026-02-05'), 'BOL', 'BOL2026020500003', 'CF', 0.00, 'SEED');

--------------------------------------------------------------------
-- CTR0000000007 - 6 parcelas pagas com canais mistos + 1 estornado
--------------------------------------------------------------------
INSERT INTO SIGEC.SG_PAGAMENTO
  (ID_CONTRATO, NR_PARCELA, VR_PAGO, DT_PAGAMENTO, CD_CANAL,
   NR_DOC_PAGTO, ST_PAGAMENTO, VR_DIFERENCA, USUARIO_INCLUSAO)
VALUES
  ('CTR0000000007', 1, 833.33, DATE('2025-09-01'), 'BOL', 'BOL2025090100010', 'CF',  0.00, 'SEED'),
  ('CTR0000000007', 2, 833.33, DATE('2025-10-01'), 'PIX', 'E2K2025100100011', 'CF',  0.00, 'SEED'),
  ('CTR0000000007', 3, 833.33, DATE('2025-11-01'), 'PIX', 'E2K2025110100012', 'CF',  0.00, 'SEED'),
  ('CTR0000000007', 4, 833.33, DATE('2025-12-01'), 'TED', 'TED2025120100013', 'CF',  0.00, 'SEED'),
  ('CTR0000000007', 5, 833.33, DATE('2026-01-01'), 'CAX', 'CAX2026010100014', 'CF',  0.00, 'SEED'),
  ('CTR0000000007', 6, 900.00, DATE('2026-02-01'), 'BOL', 'BOL2026020100015', 'CF', 66.67, 'SEED'),
  -- pagamento a maior estornado depois
  ('CTR0000000007', 6, 100.00, DATE('2026-02-03'), 'PIX', 'E2K2026020300016', 'ES', 100.00,'SEED');

--------------------------------------------------------------------
-- CTR0000000008 - contrato quitado, todas as 6 parcelas pagas
--------------------------------------------------------------------
INSERT INTO SIGEC.SG_PAGAMENTO
  (ID_CONTRATO, NR_PARCELA, VR_PAGO, DT_PAGAMENTO, CD_CANAL,
   NR_DOC_PAGTO, ST_PAGAMENTO, VR_DIFERENCA, USUARIO_INCLUSAO)
VALUES
  ('CTR0000000008', 1, 600.00, DATE('2025-07-01'), 'BOL', 'BOL2025070100020', 'CF', 0.00, 'SEED'),
  ('CTR0000000008', 2, 600.00, DATE('2025-08-01'), 'BOL', 'BOL2025080100021', 'CF', 0.00, 'SEED'),
  ('CTR0000000008', 3, 600.00, DATE('2025-09-01'), 'PIX', 'E2K2025090100022', 'CF', 0.00, 'SEED'),
  ('CTR0000000008', 4, 600.00, DATE('2025-10-01'), 'PIX', 'E2K2025100100023', 'CF', 0.00, 'SEED'),
  ('CTR0000000008', 5, 600.00, DATE('2025-11-01'), 'CAX', 'CAX2025110100024', 'CF', 0.00, 'SEED'),
  ('CTR0000000008', 6, 600.00, DATE('2025-12-01'), 'CAX', 'CAX2025120100025', 'CF', 0.00, 'SEED');

--------------------------------------------------------------------
-- CTR0000000010 - 4 parcelas pagas integralmente + 1 pagamento parcial
--------------------------------------------------------------------
INSERT INTO SIGEC.SG_PAGAMENTO
  (ID_CONTRATO, NR_PARCELA, VR_PAGO, DT_PAGAMENTO, CD_CANAL,
   NR_DOC_PAGTO, ST_PAGAMENTO, VR_DIFERENCA, USUARIO_INCLUSAO)
VALUES
  ('CTR0000000010', 1, 3333.33, DATE('2026-03-01'), 'TED', 'TED2026030100030', 'CF', 0.00, 'SEED'),
  ('CTR0000000010', 2, 3333.33, DATE('2026-04-01'), 'TED', 'TED2026040100031', 'CF', 0.00, 'SEED'),
  ('CTR0000000010', 3, 3333.33, DATE('2026-05-01'), 'TED', 'TED2026050100032', 'CF', 0.00, 'SEED'),
  ('CTR0000000010', 4, 3333.33, DATE('2026-06-01'), 'TED', 'TED2026060100033', 'CF', 0.00, 'SEED'),
  ('CTR0000000010', 5, 2333.33, DATE('2026-07-05'), 'PIX', 'E2K2026070500034', 'CF',-1000.00,'SEED');

--------------------------------------------------------------------
-- CTR0000000011 - 4 parcelas pagas
--------------------------------------------------------------------
INSERT INTO SIGEC.SG_PAGAMENTO
  (ID_CONTRATO, NR_PARCELA, VR_PAGO, DT_PAGAMENTO, CD_CANAL,
   NR_DOC_PAGTO, ST_PAGAMENTO, VR_DIFERENCA, USUARIO_INCLUSAO)
VALUES
  ('CTR0000000011', 1, 2500.00, DATE('2025-11-01'), 'TED', 'TED2025110100040', 'CF', 0.00, 'SEED'),
  ('CTR0000000011', 2, 2500.00, DATE('2025-12-01'), 'TED', 'TED2025120100041', 'CF', 0.00, 'SEED'),
  ('CTR0000000011', 3, 2500.00, DATE('2026-01-01'), 'PIX', 'E2K2026010100042', 'CF', 0.00, 'SEED'),
  ('CTR0000000011', 4, 2500.00, DATE('2026-02-01'), 'PIX', 'E2K2026020100043', 'CF', 0.00, 'SEED');

--------------------------------------------------------------------
-- CTR0000000012 - contrato SP legado quitado (todos via canal LEG)
--------------------------------------------------------------------
INSERT INTO SIGEC.SG_PAGAMENTO
  (ID_CONTRATO, NR_PARCELA, VR_PAGO, DT_PAGAMENTO, CD_CANAL,
   NR_DOC_PAGTO, ST_PAGAMENTO, VR_DIFERENCA, USUARIO_INCLUSAO)
VALUES
  ('CTR0000000012',  1, 873.00, DATE('2024-02-15'), 'LEG', 'LEG202402150001', 'CF', 0.00, 'SEED'),
  ('CTR0000000012',  2, 873.00, DATE('2024-03-15'), 'LEG', 'LEG202403150002', 'CF', 0.00, 'SEED'),
  ('CTR0000000012',  3, 873.00, DATE('2024-04-15'), 'LEG', 'LEG202404150003', 'CF', 0.00, 'SEED'),
  ('CTR0000000012',  4, 873.00, DATE('2024-05-15'), 'LEG', 'LEG202405150004', 'CF', 0.00, 'SEED'),
  ('CTR0000000012',  5, 873.00, DATE('2024-06-15'), 'LEG', 'LEG202406150005', 'CF', 0.00, 'SEED'),
  ('CTR0000000012',  6, 873.00, DATE('2024-07-15'), 'LEG', 'LEG202407150006', 'CF', 0.00, 'SEED'),
  ('CTR0000000012',  7, 873.00, DATE('2024-08-15'), 'LEG', 'LEG202408150007', 'CF', 0.00, 'SEED'),
  ('CTR0000000012',  8, 873.00, DATE('2024-09-15'), 'LEG', 'LEG202409150008', 'CF', 0.00, 'SEED'),
  ('CTR0000000012',  9, 873.00, DATE('2024-10-15'), 'LEG', 'LEG202410150009', 'CF', 0.00, 'SEED'),
  ('CTR0000000012', 10, 873.00, DATE('2024-11-15'), 'LEG', 'LEG202411150010', 'CF', 0.00, 'SEED');

COMMIT;
