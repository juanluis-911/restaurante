import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://turieats.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('slug, updated_at')
    .eq('is_active', true)

  const restaurantUrls: MetadataRoute.Sitemap = (restaurants ?? []).map((r) => ({
    url:              `${BASE_URL}/${r.slug}`,
    lastModified:     new Date(r.updated_at),
    changeFrequency:  'daily',
    priority:         0.8,
  }))

  return [
    {
      url:             BASE_URL,
      lastModified:    new Date(),
      changeFrequency: 'daily',
      priority:        1,
    },
    ...restaurantUrls,
  ]
}
