import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShellLayout } from '../layouts/AppShellLayout'
import { LoginPage } from '../pages/LoginPage'
import { BacklogPage } from '../pages/BacklogPage'
import { NovaEsteiraPage } from '../features/esteiras/NovaEsteiraPage'
import { AlterarEsteiraPage } from '../features/esteiras/AlterarEsteiraPage'
import { EsteiraDetalhePage } from '../features/esteiras/EsteiraDetalhePage'
import { ImportarOsPage } from '../features/documentos/ImportarOsPage'
import { RbacRolePermissionsPage } from '../features/admin/rbac/RbacRolePermissionsPage'
import { AdminAuditTrailPage } from '../features/admin/users/AdminAuditTrailPage'
import { UsersPage } from '../features/admin/users/UsersPage'
import { ColaboradoresPage } from '../features/gestor/ColaboradoresPage'
import { OperationalSettingsPage } from '../features/gestor/operational-settings/OperationalSettingsPage'
import { EquipeDetalhePage } from '../features/gestor/equipes/EquipeDetalhePage'
import { EquipeNovaPage } from '../features/gestor/equipes/EquipeNovaPage'
import { EquipesListPage } from '../features/gestor/equipes/EquipesListPage'
import { JornadaColaboradorGestorPage } from '../features/gestor/JornadaColaboradorGestorPage'
import { OperationMatrixListPage } from '../features/operation-matrix/OperationMatrixListPage'
import { OperationMatrixNewPage } from '../features/operation-matrix/OperationMatrixNewPage'
import { OperationMatrixEditorPage } from '../features/operation-matrix/OperationMatrixEditorPage'
import { OperationMatrixPreviewPage } from '../features/operation-matrix/OperationMatrixPreviewPage'
import { DashboardPage } from '../features/gestor/DashboardPage'
import { ApontamentoGestorPage } from '../features/gestor/ApontamentoGestorPage'
import { MinhasAtividadesPage } from '../features/colaborador/MinhasAtividadesPage'
import { ApontamentoPage } from '../features/colaborador/ApontamentoPage'
import { JornadaPage } from '../features/colaborador/JornadaPage'
import { MeuTrabalhoCockpitPage } from '../features/cockpits/MeuTrabalhoCockpitPage'
import { SupportTicketsPage } from '../features/support/SupportTicketsPage'
import { ChangePasswordPage } from '../pages/ChangePasswordPage'
import { RequireAuth } from './RequireAuth'
import { RequirePasswordChangeCleared } from './RequirePasswordChangeCleared'
import {
  PERMISSION_OPERATIONAL_SETTINGS_MANAGE,
  PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS,
} from '../lib/permissions/permissionCodes'
import { RequireAnyPermission, RequirePermission } from './RequirePermission'
import { RootRedirect } from './RootRedirect'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/app/alterar-senha" element={<ChangePasswordPage />} />
        <Route element={<RequirePasswordChangeCleared />}>
          <Route path="/app" element={<AppShellLayout />}>
            <Route index element={<Navigate to="/app/backlog" replace />} />
            <Route path="backlog" element={<BacklogPage />} />
            <Route
              path="nova-esteira"
              element={
                <RequirePermission permission="conveyors.create">
                  <NovaEsteiraPage />
                </RequirePermission>
              }
            />
            <Route
              path="esteiras/:id/alterar"
              element={
                <RequirePermission permission="conveyors.create">
                  <AlterarEsteiraPage />
                </RequirePermission>
              }
            />
            <Route path="esteiras/:id" element={<EsteiraDetalhePage />} />
            <Route
              path="importar-os"
              element={
                <RequirePermission permission="conveyors.create">
                  <ImportarOsPage />
                </RequirePermission>
              }
            />
            <Route
              path="dashboard"
              element={
                <RequireAnyPermission
                  permissions={['dashboard.view_operational', 'dashboard.view_executive']}
                >
                  <DashboardPage />
                </RequireAnyPermission>
              }
            />
            <Route
              path="colaboradores"
              element={
                <RequirePermission permission="collaborators_admin.view">
                  <ColaboradoresPage />
                </RequirePermission>
              }
            />
            <Route
              path="configuracoes-operacionais"
              element={
                <RequirePermission permission={PERMISSION_OPERATIONAL_SETTINGS_MANAGE}>
                  <OperationalSettingsPage />
                </RequirePermission>
              }
            />
            <Route
              path="equipes"
              element={
                <RequirePermission permission="teams.view">
                  <EquipesListPage />
                </RequirePermission>
              }
            />
            <Route
              path="equipes/nova"
              element={
                <RequirePermission permission="teams.create">
                  <EquipeNovaPage />
                </RequirePermission>
              }
            />
            <Route
              path="equipes/:id"
              element={
                <RequirePermission permission="teams.view">
                  <EquipeDetalhePage />
                </RequirePermission>
              }
            />
            <Route
              path="gestao/jornada-colaborador"
              element={
                <RequirePermission permission="collaborators_admin.view">
                  <JornadaColaboradorGestorPage />
                </RequirePermission>
              }
            />
            <Route
              path="usuarios"
              element={
                <RequirePermission permission="users.view">
                  <UsersPage />
                </RequirePermission>
              }
            />
            <Route
              path="permissoes-por-papel"
              element={
                <RequirePermission permission={PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS}>
                  <RbacRolePermissionsPage />
                </RequirePermission>
              }
            />
            <Route
              path="usuarios/trilha"
              element={
                <RequirePermission permission="audit.view">
                  <AdminAuditTrailPage />
                </RequirePermission>
              }
            />
            <Route
              path="matrizes-operacao"
              element={
                <RequirePermission permission="operation_matrix.view">
                  <OperationMatrixListPage />
                </RequirePermission>
              }
            />
            <Route
              path="matrizes-operacao/nova"
              element={
                <RequirePermission permission="operation_matrix.manage">
                  <OperationMatrixNewPage />
                </RequirePermission>
              }
            />
            <Route
              path="matrizes-operacao/:itemId/preview"
              element={
                <RequirePermission permission="operation_matrix.view">
                  <OperationMatrixPreviewPage />
                </RequirePermission>
              }
            />
            <Route
              path="matrizes-operacao/:itemId"
              element={
                <RequirePermission permission="operation_matrix.manage">
                  <OperationMatrixEditorPage />
                </RequirePermission>
              }
            />
            <Route path="minhas-atividades" element={<MinhasAtividadesPage />} />
            <Route path="chamados" element={<SupportTicketsPage />} />
            <Route path="meu-trabalho" element={<MeuTrabalhoCockpitPage />} />
            <Route path="jornada" element={<JornadaPage />} />
            <Route
              path="gestao/apontamento/:stepNodeId"
              element={
                <RequireAnyPermission
                  permissions={[
                    'time_entries.create_on_behalf',
                    'time_entries.delete_any',
                  ]}
                >
                  <ApontamentoGestorPage />
                </RequireAnyPermission>
              }
            />
            <Route path="apontamento/:taskId" element={<ApontamentoPage />} />
            <Route path="conta/alterar-senha" element={<ChangePasswordPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
