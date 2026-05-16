const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    city: { type: String, required: true },
    address: { type: String, required: true },
    
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, sparse: true }, 
    password: { type: String },
    activeRole: { type: String, enum:['rider', 'driver', 'admin'], default: 'rider' },
    pushToken: { type: String, default: '' },
    
    driverProfile: {
        isApproved: { type: Boolean, default: false },
        isOnline: { type: Boolean, default: false },
        vehicleInfo: { type: String, default: '' },
        licensePlate: { type: String, default: '' },
        cnicFront: { type: String, default: '' },
        cnicBack: { type: String, default: '' },
        vehicleDocs: { type: String, default: '' }
    },

    // ✨ NEW: IN-APP NOTIFICATIONS LOG ✨
    notifications: [{
        title: String,
        body: String,
        date: { type: Date, default: Date.now }
    }]

}, { timestamps: true });

userSchema.virtual('name').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('User', userSchema);