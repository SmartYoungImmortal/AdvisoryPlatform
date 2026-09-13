// shared-code.ts
// Notice the import path is different from the client
import { formOptions } from '@tanstack/react-form-nextjs'

// You can pass other form options here
export const formOpts = formOptions({
  defaultValues: {
    firstName: '',
    age: 0,
  },
})