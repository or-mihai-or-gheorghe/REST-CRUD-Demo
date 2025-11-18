<template>
  <div class="register-container">
    <div v-if="isLoading">Loading...</div>
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-if="item">
      <h1>{{ item.name }}</h1>
      <p>Price: ${{ Number(item.price).toFixed(2) }}</p>
      <form @submit.prevent="handleUpdate" class="register-form">
        <div class="form-group">
          <label for="name">Name:</label>
          <input id="name" v-model="name" type="text" required />
        </div>
        <div class="form-group">
          <label for="price">Price:</label>
          <input id="price" v-model="price" type="number" step="0.01" required />
        </div>
        <div class="form-actions">
          <button type="submit" :disabled="isUpdating" class="submit-btn">
            {{ isUpdating ? 'Updating...' : 'Update' }}
          </button>
          <button @click="handleDelete" :disabled="isDeleting" class="delete-btn" type="button">
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductsStore } from '@/stores/products'

const route = useRoute()
const router = useRouter()
const productsStore = useProductsStore()

const item = ref(null)
const name = ref('')
const price = ref(0)
const isLoading = ref(false)
const isUpdating = ref(false)
const isDeleting = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  isLoading.value = true
  errorMessage.value = ''
  try {
    const fetchedItem = await productsStore.fetchItem(route.params.id)
    item.value = fetchedItem
    name.value = fetchedItem.name
    price.value = fetchedItem.price
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
  }
})

async function handleUpdate() {
  isUpdating.value = true
  errorMessage.value = ''
  try {
    await productsStore.updateItem(route.params.id, {
      name: name.value,
      price: price.value,
    })
    router.push('/items')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isUpdating.value = false
  }
}

async function handleDelete() {
  if (confirm('Are you sure you want to delete this item?')) {
    isDeleting.value = true
    errorMessage.value = ''
    try {
      await productsStore.deleteItem(route.params.id)
      router.push('/items')
    } catch (error) {
      errorMessage.value = error.message
    } finally {
      isDeleting.value = false
    }
  }
}
</script>

<style scoped>
.register-container {
  max-width: 700px;
  margin: 2rem auto;
  padding: 2rem;
}
h1 {
  color: #42b983;
  margin-bottom: 2rem;
  text-align: center;
}
.register-form {
  background: #f9f9f9;
  padding: 2rem;
  border-radius: 8px;
}
.form-group {
  margin-bottom: 1.5rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #333;
}
input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}
input:focus {
  outline: none;
  border-color: #42b983;
}
.error-message {
  background: #ffe6e6;
  color: #c0392b;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border-left: 4px solid #e74c3c;
}
.form-actions {
  display: flex;
  gap: 1rem;
}
.submit-btn, .delete-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
}
.submit-btn {
  background: #42b983;
  color: white;
}
.submit-btn:hover:not(:disabled) {
  background: #359268;
}
.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.delete-btn {
  background: #e74c3c;
  color: white;
}
.delete-btn:hover:not(:disabled) {
  background: #c82333;
}
.delete-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
