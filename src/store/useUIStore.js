import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useUIStore = create(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light', // 'light' | 'dark'
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
    }),
    {
      name: 'ui-store',
      partialize: (s) => ({ theme: s.theme }),
    }
  )
)

export default useUIStore
