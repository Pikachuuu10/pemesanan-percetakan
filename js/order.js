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

// Fungsi untuk menampilkan pesan
function showMessage(type, message) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    orderForm.parentNode.insertBefore(alertDiv, orderForm);
    
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Submit form
orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Validasi
    if (!produkSelect.value) {
        showMessage('warning', 'Silakan pilih jenis produk terlebih dahulu');
        produkSelect.focus();
        return;
    }
    
    // Tampilkan loading
    const submitBtn = orderForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Memproses...';
    submitBtn.disabled = true;
    
    try {
        // Generate nomor pesanan
        const timestamp = Date.now();
        const randomNum = Math.floor(Math.random() * 1000);
        const nomorPesanan = `DP-${timestamp.toString().slice(-6)}-${randomNum.toString().padStart(3, '0')}`;
        
        // Simpan data ke Firebase
        const orderData = {
            nomorPesanan,
            nama: document.getElementById('nama').value,
            email: document.getElementById('email').value,
            telepon: document.getElementById('telepon').value,
            alamat: document.getElementById('alamat').value,
            produk: produkSelect.value,
            ukuran: document.getElementById('ukuran').value,
            kertas: document.getElementById('kertas').value,
            jumlah: parseInt(jumlahInput.value),
            catatan: document.getElementById('catatan').value,
            totalHarga: hargaProduk[produkSelect.value] * parseInt(jumlahInput.value),
            status: 'pending',
            tanggal: serverTimestamp(),
            fileDesain: document.getElementById('fileDesain')?.files[0]?.name || null
        };
        
        console.log('Menyimpan pesanan:', orderData);
        
        await addDoc(collection(db, 'orders'), orderData);
        
        // Reset form
        orderForm.reset();
        hitungTotalHarga();
        
        // Tampilkan modal konfirmasi
        document.getElementById('nomorPesanan').textContent = nomorPesanan;
        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        modal.show();
        
        showMessage('success', 'Pesanan berhasil disimpan!');
        
    } catch (error) {
        console.error('Error saving order:', error);
        
        let errorMessage = 'Gagal menyimpan pesanan: ';
        if (error.code === 'permission-denied') {
            errorMessage += 'Izin ditolak. Periksa Firebase Rules.';
        } else {
            errorMessage += error.message;
        }
        
        showMessage('danger', errorMessage);
        
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Inisialisasi
document.addEventListener('DOMContentLoaded', () => {
    hitungTotalHarga();
    console.log('Order form ready');
});