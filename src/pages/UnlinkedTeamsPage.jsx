import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import MergeTargetPicker from '@/components/merge/MergeTargetPicker'

export default function UnlinkedTeamsPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  async function loadRows() {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('bt_unlinked_ranking_teams')
      .select(`
        ranking_source,
        ranking_division_key,
        team_id,
        team_name,
        wins,
        losses,
        ranking_points
      `)
      .order('ranking_division_key', { ascending: true })
      .order('team_name', { ascending: true })

    if (error) {
      console.error('Failed to load unlinked teams', error)
      setError(error.message || 'Failed to load unlinked teams')
      setRows([])
    } else {
      setRows(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadRows()
  }, [])

  const openPicker = (row) => {
    setSelectedRow(row)
    setPickerOpen(true)
  }

  const closePicker = () => {
    setPickerOpen(false)
    setSelectedRow(null)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Unlinked Teams</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Link ranking teams to existing master teams or create new ones.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm">
          Loading unlinked teams...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-500 shadow-sm">
          No unlinked teams found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Team
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Division
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Record
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Points
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Source
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100 bg-white">
                {rows.map((row) => (
                  <tr key={`${row.ranking_source}-${row.team_id}-${row.ranking_division_key}`}>
                    <td className="px-4 py-3 text-sm text-neutral-900">{row.team_name}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{row.ranking_division_key}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">
                      {row.wins}-{row.losses}
                    </td>
                    <td className="px-4 py-3 text-sm text-neutral-900">{row.ranking_points}</td>
                    <td className="px-4 py-3 text-sm text-neutral-600">{row.ranking_source}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openPicker(row)}
                        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
                      >
                        Link Team
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <MergeTargetPicker
        open={pickerOpen}
        sourceRow={selectedRow}
        onClose={closePicker}
        onLinked={loadRows}
      />
    </div>
  )
}
