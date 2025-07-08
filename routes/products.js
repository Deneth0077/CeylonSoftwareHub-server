import express from 'express';
import Product from '../models/Product.js';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all products (with optional filtering and search)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      category, 
      search, 
      sort = '-createdAt', 
      page = 1, 
      limit = 12 
    } = req.query;

    const query = { isActive: true };

    // Category filter
    if (category && category !== 'all') {
      query.category = category;
    }

    // Search functionality
    if (search) {
      query.$text = { $search: search };
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: {
        path: 'createdBy',
        select: 'name'
      }
    };

    const products = await Product.find(query)
      .populate('createdBy', 'name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single product
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name');

    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get categories
router.get('/meta/categories', async (req, res) => {
  try {
    const categories = await Product.distinct('category', { isActive: true });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create product (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      createdBy: req.user._id
    });

    await product.save();
    await product.populate('createdBy', 'name');

    res.status(201).json({
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update product (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    Object.assign(product, req.body);
    await product.save();
    await product.populate('createdBy', 'name');

    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete product (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ message: 'Product permanently deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add product rating endpoint
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    const product = await Product.findById(req.params.id);
    if (!product || !product.isActive) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // Calculate new average and count
    const prevAvg = product.rating.average || 0;
    const prevCount = product.rating.count || 0;
    const newCount = prevCount + 1;
    const newAvg = ((prevAvg * prevCount) + rating) / newCount;
    product.rating.average = newAvg;
    product.rating.count = newCount;
    await product.save();
    await product.populate('createdBy', 'name');
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;