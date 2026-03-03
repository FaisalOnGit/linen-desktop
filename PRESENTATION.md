# OSLA Desktop - Solusi Manajemen Linen Berbasis RFID

## Pendahuluan

OSLA Desktop adalah solusi aplikasi desktop inovatif yang dikembangkan untuk mengatasi tantangan manajemen linen di fasilitas kesehatan dan hospitality. Aplikasi ini menggabungkan teknologi Radio Frequency Identification (RFID) dengan antarmuka desktop yang modern untuk memberikan tracking real-time, akurasi tinggi, dan efisiensi operasional. Dikembangkan oleh PT. Nuansa Cerah Informasi dengan Lead Developer Faisal Rahman, OSLA Desktop kini telah mencapai versi 1.1.6 dan terbukti mampu meningkatkan efisiensi operasional hingga 90 persen.

## Tantangan dan Solusi

Di industri linen healthcare dan hospitality, manajemen manual menghadapi berbagai masalah serius. Tracking manual rentan terhadap kesalahan manusia, pencarian linen memakan waktu yang lama, kehilangan aset sering terjadi akibat pencatatan yang kurang baik, proses sorting berjalan lambat, serta sering terjadi ketidaksesuaian antara stok catatan dengan kenyataan di lapangan.

OSLA Desktop hadir sebagai jawaban komprehensif atas tantangan-tantangan tersebut. Melalui pendekatan teknologi yang terintegrasi, sistem mengubah proses tracking manual menjadi RFID scanning otomatis, mempercepat pencarian melalui identifikasi instan, mengotomasi proses sorting dan grouping, serta menyediakan real-time tracking yang akurat. Dokumentasi manual kini digantikan oleh sistem digital printing dan reporting yang terintegrasi.

## Arsitektur Teknologi

OSLA Desktop mengadopsi arsitektur hybrid yang menggabungkan kekuatan web technologies dengan kemampuan native desktop. Pada layer frontend, aplikasi menggunakan React 18.0.0 sebagai UI framework yang memberikan Virtual DOM untuk performa rendering optimal, component reusability antar modul, serta state management dengan hooks untuk real-time RFID updates. Untuk build tool dan development server, Vite 5.0.0 dipilih karena keunggulannya dibanding Webpack, termasuk cold start yang hanya sekitar 100ms, Hot Module Replacement yang instan, dan build output yang sudah optimal secara default. Tampilan antarmuka dibangun menggunakan Tailwind CSS 3.4.17 dengan pendekatan utility-first yang memberikan design consistency, responsive design capability, dan bundle size yang efisien.

Layer desktop framework dikelola oleh Electron 37.3.1 yang berfungsi sebagai web-to-native bridge. Electron mengadopsi arsitektur multi-process dengan Renderer Process yang menangani React application, Preload Script yang bertindak sebagai context bridge untuk secure API exposure, dan Main Process yang mengelola window management, OS integration, dan hardware communication. Komunikasi antar proses dilakukan melalui IPC (Inter-Process Communication) yang memungkinkan React component berkomunikasi dengan main process untuk mengakses hardware capabilities.

## Integrasi Hardware RFID

Bagian paling menantang dari pengembangan OSLA Desktop adalah menghubungkan React (JavaScript) dengan Zebra RFID Reader yang menggunakan .NET library. Solusinya adalah menggunakan electron-edge-js 24.0.4 sebagai bridge antara JavaScript dan .NET Framework. Melalui library ini, aplikasi dapat membuat function proxy yang menghubungkan kode JavaScript dengan class C# di ZebraLib.dll, yang kemudian berkomunikasi dengan Symbol.RFID3.Host.dll sebagai SDK resmi dari Zebra untuk komunikasi native dengan RFID reader.

Alur komunikasi RFID dimulai dari React component yang memanggil rfidAPI.connect(), yang kemudian diteruskan melalui IPC layer ke main process. Di main process, edge.func memanggil method di ZebraLib.dll, yang selanjutnya berkomunikasi dengan .NET Runtime untuk mengeksekusi method Connect. Dari sini, Symbol.RFID3.Host.dll mengirimkan perintah TCP/IP ke Zebra RFID Reader yang terhubung melalui jaringan dengan konfigurasi IP dan port tertentu. Hardware reader mendukung hingga 4 antenna port dengan power kontrol individual mulai dari 0-30 dBm pada frekuensi UHF 865-868 MHz.

## Integrasi Printer Zebra

Salah satu highlight teknis dari OSLA Desktop adalah integrasi printer Zebra dengan dual approach untuk memastikan reliability printing di berbagai kondisi environment. BrowserPrint SDK v3.1250 digunakan sebagai metode primary, di mana SDK di-load melalui script injection ke aplikasi. Aplikasi dapat mengecek ketersediaan BrowserPrint, melakukan device discovery untuk mendeteksi printer Zebra yang terhubung, dan mengirim command ZPL (Zebra Programming Language) langsung ke printer.

Ketika BrowserPrint tidak tersedia atau mengalami masalah, sistem otomatis beralih ke metode fallback menggunakan PowerShell. Dalam pendekatan ini, ZPL command ditulis ke file temporary, kemudian PowerShell Out-Printer cmdlet mengirim content tersebut ke printer queue Windows. Driver printer Zebra yang terinstall akan memproses command ZPL tersebut secara native, sehingga printing tetap dapat berjalan tanpa ketergantungan pada SDK.

