const express = require('express');
const cors = require('cors');

const app = express()
const PORT = 5000

// Logging middleware - logs all incoming requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
    next()
})

// Simulated database - in-memory array of items
let items = [
    {
        id: 1, name: 'Laptop', price: 6000
    },
    {
        id: 2, name: 'Phone', price: 7500
    },
    {
        id: 3, name: 'Headphones', price: 7500
    }
]

let nextId = 4;

// Enable CORS and JSON parsing
app.use(cors())
app.use(express.json())

// READ - Get all items
app.get('/items', (req, res) => {
    res.status(200).json(items)
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
app.post('/items', (req, res) => {
    const { name, price } = req.body

    // Validate input
    if (!name || !price) {
        return res.status(400).json({ error: 'Name and price are required' })
    }

    const newProduct = {
        id: nextId++,
        name: name,
        price: parseFloat(price)
    }

    items.push(newProduct)

    res.status(201).json({ id: newProduct.id })
})

// UPDATE - Update existing item
app.put('/items/:id', (req, res) => {
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
app.delete('/items/:id', (req, res) => {
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