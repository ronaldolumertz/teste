import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { applyAccentColor } from '../lib/accentColor'
import { setFavicon } from '../lib/favicon'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const userRef               = useRef(null)

  async function fetchProfile(uid) {
    const { data } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', uid)
      .single()
    if (data) {
      setProfile(data)
      setCompany(data.companies)
    } else {
      setProfile(null)
      setCompany(null)
    }
    return data
  }

  // Keep a ref so event listeners can read current user without stale closure
  useEffect(() => { userRef.current = user }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const p = await fetchProfile(session.user.id)
        if (p && !p.blocked) {
          setUser(session.user)
        } else {
          await supabase.auth.signOut()
        }
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setUser(null)
        setProfile(null)
        setCompany(null)
      }
    })

    // Re-check blocked status when tab becomes visible (handles already-logged-in case)
    const handleVisible = async () => {
      if (document.visibilityState !== 'visible' || !userRef.current) return
      const p = await fetchProfile(userRef.current.id)
      if (!p || p.blocked) await supabase.auth.signOut()
    }
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [])

  // Realtime: kick out the moment profile.blocked is set to true
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel(`profile-block:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, async (payload) => {
        if (payload.new?.blocked) await supabase.auth.signOut()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function signUp({ email, password, name, companyName, phone }) {
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('already registered') || msg.includes('already exists')) {
        const { data: siData, error: siErr } = await supabase.auth.signInWithPassword({ email, password })
        if (siErr) throw new Error('Este e-mail já está cadastrado. Use a opção Entrar com a senha correta.')
        const profileData = await fetchProfile(siData.user.id)
        if (profileData) {
          await supabase.auth.signOut()
          throw new Error('Este e-mail já está ativo em uma empresa. Use a opção Entrar.')
        }
        const { error: rpcErr } = await supabase.rpc('register_company', {
          p_company_name: companyName, p_user_name: name, p_user_email: email, p_phone: phone || null,
        })
        if (rpcErr) { await supabase.auth.signOut(); throw rpcErr }
        await fetchProfile(siData.user.id)
        setUser(siData.user)
        return siData
      }
      throw error
    }

    const { error: rpcErr } = await supabase.rpc('register_company', {
      p_company_name: companyName,
      p_user_name: name,
      p_user_email: email,
      p_phone: phone || null,
    })
    if (rpcErr) {
      await supabase.auth.signOut()
      throw rpcErr
    }
    await fetchProfile(data.user.id)
    setUser(data.user)
    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('not found')) {
        throw new Error('E-mail ou senha incorretos. Verifique os dados e tente novamente.')
      }
      if (msg.includes('email not confirmed')) {
        throw new Error('E-mail não confirmado. Verifique sua caixa de entrada.')
      }
      if (msg.includes('too many') || msg.includes('rate')) {
        throw new Error('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      }
      throw new Error('Erro ao entrar. Verifique sua conexão e tente novamente.')
    }

    const profileData = await fetchProfile(data.user.id)
    if (!profileData) {
      await supabase.auth.signOut()
      throw new Error('Usuário removido do sistema. Entre em contato com o administrador.')
    }
    if (profileData.blocked) {
      await supabase.auth.signOut()
      throw new Error('Sua conta está bloqueada. Entre em contato com o administrador.')
    }
    setUser(data.user)
    return data
  }

  async function signOut() {
    applyAccentColor(null) // reset color synchronously before any re-render
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setCompany(null)
  }

  const isAdmin      = profile?.role === 'owner' || profile?.role === 'admin'
  const isOwner      = profile?.role === 'owner'
  const isSuperAdmin = profile?.is_superadmin === true

  const itemName = company?.item_name
    || (company?.id ? localStorage.getItem(`item_name_${company.id}`) : null)
    || 'Item'

  const updateItemName = (name) => setCompany(prev => ({ ...prev, item_name: name }))

  const defaultColumnId = company?.default_column_id
    || (company?.id ? localStorage.getItem(`default_column_${company.id}`) : null)
    || null

  const updateDefaultColumnId = (id) => setCompany(prev => ({ ...prev, default_column_id: id }))

  const artColumnId = company?.art_column_id
    || (company?.id ? localStorage.getItem(`art_column_${company.id}`) : null)
    || null

  const updateArtColumnId = (id) => setCompany(prev => ({ ...prev, art_column_id: id }))

  const accentColor = company?.accent_color
    || (company?.id ? localStorage.getItem(`accent_${company.id}`) : null)
    || null

  const updateAccentColor = async (color) => {
    if (company?.id) {
      if (color) localStorage.setItem(`accent_${company.id}`, color)
      else localStorage.removeItem(`accent_${company.id}`)
      await supabase.from('companies').update({ accent_color: color || null }).eq('id', company.id)
    }
    setCompany(prev => ({ ...prev, accent_color: color }))
  }

  return (
    <AuthContext.Provider value={{
      user, profile, company, loading,
      isAdmin, isOwner, isSuperAdmin,
      itemName, updateItemName,
      defaultColumnId, updateDefaultColumnId,
      artColumnId, updateArtColumnId,
      accentColor, updateAccentColor,
      signUp, signIn, signOut,
      refreshProfile: () => user && fetchProfile(user.id),
      updateCompany: (updates) => setCompany(prev => ({ ...prev, ...updates })),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
