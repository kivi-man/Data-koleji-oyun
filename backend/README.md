# Data Agents - Flask Backend

Web versiyonu için Flask backend API server.

## Özellikler

- ✅ JWT Authentication (Kullanıcı kayıt/giriş)
- ✅ Server-side Save/Load sistemi
- ✅ Leaderboard (Skor tablosu)
- ✅ Ngrok desteği (Public URL)
- ✅ CORS yapılandırması
- ✅ SQLite veritabanı

## Kurulum

### 1. Python Sanal Ortamı Oluşturma

```bash
cd backend
python -m venv venv
```

### 2. Sanal Ortamı Aktifleştirme

**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Bağımlılıkları Yükleme

```bash
pip install -r requirements.txt
```

### 4. Environment Dosyası Oluşturma

`.env.example` dosyasını `.env` olarak kopyalayın ve düzenleyin:

```bash
copy .env.example .env  # Windows
cp .env.example .env    # Linux/Mac
```

`.env` dosyasını düzenleyin:
```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here-change-this
JWT_SECRET_KEY=your-jwt-secret-here-change-this
DATABASE_URL=sqlite:///game.db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:5500
USE_NGROK=false
NGROK_AUTH_TOKEN=your-ngrok-auth-token
```

## Çalıştırma

### Local Server (Sadece yerel ağ)

```bash
python app.py
```

Server `http://127.0.0.1:5000` adresinde çalışacak.

### Ngrok ile Public URL

1. [Ngrok](https://ngrok.com/) hesabı oluşturun
2. Auth token'ınızı alın
3. `.env` dosyasında:
   ```env
   USE_NGROK=true
   NGROK_AUTH_TOKEN=your-actual-token-here
   ```
4. Server'ı başlatın:
   ```bash
   python app.py
   ```

Ngrok aktifse, console'da public URL gösterilecek:
```
🌐 NGROK TUNNEL STARTED
Public URL: https://xxxx-xx-xx-xx-xx.ngrok-free.app
Local URL:  http://127.0.0.1:5000
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Yeni kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/auth/profile` - Kullanıcı profili (JWT gerekli)
- `GET /api/auth/check` - Token kontrolü

### Save/Load

- `GET /api/saves` - Kullanıcının kayıtlarını listele (JWT gerekli)
- `GET /api/saves/<id>` - Belirli kaydı yükle (JWT gerekli)
- `POST /api/saves` - Yeni kayıt oluştur (JWT gerekli)
- `PUT /api/saves/<id>` - Kaydı güncelle (JWT gerekli)
- `DELETE /api/saves/<id>` - Kaydı sil (JWT gerekli)

### Leaderboard

- `GET /api/leaderboard` - Skor tablosunu getir
- `POST /api/leaderboard` - Skor gönder (JWT gerekli)
- `GET /api/leaderboard/user/<id>` - Kullanıcı sıralaması
- `GET /api/leaderboard/stats` - Global istatistikler

## Frontend Entegrasyonu

### API URL Ayarlama

`js/api.js` dosyasında `BASE_URL`'i güncelleyin:

```javascript
const API = {
    BASE_URL: 'http://127.0.0.1:5000',  // Local
    // veya
    BASE_URL: 'https://your-ngrok-url.ngrok-free.app',  // Ngrok
    ...
}
```

### Kullanım Örnekleri

```javascript
// Kayıt
await API.register('username', 'email@example.com', 'password');

// Giriş
await API.login('username', 'password');

// Kayıt oluşturma
await API.createSave({
    save_name: 'Save 1',
    x: 768,
    y: 1054,
    health: 100,
    scene: 'game',
    player_combo: 0,
    player_has_adrenaline: false,
    timestamp: 13218
});

// Kayıtları listeleme
const saves = await API.listSaves();

// Leaderboard
const leaderboard = await API.getLeaderboard('score', 100);
```

## Test Etme

### Postman ile Test

1. **Register:**
```
POST http://127.0.0.1:5000/api/auth/register
Content-Type: application/json

{
    "username": "testuser",
    "email": "test@test.com",
    "password": "test123"
}
```

2. **Login:**
```
POST http://127.0.0.1:5000/api/auth/login
Content-Type: application/json

{
    "username": "testuser",
    "password": "test123"
}
```

Response'dan `access_token`'ı alın.

3. **Save Game:**
```
POST http://127.0.0.1:5000/api/saves
Content-Type: application/json
Authorization: Bearer YOUR_ACCESS_TOKEN

{
    "save_name": "Save 1",
    "x": 768,
    "y": 1054,
    "health": 100,
    "scene": "game",
    "player_combo": 0,
    "player_has_adrenaline": false,
    "timestamp": 13218
}
```

## Veritabanı

SQLite veritabanı `backend/game.db` dosyasında saklanır.

### Veritabanını Sıfırlama

```bash
# Backend klasöründe
rm game.db  # Linux/Mac
del game.db  # Windows

# Server'ı tekrar başlatın, yeni veritabanı oluşturulacak
python app.py
```

## Troubleshooting

### CORS Hatası

`.env` dosyasında frontend URL'inizi `CORS_ORIGINS`'e ekleyin:
```env
CORS_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

### Ngrok Bağlantı Hatası

- Auth token'ın doğru olduğundan emin olun
- Ngrok hesabınızın aktif olduğunu kontrol edin
- Firewall ayarlarını kontrol edin

### Database Locked Hatası

SQLite aynı anda birden fazla yazma işlemini desteklemez. Production'da PostgreSQL kullanın.

## Production Deployment

Production için:

1. PostgreSQL kullanın:
```env
DATABASE_URL=postgresql://user:password@localhost/dbname
```

2. Güvenli secret key'ler oluşturun:
```python
import secrets
print(secrets.token_hex(32))
```

3. `FLASK_ENV=production` yapın

4. Gunicorn ile çalıştırın:
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## Lisans

MIT
