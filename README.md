# REST API with CRUD Operations

A simple REST API demonstrating full CRUD operations with Node.js/Express backend and vanilla JavaScript frontend.

## Project Structure

```
REST/
├── API/
│   ├── app.js          # Express server with CRUD endpoints
│   └── package.json    # Backend dependencies
├── CLIENT/
│   ├── index.html      # Frontend interface
│   └── js/
│       └── main.js     # Client-side JavaScript
└── README.md
```

## Current Setup

The API currently uses an in-memory array to store products. This data is lost when the server restarts.

---

# Firestore Database Integration Guide

Follow these steps to integrate Google Cloud Firestore as a persistent database for your REST API.

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter a project name (e.g., "rest-crud-demo")
4. Disable Google Analytics (optional for this project)
5. Click **"Create project"**
6. Wait for the project to be created, then click **"Continue"**

## Step 2: Create a Firestore Database

1. In your Firebase project dashboard, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (you can change security rules later)
4. Select a Cloud Firestore location (choose the closest to your users)
5. Click **"Enable"**
6. Your Firestore database is now ready!

## Step 3: Generate and Export Service Account Credentials

1. In the Firebase Console, click the **gear icon** next to "Project Overview" and select **"Project settings"**
2. Navigate to the **"Service accounts"** tab
3. Click **"Generate new private key"**
4. A dialog will appear warning you to keep the key secure. Click **"Generate key"**
5. A JSON file will download automatically - this is your credentials file
6. **IMPORTANT**: Keep this file secure and never commit it to version control!
7. Rename the file to `serviceAccountKey.json` (or any name you prefer)
8. Move the file to your `API/` directory

## Step 4: Secure Your Credentials

Update your `.gitignore` file to prevent committing sensitive files:

```
# .gitignore
node_modules/
package-lock.json
API/serviceAccountKey.json
*.json.key
```

## Step 5: Install Required Dependencies

Navigate to your `API/` directory and install the necessary packages:

```bash
cd API
npm install firebase-admin
```

Your `package.json` should now include:

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "nodemon": "^3.1.10",
    "firebase-admin": "^12.0.0"
  }
}
```

## Step 6: Create Database Connector Module

Create a new file `API/db.js` that uses a closure pattern to initialize Firebase and export the Firestore database instance:

```javascript
// API/db.js
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK using closure pattern
function initializeFirestore() {
    // Initialize the app with service account credentials
    // The credentials file should be in the same directory as this file
    admin.initializeApp({
        credential: admin.credential.cert(require('./serviceAccountKey.json'))
    });

    // Get and return Firestore instance
    // This allows access to any collection in your database
    return admin.firestore();
}

// Export the database instance using closure
const db = initializeFirestore();

module.exports = db;
```

**How the closure works:**
- The `initializeFirestore()` function runs once when the module is first loaded
- Firebase is initialized only once
- The database instance is stored in `db`
- This instance is exported and can be imported anywhere in your app
- Subsequent imports will receive the same database instance (singleton pattern)
- You can access any collection using `db.collection('collectionName')`

## Step 7: Configure Firestore Security Rules

Before migrating your code, set up security rules for your Firestore database.

1. In the Firebase Console, go to **Firestore Database**
2. Click on the **Rules** tab
3. Replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Allow all access for development
    }
  }
}
```

4. Click **Publish**

**⚠️ WARNING:** These rules allow anyone to read and write your data. Only use for development/learning!

## Step 8: Replace In-Memory Database in app.js

### 8.1 Import the database module

At the top of `API/app.js`, add:

```javascript
const express = require('express');
const cors = require('cors');
const db = require('./db'); // Import Firestore database instance

const app = express();
const PORT = 5000;

// Get the items collection reference
const itemsCollection = db.collection('items');
```

### 8.2 Remove the in-memory data

**DELETE these lines from app.js:**

```javascript
// Remove these lines:
let items = [
    { id: 1, name: 'Laptop', price: 6000 },
    { id: 2, name: 'Phone', price: 7500 },
    { id: 3, name: 'Headphones', price: 7500 }
];

let nextId = 4;
```

## Step 9: Update CRUD Endpoints to Use Firestore

### 9.1 READ - Get All Items

Replace the existing GET /items endpoint:

```javascript
// READ - Get all items from Firestore
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
```

**Key changes:**
- Made the function `async`
- Use `itemsCollection.get()` to fetch all documents
- Iterate through snapshot to build items array
- Each document's ID is stored in `doc.id`
- Document data is retrieved with `doc.data()`
- Added error handling

### 9.2 READ - Get Single Item by ID

