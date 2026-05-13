require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Sockets Setup (Crucial for the Bidding System!)
const io = new Server(server, {
    cors: { origin: '*' }
});
app.set('io', io);

io.on('connection', (socket) => {
    console.log('📱 Device connected for TayKar:', socket.id);
    // ✨ NEW: Secure In-App Chat Relay ✨
    socket.on('sendMessage', (data) => {
        // Instantly beams the message to the other person's phone!
        io.emit('receiveMessage', data);
    });
    // ✨ NEW: Driver sends their live location ✨
    socket.on('driverLocation', (data) => {
        // Data contains { rideId, latitude, longitude }
        // Broadcast this to ONLY the rider involved in this ride!
        io.emit(`riderTracking:${data.rideId}`, {
            latitude: data.latitude,
            longitude: data.longitude
        });
    });

    socket.on('disconnect', () => {
        console.log('Device disconnected');
    });
});
// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected (taykar Database)'))
    .catch((err) => console.log('❌ MongoDB Error: ', err));
// Import Routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/ride');
const adminRoutes = require('./routes/admin');
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/admin', adminRoutes);
// Test Route
app.get('/', (req, res) => {
    res.send({ message: "Welcome to the taykar Clone API!" });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Ride Hailing Server running on port ${PORT}`);
});