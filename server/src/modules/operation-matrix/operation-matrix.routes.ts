import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  deleteMatrixNode,
  getMatrixItemTree,
  getMatrixItems,
  getSuggestionCatalog,
  patchMatrixNode,
  postMatrixNode,
  postMatrixNodeDuplicate,
  postMatrixNodeReorder,
  postMatrixNodeRestore,
} from './operation-matrix.controller.js'

const view = [requireAuth(), requirePermission('operation_matrix.view')]
const manage = [requireAuth(), requirePermission('operation_matrix.manage')]

export function operationMatrixRouter(): Router {
  const r = Router()
  r.get('/operation-matrix/items', ...view, asyncRoute(getMatrixItems))
  r.get(
    '/operation-matrix/suggestion-catalog',
    ...view,
    asyncRoute(getSuggestionCatalog),
  )
  r.get(
    '/operation-matrix/items/:id/tree',
    ...view,
    asyncRoute(getMatrixItemTree),
  )
  r.post('/operation-matrix/nodes', ...manage, asyncRoute(postMatrixNode))
  r.patch('/operation-matrix/nodes/:id', ...manage, asyncRoute(patchMatrixNode))
  r.delete('/operation-matrix/nodes/:id', ...manage, asyncRoute(deleteMatrixNode))
  r.post(
    '/operation-matrix/nodes/:id/reorder',
    ...manage,
    asyncRoute(postMatrixNodeReorder),
  )
  r.post(
    '/operation-matrix/nodes/:id/duplicate',
    ...manage,
    asyncRoute(postMatrixNodeDuplicate),
  )
  r.post(
    '/operation-matrix/nodes/:id/restore',
    ...manage,
    asyncRoute(postMatrixNodeRestore),
  )
  return r
}
