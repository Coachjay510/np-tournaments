import React from 'react'
import { useNavigate } from 'react-router-dom'
import RankingsTable from '@/components/rankings/RankingsTable'
import { useRankings } from '@/hooks/useRankings'

export default function RankingsPage() {
  const navigate = useNavigate()
  const { rows, loading, error } = useRankings([])

  const handleTeamClick = (row) => {
    if (row.base_master_team_id) {
      navigate(`/teams/${row.base_master_team_id}`)
      return
    }

    navigate(`/rankings/team-preview/${encodeURIComponent(row.master_team_id)}`)
  }

  if (loading) return <div>Loading rankings...</div>
  if (error) return <div>{error}</div>

  return <RankingsTable rows={rows} onTeamClick={handleTeamClick} />
}
