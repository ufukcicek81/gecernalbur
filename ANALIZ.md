# Geçer Nalbur — Sistem Analizi ve Piyasa Karşılaştırması

Bu belge, programın v0.3.5 (Nalbur Pro) halini inceler, Türkiye'de nalbur / hırdavat / yapı market işletmelerinin kullandığı yazılım türleriyle karşılaştırır ve v0.4.0 (Geçer Nalbur) ile yapılan eklemeleri ve kalan eksikleri listeler.

> Not: Rakip ürünlerin özellikleri genel kategori düzeyinde, yaygın bilinen işlevlere göre değerlendirilmiştir. Paket/sürüm farkları olabilir; satın alma kararı öncesi ilgili firmanın güncel tanıtımına bakılmalıdır.

## 1. Karşılaştırılan yazılım grupları

| Grup | Örnekler | Güçlü yanı | Zayıf yanı (küçük nalbur için) |
|---|---|---|---|
| Masaüstü ERP / ön muhasebe | Akınsoft Wolvox, Logo (Go / Tiger / İşbaşı), Mikro, Netsis | Muhasebe entegrasyonu, çoklu depo, çek-senet, e-Fatura, yazar kasa (ÖKC) bağlantısı | Pahalı lisans, kurulum ve eğitim gerektirir, telefonda zayıf |
| Barkodlu hızlı satış programları | Perakende/market POS yazılımları | Hızlı kasa ekranı, barkod okuyucu, terazi, fiş yazıcı | Cari / tedarikçi / çek-senet tarafı genelde sınırlı |
| Bulut ön muhasebe | Paraşüt, Bizim Hesap, benzerleri | Her yerden erişim, e-Fatura/e-Arşiv, banka entegrasyonu | Aylık abonelik, internet şart, nalbura özgü raf/etiket/usta fiyatı yok |
| **Geçer Nalbur** | Bu proje | Ücretsiz, çevrimdışı, telefonda rahat, nalbura özgü (usta/toptan fiyatı, metre/kg/torba satış, raf yeri) | Tek cihazda veri, resmi e-belge ve ÖKC bağlantısı henüz yok |

## 2. Özellik karşılaştırması

✅ var · ⚠️ kısmen · ❌ yok

