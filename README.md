# Nalbur Pro v0.3.5 — Personel + Yetkiler + Satış Onayı + Kodla e-Belge

Bu sürümde satış danışmanı/kullanıcı sistemi gerçek kullanım akışına yaklaştırıldı ve personel takip modülü eklendi.

## Yeni özellikler
- Kullanıcı adı + PIN ile giriş
- Yönetici / satış danışmanı rolleri
- Kullanıcı bazında işlem yetkileri
- Satış danışmanı yalnızca kendi satışlarını görebilir (varsayılan)
- Satış tamamlanmadan önce İşlem Özeti ve ikinci onay
- Satış kaydına satış danışmanı eklenir
- Personel kartında aylık net maaş
- Avans, maaş ödemesi, prim ve kesinti kayıtları
- Bu ay avans / maaş ödemesi / kalan maaş hesabı
- Yıllık izin hakkı, kullanılan ve kalan izin günü
- Yıllık, mazeret, rapor, ücretsiz izin kayıtları
- Satış danışmanı kendi personel özetini görebilir; yönetim işlemlerini göremez
- Alış fiyatı ve kâr bilgisi yetkisiz kullanıcıdan gizlenir

## İlk giriş
- Kullanıcı: `ufuk`
- PIN: `1234`

İlk testten sonra Personel & Yetkiler ekranından PIN'i değiştirin.

## Güvenlik notu
Bu GitHub Pages sürümü cihaz içi prototiptir. Kullanıcılar, PIN'ler ve personel kayıtları tarayıcı LocalStorage içinde saklanır. Farklı telefonlarda aynı hesapla güvenli giriş için merkezi backend/veritabanı kurulmalıdır. Canlı sürümde parola/PIN hashlenmeli ve yetki kontrolleri backend tarafında da zorunlu olmalıdır.

## e-Belge
Kodla adaptör mimarisi korunur. Gerçek gönderim için Kodla API/test servis bilgileri ve güvenli backend gerekir.
