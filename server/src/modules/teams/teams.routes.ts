import { Router } from 'express'
import { asyncRoute } from '../../shared/asyncRoute.js'
import { requireAuth } from '../auth/auth.middleware.js'
import { requirePermission } from '../permissions/permissions.middleware.js'
import {
  deleteTeam,
  deleteTeamMember,
  getTeamById,
  getTeamMembers,
  getTeams,
  patchTeam,
  patchTeamMember,
  postTeam,
  postTeamMember,
} from './teams.controller.js'

function ap(code: string) {
  return [requireAuth(), requirePermission(code)]
}

export function teamsRouter(): Router {
  const r = Router()

  r.get('/teams', ...ap('teams.view'), asyncRoute(getTeams))
  r.post('/teams', ...ap('teams.create'), asyncRoute(postTeam))
  r.get('/teams/:id', ...ap('teams.view'), asyncRoute(getTeamById))
  r.patch('/teams/:id', ...ap('teams.update'), asyncRoute(patchTeam))
  r.delete('/teams/:id', ...ap('teams.update'), asyncRoute(deleteTeam))

  r.get(
    '/teams/:teamId/members',
    ...ap('teams.view'),
    asyncRoute(getTeamMembers),
  )
  r.post(
    '/teams/:teamId/members',
    ...ap('teams.manage_members'),
    asyncRoute(postTeamMember),
  )
  r.patch(
    '/teams/:teamId/members/:memberId',
    ...ap('teams.manage_members'),
    asyncRoute(patchTeamMember),
  )
  r.delete(
    '/teams/:teamId/members/:memberId',
    ...ap('teams.manage_members'),
    asyncRoute(deleteTeamMember),
  )

  return r
}
