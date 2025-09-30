import Heading from '../ui/Heading'
import Row from '../ui/Row'
import ServiceTable from '../features/services/ServiceTable'
import AddService from '../features/services/AddService'
import ServiceTableOperations from '../features/services/ServiceTableOperations'

function Services() {
  return (
    <>
      <Row type="horizontal">
        <Heading as="h1">All services</Heading>
        <ServiceTableOperations />
      </Row>

      <Row>
        <ServiceTable />
        <AddService />
      </Row>
    </>
  )
}

export default Services
