import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUIStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'dark', // 'light' | 'dark'
      toasts: [],

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),

      addToast: (toast) => {
        const id = crypto.randomUUID()
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
        }, toast.duration ?? 4000)
      },

      removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      helpOpen: false,
      helpArticle: null, // null = show ToC; string key = show specific article

      openHelp: (key = null) => set({ helpOpen: true, helpArticle: key }),
      closeHelp: () => set({ helpOpen: false, helpArticle: null }),

      appNotifications: [], // [{ id, type: 'warning'|'error', message, ts }]
      addAppNotification: (n) => set((s) => {
        if (s.appNotifications.some((x) => x.id === n.id)) return s
        return { appNotifications: [...s.appNotifications, { ...n, ts: Date.now() }] }
      }),
      dismissAppNotification: (id) => set((s) => ({
        appNotifications: s.appNotifications.filter((x) => x.id !== id),
      })),
    }),
    {
      name: 'ui-store',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
)

export default useUIStore
