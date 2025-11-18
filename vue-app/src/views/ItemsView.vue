<script setup>
import { onMounted, onUnmounted, ref } from 'vue'                                               
import { useProductsStore } from '@/stores/products'                                            
import { useAuthStore } from '@/stores/auth'                                                    
import { RouterLink } from 'vue-router' 
import { storeToRefs } from 'pinia';
                                                                                                                                    
const productsStore = useProductsStore()
const { isLoading, error: errorMessage } = storeToRefs(productsStore);                                                       
const authStore = useAuthStore()                                                                                                                                  
                                                                                                 
onMounted(() => {                                                                               
  productsStore.subscribeToItems();                                                             
});                                                                                             
                                                                                                
onUnmounted(() => {                                                                             
  productsStore.unsubscribe();                                                                  
});    

</script>

<template>
  <div class="container">
    <h1>Items</h1>
    <div v-if="isLoading">Loading...</div>
    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <div v-if="productsStore.items.length > 0" class="items-list">
      <div class="item-header">
        <div class="item-name">Name</div>
        <div class="item-price">Price</div>
        <div class="item-action">Action</div>
      </div>
      <div v-for="item in productsStore.items" :key="item.id" class="item">
        <div class="item-name">
          <strong>{{ item.name }}</strong>
        </div>
        <div class="item-price">${{ Number(item.price).toFixed(2) }}</div>
        <div class="item-action">
          <RouterLink :to="{ name: 'item-detail', params: { id: item.id } }">View</RouterLink>
        </div>
      </div>
    </div>
    <div v-else>
      <p>No items found.</p>
    </div>
    <RouterLink v-if="authStore.isAuthenticated" to="/items/create" class="create-btn">Create Item</RouterLink>
  </div>
</template>

<style scoped>
.container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 2rem;
}
.items-list {
  margin-top: 2rem;
}
.item-header, .item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}
.item-header {
  font-weight: bold;
  border-bottom-width: 2px;
}
.item-name {
  flex: 3;
}
.item-price {
  flex: 1;
  text-align: right;
}
.item-action {
  flex: 1;
  text-align: right;
}
.create-btn {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
}
</style>

