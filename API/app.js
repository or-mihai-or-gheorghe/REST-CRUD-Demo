const express = require('express');
const cors = require('cors');
const db = require('./db');
const { hashPassword, comparePassword, generateToken, verifyToken } = require('./auth');

const app = express();
const PORT = 5000;

// Middleware: Log all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Middleware: Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

/**
 * Middleware: Validate JWT token
 * Checks for valid JWT token in Authorization header
 * Adds decoded user info to req.user if valid
 */
function validateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            error: "No token found"
        });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({
            error: 'Invalid or expired token'
        });
    }

    req.user = decoded;
    next();
}

// Firestore collections
const itemsCollection = db.collection('items');
const usersCollection = db.collection('users');

// ==================== Authentication Endpoints ====================

/**
 * POST /register
 * Register a new user account
 * Body: { email, password }
 * Returns: { message, token, user }
 */
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
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

        // Validate password strength
        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters long'
            });
        }

        // Check if user already exists
        const existingUsers = await usersCollection
            .where('email', '==', email)
            .get();

        if (!existingUsers.empty) {
            return res.status(409).json({
                error: 'User with this email already exists'
            });
        }

        // Hash password and create user
        const hashedPassword = await hashPassword(password);
        const newUser = {
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        const docRef = await usersCollection.add(newUser);

        // Generate JWT token for automatic login
        const token = generateToken({
            id: docRef.id,
            email: email
        });

        res.status(201).json({
            message: 'User registered successfully',
            token,
            user: {
                id: docRef.id,
                email: email
            }
        });
    } catch(error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

/**
 * POST /login
 * Authenticate user and return JWT token
 * Body: { email, password }
 * Returns: { message, token, user }
 */
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        // Find user by email
        const snapshot = await usersCollection
            .where('email', '==', email)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        const userDoc = snapshot.docs[0];
        const user = {
            id: userDoc.id,
            ...userDoc.data()
        };

        // Verify password
        const passIsValid = await comparePassword(password, user.password);
        if (!passIsValid) {
            return res.status(401).json({
                error: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const token = generateToken({
            id: user.id,
            email: user.email
        });

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });

    } catch(error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// ==================== Item CRUD Endpoints ====================

/**
 * GET /items
 * Get all items (public endpoint)
 * Returns: Array of items
 */
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
    } catch(error) {
        console.error('Error fetching items:', error);
        res.status(500).json({ error: 'Failed to get items' });
    }
});

/**
 * GET /items/:id
 * Get single item by ID (public endpoint)
 * Returns: Item object
 */
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
    } catch(error) {
        console.error('Error fetching item:', error);
        res.status(500).json({ error: 'Failed to fetch item' });
    }
});

/**
 * POST /items
 * Create new item (protected - requires authentication)
 * Body: { name, price }
 * Returns: { id }
 */
app.post('/items', validateToken, async (req, res) => {
    try {
        const { name, price } = req.body;

        // Validate required fields
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const newProduct = {
            name: name,
            price: parseFloat(price)
        };

        const docRef = await itemsCollection.add(newProduct);

        res.status(201).json({ id: docRef.id });
    } catch(error) {
        console.error('Error adding item:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

/**
 * PUT /items/:id
 * Update existing item (protected - requires authentication)
 * Body: { name?, price? }
 * Returns: Updated item object
 */
app.put('/items/:id', validateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const { name, price } = req.body;

        const docRef = itemsCollection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (price !== undefined) updateData.price = parseFloat(price);

        await docRef.update(updateData);

        // Return updated document
        const updatedDoc = await docRef.get();
        res.status(200).json({
            id: updatedDoc.id,
            ...updatedDoc.data()
        });
    } catch(error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

/**
 * DELETE /items/:id
 * Delete item (protected - requires authentication)
 * Returns: { message }
 */
app.delete('/items/:id', validateToken, async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = itemsCollection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Item not found' });
        }

        await docRef.delete();

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch(error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
