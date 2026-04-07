import React from 'react'
import { useParams } from 'react-router-dom'

export default function TeamDetailPage() {
  const { teamId } = useParams()

  const numericTeamId = /^\d+$/.test(String(teamId))
    ? Number(teamId)
    : null

  if (!numericTeamId) {
    return (
      <div>
        This rankings row is not linked to an editable master team yet.
      </div>
    )
  }

  return <div>Load team {numericTeamId} here.</div>
}
