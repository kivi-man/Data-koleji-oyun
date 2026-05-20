# 🎮 Data Agents - Oyunu Başlatma Rehberi

## ✅ Şu Anda Çalışan Serverlar

### Backend API Server
- **URL**: http://127.0.0.1:5000
- **Durum**: ✅ Çalışıyor
- **Görev**: Kullanıcı kayıt/giriş, kayıt/yükleme, leaderboard

### Frontend Game Server  
- **URL**: http://127.0.0.1:5500
- **Durum**: ✅ Çalışıyor
- **Görev**: Oyun dosyalarını serve etme

## 🎯 Oyunu Başlatma

### Adım 1: Browser'ı Aç

Tarayıcınızda şu adresi açın:

```
http://127.0.0.1:5500
```

veya

```
http://localhost:5500
```

### Adım 2: Oyun Yüklenecek

Oyun yüklendiğinde ana menüyü göreceksiniz:
- **Devam Et** - Kayıtlı oyun varsa
- **Yeni Oyun** - Yeni oyun başlat
- **Ayarlar** - Ses/müzik ayarları
- **Çıkış**

## 🔧 Sorun Giderme

### "Sayfa Açılmıyor" Hatası

Eğer sayfa açılmazsa:

1. **Server'ın çalıştığını kontrol edin:**
   ```
   http://127.0.0.1:5500
   ```
   
2. **Port'u değiştirin:**
   ```bash
   python -m http.server 5501
   ```
   Sonra `http://127.0.0.1:5501` adresini açın

### "API Bağlantı Hatası"

Eğer oyun açılıyor ama backend'e bağlanamıyorsa:

1. Backend server'ın çalıştığını kontrol edin:
   ```
   http://127.0.0.1:5000
   ```
   
2. `js/api.js` dosyasında `BASE_URL` doğru mu kontrol edin:
   ```javascript
   BASE_URL: 'http://127.0.0.1:5000'
   ```

### Console'da Hata Görüyorsanız

1. F12 ile Developer Tools'u açın
2. Console tab'ına bakın
3. Kırmızı hataları kontrol edin

## 📝 Serverları Yönetme

### Her İki Server'ı Başlatma

**Terminal 1 (Backend):**
```bash
cd backend
venv\Scripts\activate
python app.py
```

**Terminal 2 (Frontend):**
```bash
cd f:\kodlar\data agents - Kopya (3)
python -m http.server 5500
```

### Serverları Durdurma

Her iki terminal'de `Ctrl+C` tuşlarına basın.

### Yeniden Başlatma

Aynı komutları tekrar çalıştırın.

## 🎮 Oyun Kontrolleri

### Klavye
- **Yön tuşları**: Hareket
- **Q/E**: Sol/Sağ yumruk
- **X**: Adrenalin
- **Enter**: Diyalog ilerletme
- **ESC**: Pause menü

### Mobil
- **Virtual Joystick**: Hareket
- **Butonlar**: Aksiyonlar

## 🌐 Ngrok ile Dışarıdan Erişim

Eğer oyunu başkalarıyla paylaşmak istiyorsanız:

1. Backend'de `.env` dosyasını düzenleyin:
   ```env
   USE_NGROK=true
   NGROK_AUTH_TOKEN=your_token
   ```

2. Backend'i yeniden başlatın

3. Console'da gösterilen public URL'i kullanın

4. `js/api.js` dosyasında `BASE_URL`'i ngrok URL'i ile değiştirin

## ✅ Kontrol Listesi

- [x] Backend server çalışıyor (http://127.0.0.1:5000)
- [x] Frontend server çalışıyor (http://127.0.0.1:5500)
- [ ] Browser'da http://127.0.0.1:5500 açıldı
- [ ] Oyun menüsü görünüyor
- [ ] Oyun oynamaya başlandı

## 🆘 Yardım

Sorun yaşıyorsanız:

1. Her iki server'ın da çalıştığından emin olun
2. Browser console'u kontrol edin (F12)
3. Backend terminal'de hata mesajı var mı bakın
4. Frontend terminal'de hata mesajı var mı bakın
