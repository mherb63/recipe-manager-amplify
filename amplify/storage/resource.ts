import { defineStorage } from '@aws-amplify/backend'

export const storage = defineStorage({
  name: 'recipe-manager-bucket',
  access: (allow) => ({
    'recipe-manager/*': [allow.authenticated.to(['read', 'write', 'delete'])],
  }),
})
