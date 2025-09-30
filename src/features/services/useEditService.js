import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createEditService } from '../../services/apiServices'

export function useEditService() {
  const quryClient = useQueryClient()

  const { mutate: editService, isLoading: isEditing } = useMutation({
    mutationFn: ({ newServiceData, id }) => createEditService(newServiceData, id),
    onSuccess: () => {
      toast.success('Service successfully edited')
      quryClient.invalidateQueries({
        queryKey: ['services'],
      })
    },
    onError: (err) => toast.error(err.message),
  })

  return { isEditing, editService }
}
