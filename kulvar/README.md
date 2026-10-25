<p align="center"><img src="icons/logo.svg" alt="Kulvar" width="360"></p>

# Kulvar v1.1.0 — Yüzücü Takip

Yüzme yarış sonuçları, sporcu gelişim analizi, karşılaştırma, sıralamalar ve rekorlar. Telefonda, tablette ve bilgisayarda çalışır; internet gerekmez. PWA olarak kurulabilir, Android için APK'sı vardır. Tüm özellikler ücretsizdir.

## Kurulum
**Android (APK):** `apk/Kulvar-1.1.0.apk` dosyasını telefona indirip açın; “bilinmeyen kaynaklar” izni isterse verin. Android 7.0+ gerekir.

**PWA:** Klasörü HTTPS ile yayınlayın (GitHub Pages, Netlify vb.), sayfayı telefonda açıp “Ana ekrana ekle” deyin. Yerelde denemek için: `python3 -m http.server` → `http://localhost:8000`.

## Ekranlar
| Ekran | Açıklama |
|---|---|
| Ana sayfa | Haber slaytı, bildirim uyarısı, “Popüler Menüler” (ızgara / liste görünümü), takip edilen sporcular |
| Güncel Sonuçlar | Son yarışın her branşta ilk üçü |
| Tüm Yarışlar | Sezon ve metin filtresi; yarış → branş → erkek/kadın, yaş grubu filtresiyle sonuç listesi |
| Sporcu | Kişisel rekorlar (50/25 m), puanlar, kürsü sayıları, yarış geçmişi, takip et, paylaş |
| Sporcu Analiz | Derece gelişim grafiği, gelişim yüzdesi, doğum yılı içindeki sıralama |
| Karşılaştırma | İki sporcunun branş branş rekorları ve aynı yarıştaki karşılaşmaları |
| En İyi 100 | Branş, havuz, cinsiyet, doğum yılı ve sezona göre |
| Zirvedekiler | Her branşta ilk üç |
| Türkiye / Dünya Rekorları | Düzenlenebilir rekor listeleri |
| Ara | Sporcu, kulüp, yarış (Türkçe karakter duyarsız) |
| Haberler, Bildirimler, Profil | Bildirim izni, takip edilenler, veri yönetimi |

## Veri
- Tüm veri cihazda (`localStorage`) tutulur. İlk açılışta **kurgusal demo verisi** yüklenir (72 sporcu, 8 kulüp, 10 yarış). Profil → “Demo verisini sil” ile temizlenir.
- **Dünya rekorları örnek olarak** eklenmiştir; resmi World Aquatics listesinden doğrulanmalıdır. **Türkiye rekorları boş** gelir; federasyon listesinden eklenmelidir.
- **Puan:** `1000 × (taban / derece)³`; taban = 50 m dünya rekoru (25 m havuzda %2,5 daha hızlı).
- **CSV içe aktarma** (`,` veya `;` ayraçlı, başlık satırı zorunlu):
  ```
  yaris;tarih;sehir;havuz;ad;soyad;dogum_yili;cinsiyet;kulup;brans;derece
  Kış Kupası;24.01.2026;İstanbul;25;Elif;Kaya;2012;K;Mavi Dalga SK;100 Serbest;1:02,45
  ```
  Branş “100SER”, “100 Serbest”, “100m Sırtüstü” biçimlerinde yazılabilir. Aynı sporcu + yarış + branş tekrar eklenmez.
- **Yedek:** Profil → Yedek al / Yedekten geri yükle (JSON).

## Bildirimler
Takip edilen sporcuya yeni derece eklendiğinde (elle ya da CSV ile) uygulama içi bildirim oluşur; izin verildiyse telefon bildirimi de gösterilir (PWA'da service worker, APK'da yerel Android bildirimi). Kişisel rekor ayrıca belirtilir.
Not: Sunucu olmadığı için bildirimler yalnızca veri bu cihaza eklendiğinde tetiklenir. Uzaktan (push) bildirim için bir sunucu ve sonuç kaynağı gerekir.

## Dosyalar
```
index.html, styles.css, app.js   arayüz ve tüm ekranlar
data.js                          sabitler, örnek dünya rekorları, demo veri üreteci
sw.js, manifest.webmanifest      PWA (çevrimdışı önbellek, bildirim tıklaması)
icons/                           logo ve uygulama simgeleri
android/                         WebView kabuğu (MainActivity), kaynaklar, derleme betiği
apk/Kulvar-1.1.0.apk             imzalı APK
```

## APK derleme
Gradle / Android Studio gerekmez; ayrıntılar `android/build-apk.sh` başında:
```
TOOLS=/araçlar/klasörü ./android/build-apk.sh
```
APK `android/kulvar.p12` anahtarıyla imzalanır. Güncellemelerin eski sürümün üzerine kurulabilmesi için bu dosya korunmalıdır.
