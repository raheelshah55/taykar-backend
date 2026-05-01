const mongoose = require('mongoose');

// Mini-schema to store the bids from different drivers!
const bidSchema = new mongoose.Schema({
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fare: { type: Number, required: true },
    driverName: { type: String } // Storing name here saves us from doing complex database lookups later
});

const rideSchema = new mongoose.Schema({
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    
   pickupLocation: { type: String, required: true },
    dropoffLocation: { type: String, required: true },
    
    // --- NEW: Vehicle Category ---
    vehicleType: { type: String, enum: ['Car', 'Bike', 'Rickshaw'], default: 'Car' },
    
    offeredFare: { type: Number, required: true },
    
    offeredFare: { type: Number, required: true }, // What the rider wants to pay
    acceptedFare: { type: Number, default: null }, // The final agreed price
    
    status: { 
        type: String, 
        enum:['pending', 'accepted', 'arrived', 'in_transit', 'completed', 'canceled'], 
        default: 'pending' 
    },

    bids: [bidSchema] // An array holding all the counter-offers from drivers!

}, { timestamps: true });

module.exports = mongoose.model('Ride', rideSchema);