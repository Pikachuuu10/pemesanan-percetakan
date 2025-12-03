import { 
    auth, 
    db, 
    signOut,
    onAuthStateChanged,
    collection, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    doc,
    query,
    where,
    serverTimestamp,
    orderBy
    // HAPUS: limit (karena tidak ada di config.js)
} from './config.js';

// Global variables
let allOrders = [];
let allCustomers = [];
let currentUser = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

async function initDashboard() {
    // Cek autentikasi
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            // Redirect ke login jika belum login
            window.location.href = 'login.html';
        } else {
            currentUser = user;
            const adminEmailEl = document.getElementById('adminEmail');
            if (adminEmailEl) {
                adminEmailEl.textContent = user.email;
            }
            
            // Load semua data
            await loadDashboardData();
            setupEventListeners();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Toggle sidebar
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar-wrapper');
            if (sidebar) {
                sidebar.classList.toggle('active');
            }
        });
    }
    
    // Navigation between sections
    document.querySelectorAll('#sidebar-wrapper a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            
            // Update active state
            document.querySelectorAll('#sidebar-wrapper a').forEach(l => {
                l.classList.remove('active');
            });
            this.classList.add('active');
            
            // Show selected section
            document.querySelectorAll('.dashboard-section').forEach(sec => {
                sec.classList.add('d-none');
            });
            
            const targetSection = document.getElementById(section);
            if (targetSection) {
                targetSection.classList.remove('d-none');
            }
        });
    });
    
    // Logout buttons
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
    if (logoutDropdownBtn) {
        logoutDropdownBtn.addEventListener('click', handleLogout);
    }
    
    // Filter orders
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', filterOrders);
    }
    
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetFilters);
    }
    
    // Export orders
    const exportOrdersBtn = document.getElementById('exportOrdersBtn');
    if (exportOrdersBtn) {
        exportOrdersBtn.addEventListener('click', exportOrdersToCSV);
    }
    
    // View all orders
    const viewAllOrdersBtn = document.querySelector('.view-all-orders');
    if (viewAllOrdersBtn) {
        viewAllOrdersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const ordersLink = document.querySelector('[data-section="orders"]');
            if (ordersLink) ordersLink.click();
        });
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        showLoading(true);
        console.log('📊 Loading dashboard data from Firebase...');
        
        // Load orders dari Firebase
        const ordersQuery = query(
            collection(db, 'orders'),
            orderBy('tanggal', 'desc')
        );
        
        const ordersSnapshot = await getDocs(ordersQuery);
        
        allOrders = [];
        let totalRevenue = 0;
        let pendingCount = 0;
        const customersSet = new Set();
        const productStats = {};
        const dailyStats = {};
        const customerMap = {};
        
        console.log(`✅ Found ${ordersSnapshot.size} orders in Firebase`);
        
        ordersSnapshot.forEach(doc => {
            try {
                const orderData = doc.data();
                console.log('Order data:', orderData);
                
                const order = { 
                    id: doc.id, 
                    ...orderData
                };
                
                // Convert Firestore timestamp to Date jika ada
                if (order.tanggal && typeof order.tanggal.toDate === 'function') {
                    order.tanggalDate = order.tanggal.toDate();
                } else if (order.tanggal) {
                    order.tanggalDate = new Date(order.tanggal);
                }
                
                allOrders.push(order);
                
                // Calculate stats
                totalRevenue += parseFloat(order.totalHarga) || 0;
                if (order.status === 'pending') pendingCount++;
                
                // Customer stats
                if (order.email) {
                    customersSet.add(order.email);
                    if (!customerMap[order.email]) {
                        customerMap[order.email] = {
                            nama: order.nama || 'Tidak ada nama',
                            email: order.email,
                            telepon: order.telepon || '-',
                            totalOrders: 0,
                            totalSpent: 0,
                            lastOrder: order.tanggalDate || new Date()
                        };
                    }
                    customerMap[order.email].totalOrders++;
                    customerMap[order.email].totalSpent += parseFloat(order.totalHarga) || 0;
                    
                    // Update last order date
                    const currentLastOrder = customerMap[order.email].lastOrder;
                    if (order.tanggalDate && (!currentLastOrder || order.tanggalDate > currentLastOrder)) {
                        customerMap[order.email].lastOrder = order.tanggalDate;
                    }
                }
                
                // Product stats
                if (order.produk) {
                    productStats[order.produk] = (productStats[order.produk] || 0) + 1;
                }
                
                // Daily stats (last 30 days)
                if (order.tanggalDate) {
                    const dateStr = order.tanggalDate.toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    dailyStats[dateStr] = (dailyStats[dateStr] || 0) + 1;
                }
                
            } catch (error) {
                console.error('Error processing order:', error);
            }
        });
        
        allCustomers = Object.values(customerMap);
        
        console.log('📈 Statistics:', {
            totalOrders: allOrders.length,
            totalRevenue,
            pendingCount,
            uniqueCustomers: customersSet.size
        });
        
        // Update UI
        updateDashboardStats(allOrders.length, totalRevenue, pendingCount, customersSet.size);
        displayRecentOrders(allOrders.slice(0, 5));
        displayAllOrders(allOrders);
        displayCustomers(allCustomers);
        createCharts(dailyStats, productStats);
        
        // Juga load data dari localStorage untuk sinkronisasi
        await loadLocalData();
        
        showLoading(false);
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showAlert('danger', `Gagal memuat data: ${error.message}`);
        
        // Coba load dari localStorage sebagai fallback
        try {
            await loadLocalData();
        } catch (localError) {
            console.error('❌ Error loading local data:', localError);
        }
        
        showLoading(false);
    }
}

