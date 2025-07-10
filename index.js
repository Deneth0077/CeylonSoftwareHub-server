import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// Route imports
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import userRoutes from './routes/users.js';
import paymentRoutes from './routes/payments.js';
import adminRoutes from './routes/admin.js';
import contactRoutes from './routes/contact.js';

// Error handling middleware
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'https://www.ceylonsoftware.lk',         // Your custom frontend domain
    'https://ceylonsoftware.lk',             // Your custom frontend domain (no www)
    'https://ceylon-software-hub-client.vercel.app', // Your specific Vercel-assigned frontend domain
    'http://localhost:5173',                 // Client local dev
    'http://localhost:3000'                  // Older client local dev port, can be removed if not used
    // You might want to keep /https:\/\/.*\.vercel\.app$/ if you frequently use Vercel previews from many branches
    // or remove it for a stricter production setup. For now, I'll keep it commented out for explicitness.
    // /https:\/\/.*\.vercel\.app$/,
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true, // Support cookies/auth headers
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Server is working successfully' });
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'Uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://cuesai24:ceylonese@ceylonse.ie3kh2k.mongodb.net/?retryWrites=true&w=majority&appName=ceylonSE')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// TEMPORARY: Create admin user endpoint (for development only)
app.post('/api/create-admin', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    await admin.save();
    res.json({ message: 'Admin user created successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});