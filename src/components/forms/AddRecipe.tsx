import { useState } from 'react'
import { IconBook2, IconLink, IconPlus } from '@tabler/icons-react'
import { trpc } from '@/lib/trpc'
import { useForm } from 'react-hook-form'
import type { IRecipe } from '@/lib/models/recipe'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export default function AddRecipe({ open }: { open: (open: boolean) => void }) {
  const [source, setSource] = useState('website')
  const [error, setError] = useState('')
  const utils = trpc.useUtils()
  const save = trpc.recipes.save.useMutation({
    onSuccess: () => utils.recipes.list.invalidate()
  })
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    shouldUnregister: true,
    defaultValues: {
      recipeName: '',
      recipeLink: '',
      recipeBook: '',
      recipePageNo: ''
    }
  })
  async function onSubmit(values: {
    recipeName: string
    recipeLink: string
    recipeBook: string
    recipePageNo: string
  }) {
    setError('')
    const payload: IRecipe = {
      ...values,
      _id: '',
      archive: false,
      recipeLink: source === 'website' ? values.recipeLink.trim() : '',
      recipeBook: source === 'book' ? values.recipeBook.trim() : '',
      recipePageNo: source === 'book' ? values.recipePageNo.trim() : ''
    }
    try {
      await save.mutateAsync(payload)
      open(false)
      toast.success('Recipe added')
    } catch {
      setError(
        'Your recipe could not be saved. Check the details and try again.'
      )
    }
  }
  return (
    <form className='recipe-form' noValidate onSubmit={handleSubmit(onSubmit)}>
      <div className='form-field'>
        <label htmlFor='recipeName'>Recipe name</label>
        <Input
          id='recipeName'
          placeholder='e.g. Sunday morning pancakes'
          maxLength={300}
          aria-invalid={!!errors.recipeName}
          aria-describedby={errors.recipeName ? 'name-error' : undefined}
          {...register('recipeName', {
            validate: (value) => !!value.trim() || 'Give your recipe a name.'
          })}
        />
        {errors.recipeName && (
          <p className='field-error' id='name-error' role='alert'>
            {errors.recipeName.message}
          </p>
        )}
      </div>
      <fieldset className='source-fieldset'>
        <legend>Where is it from?</legend>
        <RadioGroup
          className='source-options'
          value={source}
          onValueChange={(value) => {
            setSource(value)
            setError('')
          }}
          aria-label='Recipe source'
        >
          <label className='source-option' htmlFor='website'>
            <RadioGroupItem value='website' id='website' />
            <IconLink size={18} aria-hidden='true' />
            <span>A website</span>
          </label>
          <label className='source-option' htmlFor='book'>
            <RadioGroupItem value='book' id='book' />
            <IconBook2 size={18} aria-hidden='true' />
            <span>A cookbook</span>
          </label>
        </RadioGroup>
      </fieldset>
      {source === 'website' ? (
        <div className='form-field' key='website'>
          <label htmlFor='recipeLink'>Recipe link</label>
          <Input
            id='recipeLink'
            type='url'
            inputMode='url'
            placeholder='https://…'
            maxLength={2048}
            aria-invalid={!!errors.recipeLink}
            aria-describedby={errors.recipeLink ? 'link-error' : 'link-hint'}
            {...register('recipeLink', {
              validate: (value) => {
                if (source !== 'website') return true
                try {
                  return (
                    ['http:', 'https:'].includes(
                      new URL(value.trim()).protocol
                    ) || 'Use a full http or https website link.'
                  )
                } catch {
                  return 'Use a full http or https website link.'
                }
              }
            })}
          />
          {errors.recipeLink ? (
            <p className='field-error' id='link-error' role='alert'>
              {errors.recipeLink.message}
            </p>
          ) : (
            <p className='field-hint' id='link-hint'>
              Paste the link to the original recipe.
            </p>
          )}
        </div>
      ) : (
        <div className='cookbook-fields' key='book'>
          <div className='form-field'>
            <label htmlFor='recipeBook'>Cookbook title</label>
            <Input
              id='recipeBook'
              placeholder='e.g. The Green Roasting Tin'
              maxLength={300}
              aria-invalid={!!errors.recipeBook}
              aria-describedby={errors.recipeBook ? 'book-error' : undefined}
              {...register('recipeBook', {
                validate: (value) =>
                  source !== 'book' ||
                  !!value.trim() ||
                  'Add the name of your cookbook.'
              })}
            />
            {errors.recipeBook && (
              <p className='field-error' id='book-error' role='alert'>
                {errors.recipeBook.message}
              </p>
            )}
          </div>
          <div className='form-field'>
            <label htmlFor='recipePageNo'>
              Page <span className='optional-label'>(optional)</span>
            </label>
            <Input
              id='recipePageNo'
              placeholder='e.g. 42'
              maxLength={50}
              {...register('recipePageNo')}
            />
          </div>
        </div>
      )}
      {error && (
        <p role='alert' className='form-error'>
          {error}
        </p>
      )}
      <div className='recipe-form-footer'>
        <p>One more good thing in your collection.</p>
        <Button type='submit' disabled={save.isPending}>
          <IconPlus size={16} className='mr-2' />
          {save.isPending ? 'Saving recipe…' : 'Save recipe'}
        </Button>
      </div>
    </form>
  )
}
