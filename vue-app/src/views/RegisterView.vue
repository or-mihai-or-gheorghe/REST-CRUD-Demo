<template>
  <div class="register-container">
    <h1>User Registration</h1>

    <!-- Show registration form if not authenticated -->
    <div v-if="!authStore.isAuthenticated" class="form-section">
      <form @submit.prevent="handleSubmit" class="register-form">
        <!-- Email Input -->
        <div class="form-group">
          <label for="email">Email (must be @ase.ro):</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="student@ase.ro"
            @blur="validateEmail"
            required
          />
          <span v-if="email && !isEmailValid" class="error">
            Email must end with @ase.ro
          </span>
          <span v-if="email && isEmailValid" class="success">✓ Valid email</span>
        </div>

        <!-- Password Input -->
        <div class="form-group">
          <label for="password">Password (min 8 characters):</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="Enter password"
            required
          />
          <!-- Example of COMPUTED property usage: passwordStrength -->
          <div v-if="password" class="password-strength">
            Strength: <span :class="passwordStrength">{{ passwordStrength }}</span>
          </div>
        </div>

        <!-- Confirm Password Input -->
        <div class="form-group">
          <label for="confirmPassword">Confirm Password:</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            placeholder="Confirm password"
            required
          />
          <!-- Example of COMPUTED property usage: passwordsMatch -->
          <span v-if="confirmPassword && !passwordsMatch" class="error">
            Passwords do not match
          </span>
          <span v-if="confirmPassword && passwordsMatch" class="success">
            ✓ Passwords match
          </span>
        </div>

        <!-- Error Display -->
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <!-- Submit Button -->
        <!-- Example of COMPUTED property usage: formIsValid -->
        <button type="submit" :disabled="!formIsValid || isLoading" class="submit-btn">
          {{ isLoading ? 'Registering...' : 'Register' }}
        </button>

        <!-- Example of METHOD usage: resetForm -->
        <button type="button" @click="resetForm" class="reset-btn">Clear Form</button>
      </form>

      <!-- Teaching Section: Show what's happening -->
      <div class="teaching-section">
        <div class="example-box">
          <h4>Computed Properties in Action:</h4>
          <ul>
            <li>
              <strong>isEmailValid:</strong> {{ isEmailValid }}
              <em>(checks if email ends with @ase.ro)</em>
            </li>
            <li>
              <strong>passwordStrength:</strong> "{{ passwordStrength }}"
              <em>(weak/medium/strong based on length)</em>
            </li>
            <li>
              <strong>passwordsMatch:</strong> {{ passwordsMatch }}
              <em>(compares password fields)</em>
            </li>
            <li>
              <strong>formIsValid:</strong> {{ formIsValid }}
              <em>(all validations passed)</em>
            </li>
          </ul>
        </div>
        <div class="example-box">
          <h4>Methods Available:</h4>
          <ul>
            <li><strong>handleSubmit()</strong> - Submits form and calls store</li>
            <li><strong>resetForm()</strong> - Clears all input fields</li>
            <li><strong>validateEmail()</strong> - Validates email format</li>
          </ul>
        </div>
        <div class="example-box">
          <h4>Store (Pinia) Connection:</h4>
          <ul>
            <li><strong>State:</strong> user, token</li>
            <li><strong>Action used:</strong> authStore.register()</li>
            <li><strong>Getter used:</strong> authStore.isAuthenticated</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Show user info after successful registration -->
    <div v-else class="success-section">
      <h2>✓ Registration Successful!</h2>
      <div class="user-info">
        <p><strong>User ID:</strong> {{ authStore.user.id }}</p>
        <p><strong>Email:</strong> {{ authStore.userEmail }}</p>
        <p><strong>Token:</strong> {{ authStore.token.substring(0, 20) }}...</p>
        <p><strong>Authenticated:</strong> {{ authStore.isAuthenticated }}</p>
      </div>
      <!-- Example of METHOD usage: logout -->
      <button @click="handleLogout" class="logout-btn">Logout</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

// ==================== STATE (Reactive Data) ====================
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

// ==================== COMPUTED PROPERTIES ====================
// Computed properties are cached and only re-evaluate when dependencies change

/**
 * COMPUTED EXAMPLE 1: Email Validation
 * Checks if email ends with @ase.ro (required by API)
 */
const isEmailValid = computed(() => {
  if (!email.value) return false
  return email.value.endsWith('@ase.ro')
})

