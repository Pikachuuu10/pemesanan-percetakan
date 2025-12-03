import { 
    db, 
    collection, 
    addDoc, 
    getDocs,
    serverTimestamp 
} from './config.js';

// Global variables
let localOrders = [];
let firebaseStatus = 'unknown';

// DOM Elements
const localCountEl = document.getElementById('localCount');
const syncedCountEl = document.getElementById('syncedCount');
const unsyncedCountEl = document.getElementById('unsyncedCount');
const unsyncedTableEl = document.getElementById('unsyncedTable');
const syncHistoryTableEl = document.getElementById('syncHistoryTable');
const syncLogEl = document.getElementById('syncLog');
const firebaseProjectIdEl = document.getElementById('firebaseProjectId');
const firebaseStatusEl = document.getElementById('firebaseStatus');
const firestoreRulesEl = document.getElementById('firestoreRules');
const lastCheckTimeEl = document.getElementById('lastCheckTime');
const syncNowBtn = document.getElementById('syncNowBtn');
const checkFirebaseBtn = document.getElementById('checkFirebaseBtn');
const clearLocalBtn = document.getElementById('clearLocalBtn');
const loadingModal = new bootstrap.Modal(document.getElementById('loadingModal'));
const loadingMessageEl = document.getElementById('loadingMessage');
const progressBarEl = document.getElementById('progressBar');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    loadLocalData();
    checkFirebaseConnection();
    setupEventListeners();
    
    // Auto-check every 30 seconds
    setInterval(checkFirebaseConnection, 30000);
});

// Setup event listeners
function setupEventListeners() {
    syncNowBtn.addEventListener('click', syncAllOrders);
    checkFirebaseBtn.addEventListener('click', checkFirebaseConnection);
    clearLocalBtn.addEventListener('click', clearLocalData);
}

// Load data from localStorage
function loadLocalData() {
    try {
        localOrders = JSON.parse(localStorage.getItem('dealPrintingOrders') || '[]');
        updateStats();
        updateTables();
        addLog(`✅ Loaded ${localOrders.length} orders from localStorage`);
    } catch (error) {
        addLog(`❌ Error loading local data: ${error.message}`);
        localOrders = [];
    }
}

// Update statistics
function updateStats() {
    const total = localOrders.length;
    const synced = localOrders.filter(o => o.synced).length;
    const unsynced = localOrders.filter(o => !o.synced).length;
    
    localCountEl.textContent = total;
    syncedCountEl.textContent = synced;
    unsyncedCountEl.textContent = unsynced;
}

// Update tables
function updateTables() {
    // Unsynced table
    const unsyncedOrders = localOrders.filter(o => !o.synced);
    unsyncedTableEl.innerHTML = '';
    
    if (unsyncedOrders.length === 0) {
        unsyncedTableEl.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-3">
                    <i class="bi bi-check-circle me-2"></i>
                    Semua data sudah disinkron
                </td>
            </tr>
        `;
    } else {
        unsyncedOrders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><small>${order.nomorPesanan}</small></td>
                <td>${order.nama || '-'}</td>
                <td>Rp ${(order.totalHarga || 0).toLocaleString('id-ID')}</td>
            `;
            unsyncedTableEl.appendChild(row);
        });
    }
    
    // Sync history table
    const syncedOrders = localOrders
        .filter(o => o.synced)
        .sort((a, b) => new Date(b.syncedAt || b.localSavedAt) - new Date(a.syncedAt || a.localSavedAt))
        .slice(0, 10); // Show last 10
    
    syncHistoryTableEl.innerHTML = '';
    
    if (syncedOrders.length === 0) {
        syncHistoryTableEl.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-3">
                    <i class="bi bi-clock-history me-2"></i>
                    Belum ada riwayat sinkronisasi
                </td>
            </tr>
        `;
    } else {
        syncedOrders.forEach(order => {
            const syncTime = order.syncedAt ? 
                new Date(order.syncedAt).toLocaleTimeString('id-ID') : 
                new Date(order.localSavedAt).toLocaleTimeString('id-ID');
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><small>${order.nomorPesanan}</small></td>
                <td>${syncTime}</td>
                <td>
                    <span class="badge bg-success">
                        <i class="bi bi-check-circle me-1"></i>Synced
                    </span>
                </td>
            `;
            syncHistoryTableEl.appendChild(row);
        });
    }
}

// Check Firebase connection
async function checkFirebaseConnection() {
    showLoading('Checking Firebase connection...');
    
    try {
        // Get project info from config
        const projectId = import.meta.url.includes('firebase') ? 
            'deal-printing-app' : 'Unknown';
        firebaseProjectIdEl.textContent = projectId;
        
        // Try to read from Firestore
        const testQuery = await getDocs(collection(db, 'orders'));
        const count = testQuery.size;
        
        firebaseStatus = 'connected';
        firebaseStatusEl.className = 'badge bg-success';
        firebaseStatusEl.innerHTML = `<i class="bi bi-wifi"></i> Connected`;
        firestoreRulesEl.className = 'badge bg-success';
        firestoreRulesEl.textContent = 'Read/Write OK';
        
        lastCheckTimeEl.textContent = new Date().toLocaleTimeString('id-ID');
        
        addLog(`✅ Firebase connected. Found ${count} orders in database.`);
        
    } catch (error) {
        firebaseStatus = 'disconnected';
        firebaseStatusEl.className = 'badge bg-danger';
        firebaseStatusEl.innerHTML = `<i class="bi bi-wifi-off"></i> Disconnected`;
        firestoreRulesEl.className = 'badge bg-danger';
        firestoreRulesEl.textContent = 'Permission Denied';
        
        lastCheckTimeEl.textContent = new Date().toLocaleTimeString('id-ID');
        
        addLog(`❌ Firebase error: ${error.code} - ${error.message}`);
        
        if (error.code === 'permission-denied') {
            addLog(`⚠️ Please check Firestore Rules in Firebase Console`);
        }
    } finally {
        hideLoading();
    }
}

