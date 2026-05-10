import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const PROFILE_CACHE_KEY = 'cache_profile_v1'
const COMPANY_CACHE_KEY = 'cache_company_v1'

function loadCache(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') }
  catch { return null }
}

function clearCache() {
  localStorage.removeItem(PROFILE_CACHE_KEY)
  localStorage.removeItem(COMPANY_CACHE_KEY)
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(() => loadCache(PROFILE_CACHE_KEY))
  const [company, setCompany] = useState(() => loadCache(COMPANY_CACHE_KEY))
  const [loading, setLoading] = useState(() => !loadCache(PROFILE_CACHE_KEY))

  async function fetchProfile(uid) {
    const { data } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', uid)
      .single()
    if (data) {
      setProfile(data)
      setCompany(data.companies)
      try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(data))
        localStorage.setItem(COMPANY_CACHE_KEY, JSON.stringify(data.companies))
      } catch {}
    } else {
      setProfile(null)
      setCompany(null)
      clearCache()
    }
    return data
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const hasCached = !!loadCache(PROFILE_CACHE_KEY)
        if (hasCached) {
          setLoading(false)
          fetchProfile(session.user.id)
        } else {
          fetchProfile(session.user.id).finally(() => setLoading(false))
        }
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setCompany(null)
        clearCache()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function signUp({ email, password, name, companyName }) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Register company via RPC (security definer bypasses RLS)
    const { error: rpcErr } = await supabase.rpc('register_company', {
      p_company_name: companyName,
      p_user_name: name,
      p_user_email: email,
    })
    if (rpcErr) {
      await supabase.auth.signOut()
      throw rpcErr
    }
    await fetchProfile(data.user.id)
    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    await fetchProfile(data.user.id)
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setCompany(null)
    clearCache()
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

  return (
    <AuthContext.Provider value={{
      user, profile, company, loading,
      isAdmin, isOwner, isSuperAdmin,
      itemName, updateItemName,
      defaultColumnId, updateDefaultColumnId,
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
