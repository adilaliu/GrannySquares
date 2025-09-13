'use client'

import { useState, useEffect } from 'react'
import { signInWithGoogle, signInWithMagicLink, signOut, getCurrentUser } from '@/utils/auth-api'

interface User {
  email: string
  profile?: {
    handle?: string
    display_name?: string
  }
}

export default function AuthExample() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    setLoading(true)
    try {
      const { user, error } = await getCurrentUser()
      if (error) {
        setError(error)
      } else {
        setUser(user)
      }
    } catch (err) {
      setError('Failed to load user')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setMessage('')
    setIsSubmitting(true)
    
    try {
      const result = await signInWithGoogle()
      if (result.error) {
        setError(result.error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMagicLinkSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    if (!email.trim()) {
      setError('Please enter your email')
      setIsSubmitting(false)
      return
    }

    try {
      const result = await signInWithMagicLink(email)
      if (result.error) {
        setError(result.error)
      } else {
        setMessage('✨ Check your email for the magic link!')
        setEmail('')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const result = await signOut()
      if (result.error) {
        setError(result.error)
      } else {
        setMessage('Successfully signed out')
        setUser(null)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-32">
        <div className="flex items-center gap-3 text-slate-600">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 bg-gradient-to-br from-slate-50 to-white">
          <h2 className="text-2xl font-bold text-slate-900 text-center">
            {user ? 'Welcome back!' : 'Sign in to continue'}
          </h2>
          {!user && (
            <p className="text-slate-600 text-sm text-center mt-2">
              Choose your preferred sign-in method
            </p>
          )}
        </div>

        <div className="px-8 pb-8">
          {/* Status Messages */}
          {message && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
              {message}
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {user ? (
            /* Authenticated State */
            <div className="space-y-6">
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {user.profile?.display_name || 'Welcome!'}
                    </p>
                    <p className="text-slate-600 text-sm">{user.email}</p>
                  </div>
                </div>
                {user.profile?.handle && (
                  <p className="text-slate-600 text-sm">
                    Handle: <span className="font-medium">@{user.profile.handle}</span>
                  </p>
                )}
              </div>
              
              <button
                onClick={handleSignOut}
                disabled={isSubmitting}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Signing out...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Unauthenticated State */
            <div className="space-y-6">
              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-gray-50 disabled:bg-gray-100 text-slate-900 font-semibold py-3 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 flex items-center justify-center gap-3"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EB4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500 font-medium">or</span>
                </div>
              </div>

              {/* Magic Link Form */}
              <form onSubmit={handleMagicLinkSignIn} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-slate-900 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim()}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Sending magic link...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Send magic link
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
