<template>
  <main>
    <h1>My Todos</h1>
    <button @click="createTodo">New</button>
    <ul>
      <li v-for="todo in todos" :key="todo.id" @click="deleteTodo(todo.id)">
        {{ todo.content }}
      </li>
    </ul>
    <div>
      🥳 App successfully hosted. Try creating a new todo.
      <br />
    </div>
    <div><input type="file" @change="handleFileUpload" /></div>
    <div>
      <button style="margin: 10px" @click="listFiles">Show Images</button>
    </div>
    <div>
      <ul>
        <li v-for="link in imageLinks">
          <img
            :src="link.url"
            :alt="link.path"
            style="width: 150px; height: auto"
          />
          <p>{{ link.path }}</p>
        </li>
      </ul>
    </div>
  </main>
</template>

<script lang="ts" setup>
import '@/assets/main.css'
import { ref, onMounted, onUnmounted } from 'vue'
import type { Schema } from '../../amplify/data/resource'
import { generateClient } from 'aws-amplify/data'
import { getCurrentUser } from 'aws-amplify/auth'
import { uploadData, list, getUrl } from 'aws-amplify/storage'

// Reactive state variables
const currentUser = ref<any>(null) // or replace `any` with a proper user type
const todos = ref<Array<Schema['Todo']['type']>>([])
const imageLinks = ref()

// Create client instance with generics
const client = generateClient<Schema>()

// subscription
const createSub = ref()
const updateSub = ref()
const deleteSub = ref()

async function listTodos() {
  const fetchTodos = async () => {
    try {
      const { data, errors: apiErrors } = await client.models.Todo.list()
      todos.value = data // Set the todos.value to the fetched data
    } catch (error) {
      console.error('Error fetching todos:', error)
    }
  }
}

function createTodo() {
  const content = window.prompt('Todo content')
  if (!content) return // Prevent creating empty todos

  client.models.Todo.create({
    content: content,
    owner: currentUser.value.signInDetails.loginId,
    createdBy: currentUser.value.username,
  })
  // .then(() => {
  //   listTodos() // Refresh todos after creation
  // })

  //   client.models.Recipe.create({
  //     name: recipeName.value,
  //     description: recipeDescription.value,
  //     createdBy: currentUser.value.signInDetails.loginId,
}

function deleteTodo(id: string) {
  client.models.Todo.delete({ id })
}

// Handle file upload with TypeScript
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    console.log(`Uploading file: ${file.name}`)

    try {
      const result = uploadData({
        path: `recipe-manager/images/${file.name}`,
        data: file,
        options: {
          bucket: 'recipe-manager-bucket',
        },
      })

      console.log(`Upload successful: ${JSON.stringify(result)}`)
    } catch (error) {
      console.error('Upload failed:', error)
    }
  } else {
    console.error('No file selected')
  }
}

const listFiles = async () => {
  const result = await list({
    path: 'recipe-manager/images/',
    // Alternatively, path: ({identityId}) => `album/{identityId}/photos/`,
    options: {
      bucket: 'recipe-manager-bucket',
      listAll: true,
    },
  })

  console.log(`recipe images: ${JSON.stringify(result)}`)
  imageLinks.value = []
  result.items.forEach(async (item) => {
    const link = await getUrl({
      path: item.path,
      options: {
        bucket: 'recipe-manager-bucket',
        // url expiration time in seconds.
        expiresIn: 300,
      },
    })
    imageLinks.value.push({ url: link.url.toString(), path: link.url.pathname })
    console.log(`temp url: ${link.url.toString()}`)
  })
}

// Fetch user and todos on component mount
onMounted(async () => {
  try {
    currentUser.value = await getCurrentUser()
    console.log(`User: ${JSON.stringify(currentUser.value)}`)

    // real-time event subscription
    createSub.value = client.models.Todo.onCreate().subscribe({
      next: (data) => {
        console.log(`create: ${JSON.stringify(data)}`)
        const item = todos.value.find((x) => x.id === data.id)
        if (!item) {
          console.log(`creating new item in todo list with id ${data.id}`)
          todos.value.push(data)
        }
      },
      error: (error) => console.warn(error),
    })

    updateSub.value = client.models.Todo.onUpdate().subscribe({
      next: (data) => {
        console.log(`update: ${JSON.stringify(data)}`)
        let item = todos.value.find((x) => x.id === data.id)
        if (item) {
          item = data
        }
      },
      error: (error) => console.warn(error),
    })
    deleteSub.value = client.models.Todo.onDelete().subscribe({
      next: (data) => {
        console.log(`delete: ${JSON.stringify(data)}`)
        const filtered = todos.value.filter((x) => x.id !== data.id)
        todos.value = filtered
      },
      error: (error) => console.warn(error),
    })

    listTodos()
  } catch (error) {
    console.error('Error fetching user or todos:', error)
  }
})

onUnmounted(() => {
  updateSub.value.unsubscribe()
  deleteSub.value.unsubscribe()
})
</script>
