const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fare: { type: Number, required: true },
    driverName: { type: String }
});

const rideSchema = new mongoose.Schema({
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
    pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: true },
    vehicleType: { type: String, enum: ['Car', 'Bike', 'Rickshaw'], default: 'Car' },
    
    offeredFare: { type: Number, required: true },
    acceptedFare: { type: Number, default: null },
    
    // ✨ NEW: THE COMPLETE UBER LIFECYCLE STATUES ✨
    status: { 
        type: String, 
        enum: ['pending', 'accepted', 'arrived', 'in_progress', 'completed', 'canceled'], 
        default: 'pending' 
    },

    bids: [bidSchema],
    
    // ✨ NEW: DRIVER RATING ✨
    rating: { type: Number, default: 0 }

}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);