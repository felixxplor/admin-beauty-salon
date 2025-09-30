import Button from '../../ui/Button'
import Modal from '../../ui/Modal'
import CreateServiceForm from './CreateServiceForm'

function AddService() {
  return (
    <div>
      <Modal>
        <Modal.Open opens="service-form">
          <Button>Add new service</Button>
        </Modal.Open>
        <Modal.Window name="service-form">
          <CreateServiceForm />
        </Modal.Window>
      </Modal>
    </div>
  )
}

// function AddCabin() {
//   const [isOpenModal, setIsOpenModal] = useState(false);

//   return (
//     <div>
//       <Button onClick={() => setIsOpenModal((show) => !show)}>
//         Add new cabin
//       </Button>
//       {isOpenModal && (
//         <Modal onClose={() => setIsOpenModal(false)}>
//           <CreateCabinForm onCloseModal={() => setIsOpenModal(false)} />
//         </Modal>
//       )}
//     </div>
//   );
// }

export default AddService
