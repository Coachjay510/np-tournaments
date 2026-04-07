import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { uploadLogo } from '@/lib/uploadLogo'

export default function OrganizationDetailPage() {
  const { orgId } = useParams()
  const [organization, setOrganization] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoFile, setLogoFile] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    org_name: '',
    city: '',
    state: '',
    website: '',
    primary_color: '',
    secondary_color: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    logo_url: '',
  })

  useEffect(() => {
    let isMounted = true

    async function loadOrganization() {
      setLoading(true)
      setError(null)

      const numericOrgId = /^\d+$/.test(String(orgId)) ? Number(orgId) : null

      if (!numericOrgId) {
        if (isMounted) {
          setError('Invalid organization ID.')
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('bt_organizations')
        .select('*')
        .eq('id', numericOrgId)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        console.error('Failed to load organization detail', error)
        setError(error.message || 'Failed to load organization detail')
        setOrganization(null)
      } else if (!data) {
        setError('Organization not found.')
        setOrganization(null)
      } else {
        setOrganization(data)
        setForm({
          org_name: data.org_name || '',
          city: data.city || '',
          state: data.state || '',
          website: data.website || '',
          primary_color: data.primary_color || '',
          secondary_color: data.secondary_color || '',
          contact_name: data.contact_name || '',
          contact_email: data.contact_email || '',
          contact_phone: data.contact_phone || '',
          logo_url: data.logo_url || '',
        })
      }

      setLoading(false)
    }

    loadOrganization()

    return () => {
      isMounted = false
    }
  }, [orgId])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0] || null
    setLogoFile(file)
  }

  const handleLogoUpload = async () => {
    const numericOrgId = /^\d+$/.test(String(orgId)) ? Number(orgId) : null

    if (!numericOrgId || !logoFile) return

    setUploadingLogo(true)
    setError(null)

    try {
      const { publicUrl } = await uploadLogo({
        file: logoFile,
        folder: 'organizations',
        recordId: numericOrgId,
      })

      const { data, error } = await supabase
        .from('bt_organizations')
        .update({ logo_url: publicUrl })
        .eq('id', numericOrgId)
        .select()
        .maybeSingle()

      if (error) throw error

      setForm((current) => ({
        ...current,
        logo_url: data?.logo_url || publicUrl,
      }))

      setOrganization(data)
      setLogoFile(null)
    } catch (err) {
      console.error('Failed to upload organization logo', err)
      setError(err.message || 'Failed to upload logo')
    }

    setUploadingLogo(false)
  }

  const handleRemoveLogo = async () => {
    const numericOrgId = /^\d+$/.test(String(orgId)) ? Number(orgId) : null

    if (!numericOrgId) return

    setUploadingLogo(true)
    setError(null)

    const { data, error } = await supabase
      .from('bt_organizations')
      .update({ logo_url: null })
      .eq('id', numericOrgId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Failed to remove organization logo', error)
      setError(error.message || 'Failed to remove logo')
    } else {
      setForm((current) => ({
        ...current,
        logo_url: '',
      }))
      setOrganization(data)
      setLogoFile(null)
    }

    setUploadingLogo(false)
  }

  const handleSave = async (event) => {
    event.preventDefault()

    const numericOrgId = /^\d+$/.test(String(orgId)) ? Number(orgId) : null

    if (!numericOrgId) {
      setError('Invalid organization ID.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      org_name: form.org_name,
      city: form.city,
      state: form.state,
      website: form.website,
      primary_color: form.primary_color,
      secondary_color: form.secondary_color,
      contact_name: form.contact_name,
      contact_email: form.contact_email,
      contact_phone: form.contact_phone,
      logo_url: form.logo_url || null,
    }

    const { data, error } = await supabase
      .from('bt_organizations')
      .update(payload)
      .eq('id', numericOrgId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('Failed to save organization detail', error)
      setError(error.message || 'Failed to save organization detail')
    } else if (data) {
      setOrganization(data)
      setForm((current) => ({
        ...current,
        logo_url: data.logo_url || '',
      }))
    }

    setSaving(false)
  }

  if (loading) {
    return <div className="p-6 text-sm text-neutral-500">Loading organization...</div>
  }

  if (error) {
    return <div className="p-6 text-sm text-red-600">{error}</div>
  }

  return (
    <div className="max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Edit Organization</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Update organization profile, contact info, colors, and logo.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 rounded-xl border border-neutral-200 p-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Organization Logo</h2>
          </div>

          {form.logo_url ? (
            <img
              src={form.logo_url}
              alt={form.org_name || 'Organization logo'}
              className="h-24 w-24 rounded-lg border border-neutral-200 object-contain"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400">
              No logo
            </div>
          )}

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input type="file" accept="image/*" onChange={handleLogoChange} />
            <button
              type="button"
              onClick={handleLogoUpload}
              disabled={!logoFile || uploadingLogo}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
            </button>

            <button
              type="button"
              onClick={handleRemoveLogo}
              disabled={uploadingLogo || !form.logo_url}
              className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 disabled:opacity-60"
            >
              Remove Logo
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Organization Name</span>
            <input
              name="org_name"
              value={form.org_name}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">City</span>
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">State</span>
            <input
              name="state"
              value={form.state}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Website</span>
            <input
              name="website"
              value={form.website}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Primary Color</span>
            <input
              name="primary_color"
              value={form.primary_color}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              placeholder="#000000"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Secondary Color</span>
            <input
              name="secondary_color"
              value={form.secondary_color}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
              placeholder="#ffffff"
            />
          </label>

          <label className="space-y-1 md:col-span-2">
            <span className="text-sm font-medium text-neutral-700">Contact Name</span>
            <input
              name="contact_name"
              value={form.contact_name}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Contact Email</span>
            <input
              name="contact_email"
              type="email"
              value={form.contact_email}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-neutral-700">Contact Phone</span>
            <input
              name="contact_phone"
              value={form.contact_phone}
              onChange={handleChange}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Organization'}
          </button>
        </div>
      </form>
    </div>
  )
}
