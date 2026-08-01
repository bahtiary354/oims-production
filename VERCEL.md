# Deploy Oims ke Vercel dan Supabase

Oims menggunakan Next.js sebagai runtime dan Supabase sebagai penyimpanan data.

## 1. Siapkan Supabase

1. Buat proyek baru di Supabase.
2. Buka SQL Editor.
3. Jalankan isi file `supabase/schema.sql`.
4. Salin Project URL dan service-role key dari Project Settings > API.

## 2. Konfigurasi lokal

Salin `.env.example` menjadi `.env.local`, kemudian isi:

~~~env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
~~~

Service-role key hanya boleh berada di server. Jangan menambahkan awalan
`NEXT_PUBLIC_` pada key tersebut dan jangan commit `.env.local`.

## 3. Jalankan dan verifikasi

~~~bash
npm install
npm run dev
npm test
~~~

## 4. Import ke Vercel

1. Pilih Add New > Project pada Vercel.
2. Import repository GitHub `bahtiary354/oims-production`.
3. Gunakan Framework Preset `Next.js` dan Root Directory `./`.
4. Tambahkan kedua environment variable untuk Production, Preview, dan Development.
5. Klik Deploy.

Push berikutnya ke branch `main` akan membuat deployment production baru.
