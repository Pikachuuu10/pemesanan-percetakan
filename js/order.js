import { db, addDoc, collection, serverTimestamp } from './config.js';

// Harga produk
const hargaProduk = {
    'undangan': 50000,
    'kartu-nama': 25000,
    'spanduk': 100000,
    'brosur': 30000,
    'poster': 40000
};

// Referensi elemen DOM
const orderForm = document.getElementById('orderForm');
const produkSelect = document.getElementById('produk');
const jumlahInput = document.getElementById('jumlah');
const ringkasanPesanan = document.getElementById('ringkasanPesanan');
const totalHarga = document.getElementById('totalHarga');
const fileUploadArea = document.querySelector('.file-upload-area');
const fileInput = document.getElementById('fileDesain');

// Fungsi untuk menghitung total harga
function hitungTotalHarga() {
    const produk = produkSelect.value;
    const jumlah = parseInt(jumlahInput.value) || 1;
    
    if (produk && hargaProduk[produk]) {
        const subtotal = hargaProduk[produk] * jumlah;
        ringkasanPesanan.innerHTML = `
            <tr>
                <td>${getNamaProduk(produk)}</td>
                <td>${jumlah} item</td>
                <td class="text-end">Rp ${(hargaProduk[produk] * jumlah).toLocaleString('id-ID')}</td>
            </tr>
        `;
        totalHarga.textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;
    } else {
        ringkasanPesanan.innerHTML = `
            <tr>
                <td colspan="3" class="text-center">Pilih produk terlebih dahulu</td>
            </tr>
        `;
        totalHarga.textContent = 'Rp 0';
    }
}

// Helper function untuk mendapatkan nama produk
function getNamaProduk(kode) {
    const namaProduk = {
        'undangan': 'Undangan',
        'kartu-nama': 'Kartu Nama',
        'spanduk': 'Spanduk/Banner',
        'brosur': 'Brosur/Flyer',
        'poster': 'Poster'
    };
    return namaProduk[kode] || kode;
}

// Event listeners
produkSelect.addEventListener('change', hitungTotalHarga);
jumlahInput.addEventListener('input', hitungTotalHarga);

// Drag and drop file upload
fileUploadArea.addEventListener('click', () => fileInput.click());

fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
        fileInput.files = e.dataTransfer.files;
        updateFileInfo();
    }
});

fileInput.addEventListener('change', updateFileInfo);

function updateFileInfo() {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const fileName = file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name;
        fileUploadArea.innerHTML = `
            <i class="bi bi-file-earmark-check text-success display-4 mb-3"></i>
            <h6>${fileName}</h6>
            <p class="text-muted small">${(file.size / 1024).toFixed(2)} KB</p>
            <button type="button" class="btn btn-sm btn-outline-danger" id="removeFile">Hapus File</button>
        `;
        
        document.getElementById('removeFile').addEventListener('click', (e) => {
            e.stopPropagation();
            fileInput.value = '';
            resetFileUploadArea();
        });
    }
}

function resetFileUploadArea() {
    fileUploadArea.innerHTML = `
        <i class="bi bi-cloud-upload display-4 text-muted mb-3"></i>
        <h5>Drag & drop file desain Anda di sini</h5>
        <p class="text-muted">atau</p>
        <div class="mb-3">
            <label for="fileDesain" class="btn btn-outline-primary">
                <i class="bi bi-upload me-2"></i>Pilih File
            </label>
        </div>
        <p class="text-muted small">Format: PDF, JPG, PNG, AI, PSD (Max. 10MB)</p>
        <input type="file" class="form-control d-none" id="fileDesain" accept=".pdf,.jpg,.jpeg,.png,.ai,.psd">
    `;
    
    // Re-attach event listener
    const newFileInput = document.getElementById('fileDesain');
    newFileInput.addEventListener('change', updateFileInfo);
    
    fileUploadArea.addEventListener('click', () => newFileInput.click());
}

// Fungsi untuk menampilkan pesan
function showMessage(type, message, duration = 5000) {
    // Hapus pesan sebelumnya
    const existingMessage = document.querySelector('.alert-dismissible');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    const icons = {
        'success': 'bi-check-circle',
        'error': 'bi-exclamation-triangle',
        'warning': 'bi-exclamation-circle',
        'info': 'bi-info-circle'
    };
    
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    };
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${alertClass[type]} alert-dismissible fade show position-fixed top-20 start-50 translate-middle-x z-3`;
    messageDiv.style.zIndex = '9999';
    messageDiv.innerHTML = `
        <i class="bi ${icons[type]} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(messageDiv);
    
    // Auto remove setelah beberapa detik
    if (duration > 0) {
        setTimeout(() => {
            if (messageDiv.parentElement) {
                messageDiv.remove();
            }
        }, duration);
    }
    
    return messageDiv;
}

