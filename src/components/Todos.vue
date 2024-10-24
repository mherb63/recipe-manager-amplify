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
  </main>
</template>

<script lang="ts" setup>
import '@/assets/main.css'
import { ref, onMounted } from 'vue'
import { Schema } from '../../amplify/data/resource'
import { generateClient } from 'aws-amplify/data'
import { getCurrentUser } from 'aws-amplify/auth'
import { uploadData } from 'aws-amplify/storage'

// Reactive state variables
const currentUser = ref<any>(null) // or replace `any` with a proper user type
const todos = ref<Array<Schema['Todo']['type']>>([])

// Create client instance with generics
const client = generateClient<Schema>()

// Fetch and observe todos
function listTodos() {
  client.models.Todo.observeQuery().subscribe({
    next: ({ items, isSynced }) => {
      todos.value = items
    },
  })
}

// Create a new todo
function createTodo() {
  const content = window.prompt('Todo content')
  if (!content) return // Prevent creating empty todos

  client.models.Todo.create({ content }).then(() => {
    listTodos() // Refresh todos after creation
  })
}

// Delete a todo by id
function deleteTodo(id: string) {
  client.models.Todo.delete({ id }).then(() => {
    listTodos() // Refresh todos after deletion
  })
}

// Handle file upload with TypeScript
const handleFileUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    console.log(`Uploading file: ${file.name}`)

    try {
      const result = await uploadData({
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

// Fetch user and todos on component mount
onMounted(async () => {
  try {
    currentUser.value = await getCurrentUser()
    console.log(`User: ${JSON.stringify(currentUser.value)}`)
    listTodos()
  } catch (error) {
    console.error('Error fetching user or todos:', error)
  }
})
</script>
