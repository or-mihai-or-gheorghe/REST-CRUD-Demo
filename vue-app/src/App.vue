<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

function handleLogout() {
  authStore.logout()
  router.push('/')
}
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/items">Items</RouterLink>
        <template v-if="!authStore.isAuthenticated">
          <RouterLink to="/register">Register</RouterLink>
          <RouterLink to="/login">Login</RouterLink>
        </template>
        <template v-else>
          <span>{{ authStore.userEmail }}</span>
          <button @click="handleLogout">Logout</button>
        </template>
      </nav>
    </div>
  </header>

  <RouterView />
</template>

<style scoped>
header {
  line-height: 1.5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-background);
}

.logo {
  height: 50px;
  width: 50px;
}

.wrapper {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

nav {
  display: flex;
  gap: 2rem;
  font-size: 1rem;
  align-items: center;
}

nav a {
  text-decoration: none;
  color: var(--color-text);
  font-weight: 500;
  transition: color 0.3s;
}

nav a:hover {
  color: var(--color-heading);
}

nav a.router-link-exact-active {
  color: #42b983;
  font-weight: 600;
}

button {
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}
</style>
