const express = require('express');
const cors = require('cors');
const db = require('./db')
const { hashPassword, comparePassword, generateToken, verifyToken } = require('./auth')

const app = express()
const PORT = 5000

// Logging middleware - logs all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
    next()
})

function validateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader.split(' ')[1]

    if (!token) {
        res.status(401).json({
            error: "No token found"
        })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
        return res.status(403).json({
            error: 'Invalid or expired token'
        })
    }

    req.user = decoded
    next()
}

const itemsCollection = db.collection('items')
const usersCollection = db.collection('users')

// Enable CORS and JSON parsing
app.use(cors())
app.use(express.json())

// REGISTER
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body

        // TO DO: check if user exists
    
        const hashedPassword = await hashPassword(password)
    
        const newUser = {
            email,
            password: hashedPassword
        }
    
        const docRef = await usersCollection.add(newUser)
    
        res.status(200).json(
            {
                userId: docRef.id 
            }
        )
    } catch(error) {
        console.log("ERROR: ", error)
        res.status(500).json({ error: "Registration failed"})
    }

})

// LOGIN
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body

        const snapshot = await usersCollection
            .where('email', '==', email)
            .get()

        if (snapshot.empty) {
            return res.status(401).json({
                error: 'User not found'
            })
        }

        const userDoc = snapshot.docs[0]
        const user = {
            id: userDoc.id,
            ...userDoc.data()
        }

        const passIsValid = await comparePassword(password, user.password)

        if (!passIsValid) {
            return res.status(401).json({
                error: "Invalid password"
            })
        }

        const token = generateToken({
            id: user.id,
            email: user.email
        })

        res.status(200).json({
            token
        })

    } catch(error) {
        console.log('ERROR: ', error)
        res.status(500).json({ error: "Authentication failed"})
    }
})

// READ - Get all items
app.get('/items', async (req, res) => {
    try {
        const snapshot = await itemsCollection.get()
    
    const items = []

    snapshot.forEach(doc => {
        items.push(
            {
                id: doc.id,
                ...doc.data()
            }
        )

    res.status(200).json(items)
    })

    } catch(error){
        console.log('ERROR: ', error)
        res.status(500).json({error: "Failed to get items"})
    }
})

// READ - Get single item by ID
app.get('/items/:id', (req, res) => {
    const id = parseInt(req.params.id)
    const item = items.find(item => item.id === id)

    if (!item) {
        return res.status(404).json({ error: 'Item not found' })
    }

    res.status(200).json(item)
})

// CREATE - Add new item
app.post('/items', validateToken, async (req, res) => {
    const { name, price } = req.body

    // Validate input
    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required' })
    }

    const newProduct = {
        name: name,
        price: parseFloat(price)
    }

    // items.push(newProduct)
    const docRef = await itemsCollection.add(newProduct)

    res.status(201).json({ id: docRef.id })
})

// UPDATE - Update existing item
app.put('/items/:id', validateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const { name, price } = req.body

    const itemIndex = items.findIndex(item => item.id === id)

    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' })
    }

    // Update only provided fields
    if (name !== undefined) items[itemIndex].name = name
    if (price !== undefined) items[itemIndex].price = parseFloat(price)

    res.status(200).json(items[itemIndex])
})

// DELETE - Remove item
app.delete('/items/:id', validateToken, (req, res) => {
    const id = parseInt(req.params.id)
    const itemIndex = items.findIndex(item => item.id === id)

    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' })
    }

    items.splice(itemIndex, 1)

    res.status(200).json({ message: 'Item deleted successfully' })
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})