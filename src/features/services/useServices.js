import { useQuery } from '@tanstack/react-query'
import { getServices } from '../../services/apiServices'

export function useServices() {
  const {
    isLoading,
    data: services,
    error,
  } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
  })

  return { isLoading, error, services }
}
