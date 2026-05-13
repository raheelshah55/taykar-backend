import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://taykar-backend.onrender.com'; 

function App() {
  const [email, setEmail] = useState('ali@test.com');
  const [password, setPassword] = useState('password123');
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  const[users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  
  // GLOBAL SETTINGS
  const[settings, setSettings] = useState({ 
    Car: { baseFare: 150, perKmRate: 40, driverBonus: 50 }, 
    Bike: { baseFare: 50, perKmRate: 15, driverBonus: 20 }, 
    Rickshaw: { baseFare: 80, perKmRate: 25, driverBonus: 30 } 
  });
  const [isSaving, setIsSaving] = useState(false);

  // DOCUMENT VIEWER MODAL
  const[docModalUser, setDocModalUser] = useState(null);

  useEffect(() => { if (token) fetchData(); },[token]);

  const fetchData = async () => {
    try {
      const userRes = await axios.get(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const rideRes = await axios.get(`${API_URL}/api/admin/rides`, { headers: { Authorization: `Bearer ${token}` } });
      const settingsRes = await axios.get(`${API_URL}/api/admin/settings`);
      setUsers(userRes.data);
      setRides(rideRes.data);
      if (settingsRes.data && settingsRes.data.Car) setSettings(settingsRes.data);
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      setToken(res.data.token); localStorage.setItem('adminToken', res.data.token);
    } catch (error) { alert("Login failed!"); }
  };

  const handleLogout = () => { setToken(null); localStorage.removeItem('adminToken'); };

  // --- ADMIN ACTIONS ---
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/api/admin/settings`, settings, { headers: { Authorization: `Bearer ${token}` } });
      alert("Pricing & Bonuses Updated!");
    } catch (error) { alert("Error saving settings."); }
    setIsSaving(false);
  };

  const approveDriver = async (userId) => {
    try { await axios.put(`${API_URL}/api/admin/approve-driver/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (e) {}
  };

  const suspendUser = async (userId, userName) => {
    if (!window.confirm(`Suspend ${userName}'s driver access?`)) return;
    try { await axios.put(`${API_URL}/api/admin/users/${userId}/suspend`, {}, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (e) {}
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Permanently Delete ${userName}?`)) return;
    try { await axios.delete(`${API_URL}/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (e) {}
  };

  const forceRideStatus = async (rideId, newStatus) => {
    if (!window.confirm(`Mark as ${newStatus}?`)) return;
    try { await axios.put(`${API_URL}/api/admin/rides/${rideId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (e) {}
  };

  const deleteRide = async (rideId) => {
    if (!window.confirm(`Permanently delete this ride from history?`)) return;
    try { await axios.delete(`${API_URL}/api/admin/rides/${rideId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (e) {}
  };

  // --- STATS ---
  const completedRides = rides.filter(r => r.status === 'completed');
  const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.acceptedFare || 0), 0);
  const platformCut = (totalRevenue * 0.10).toFixed(2);

  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', backgroundColor: 'white', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
        <h2 style={{ textAlign: 'center', color: '#00D06C' }}>🚗 TayKar Admin</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <button type="submit" style={{ padding: '12px', backgroundColor: '#00D06C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '20px' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#00D06C', padding: '20px', borderRadius: '15px', color: 'white' }}>
        <h1 style={{ margin: 0 }}>🚗 TayKar Control Center</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: 'white', color: '#e74c3c', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
      </div>

      {/* 1. THE MISSING GLOBAL PRICING SECTION */}
      <div style={{ marginTop: '20px', backgroundColor: '#fffbe6', padding: '20px', borderRadius: '15px', border: '2px solid #f1c40f' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#d35400' }}>⚙️ Global Fare & Bonus Settings</h2>
          <button onClick={saveSettings} disabled={isSaving} style={{ padding: '10px 25px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {['Car', 'Bike', 'Rickshaw'].map((vehicle) => (
          <div key={vehicle} style={{ display: 'flex', gap: '15px', alignItems: 'center', backgroundColor: 'white', padding: '15px', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            <h3 style={{ width: '100px', margin: 0 }}>{vehicle === 'Car' ? '🚗' : vehicle === 'Bike' ? '🏍️' : '🛺'} {vehicle}</h3>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#777' }}>Base Fare (Rs)</label>
              <input type="number" value={settings[vehicle]?.baseFare || 0} onChange={(e) => setSettings({...settings, [vehicle]: {...settings[vehicle], baseFare: Number(e.target.value)}})} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#777' }}>Per KM (Rs)</label>
              <input type="number" value={settings[vehicle]?.perKmRate || 0} onChange={(e) => setSettings({...settings, [vehicle]: {...settings[vehicle], perKmRate: Number(e.target.value)}})} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '12px', color: '#777' }}>Driver Bonus (Rs)</label>
              <input type="number" value={settings[vehicle]?.driverBonus || 0} onChange={(e) => setSettings({...settings, [vehicle]: {...settings[vehicle], driverBonus: Number(e.target.value)}})} style={{ width: '100%', padding: '8px', borderRadius: '5px', border: '1px solid #ccc' }} />
            </div>
          </div>
        ))}
      </div>

      {/* STATS CARDS */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#7f8c8d' }}>Registered Users</h3>
          <h2 style={{ margin: 0, fontSize: '36px', color: '#333' }}>{users.length}</h2>
        </div>
        <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#7f8c8d' }}>Completed Rides</h3>
          <h2 style={{ margin: 0, fontSize: '36px', color: '#333' }}>{completedRides.length}</h2>
        </div>
        <div style={{ flex: 1, backgroundColor: '#333', padding: '20px', borderRadius: '15px', color: 'white' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#aaa' }}>Platform Revenue (10%)</h3>
          <h2 style={{ margin: 0, fontSize: '36px', color: '#00D06C' }}>Rs. {platformCut}</h2>
        </div>
      </div>

      {/* 2. ENHANCED USERS TABLE */}
      <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
        <h2>👥 User & Driver Management</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '12px 0' }}>Name</th>
                <th>Role</th>
                <th>Contact & Location</th>
                <th>Driver Status</th>
                <th>Management Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px 0', fontWeight: 'bold' }}>{u.firstName || u.name} {u.lastName || ''}</td>
                  <td>{u.activeRole === 'driver' ? '👨‍✈️ Driver' : '🙋‍♂️ Rider'}</td>
                  <td style={{ fontSize: '14px', color: '#555' }}>
                    📞 {u.phoneNumber}<br/>
                    📍 {u.city || 'N/A'}<br/>
                    {u.activeRole === 'driver' && (
                      <span style={{ color: '#00D06C', fontWeight: 'bold' }}>
                        🚗 {u.driverProfile?.vehicleInfo || 'No vehicle data'}<br/>
                        🏷️ {u.driverProfile?.licensePlate || 'N/A'}
                      </span>
                    )}
                  </td>
                  <td style={{ display: 'flex', gap: '8px', paddingTop: '10px', flexWrap: 'wrap' }}>
                    {u.activeRole === 'driver' && (
                      <button onClick={() => setDocModalUser(u)} style={{ padding: '6px 12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>View Docs</button>
                    )}
                    {u.activeRole === 'driver' && !u.driverProfile?.isApproved && (
                      <button onClick={() => approveDriver(u._id)} style={{ padding: '6px 12px', backgroundColor: '#00D06C', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Approve</button>
                    )}
                    {u.activeRole === 'driver' && u.driverProfile?.isApproved && (
                      <button onClick={() => suspendUser(u._id, u.firstName)} style={{ padding: '6px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Suspend</button>
                    )}
                    <button onClick={() => deleteUser(u._id, u.firstName || u.name)} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Delete Account</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. ENHANCED RIDES TABLE */}
      <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
        <h2>🗺️ Ride Management</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '12px 0' }}>Vehicle</th>
              <th>Rider / Driver</th>
              <th>Route</th>
              <th>Fare</th>
              <th>Status</th>
              <th>Ride Actions</th>
            </tr>
          </thead>
          <tbody>
            {rides.map(r => (
              <tr key={r._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 0' }}>{r.vehicleType === 'Bike' ? '🏍️' : r.vehicleType === 'Rickshaw' ? '🛺' : '🚗'} {r.vehicleType}</td>
                <td>🙋‍♂️ {r.rider?.firstName || r.rider?.name || 'User'}<br/>👨‍✈️ {r.driver?.firstName || r.driver?.name || 'Waiting'}</td>
                <td style={{ fontSize: '14px' }}><span style={{color: 'green'}}>●</span> {r.pickupLocation} <br/><span style={{color: 'red'}}>●</span> {r.dropoffLocation}</td>
                <td style={{ fontWeight: 'bold', color: '#00D06C' }}>Rs. {r.acceptedFare || r.offeredFare}</td>
                <td><span style={{ backgroundColor: r.status === 'completed' ? '#2ecc71' : r.status === 'canceled' ? '#e74c3c' : '#f1c40f', color: r.status === 'pending' ? 'black' : 'white', padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>{r.status.toUpperCase()}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {r.status !== 'completed' && r.status !== 'canceled' && (
                      <>
                        <button onClick={() => forceRideStatus(r._id, 'completed')} style={{ padding: '6px 10px', backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Complete</button>
                        <button onClick={() => forceRideStatus(r._id, 'canceled')} style={{ padding: '6px 10px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                      </>
                    )}
                    <button onClick={() => deleteRide(r._id)} style={{ padding: '6px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Delete Log</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 📸 DOCUMENT VIEWER MODAL (Instead of annoying alerts!) */}
      {docModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', width: '80%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>Documents: {docModalUser.firstName} {docModalUser.lastName}</h2>
              <button onClick={() => setDocModalUser(null)} style={{ padding: '10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Close</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3>🪪 CNIC Front</h3>
                {docModalUser.driverProfile?.cnicFront ? <img src={docModalUser.driverProfile.cnicFront} alt="CNIC Front" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', border: '1px solid #ccc', borderRadius: '10px' }} /> : <p>No image uploaded</p>}
              </div>
              <div>
                <h3>🪪 CNIC Back</h3>
                {docModalUser.driverProfile?.cnicBack ? <img src={docModalUser.driverProfile.cnicBack} alt="CNIC Back" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', border: '1px solid #ccc', borderRadius: '10px' }} /> : <p>No image uploaded</p>}
              </div>
              <div>
                <h3>📄 Vehicle Documents</h3>
                {docModalUser.driverProfile?.vehicleDocs ? <img src={docModalUser.driverProfile.vehicleDocs} alt="Vehicle Docs" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', border: '1px solid #ccc', borderRadius: '10px' }} /> : <p>No image uploaded</p>}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;