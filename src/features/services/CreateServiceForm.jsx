import { useForm } from 'react-hook-form'

import Input from '../../ui/Input'
import Form from '../../ui/Form'
import Button from '../../ui/Button'
import FormRow from '../../ui/FormRow'

import { useCreateService } from './useCreateService'
import { useEditService } from './useEditService'

function CreateServiceForm({ serviceToEdit = {}, onCloseModal }) {
  const { isCreating, createService } = useCreateService()
  const { isEditing, editService } = useEditService()
  const isWorking = isCreating || isEditing

  const { id: editId, ...editValues } = serviceToEdit
  const isEditSession = Boolean(editId)

  const { register, handleSubmit, reset, formState } = useForm({
    defaultValues: isEditSession ? editValues : {},
  })

  const { errors } = formState

  function onSubmit(data) {
    if (isEditSession)
      editService(
        { newServiceData: { ...data }, id: editId },
        {
          onSuccess: (data) => {
            reset()
            onCloseModal?.()
          },
        }
      )
    else
      createService(
        { ...data },
        {
          onSuccess: (data) => {
            reset()
            onCloseModal?.()
          },
        }
      )
  }

  function onError(error) {
    // console.log(error);
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit, onError)} type={onCloseModal ? 'modal' : 'regular'}>
      <FormRow label="Service name" error={errors?.name?.message}>
        <Input
          type="text"
          id="name"
          disabled={isWorking}
          {...register('name', {
            required: 'This field is required',
          })}
        />
      </FormRow>

      <FormRow label="Regular price" error={errors?.regularPrice?.message}>
        <Input
          type="number"
          id="regularPrice"
          disabled={isWorking}
          {...register('regularPrice', {
            required: 'This field is required',
            min: {
              value: 1,
              message: 'Price should be at least 1',
            },
          })}
        />
      </FormRow>

      <FormRow label="Duration (minutes)" error={errors?.duration?.message}>
        <Input
          type="number"
          id="duration"
          disabled={isWorking}
          {...register('duration', {
            required: 'This field is required',
            min: {
              value: 1,
              message: 'Duration should be at least 1 minute',
            },
          })}
        />
      </FormRow>

      <FormRow label="Category" error={errors?.category?.message}>
        <Input
          type="text"
          id="category"
          disabled={isWorking}
          {...register('category', {
            required: 'This field is required',
          })}
        />
      </FormRow>

      <FormRow>
        <Button variation="secondary" type="reset" onClick={() => onCloseModal?.()}>
          Cancel
        </Button>
        <Button disabled={isWorking}>
          {isEditSession ? 'Edit service' : 'Create new service'}
        </Button>
      </FormRow>
    </Form>
  )
}

export default CreateServiceForm