// Load data dari localStorage
async function loadLocalData() {
    try {
        const localOrders = JSON.parse(localStorage.getItem('dealPrintingOrders') || '[]');
        const unsyncedOrders = localOrders.filter(order => order.isLocal && !order.synced);
        
        if (unsyncedOrders.length > 0) {
            console.log(`📱 Found ${unsyncedOrders.length} unsynced local orders`);
            
            // Tampilkan notifikasi
            showAlert('warning', 
                `Ada ${unsyncedOrders.length} pesanan yang belum disinkron ke server. 
                <a href="admin-sync.html" class="alert-link">Sinkronkan sekarang</a>`
            );
        }
        
    } catch (error) {
        console.error('Error loading local data:', error);
    }
}

// Update dashboard statistics
function updateDashboardStats(totalOrders, totalRevenue, pendingOrders, totalCustomers) {
    // Update elements jika ada
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    updateElement('totalOrders', totalOrders);
    updateElement('totalRevenue', `Rp ${totalRevenue.toLocaleString('id-ID')}`);
    updateElement('pendingOrders', pendingOrders);
    updateElement('totalCustomers', totalCustomers);
    updateElement('totalDataCount', totalOrders);
    
    // Calculate growth (simulated for now)
    const orderGrowth = totalOrders > 0 ? Math.floor(Math.random() * 20) + 5 : 0;
    const revenueGrowth = totalRevenue > 0 ? Math.floor(Math.random() * 25) + 8 : 0;
    const customerGrowth = totalCustomers > 0 ? Math.floor(Math.random() * 15) + 3 : 0;
    
    const orderGrowthEl = document.getElementById('orderGrowth');
    const revenueGrowthEl = document.getElementById('revenueGrowth');
    const customerGrowthEl = document.getElementById('customerGrowth');
    
    if (orderGrowthEl) orderGrowthEl.textContent = `${orderGrowth}%`;
    if (revenueGrowthEl) revenueGrowthEl.textContent = `${revenueGrowth}%`;
    if (customerGrowthEl) customerGrowthEl.textContent = `${customerGrowth}%`;
}

