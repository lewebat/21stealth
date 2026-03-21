/**
 * Template for TanStack Query hooks.
 * Copy this file and replace "User/users" with your resource name.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@lib/api'

// ── Query keys ─────────────────────────────────────────
export const userKeys = {
  all:    ['users'],
  list:   (filters) => ['users', 'list', filters],
  detail: (id) => ['users', 'detail', id],
}

// ── Queries ─────────────────────────────────────────────
export function useGetUsers(filters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn:  () => api.get('/users', { params: filters }),
  })
}

export function useGetUser(id) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn:  () => api.get(`/users/${id}`),
    enabled:  !!id,
  })
}

// ── Mutations ────────────────────────────────────────────
export function useCreateUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/users', data),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}

export function useUpdateUser(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.put(`/users/${id}`, data),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all })
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: userKeys.all }),
  })
}