/**
 * COMPUTED EXAMPLE 2: Password Strength
 * Returns 'weak', 'medium', or 'strong' based on password length
 */
const passwordStrength = computed(() => {
  const length = password.value.length
  if (length === 0) return ''
  if (length < 8) return 'weak'
  if (length < 12) return 'medium'
  return 'strong'
})

/**
 * COMPUTED EXAMPLE 3: Password Match Check
 * Compares password and confirmPassword fields
 */
const passwordsMatch = computed(() => {
  if (!confirmPassword.value) return false
  return password.value === confirmPassword.value
})

/**
 * COMPUTED EXAMPLE 4: Overall Form Validation
 * Combines all validation checks to enable/disable submit button
 */
const formIsValid = computed(() => {
  return (
    isEmailValid.value &&
    password.value.length >= 8 &&
    passwordsMatch.value &&
    !isLoading.value
  )
})

// ==================== METHODS ====================
// Methods are functions that handle user interactions and logic

/**
 * METHOD EXAMPLE 1: Form Submission
 * Handles the registration process using the auth store
 */
async function handleSubmit() {
  // Clear any previous errors
  errorMessage.value = ''
  isLoading.value = true

  try {
    // Call the store action to register the user
    await authStore.register(email.value, password.value)

    // Success - the store will update and UI will react
    console.log('Registration successful!')
  } catch (error) {
    // Handle errors from the API
    if (error.message.includes('array')) {
      // Validation errors from express-validator
      errorMessage.value = 'Please check your input and try again.'
    } else {
      errorMessage.value = error.message
    }
  } finally {
    isLoading.value = false
  }
}

/**
 * METHOD EXAMPLE 2: Reset Form
 * Clears all input fields and error messages
 */
function resetForm() {
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  errorMessage.value = ''
}

/**
 * METHOD EXAMPLE 3: Email Validation
 * Called when user leaves the email field (blur event)
 */
function validateEmail() {
  if (email.value && !isEmailValid.value) {
    errorMessage.value = 'Email must end with @ase.ro'
  } else {
    errorMessage.value = ''
  }
}

/**
 * METHOD EXAMPLE 4: Logout
 * Calls the store logout action
 */
function handleLogout() {
  authStore.logout()
  resetForm()
}
</script>

<style scoped>
.register-container {
  max-width: 1400px;
  margin: 2rem auto;
  padding: 2rem;
}

h1 {
  color: #42b983;
  margin-bottom: 2rem;
  text-align: center;
}

.form-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
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

.password-strength {
  margin-top: 0.5rem;
  font-size: 0.9rem;
}

.password-strength .weak {
  color: #e74c3c;
  font-weight: bold;
}

.password-strength .medium {
  color: #f39c12;
  font-weight: bold;
}

.password-strength .strong {
  color: #27ae60;
  font-weight: bold;
}

.error {
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 0.25rem;
  display: block;
}

.success {
  color: #27ae60;
  font-size: 0.9rem;
  margin-top: 0.25rem;
  display: block;
}

.error-message {
  background: #ffe6e6;
  color: #c0392b;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  border-left: 4px solid #e74c3c;
}

.submit-btn,
.reset-btn,
.logout-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
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

.reset-btn {
  background: #95a5a6;
  color: white;
}

.reset-btn:hover {
  background: #7f8c8d;
}

.teaching-section {
  background: #e8f5e9;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid #42b983;
}

.teaching-section h3 {
  margin-top: 0;
  color: #2c3e50;
}

.example-box {
  background: white;
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.example-box h4 {
  margin-top: 0;
  color: #42b983;
  font-size: 1rem;
}

.example-box ul {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
}

.example-box li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

.example-box em {
  color: #7f8c8d;
  font-size: 0.85rem;
}

.success-section {
  background: #d4edda;
  padding: 2rem;
  border-radius: 8px;
  border: 2px solid #28a745;
  text-align: center;
}

.success-section h2 {
  color: #155724;
  margin-top: 0;
}

.user-info {
  background: white;
  padding: 1.5rem;
  border-radius: 4px;
  margin: 1.5rem 0;
  text-align: left;
}

.user-info p {
  margin: 0.5rem 0;
  font-family: monospace;
}

.logout-btn {
  background: #dc3545;
  color: white;
}

.logout-btn:hover {
  background: #c82333;
}

@media (max-width: 1024px) {
  .form-section {
    grid-template-columns: 1fr;
  }
}
</style>
