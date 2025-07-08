import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['software & apps', 'MS office keys', 'Windows Keys', 'PC games', 'Cracked']
  },
  images: [{
    url: String,
    alt: String
  }],
  downloadUrl: {
    type: String,
    required: [true, 'Download URL is required']
  },
  systemRequirements: {
    os: [String],
    processor: String,
    memory: String,
    storage: String
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  license: {
    type: String,
    enum: ['single', 'multiple', 'enterprise'],
    default: 'single'
  },
  tags: [String],
  features: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  downloads: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Index for search functionality
productSchema.index({ name: 'text', description: 'text', tags: 'text' });

export default mongoose.model('Product', productSchema);