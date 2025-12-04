import { 
    auth, 
    db, 
    signOut,
    onAuthStateChanged,
    collection, 
    getDocs, 
    updateDoc, 
    doc,
    query,
    serverTimestamp,
    orderBy,
    addDoc,
    deleteDoc
} from './config.js';

// Global variables
let allOrders = [];
let allCustomers = [];
let currentUser = null;
let allProducts = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard loaded, initializing...');
    initDashboard();
});

async function initDashboard() {
    console.log('🔑 Checking authentication...');
    
    // Cek autentikasi
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            console.log('❌ No user logged in, redirecting to login');
            window.location.href = 'login.html';
        } else {
            console.log(`✅ User logged in: ${user.email}`);
            currentUser = user;
            
            // Update email di navbar
            const adminEmailEl = document.getElementById('adminEmail');
            if (adminEmailEl) {
                adminEmailEl.textContent = user.email;
            }
            
            // Load semua data
            await loadDashboardData();
            await loadProducts();
            
            // Setup event listeners
            setTimeout(() => {
                setupEventListeners();
                console.log('✅ Dashboard fully initialized');
            }, 100);
        }
    });
}

// Setup semua event listeners
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Toggle sidebar
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar-wrapper');
            if (sidebar) {
                sidebar.classList.toggle('active');
            }
        });
        console.log('✅ Menu toggle button setup');
    }
    
    // Navigation between sections
    document.querySelectorAll('#sidebar-wrapper a[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            
            // Update active state
            document.querySelectorAll('#sidebar-wrapper a[data-section]').forEach(l => {
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
                console.log(`Switched to section: ${section}`);
                
                // Load specific data if needed
                if (section === 'products') {
                    displayProducts();
                }
            }
        });
    });
    
    // Logout buttons
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
        console.log('✅ Logout button setup');
    }
    
    const logoutDropdownBtn = document.getElementById('logoutDropdownBtn');
    if (logoutDropdownBtn) {
        logoutDropdownBtn.addEventListener('click', handleLogout);
        console.log('✅ Logout dropdown button setup');
    }
    
    // Filter buttons
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
        applyFilterBtn.addEventListener('click', filterOrders);
        console.log('✅ Apply filter button setup');
    }
    
    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
        resetFilterBtn.addEventListener('click', resetFilters);
        console.log('✅ Reset filter button setup');
    }
    
    // Export button
    const exportOrdersBtn = document.getElementById('exportOrdersBtn');
    if (exportOrdersBtn) {
        exportOrdersBtn.addEventListener('click', exportOrdersToCSV);
        console.log('✅ Export button setup');
    }
    
    // View all orders button
    const viewAllOrdersBtn = document.querySelector('.view-all-orders');
    if (viewAllOrdersBtn) {
        viewAllOrdersBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const ordersLink = document.querySelector('[data-section="orders"]');
            if (ordersLink) {
                ordersLink.click();
            }
        });
        console.log('✅ View all orders button setup');
    }
    
    // Refresh button
    const refreshBtn = document.querySelector('[onclick="refreshDashboardData()"]');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.refreshDashboardData();
        });
    }
    
    // Products section buttons
    setupProductButtons();
    
    // Reports section buttons
    setupReportButtons();
    
    // Settings section
    setupSettings();
    
    console.log('✅ All event listeners setup complete');
}

// Setup product buttons
function setupProductButtons() {
    // Add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
        console.log('✅ Add product button setup');
    }
    
    // Save product button
    const saveProductBtn = document.getElementById('saveProductBtn');
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', saveProduct);
    }
    
    // Close product modal button
    const closeProductModalBtn = document.getElementById('closeProductModal');
    if (closeProductModalBtn) {
        closeProductModalBtn.addEventListener('click', () => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
            modal.hide();
        });
    }
}

