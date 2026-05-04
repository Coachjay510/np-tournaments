import { supabase } from '../supabaseClient'

/**
 * Deletes a tournament and related app-owned records so test tournaments don't
 * leave orphan games behind.
 *
 * For NP-created tournaments, scheduled_games.tournament_id is the source of truth.
 * For imported Bracket Team events, pass externalEventIds if you have them.
 */
export async function deleteTournamentWithGames(tournamentId, { externalEventIds = [] } = {}) {
  if (!tournamentId) throw new Error('Tournament ID is required')

  const { data: scheduledGames, error: gamesLookupError } = await supabase
    .from('scheduled_games')
    .select('id')
    .eq('tournament_id', tournamentId)

  if (gamesLookupError) throw gamesLookupError

  const scheduledGameIds = (scheduledGames || []).map((game) => game.id)

  if (scheduledGameIds.length > 0) {
    await deleteInChunks('ref_assignments', 'game_id', scheduledGameIds)
  }

  await deleteByEquality('scheduled_games', 'tournament_id', tournamentId)
  await deleteByEquality('tournament_team_constraints', 'tournament_id', tournamentId)
  await deleteByEquality('tournament_teams', 'tournament_id', tournamentId)
  await deleteByEquality('tournament_inventory', 'tournament_id', tournamentId)
  await deleteByEquality('tournament_announcements', 'tournament_id', tournamentId)
  await deleteByEquality('tournament_staff', 'tournament_id', tournamentId)
  await deleteByEquality('tournament_invites', 'tournament_id', tournamentId)

  const cleanEventIds = [...new Set((externalEventIds || []).filter(Boolean).map(String))]
  if (cleanEventIds.length > 0) {
    await deleteInChunks('bt_games', 'event_id', cleanEventIds)
    await deleteInChunks('bt_raw_imports', 'event_id', cleanEventIds)
  }

  const { error: tournamentError } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)

  if (tournamentError) throw tournamentError
}

async function deleteByEquality(table, column, value) {
  const { error } = await supabase.from(table).delete().eq(column, value)
  if (error && !isMissingColumnOrTable(error)) throw error
}

async function deleteInChunks(table, column, values) {
  for (let i = 0; i < values.length; i += 200) {
    const chunk = values.slice(i, i + 200)
    const { error } = await supabase.from(table).delete().in(column, chunk)
    if (error && !isMissingColumnOrTable(error)) throw error
  }
}

function isMissingColumnOrTable(error) {
  return ['42P01', '42703'].includes(error?.code)
}
