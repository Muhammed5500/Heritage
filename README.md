# Heritage · Decentralized Dead Man’s Switch on Sui

Heritage, sahibinin belirli bir süre “heartbeat” göndermemesi durumunda mirası (SUI fonu + şifreli gizli içerik) güvenli biçimde varise aktaran, Sui üstünde çalışan bir çözüm.

## İçindekiler
- [Mimari](#mimari)
- [Özellikler](#özellikler)
- [Ön Koşullar](#ön-koşullar)
- [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)
- [Ortam Değişkenleri](#ortam-değişkenleri)
- [Frontend Komutları](#frontend-komutları)
- [Akışlar](#akışlar)
- [Sui Move Akıllı Kontratı](#sui-move-akıllı-kontratı)
- [Depolama (Walrus)](#depolama-walrus)
- [Güvenlik Notları](#güvenlik-notları)
- [Lisans](#lisans)

## Mimari
```
heritage/
├── apps/
│   ├── contract/      # Sui Move akıllı kontratı
│   └── web/           # React + Vite frontend
├── packages/tsconfig/ # Paylaşılan TS ayarları
└── package.json       # Kök script’ler
```

- Frontend: React, TypeScript, Vite, Tailwind.
- Blockchain: Sui Move.
- Depolama: Walrus (blob upload/download).
- Kripto: Shamir’s Secret Sharing (5-3), NaCl tabanlı şifreleme.

## Özellikler
- Legacy oluşturma: Miras bırakacak kişi, sırrını AES ile şifreler, anahtarı 5 parçaya (5-3 şeması) böler.
- Walrus entegrasyonu: Şifreli payload ve paylar Walrus’a yüklenir; zincire yalnızca kullanışsız tekil paylar + referanslar gider.
- Heartbeat (I’m Alive): Süre dolmadan sahip “I’m Alive” göndererek kilidi yeniler.
- Claim akışı: Süre dolunca varis, pay + saklanan paylar ile sırrı çözer.
- SuiNS desteği: Beneficiary alanı `.sui` / `.sol` isimlerini otomatik adrese çözer (useSuiClient.resolveNameServiceAddress).
- Doğrudan RPC: Testnet için varsayılan `https://fullnode.testnet.sui.io:443` kullanılır, proxy yok.

## Ön Koşullar
- Node.js ≥ 18
- npm (repo `package-lock.json` kullanıyor)
- Sui CLI (kontrat derleme/test için)

## Kurulum ve Çalıştırma
Kökten çalıştırın:
```bash
# Bağımlılıkları yükle
npm install

# Geliştirme (frontend)
npm run dev

# Frontend build
npm run build
```

## Ortam Değişkenleri
Frontend (`apps/web`) için `.env.local` örneği:
```
# Opsiyonel: özel RPC, yoksa public testnet kullanılır
VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Opsiyonel: paket ID override
VITE_PACKAGE_ID_TESTNET=0x...
VITE_PACKAGE_ID_MAINNET=0x...
VITE_PACKAGE_ID_DEVNET=0x...

# Opsiyonel: Walrus aggregator override
VITE_WALRUS_AGGREGATOR_URL=https://...
```

## Frontend Komutları
(Kökten veya `apps/web` içinde)
```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run lint     # eslint .
```

## Akışlar

### 1) Legacy Oluşturma (`CreateLegacyPage.tsx`)
- AES anahtarı üretilir, secret şifrelenir.
- Anahtar 5 paya bölünür (5-3).
- Pay 2 Walrus’a yedek olarak yüklenir; 3,4,5 varisin public key’iyle şifrelenip zincire yazılır.
- Walrus blob ID’leri ve kilit süresiyle kontratta Legacy Box oluşturulur.
- Beneficiary alanı SuiNS adı girildiğinde otomatik adrese çözülür.

### 2) Heartbeat / Dashboard (`DashboardPage.tsx`)
- Sahip mevcut legacy’leri listeler, “Refresh” ile yeniler.
- “I’m Alive” (heartbeat) göndererek kilidi sıfırlar.
- Gerekirse “Cancel & Withdraw” ile kasayı kapatır.

### 3) Claim ve Şifre Çözme (`ClaimPage.tsx`)
- Varis, vault ID ile arama yapar; süre dolduysa claim eder.
- Heir Share + Walrus’tan pay + zincirdeki şifreli paylarla sır çözülür.
- Kasa varisin public key’iyle şifrelendiyse, varisin ilgili private key’i girilmelidir; demo anahtar senaryosunda tarayıcıdaki kayıt kullanılır.

## Sui Move Akıllı Kontratı (`apps/contract`)
- Ana obje: LegacyBox
- Alanlar: owner, beneficiary, unlock_time_ms, last_heartbeat, encrypted_blob_id, locked_shares, balance.
- Giriş fonksiyonları: `create_legacy`, `im_alive`, `claim_legacy`, `add_funds`.
- Komutlar (apps/contract içinde):
```bash
npm run build   # Sui Move build
npm run test    # Move testleri
```

## Depolama (Walrus)
- Basit SDK (`apps/web/src/services/walrus-sdk.ts`): Aggregator GET `.../v1/blobs/{blobId}`, Publisher PUT `.../v1/blobs?epochs=1` (varsayılan).
- Gelişmiş entegrasyon (`apps/web/src/services/walrus.ts`): CDN’den Walrus SDK yükler, upload relay + birden çok aggregator fallback’i kullanır, varsayılan `DEFAULT_EPOCHS = 5`.
- WASM, jsDelivr CDN’den yüklenir; `@mysten/walrus-wasm` npm paketi kullanılmaz.

## Güvenlik Notları
- Şifreleme tamamen istemci tarafında; sır düz metin olarak sunucuya gitmez.
- Shamir 5-3 şeması: tekil paylar tek başına işe yaramaz.
- Varis public key’iyle şifreleme yapıldıysa, çözüm için ilgili private key zorunludur.
- RPC olarak public testnet/fullnode kullanılır; proxy gerekmez.

## Lisans
MIT
