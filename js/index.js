import { auth, signOut } from './config.js';

// Cek status login
auth.onAuthStateChanged((user) => {
    const navLinks = document.getElementById('navbarNav');
    if (user) {
        // Jika user sudah login
        navLinks.innerHTML += `
            <div class="dropdown ms-3">
                <button class="btn btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                    <i class="bi bi-person-circle me-2"></i>${user.email}
                </button>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="admin-dashboard.html">Dashboard Admin</a></li>
                    <li><hr class="dropdown-divider"></li>
                    <li><button class="dropdown-item" id="logoutBtn">Logout</button></li>
                </ul>
            </div>
        `;
        
        // Tambahkan event listener untuk logout
        document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    }
});

// Fungsi logout
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Gagal logout: ' + error.message);
    }
}

// Animasi scroll untuk navbar
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 100) {
        navbar.style.padding = '10px 0';
        navbar.style.backgroundColor = 'rgba(13, 110, 253, 0.95)';
    } else {
        navbar.style.padding = '20px 0';
        navbar.style.backgroundColor = '#0d6efd';
    }
});