Replace the existing GET /items/:id endpoint:

```javascript
// READ - Get single item by ID from Firestore
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
```

**Key changes:**
- Use `itemsCollection.doc(id).get()` to fetch a specific document
- Check `doc.exists` to verify the document was found
- Return document ID and data

### 9.3 CREATE - Add New Item

Replace the existing POST /items endpoint:

```javascript
// CREATE - Add new item to Firestore
app.post('/items', async (req, res) => {
    try {
        const { name, price } = req.body;

        // Validate input
        if (!name || !price) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const newProduct = {
            name: name,
            price: parseFloat(price),
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Add document to Firestore (auto-generated ID)
        const docRef = await itemsCollection.add(newProduct);

        res.status(201).json({ id: docRef.id });
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({ error: 'Failed to add item' });
    }
});
```

**Key changes:**
- Use `itemsCollection.add()` to create a new document
- Firestore auto-generates a unique ID
- Added `createdAt` timestamp using server timestamp
- Return the auto-generated document ID

### 9.4 UPDATE - Update Existing Item

Replace the existing PUT /items/:id endpoint:

```javascript
// UPDATE - Update existing item in Firestore
app.put('/items/:id', async (req, res) => {
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
        updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

        // Update the document
        await docRef.update(updateData);

        // Fetch and return updated document
        const updatedDoc = await docRef.get();
        res.status(200).json({
            id: updatedDoc.id,
            ...updatedDoc.data()
        });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Failed to update item' });
    }
});
```

**Key changes:**
- Use `itemsCollection.doc(id)` to reference the document
- Check if document exists before updating
- Use `docRef.update()` to update specific fields
- Added `updatedAt` timestamp
- Fetch and return the updated document

### 9.5 DELETE - Remove Item

Replace the existing DELETE /items/:id endpoint:

```javascript
// DELETE - Remove item from Firestore
app.delete('/items/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const docRef = itemsCollection.doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Delete the document
        await docRef.delete();

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});
```

**Key changes:**
- Use `itemsCollection.doc(id)` to reference the document
- Check if document exists before deleting
- Use `docRef.delete()` to remove the document

## Step 10: Add Initial Data to Firestore (Optional)

You can manually add initial products through the Firebase Console:

1. Go to Firestore Database in Firebase Console
2. Click **"Start collection"**
3. Collection ID: `items`
4. Add documents with fields:
   - `name` (string): "Laptop"
   - `price` (number): 6000

Or create a seed script to populate initial data programmatically.

## Step 11: Update Client (If Needed)

The client should work without changes, but note:

- **IDs are now strings** (Firestore auto-generated) instead of integers
- Update the client if it relies on numeric IDs
- No changes needed if IDs are treated as strings

## Step 12: Start Your Application

```bash
# In the API directory
cd API
npm start

# Or with nodemon for auto-restart
npx nodemon app.js
```

Open the CLIENT in your browser and test all CRUD operations!

## Important Notes

### Firestore Pricing
- Firestore has a **free tier** with generous limits
- Free tier includes: 1GB storage, 50K document reads/day, 20K writes/day
- Monitor your usage in the Firebase Console

### Security Rules
The security rules configured in Step 7 allow all access for development purposes. **For production**, implement proper authentication and authorization rules.

### Data Structure Differences

| In-Memory | Firestore |
|-----------|-----------|
| Manual integer IDs | Auto-generated string IDs |
| Lost on restart | Persistent |
| Synchronous operations | Asynchronous operations |
| Array find/filter | Query snapshots |

### Error Handling
All Firestore operations can fail due to:
- Network issues
- Permission errors
- Invalid credentials
- Quota limits

Always wrap Firestore calls in try-catch blocks!

## Troubleshooting

### "Error: Could not load the default credentials"
- Check that `serviceAccountKey.json` exists in the API directory
- Verify the path in `db.js` points to the correct file (`./serviceAccountKey.json`)
- Ensure the service account key file has proper JSON formatting

### "Permission denied" errors
- Check your Firestore security rules
- Ensure service account has proper permissions

### "Module not found" errors
- Run `npm install` in the API directory
- Verify all dependencies are installed

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Node.js Firestore Quickstart](https://firebase.google.com/docs/firestore/quickstart)

---

## Running the Application

### Backend (API)
```bash
cd API
npm install
npm start
# Server runs on http://localhost:5000
```

### Frontend (CLIENT)
Open `CLIENT/index.html` in your browser or use a local server:
```bash
cd CLIENT
npx http-server -p 8080
# Open http://localhost:8080
```

## License

This is a demo project for educational purposes.