// Setup report buttons
function setupReportButtons() {
    // Daily report
    const generateDailyReportBtn = document.getElementById('generateDailyReport');
    if (generateDailyReportBtn) {
        generateDailyReportBtn.addEventListener('click', generateDailyReport);
        console.log('✅ Daily report button setup');
    }
    
    // Monthly report
    const generateMonthlyReportBtn = document.getElementById('generateMonthlyReport');
    if (generateMonthlyReportBtn) {
        generateMonthlyReportBtn.addEventListener('click', generateMonthlyReport);
        console.log('✅ Monthly report button setup');
    }
    
    // Yearly report
    const generateYearlyReportBtn = document.getElementById('generateYearlyReport');
    if (generateYearlyReportBtn) {
        generateYearlyReportBtn.addEventListener('click', generateYearlyReport);
        console.log('✅ Yearly report button setup');
    }
}

// Setup settings
function setupSettings() {
    const appSettingsForm = document.getElementById('appSettingsForm');
    if (appSettingsForm) {
        appSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveSettings();
        });
    }
}

// Load dashboard data dari Firebase
async function loadDashboardData() {
    try {
        showLoading(true);
        console.log('📊 Loading data from Firebase...');
        
        // Load orders
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
        
        console.log(`✅ Found ${ordersSnapshot.size} orders`);
        
        ordersSnapshot.forEach(doc => {
            const orderData = doc.data();
            const order = { 
                id: doc.id, 
                ...orderData
            };
            
            // Convert timestamp
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
                        nama: order.nama || 'No Name',
                        email: order.email,
                        telepon: order.telepon || '-',
                        totalOrders: 0,
                        totalSpent: 0,
                        lastOrder: order.tanggalDate || new Date()
                    };
                }
                customerMap[order.email].totalOrders++;
                customerMap[order.email].totalSpent += parseFloat(order.totalHarga) || 0;
            }
            
            // Product stats
            if (order.produk) {
                productStats[order.produk] = (productStats[order.produk] || 0) + 1;
            }
            
            // Daily stats
            if (order.tanggalDate) {
                const dateStr = order.tanggalDate.toLocaleDateString('id-ID');
                dailyStats[dateStr] = (dailyStats[dateStr] || 0) + 1;
            }
        });
        
        allCustomers = Object.values(customerMap);
        
        // Update UI
        updateDashboardStats(allOrders.length, totalRevenue, pendingCount, customersSet.size);
        displayRecentOrders(allOrders.slice(0, 5));
        displayAllOrders(allOrders);
        displayCustomers(allCustomers);
        createCharts(dailyStats, productStats);
        
        showLoading(false);
        console.log('✅ Dashboard data loaded successfully');
        
    } catch (error) {
        console.error('❌ Error loading data:', error);
        showAlert('danger', 'Gagal memuat data: ' + error.message);
        showLoading(false);
    }
}

