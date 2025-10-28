# JWT Authentication Guide for REST API

A step-by-step guide to add user authentication with JWT tokens and bcrypt password hashing to your REST API.

## Prerequisites

**⚠️ IMPORTANT:** This guide assumes you have already:
- Completed the Firestore integration from `README.md`
- Set up the `db.js` module that exports the Firestore database instance
- Configured Firestore security rules

If you haven't done this yet, complete the Firestore setup in `README.md` first.

## Overview

This guide adds:
- User registration with password hashing (bcrypt)
- User login with JWT token generation
- Authentication middleware to protect routes
- Proper HTTP status codes for all scenarios
- User storage in Firestore `users` collection
- JWT tokens stored in localStorage on frontend

**What you'll build:**
1. `/auth/register` - Create new user accounts
2. `/auth/login` - Authenticate users and return JWT tokens
3. `authenticateToken` middleware - Protect routes that modify data
4. Protected endpoints - POST, PUT, DELETE operations require authentication
5. Public endpoints - GET operations remain accessible to everyone

---

## Step 1: Install Authentication Dependencies

Navigate to your `API/` directory and install required packages:

```bash
cd API
npm install bcryptjs jsonwebtoken
```

Your `package.json` should now include:

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "nodemon": "^3.1.10",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  }
}
```

---

## Step 2: Create Authentication Configuration

Create a new file `API/config.js` to store your JWT secret:

```javascript
// API/config.js

// JWT Secret - In production, use environment variables!
// Generate a secure secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
const JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';

// JWT expiration time
const JWT_EXPIRES_IN = '24h'; // Token valid for 24 hours

module.exports = {
    JWT_SECRET,
    JWT_EXPIRES_IN
};
```

**⚠️ IMPORTANT:** In production, store `JWT_SECRET` in environment variables, never hardcode it!

---

## Step 3: Create Authentication Module

Create a new file `API/auth.js` with helper functions:

```javascript
// API/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('./config');

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password with hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} True if passwords match
 */
async function comparePassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT token for a user
 * @param {object} user - User object with id and email
 * @returns {string} JWT token
 */
