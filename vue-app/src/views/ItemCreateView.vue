<template>
  <div class="register-container">
    <h1>Create Item</h1>
    <form @submit.prevent="handleSubmit" class="register-form">
      <div class="form-group">
        <label for="name">Name:</label>
        <input id="name" v-model="name" type="text" required />
      </div>
      <div class="form-group">
        <label for="price">Price:</label>
        <input id="price" v-model="price" type="number" step="0.01" required />
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <button type="submit" :disabled="isLoading" class="submit-btn">
        {{ isLoading ? 'Creating...' : 'Create' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useProductsStore } from '@/stores/products'

const router = useRouter()
const productsStore = useProductsStore()

const name = ref('')
const price = ref(0)
const isLoading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    await productsStore.createItem({
      name: name.value,
      price: price.value,
    })
    router.push('/items')
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    isLoading.value = false
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
.submit-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
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
</style>