// Load products
async function loadProducts() {
    try {
        console.log('📦 Loading products...');
        
        const productsQuery = query(
            collection(db, 'products'),
            orderBy('nama')
        );
        
        const productsSnapshot = await getDocs(productsQuery);
        
        allProducts = [];
        productsSnapshot.forEach(doc => {
            allProducts.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log(`✅ Found ${allProducts.length} products`);
        
        // If no products in database, create default products
        if (allProducts.length === 0) {
            await createDefaultProducts();
            await loadProducts(); // Reload after creating
        }
        
    } catch (error) {
        console.error('❌ Error loading products:', error);
    }
}

// Create default products
async function createDefaultProducts() {
    console.log('Creating default products...');
    
    const defaultProducts = [
        {
            nama: 'Undangan',
            kategori: 'undangan',
            harga: 50000,
            stok: 999,
            status: 'active',
            deskripsi: 'Undangan pernikahan, ulang tahun, atau acara spesial',
            createdAt: serverTimestamp()
        },
        {
            nama: 'Kartu Nama',
            kategori: 'kartu-nama',
            harga: 25000,
            stok: 999,
            status: 'active',
            deskripsi: 'Kartu nama profesional untuk bisnis',
            createdAt: serverTimestamp()
        },
        {
            nama: 'Spanduk/Banner',
            kategori: 'spanduk',
            harga: 100000,
            stok: 999,
            status: 'active',
            deskripsi: 'Spanduk dan banner untuk promosi',
            createdAt: serverTimestamp()
        },
        {
            nama: 'Brosur/Flyer',
            kategori: 'brosur',
            harga: 30000,
            stok: 999,
            status: 'active',
            deskripsi: 'Brosur dan flyer untuk promosi',
            createdAt: serverTimestamp()
        },
        {
            nama: 'Poster',
            kategori: 'poster',
            harga: 40000,
            stok: 999,
            status: 'active',
            deskripsi: 'Poster untuk dekorasi atau promosi',
            createdAt: serverTimestamp()
        }
    ];
    
    try {
        for (const product of defaultProducts) {
            await addDoc(collection(db, 'products'), product);
        }
        console.log('✅ Default products created');
    } catch (error) {
        console.error('❌ Error creating default products:', error);
    }
}

// Update dashboard statistics
function updateDashboardStats(totalOrders, totalRevenue, pendingOrders, totalCustomers) {
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    updateElement('totalOrders', totalOrders);
    updateElement('totalRevenue', `Rp ${totalRevenue.toLocaleString('id-ID')}`);
    updateElement('pendingOrders', pendingOrders);
    updateElement('totalCustomers', totalCustomers);
    updateElement('totalDataCount', totalOrders);
    
    // Growth stats (simulated)
    const growthElements = {
        'orderGrowth': totalOrders > 0 ? '12%' : '0%',
        'revenueGrowth': totalRevenue > 0 ? '18%' : '0%',
        'customerGrowth': totalCustomers > 0 ? '8%' : '0%'
    };
    
    Object.entries(growthElements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    });
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
            order.tanggalDate.toLocaleDateString('id-ID') : 
            'N/A';
        
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
                <button class="btn btn-sm btn-outline-primary" onclick="viewOrderDetail('${order.id}')">
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
            order.tanggalDate.toLocaleDateString('id-ID') : 
            'N/A';
        
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
                    <button class="btn btn-outline-primary" onclick="viewOrderDetail('${order.id}')">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="updateOrderStatus('${order.id}', 'processing')">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="updateOrderStatus('${order.id}', 'cancelled')">
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
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    customers.sort((a, b) => b.totalSpent - a.totalSpent);
    
    customers.forEach((customer, index) => {
        const lastOrder = customer.lastOrder ? 
            customer.lastOrder.toLocaleDateString('id-ID') : 
            'N/A';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <strong>${customer.nama}</strong><br>
                <small class="text-muted">${customer.email}</small>
            </td>
            <td>${customer.email}</td>
            <td>${customer.telepon}</td>
            <td class="text-center"><span class="badge bg-primary">${customer.totalOrders}</span></td>
            <td class="text-end">Rp ${customer.totalSpent.toLocaleString('id-ID')}</td>
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

// Display products
function displayProducts() {
    const tbody = document.getElementById('productsBody');
    const bestSellersList = document.getElementById('bestSellersList');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (allProducts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-box-seam me-2"></i>Belum ada produk
                </td>
            </tr>
        `;
        
        if (bestSellersList) {
            bestSellersList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-info-circle me-2"></i>
                    Tidak ada data produk
                </div>
            `;
        }
        return;
    }
    
    // Display products table
    allProducts.forEach((product, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <strong>${product.nama}</strong>
                ${product.deskripsi ? `<br><small class="text-muted">${product.deskripsi}</small>` : ''}
            </td>
            <td>${getProductCategoryName(product.kategori)}</td>
            <td>Rp ${product.harga.toLocaleString('id-ID')}</td>
            <td>
                <span class="badge ${product.stok > 10 ? 'bg-success' : product.stok > 0 ? 'bg-warning' : 'bg-danger'}">
                    ${product.stok}
                </span>
            </td>
            <td>
                <span class="badge ${product.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                    ${product.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="editProduct('${product.id}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteProduct('${product.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Display best sellers
    if (bestSellersList) {
        // Calculate best sellers from orders
        const productSales = {};
        allOrders.forEach(order => {
            if (order.produk) {
                productSales[order.produk] = (productSales[order.produk] || 0) + (order.jumlah || 1);
            }
        });
        
        const sortedProducts = Object.entries(productSales)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
        
        if (sortedProducts.length > 0) {
            let html = '';
            sortedProducts.forEach(([productId, sales], index) => {
                const product = allProducts.find(p => p.kategori === productId) || { nama: getProductName(productId) };
                html += `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <div>
                            <span class="badge bg-primary me-2">${index + 1}</span>
                            ${product.nama}
                        </div>
                        <span class="badge bg-success">${sales} terjual</span>
                    </div>
                `;
            });
            bestSellersList.innerHTML = html;
        } else {
            bestSellersList.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-info-circle me-2"></i>
                    Belum ada data penjualan
                </div>
            `;
        }
    }
}

// Create charts
function createCharts(dailyStats, productStats) {
    // Order Chart
    const orderCtx = document.getElementById('orderChart');
    if (orderCtx && Object.keys(dailyStats).length > 0) {
        const dates = Object.keys(dailyStats).slice(-7); // Last 7 days
        const orderCounts = dates.map(date => dailyStats[date] || 0);
        
        // Clear previous chart
        if (window.orderChartInstance) {
            window.orderChartInstance.destroy();
        }
        
        window.orderChartInstance = new Chart(orderCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Pesanan',
                    data: orderCounts,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }
    
    // Product Chart
    const productCtx = document.getElementById('productChart');
    if (productCtx && Object.keys(productStats).length > 0) {
        const products = Object.keys(productStats);
        const productCounts = products.map(product => productStats[product]);
        const colors = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6c757d'];
        
        // Clear previous chart
        if (window.productChartInstance) {
            window.productChartInstance.destroy();
        }
        
        window.productChartInstance = new Chart(productCtx, {
            type: 'doughnut',
            data: {
                labels: products.map(p => getProductName(p)),
                datasets: [{
                    data: productCounts,
                    backgroundColor: colors
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Filter orders
function filterOrders() {
    console.log('🔍 Filtering orders...');
    
    const status = document.getElementById('filterStatus')?.value || '';
    const product = document.getElementById('filterProduct')?.value || '';
    const startDate = document.getElementById('filterStartDate')?.value;
    const endDate = document.getElementById('filterEndDate')?.value;
    
    let filteredOrders = [...allOrders];
    
    if (status) {
        filteredOrders = filteredOrders.filter(order => order.status === status);
        console.log(`Status filter "${status}": ${filteredOrders.length} orders`);
    }
    
    if (product) {
        filteredOrders = filteredOrders.filter(order => order.produk === product);
        console.log(`Product filter "${product}": ${filteredOrders.length} orders`);
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
    
    console.log(`Total filtered: ${filteredOrders.length} orders`);
    displayAllOrders(filteredOrders);
    
    if (filteredOrders.length === 0) {
        showAlert('info', 'Tidak ada pesanan yang sesuai dengan filter');
    } else {
        showAlert('success', `Menampilkan ${filteredOrders.length} pesanan`);
    }
}

// Reset filters
function resetFilters() {
    console.log('🔄 Resetting filters...');
    
    document.getElementById('filterStatus').value = '';
    document.getElementById('filterProduct').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    
    displayAllOrders(allOrders);
    showAlert('success', 'Filter telah direset');
}

// Export orders to CSV
function exportOrdersToCSV() {
    if (allOrders.length === 0) {
        showAlert('warning', 'Tidak ada data untuk diexport');
        return;
    }
    
    try {
        const headers = ['No. Pesanan', 'Nama', 'Email', 'Produk', 'Jumlah', 'Total', 'Tanggal', 'Status'];
        const csvData = allOrders.map(order => [
            order.nomorPesanan || '',
            order.nama || '',
            order.email || '',
            getProductName(order.produk),
            order.jumlah || 1,
            order.totalHarga || 0,
            order.tanggalDate ? order.tanggalDate.toLocaleDateString('id-ID') : '',
            order.status || 'pending'
        ]);
        
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.href = url;
        link.download = `pesanan_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showAlert('success', `Berhasil export ${allOrders.length} pesanan`);
        
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showAlert('danger', 'Gagal export data');
    }
}

// Generate reports
async function generateDailyReport() {
    try {
        showLoading(true);
        
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        const dailyOrders = allOrders.filter(order => {
            if (!order.tanggalDate) return false;
            return order.tanggalDate >= startOfDay && order.tanggalDate <= endOfDay;
        });
        
        const totalRevenue = dailyOrders.reduce((sum, order) => sum + (order.totalHarga || 0), 0);
        
        const reportContent = `
            LAPORAN HARIAN - ${today.toLocaleDateString('id-ID')}
            ===========================================
            Total Pesanan: ${dailyOrders.length}
            Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}
            Rata-rata per Pesanan: Rp ${dailyOrders.length > 0 ? Math.round(totalRevenue / dailyOrders.length).toLocaleString('id-ID') : 0}
            
            Detail Pesanan:
            ${dailyOrders.map((order, index) => `
            ${index + 1}. ${order.nomorPesanan} - ${order.nama} - ${getProductName(order.produk)} - Rp ${order.totalHarga.toLocaleString('id-ID')}
            `).join('')}
            
            Generated: ${new Date().toLocaleString('id-ID')}
        `;
        
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `laporan_harian_${today.toISOString().split('T')[0]}.txt`;
        link.click();
        
        showAlert('success', 'Laporan harian berhasil dihasilkan');
        
    } catch (error) {
        console.error('Error generating daily report:', error);
        showAlert('danger', 'Gagal membuat laporan');
    } finally {
        showLoading(false);
    }
}

async function generateMonthlyReport() {
    try {
        showLoading(true);
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        const monthlyOrders = allOrders.filter(order => {
            if (!order.tanggalDate) return false;
            return order.tanggalDate >= startOfMonth && order.tanggalDate <= endOfMonth;
        });
        
        const totalRevenue = monthlyOrders.reduce((sum, order) => sum + (order.totalHarga || 0), 0);
        
        const reportContent = `
            LAPORAN BULANAN - ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            ===============================================
            Total Pesanan: ${monthlyOrders.length}
            Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}
            Rata-rata per Hari: Rp ${Math.round(totalRevenue / 30).toLocaleString('id-ID')}
            
            Statistik Produk:
            ${getProductStats(monthlyOrders)}
            
            Generated: ${new Date().toLocaleString('id-ID')}
        `;
        
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `laporan_bulanan_${now.getFullYear()}_${now.getMonth() + 1}.txt`;
        link.click();
        
        showAlert('success', 'Laporan bulanan berhasil dihasilkan');
        
    } catch (error) {
        console.error('Error generating monthly report:', error);
        showAlert('danger', 'Gagal membuat laporan');
    } finally {
        showLoading(false);
    }
}

async function generateYearlyReport() {
    try {
        showLoading(true);
        
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        
        const yearlyOrders = allOrders.filter(order => {
            if (!order.tanggalDate) return false;
            return order.tanggalDate >= startOfYear && order.tanggalDate <= endOfYear;
        });
        
        const totalRevenue = yearlyOrders.reduce((sum, order) => sum + (order.totalHarga || 0), 0);
        
        const reportContent = `
            LAPORAN TAHUNAN - ${now.getFullYear()}
            ===================================
            Total Pesanan: ${yearlyOrders.length}
            Total Pendapatan: Rp ${totalRevenue.toLocaleString('id-ID')}
            Rata-rata per Bulan: Rp ${Math.round(totalRevenue / 12).toLocaleString('id-ID')}
            
            Ringkasan Bulanan:
            ${getMonthlyStats(yearlyOrders)}
            
            Generated: ${new Date().toLocaleString('id-ID')}
        `;
        
        const blob = new Blob([reportContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `laporan_tahunan_${now.getFullYear()}.txt`;
        link.click();
        
        showAlert('success', 'Laporan tahunan berhasil dihasilkan');
        
    } catch (error) {
        console.error('Error generating yearly report:', error);
        showAlert('danger', 'Gagal membuat laporan');
    } finally {
        showLoading(false);
    }
}

function getProductStats(orders) {
    const productStats = {};
    orders.forEach(order => {
        if (order.produk) {
            productStats[order.produk] = (productStats[order.produk] || 0) + 1;
        }
    });
    
    return Object.entries(productStats)
        .map(([product, count]) => `${getProductName(product)}: ${count} pesanan`)
        .join('\n');
}

function getMonthlyStats(orders) {
    const monthlyStats = {};
    orders.forEach(order => {
        if (order.tanggalDate) {
            const month = order.tanggalDate.getMonth();
            monthlyStats[month] = (monthlyStats[month] || 0) + 1;
        }
    });
    
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    return monthNames.map((month, index) => {
        const count = monthlyStats[index] || 0;
        return `${month}: ${count} pesanan`;
    }).join('\n');
}

// Product management
function showAddProductModal() {
    console.log('Showing add product modal');
    
    // Reset form
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = 'undangan';
    document.getElementById('productPrice').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productStatus').value = 'active';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('productModal'));
    modal.show();
}

async function saveProduct() {
    try {
        const productId = document.getElementById('productId').value;
        const productData = {
            nama: document.getElementById('productName').value,
            kategori: document.getElementById('productCategory').value,
            harga: parseInt(document.getElementById('productPrice').value),
            stok: parseInt(document.getElementById('productStock').value),
            deskripsi: document.getElementById('productDescription').value,
            status: document.getElementById('productStatus').value,
            updatedAt: serverTimestamp()
        };
        
        if (!productData.nama || !productData.harga || !productData.stok) {
            showAlert('warning', 'Harap isi semua field yang wajib');
            return;
        }
        
        if (productId) {
            // Update existing product
            await updateDoc(doc(db, 'products', productId), productData);
            showAlert('success', 'Produk berhasil diperbarui');
        } else {
            // Add new product
            productData.createdAt = serverTimestamp();
            await addDoc(collection(db, 'products'), productData);
            showAlert('success', 'Produk berhasil ditambahkan');
        }
        
        // Reload products
        await loadProducts();
        displayProducts();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('productModal'));
        modal.hide();
        
    } catch (error) {
        console.error('Error saving product:', error);
        showAlert('danger', 'Gagal menyimpan produk: ' + error.message);
    }
}

async function editProduct(productId) {
    try {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;
        
        // Fill form
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.nama;
        document.getElementById('productCategory').value = product.kategori;
        document.getElementById('productPrice').value = product.harga;
        document.getElementById('productStock').value = product.stok;
        document.getElementById('productDescription').value = product.deskripsi || '';
        document.getElementById('productStatus').value = product.status;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('productModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error editing product:', error);
        showAlert('danger', 'Gagal mengedit produk');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return;
    
    try {
        await deleteDoc(doc(db, 'products', productId));
        showAlert('success', 'Produk berhasil dihapus');
        
        // Reload products
        await loadProducts();
        displayProducts();
        
    } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('danger', 'Gagal menghapus produk');
    }
}

// Settings
async function saveSettings() {
    try {
        const email = document.getElementById('adminEmailInput').value;
        const notifications = document.getElementById('emailNotifications').checked;
        
        // Save to localStorage or your backend
        localStorage.setItem('adminSettings', JSON.stringify({
            email: email,
            notifications: notifications,
            savedAt: new Date().toISOString()
        }));
        
        showAlert('success', 'Pengaturan berhasil disimpan');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showAlert('danger', 'Gagal menyimpan pengaturan');
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

function getProductCategoryName(categoryCode) {
    const categories = {
        'undangan': 'Undangan',
        'kartu-nama': 'Kartu Nama',
        'spanduk': 'Spanduk/Banner',
        'brosur': 'Brosur/Flyer',
        'poster': 'Poster'
    };
    return categories[categoryCode] || categoryCode || 'Lainnya';
}

function getStatusBadge(status) {
    const badges = {
        'pending': { color: 'secondary', text: 'Menunggu' },
        'processing': { color: 'warning', text: 'Diproses' },
        'completed': { color: 'success', text: 'Selesai' },
        'cancelled': { color: 'danger', text: 'Dibatalkan' }
    };
    
    const badge = badges[status] || { color: 'secondary', text: status };
    return `<span class="badge bg-${badge.color}">${badge.text}</span>`;
}

// Global functions untuk onclick
window.viewOrderDetail = async function(orderId) {
    try {
        const order = allOrders.find(o => o.id === orderId);
        if (!order) {
            showAlert('warning', 'Pesanan tidak ditemukan');
            return;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('orderDetailModal'));
        const content = document.getElementById('orderDetailContent');
        
        const date = order.tanggalDate ? 
            order.tanggalDate.toLocaleDateString('id-ID') : 
            'N/A';
        
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Informasi Pesanan</h6>
                    <table class="table table-sm">
                        <tr><td><strong>No. Pesanan:</strong></td><td>${order.nomorPesanan || order.id}</td></tr>
                        <tr><td><strong>Tanggal:</strong></td><td>${date}</td></tr>
                        <tr><td><strong>Status:</strong></td><td>${getStatusBadge(order.status)}</td></tr>
                        <tr><td><strong>Total:</strong></td><td>Rp ${(order.totalHarga || 0).toLocaleString('id-ID')}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Informasi Pelanggan</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Nama:</strong></td><td>${order.nama || '-'}</td></tr>
                        <tr><td><strong>Email:</strong></td><td>${order.email || '-'}</td></tr>
                        <tr><td><strong>Telepon:</strong></td><td>${order.telepon || '-'}</td></tr>
                        <tr><td><strong>Alamat:</strong></td><td>${order.alamat || '-'}</td></tr>
                    </table>
                </div>
            </div>
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Detail Produk</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Produk:</strong></td><td>${getProductName(order.produk)}</td></tr>
                        <tr><td><strong>Ukuran:</strong></td><td>${order.ukuran || '-'}</td></tr>
                        <tr><td><strong>Kertas:</strong></td><td>${order.kertas || '-'}</td></tr>
                        <tr><td><strong>Jumlah:</strong></td><td>${order.jumlah || 1}</td></tr>
                        <tr><td><strong>Catatan:</strong></td><td>${order.catatan || 'Tidak ada'}</td></tr>
                        <tr><td><strong>File:</strong></td><td>${order.fileDesain || 'Tidak ada'}</td></tr>
                    </table>
                </div>
            </div>
            <div class="mt-3 text-end">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
            </div>
        `;
        
        modal.show();
        
    } catch (error) {
        console.error('Error viewing order:', error);
        showAlert('danger', 'Gagal memuat detail');
    }
};

window.updateOrderStatus = async function(orderId, newStatus) {
    if (!confirm(`Ubah status menjadi "${newStatus}"?`)) return;
    
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
        
        showAlert('success', `Status berhasil diubah menjadi "${newStatus}"`);
        
    } catch (error) {
        console.error('Error updating order:', error);
        showAlert('danger', 'Gagal mengubah status');
    }
};

window.viewCustomerOrders = function(customerEmail) {
    const customerOrders = allOrders.filter(order => order.email === customerEmail);
    if (customerOrders.length === 0) {
        showAlert('info', 'Tidak ada pesanan untuk pelanggan ini');
        return;
    }
    
    // Switch to orders section
    document.querySelector('[data-section="orders"]').click();
    
    // Reset filters
    resetFilters();
    
    // Show filtered orders
    displayAllOrders(customerOrders);
    showAlert('info', `Menampilkan ${customerOrders.length} pesanan dari ${customerEmail}`);
};

// Refresh data
window.refreshDashboardData = async function() {
    await loadDashboardData();
    await loadProducts();
    showAlert('success', 'Data berhasil diperbarui');
};

// Handle logout
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error logging out:', error);
        showAlert('danger', 'Gagal logout');
    }
}

// Utility functions
function showLoading(show) {
    if (show) {
        let loader = document.getElementById('loadingSpinner');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'loadingSpinner';
            loader.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
            loader.style.background = 'rgba(0,0,0,0.5)';
            loader.style.zIndex = '9999';
            loader.innerHTML = `
                <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">Loading...</span>
                </div>
            `;
            document.body.appendChild(loader);
        }
    } else {
        const loader = document.getElementById('loadingSpinner');
        if (loader) loader.remove();
    }
}

function showAlert(type, message) {
    // Remove existing alert
    const existingAlert = document.querySelector('.global-alert');
    if (existingAlert) existingAlert.remove();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `global-alert alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alertDiv.style.zIndex = '9998';
    alertDiv.style.maxWidth = '90%';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Auto refresh setiap 60 detik
setInterval(() => {
    if (document.visibilityState === 'visible' && currentUser) {
        console.log('🔄 Auto-refreshing data...');
        loadDashboardData();
    }
}, 60000);