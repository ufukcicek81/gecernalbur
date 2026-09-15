# Kodla API Entegrasyon Notu

## Nalbur Pro'nun beklediği fonksiyonlar

1. `taxpayerCheck(vknTckn)` — Müşteri e-Fatura kullanıcısı mı?
2. `sendEInvoice(invoice)` — e-Fatura oluştur/gönder.
3. `sendEArchive(invoice)` — e-Arşiv oluştur/gönder.
4. `getDocumentStatus(uuid)` — Belge GİB/Kodla durumu.
5. `getDocumentPdf(uuid)` — PDF.
6. `getDocumentXml(uuid)` — UBL-TR XML.
7. `cancelDocument(uuid, reason)` — Destekleniyorsa iptal/itiraz.
8. `listIncomingInvoices()` — Destekleniyorsa gelen faturalar.

## Güvenli akış
Tarayıcı Kodla API'sine doğrudan bağlanmaz. Nalbur Pro yalnızca kendi backend endpointlerine erişir. Backend, Kodla gizli bilgilerini secret olarak tutar.

## Beklenen backend yolları (bizim iç API'miz)
- `POST /api/ebelge/taxpayer-check`
- `POST /api/ebelge/invoices`
- `GET /api/ebelge/invoices/:uuid/status`
- `GET /api/ebelge/invoices/:uuid/pdf`
- `GET /api/ebelge/invoices/:uuid/xml`
- `POST /api/ebelge/invoices/:uuid/cancel`

Bu URL'ler Kodla'nın gerçek endpointleri değildir; Nalbur Pro ile güvenli backend arasındaki sözleşmedir. Kodla dokümanı geldiğinde backend tarafında eşleştirilir.
