# Catatan Project Guest-Visitor

Dokumen ini adalah peta singkat project agar bagian pentingnya mudah dipahami sebelum melakukan perubahan.

## 1. Gambaran Umum

Project ini adalah aplikasi informasi dan registrasi tamu berbasis Next.js, React, TypeScript, dan Bootstrap.

Alur utama:

```text
/                 -> halaman pembuka / hero
/register         -> form registrasi tamu
/dashboard        -> statistik, tabel, dan reminder tamu
/tv               -> tampilan TV dan alarm visitor yang menunggu
```

Catatan penting: saat ini data masih berupa array statis di dalam source code. Form registrasi belum menyimpan data ke database, API, atau state bersama.

## 2. File Paling Vital

### `src/app/tv/page.tsx`

Halaman tampilan TV dan alarm.

Bagian yang perlu diperhatikan:

- `visitors`: sumber data yang ditampilkan di TV.
- `alarmWaitingMinutes`: state yang menampilkan jumlah menit pada pesan alarm.
- `waitingMinutes >= 10`: batas waktu alarm saat ini adalah 10 menit.
- `checkVisitors()`: memeriksa visitor berstatus `Waiting` setiap 1 detik.
- `enableAlarm()`: mengaktifkan izin suara melalui klik pengguna.
- `dismissAlarm()`: menutup alarm.
- Blok `<style>` di bagian bawah: seluruh CSS khusus halaman TV.

Jika ingin mengubah batas alarm, ubah angka pada kondisi berikut:

```ts
return waitingMinutes >= 10;
```

Jika angka batas alarm diubah, teks penjelasan alarm sebaiknya ikut disesuaikan bila masih menyebut angka tertentu.

Perhatian: `playAlarmSound()` sudah dibuat, tetapi saat ini belum dipanggil ketika alarm aktif. Jadi overlay alarm dapat muncul tanpa bunyi dari fungsi tersebut.

### `src/app/dashboard/page.tsx`

Halaman dashboard.

- Mengambil data dari `src/data/visitorData.ts`.
- Hanya visitor berstatus `Waiting` yang diberi `VisitorReminder`.
- Nilai `thresholdMinutes={10}` menentukan kapan reminder dashboard muncul.
- Tombol `+ Register Visitor` saat ini belum memiliki aksi navigasi.

### `src/components/VisitorReminder.tsx`

Komponen reminder dashboard.

- Menghitung lama menunggu berdasarkan `checkIn`.
- Memeriksa waktu setiap 1 detik.
- Prop `thresholdMinutes` menentukan ambang reminder.
- Default komponen adalah 1 menit, tetapi dashboard mengirim nilai 10 menit.
- Tombol close hanya menyembunyikan reminder secara lokal. Pada pemeriksaan berikutnya reminder dapat muncul lagi jika visitor masih memenuhi ambang waktu.

### `src/data/visitor.ts` dan `src/data/visitorData.ts`

Kedua file ini adalah sumber data utama, tetapi digunakan oleh halaman yang berbeda:

- `visitor.ts` dipakai oleh halaman `/tv`.
- `visitorData.ts` dipakai oleh halaman `/dashboard`.

Keduanya belum menggunakan sumber data bersama. Akibatnya, data di dashboard dan TV dapat berbeda.

### `src/types/visitor.ts`

Definisi tipe visitor.

Status yang diperbolehkan:

```ts
"Waiting" | "Meeting" | "Completed"
```

Field utama visitor adalah `id`, `name`, `company`, `phone`, `purpose`, `division`, `pic`, `checkIn`, dan `status`. `checkOut` bersifat opsional.

Jika struktur visitor diubah, cek semua penggunaan tipe ini di komponen, data, dan halaman.

## 3. Alur Registrasi

File utama: `src/app/register/page.tsx`

Alurnya:

```text
user mengisi form
    -> updateVisitor()
    -> handleSubmit()
    -> validasi field kosong
    -> tampilkan pesan berhasil/gagal
```

Hal penting:

