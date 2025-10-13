import styled from 'styled-components'
import { formatCurrency } from '../../utils/helpers'
import { HiSquare2Stack, HiPencil, HiTrash } from 'react-icons/hi2'
import Modal from '../../ui/Modal'
import ConfirmDelete from '../../ui/ConfirmDelete'
import Table from '../../ui/Table'
import Menus from '../../ui/Menus'
import CreateServiceForm from './CreateServiceForm'
import { useDeleteService } from './useDeleteService'
import { useCreateService } from './useCreateService'

const Service = styled.div`
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--color-grey-600);
  font-family: 'Sono';
`

const Price = styled.div`
  font-family: 'Sono';
  font-weight: 600;
  color: var(--color-grey-600);
`

const Duration = styled.div`
  font-family: 'Sono';
  font-weight: 500;
  color: var(--color-grey-600);
`

const Category = styled.div`
  font-family: 'Sono';
  font-weight: 500;
  color: var(--color-grey-600);
`

function ServiceRow({ service }) {
  const { isDeleting, deleteService } = useDeleteService()
  const { isCreating, createService } = useCreateService()

  const {
    id: serviceId,
    name,
    regularPrice,
    duration,
    category,
    discount,
    image,
    description,
  } = service

  function handleDuplicate() {
    createService({
      name: `Copy of ${name}`,
      regularPrice,
      duration,
      category,
      discount,
      image,
      description,
    })
  }

  // Handle price display
  const displayPrice = isNaN(Number(regularPrice))
    ? regularPrice.startsWith('$')
      ? regularPrice
      : `$${regularPrice}`
    : formatCurrency(Number(regularPrice))

  return (
    <Table.Row>
      <Service>{name}</Service>
      <Price>{displayPrice}</Price>
      <Duration>{duration} min</Duration>
      <Category>{category}</Category>
      <div>
        <Modal style="color: var(--color-grey-600)">
          <Menus.Menu>
            <Menus.Toggle id={serviceId} />

            <Menus.List id={serviceId}>
              <Modal.Open opens="edit">
                <Menus.Button icon={<HiPencil />}>Edit</Menus.Button>
              </Modal.Open>

              <Modal.Open opens="delete">
                <Menus.Button icon={<HiTrash />}>Delete</Menus.Button>
              </Modal.Open>
            </Menus.List>

            <Modal.Window name="edit">
              <CreateServiceForm serviceToEdit={service} />
            </Modal.Window>

            <Modal.Window name="delete">
              <ConfirmDelete
                resourceName="services"
                disabled={isDeleting}
                onConfirm={() => deleteService(serviceId)}
              />
            </Modal.Window>
          </Menus.Menu>
        </Modal>
      </div>
    </Table.Row>
  )
}

export default ServiceRow