// Display recent orders
function displayRecentOrders(orders) {
    const tbody = document.getElementById('recentOrdersBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-inbox me-2"></i>Belum ada pesanan
                </td>
            </tr>
        `;
        return;
    }
    
    orders.forEach(order => {
        const date = order.tanggalDate ? 
            order.tanggalDate.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }) : 
            (order.tanggal ? new Date(order.tanggal).toLocaleDateString('id-ID') : 'N/A');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong class="d-block">${order.nomorPesanan || 'DP-' + order.id.slice(0, 8)}</strong>
                <small class="text-muted">${order.id}</small>
            </td>
            <td>
                <div class="fw-medium">${order.nama || '-'}</div>
                <small class="text-muted">${order.email || ''}</small>
            </td>
            <td>${getProductName(order.produk)}</td>
            <td><small>${date}</small></td>
            <td class="text-end">Rp ${(order.totalHarga || 0).toLocaleString('id-ID')}</td>
            <td>${getStatusBadge(order.status)}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary btn-action" onclick="viewOrderDetail('${order.id}')">
                    <i class="bi bi-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Display all orders
function displayAllOrders(orders) {
    const tbody = document.getElementById('ordersBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <div class="py-5">
                        <i class="bi bi-inbox display-1 text-muted mb-3"></i>
                        <h5>Belum ada pesanan</h5>
                        <p class="text-muted">Data pesanan akan muncul di sini</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    orders.forEach((order, index) => {
        const date = order.tanggalDate ? 
            order.tanggalDate.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }) : 
            (order.tanggal ? new Date(order.tanggal).toLocaleDateString('id-ID') : 'N/A');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <strong class="d-block">${order.nomorPesanan || 'DP-' + order.id.slice(0, 8)}</strong>
                <small class="text-muted">${order.id}</small>
            </td>
            <td>
                <div class="fw-medium">${order.nama || '-'}</div>
                <small class="text-muted">${order.email || ''}</small>
                ${order.telepon ? `<br><small class="text-muted">${order.telepon}</small>` : ''}
            </td>
            <td>${getProductName(order.produk)}</td>
            <td class="text-center">${order.jumlah || 1}</td>
            <td class="text-end">Rp ${(order.totalHarga || 0).toLocaleString('id-ID')}</td>
            <td><small>${date}</small></td>
            <td>${getStatusBadge(order.status)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="viewOrderDetail('${order.id}')" title="Lihat Detail">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="updateOrderStatus('${order.id}', 'processing')" title="Proses Pesanan">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="updateOrderStatus('${order.id}', 'cancelled')" title="Batalkan">
                        <i class="bi bi-x-circle"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Display customers
function displayCustomers(customers) {
    const tbody = document.getElementById('customersBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center text-muted py-4">
                    <div class="py-5">
                        <i class="bi bi-people display-1 text-muted mb-3"></i>
                        <h5>Belum ada pelanggan</h5>
                        <p class="text-muted">Data pelanggan akan muncul di sini</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort customers by total spent (descending)
    customers.sort((a, b) => b.totalSpent - a.totalSpent);
    
    customers.forEach((customer, index) => {
        const lastOrder = customer.lastOrder ? 
            customer.lastOrder.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }) : 
            'N/A';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <strong class="d-block">${customer.nama || '-'}</strong>
                <small class="text-muted">${customer.email || '-'}</small>
            </td>
            <td>${customer.email || '-'}</td>
            <td>${customer.telepon || '-'}</td>
            <td class="text-center">
                <span class="badge bg-primary">${customer.totalOrders || 0}</span>
            </td>
            <td class="text-end">Rp ${(customer.totalSpent || 0).toLocaleString('id-ID')}</td>
            <td><small>${lastOrder}</small></td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewCustomerOrders('${customer.email}')">
                    <i class="bi bi-list-ul"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Create charts
function createCharts(dailyStats, productStats) {
    console.log('Creating charts with data:', { dailyStats, productStats });
    
    // Prepare data for order chart
    const dates = Object.keys(dailyStats);
    const orderCounts = dates.map(date => dailyStats[date] || 0);
    
    // Order Chart
    const orderCtx = document.getElementById('orderChart');
    if (orderCtx && dates.length > 0) {
        try {
            // Destroy existing chart jika ada
            if (window.orderChartInstance) {
                window.orderChartInstance.destroy();
            }
            
            window.orderChartInstance = new Chart(orderCtx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: 'Jumlah Pesanan',
                        data: orderCounts,
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13, 110, 253, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Pesanan: ${context.raw}`;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                callback: function(value) {
                                    return Number.isInteger(value) ? value : '';
                                }
                            }
                        },
                        x: {
                            ticks: {
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating order chart:', error);
        }
    } else if (orderCtx) {
        orderCtx.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-bar-chart display-4 mb-3"></i>
                <p>Tidak ada data untuk ditampilkan</p>
            </div>
        `;
    }
    
    // Product Chart
    const productCtx = document.getElementById('productChart');
    if (productCtx && Object.keys(productStats).length > 0) {
        try {
            const products = Object.keys(productStats);
            const productCounts = products.map(product => productStats[product]);
            const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d', '#0dcaf0'];
            
            // Destroy existing chart jika ada
            if (window.productChartInstance) {
                window.productChartInstance.destroy();
            }
            
            window.productChartInstance = new Chart(productCtx, {
                type: 'doughnut',
                data: {
                    labels: products.map(p => getProductName(p)),
                    datasets: [{
                        data: productCounts,
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: ${value} pesanan (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creating product chart:', error);
        }
    } else if (productCtx) {
        productCtx.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="bi bi-pie-chart display-4 mb-3"></i>
                <p>Tidak ada data produk untuk ditampilkan</p>
            </div>
        `;
    }
}