| Özellik | v0.3.5 (önce) | **v0.4.0 (şimdi)** | Masaüstü ERP | Bulut ön muhasebe |
|---|---|---|---|---|
| Hızlı satış, kategori, barkod kamerası | ✅ | ✅ (+ kamera yedek okuyucu) | ✅ | ⚠️ |
| USB/Bluetooth barkod okuyucu (Enter ile sepete) | ❌ | ✅ | ✅ | ⚠️ |
| Ondalıklı satış (metre, kg, torba) | ✅ | ✅ | ✅ | ✅ |
| Fiyat grupları (perakende/usta/toptan) | ⚠️ sabit oran | ✅ ürün bazlı fiyat + ayarlanabilir oran | ✅ | ⚠️ |
| Ürün bazında KDV oranı ve KDV dökümü | ❌ | ✅ | ✅ | ✅ |
| Satır iskontosu / fiyat değiştirme | ❌ | ✅ (yetkiye bağlı) | ✅ | ✅ |
| Sepet iskontosu / toplamı yuvarlama | ❌ | ✅ | ✅ | ⚠️ |
| Parçalı ödeme (nakit + kart + veresiye) | ❌ | ✅ | ✅ | ⚠️ |
| Satış iadesi (kısmi) | ❌ (yalnızca silme) | ✅ stok, kasa veya cariye geri işler | ✅ | ✅ |
| Fiş yazdırma (58/80 mm termal, A4) | ❌ | ✅ | ✅ | ⚠️ |
| Fişi WhatsApp ile gönderme | ❌ | ✅ | ⚠️ | ⚠️ |
| Bekleyen (askıya alınan) sepet | ❌ | ✅ | ✅ | ❌ |
| Teklif / proforma, satışa çevirme | ❌ | ✅ | ✅ | ✅ |
| Cari risk limiti ve vade takibi | ❌ | ✅ | ✅ | ✅ |
| Cari ekstre (yazdır/paylaş) ve WhatsApp hatırlatma | ❌ | ✅ | ✅ | ✅ |
| Çek / senet takibi (portföy, ciro, karşılıksız) | ❌ | ✅ | ✅ | ⚠️ |
| Çok kalemli alış faturası | ❌ (tek ürün) | ✅ | ✅ | ✅ |
| Kritik stoktan sipariş önerisi (WhatsApp/yazdır) | ❌ | ✅ | ✅ | ❌ |
| Toplu fiyat güncelleme (zam %, yuvarlama) | ❌ | ✅ kategori/marka/tedarikçi bazlı | ✅ | ⚠️ |
| Raf / barkod etiketi yazdırma | ❌ | ✅ EAN-13 / Code128 | ✅ | ❌ |
| Excel/CSV'den ürün aktarma | ❌ (yalnızca dışa) | ✅ içe + dışa | ✅ | ✅ |
| Gider kategorileri | ❌ | ✅ | ✅ | ✅ |
| Gün sonu (kasa sayımı, fark) | ❌ | ✅ | ✅ | ⚠️ |
| Raporlar (kâr, KDV, en çok satan, kategori, personel, ölü stok) | ⚠️ 7 günlük grafik | ✅ | ✅ | ✅ |
| Personel, yetki, maaş/avans, izin | ✅ | ✅ (+ maaş/avans kasaya işlenir) | ⚠️ ayrı modül | ❌ |
| Satış danışmanı bazlı performans | ⚠️ | ✅ | ✅ | ❌ |
| PIN / şifre güvenliği | ❌ düz metin | ✅ SHA-256 + tuz | ✅ | ✅ |
| Yedekleme | ⚠️ JSON indirme | ✅ + Drive/WhatsApp paylaşımı + hatırlatma | ✅ | ✅ (bulut) |
| Çevrimdışı çalışma | ✅ | ✅ | ✅ | ❌ |
| Android uygulaması (APK) | ❌ | ✅ | ⚠️ | ✅ |
| e-Fatura / e-Arşiv (resmi gönderim) | ⚠️ taslak | ⚠️ taslak (Kodla API bekleniyor) | ✅ | ✅ |
| Yazar kasa (Yeni Nesil ÖKC / POS) entegrasyonu | ❌ | ❌ | ✅ | ⚠️ |
| Çok cihaz / şube eş zamanlı veri | ❌ | ❌ | ✅ | ✅ |
| Çoklu depo, birim çevrimi (koli→adet) | ❌ | ❌ | ✅ | ⚠️ |
| Muhasebe programına aktarım / e-Defter | ❌ | ❌ | ✅ | ✅ |

## 3. v0.3.5'te tespit edilen sorunlar ve düzeltmeler

| Sorun | Etki | Düzeltme |
|---|---|---|
| PIN'ler tarayıcıda düz metin saklanıyordu | Yedek dosyasını gören herkes tüm PIN'leri okuyabilirdi | PIN'ler kullanıcı başına tuzla SHA-256 olarak saklanıyor; eski veriler ilk açılışta otomatik dönüştürülüyor |
| Satış geçmişi arama kutusu eski fonksiyona bağlıydı | Arama yapınca danışman tüm satışları görebiliyor, “Danışman” sütunu kayıyordu | Arama, yetki filtreli güncel listeye bağlandı |
| Ürün arama kutusu eski fonksiyona bağlıydı | Arama yapınca alış fiyatı/kâr sütunları yetkisiz kullanıcıya görünüyordu | Güncel (yetki kontrollü) listeye bağlandı |
| Personel kaydı olmayan eski bir yedeği yükleme veya “Tüm veriyi sıfırla” sonrası personel listesi oluşmuyordu | Ekran hata verip açılmıyordu | Yükleme/sıfırlama sonrası veri yükseltmesi otomatik çalışıyor |
| “Tüm veriyi sıfırla” tek onayla çalışıyordu | Yanlışlıkla tüm veriler silinebilirdi | “SIFIRLA” yazarak ikinci onay isteniyor |
| Satıştan iade yoktu, yalnızca komple silme vardı | Kısmi iadede stok/kasa yanlış kalıyordu | Kısmi iade modülü eklendi; iadesi olan satış silinemiyor |
| Maaş/avans ödemeleri kasaya yansımıyordu | Kasa bakiyesi gerçekte olduğundan yüksek görünüyordu | Ödeme kasadan/bankadan düşülüyor (isteğe bağlı) |
| Usta/Toptan indirimi koda gömülüydü (%10 / %18) | Değiştirmek için programcı gerekiyordu | Ayarlardan değiştirilebiliyor; ürün bazında ayrı usta/toptan fiyatı girilebiliyor |

