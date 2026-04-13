import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'https://turieats.com'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default:  'TuriEats',
    template: '%s · TuriEats',
  },
  description: 'Pide en línea en tus restaurantes y tiendas favoritas. Menú fijo o pedido libre, pago en línea y seguimiento en tiempo real.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192x192.png',
  },
  openGraph: {
    type:        'website',
    locale:      'es_MX',
    url:         BASE_URL,
    siteName:    'TuriEats',
    title:       'TuriEats — Pide en línea donde quieras',
    description: 'Pide en línea en tus restaurantes y tiendas favoritas. Menú fijo o pedido libre, pago en línea y seguimiento en tiempo real.',
    images: [
      {
        url:    '/icons/icon-512x512.png',
        width:  512,
        height: 512,
        alt:    'TuriEats',
      },
    ],
  },
  twitter: {
    card:        'summary',
    title:       'TuriEats — Pide en línea donde quieras',
    description: 'Pide en línea en tus restaurantes y tiendas favoritas. Menú fijo o pedido libre, pago en línea y seguimiento en tiempo real.',
    images:      ['/icons/icon-512x512.png'],
  },
  robots: {
    index:               true,
    follow:              true,
    googleBot: {
      index:             true,
      follow:            true,
      'max-image-preview': 'large',
    },
  },
  appleWebApp: {
    capable:         true,
    statusBarStyle:  'default',
    title:           'TuriEats',
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        {children}
        <Analytics />
        <SpeedInsights />
        {/* Registra SW y captura beforeinstallprompt */}
        <Script id="sw-register" strategy="afterInteractive">{`
          if('serviceWorker' in navigator){
            navigator.serviceWorker.register('/sw.js').catch(function(){});
          }
          window.addEventListener('beforeinstallprompt',function(e){
            e.preventDefault();
            window.__pwaInstallPrompt=e;
            window.dispatchEvent(new Event('pwaInstallReady'));
          });
        `}</Script>
      </body>
    </html>
  )
}