- Form menggunakan state lokal React.
- `handleSubmit()` hanya melakukan validasi dan menampilkan pesan.
- Data yang berhasil diisi belum masuk ke `visitorData`, `visitors`, database, atau API.
- Division dan PIC menggunakan data dari `src/data/scroll.ts`.
- `getPICByDivision()` menentukan pilihan PIC berdasarkan division.
- Division `OTHER` belum memiliki daftar PIC, sehingga form dapat sulit diselesaikan karena PIC wajib diisi.

## 4. Komponen Dashboard

### `src/components/DashboardStats.tsx`

Menghitung jumlah:

- seluruh visitor
- visitor yang sedang `Waiting`
- visitor yang sedang `Meeting`
- visitor `Completed`

### `src/components/VisitorTable.tsx`

Menampilkan tabel visitor.

- `statusConfig` menentukan class badge status.
- `getInitials()` membuat inisial nama.
- `WaitingTimer` menampilkan lama menunggu.
- Visitor `Completed` menampilkan tanda `-` untuk waiting time.
- Visitor `Meeting` menampilkan `Visiting`.

Catatan pemeliharaan: `colSpan` pada empty state perlu dicek jika jumlah kolom tabel berubah. Key baris saat ini menggunakan nama visitor, sehingga nama yang sama dapat menyebabkan key bentrok.

### `src/components/WaitingTimer.tsx`

- Menghitung durasi sejak `checkIn`.
- Memperbarui tampilan setiap 1 detik.
- Jika format jam diubah, logika parsing waktu di komponen ini juga harus diubah.

## 5. Pengaturan Global

### `src/app/layout.tsx`

Root layout untuk semua halaman.

- Memuat Bootstrap dan font.
- Menyediakan `LanguageProvider` untuk seluruh aplikasi.
- Mengatur metadata title dan description.

### `src/app/language-provider.tsx`

Sistem bahasa Indonesia dan Inggris.

- Bahasa disimpan di `localStorage` dengan key `language`.
- `useLanguage()` hanya boleh dipakai di dalam `LanguageProvider`.
- Tambahkan terjemahan baru di object `translations` untuk menjaga UI konsisten.

### `src/app/globals.css`

CSS global untuk body, dashboard, tabel, badge, avatar, dan animasi umum. Perubahan di sini dapat memengaruhi banyak halaman.

### `src/app/hero.tsx` dan `src/app/hero.module.css`

Komponen visual halaman pembuka. `src/app/page.tsx` hanya merender komponen Hero.

## 6. Data dan Asset

### `src/data/scroll.ts`

Berisi pilihan division dan PIC untuk form registrasi.

### Folder `public/`

Asset dapat dipanggil dengan path dari root website:

```tsx
<Image src="/a.png" ... />
```

Asset yang dipakai antara lain:

- `/a.png`: logo.
- `/preview.jpg`: gambar halaman pembuka.

Jangan menaruh path filesystem Windows di JSX. Gunakan path public seperti `/a.png`.

## 7. Konfigurasi Project

- `package.json`: script `dev`, `build`, `start`, dan `lint`.
- `tsconfig.json`: alias `@/*` mengarah ke `src/*`.
- `eslint.config.mjs`: aturan lint.
- `next.config.ts`: konfigurasi Next.js.
- `next-env.d.ts`: file hasil generate Next.js, jangan diedit manual.
- `AGENTS.md`: aturan khusus project dan versi Next.js.
- `CLAUDE.md`: mengacu ke `AGENTS.md`.
- `README.md`: masih berupa dokumentasi bawaan Next.js dan belum menjelaskan fitur project ini.

## 8. Perintah Pengembangan

Jalankan dari folder root project:

```bash
npm run dev
npm run lint
npm run build
npm start
```

Urutan pemeriksaan yang disarankan setelah mengubah kode:

1. Jalankan `npm run lint`.
2. Jalankan `npm run build` untuk memastikan TypeScript dan build Next.js berhasil.
3. Buka halaman yang terkena perubahan di browser.

## 9. Hal yang Perlu Diingat Saat Mengubah Kode

