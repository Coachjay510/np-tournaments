import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function MergeTargetPicker({
  open,
  sourceRow,
  onClose,
  onLinked,
}) {
  const [targets, setTargets] = useState([])
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadTargets() {
      if (!open || !sourceRow?.ranking_division_key) return

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('bt_master_teams')
        .select(`
          id,
          team_name,
          division_key,
          gender,
          age_group,
          organization_id
        `)
        .eq('division_key', sourceRow.ranking_division_key)
        .order('team_name', { ascending: true })

      if (!isMounted) return

      if (error) {
        console.error('Failed to load merge targets', error)
        setError(error.message || 'Failed to load merge targets')
        setTargets([])
      } else {
        setTargets(data || [])
      }

      setLoading(false)
    }

    loadTargets()

    return () => {
      isMounted = false
    }
  }, [open, sourceRow])

  const handleLinkExisting = async () => {
    if (!sourceRow || !selectedTargetId) return

    setSaving(true)
    setError(null)

    const { error: linkError } = await supabase
      .from('bt_team_links')
      .insert({
        ranking_source: sourceRow.ranking_source,
        source_team_id: sourceRow.team_id,
        master_team_id: Number(selectedTargetId),
      })

    if (linkError) {
      console.error('Failed to create team link', linkError)
      setError(linkError.message || 'Failed to link team')
      setSaving(false)
      return
    }

    const { error: auditError } = await supabase
      .from('bt_team_merge_audit')
      .insert({
        source_team_id: sourceRow.team_id,
        target_team_id: Number(selectedTargetId),
        merge_reason: 'Linked unassigned ranking team to existing master team',
      })

    if (auditError) {
      console.error('Failed to write merge audit', auditError)
    }

    setSaving(false)
    onLinked?.()
    onClose?.()
  }

  const handleCreateAndLink = async () => {
    if (!sourceRow) return

    setSaving(true)
    setError(null)

    const { data: newTeam, error: createError } = await supabase
      .from('bt_master_teams')
      .insert({
        team_name: sourceRow.team_name,
        division_key: sourceRow.ranking_division_key,
      })
      .select()
      .maybeSingle()

    if (createError || !newTeam) {
      console.error('Failed to create master team', createError)
      setError(createError?.message || 'Failed to create team')
      setSaving(false)
      return
    }

    const { error: linkError } = await supabase
      .from('bt_team_links')
      .insert({
        ranking_source: sourceRow.ranking_source,
        source_team_id: sourceRow.team_id,
        master_team_id: newTeam.id,
      })

    if (linkError) {
      console.error('Failed to create team link', linkError)
      setError(linkError.message || 'Failed to link new team')
      setSaving(false)
      return
    }

    const { error: auditError } = await supabase
      .from('bt_team_merge_audit')
      .insert({
        source_team_id: sourceRow.team_id,
        target_team_id: newTeam.id,
        merge_reason: 'Created new master team and linked unassigned ranking team',
      })

    if (auditError) {
      console.error('Failed to write merge audit', auditError)
    }

    setSaving(false)
    onLinked?.()
    onClose?.()
  }

  if (!open || !sourceRow) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">Link Team</h2>
            <p className="mt-1 text-sm text-neutral-500">
              {sourceRow.team_name} · {sourceRow.ranking_division_key}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700"
          >
            Close
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Link to existing master team
            </label>

            {loading ? (
              <div className="rounded-lg border border-neutral-200 p-3 text-sm text-neutral-500">
                Loading candidate teams...
              </div>
            ) : (
              <select
                value={selectedTargetId}
                onChange={(event) => setSelectedTargetId(event.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              >
                <option value="">Select a team</option>
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.team_name} · {target.division_key}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleLinkExisting}
              disabled={!selectedTargetId || saving}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Link Existing Team'}
            </button>

            <button
              type="button"
              onClick={handleCreateAndLink}
              disabled={saving}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create New Team and Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
