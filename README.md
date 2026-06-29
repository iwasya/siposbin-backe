# SIPOSBIN Backend

Backend API untuk aplikasi SIPOSBIN, sistem pemantauan Posbindu yang menangani autentikasi pengguna, profil, pemeriksaan kesehatan, edukasi, jadwal kegiatan, notifikasi, statistik, dan administrasi.

## Ringkasan

Project ini dibangun dengan:

- `Node.js`
- `Express`
- `Supabase` untuk database dan storage
- `JWT` untuk autentikasi
- `Firebase Admin` untuk push notification
- `Resend` untuk email reset password
- `Multer` + `Sharp` untuk upload dan kompresi foto profil

API utama berjalan dari [server.js](/d:/kerjaan/siposbin-backend/server.js) dan konfigurasi route berada di [src/app.js](/d:/kerjaan/siposbin-backend/src/app.js).

## Fitur Utama

- Registrasi user peserta
- Login dengan email atau nomor HP
- JWT-based authentication
- Manajemen profil user
- Upload dan update foto profil
- Ganti password user
- Request reset password via OTP email
- Penyimpanan log reset password untuk admin
- CRUD pemeriksaan kesehatan
- Perhitungan BMI otomatis
- Penentuan status kesehatan: `Normal`, `Perlu Perhatian`, `Beresiko`
- Rekomendasi edukasi berdasarkan status kesehatan
- Riwayat dan detail pemeriksaan user
- Dashboard ringkasan user
- Statistik riwayat kesehatan untuk grafik
- CRUD jadwal Posbindu
- Pembuatan notifikasi ke peserta
- Push notification via Firebase
- CRUD edukasi
- CRUD data Posbindu
- Manajemen user oleh admin
- Simpan FCM token user

## Role Pengguna

Role yang dipakai di sistem:

- `1` = Admin
- `2` = Kader
- `3` = Peserta

Beberapa endpoint dibatasi berdasarkan role memakai middleware `roleMiddleware`.

## Fitur Keamanan

Project ini sudah memakai beberapa lapisan keamanan:

- `helmet` untuk hardening header HTTP
- `JWT` untuk autentikasi API
- `bcrypt` untuk hashing password
- `express-rate-limit` untuk pembatasan request
- Validasi akses berbasis role pada endpoint sensitif
- Validasi kepemilikan data pada beberapa endpoint user
- Validasi input angka pada pemeriksaan kesehatan
- Proteksi route admin dan route operasional sensitif

### Rate Limiting

Limiter global:

- `1000` request per `15 menit`
- key hybrid:
  - per `user id` jika token valid
  - fallback ke `IP` jika guest / token invalid

Limiter khusus:

- `POST /api/auth/login`
  - `10` request per `5 menit`
  - key berdasarkan `email`, fallback ke IP
- `POST /api/auth/request-reset`
  - `3` request per `10 menit`
  - key berdasarkan `email`, fallback ke IP
- `PUT /api/profile/change-password`
  - `5` request per `15 menit`
  - key berdasarkan `user id`, fallback ke IP

### Catatan Keamanan Tambahan

- Jangan commit `.env` ke repository publik
- Jangan expose `SUPABASE_SERVICE_KEY`
- Jangan expose `firebase-key.json`
- Token JWT harus disimpan aman di sisi client
- Response API sensitif seperti update profile sudah dibersihkan agar tidak membocorkan `password`, `reset_otp`, atau `fcm_token`

## Struktur Folder

```txt
src/
  app.js
  config/
  controllers/
  middleware/
  routes/
test/
server.js
package.json
```

Penjelasan singkat:

- `src/config` berisi konfigurasi Supabase, Firebase, Resend, dan mailer
- `src/controllers` berisi business logic tiap modul
- `src/middleware` berisi auth, role, upload, dan rate limiter
- `src/routes` berisi definisi endpoint API
- `test` berisi unit test dan smoke test

## Endpoint Utama

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/request-reset`
- `POST /api/auth/reset-password`

### Profile

- `GET /api/profile`
- `PUT /api/profile`
- `POST /api/profile/upload-photo`
- `PUT /api/profile/change-password`

### Pemeriksaan

- `GET /api/pemeriksaan`
- `GET /api/pemeriksaan/:id`
- `POST /api/pemeriksaan`
- `PUT /api/pemeriksaan/:id`
- `DELETE /api/pemeriksaan/:id`

### Edukasi

- `GET /api/edukasi`
- `POST /api/edukasi`
- `PUT /api/edukasi/:id`
- `DELETE /api/edukasi/:id`

### Jadwal

- `GET /api/jadwal`
- `GET /api/jadwal/:id`
- `POST /api/jadwal`
- `PUT /api/jadwal/:id`
- `DELETE /api/jadwal/:id`

### Notifikasi

- `GET /api/notifikasi`
- `PATCH /api/notifikasi/:id/read`
- `GET /api/notifikasi/unread-count`

### Statistik dan Dashboard

- `GET /api/dashboard`
- `GET /api/statistik`

### Posbindu

- `GET /api/posbindu`
- `GET /api/posbindu/:id`
- `POST /api/posbindu`
- `PUT /api/posbindu/:id`
- `DELETE /api/posbindu/:id`

### User Management

- `POST /api/users`
- `GET /api/users`
- `PUT /api/users/:id`
- `PUT /api/users/:id/reset-password`
- `DELETE /api/users/:id`
- `POST /api/users/save-fcm-token`
- `POST /api/users/test-notif`

### Admin

- `GET /api/admin/reset-logs`
- `GET /api/admin/reset-logs/stats`

## Environment Variables

Buat file `.env` di root project.

Contoh:

```env
PORT=5000

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