// Filter orders
function filterOrders() {
    const status = document.getElementById('filterStatus')?.value || '';
    const product = document.getElementById('filterProduct')?.value || '';
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    
    console.log('Filtering with:', { status, product, startDate, endDate });
    
    let filteredOrders = [...allOrders];
    
    if (status) {
        filteredOrders = filteredOrders.filter(order => order.status === status);
    }
    
    if (product) {
        filteredOrders = filteredOrders.filter(order => order.produk === product);
    }
    
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filteredOrders = filteredOrders.filter(order => {
            if (!order.tanggalDate) return false;
            return order.tanggalDate >= start;
        });
    }
    
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filteredOrders = filteredOrders.filter(order => {
            if (!order.tanggalDate) return false;
            return order.tanggalDate <= end;
        });
    }
    
    console.log(`Filtered to ${filteredOrders.length} orders`);
    displayAllOrders(filteredOrders);
}

// Reset filters
function resetFilters() {
    const filterStatus = document.getElementById('filterStatus');
    const filterProduct = document.getElementById('filterProduct');
    const filterStartDate = document.getElementById('filterStartDate');
    const filterEndDate = document.getElementById('filterEndDate');
    
    if (filterStatus) filterStatus.value = '';
    if (filterProduct) filterProduct.value = '';
    if (filterStartDate) filterStartDate.value = '';
    if (filterEndDate) filterEndDate.value = '';
    
    displayAllOrders(allOrders);
}

