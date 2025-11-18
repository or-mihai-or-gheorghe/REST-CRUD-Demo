import { ref } from 'vue'
import { defineStore } from 'pinia'
import { API_BASE_URL } from '@/utils/constants'
import { useAuthStore } from './auth'
import { db } from '@/firebase.js'
import { collection, onSnapshot } from 'firebase/firestore'

export const useProductsStore = defineStore('products', () => {
  const items = ref([])
  const isLoading = ref(false)
  const error = ref(null)

    // This will hold the unsubscribe function for the real-time listener
  let unsubscribeFromItems = null;

  // Action to subscribe to real-time updates
  function subscribeToItems() {
    if (unsubscribeFromItems) {
      // Already subscribed
      return;
    }

    isLoading.value = true;
    error.value = null;

    const itemsCollection = collection(db, 'items');

    unsubscribeFromItems = onSnapshot(itemsCollection, (snapshot) => {
      items.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      isLoading.value = false;
    }, (err) => {
      error.value = err.message;
      console.error("Error fetching items:", err);
      isLoading.value = false;
    });
  }

  // Action to unsubscribe from real-time updates
  function unsubscribe() {
    if (unsubscribeFromItems) {
      unsubscribeFromItems();
      unsubscribeFromItems = null;
    }
  }

  async function fetchItems() {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/items`)
      if (!response.ok) throw new Error('Failed to fetch items.')
      items.value = await response.json()
    } catch (e) {
      error.value = e.message
      items.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function fetchItem(id) {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/items/${id}`)
      if (!response.ok) throw new Error('Failed to fetch item.')
      return await response.json()
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  async function createItem(item) {
    const authStore = useAuthStore()
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(item),
      })
      if (!response.ok) throw new Error('Failed to create item.')
      await fetchItems() // Refresh the list
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  async function updateItem(id, item) {
    const authStore = useAuthStore()
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`,
        },
        body: JSON.stringify(item),
      })
      if (!response.ok) throw new Error('Failed to update item.')
      await fetchItems() // Refresh the list
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  async function deleteItem(id) {
    const authStore = useAuthStore()
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE_URL}/items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authStore.token}`,
        },
      })
      if (!response.ok) throw new Error('Failed to delete item.')
      await fetchItems() // Refresh the list
    } catch (e) {
      error.value = e.message
    } finally {
      isLoading.value = false
    }
  }

  return {
    items,
    isLoading,
    error,
    fetchItems,
    subscribeToItems,
    unsubscribe,
    fetchItem,
    createItem,
    updateItem,
    deleteItem,
  }
})
