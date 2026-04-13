import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import InstallBanner from '@/components/shared/InstallBanner'
import LandingClient from '@/components/public/LandingClient'

export const revalidate = 60

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://turieats.com'

export const metadata: Metadata = {
  title: 'TuriEats — Pide en línea donde quieras',
  description: 'Descubre restaurantes y tiendas locales. Haz tu pedido en línea, paga de forma segura y sigue tu entrega en tiempo real con TuriEats.',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    type:        'website',
    url:         BASE_URL,
    title:       'TuriEats — Pide en línea donde quieras',
    description: 'Descubre restaurantes y tiendas locales. Haz tu pedido en línea, paga de forma segura y sigue tu entrega en tiempo real.',
    images: [
      {
        url:    '/icons/icon-512x512.png',
        width:  512,
        height: 512,
        alt:    'TuriEats',
      },
    ],
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type':    'Organization',
  name:       'TuriEats',
  url:        BASE_URL,
  logo:       `${BASE_URL}/icons/icon-512x512.png`,
  description: 'Plataforma de pedidos en línea para restaurantes y tiendas locales en México.',
  sameAs: [],
}

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Redirigir dueños y repartidores
  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role === 'restaurant_owner') {
      const { data: restaurants } = await supabase
        .from('restaurants').select('id').eq('owner_id', user.id).limit(1)
      redirect(restaurants?.length ? '/dashboard' : '/auth/onboarding')
    }
    if (profile?.role === 'driver') redirect('/driver')
  }

  const { data: businesses } = await supabase
    .from('restaurants')
    .select('*, restaurant_hours(*)')
    .eq('is_active', true)
    .order('created_at')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <InstallBanner />
      <LandingClient
        businesses={(businesses ?? []) as any}
        user={user}
      />
    </>
  )
}