function generateToken(user) {
    const payload = {
        userId: user.id,
        email: user.email
    };

    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {object|null} Decoded token payload or null if invalid
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

module.exports = {
    hashPassword,
    comparePassword,
    generateToken,
    verifyToken
};
```

---

## Step 4: Add User Registration Endpoint

Add this endpoint to your `API/app.js`.

First, set up the collections at the top of your file:

```javascript
const { hashPassword, comparePassword, generateToken } = require('./auth');
const db = require('./db'); // Import Firestore database (already set up from README.md)

// Get collection references
const itemsCollection = db.collection('items'); // Already set up from README.md
const usersCollection = db.collection('users'); // New collection for authentication
```

Now add the registration endpoint:

```javascript
// REGISTER - Create new user account
app.post('/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: 'Invalid email format'
            });
        }

        // Validate password strength (minimum 6 characters)
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists in Firestore
        const existingUsers = await usersCollection
            .where('email', '==', email)
            .get();

        if (!existingUsers.empty) {
            return res.status(409).json({
                error: 'User with this email already exists'
            });
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Create new user in Firestore
        const newUser = {
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        const docRef = await usersCollection.add(newUser);

        // Generate JWT token
        const token = generateToken({ id: docRef.id, email });

        // Return user data (without password) and token
        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: docRef.id,
                email
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
```

**HTTP Status Codes Used:**
- `201 Created` - User successfully registered
- `400 Bad Request` - Invalid input (missing fields, invalid format, weak password)
- `409 Conflict` - User already exists
- `500 Internal Server Error` - Server-side error

---

## Step 5: Add User Login Endpoint

Add this endpoint to your `API/app.js`:

```javascript
// LOGIN - Authenticate user and return JWT token
app.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Find user by email in Firestore
        const snapshot = await usersCollection
            .where('email', '==', email)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Get the first (and should be only) user document
        const userDoc = snapshot.docs[0];
        const user = {
            id: userDoc.id,
            ...userDoc.data()
        };

        // Verify password
        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = generateToken({ id: user.id, email: user.email });

        // Return token and user data (without password)
        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
```

**HTTP Status Codes Used:**
- `200 OK` - Login successful
- `400 Bad Request` - Missing email or password
- `401 Unauthorized` - Invalid credentials
- `500 Internal Server Error` - Server-side error

**Security Note:** Always return generic error messages like "Invalid email or password" to prevent user enumeration attacks.

---

## Step 6: Create Authentication Middleware

Add this middleware to your `API/app.js` (before route definitions):

```javascript
const { verifyToken } = require('./auth');

// Authentication middleware - Verify JWT token
function authenticateToken(req, res, next) {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    // Check if token exists
    if (!token) {
        return res.status(401).json({
            error: 'Access denied. No token provided.'
        });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({
            error: 'Invalid or expired token'
        });
    }

    // Attach user info to request object
    req.user = decoded;

    // Continue to next middleware/route handler
    next();
}
```

**HTTP Status Codes Used:**
- `401 Unauthorized` - No token provided (user not authenticated)
- `403 Forbidden` - Invalid/expired token (user authenticated but token invalid)

**Difference between 401 and 403:**
- `401` = "Who are you?" (authentication required)
- `403` = "I know who you are, but you can't do that" (authorization failed)

---

## Step 7: Working with Users Collection in Firestore

### Common User Operations

Here are the most common ways to work with the users collection:

```javascript
// GET ALL USERS - Iterate through all users
app.get('/users', async (req, res) => {
    try {
        const snapshot = await usersCollection.get();

        const users = [];
        // Iterate through each document in the collection
        snapshot.forEach(doc => {
            const userData = doc.data();
            // IMPORTANT: Don't send password to client!
            users.push({
                id: doc.id,
                email: userData.email,
                createdAt: userData.createdAt
            });
        });

        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// FIND USER BY EMAIL
async function findUserByEmail(email) {
    const snapshot = await usersCollection
        .where('email', '==', email)
        .get();

    if (snapshot.empty) {
        return null; // User not found
    }

    // Get the first (and should be only) matching document
    const userDoc = snapshot.docs[0];
    return {
        id: userDoc.id,
        ...userDoc.data()
    };
}

// FIND USER BY ID
async function findUserById(userId) {
    const doc = await usersCollection.doc(userId).get();

    if (!doc.exists) {
        return null; // User not found
    }

    return {
        id: doc.id,
        ...doc.data()
    };
}

// CHECK IF USER EXISTS
async function userExists(email) {
    const snapshot = await usersCollection
        .where('email', '==', email)
        .get();

    return !snapshot.empty;
}

// COUNT TOTAL USERS
async function countUsers() {
    const snapshot = await usersCollection.get();
    return snapshot.size;
}
```

**⚠️ IMPORTANT:** Never return password hashes to the client, even if they're hashed!

---

## Step 8: Protect Data-Changing Endpoints

Update your existing CRUD endpoints to require authentication. Add the `authenticateToken` middleware to POST, PUT, and DELETE routes.

**Note:** The `itemsCollection` should already be set up from the Firestore integration in `README.md`:
```javascript
const itemsCollection = db.collection('items');
```

### Update Your Existing Endpoints:

```javascript
// PUBLIC ROUTE - No authentication required
// READ - Get all items (already implemented from README.md)
app.get('/items', async (req, res) => {
    try {
        const snapshot = await itemsCollection.get();

        const items = [];
        snapshot.forEach(doc => {
            items.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json(items);
    } catch (error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to fetch items' });
    }
});

// PUBLIC ROUTE - No authentication required
// READ - Get single item by ID (already implemented from README.md)
app.get('/items/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const doc = await itemsCollection.doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.status(200).json({
            id: doc.id,
            ...doc.data()
        });
    } catch (error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

// PROTECTED ROUTE - Authentication required
// CREATE - Add new item (ADD authenticateToken middleware)
app.post('/items', authenticateToken, async (req, res) => {
    try {
        const { name, price } = req.body;

        // Validate input
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        // Create new item with user info from JWT
        const newItem = {
            name,
            price: parseFloat(price),
            createdBy: req.user.userId, // From JWT token
            createdAt: new Date().toISOString()
        };

        // Add to Firestore
        const docRef = await itemsCollection.add(newItem);

        res.status(201).json({
            message: 'Item created successfully',
            id: docRef.id
        });
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// PROTECTED ROUTE - Authentication required
// UPDATE - Update existing item (ADD authenticateToken middleware)
app.put('/items/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const { name, price } = req.body;

        const docRef = itemsCollection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Build update object
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);
        updateData.updatedBy = req.user.userId; // From JWT token
        updateData.updatedAt = new Date().toISOString();

        // Update in Firestore
        await docRef.update(updateData);

        // Fetch and return updated document
        const updatedDoc = await docRef.get();
        res.status(200).json({
            message: 'Item updated successfully',
            item: {
                id: updatedDoc.id,
                ...updatedDoc.data()
            }
        });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// PROTECTED ROUTE - Authentication required
// DELETE - Remove item (ADD authenticateToken middleware)
app.delete('/items/:id', authenticateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = itemsCollection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Delete from Firestore
        await docRef.delete();

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});
```

**Route Protection Summary:**
- `GET /items` - ✅ Public (no auth)
- `GET /items/:id` - ✅ Public (no auth)
- `POST /items` - 🔒 Protected (requires auth)
- `PUT /items/:id` - 🔒 Protected (requires auth)
- `DELETE /items/:id` - 🔒 Protected (requires auth)

---

## Step 9: Test Authentication Flow

### 9.1 Test User Registration

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Expected Response (201):**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "user@example.com"
  }
}
```

### 9.2 Test User Login

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Expected Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "email": "user@example.com"
  }
}
```

### 9.3 Test Protected Route (Without Token)

```bash
curl -X POST http://localhost:5000/items \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Laptop",
    "price": 1500
  }'
```

**Expected Response (401):**
```json
{
  "error": "Access denied. No token provided."
}
```

### 9.4 Test Protected Route (With Token)

```bash
# Replace YOUR_TOKEN_HERE with actual token from login/register
curl -X POST http://localhost:5000/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "name": "New Laptop",
    "price": 1500
  }'
```

**Expected Response (201):**
```json
{
  "message": "Item created successfully",
  "id": "4"
}
```

---

## Complete HTTP Status Code Reference

### Authentication Endpoints

| Endpoint | Success | Error Scenarios |
|----------|---------|-----------------|
| `POST /auth/register` | `201 Created` | `400` Missing fields<br>`400` Invalid email<br>`400` Weak password<br>`409` User exists<br>`500` Server error |
| `POST /auth/login` | `200 OK` | `400` Missing fields<br>`401` Invalid credentials<br>`500` Server error |

### Protected Item Endpoints

| Endpoint | Success | Error Scenarios |
|----------|---------|-----------------|
| `GET /items` | `200 OK` | `500` Server error |
| `GET /items/:id` | `200 OK` | `404` Not found<br>`500` Server error |
| `POST /items` | `201 Created` | `401` No token<br>`403` Invalid token<br>`400` Invalid input<br>`500` Server error |
| `PUT /items/:id` | `200 OK` | `401` No token<br>`403` Invalid token<br>`404` Not found<br>`500` Server error |
| `DELETE /items/:id` | `200 OK` | `401` No token<br>`403` Invalid token<br>`404` Not found<br>`500` Server error |

---

## Update Frontend to Handle Authentication

Update your `CLIENT/js/main.js` to include authentication:

```javascript
// Store token in localStorage
let authToken = localStorage.getItem('authToken');

// Login function
async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token
            authToken = data.token;
            localStorage.setItem('authToken', authToken);

            alert('Login successful!');
            // Show/hide UI elements based on auth state
            updateUIForAuth();
        } else {
            alert(`Login failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Login failed. Please try again.');
    }
}

// Register function
async function register() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token
            authToken = data.token;
            localStorage.setItem('authToken', authToken);

            alert('Registration successful!');
            updateUIForAuth();
        } else {
            alert(`Registration failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Registration failed. Please try again.');
    }
}

// Logout function
function logout() {
    authToken = null;
    localStorage.removeItem('authToken');
    alert('Logged out successfully');
    updateUIForAuth();
}

// Update existing addProduct function to include token
async function addProduct() {
    const name = document.getElementById('itemName').value;
    const price = document.getElementById('itemPrice').value;

    if (!authToken) {
        alert('Please login first!');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}` // Add token to request
            },
            body: JSON.stringify({ name, price: parseFloat(price) })
        });

        if (response.ok) {
            alert('Product added successfully!');
            document.getElementById('itemName').value = '';
            document.getElementById('itemPrice').value = '';
            getItems(); // Refresh the list
        } else {
            const data = await response.json();
            if (response.status === 401 || response.status === 403) {
                alert('Session expired. Please login again.');
                logout();
            } else {
                alert(`Error: ${data.error}`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add product');
    }
}

// Update updateProduct and deleteProduct similarly...
async function updateProduct(id) {
    if (!authToken) {
        alert('Please login first!');
        return;
    }

    const name = prompt('Enter new name:');
    const price = prompt('Enter new price:');

    if (name && price) {
        try {
            const response = await fetch(`${BASE_URL}/items/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}` // Add token
                },
                body: JSON.stringify({ name, price: parseFloat(price) })
            });

            if (response.ok) {
                alert('Product updated successfully!');
                getItems();
            } else {
                const data = await response.json();
                if (response.status === 401 || response.status === 403) {
                    alert('Session expired. Please login again.');
                    logout();
                } else {
                    alert(`Error: ${data.error}`);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to update product');
        }
    }
}

async function deleteProduct(id) {
    if (!authToken) {
        alert('Please login first!');
        return;
    }

    if (confirm('Are you sure you want to delete this product?')) {
        try {
            const response = await fetch(`${BASE_URL}/items/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}` // Add token
                }
            });

            if (response.ok) {
                alert('Product deleted successfully!');
                getItems();
            } else {
                const data = await response.json();
                if (response.status === 401 || response.status === 403) {
                    alert('Session expired. Please login again.');
                    logout();
                } else {
                    alert(`Error: ${data.error}`);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to delete product');
        }
    }
}

// Helper function to update UI based on auth state
function updateUIForAuth() {
    if (authToken) {
        // User is logged in - show/hide appropriate elements
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('mainSection').style.display = 'block';
    } else {
        // User is logged out
        document.getElementById('authSection').style.display = 'block';
        document.getElementById('mainSection').style.display = 'none';
    }
}

// Check auth state on page load
window.addEventListener('DOMContentLoaded', () => {
    updateUIForAuth();
    if (authToken) {
        getItems();
    }
});
```

---

## Security Best Practices

### ✅ DO:
- Use HTTPS in production
- Store JWT secret in environment variables
- Set appropriate token expiration times
- Hash passwords with bcrypt (never store plain text)
- Validate all user input
- Use proper HTTP status codes
- Return generic error messages for authentication failures
- Implement rate limiting on auth endpoints
- Log authentication attempts

### ❌ DON'T:
- Hardcode secrets in production
- Store passwords in plain text
- Return detailed error messages that help attackers
- Use weak passwords (enforce minimum length and complexity)
- Store sensitive data in JWT payload (it's not encrypted!)
- Use the same secret across multiple applications

---

## Testing Checklist

- [ ] Register new user with valid data (expect 201)
- [ ] Register user with existing email (expect 409)
- [ ] Register user with invalid email (expect 400)
- [ ] Register user with short password (expect 400)
- [ ] Login with valid credentials (expect 200)
- [ ] Login with invalid email (expect 401)
- [ ] Login with invalid password (expect 401)
- [ ] Access protected route without token (expect 401)
- [ ] Access protected route with invalid token (expect 403)
- [ ] Access protected route with valid token (expect success)
- [ ] Create item with valid token (expect 201)
- [ ] Update item with valid token (expect 200)
- [ ] Delete item with valid token (expect 200)
- [ ] Verify token expiration after 24 hours

---

## Additional Resources

- [JWT.io](https://jwt.io/) - Decode and verify JWT tokens
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js) - Password hashing documentation
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

## Summary

You now have a complete authentication system with:
- ✅ User registration with password hashing
- ✅ User login with JWT token generation
- ✅ Authentication middleware
- ✅ Protected data-changing endpoints (POST, PUT, DELETE)
- ✅ Proper HTTP status codes for all scenarios
- ✅ Frontend integration example

This is a basic implementation suitable for learning. For production, consider adding:
- Email verification
- Password reset functionality
- Refresh tokens
- Rate limiting
- Account lockout after failed attempts
- Multi-factor authentication (MFA)