// Fungsi untuk menampilkan loading
function showLoading(show) {
    if (show) {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'globalLoading';
        loadingDiv.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
        loadingDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
        loadingDiv.style.zIndex = '9998';
        loadingDiv.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem;"></div>
                <p class="text-white">Menyimpan pesanan...</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
    } else {
        const loadingDiv = document.getElementById('globalLoading');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
}

// Fungsi untuk menyimpan pesanan ke Firebase
async function saveOrderToFirebase(orderData) {
    try {
        console.log('Mencoba menyimpan ke Firebase:', orderData);
        
        const docRef = await addDoc(collection(db, 'orders'), orderData);
        console.log('✅ Berhasil disimpan ke Firebase dengan ID:', docRef.id);
        
        return {
            success: true,
            firestoreId: docRef.id,
            message: 'Pesanan berhasil disimpan ke server'
        };
        
    } catch (error) {
        console.error('❌ Error Firebase:', error);
        return {
            success: false,
            error: error,
            message: `Gagal menyimpan ke Firebase: ${error.code} - ${error.message}`
        };
    }
}

// Fungsi untuk menyimpan pesanan ke localStorage
function saveOrderToLocalStorage(orderData) {
    try {
        // Ambil data yang ada
        const existingOrders = JSON.parse(localStorage.getItem('dealPrintingOrders') || '[]');
        
        // Tambahkan timestamp lokal
        orderData.localSavedAt = new Date().toISOString();
        orderData.isLocal = true;
        orderData.localId = 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Simpan
        existingOrders.push(orderData);
        localStorage.setItem('dealPrintingOrders', JSON.stringify(existingOrders));
        
        console.log('✅ Berhasil disimpan ke localStorage:', orderData);
        
        return {
            success: true,
            localId: orderData.localId,
            count: existingOrders.length,
            message: 'Pesanan berhasil disimpan secara lokal'
        };
        
    } catch (error) {
        console.error('❌ Error localStorage:', error);
        return {
            success: false,
            error: error,
            message: 'Gagal menyimpan ke localStorage'
        };
    }
}

// Fungsi untuk sync data lokal ke Firebase
async function syncLocalOrdersToFirebase() {
    try {
        const localOrders = JSON.parse(localStorage.getItem('dealPrintingOrders') || '[]');
        const unsyncedOrders = localOrders.filter(order => order.isLocal && !order.synced);
        
        if (unsyncedOrders.length === 0) {
            console.log('Tidak ada data lokal yang perlu disinkron');
            return { success: true, synced: 0 };
        }
        
        console.log(`🔄 Mencoba sinkron ${unsyncedOrders.length} pesanan lokal...`);
        
        let syncedCount = 0;
        let failedCount = 0;
        
        for (const order of unsyncedOrders) {
            try {
                // Copy order tanpa data lokal
                const { isLocal, localSavedAt, localId, synced, ...firestoreOrder } = order;
                
                // Coba simpan ke Firebase
                const docRef = await addDoc(collection(db, 'orders'), {
                    ...firestoreOrder,
                    syncedFromLocal: true,
                    originalLocalId: localId,
                    syncedAt: serverTimestamp()
                });
                
                // Tandai sebagai sudah sync
                order.synced = true;
                order.firestoreId = docRef.id;
                order.syncedAt = new Date().toISOString();
                syncedCount++;
                
                console.log(`✅ Disinkronkan: ${order.nomorPesanan} → ${docRef.id}`);
                
            } catch (error) {
                console.error(`❌ Gagal sinkron ${order.nomorPesanan}:`, error);
                failedCount++;
            }
        }
        
        // Update localStorage
        localStorage.setItem('dealPrintingOrders', JSON.stringify(localOrders));
        
        // Hapus data yang sudah lebih dari 7 hari
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const cleanedOrders = localOrders.filter(order => {
            if (!order.synced) return true;
            const syncedDate = new Date(order.syncedAt || order.localSavedAt);
            return syncedDate > oneWeekAgo;
        });
        
        localStorage.setItem('dealPrintingOrders', JSON.stringify(cleanedOrders));
        
        return {
            success: true,
            synced: syncedCount,
            failed: failedCount,
            total: unsyncedOrders.length
        };
        
    } catch (error) {
        console.error('❌ Error sinkronisasi:', error);
        return {
            success: false,
            error: error,
            message: 'Gagal sinkronisasi'
        };
    }
}

// Fungsi utama untuk menyimpan pesanan
async function processOrderSubmission(formData) {
    // Generate nomor pesanan
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    const nomorPesanan = `DP-${timestamp.toString().slice(-6)}-${randomNum.toString().padStart(3, '0')}`;
    
    // Siapkan data pesanan
    const orderData = {
        nomorPesanan,
        nama: formData.nama,
        email: formData.email,
        telepon: formData.telepon,
        alamat: formData.alamat,
        produk: formData.produk,
        ukuran: formData.ukuran,
        kertas: formData.kertas,
        jumlah: formData.jumlah,
        catatan: formData.catatan,
        totalHarga: formData.totalHarga,
        status: 'pending',
        tanggal: serverTimestamp(),
        fileDesain: formData.fileName,
        metadata: {
            userAgent: navigator.userAgent,
            screenSize: `${window.screen.width}x${window.screen.height}`,
            timestamp: new Date().toISOString()
        }
    };
    
    // Coba simpan ke Firebase dulu
    const firebaseResult = await saveOrderToFirebase(orderData);
    
    if (firebaseResult.success) {
        return {
            success: true,
            source: 'firebase',
            nomorPesanan: orderData.nomorPesanan,
            firestoreId: firebaseResult.firestoreId,
            message: 'Pesanan berhasil disimpan ke server'
        };
    }
    
    // Jika Firebase gagal, simpan ke localStorage
    console.log('Firebase gagal, mencoba localStorage...');
    
    // Tambahkan fallback timestamp untuk localStorage
    const localOrderData = {
        ...orderData,
        tanggal: new Date().toISOString()  // Ganti dengan string untuk localStorage
    };
    
    const localStorageResult = saveOrderToLocalStorage(localOrderData);
    
    if (localStorageResult.success) {
        return {
            success: true,
            source: 'localStorage',
            nomorPesanan: orderData.nomorPesanan,
            localId: localStorageResult.localId,
            message: 'Pesanan disimpan secara lokal. Akan disinkron nanti.',
            warning: '⚠️ Data disimpan lokal karena koneksi server bermasalah.'
        };
    }
    
    // Jika kedua metode gagal
    return {
        success: false,
        source: 'none',
        message: 'Gagal menyimpan pesanan. Silakan coba lagi atau hubungi kami langsung.'
    };
}

// Submit form
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validasi form
    const requiredFields = ['nama', 'email', 'telepon', 'alamat', 'produk', 'ukuran', 'jumlah'];
    let isValid = true;
    let firstInvalidField = null;
    
    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('is-invalid');
            
            if (!firstInvalidField) {
                firstInvalidField = field;
            }
        } else {
            field.classList.remove('is-invalid');
        }
    }
    
    if (!isValid) {
        showMessage('warning', 'Harap isi semua field yang wajib diisi.');
        if (firstInvalidField) {
            firstInvalidField.focus();
        }
        return;
    }
    
    // Kumpulkan data form
    const formData = {
        nama: document.getElementById('nama').value.trim(),
        email: document.getElementById('email').value.trim(),
        telepon: document.getElementById('telepon').value.trim(),
        alamat: document.getElementById('alamat').value.trim(),
        produk: produkSelect.value,
        ukuran: document.getElementById('ukuran').value,
        kertas: document.getElementById('kertas').value,
        jumlah: parseInt(jumlahInput.value),
        catatan: document.getElementById('catatan').value.trim(),
        totalHarga: hargaProduk[produkSelect.value] * parseInt(jumlahInput.value),
        fileName: fileInput.files[0] ? fileInput.files[0].name : null
    };
    
    // Tampilkan loading
    showLoading(true);
    
    // Nonaktifkan tombol submit
    const submitBtn = orderForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';
    
    try {
        // Proses penyimpanan
        const result = await processOrderSubmission(formData);
        
        if (result.success) {
            // Reset form
            orderForm.reset();
            hitungTotalHarga();
            resetFileUploadArea();
            
            // Tampilkan nomor pesanan di modal
            document.getElementById('nomorPesanan').textContent = result.nomorPesanan;
            
            // Tambahkan info berdasarkan sumber penyimpanan
            let modalInfo = '';
            if (result.source === 'localStorage') {
                modalInfo = `
                    <div class="alert alert-warning mt-3">
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        <strong>Peringatan:</strong> Data disimpan secara lokal karena koneksi server bermasalah.
                        Pesanan akan otomatis disinkron saat koneksi normal.
                    </div>
                `;
            }
            
            // Update modal content
            const modalBody = document.querySelector('#confirmModal .modal-body');
            modalBody.innerHTML = `
                <p>Terima kasih telah melakukan pemesanan di <strong>Deal Printing</strong>.</p>
                <p>Nomor pesanan Anda: <span class="fw-bold text-primary">${result.nomorPesanan}</span></p>
                ${modalInfo}
                <p>Kami akan menghubungi Anda via email atau WhatsApp dalam 1x24 jam untuk konfirmasi lebih lanjut.</p>
                <div class="mt-4 p-3 bg-light rounded">
                    <h6><i class="bi bi-info-circle me-2"></i>Informasi Penting:</h6>
                    <ul class="small mb-0">
                        <li>Simpan nomor pesanan ini untuk pengecekan status</li>
                        <li>Pastikan email dan WhatsApp aktif untuk komunikasi</li>
                        <li>File desain akan dicek oleh tim kami</li>
                        <li>Proses cetak dimulai setelah konfirmasi dan pembayaran</li>
                    </ul>
                </div>
            `;
            
            // Tampilkan modal
            const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
            modal.show();
            
            // Tampilkan pesan sukses
            showMessage('success', `Pesanan ${result.nomorPesanan} berhasil disimpan!`);
            
        } else {
            // Jika gagal total
            showMessage('error', result.message);
            
            // Tampilkan fallback manual
            const fallbackDiv = document.createElement('div');
            fallbackDiv.className = 'alert alert-danger mt-3';
            fallbackDiv.innerHTML = `
                <h6><i class="bi bi-exclamation-triangle me-2"></i>Sistem Pemesanan Offline</h6>
                <p>Silakan hubungi kami langsung:</p>
                <ul>
                    <li><strong>WhatsApp:</strong> <a href="https://wa.me/6281234567890" target="_blank">0812-3456-7890</a></li>
                    <li><strong>Email:</strong> order@dealprinting.com</li>
                    <li><strong>Telepon:</strong> (021) 1234-5678</li>
                </ul>
                <p class="mb-0">Sampaikan detail pesanan Anda termasuk file desain.</p>
            `;
            
            orderForm.parentNode.insertBefore(fallbackDiv, orderForm.nextSibling);
        }
        
    } catch (error) {
        console.error('❌ Error processing order:', error);
        showMessage('error', `Terjadi kesalahan: ${error.message}`);
        
    } finally {
        // Reset tombol
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        
        // Sembunyikan loading
        showLoading(false);
    }
});

