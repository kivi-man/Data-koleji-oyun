# 🎮 Data Agents - Sunucu Başlatma Kılavuzu

## 📁 Başlatma Dosyaları

Projenizde 4 adet `.bat` dosyası oluşturuldu:

### 1. `start_all.bat` ⭐ (LOCAL OYNAMAK İÇİN)
**Local ağda oynamak için en iyi seçenek**

- Backend server (Port 5000)
- Frontend server (Port 5500)
- İki ayrı terminal penceresi açar

**Kullanım:**
```
Dosyaya çift tıklayın
```

---

### 2. `start_backend_ngrok.bat` 🌐 (İNTERNETTEN OYNAMAK İÇİN)
**Oyunu internetten erişilebilir yapar**

- Hem oyunu hem de API'yi tek URL'de sunar
- Port 5000'de çalışır
- Ngrok tunnel açar
- Public URL console'da gösterilir

**Kullanım:**
```
1. .env dosyasında NGROK_AUTH_TOKEN ekleyin
2. Dosyaya çift tıklayın
3. Console'da gösterilen public URL'i kullanın
```

---

### 3. `start_backend.bat`
**Sadece backend API server'ını başlatır**
- Port 5000'de çalışır
- Ngrok kapalı

### 4. `start_frontend.bat`
**Sadece frontend oyun server'ını başlatır**
- Port 5500'de çalışır

---

## 🚀 Hızlı Başlangıç (Local)

1. `start_all.bat` dosyasına **çift tıklayın**
2. Browser'da `http://127.0.0.1:5500` adresini açın
3. Oyna!

---

## 🌐 Ngrok ile Public URL (İnternetten Erişim)

Oyunu internetten erişilebilir yapmak için:

### Adım 1: .env Dosyasını Düzenle

`backend\.env` dosyasını açın ve token'ınızı ekleyin:
```env
USE_NGROK=true
NGROK_AUTH_TOKEN=your_token_here
```

### Adım 2: Server'ı Başlat

`start_backend_ngrok.bat` dosyasına çift tıklayın

### Adım 3: Public URL'i Aç

Console'da şöyle bir mesaj göreceksiniz:
```
🌐 NGROK TUNNEL STARTED
Public URL: https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

Bu URL'i tarayıcıda açtığınızda **doğrudan oyun açılacaktır**.

**Not:** Artık `js/api.js` dosyasını düzenlemenize GEREK YOKTUR. Sistem otomatik olarak çalışır.

---

## 🔧 Sorun Giderme

### "Sayfa bulunamadı" (404)

Ngrok URL'ini açtığınızda 404 hatası alıyorsanız, oyun dosyaları (index.html) doğru yerde olmayabilir. `backend` klasörünün bir üst dizininde `index.html` olduğundan emin olun.

### "API Bağlantı Hatası"

Ngrok ile bağlanırken API hatası alıyorsanız, `js/api.js` dosyasında `BASE_URL: ''` (boş string) olduğundan emin olun.

---

## ✅ Kontrol Listesi

- [ ] Python yüklü (3.8+)
- [ ] Backend bağımlılıkları yüklü
- [ ] `.env` dosyası oluşturulmuş
- [ ] Ngrok token eklenmiş

**Mutlu oyunlar! 🎮**
