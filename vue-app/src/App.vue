<script setup>
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <nav>
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
        <RouterLink to="/register">Register</RouterLink>
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
</style>