JWT_SECRET=your_jwt_secret
RESEND_API_KEY=your_resend_api_key
```

File lain yang juga dibutuhkan:

- `src/config/firebase-key.json`

## Cara Menjalankan Project

Install dependency:

```bash
npm install
```

Jalankan mode development:

```bash
npm run dev
```

Jalankan mode production:

```bash
npm start
```

Default server berjalan di:

```txt
http://localhost:5000
```

Health check:

```txt
GET /health
```

## Testing

Project ini sudah memiliki test dasar untuk routing, auth, role protection, dan sebagian logic controller.

Menjalankan semua test:

```bash
npm test
```

Menjalankan smoke test endpoint:

```bash
npm run test:smoke
```

Cakupan test saat ini:

- Smoke test semua endpoint yang terdaftar di router
- Verifikasi route public, auth-only, dan role-based route
- Unit test logika penting di pemeriksaan

Catatan:

- Smoke test saat ini fokus ke validasi wiring route, auth, dan role
- Belum semua test merupakan integration test live ke Supabase, Firebase, atau Resend

## Logika Pemeriksaan Kesehatan

Pada modul pemeriksaan:

- pemeriksaan bisa disimpan dengan minimal satu metrik
- berat dan tinggi badan bersifat opsional, tetapi jika diisi harus lebih dari `0`
- metrik pemeriksaan numerik divalidasi agar tidak bernilai negatif
- BMI dihitung otomatis jika `berat_badan` dan `tinggi_badan` sama-sama tersedia
- interpretasi detail dihitung untuk tekanan darah, gula darah, kolesterol, asam urat, dan BMI
- status kesehatan akhir dihitung dari hasil interpretasi detail
- `create` dan `update` pemeriksaan sama-sama menghitung ulang `BMI` dan memperbarui `interpretasi`

Kategori interpretasi:

- Tekanan darah:
  - `Optimal`: sistolik `< 120` dan diastolik `< 80`
  - `Normal`: sistolik `<= 129` dan diastolik `<= 84`
  - `Normal Tinggi`: sistolik `<= 139` dan diastolik `<= 89`
  - `Hipertensi 1`: sistolik `<= 159` dan diastolik `<= 99`
  - `Hipertensi 2`: sistolik `<= 179` dan diastolik `<= 109`
  - `Hipertensi 3`: di atas kategori sebelumnya
- Gula darah sewaktu:
  - `Normal`: `< 140`
  - `Prediabetes`: `>= 140` dan `< 200`
  - `Diabetes`: `>= 200`
- Kolesterol total:
  - `Normal`: `< 200`
  - `Waspada`: `>= 200` dan `< 240`
  - `Tinggi`: `>= 240`
- Asam urat:
  - Pria:
    - `Normal`: `< 7`
    - `Waspada`: `>= 7` dan `<= 8`
    - `Tinggi`: `> 8` dan `< 9`
    - `Bahaya`: `>= 9`
  - Wanita:
    - `Normal`: `< 6`
    - `Waspada`: `>= 6` dan `<= 8`
    - `Tinggi`: `> 8` dan `< 9`
    - `Bahaya`: `>= 9`
- BMI:
  - `Kurus`: `< 18.5`
  - `Normal`: `18.5 - 24.9`
  - `Kelebihan BB`: `25 - 29.9`
  - `Obesitas`: `>= 30`

Kategori status akhir:

- `Beresiko`
  - jika ada hasil `Hipertensi 3`, `Bahaya`, atau `Diabetes`
- `Perlu Perhatian`
  - jika ada hasil `Hipertensi 2`, `Tinggi`, `Prediabetes`, `Obesitas`, `Normal Tinggi`, `Hipertensi 1`, `Waspada`, atau `Kelebihan BB`
- `Normal`
  - jika semua hasil detail masih normal

## Catatan Implementasi

- Upload foto profil disimpan ke bucket `PROFILE-IMAGES`
- Foto profil dikompres dengan `Sharp`
- Login menerima input field `email`, tetapi nilainya bisa email atau `no_hp`
- Beberapa endpoint menggunakan data relasional Supabase seperti `interpretasi`, `posbindu`, dan `jadwal_posbindu`

## Saran Pengembangan Berikutnya

- Tambahkan integration test untuk Supabase dan Firebase
- Tambahkan validasi request yang lebih formal dengan schema validator
- Tambahkan dokumentasi API format request/response per endpoint
- Tambahkan audit log untuk aksi admin penting
- Tambahkan refresh token jika dibutuhkan untuk mobile app

## Lisensi

Saat ini repository memakai lisensi `ISC` sesuai [package.json](/d:/kerjaan/siposbin-backend/package.json).
