const db = require('../db');

// Array of realistic product names
const productNames = [
    'Laptop', 'Smartphone', 'Headphones', 'Tablet', 'Smart Watch',
    'Camera', 'Keyboard', 'Mouse', 'Monitor', 'Speaker',
    'Router', 'Printer', 'Scanner', 'Webcam', 'Microphone',
    'USB Drive', 'External Hard Drive', 'Power Bank', 'Charger', 'Cable',
    'Desk Lamp', 'Office Chair', 'Notebook', 'Pen Set', 'Backpack',
    'Water Bottle', 'Coffee Mug', 'Mouse Pad', 'Desk Organizer', 'Phone Stand',
    'Bluetooth Adapter', 'WiFi Extender', 'Ethernet Cable', 'HDMI Cable', 'VGA Cable',
    'Projector', 'Whiteboard', 'Sticky Notes', 'Paper Clips', 'Stapler',
    'Calculator', 'Clock', 'Calendar', 'Filing Cabinet', 'Bookshelf',
    'Plant Pot', 'Picture Frame', 'Mirror', 'Cushion', 'Throw Blanket'
];

// Array of brands
const brands = [
    'TechCorp', 'DigitalPro', 'SmartTech', 'Innovate', 'FutureBrand',
    'QualityTech', 'ProSeries', 'EliteTech', 'Premium', 'Standard',
    'EcoFriendly', 'Modern', 'Classic', 'Professional', 'Consumer'
];

// Generate random price between min and max
function getRandomPrice(min, max) {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

// Generate random product data
function generateRandomProduct() {
    const name = productNames[Math.floor(Math.random() * productNames.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const price = getRandomPrice(10, 500);
    const quantity = Math.floor(Math.random() * 100) + 1;
    
    return {
        name: `${brand} ${name}`,
        price: price,
        quantity: quantity,
        description: `High-quality ${name.toLowerCase()} from ${brand}`,
        category: 'Electronics',
        createdAt: new Date().toISOString(),
        inStock: quantity > 0
    };
}

// Seed products into Firestore
async function seedProducts(count = 50) {
    try {
        console.log(`Starting to seed ${count} products...`);
        
        const itemsCollection = db.collection('items');
        const products = [];
        
        // Generate products
        for (let i = 0; i < count; i++) {
            const product = generateRandomProduct();
            products.push(product);
        }
        
        // Add products to Firestore
        const promises = products.map(product => itemsCollection.add(product));
        await Promise.all(promises);
        
        console.log(`Successfully seeded ${count} products!`);
        
        // Display summary
        const prices = products.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
        
        console.log('\nPrice Summary:');
        console.log(`- Minimum Price: $${minPrice.toFixed(2)}`);
        console.log(`- Maximum Price: $${maxPrice.toFixed(2)}`);
        console.log(`- Average Price: $${avgPrice.toFixed(2)}`);
        
        // Show sample products
        console.log('\nSample Products:');
        products.slice(0, 5).forEach((product, index) => {
            console.log(`${index + 1}. ${product.name} - $${product.price.toFixed(2)}`);
        });
        
    } catch (error) {
        console.error('Error seeding products:', error);
    }
}

// Run the seeder if this script is executed directly
if (require.main === module) {
    const count = process.argv[2] ? parseInt(process.argv[2]) : 50;
    seedProducts(count).then(() => {
        console.log('Seeding completed!');
        process.exit(0);
    }).catch(error => {
        console.error('Seeding failed:', error);
        process.exit(1);
    });
}

module.exports = { seedProducts, generateRandomProduct };