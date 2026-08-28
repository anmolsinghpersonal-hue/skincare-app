const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Environment & Security Setup
const JWT_SECRET = 'super_secret_admin_key_change_in_production';
const PORT = 5000;

// Default Admin Password: AdminPassword123!
const ADMIN_HASHED_PASSWORD = bcrypt.hashSync('AdminPassword123!', 10);

// Temporary In-Memory Data Storage
let products = [
    { id: 1, name: "Hydra-Glow Cleanser", price: "24.60", reshell: "https://reshell.com/aff/derm/hyglo123" },
    { id: 2, name: "Niacinamide Serum", price: "32.80", reshell: "https://reshell.com/aff/derm/serum456" }
];
let orders = [];

// Middleware: Validate JWT Session Token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access Denied: No Token Provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or Expired Token' });
        req.user = user;
        next();
    });
};

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    if (bcrypt.compareSync(password, ADMIN_HASHED_PASSWORD)) {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ error: 'Invalid Credentials' });
});

// Get Public Products
app.get('/api/products', (req, res) => {
    res.json(products);
});

// Customer Submits Order/Analysis Result
app.post('/api/orders', (req, res) => {
    const { customerName, matchedProducts } = req.body;
    const cleanName = String(customerName || 'Anonymous User').replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    const newOrder = {
        id: Date.now(),
        customer: cleanName,
        items: matchedProducts,
        timestamp: new Date().toISOString(),
        status: 'Pending'
    };
    
    orders.push(newOrder);
    res.status(201).json({ success: true, orderId: newOrder.id });
});

// Protected: Get Admin Orders Inbox
app.get('/api/admin/orders', authenticateToken, (req, res) => {
    res.json(orders);
});

// Protected: Add New Product & Reshell Link
app.post('/api/admin/products', authenticateToken, (req, res) => {
    const { name, price, reshell } = req.body;

    // Validate URL domain is Reshell
    try {
        const parsedUrl = new URL(reshell);
        if (!parsedUrl.hostname.includes('reshell.com')) {
            return res.status(400).json({ error: 'URL must belong to reshell.com' });
        }
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL Format' });
    }

    const newProduct = {
        id: Date.now(),
        name: String(name).replace(/</g, "&lt;"),
        price: parseFloat(price).toFixed(2),
        reshell: reshell
    };

    products.push(newProduct);
    res.status(201).json({ success: true, product: newProduct });
});

app.listen(PORT, () => console.log(`Backend server running live on http://localhost:${PORT}`));