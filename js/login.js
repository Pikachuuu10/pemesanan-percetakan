import { 
    auth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged 
} from './config.js';

// Referensi elemen DOM
const loginForm = document.getElementById('loginForm');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('loginPassword');

// Toggle password visibility
togglePassword.addEventListener('click', function() {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.innerHTML = type === 'password' ? '<i class="bi bi-eye"></i>' : '<i class="bi bi-eye-slash"></i>';
});

// Cek status login
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log('User sudah login:', user.email);
        // Jika sudah login dan di halaman login, redirect ke dashboard
        if (window.location.pathname.includes('login.html')) {
            window.location.href = 'admin-dashboard.html';
        }
    }
});

// Handle login form submission
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    // Validasi input
    if (!email || !password) {
        showAlert('error', 'Harap isi semua field');
        return;
    }
    
    // Tampilkan loading
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Memproses...';
    submitBtn.disabled = true;
    
    try {
        // Login dengan Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        console.log('Login berhasil:', user);
        
        // Redirect ke dashboard admin
        window.location.href = 'admin-dashboard.html';
        
    } catch (error) {
        console.error('Login error:', error);
        
        // Pesan error yang lebih user-friendly
        let errorMessage = 'Login gagal. ';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage += 'Email tidak valid.';
                break;
            case 'auth/user-disabled':
                errorMessage += 'Akun ini dinonaktifkan.';
                break;
            case 'auth/user-not-found':
                errorMessage += 'Akun tidak ditemukan. Silakan buat akun terlebih dahulu.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Password salah.';
                break;
            case 'auth/too-many-requests':
                errorMessage += 'Terlalu banyak percobaan gagal. Coba lagi nanti.';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAlert('error', errorMessage);
        
        // Jika akun tidak ditemukan, tawarkan untuk registrasi
        if (error.code === 'auth/user-not-found') {
            const registerBtn = document.createElement('button');
            registerBtn.className = 'btn btn-sm btn-outline-success mt-2';
            registerBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Buat Akun Baru';
            registerBtn.addEventListener('click', () => {
                registerAdmin(email, password);
            });
            
            const alertDiv = document.querySelector('.alert');
            alertDiv.appendChild(document.createElement('br'));
            alertDiv.appendChild(registerBtn);
        }
    } finally {
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Fungsi untuk registrasi admin baru
async function registerAdmin(email, password) {
    try {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Membuat akun...';
        submitBtn.disabled = true;
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Admin berhasil dibuat:', userCredential.user);
        
        // Auto login setelah registrasi
        showAlert('success', 'Akun berhasil dibuat! Mengarahkan ke dashboard...');
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('Error registrasi:', error);
        
        let errorMessage = 'Registrasi gagal. ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email sudah digunakan.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Email tidak valid.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password terlalu lemah (minimal 6 karakter).';
                break;
            default:
                errorMessage += error.message;
        }
        
        showAlert('error', errorMessage);
    }
}

// Fungsi untuk menampilkan alert
function showAlert(type, message) {
    // Hapus alert sebelumnya jika ada
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Buat alert baru
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    // Tambahkan alert ke form
    loginForm.prepend(alertDiv);
    
    // Auto-hide setelah 5 detik (kecuali success)
    if (type !== 'success') {
        setTimeout(() => {
            if (alertDiv.parentElement) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Demo account login otomatis
const demoBtn = document.createElement('button');
demoBtn.className = 'btn btn-outline-primary btn-sm mt-3';
demoBtn.innerHTML = '<i class="bi bi-lightning-charge me-2"></i>Coba Akun Demo';
demoBtn.addEventListener('click', () => {
    document.getElementById('loginEmail').value = 'admin@dealprinting.com';
    document.getElementById('loginPassword').value = 'password123';
    loginForm.dispatchEvent(new Event('submit'));
});

// Tambahkan tombol demo ke form
const formGroup = document.querySelector('#loginForm .d-grid');
formGroup.parentNode.insertBefore(demoBtn, formGroup.nextSibling);

// Tombol untuk registrasi admin baru
const registerBtn = document.createElement('button');
registerBtn.className = 'btn btn-outline-success btn-sm mt-2';
registerBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Buat Akun Admin Baru';
registerBtn.addEventListener('click', () => {
    const email = prompt('Masukkan email untuk admin baru:');
    if (email) {
        const password = prompt('Masukkan password (minimal 6 karakter):');
        if (password && password.length >= 6) {
            const confirmPassword = prompt('Konfirmasi password:');
            if (password === confirmPassword) {
                registerAdmin(email, password);
            } else {
                alert('Password tidak cocok!');
            }
        } else {
            alert('Password harus minimal 6 karakter');
        }
    }
});

// Tambahkan tombol registrasi
formGroup.parentNode.insertBefore(registerBtn, formGroup.nextSibling);