// Export orders to CSV
function exportOrdersToCSV() {
    if (allOrders.length === 0) {
        showAlert('warning', 'Tidak ada data untuk diexport');
        return;
    }
    
    try {
        const headers = ['No. Pesanan', 'Nama', 'Email', 'Telepon', 'Produk', 'Jumlah', 'Total', 'Tanggal', 'Status', 'Catatan'];
        
        const csvData = allOrders.map(order => [
            order.nomorPesanan || '',
            order.nama || '',
            order.email || '',
            order.telepon || '',
            getProductName(order.produk),
            order.jumlah || 1,
            order.totalHarga || 0,
            order.tanggalDate ? order.tanggalDate.toLocaleDateString('id-ID') : '',
            order.status || 'pending',
            order.catatan || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `pesanan_deal_printing_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('success', `Berhasil export ${allOrders.length} pesanan`);
        
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showAlert('danger', 'Gagal export data: ' + error.message);
    }
}

// Helper functions
function getProductName(productCode) {
    const products = {
        'undangan': 'Undangan',
        'kartu-nama': 'Kartu Nama',
        'spanduk': 'Spanduk/Banner',
        'brosur': 'Brosur/Flyer',
        'poster': 'Poster'
    };
    return products[productCode] || productCode || 'Tidak Diketahui';
}

function getStatusBadge(status) {
    const badges = {
        'pending': { 
            color: 'secondary', 
            text: 'Menunggu',
            icon: 'bi-clock'
        },
        'processing': { 
            color: 'warning', 
            text: 'Diproses',
            icon: 'bi-gear'
        },
        'completed': { 
            color: 'success', 
            text: 'Selesai',
            icon: 'bi-check-circle'
        },
        'cancelled': { 
            color: 'danger', 
            text: 'Dibatalkan',
            icon: 'bi-x-circle'
        },
        'pending-local': {
            color: 'info',
            text: 'Lokal',
            icon: 'bi-device-ssd'
        }
    };
    
    const badge = badges[status] || { 
        color: 'secondary', 
        text: status || 'pending',
        icon: 'bi-question-circle'
    };
    
    return `
        <span class="badge bg-${badge.color} d-flex align-items-center gap-1">
            <i class="bi ${badge.icon}"></i>
            ${badge.text}
        </span>
    `;
}

// Global functions (accessible from HTML onclick)
window.viewOrderDetail = async function(orderId) {
    try {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) {
            showAlert('warning', 'Pesanan tidak ditemukan');
            return;
        }
        
        const modalElement = document.getElementById('orderDetailModal');
        if (!modalElement) {
            showAlert('warning', 'Modal tidak ditemukan');
            return;
        }
        
        const modal = new bootstrap.Modal(modalElement);
        const content = document.getElementById('orderDetailContent');
        
        const date = order.tanggalDate ? 
            order.tanggalDate.toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 
            (order.tanggal ? new Date(order.tanggal).toLocaleDateString('id-ID') : 'N/A');
        
        // Format untuk table detail
        const detailRows = [
            { label: 'No. Pesanan', value: order.nomorPesanan || order.id },
            { label: 'Tanggal Pesan', value: date },
            { label: 'Status', value: getStatusBadge(order.status) },
            { label: 'Total Harga', value: `Rp ${(order.totalHarga || 0).toLocaleString('id-ID')}` }
        ];
        
        const customerRows = [
            { label: 'Nama Lengkap', value: order.nama || '-' },
            { label: 'Email', value: order.email || '-' },
            { label: 'Telepon', value: order.telepon || '-' },
            { label: 'Alamat', value: order.alamat || '-' }
        ];
        
        const productRows = [
            { label: 'Produk', value: getProductName(order.produk) },
            { label: 'Ukuran', value: order.ukuran || '-' },
            { label: 'Jenis Kertas', value: order.kertas || '-' },
            { label: 'Jumlah', value: order.jumlah || 1 },
            { label: 'Catatan', value: order.catatan || 'Tidak ada catatan' },
            { label: 'File Desain', value: order.fileDesain || 'Tidak ada file' }
        ];
        
        // Tambahkan informasi sync jika ada
        const extraInfo = [];
        if (order.syncedFromLocal) {
            extraInfo.push('<div class="alert alert-info mt-3">' +
                '<i class="bi bi-info-circle me-2"></i>' +
                'Pesanan ini disinkron dari data lokal' +
                '</div>');
        }
        
        if (order.isLocal && !order.synced) {
            extraInfo.push('<div class="alert alert-warning mt-3">' +
                '<i class="bi bi-exclamation-triangle me-2"></i>' +
                'Pesanan ini masih tersimpan secara lokal' +
                '</div>');
        }
        
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-primary text-white">
                            <h6 class="mb-0"><i class="bi bi-receipt me-2"></i>Informasi Pesanan</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm">
                                <tbody>
                                    ${detailRows.map(row => `
                                        <tr>
                                            <td class="fw-medium" style="width: 40%">${row.label}</td>
                                            <td>${row.value}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header bg-success text-white">
                            <h6 class="mb-0"><i class="bi bi-person me-2"></i>Informasi Pelanggan</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm">
                                <tbody>
                                    ${customerRows.map(row => `
                                        <tr>
                                            <td class="fw-medium" style="width: 40%">${row.label}</td>
                                            <td>${row.value}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header bg-info text-white">
                            <h6 class="mb-0"><i class="bi bi-box-seam me-2"></i>Detail Produk</h6>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm">
                                <tbody>
                                    ${productRows.map(row => `
                                        <tr>
                                            <td class="fw-medium" style="width: 30%">${row.label}</td>
                                            <td>${row.value}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            ${extraInfo.join('')}
            
            <div class="mt-3 text-end">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
            </div>
        `;
        
        modal.show();
        
    } catch (error) {
        console.error('Error viewing order:', error);
        showAlert('danger', 'Gagal memuat detail pesanan: ' + error.message);
    }
};

window.updateOrderStatus = async function(orderId, newStatus) {
    if (!confirm(`Ubah status pesanan menjadi "${newStatus}"?`)) return;
    
    try {
        const orderRef = doc(db, 'orders', orderId);
        await updateDoc(orderRef, {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        
        // Update local data
        const orderIndex = allOrders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            allOrders[orderIndex].status = newStatus;
        }
        
        // Refresh displays
        displayRecentOrders(allOrders.slice(0, 5));
        displayAllOrders(allOrders);
        
        showAlert('success', `Status pesanan berhasil diubah menjadi "${newStatus}"`);
        
    } catch (error) {
        console.error('Error updating order:', error);
        
        let errorMessage = 'Gagal mengubah status pesanan: ';
        if (error.code === 'permission-denied') {
            errorMessage += 'Anda tidak memiliki izin untuk mengubah data.';
        } else {
            errorMessage += error.message;
        }
        
        showAlert('danger', errorMessage);
    }
};

window.viewCustomerOrders = function(customerEmail) {
    const customerOrders = allOrders.filter(order => order.email === customerEmail);
    if (customerOrders.length === 0) {
        showAlert('info', 'Tidak ada pesanan untuk pelanggan ini');
        return;
    }
    
    // Switch to orders section and filter
    const ordersLink = document.querySelector('[data-section="orders"]');
    if (ordersLink) {
        ordersLink.click();
    }
    
    // Set filter untuk email ini
    const filterStatus = document.getElementById('filterStatus');
    const filterProduct = document.getElementById('filterProduct');
    const filterStartDate = document.getElementById('filterStartDate');
    const filterEndDate = document.getElementById('filterEndDate');
    
    if (filterStatus) filterStatus.value = '';
    if (filterProduct) filterProduct.value = '';
    if (filterStartDate) filterStartDate.value = '';
    if (filterEndDate) filterEndDate.value = '';
    
    // Tidak ada filter email di UI, jadi tampilkan semua dan beri pesan
    showAlert('info', `Menampilkan ${customerOrders.length} pesanan dari ${customerEmail}`);
    displayAllOrders(customerOrders);
};

// Refresh data button (tambahkan ke dashboard jika perlu)
window.refreshDashboardData = async function() {
    await loadDashboardData();
    showAlert('success', 'Data berhasil diperbarui');
};

// Handle logout
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error logging out:', error);
        showAlert('danger', 'Gagal logout: ' + error.message);
    }
}

// Utility functions
function showLoading(show) {
    if (show) {
        // Cek apakah loading spinner sudah ada
        let loader = document.getElementById('loadingSpinner');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loadingSpinner';
            loader.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
            loader.style.background = 'rgba(0,0,0,0.5)';
            loader.style.zIndex = '9999';
            loader.innerHTML = `
                <div class="text-center">
                    <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                    <p class="text-white">Memuat data...</p>
                </div>
            `;
            document.body.appendChild(loader);
        }
    } else {
        const loader = document.getElementById('loadingSpinner');
        if (loader) {
            loader.remove();
        }
    }
}

function showAlert(type, message) {
    // Hapus alert sebelumnya
    const existingAlert = document.querySelector('.global-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const icons = {
        'success': 'bi-check-circle',
        'danger': 'bi-exclamation-triangle',
        'warning': 'bi-exclamation-circle',
        'info': 'bi-info-circle'
    };
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `global-alert alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9998';
    alertDiv.style.maxWidth = '90%';
    alertDiv.innerHTML = `
        <i class="bi ${icons[type] || 'bi-info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto-hide setelah 5 detik
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Auto-refresh data setiap 30 detik
setInterval(async () => {
    if (document.visibilityState === 'visible' && currentUser) {
        console.log('🔄 Auto-refreshing dashboard data...');
        await loadDashboardData();
    }
}, 30000);