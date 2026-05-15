const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // NEW FIELDS
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, sparse: true }, 
    password: { type: String },
    pushToken: { type: String, default: '' }, 
    activeRole: { type: String, enum:['rider', 'driver', 'admin'], default: 'rider' },
    
    // UPDATED DRIVER PROFILE WITH DOCUMENTS
    driverProfile: {
        isApproved: { type: Boolean, default: false },
        isOnline: { type: Boolean, default: false },
        vehicleInfo: { type: String, default: '' },
        licensePlate: { type: String, default: '' },
        
        // NEW: Document Image URLs (Will be hosted on Cloudinary)
        cnicFront: { type: String, default: '' },
        cnicBack: { type: String, default: '' },
        vehicleDocs: { type: String, default: '' }
    }
}, { timestamps: true });

// Virtual field to keep `name` working for old code
userSchema.virtual('name').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);