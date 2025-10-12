# 🎡 Spinning Wheel Event System - Setup Guide

Aplikasi Spinning Wheel berbasis event dengan 4 frame desain modern untuk mengelola undian interaktif.

## 🚀 Quick Start

### 1. Membuat Akun Admin Pertama

Buka **Browser Console** (F12 → Console) dan jalankan:

```javascript
setupAdmin("admin@event.com", "admin123", "Admin Event")
```

Kredensial default:
- **Email**: `admin@event.com`
- **Password**: `admin123`

### 2. Login ke Dashboard

Gunakan kredensial yang baru dibuat untuk login.

### 3. Setup Data Event

#### A. Tambah Peserta
1. Klik tab **"Kelola Peserta"**
2. Klik **"Tambah Peserta"**
3. Masukkan:
   - Nama: `John Doe`
   - Peluang: `3` (jumlah spin)
4. Ulangi untuk peserta lainnya

#### B. Tambah Hadiah
1. Klik tab **"Kelola Hadiah"**
2. Klik **"Tambah Hadiah"**
3. Masukkan:
   - Nama: `Smartphone`
   - Bobot: `5` (semakin besar = peluang lebih tinggi)
4. Tambahkan beberapa hadiah dengan bobot berbeda:
   - `Laptop` (Bobot: 2)
   - `Voucher Rp 500.000` (Bobot: 10)
   - `Powerbank` (Bobot: 8)
   - `Headphone` (Bobot: 6)

### 4. Menjalankan Event

1. Dari Dashboard, klik **"Halaman Event"**
2. Klik **"PANGGIL PESERTA BERIKUTNYA"** untuk memilih peserta
3. Klik **"SPIN HADIAH"** untuk memutar roda
4. Ulangi sesuai jumlah peluang peserta
5. Lihat hasil akhir di halaman Results
6. Klik **"Lanjutkan ke Peserta Berikutnya"**

## 📋 Frame-Frame Utama

### Frame A: Login Admin
- Halaman login dengan tema dark mode elegan
- Gradient purple-blue accent
- Secure authentication

### Frame B: Admin Dashboard
- Sidebar navigation
- Kelola Peserta (CRUD)
- Kelola Hadiah (CRUD)
- Log Event
- Reset status undian

### Frame C: Event Page (Full Screen)
- Spinning wheel besar dengan gradien warna-warni
- Display peserta terpilih dengan efek glow
- Kontrol operasi event real-time
- Optimized untuk proyektor (1920x1080)

### Frame D: Event Results
- Tampilan hasil spin untuk setiap peserta
- Summary hadiah yang diperoleh
- Navigasi lanjutan

## 🎨 Fitur Visual

- **Dark Mode**: Background gelap dengan gradien purple-blue
- **Neon Accents**: Tombol dengan efek glow
- **Animations**: Pulse, bounce, blur effects
- **Responsive Cards**: Rounded corners dengan shadow
- **Weighted Wheel**: Segmen roda dengan ukuran proporsional

## 🔐 Fitur Backend

- Supabase Authentication
- Key-Value Store untuk data
- Real-time event logging
- Weighted random selection
- Session management

## 💡 Tips Penggunaan

1. **Reset Undian**: Gunakan tombol "Reset Undian" untuk menghapus status drawn semua peserta
2. **Weighted Chances**: Hadiah dengan bobot lebih tinggi memiliki peluang lebih besar muncul
3. **Multiple Spins**: Setiap peserta bisa memiliki peluang spin berbeda (1x, 2x, 3x, dll)
4. **Fullscreen Mode**: Tekan F11 untuk fullscreen saat event berlangsung
5. **Logs**: Semua hasil undian tersimpan di tab "Log Event"

## 🎯 Sample Data

Contoh konfigurasi hadiah yang seimbang:

| Hadiah | Bobot | Perhitungan Persentase | Persentase Aktual |
| :--- | :--- | :--- | :--- |
| Voucher Rp 100.000 | 15 | $(15 / 40) \times 100\%$ | **37.5%** |
| Powerbank | 10 | $(10 / 40) \times 100\%$ | **25.0%** |
| Headphone | 8 | $(8 / 40) \times 100\%$ | **20.0%** |
| Smartwatch | 5 | $(5 / 40) \times 100\%$ | **12.5%** |
| Laptop | 2 | $(2 / 40) \times 100\%$ | **5.0%** |
| **TOTAL** | **40** | | **100.0%** |

**Total Bobot**: 40

## 🚨 Troubleshooting

**Masalah**: Tidak ada peserta tersisa
- **Solusi**: Klik "Reset Undian" di dashboard untuk reset status drawn

**Masalah**: Roda tidak berputar
- **Solusi**: Pastikan sudah ada hadiah yang ditambahkan

**Masalah**: Error saat login
- **Solusi**: Pastikan sudah membuat akun admin via setupAdmin()

## 📞 Support

Untuk pertanyaan atau bantuan, hubungi administrator sistem.

---

© 2025 Event Management System - Powered by Supabase
