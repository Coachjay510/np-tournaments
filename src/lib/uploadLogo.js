import { supabase } from '@/lib/supabaseClient'

export async function uploadLogo({ file, folder, recordId }) {
  if (!file) {
    throw new Error('No file selected')
  }

  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
  const fileName = `${folder}/${recordId}-${Date.now()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('team-org-logos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage
    .from('team-org-logos')
    .getPublicUrl(fileName)

  return {
    path: fileName,
    publicUrl: data?.publicUrl || '',
  }
}
