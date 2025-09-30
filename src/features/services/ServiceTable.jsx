import Spinner from '../../ui/Spinner'
import Table from '../../ui/Table'
import Menus from '../../ui/Menus'
import { useSearchParams } from 'react-router-dom'
import Empty from '../../ui/Empty'
import { useServices } from './useServices'
import ServiceRow from './ServiceRow'

function ServiceTable() {
  const { isLoading, services } = useServices()
  const [searchParams] = useSearchParams() // Fixed typo: seearchParams -> searchParams

  if (isLoading) return <Spinner />
  if (!services.length) return <Empty resourceName="services" />

  // 1) FILTER
  const filterValue = searchParams.get('discount') || 'all'

  let filteredServices
  if (filterValue === 'all') filteredServices = services
  if (filterValue === 'no-discount')
    filteredServices = services.filter((service) => service.discount === 0)
  if (filterValue === 'with-discount')
    filteredServices = services.filter((service) => service.discount > 0)

  // SORT
  const sortBy = searchParams.get('sortBy') || 'name-asc'
  const [field, direction] = sortBy.split('-')
  const modifier = direction === 'asc' ? 1 : -1

  const sortedServices = filteredServices.sort((a, b) => {
    // Handle string sorting for name and category
    if (field === 'name' || field === 'category') {
      const valueA = a[field]?.toString().toLowerCase() || ''
      const valueB = b[field]?.toString().toLowerCase() || ''
      return valueA.localeCompare(valueB) * modifier
    }
    // Handle numeric sorting for regularPrice and duration
    return (a[field] - b[field]) * modifier
  })

  return (
    <Menus>
      <Table columns="2.5fr 1fr 1fr 1.5fr 1fr">
        <Table.Header>
          <div>Service Name</div>
          <div>Price</div>
          <div>Duration (min)</div>
          <div>Category</div>
          <div></div>
        </Table.Header>

        <Table.Body
          data={sortedServices}
          render={(service) => <ServiceRow service={service} key={service.id} />}
        />
      </Table>
    </Menus>
  )
}

export default ServiceTable