## 4. “Fazla” olan veya sadeleştirilebilecek noktalar

- **Satış onay ekranı:** Yoğun tezgâhta her satışta ek dokunuş gerektirir. Hata yapmayı azalttığı için korundu; ileride “hızlı mod” seçeneği eklenebilir.
- **e-Belge “TEST Gönder” düğmesi:** Gerçek gönderim yapmadığı halde gönderilmiş gibi algılanabilir. Ekranda “simülasyon” uyarısı var; Kodla API bağlanınca gerçek akışla değiştirilmeli.
- **Personel izin/maaş modülü:** Çoğu nalbur yazılımında yoktur; küçük işletme için faydalı olduğundan korundu, ancak resmi bordro yerine geçmez.
- **Bilgi fişi:** Programın fişi mali belge değildir (fişte “Bilgi fişidir, mali değeri yoktur” yazar). Perakende satışta yasal olarak ÖKC fişi veya e-Arşiv fatura düzenlenmelidir.

## 5. Kalan eksikler (yol haritası)

Öncelik sırasına göre:

1. **Merkezi veritabanı ve çok cihaz senkronizasyonu.** Şu an her telefonun verisi kendi içindedir. Sunucu (ör. Cloudflare Worker + D1/Supabase) ile tüm cihazlar aynı veriyi görür, kullanıcı girişi sunucuda doğrulanır.
2. **Resmi e-Fatura / e-Arşiv (Kodla API).** Altyapı ve backend sözleşmesi hazır (`KODLA_ENTEGRASYON_NOTU.md`); API bilgileri gelince bağlanır.
3. **Yeni Nesil ÖKC (yazar kasa POS) entegrasyonu.** Perakende satışta yasal zorunluluk; cihaz üreticisinin SDK'sı gerekir.
4. **Birim çevrimi:** Koli→adet, top→metre gibi alış ve satış birimlerinin farklı olduğu ürünler.
5. **Alış iadesi ve tedarikçi ekstresi** (tedarikçi hareketlerinin ayrı listelenmesi).
6. **Toplu stok sayımı ekranı** (barkod okutarak sayım, fark raporu).
7. **Çoklu depo / şube.**
8. **Muhasebeciye aktarım** (Excel/XML formatında dönem satış-alış listesi).
9. **Kampanya / müşteri sadakat puanı, SMS bildirim.**

## 6. Teknik özet

- Web uygulaması (PWA): `index.html`, `app.js` (v0.3.5 çekirdeği), `app-v40.js` (v0.4.0 modülleri), `styles.css`.
- Veri, mevcut kullanıcıların kaybolmaması için aynı anahtarla (`nalburProData`) saklanır; v0.3.5 verisi ilk açılışta otomatik yükseltilir.
- Android uygulaması: `android/` klasöründeki WebView kabuğu. Web dosyaları APK içine gömülür, internet gerekmeden çalışır. Kamera (barkod), dosya seçme (yedek yükleme), İndirilenler'e kaydetme, paylaşma ve Android yazdırma servisi (yazıcı / PDF) desteklenir.
- Logo: `icons/logo.svg` (yatay), `icons/logo-mark.svg` (simge).
