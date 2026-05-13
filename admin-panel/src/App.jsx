import { useState, useEffect } from 'react';
import axios from 'axios';

// ⚠️ CHANGE TO YOUR LIVE RENDER URL 
const API_URL = 'https://taykar-backend.onrender.com';

const BRAND = '#00D06C';
const DARK_BG = '#03060A';
const CARD_BG = '#0A121A';
const BORDER = '#1A2634';

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('adminToken'));

  const [users, setUsers] = useState([]);
  const [rides, setRides] = useState([]);
  const [settings, setSettings] = useState({ Car: { baseFare: 150, perKmRate: 40, driverBonus: 50 }, Bike: { baseFare: 50, perKmRate: 15, driverBonus: 20 }, Rickshaw: { baseFare: 80, perKmRate: 25, driverBonus: 30 } });
  
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, users, rides, settings
  const [userSearch, setUserSearch] = useState('');
  const [rideSearch, setRideSearch] = useState('');
  
  const [docModalUser, setDocModalUser] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  useEffect(() => { if (token) fetchData(); }, [token]);

  const showToast = (message) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

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
      showToast("System Authenticated.");
    } catch (error) { alert("Access Denied: Invalid Credentials"); }
  };

  const handleLogout = () => { setToken(null); localStorage.removeItem('adminToken'); };

  // --- ADMIN ACTIONS ---
  const saveSettings = async () => {
    try {
      await axios.put(`${API_URL}/api/admin/settings`, settings, { headers: { Authorization: `Bearer ${token}` } });
      showToast("Global Pricing Updated!");
    } catch (error) { alert("Error saving settings."); }
  };

  const approveDriver = async (userId) => {
    try { await axios.put(`${API_URL}/api/admin/approve-driver/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } }); showToast("Driver Approved!"); fetchData(); } catch (e) {}
  };

  const suspendUser = async (userId, userName) => {
    if (!window.confirm(`Suspend ${userName}'s access?`)) return;
    try { await axios.put(`${API_URL}/api/admin/users/${userId}/suspend`, {}, { headers: { Authorization: `Bearer ${token}` } }); showToast("User Suspended."); fetchData(); } catch (e) {}
  };

  const deleteUser = async (userId, userName) => {
    if (!window.confirm(`Permanently Delete ${userName}?`)) return;
    try { await axios.delete(`${API_URL}/api/admin/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } }); showToast("User Deleted."); fetchData(); } catch (e) {}
  };

  const forceRideStatus = async (rideId, newStatus) => {
    if (!window.confirm(`Mark as ${newStatus}?`)) return;
    try { await axios.put(`${API_URL}/api/admin/rides/${rideId}/status`, { status: newStatus }, { headers: { Authorization: `Bearer ${token}` } }); showToast(`Ride ${newStatus}!`); fetchData(); } catch (e) {}
  };

  const deleteRide = async (rideId) => {
    if (!window.confirm(`Permanently delete this ride?`)) return;
    try { await axios.delete(`${API_URL}/api/admin/rides/${rideId}`, { headers: { Authorization: `Bearer ${token}` } }); showToast("Ride Log Deleted."); fetchData(); } catch (e) {}
  };

  // --- ANALYTICS & SEARCH FILTERS ---
  const completedRides = rides.filter(r => r.status === 'completed');
  const activeRides = rides.filter(r => r.status === 'accepted' || r.status === 'pending');
  const totalRevenue = completedRides.reduce((sum, ride) => sum + (ride.acceptedFare || 0), 0);
  const platformCut = (totalRevenue * 0.10).toFixed(2);
  const pendingDrivers = users.filter(u => u.activeRole === 'driver' && !u.driverProfile?.isApproved).length;

  const filteredUsers = users.filter(u => 
    (u.firstName + ' ' + u.lastName).toLowerCase().includes(userSearch.toLowerCase()) || 
    u.phoneNumber.includes(userSearch)
  );

  const filteredRides = rides.filter(r => 
    r.pickupLocation.toLowerCase().includes(rideSearch.toLowerCase()) || 
    r.dropoffLocation.toLowerCase().includes(rideSearch.toLowerCase()) ||
    r.status.toLowerCase().includes(rideSearch.toLowerCase())
  );

  // --- LOGIN SCREEN ---
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: DARK_BG, display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ width: '400px', padding: '40px', backgroundColor: CARD_BG, borderRadius: '20px', border: `1px solid ${BORDER}`, boxShadow: `0 0 30px rgba(0, 208, 108, 0.1)` }}>
          <h1 style={{ textAlign: 'center', color: BRAND, letterSpacing: '2px', fontSize: '32px', margin: '0 0 10px 0' }}>TAYKAR</h1>
          <p style={{ textAlign: 'center', color: '#88929E', marginBottom: '30px', letterSpacing: '1px' }}>SECURE ADMIN PORTAL</p>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <input type="email" placeholder="Admin Email" value={email} onChange={e => setEmail(e.target.value)} style={styles.input} />
            <input type="password" placeholder="Master Password" value={password} onChange={e => setPassword(e.target.value)} style={styles.input} />
            <button type="submit" style={styles.btnPrimary}>INITIALIZE SESSION</button>
          </form>
        </div>
      </div>
    );
  }

  // --- MAIN ADMIN LAYOUT ---
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: DARK_BG, fontFamily: 'sans-serif', color: 'white' }}>
      
      {/* 🚀 CUSTOM TOAST NOTIFICATION */}
      {toast.show && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', backgroundColor: BRAND, color: DARK_BG, padding: '15px 25px', borderRadius: '10px', fontWeight: 'bold', zIndex: 9999, boxShadow: '0 5px 15px rgba(0,208,108,0.4)', animation: 'fadeIn 0.3s ease' }}>
          ✓ {toast.message}
        </div>
      )}

      {/* 📱 SIDEBAR NAVIGATION */}
      <div style={{ width: '260px', backgroundColor: CARD_BG, borderRight: `1px solid ${BORDER}`, padding: '30px 20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ color: BRAND, letterSpacing: '3px', margin: '0 0 40px 10px', fontSize: '28px' }}>TAYKAR_</h2>
        
        <button onClick={() => setActiveTab('dashboard')} style={activeTab === 'dashboard' ? styles.navBtnActive : styles.navBtn}>📊 Dashboard</button>
        <button onClick={() => setActiveTab('users')} style={activeTab === 'users' ? styles.navBtnActive : styles.navBtn}>👥 User Network</button>
        <button onClick={() => setActiveTab('rides')} style={activeTab === 'rides' ? styles.navBtnActive : styles.navBtn}>🗺️ Live Transit</button>
        <button onClick={() => setActiveTab('settings')} style={activeTab === 'settings' ? styles.navBtnActive : styles.navBtn}>⚙️ Global Settings</button>
        
        <div style={{ flex: 1 }} />
        <button onClick={handleLogout} style={{ ...styles.navBtn, color: '#ff4757' }}>🚪 Terminate Session</button>
      </div>

      {/* 🖥️ MAIN CONTENT AREA */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '900' }}>{activeTab.toUpperCase()} PROTOCOL</h1>
            <p style={{ color: '#88929E', margin: '5px 0 0 0' }}>System Status: <span style={{ color: BRAND }}>Online</span></p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ color: '#88929E', fontWeight: 'bold' }}>Admin</span>
            <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: BRAND, display: 'flex', justifyContent: 'center', alignItems: 'center', color: DARK_BG, fontWeight: '900', fontSize: '20px' }}>A</div>
          </div>
        </div>

        {/* --- TAB 1: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>TOTAL USERS</p>
                <h2 style={styles.statNumber}>{users.length}</h2>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>COMPLETED RIDES</p>
                <h2 style={styles.statNumber}>{completedRides.length}</h2>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>ACTIVE RIDES</p>
                <h2 style={styles.statNumber}><span style={{ color: '#3498db' }}>{activeRides.length}</span></h2>
              </div>
              <div style={{ ...styles.statCard, borderColor: BRAND, backgroundColor: 'rgba(0,208,108,0.05)' }}>
                <p style={{ ...styles.statLabel, color: BRAND }}>PLATFORM REVENUE</p>
                <h2 style={{ ...styles.statNumber, color: BRAND }}>Rs. {platformCut}</h2>
              </div>
            </div>

            {pendingDrivers > 0 && (
              <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', border: '1px solid #e74c3c', padding: '20px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#e74c3c' }}>⚠️ Action Required</h3>
                  <p style={{ margin: '5px 0 0 0', color: '#ff7979' }}>You have {pendingDrivers} driver(s) waiting for document verification.</p>
                </div>
                <button onClick={() => setActiveTab('users')} style={styles.btnPrimary}>Review Documents</button>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 2: USERS --- */}
        {activeTab === 'users' && (
          <div style={styles.tableContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Network Personnel</h2>
              <input type="text" placeholder="🔍 Search Name or Phone..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={styles.searchInput} />
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHead}>
                  <th style={styles.th}>USER INFO</th>
                  <th style={styles.th}>CONTACT</th>
                  <th style={styles.th}>ROLE / STATUS</th>
                  <th style={styles.th}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => (
                  <tr key={u._id} style={styles.trBody}>
                    <td style={styles.td}>
                      <strong style={{ fontSize: '16px' }}>{u.firstName || u.name} {u.lastName || ''}</strong><br/>
                      <span style={{ color: '#88929E', fontSize: '12px' }}>📍 {u.city || 'Unknown'}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: BRAND }}>{u.phoneNumber}</span><br/>
                      <span style={{ color: '#88929E', fontSize: '12px' }}>{u.email}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={{ marginBottom: '5px' }}>{u.activeRole === 'driver' ? '👨‍✈️ Driver' : '🙋‍♂️ Rider'}</div>
                      {u.activeRole === 'driver' && (
                        u.driverProfile?.isApproved ? <span style={styles.badgeSuccess}>Verified</span> : <span style={styles.badgeWarning}>Pending Review</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {u.activeRole === 'driver' && (
                          <button onClick={() => setDocModalUser(u)} style={styles.btnInfo}>View Docs</button>
                        )}
                        {u.activeRole === 'driver' && !u.driverProfile?.isApproved && (
                          <button onClick={() => approveDriver(u._id)} style={styles.btnSuccess}>Approve</button>
                        )}
                        {u.activeRole === 'driver' && u.driverProfile?.isApproved && (
                          <button onClick={() => suspendUser(u._id, u.firstName)} style={styles.btnWarning}>Suspend</button>
                        )}
                        <button onClick={() => deleteUser(u._id, u.firstName || u.name)} style={styles.btnDanger}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- TAB 3: RIDES --- */}
        {activeTab === 'rides' && (
          <div style={styles.tableContainer}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Global Transit Logs</h2>
              <input type="text" placeholder="🔍 Search Routes or Status..." value={rideSearch} onChange={e => setRideSearch(e.target.value)} style={styles.searchInput} />
            </div>
            <table style={styles.table}>
              <thead>
                <tr style={styles.trHead}>
                  <th style={styles.th}>VEHICLE</th>
                  <th style={styles.th}>PERSONNEL</th>
                  <th style={styles.th}>ROUTE DATA</th>
                  <th style={styles.th}>FARE</th>
                  <th style={styles.th}>STATUS / ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredRides.map(r => (
                  <tr key={r._id} style={styles.trBody}>
                    <td style={styles.td}>{r.vehicleType === 'Bike' ? '🏍️' : r.vehicleType === 'Rickshaw' ? '🛺' : '🚗'} {r.vehicleType}</td>
                    <td style={styles.td}>
                      <span style={{color: '#88929E'}}>Rider:</span> {r.rider?.firstName || r.rider?.name || 'Deleted'}<br/>
                      <span style={{color: '#88929E'}}>Driver:</span> {r.driver?.firstName || r.driver?.name || 'Waiting'}
                    </td>
                    <td style={styles.td} style={{ fontSize: '13px', maxWidth: '250px' }}>
                      <span style={{color: BRAND}}>●</span> {r.pickupLocation} <br/>
                      <span style={{color: '#ff4757'}}>●</span> {r.dropoffLocation}
                    </td>
                    <td style={{ ...styles.td, color: BRAND, fontWeight: 'bold' }}>Rs. {r.acceptedFare || r.offeredFare}</td>
                    <td style={styles.td}>
                      <span style={{ 
                        ...styles.badgeSuccess, 
                        backgroundColor: r.status === 'completed' ? 'rgba(0,208,108,0.1)' : r.status === 'canceled' ? 'rgba(255,71,87,0.1)' : 'rgba(52, 152, 219, 0.1)', 
                        color: r.status === 'completed' ? BRAND : r.status === 'canceled' ? '#ff4757' : '#3498db'
                      }}>
                        {r.status.toUpperCase()}
                      </span>
                      {r.status !== 'completed' && r.status !== 'canceled' && (
                        <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                          <button onClick={() => forceRideStatus(r._id, 'completed')} style={styles.btnSuccess}>Force Finish</button>
                          <button onClick={() => forceRideStatus(r._id, 'canceled')} style={styles.btnDanger}>Cancel</button>
                        </div>
                      )}
                      <button onClick={() => deleteRide(r._id)} style={{...styles.btnDanger, marginTop: '5px', backgroundColor: 'transparent', border: '1px solid #ff4757'}}>Delete Log</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- TAB 4: SETTINGS --- */}
        {activeTab === 'settings' && (
          <div style={{ ...styles.tableContainer, maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <h2 style={{ margin: 0 }}>Global Pricing & Algorithm</h2>
              <button onClick={saveSettings} style={styles.btnPrimary}>Save Configuration</button>
            </div>

            {['Car', 'Bike', 'Rickshaw'].map((vehicle) => (
              <div key={vehicle} style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: DARK_BG, padding: '25px', borderRadius: '15px', marginBottom: '15px', border: `1px solid ${BORDER}` }}>
                <div style={{ width: '120px', textAlign: 'center' }}>
                  <span style={{ fontSize: '40px' }}>{vehicle === 'Car' ? '🚗' : vehicle === 'Bike' ? '🏍️' : '🛺'}</span>
                  <h3 style={{ margin: '5px 0 0 0', color: 'white' }}>{vehicle}</h3>
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Base Fare (Rs.)</label>
                  <input type="number" value={settings[vehicle]?.baseFare || 0} onChange={(e) => setSettings({...settings, [vehicle]: {...settings[vehicle], baseFare: Number(e.target.value)}})} style={styles.inputDark} />
                </div>
                
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Per KM Rate (Rs.)</label>
                  <input type="number" value={settings[vehicle]?.perKmRate || 0} onChange={(e) => setSettings({...settings, [vehicle]: {...settings[vehicle], perKmRate: Number(e.target.value)}})} style={styles.inputDark} />
                </div>

                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Driver Bonus (Rs.)</label>
                  <input type="number" value={settings[vehicle]?.driverBonus || 0} onChange={(e) => setSettings({...settings, [vehicle]: {...settings[vehicle], driverBonus: Number(e.target.value)}})} style={styles.inputDark} />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* 📸 DOCUMENT VIEWER MODAL */}
      {docModalUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(3,6,10,0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
          <div style={{ backgroundColor: CARD_BG, padding: '30px', borderRadius: '20px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${BORDER}`, boxShadow: `0 0 40px rgba(0, 208, 108, 0.1)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h2 style={{ margin: 0 }}>Driver Documents</h2>
                <p style={{ margin: '5px 0 0 0', color: '#88929E' }}>{docModalUser.firstName} {docModalUser.lastName} • 🚗 {docModalUser.driverProfile?.vehicleInfo} ({docModalUser.driverProfile?.licensePlate})</p>
              </div>
              <button onClick={() => setDocModalUser(null)} style={{ padding: '10px 20px', backgroundColor: '#ff4757', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Close Scanner</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={styles.imgBox}>
                <h3 style={styles.imgTitle}>🪪 CNIC Front</h3>
                {docModalUser.driverProfile?.cnicFront ? <img src={docModalUser.driverProfile.cnicFront} style={styles.docImage} /> : <p style={{color: '#888'}}>No image uploaded</p>}
              </div>
              <div style={styles.imgBox}>
                <h3 style={styles.imgTitle}>🪪 CNIC Back</h3>
                {docModalUser.driverProfile?.cnicBack ? <img src={docModalUser.driverProfile.cnicBack} style={styles.docImage} /> : <p style={{color: '#888'}}>No image uploaded</p>}
              </div>
              <div style={{ ...styles.imgBox, gridColumn: 'span 2' }}>
                <h3 style={styles.imgTitle}>📄 Vehicle Documents</h3>
                {docModalUser.driverProfile?.vehicleDocs ? <img src={docModalUser.driverProfile.vehicleDocs} style={{...styles.docImage, maxHeight: '400px'}} /> : <p style={{color: '#888'}}>No image uploaded</p>}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- CSS IN JS OBJECTS ---
const styles = {
  input: { padding: '15px', borderRadius: '10px', border: `1px solid ${BORDER}`, backgroundColor: DARK_BG, color: 'white', fontSize: '16px', outline: 'none' },
  inputDark: { width: '100%', padding: '12px', borderRadius: '8px', border: `1px solid ${BORDER}`, backgroundColor: CARD_BG, color: 'white', fontSize: '16px', outline: 'none', marginTop: '8px' },
  label: { color: '#88929E', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
  
  navBtn: { padding: '15px', backgroundColor: 'transparent', color: '#88929E', border: 'none', textAlign: 'left', fontSize: '16px', cursor: 'pointer', borderRadius: '10px', marginBottom: '5px', fontWeight: '600', transition: 'all 0.2s' },
  navBtnActive: { padding: '15px', backgroundColor: 'rgba(0, 208, 108, 0.1)', color: BRAND, border: `1px solid ${BRAND}`, textAlign: 'left', fontSize: '16px', cursor: 'pointer', borderRadius: '10px', marginBottom: '5px', fontWeight: 'bold' },
  
  statCard: { backgroundColor: CARD_BG, padding: '25px', borderRadius: '15px', border: `1px solid ${BORDER}` },
  statLabel: { margin: '0 0 10px 0', color: '#88929E', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
  statNumber: { margin: 0, fontSize: '40px', color: 'white', fontWeight: '900' },
  
  tableContainer: { backgroundColor: CARD_BG, padding: '30px', borderRadius: '20px', border: `1px solid ${BORDER}` },
  searchInput: { padding: '10px 20px', borderRadius: '10px', border: `1px solid ${BORDER}`, backgroundColor: DARK_BG, color: 'white', width: '300px', outline: 'none' },
  table: { width: '100%', textAlign: 'left', borderCollapse: 'collapse' },
  trHead: { borderBottom: `2px solid ${BORDER}` },
  th: { padding: '15px 10px', color: '#88929E', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' },
  trBody: { borderBottom: `1px solid ${BORDER}` },
  td: { padding: '15px 10px', color: '#E1E7EF' },
  
  btnPrimary: { padding: '12px 20px', backgroundColor: BRAND, color: DARK_BG, border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '900', letterSpacing: '1px' },
  btnSuccess: { padding: '6px 12px', backgroundColor: BRAND, color: DARK_BG, border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  btnInfo: { padding: '6px 12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  btnWarning: { padding: '6px 12px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  btnDanger: { padding: '6px 12px', backgroundColor: '#ff4757', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  
  badgeSuccess: { backgroundColor: 'rgba(0, 208, 108, 0.1)', color: BRAND, padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' },
  badgeWarning: { backgroundColor: 'rgba(243, 156, 18, 0.1)', color: '#f39c12', padding: '5px 10px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold', display: 'inline-block' },

  imgBox: { backgroundColor: DARK_BG, padding: '15px', borderRadius: '15px', border: `1px solid ${BORDER}`, textAlign: 'center' },
  imgTitle: { color: '#88929E', fontSize: '14px', marginTop: 0, marginBottom: '15px' },
  docImage: { width: '100%', maxHeight: '250px', objectFit: 'contain', borderRadius: '10px' }
};

export default App;