// Sync all orders to Firebase
async function syncAllOrders() {
    const unsyncedOrders = localOrders.filter(o => !o.synced);
    
    if (unsyncedOrders.length === 0) {
        addLog('ℹ️ No orders to sync');
        return;
    }
    
    if (firebaseStatus !== 'connected') {
        addLog('❌ Cannot sync: Firebase not connected');
        alert('Firebase tidak terhubung. Cek koneksi dan Rules terlebih dahulu.');
        return;
    }
    
    showLoading(`Syncing ${unsyncedOrders.length} orders...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < unsyncedOrders.length; i++) {
        const order = unsyncedOrders[i];
        const progress = Math.round((i / unsyncedOrders.length) * 100);
        progressBarEl.style.width = `${progress}%`;
        loadingMessageEl.textContent = `Syncing ${i + 1} of ${unsyncedOrders.length}...`;
        
        try {
            // Prepare data for Firestore
            const { isLocal, localSavedAt, localId, synced, ...firestoreData } = order;
            
            const firestoreOrder = {
                ...firestoreData,
                syncedFromLocal: true,
                originalLocalId: localId,
                localSavedAt: order.localSavedAt,
                syncedAt: serverTimestamp(),
                status: 'pending'
            };
            
            // Save to Firestore
            const docRef = await addDoc(collection(db, 'orders'), firestoreOrder);
            
            // Update local order
            order.synced = true;
            order.firestoreId = docRef.id;
            order.syncedAt = new Date().toISOString();
            successCount++;
            
            addLog(`✅ ${order.nomorPesanan} → ${docRef.id}`);
            
        } catch (error) {
            errorCount++;
            addLog(`❌ ${order.nomorPesanan}: ${error.code}`);
        }
        
        // Update localStorage periodically
        if (i % 5 === 0 || i === unsyncedOrders.length - 1) {
            localStorage.setItem('dealPrintingOrders', JSON.stringify(localOrders));
        }
    }
    
    // Final update
    progressBarEl.style.width = '100%';
    localStorage.setItem('dealPrintingOrders', JSON.stringify(localOrders));
    
    hideLoading();
    
    // Show results
    const message = `Sinkronisasi selesai: ${successCount} berhasil, ${errorCount} gagal`;
    addLog(`📊 ${message}`);
    
    alert(message);
    
    // Refresh display
    updateStats();
    updateTables();
}

// Clear local data
function clearLocalData() {
    if (!confirm('Hapus semua data lokal? Data yang sudah disinkron akan hilang dari perangkat ini.')) {
        return;
    }
    
    if (confirm('Yakin? Tindakan ini tidak dapat dibatalkan.')) {
        localStorage.removeItem('dealPrintingOrders');
        addLog('🗑️ All local data cleared');
        loadLocalData();
    }
}

// Add log message
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString('id-ID', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    const logEntry = document.createElement('div');
    logEntry.innerHTML = `<span class="text-muted">[${timestamp}]</span> ${message}`;
    
    syncLogEl.prepend(logEntry);
    
    // Keep only last 50 log entries
    const entries = syncLogEl.querySelectorAll('div');
    if (entries.length > 50) {
        for (let i = 50; i < entries.length; i++) {
            entries[i].remove();
        }
    }
    
    // Auto scroll to top
    syncLogEl.scrollTop = 0;
}

// Show loading modal
function showLoading(message) {
    loadingMessageEl.textContent = message;
    progressBarEl.style.width = '0%';
    loadingModal.show();
}

// Hide loading modal
function hideLoading() {
    setTimeout(() => {
        loadingModal.hide();
    }, 500);
}

// Export function for manual sync
window.manualSync = async function() {
    await syncAllOrders();
};

// Auto-sync when online
window.addEventListener('online', () => {
    addLog('🌐 Device is online, checking for sync...');
    checkFirebaseConnection();
    
    const unsyncedCount = localOrders.filter(o => !o.synced).length;
    if (unsyncedCount > 0 && firebaseStatus === 'connected') {
        addLog(`🔄 Found ${unsyncedCount} orders to sync`);
        setTimeout(() => syncAllOrders(), 3000);
    }
});

window.addEventListener('offline', () => {
    addLog('📴 Device is offline');
    firebaseStatusEl.className = 'badge bg-secondary';
    firebaseStatusEl.innerHTML = `<i class="bi bi-wifi-off"></i> Offline`;
});