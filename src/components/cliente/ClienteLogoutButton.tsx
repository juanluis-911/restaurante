'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function ClienteLogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/cliente/login')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground hover:text-foreground"
      onClick={handleLogout}
      disabled={loading}
    >
      <LogOut size={14} />
      <span className="hidden sm:inline">Cerrar sesión</span>
    </Button>
  )
}
