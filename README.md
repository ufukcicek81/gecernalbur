<p align="center"><img src="icons/logo.svg" alt="Geçer Nalbur" width="420"></p>

# Geçer Nalbur v0.4.0

Hırdavat, nalbur ve yapı market işletmeleri için satış, stok, cari, tedarikçi, kasa, çek/senet, personel ve rapor yönetimi. Telefonda, tablette ve bilgisayarda çalışır; internet gerekmez. Android için APK olarak da kurulabilir.

Piyasadaki programlarla karşılaştırma ve yol haritası için: [ANALIZ.md](ANALIZ.md)

## Android kurulumu (APK)
1. `apk/GecerNalbur-0.4.0.apk` dosyasını telefona indir.
2. Dosyaya dokun; Android “bilinmeyen kaynaklardan yükleme” izni isterse bu kurulum için izin ver.
3. Uygulamayı aç, ilk girişi yap ve PIN'i hemen değiştir.

Android 7.0 ve üstü gerekir. Kamera izni yalnızca barkod okutmak için istenir.

## İlk giriş
- Kullanıcı: `ufuk`
- PIN: `1234`

İlk girişten sonra **Personel & Yetkiler → Düzenle** ile PIN'i değiştir. Varsayılan PIN kullanıldıkça ana sayfada uyarı görünür.

## v0.4.0 ile gelenler
**Satış**
- Ürün bazında KDV oranı; sepette ve fişte KDV dökümü
- Satır iskontosu / fiyat değiştirme ve sepet iskontosu (% / ₺ / toplamı yuvarla), yetkiye bağlı
- Parçalı ödeme (nakit + kart + banka + veresiye)
- USB/Bluetooth barkod okuyucu: barkod okutulunca ürün doğrudan sepete eklenir
- Kamerayla barkod: cihaz desteklemiyorsa yerleşik ZXing okuyucu devreye girer
- Bekleyen (askıya alınmış) sepetler
- Satış sonrası fiş yazdırma (58/80 mm termal veya A4) ve WhatsApp ile gönderme
- Kısmi iade: stok geri alınır, para kasadan veya cari hesaptan iade edilir
- Teklif / proforma: yazdır, WhatsApp ile gönder, onaylanınca tek dokunuşla satışa çevir

**Stok ve alış**
- Usta / Toptan için ürün bazında ayrı fiyat (boşsa ayarlardaki indirim oranı)
- Toplu fiyat güncelleme: kategori, marka veya tedarikçi bazında %, yuvarlama ile
- Raf ve barkod etiketi yazdırma (EAN-13 / Code128), “fiyatı değişenleri seç”
- Excel/CSV'den ürün içe aktarma (barkod veya ada göre günceller)
- Çok kalemli alış faturası
- Kritik stoktan tedarikçiye göre sipariş önerisi; WhatsApp, yazdır veya faturaya aktar

**Cari, kasa ve finans**
- Cari risk limiti ve vade; geciken cariler işaretlenir
- Cari ekstre: yazdır, CSV paylaş, WhatsApp ile borç hatırlatma
- Çek & senet takibi: portföy, tahsil, ciro, karşılıksız, verilen çek ödemesi, vade uyarıları
- Gider kategorileri; maaş/avans ödemeleri kasaya işlenir
- Gün sonu (Z): ödeme türlerine göre özet, kasa sayımı ve fark kaydı

**Raporlar**
- Net ciro, brüt kâr, marj, KDV, iade, giderler, tahmini net kâr
- Günlük ciro grafiği, ödeme dağılımı, en çok satanlar, kategori satışları, personel performansı
- Ölü stok (uzun süredir satılmayan ürünler ve bağlı sermaye)
- Rapor yazdırma ve CSV

**Güvenlik ve veri**
- PIN'ler şifrelenmiş (tuzlu SHA-256) olarak saklanır; eski veriler otomatik dönüştürülür
- Yeni yetkiler: iskonto, iade, teklif, çek/senet, raporlar, gün sonu
- Yedeği Drive / WhatsApp / e-posta ile paylaşma ve yedek hatırlatması
- Firma bilgileri, fiş genişliği, varsayılan KDV, vade ve diğer ayarlar

## Güvenlik notu
Veriler cihazda (tarayıcı / uygulama deposu) tutulur. Telefon değişimi veya uygulama silinmesine karşı düzenli yedek al. Farklı cihazlarda aynı veriyle çalışmak için merkezi veritabanı gerekir (yol haritasında). Program fişi bilgi fişidir; mali belge yerine geçmez.

## e-Belge
Kodla adaptör mimarisi korunur. Gerçek gönderim için Kodla API/test servis bilgileri ve güvenli backend gerekir. Ayrıntı: [KODLA_ENTEGRASYON_NOTU.md](KODLA_ENTEGRASYON_NOTU.md)

## APK'yı yeniden derleme
`android/build-apk.sh` Android Studio gerektirmeden APK üretir (aapt2, Robolectric android-all, dalvik-dx ve apksig araçlarını kullanır; betiğin başındaki açıklamaya bakın):

```bash
TOOLS=/araclarin/klasoru ./android/build-apk.sh
```

Uygulama imzası `android/gecer-nalbur.p12` anahtarıyla atılır. Güncellemelerin eski kurulumun üzerine (veriler silinmeden) yüklenebilmesi için aynı anahtar kullanılmalıdır.
