import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createEditService } from '../../services/apiServices'

export function useCreateService() {
  const quryClient = useQueryClient()

  const { mutate: createService, isLoading: isCreating } = useMutation({
    mutationFn: createEditService,
    onSuccess: () => {
      toast.success('New service successfully created')
      quryClient.invalidateQueries({
        queryKey: ['services'],
      })
    },
    onError: (err) => toast.error(err.message),
  })

  return { isCreating, createService }
}
