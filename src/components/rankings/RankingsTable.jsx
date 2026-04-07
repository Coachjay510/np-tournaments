import React from 'react'

export default function RankingsTable({ rows = [], onTeamClick }) {
  if (!rows.length) {
    return <div>No rankings found.</div>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Rank</th>
          <th>Team</th>
          <th>Division</th>
          <th>Record</th>
          <th>Points</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.master_team_id}
            onClick={() => onTeamClick?.(row)}
            style={{ cursor: 'pointer' }}
          >
            <td>{row.rank}</td>
            <td>{row.team_name}</td>
            <td>{row.ranking_division_key}</td>
            <td>{row.wins}-{row.losses}</td>
            <td>{row.ranking_points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
