import { 
    auth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
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
    
    if (!email || !password) {
        showAlert('error', 'Harap isi semua field');
        return;
    }
    
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Memproses...';
    submitBtn.disabled = true;
    
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('Login berhasil:', user);
        window.location.href = 'admin-dashboard.html';
    } catch (error) {
        console.error('Login error:', error);
        let errorMessage = 'Login gagal. ';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage += 'Email tidak valid.'; break;
            case 'auth/user-disabled':
                errorMessage += 'Akun ini dinonaktifkan.'; break;
            case 'auth/user-not-found':
                errorMessage += 'Akun tidak ditemukan. Silakan buat akun terlebih dahulu.'; break;
            case 'auth/wrong-password':
                errorMessage += 'Password salah.'; break;
            case 'auth/too-many-requests':
                errorMessage += 'Terlalu banyak percobaan gagal. Coba lagi nanti.'; break;
            default:
                errorMessage += error.message;
        }
        showAlert('error', errorMessage);

        if (error.code === 'auth/user-not-found') {
            const alertDiv = document.querySelector('.alert');
            if (!document.getElementById('registerBtnDynamic')) {
                const registerBtnDynamic = document.createElement('button');
                registerBtnDynamic.id = 'registerBtnDynamic';
                registerBtnDynamic.className = 'btn btn-outline-success mt-3 w-100';
                registerBtnDynamic.style.padding = '10px';
                registerBtnDynamic.style.fontSize = '1rem';
                registerBtnDynamic.innerHTML = '<i class="bi bi-person-plus me-2"></i>Buat Akun Baru';
                registerBtnDynamic.addEventListener('click', () => registerAdmin(email, password));
                alertDiv.appendChild(document.createElement('br'));
                alertDiv.appendChild(registerBtnDynamic);
            }
        }
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Fungsi register admin
async function registerAdmin(email, password) {
    try {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Membuat akun...';
        submitBtn.disabled = true;

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('Admin berhasil dibuat:', userCredential.user);
        showAlert('success', 'Akun berhasil dibuat! Mengarahkan ke dashboard...');
        setTimeout(() => {
            window.location.href = 'admin-dashboard.html';
        }, 2000);
    } catch (error) {
        console.error('Error registrasi:', error);
        let errorMessage = 'Registrasi gagal. ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email sudah digunakan.'; break;
            case 'auth/invalid-email':
                errorMessage += 'Email tidak valid.'; break;
            case 'auth/weak-password':
                errorMessage += 'Password terlalu lemah (minimal 6 karakter).'; break;
            default:
                errorMessage += error.message;
        }
        showAlert('error', errorMessage);
    } finally {
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Login / Buat Akun';
    }
}

// Fungsi alert
function showAlert(type, message) {
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) existingAlert.remove();
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type === 'error' ? 'danger' : 'success'} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    loginForm.prepend(alertDiv);
    
    if (type !== 'success') {
        setTimeout(() => {
            if (alertDiv.parentElement) alertDiv.remove();
        }, 5000);
    }
}

// Tombol “Buat Admin” utama di bawah form login
const rowContainer = document.createElement('div');
rowContainer.style.display = "flex";
rowContainer.style.justifyContent = "center";
rowContainer.style.marginTop = "15px";

const registerBtn = document.createElement('button');
registerBtn.className = 'btn btn-outline-success';
registerBtn.style.width = "100%";  // full-width
registerBtn.style.maxWidth = "300px"; // maksimal lebar
registerBtn.style.padding = "12px";
registerBtn.style.fontSize = "1.1rem";
registerBtn.innerHTML = '<i class="bi bi-person-plus me-2"></i>Buat Admin';
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

rowContainer.appendChild(registerBtn);

// Sisipkan tombol setelah tombol login
const formGroup = document.querySelector('#loginForm .d-grid');
formGroup.parentNode.insertBefore(rowContainer, formGroup.nextSibling);