1. Pastikan perubahan data dashboard dan TV memang ditujukan ke sumber data yang benar.
2. Waktu `checkIn` saat ini diproses sebagai jam lokal dengan format `HH:MM`.
3. Alarm dan timer bergantung pada waktu komputer yang menjalankan browser.
4. Interval 1 detik harus selalu dibersihkan dengan `clearInterval` agar tidak terjadi memory leak.
5. Menambahkan field baru ke `Visitor` dapat memerlukan perubahan pada data, form, tabel, dan tampilan TV.
6. Form registrasi belum persisten. Refresh halaman dapat menghilangkan hasil input.
7. Fungsi yang hanya didefinisikan tetapi tidak digunakan akan muncul sebagai warning lint.

### Visitor-list renewal

- The visitor API returns only the current Jakarta calendar day's records by default, using the existing `created_at` database column; use `?date=all` or `?date=YYYY-MM-DD` to retrieve older records.
- The admin, user, and visitors pages refresh their list automatically and provide a manual **Refresh list** button.
- Daily renewal only changes which records are shown. Existing visitor records remain in the database.

### Pelajaran: error "Failed to fetch visitors"

Error yang terlihat di halaman TV bukan berarti browser tidak dapat tersambung ke server. Pesan tersebut muncul karena halaman TV menerima respons API yang gagal, lalu melempar error umum. Penyebab sebenarnya ada di query database pada `src/app/api/visitors/route.ts`.

Urutan masalahnya:

1. Fitur daftar harian dibuat dengan memfilter field Prisma `visitDate`.
2. Field `visitDate` ditambahkan ke `prisma/schema.prisma`, tetapi kolom tersebut tidak ada di tabel `visitors` pada database aktif. Tabel itu menggunakan kolom `created_at`.
3. `prisma validate` tetap menyatakan schema valid karena perintah itu memeriksa sintaks dan konsistensi file schema; perintah tersebut tidak memastikan kolom sudah ada di database yang sedang dipakai.
4. Prisma Client yang di-generate mengikuti schema, sehingga TypeScript juga dapat menerima query `visitDate`. Ketika query dijalankan ke database, MySQL menolak kolom yang tidak dikenal. API mengembalikan status 500, lalu halaman TV hanya menampilkan "Failed to fetch visitors".

Cara diagnosis dan perbaikannya:

- Periksa nama kolom aktual di database, misalnya dengan `SHOW COLUMNS FROM visitors`; jangan menyimpulkan struktur database hanya dari schema atau tipe hasil generate.
- Gunakan field Prisma `created_at` yang memang sudah memetakan kolom database untuk filter tanggal. Hapus `visitDate` dari schema agar schema dan tabel kembali selaras.
- Jalankan `npm exec prisma validate` untuk validasi schema, lalu `npm exec prisma generate` setelah perubahan schema agar tipe Prisma Client diperbarui.
- Uji query terhadap database yang dikonfigurasi dan jalankan `npm run build` untuk memeriksa tipe serta build aplikasi.
- Saat menambah field database baru, perubahan schema saja belum cukup: buat dan terapkan migration atau pastikan kolom ditambahkan ke database sebelum aplikasi menjalankan query tersebut.
- Pesan fetch di browser sering hanya gejala. Periksa respons Network/API dan log server untuk menemukan error database sebenarnya. Halaman TV sekarang menyertakan pesan dari API dan status HTTP pada error fetch.

Pada fitur renewal ini, yang berubah setiap hari adalah filter daftar berdasarkan tanggal Jakarta, bukan penghapusan atau pengosongan record. Field `created_at` diisi otomatis saat record dibuat, sehingga data lama tetap tersimpan dan bisa diminta lewat `?date=all` atau `?date=YYYY-MM-DD`.

### Pelajaran: alur alarm akhir kerja di Admin, User, dan TV

Fitur ini sengaja memakai satu komponen bersama, `src/components/EndOfWorkReminder.tsx`, tetapi tampilan, kontrol state, dan pemutaran suara adalah tanggung jawab yang berbeda:

- Komponen dipasang di halaman Admin, User, dan TV agar setiap halaman bisa membaca dan mengubah state alarm bersama.
- Kartu/modal alarm hanya ditampilkan di TV (`showReminderCard`); Admin dan User mengaturnya menjadi `false`.
- Admin dan User hanya mendapat kontrol **Mulai/Hentikan Alarm** di menu. `showSoundControl={false}` menyembunyikan tombol suara, sedangkan `canPlaySound` tetap `false` secara default. Jadi aksi mereka mengubah state bersama melalui API, bukan memutar audio di browser Admin/User.
- TV mengaktifkan `canPlaySound` dan menyediakan tombol **Aktifkan Alarm**. Klik pengguna memberi izin browser untuk suara; callback tambahan pada TV juga mengaktifkan audio alarm pengunjung. Browser biasanya menolak pemutaran otomatis sebelum ada interaksi pengguna.

#### Alur data dan penjadwalan

1. `GET /api/end-of-work-alarm` membaca state alarm bersama dari database. `PUT` dengan `action: "activate"` atau `"stop"` mengubahnya. Karena state disimpan di server/database, aksi dari menu Admin/User dapat dilihat oleh TV.
2. `EndOfWorkReminder` mengambil state awal lalu melakukan polling setiap 5 detik. Interval dan timeout dibersihkan saat komponen dilepas; `requestInProgressRef` mencegah pemeriksaan jadwal yang tumpang tindih.
3. Pemeriksaan jadwal menggunakan `Intl.DateTimeFormat` dengan `timeZone: "Asia/Jakarta"` dan hanya mengaktifkan alarm pada Senin–Jumat. Waktu pemicu saat ini adalah **20.00 WIB**; ubah kondisi `afterWorkTime` di komponen untuk mengganti jam.
4. `alarmDate` menandai tanggal alarm diaktifkan, sedangkan `dismissedDate` mencegah alarm yang dihentikan aktif lagi pada tanggal yang sama. Keduanya berbeda dari state UI lokal React.
5. Saat alarm aktif, hanya instance TV yang boleh memutar `/sounds/home.mp3`. Event `ended` menghentikan state alarm bersama setelah file selesai.

#### Cara men-debug perubahan lintas halaman

- Cari semua tempat `<EndOfWorkReminder />` dirender, lalu periksa props per halaman. Jangan mengandalkan lokasi komponen saja untuk membatasi efek samping; gate audio secara eksplisit dengan `canPlaySound`.
- Pisahkan perubahan state server (`fetch` API) dari efek browser (`audio.play()` / `audio.pause()`). Admin/User boleh mengubah state tanpa memutar audio lokal.
- `play()` mengembalikan Promise. Browser dapat menolaknya jika pemutaran dihentikan oleh `pause()` sebelum proses mulai (`AbortError`). Hindari memulai playback berulang pada setiap render/poll, dan tangani pembatalan yang memang disengaja secara terpisah dari kegagalan audio yang sebenarnya.
- Setelah mengubah jadwal, periksa juga teks jam pada kartu/modal agar cocok dengan kondisi `afterWorkTime`. Saat ini teks tampilan masih menyebut **17.00 WIB**, sedangkan kondisi pemicu adalah **20.00 WIB**.
- Verifikasi dengan ESLint dan `tsc --noEmit`, lalu uji alur manual: klik aktifkan suara di TV, mulai/hentikan alarm dari Admin atau User, dan pastikan suara hanya terdengar di TV.

## 10. Prioritas Pengembangan Berikutnya

Jika project akan dikembangkan lebih lanjut, area yang paling penting adalah:

1. Satukan sumber data dashboard, TV, dan registrasi.
2. Tambahkan API atau database untuk menyimpan visitor.
3. Hubungkan submit registrasi dengan data yang ditampilkan.
4. Panggil `playAlarmSound()` ketika alarm benar-benar aktif.
5. Cegah alarm yang sudah di-dismiss muncul kembali terus-menerus.
6. Ganti angka batas alarm dengan satu konstanta agar tidak perlu mengubah banyak tempat.
7. Perbarui README agar menjelaskan cara menjalankan dan memahami project.
