import { useMutation, useQueryClient } from '@tanstack/react-query'
import { login as loginApi } from '../../services/apiAuth'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export function useLogin() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { mutate: login, isLoading } = useMutation({
    mutationFn: ({ email, password }) => loginApi({ email, password }),
    onSuccess: (user) => {
      const role = user?.user?.user_metadata?.role

      if (role !== 'admin') {
        // ❌ Stop right here – don’t cache, don’t navigate
        toast.error('Access denied. Only admins can log in here.')
        return
      }

      // ✅ Admin login allowed
      queryClient.setQueriesData(['user'], user.user)
      navigate('/dashboard', { replace: true })
    },
    onError: (err) => {
      console.error('ERROR', err)
      toast.error('Provided email or password are incorrect')
    },
  })

  return { login, isLoading }
}
