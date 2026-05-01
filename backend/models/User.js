const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    
    // THE MAGIC TOGGLE: Are they currently looking for a ride, or driving?
    activeRole: { type: String, enum:['rider', 'driver', 'admin'], default: 'rider' },
    
    // DRIVER DATA: This stays hidden until they switch to Driver mode!
    driverProfile: {
        isApproved: { type: Boolean, default: false }, // Admin has to approve their license later!
        isOnline: { type: Boolean, default: false },   // Are they currently accepting rides?
        vehicleInfo: { type: String, default: '' },    // e.g., "Toyota Corolla - White"
        licensePlate: { type: String, default: '' }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);