// Fungsi untuk cek status localStorage
function checkLocalStorageStatus() {
    const localOrders = JSON.parse(localStorage.getItem('dealPrintingOrders') || '[]');
    const unsyncedOrders = localOrders.filter(order => order.isLocal && !order.synced);
    
    if (unsyncedOrders.length > 0) {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'alert alert-info alert-dismissible fade show mb-4';
        statusDiv.innerHTML = `
            <i class="bi bi-cloud-arrow-up me-2"></i>
            <strong>${unsyncedOrders.length} pesanan tersimpan lokal.</strong>
            <button type="button" class="btn btn-sm btn-outline-primary ms-2" onclick="syncLocalOrders()">
                Sinkronkan Sekarang
            </button>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const cardBody = document.querySelector('.card-body');
        if (cardBody) {
            cardBody.prepend(statusDiv);
        }
    }
}

// Fungsi global untuk sinkron (dipanggil dari button)
window.syncLocalOrders = async function() {
    showLoading(true);
    
    const result = await syncLocalOrdersToFirebase();
    
    if (result.success && result.synced > 0) {
        showMessage('success', `Berhasil menyinkronkan ${result.synced} pesanan ke server.`);
        
        // Refresh status
        setTimeout(() => {
            const alert = document.querySelector('.alert-info');
            if (alert) alert.remove();
            checkLocalStorageStatus();
        }, 2000);
    } else if (result.failed > 0) {
        showMessage('warning', `Berhasil ${result.synced}, gagal ${result.failed} dari ${result.total} pesanan.`);
    } else {
        showMessage('info', 'Tidak ada data lokal yang perlu disinkron.');
    }
    
    showLoading(false);
};

// Inisialisasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
    hitungTotalHarga();
    resetFileUploadArea();
    checkLocalStorageStatus();
    
    // Auto sync setiap 2 menit jika ada data lokal
    setInterval(async () => {
        const localOrders = JSON.parse(localStorage.getItem('dealPrintingOrders') || '[]');
        const unsyncedOrders = localOrders.filter(order => order.isLocal && !order.synced);
        
        if (unsyncedOrders.length > 0 && navigator.onLine) {
            console.log('🔄 Auto-syncing local orders...');
            await syncLocalOrdersToFirebase();
        }
    }, 120000); // 2 menit
});