Untuk generate label, aplikasi menggunakan ZPL (Zebra Programming Language) yang dibuat secara dinamis berdasarkan data delivery. ZPL adalah bahasa printer-specific untuk Zebra printers yang menggunakan command structure seperti ^XA untuk memulai format, ^LL untuk menentukan label length, ^FO untuk positioning, ^A untuk font specification, ^FD untuk field data, ^GB untuk graphic box atau garis pembatas, dan ^XZ untuk mengakhiri format. Dengan pendekatan ini, label delivery dapat digenerate secara dinamis sesuai dengan jumlah item, ruangan, dan informasi lain yang diperlukan.

## State Management dan Persistensi Data

Untuk menyimpan konfigurasi secara persisten, aplikasi menggunakan electron-store 9.0.0 yang memungkinkan penyimpanan RFID configuration seperti IP address dan port reader, serta antenna power settings. Data disimpan di lokasi yang berbeda tergantung sistem operasi: Windows menyimpannya di AppData Roaming folder, macOS di Application Support directory, dan Linux di .config directory. Untuk penyimpanan kredensial yang lebih sensitif seperti API token, aplikasi menggunakan keytar 7.9.0 yang mengenkripsi data menggunakan OS credential manager native (Windows Credential Manager, macOS Keychain, atau Linux Secret Service API).

## Build dan Distribusi

Proses build dan packaging aplikasi dilakukan menggunakan electron-builder 26.0.12. Konfigurasi build dirancang untuk menghasilkan installer NSIS untuk Windows, DMG untuk macOS, dan AppImage untuk Linux. Salah satu konfigurasi penting adalah menonaktifkan format asar (Electron default archive format) karena DLL files tidak dapat di-load dari arsip asar. Sebagai alternatif, DLL files disimpan secara terpisah di root level agar dapat diakses langsung oleh edge.js. Hasil build berupa installer executable yang sudah mencakup semua dependencies termasuk ZebraLib.dll, Symbol.RFID3.Host.dll, icons, dan configuration files.

## Modul Operasional

OSLA Desktop menyediakan modul operasi lengkap yang didesain untuk flow kerja spesifik. Modul Register digunakan untuk pendaftaran linen baru dengan binding RFID ke database. Modul Scanning berfungsi untuk identifikasi linen dengan menampilkan detail dan status linen. Modul Sorting melakukan pengelompokan linen berdasarkan kategori jenis. Modul Grouping mengelompokkan linen berdasarkan customer atau ruangan. Modul Delivery menangani persiapan pengiriman dengan pembuatan delivery order dan printing label. Terakhir, modul Linen Bersih digunakan untuk tracking linen bersih dengan update status clean.

## Studi Kasus: Efisiensi Delivery

Dampak implementasi OSLA Desktop dapat terlihat jelas pada proses delivery. Pada workflow tradisional tanpa sistem, mengumpulkan linen secara manual memakan waktu 10-15 menit, mencatat jenis dan jumlah satu per satu membutuhkan 5-10 menit, grouping per klien atau ruangan memakan 10-15 menit, pembuatan dokumen delivery membutuhkan 5 menit, dan printing label memerlukan 2 menit. Total waktu yang dibutuhkan adalah 32-47 menit.

Dengan OSLA Desktop, seluruh proses dapat diselesaikan dalam sekitar 3 menit. Linen cukup diletakkan di RFID reader untuk auto-scan yang hanya memakan 30 detik, pemilihan klien dan ruangan membutuhkan 1 menit, grouping otomatis dengan satu klik hanya 5 detik, review dan pembuatan delivery order memakan 1 menit, dan printing label dengan ZPL otomatis hanya 10 detik. Pengurangan waktu hingga lebih dari 90 persen ini menunjukkan dampak signifikan dari implementasi teknologi RFID dalam operasional linen.

## Keunggulan Kompetitif

Dibandingkan dengan solusi lain di pasar, OSLA Desktop menawarkan keunggulan yang signifikan. Kecepatan scanning mencapai ratusan tag per menit dibandingkan proses manual satu per satu. Akurasi scanning mencapai 99,9 persen dengan RFID dibandingkan 85-90 persen pada proses manual. Hardware support mendukung perangkat Zebra untuk both RFID dan printer. Aplikasi memiliki offline capability melalui local storage. Sistem printing menggunakan dual method dengan BrowserPrint dan fallback untuk reliability. Selain itu, aplikasi adalah native desktop dengan hardware bridge capability, bukan sekadar web-based solution.

## Kontak dan Tim

OSLA Desktop versi 1.1.6 dikembangkan oleh PT. Nuansa Cerah Informasi dengan Lead Developer Faisal Rahman. Aplikasi ini dilisensikan under MIT License dan terbukti memberikan nilai nyata bagi operasional linen di fasilitas kesehatan dan hospitality melalui kombinasi teknologi web modern dan hardware integration yang mature.

*Dokumentasi ini disusun untuk memberikan gambaran komprehensif mengenai OSLA Desktop dari perspektif teknis maupun bisnis.*
