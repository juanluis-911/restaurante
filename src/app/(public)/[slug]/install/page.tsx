import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InstallClientPage from '@/components/public/InstallClientPage'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('slug', slug)
    .single()

  return {
    title: restaurant ? `${restaurant.name} · App` : 'Instalar app',
  }
}

export default async function InstallPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, slug, primary_color, logo_url, is_active')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!restaurant) notFound()

  return (
    <InstallClientPage
      slug={restaurant.slug}
      restaurantName={restaurant.name}
      primaryColor={restaurant.primary_color}
      logoUrl={restaurant.logo_url ?? null}
    />
  )
}
