import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'https://taykar-backend.onrender.com'; // Keep as https://taykar-backend.onrender.com for your laptop

function App() {
  const [email, setEmail] = useState('ali@test.com');
  const[password, setPassword] = useState('password123');
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  const [users, setUsers] = useState([]);
  const[rides, setRides] = useState([]);
  
  // --- NEW SETTINGS STATES ---
  const[settings, setSettings] = useState({
    Car: { baseFare: 150, perKmRate: 40, driverBonus: 50 },
    Bike: { baseFare: 50, perKmRate: 15, driverBonus: 20 },
    Rickshaw: { baseFare: 80, perKmRate: 25, driverBonus: 30 }
  });
  const[isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (token) fetchData();
  },[token]);

  const fetchData = async () => {
    try {
      const userRes = await axios.get(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const rideRes = await axios.get(`${API_URL}/api/admin/rides`, { headers: { Authorization: `Bearer ${token}` } });
      const settingsRes = await axios.get(`${API_URL}/api/admin/settings`); // Fetch Settings!
      
      setUsers(userRes.data);
      setRides(rideRes.data);
      if (settingsRes.data) setSettings(settingsRes.data);
      
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      setToken(res.data.token);
      localStorage.setItem('adminToken', res.data.token);
    } catch (error) { alert("Login failed!"); }
  };

  const handleLogout = () => {
    setToken(null); localStorage.removeItem('adminToken');
  };

  // --- NEW SAVE SETTINGS FUNCTION ---
  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await axios.put(`${API_URL}/api/admin/settings`, settings, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      alert("Pricing & Bonuses Updated Globally!");
    } catch (error) {
      alert("Error saving settings.");
    }
    setIsSaving(false);
  };

  const approveDriver = async (userId) => {
    try { await axios.put(`${API_URL}/api/admin/approve-driver/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (e) {}
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete ${userName}?`)) return;
    try { await axios.delete(`${API_URL}/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (e) {}
  };

  const forceRideStatus = async (rideId, newStatus) => {
    if (!window.confirm(`Mark as ${newStatus}?`)) return;
    try { await axios.put(`${API_URL}/api/admin/rides/${rideId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } }); fetchData(); } catch (e) {}
  };

  const completedRides = rides.filter(r => r.status === 'completed');
  const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.acceptedFare || 0), 0);
  const platformCut = (totalRevenue * 0.10).toFixed(2);

  if (!token) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '30px', backgroundColor: 'white', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
        <h2 style={{ textAlign: 'center', color: '#00D06C' }}>🚗 TayKar Admin</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '20px' }}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }} />
          <button type="submit" style={{ padding: '12px', backgroundColor: '#00D06C', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '20px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#00D06C', padding: '20px', borderRadius: '15px', color: 'white' }}>
        <h1 style={{ margin: 0 }}>🚗 Platform Control Center</h1>
        <button onClick={handleLogout} style={{ padding: '10px 20px', backgroundColor: 'white', color: '#e74c3c', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Logout</button>
      </div>

     {/* --- ADVANCED PRICING & BONUS SETTINGS CARD --- */}
      <div style={{ marginTop: '20px', backgroundColor: '#fffbe6', padding: '20px', borderRadius: '15px', border: '2px solid #f1c40f' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#d35400' }}>⚙️ Global Pricing by Vehicle</h2>
          <button onClick={saveSettings} disabled={isSaving} style={{ padding: '10px 25px', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Generate a row for Car, Bike, and Rickshaw */}
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
      {/* --------------------------------------- */}

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

      <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
        <h2>👥 User Management</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '12px 0' }}>Name</th>
              <th>Email</th>
              <th>Driver Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 0', fontWeight: 'bold' }}>{u.name}</td>
                <td style={{ color: '#555' }}>{u.email}</td>
                <td>{u.driverProfile?.isApproved ? <span style={{ backgroundColor: '#e8f8f5', color: '#00D06C', padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>Verified</span> : <span style={{ backgroundColor: '#fdf0f4', color: '#e74c3c', padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>Unverified</span>}</td>
                <td style={{ display: 'flex', gap: '10px', paddingTop: '10px' }}>
                  {!u.driverProfile?.isApproved && <button onClick={() => approveDriver(u._id)} style={{ padding: '6px 12px', backgroundColor: '#00D06C', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Approve</button>}
                  <button onClick={() => deleteUser(u._id, u.name)} style={{ padding: '6px 12px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '15px' }}>
        <h2>🗺️ Ride Management</h2>
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '12px 0' }}>Vehicle</th>
              <th>Rider / Driver</th>
              <th>Route</th>
              <th>Agreed Fare</th>
              <th>Status</th>
              <th>Admin Action</th>
            </tr>
          </thead>
          <tbody>
            {rides.map(r => (
              <tr key={r._id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px 0' }}>{r.vehicleType}</td>
                <td>🙋‍♂️ {r.rider?.name || 'Deleted'}<br/>👨‍✈️ {r.driver?.name || 'Waiting'}</td>
                <td><span style={{color: 'green'}}>●</span> {r.pickupLocation} <br/><span style={{color: 'red'}}>●</span> {r.dropoffLocation}</td>
                <td style={{ fontWeight: 'bold', color: '#00D06C' }}>Rs. {r.acceptedFare || r.offeredFare}</td>
                <td><span style={{ backgroundColor: r.status === 'completed' ? '#2ecc71' : r.status === 'canceled' ? '#e74c3c' : '#f1c40f', color: r.status === 'pending' ? 'black' : 'white', padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>{r.status.toUpperCase()}</span></td>
                <td>
                  {r.status !== 'completed' && r.status !== 'canceled' ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button onClick={() => forceRideStatus(r._id, 'completed')} style={{ padding: '6px 10px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Complete</button>
                      <button onClick={() => forceRideStatus(r._id, 'canceled')} style={{ padding: '6px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}>Cancel</button>
                    </div>
                  ) : <span style={{ color: '#aaa', fontSize: '12px' }}>Done</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;