import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import './fixture.css'
import '@fontsource-variable/lora'
import '@fontsource-variable/dm-sans'

function Fixture() {
  const form = useForm({ defaultValues: { name: '' } })
  const [selected, setSelected] = useState('')
  const [saved, setSaved] = useState('')
  return (
    <main
      style={{
        padding: 32,
        maxWidth: 640,
        margin: 'auto',
        display: 'grid',
        gap: 24
      }}
    >
      <h1>Recipe Saver component checks</h1>
      <p>
        An isolated fixture of the application’s real components. No sign-in or
        backend is simulated.
      </p>
      <Button asChild>
        <a href='#controls'>Slotted link</a>
      </Button>
      <div id='controls' style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recipe details</DialogTitle>
              <DialogDescription>
                Check dialog styling, keyboard dismissal and focus restoration.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(({ name }) => setSaved(name))}>
                <FormField
                  control={form.control}
                  name='name'
                  rules={{ required: 'Enter a recipe name.' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recipe name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type='submit'>Validate name</Button>
              </form>
            </Form>
            <p role='status'>{saved && 'Valid name: ' + saved}</p>
          </DialogContent>
        </Dialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={() => setSelected('Archived')}>
              Archive recipe
            </DropdownMenuItem>
            <DropdownMenuItem>Keep recipe</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Select onValueChange={setSelected}>
        <SelectTrigger aria-label='Recipe source'>
          <SelectValue placeholder='Choose a source' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='Website'>Website</SelectItem>
          <SelectItem value='Cookbook'>Cookbook</SelectItem>
        </SelectContent>
      </Select>
      <RadioGroup defaultValue='website' aria-label='Source type'>
        <div>
          <RadioGroupItem id='website' value='website' />
          <Label htmlFor='website'>A website</Label>
        </div>
        <div>
          <RadioGroupItem id='cookbook' value='cookbook' />
          <Label htmlFor='cookbook'>A cookbook</Label>
        </div>
      </RadioGroup>
      <p aria-live='polite'>Selection: {selected}</p>
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<Fixture />)
