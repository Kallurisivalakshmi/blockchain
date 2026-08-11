const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hotel_police_system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/guests', require('./routes/guestRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/watchlist', require('./routes/watchlistRoutes'));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Hotel Police Registry System API is running' });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Hotel Police Registry System API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      guests: '/api/guests',
      alerts: '/api/alerts',
      watchlist: '/api/watchlist'
    }
  });
});

// Error handling middleware
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;