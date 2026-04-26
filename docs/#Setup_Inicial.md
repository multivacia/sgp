
## Carga das Matrizes

Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
$env:PGHOST="localhost"
$env:PGPORT="5432"
$env:PGDATABASE="sgp"
$env:PGUSER="sgp_app"
$env:PGPASSWORD="xxxxxx"
python .\import_matrix_nodes_from_excel_fixed_v2.py ".\Nova Esteira v1.0 - MESTRA - Gol GTI - OS7945.xlsx" --item-code ITEM-CARPETE --item-name "Carpete"
-------------------------------------------