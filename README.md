# 📌 Final Project RPL – Sistem [Deal Printing]
Deal Printing – Platform Pemesanan Percetakan

## 👥 Identitas Kelompok
- **Nama Kelompok :** [kelompok 3]
- **Anggota & Jobdesk :**
  | Nama Anggota | Tugas / Jobdesk |
  |--------------|-----------------|
  | Erika | Requirement Gathering, Implementasi Frontend |
  | Dela Natasya | Design (UML, UI), SRS, materi PPT
  

## 📱Deskripsi Singkat Aplikasi 
Deal Printing adalah aplikasi pemesanan layanan percetakan berbasis web yang dirancang untuk mempermudah pelanggan dalam memesan layanan cetak secara online. Aplikasi ini menyediakan fitur pemesanan berbagai produk seperti undangan, banner, kartu nama, poster, spanduk, brosur, dan layanan cetak lainnya. Aplikasi membantu proses pemesanan menjadi lebih cepat dan transparan, mulai dari upload desain, estimasi biaya, hingga pelacakan status pesanan.
### Sistem ini dibuat berdasarkan permintaan dari klien kelompok 5 dengan tujuan untuk menyelesaikan permasalahan:
- Proses pemesanan manual membuat antrean panjang dan kesalahan pencatatan.
- Pelanggan harus datang langsung ke toko untuk membawa desain.
- Admin membutuhkan alat untuk mengatur pesanan, dan membuat laporan.
### Solusi yang dikembangkan berupa aplikasi:
- Sistem pemesanan percetakan berbasis web.
- Dashboard admin untuk mengelola pesanan.
- Upload desain digital
### yang menyediakan fitur utama:
- Halaman beranda berisi informasi layanan.
- MForm pemesanan (upload desain).
- Estimasi biaya otomatis.
- Dashboard admin untuk verifikasi, update status, dan laporan transaksi.
## 🎯Tujuan Sistem / Permasalahan yang Diselesaikan
- Menyediakan sarana pemesanan percetakan berbasis web yang cepat dan praktis.
- Membantu pelanggan memesan tanpa harus datang langsung ke toko.
- Mengurangi kesalahan input dan mempercepat proses produksi.
- Memberikan contoh implementasi sistem pemesanan menggunakan teknologi web dan Firebase.

## Teknologi yang Digunakan
- HTML5 – Struktur halaman website
- CSS3 – Desain tampilan
- JavaScript – Interaksi & logika frontend
- Firebase Firestore – Database real-time
- Firebase Storage – Penyimpanan file desain
- Browser Chrome / Edge – Rekomendasi menjalankan aplikasi.

## Cara Menjalankan Aplikasi
Aplikasi dapat diakses melalui browser melalui link:

```bash
https://pikachuuu10.github.io/pemesanan-percetakan/
```

## Cara Instalasi
arena aplikasi berbasis web statis, instalasi tidak diperlukan. Cukup buka file index.html atau gunakan Live Server

## Cara Konfigurasi
Pastikan Anda memiliki file konfigurasi Firebase pada bagian:

```bash
// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCe3cO7xpeF_Tgp7MCTaZoi9MTcuZFpfFI",
    authDomain: "deal-printing-app.firebaseapp.com",
    projectId: "deal-printing-app",
    storageBucket: "deal-printing-app.firebasestorage.app",
    messagingSenderId: "771448991580",
    appId: "1:771448991580:web:b0649feea15d1af74f1b99",
    measurementId: "G-WDJEQT6HF6"
};
```

## Cara Menjalankan (Run Project)
Jalankan secara langsung:
- Buka file index.html
- Install ekstensi "Live Server" di VSCode
- Klik kanan file HTML → Open with Live Server

## Link Deployment / Link APK 
Link Deployment: 
```bash
https://pikachuuu10.github.io/pemesanan-percetakan/
```

## Screenshot Halaman Utama 
![Packages List](\Screenshot homepage.png)

## Catatan Tambahan
- Beberapa fitur lanjutan seperti laporan otomatis masih dapat dikembangkan.
- UI masih bisa dimodernisasi menggunakan framework CSS modern.
- Fitur pembayaran dapat diperluas ke payment gateway seperti Midtrans.
- fFile desain harus berada dalam folder yang sesuai (assets/img atau storage/).

## Hal-hal Penting yang Perlu Diketahui
- Sistem masih memerlukan pengembangan untuk fitur CRUD backend penuh.
- Tampilan masih dapat dikembangkan untuk lebih modern.
- Firestore tidak menyimpan data secara offline default tanpa konfigurasi tambahan.

## Keterangan Tugas
Project ini dibuat untuk memenuhi Tugas Final Project mata kuliah Rekayasa Perangkat Lunak.
Dosen Pengampu: Dila Nurlaila, M.Kom

## 📄 Lisensi

© 2025 DealPrinting — Kelompok 3 RPL
