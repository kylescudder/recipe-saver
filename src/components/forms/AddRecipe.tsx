'use client'

import { IRecipe } from '@/lib/models/recipe'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { FieldValues, useForm } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function AddRecipe(props: { open: (open: boolean) => void }) {
  const [selectedValue, setSelectedValue] = useState('website')
  const utils = trpc.useUtils()
  const save = trpc.recipes.save.useMutation({
    onSuccess: () => utils.recipes.list.invalidate(),
    onError: (error) => toast.error(error.message)
  })

  interface formRecipe {
    _id: string
    recipeName: string
    recipeLink: string
    recipeBook: string
    recipePageNo: string
    archive: boolean
  }

  const form = useForm({
    defaultValues: {
      _id: '',
      recipeName: '',
      recipeLink: '',
      recipeBook: '',
      recipePageNo: '',
      archive: false
    }
  })

  const onSubmit = async (values: formRecipe) => {
    const payload: IRecipe = {
      _id: '',
      recipeName: values.recipeName,
      recipeLink: selectedValue === 'website' ? values.recipeLink : '',
      recipeBook: selectedValue === 'book' ? values.recipeBook : '',
      recipePageNo: selectedValue === 'book' ? values.recipePageNo : '',
      archive: false
    }

    try {
      await save.mutateAsync(payload)
      props.open(false)
      toast('Recipe added!')
    } catch {
      /* mutation reports the error */
    }
  }

  const handleChange = (value: string) => {
    setSelectedValue(value)
  }
  return (
    <div className='flex items-center justify-between'>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className={`} flex w-full flex-col justify-start gap-4 pt-4`}
        >
          <FormField
            control={form.control}
            name='recipeName'
            render={({ field }: { field: FieldValues }) => (
              <FormItem>
                <FormLabel htmlFor='recipeName'>Name</FormLabel>
                <FormControl>
                  <div className='items-center gap-4'>
                    <Input
                      {...field}
                      id='recipeName'
                      className='text-base'
                      placeholder='The best recipe in the world'
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
          <RadioGroup
            defaultValue='website'
            value={selectedValue}
            onValueChange={handleChange}
          >
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='website' id='website' />
              <Label htmlFor='website'>Website</Label>
            </div>
            <div className='flex items-center space-x-2'>
              <RadioGroupItem value='book' id='book' />
              <Label htmlFor='book'>Book</Label>
            </div>
          </RadioGroup>
          {selectedValue === 'website' ? (
            <FormField
              control={form.control}
              name='recipeLink'
              render={({ field }: { field: FieldValues }) => (
                <FormItem>
                  <FormLabel htmlFor='recipeLink'>Link</FormLabel>
                  <FormControl>
                    <div className='items-center gap-4'>
                      <Input
                        {...field}
                        id='recipeLink'
                        className='text-base'
                        placeholder='Mob, bosh of good food?'
                      />
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />
          ) : (
            <div>
              <FormField
                control={form.control}
                name='recipeBook'
                render={({ field }: { field: FieldValues }) => (
                  <FormItem>
                    <FormLabel htmlFor='recipeBook'>Book</FormLabel>
                    <FormControl>
                      <div className='items-center gap-4'>
                        <Input
                          {...field}
                          id='recipeBook'
                          className='text-base'
                          placeholder='Which Joe Wicks book?'
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='recipePageNo'
                render={({ field }: { field: FieldValues }) => (
                  <FormItem>
                    <FormLabel htmlFor='recipePageNo'>Page No</FormLabel>
                    <FormControl>
                      <div className='items-center gap-4'>
                        <Input
                          {...field}
                          id='recipePageNo'
                          className='text-base'
                          placeholder='207? 145? 567?'
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
          <Button type='submit' disabled={save.isPending}>
            Update Recipe
          </Button>
        </form>
      </Form>
    </div>
  )
}
