const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phoneNumber: { type: String, required: true, unique: true },
    
    // Made these optional for Admin use only!
    email: { type: String, sparse: true }, 
    password: { type: String },
    
    activeRole: { type: String, enum:['rider', 'driver', 'admin'], default: 'rider' },
    
    driverProfile: {
        isApproved: { type: Boolean, default: false },
        isOnline: { type: Boolean, default: false },
        vehicleInfo: { type: String, default: '' },
        licensePlate: { type: String, default: '' }
    }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);