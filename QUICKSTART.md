# Data Agents - Flask Backend Hızlı Başlangıç

## 🚀 Backend Kurulumu (5 Dakika)

### 1. Backend Klasörüne Git
```bash
cd backend
```

### 2. Sanal Ortam Oluştur ve Aktifleştir
```bash
python -m venv venv
venv\Scripts\activate
```

### 3. Bağımlılıkları Yükle
```bash
pip install -r requirements.txt
```

### 4. Environment Dosyasını Ayarla
```bash
copy .env.example .env
```

`.env` dosyasını düzenle (opsiyonel):
- `SECRET_KEY` ve `JWT_SECRET_KEY` değiştir (production için)
- `USE_NGROK=true` yap (public URL istiyorsan)
- `NGROK_AUTH_TOKEN` ekle (ngrok kullanacaksan)

### 5. Server'ı Başlat
```bash
python app.py
```

✅ Server `http://127.0.0.1:5000` adresinde çalışacak!

---

## 🌐 Ngrok ile Public URL (Opsiyonel)

### 1. Ngrok Hesabı Oluştur
https://ngrok.com/ adresinden ücretsiz hesap aç

### 2. Auth Token Al
Dashboard'dan auth token'ını kopyala

### 3. .env Dosyasını Güncelle
```env
USE_NGROK=true
NGROK_AUTH_TOKEN=your_actual_token_here
```

### 4. Server'ı Başlat
```bash
python app.py
```

Console'da public URL gösterilecek:
```
🌐 NGROK TUNNEL STARTED
Public URL: https://xxxx-xx-xx-xx-xx.ngrok-free.app
```

---

## 🎮 Frontend Entegrasyonu

### 1. API URL'i Ayarla

`js/api.js` dosyasını aç ve `BASE_URL`'i güncelle:

**Local için:**
```javascript
BASE_URL: 'http://127.0.0.1:5000'
```

**Ngrok için:**
```javascript
BASE_URL: 'https://your-ngrok-url.ngrok-free.app'
```

### 2. Frontend'i Çalıştır

Live Server veya başka bir HTTP server ile `index.html`'i aç.

---

## ✅ Test Etme

### Browser Console'da Test

1. `index.html`'i aç
2. F12 ile Developer Tools'u aç
3. Console'da:

```javascript
// Server kontrolü
await API.checkServer()  // true dönmeli

// Kayıt
await API.register('testuser', 'test@test.com', 'test123')

// Giriş
await API.login('testuser', 'test123')

// Kayıt oluşturma
await API.createSave({
    save_name: 'Test Save',
    x: 100,
    y: 200,
    health: 100,
    scene: 'game',
    player_combo: 0,
    player_has_adrenaline: false,
    timestamp: 0
})

// Kayıtları listele
await API.listSaves()

// Leaderboard
await API.getLeaderboard()
```

---

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Kayıt
- `POST /api/auth/login` - Giriş
- `GET /api/auth/profile` - Profil

### Save/Load
- `GET /api/saves` - Kayıtları listele
- `POST /api/saves` - Kayıt oluştur
- `PUT /api/saves/<id>` - Kayıt güncelle
- `DELETE /api/saves/<id>` - Kayıt sil

### Leaderboard
- `GET /api/leaderboard` - Skor tablosu
- `POST /api/leaderboard` - Skor gönder
- `GET /api/leaderboard/stats` - İstatistikler

---

## 🔧 Troubleshooting

### "Module not found" hatası
```bash
pip install -r requirements.txt
```

### CORS hatası
`.env` dosyasında frontend URL'ini ekle:
```env
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

### Port 5000 kullanımda
`app.py`'de port'u değiştir:
```python
app.run(port=5001)
```

### Database hatası
```bash
del game.db  # Veritabanını sıfırla
python app.py  # Yeniden oluştur
```

---

## 📚 Daha Fazla Bilgi

Detaylı dokümantasyon için `backend/README.md` dosyasına bakın.
