# Oims — Production Management

Oims adalah aplikasi pemantauan WIP produksi jaket dari PO, cutting, bundle,
vendor jahit, gudang, QC, rework, hingga stok barang jadi.

## Stack

- Next.js 16
- React 19
- Supabase
- Vercel

## Menjalankan secara lokal

1. Salin `.env.example` menjadi `.env.local`.
2. Isi URL dan service-role key Supabase.
3. Jalankan `supabase/schema.sql` melalui Supabase SQL Editor.
4. Instal dependency dan mulai aplikasi:

~~~bash
npm install
npm run dev
~~~

Build dan test:

~~~bash
npm run build
node --test tests/rendered-html.test.mjs
~~~

Panduan deployment lengkap tersedia di [VERCEL.md](./VERCEL.md).

## Keamanan

`SUPABASE_SERVICE_ROLE_KEY` hanya digunakan oleh API route di server. Jangan
memberi key tersebut awalan `NEXT_PUBLIC_` dan jangan commit `.env.local`.
