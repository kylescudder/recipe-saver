import { archiveToast, successToast } from '@/lib/actions/toast.actions'
import { IRecipe } from '@/lib/models/recipe'
import { useForm } from '@mantine/form'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import BackButton from './BackButton'
import { Button, TextInput, Radio, Group, NumberInput } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import { archiveRecipe, updateRecipe } from '@/lib/actions/recipe.actions'

export default function AddRecipe(props: { recipe: IRecipe }) {
  const router = useRouter()
  const pathname = usePathname()

  const [changesMade, setChangesMade] = useState<boolean>(false)

  interface formRecipe {
    _id: string
    recipeName: string
    recipeLink: string
    recipeBook: string
    recipePageNo: string
    archive: boolean
  }

  const form = useForm({
    initialValues: {
      _id: props.recipe._id ? props.recipe._id : '',
      recipeName: props.recipe.recipeName ? props.recipe.recipeName : '',
      recipeLink: props.recipe.recipeLink ? props.recipe.recipeLink : '',
      recipeBook: props.recipe.recipeBook ? props.recipe.recipeBook : '',
      recipePageNo: props.recipe.recipePageNo ? props.recipe.recipePageNo : '',
      archive: props.recipe.archive ? props.recipe.archive : false
    }
  })

  const onSubmit = async (values: formRecipe) => {
    const payload: IRecipe = {
      ...props.recipe,
      recipeName: values.recipeName,
      recipeLink: values.recipeLink,
      recipeBook: values.recipeBook,
      recipePageNo: values.recipePageNo
    }

    const recipe = await updateRecipe(payload)
    if (pathname.includes('/recipe/')) {
      successToast(recipe.recipeName)
      setChangesMade(true)
    } else {
      router.push(`/recipe/${recipe._id}`)
    }
  }

  const handleArchive = async () => {
    await archiveRecipe(props.recipe._id)
    archiveToast(props.recipe.recipeName)
    setTimeout(() => {
      const url = `${window.location.protocol}//${window.location.host}`
      window.location.href = `${url}/recipes`
    }, 1000)
  }

  const setChecked = (checkBox: HTMLInputElement) => {
    console.log('website')
    //if (checkBox.labels[0].innerText === "Website") {
    //}
  }

  return (
    <div>
      <div className='flex justify-between items-center'>
        <BackButton
          record={props.recipe}
          changesMade={changesMade}
          page='recipes'
        />
        <Button
          radius='md'
          className={`bg-danger text-light-1 ${
            props.recipe._id === '' ? 'hidden' : ''
          }`}
          onClick={handleArchive}
          aria-label='archive'
        >
          <IconTrash className='text-light-1' />
        </Button>
      </div>
      <form
        onSubmit={form.onSubmit((values) => onSubmit(values))}
        className={`flex flex-col justify-start gap-10 pt-4 ${
          props.recipe._id === '' ? 'px-6' : ''
        }`}
      >
        <TextInput
          label='Name'
          radius='md'
          placeholder='The best recipe in the world'
          className='text-dark-2 dark:text-light-2'
          size='md'
          {...form.getInputProps('recipeName')}
        />
        <Radio.Group name='favoriteFramework' label='Website or book'>
          <Group mt='md'>
            <Radio
              value='website'
              label='Website'
              onChange={(event) => console.log(event.currentTarget)}
            />
            <Radio
              value='book'
              label='Book'
              onChange={(event) => setChecked(event.currentTarget)}
            />
          </Group>
        </Radio.Group>
        <TextInput
          label='Link'
          radius='md'
          placeholder='Mob or bosh?'
          className='text-dark-2 dark:text-light-2 hidden'
          size='md'
          {...form.getInputProps('recipeLink')}
        />
        <NumberInput
          label='Book'
          radius='md'
          placeholder='Which Joe Wicks book?'
          className='text-dark-2 dark:text-light-2 hidden'
          size='md'
          {...form.getInputProps('recipeBook')}
        />
        <TextInput
          label='PageNo'
          radius='md'
          placeholder='207? 145? 56?'
          className='text-dark-2 dark:text-light-2 hidden'
          size='md'
          {...form.getInputProps('recipePageNo')}
        />
      </form>
    </div>
  )
}
