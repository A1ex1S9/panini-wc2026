# Panini WC 2026 — Виртуальный альбом наклеек

Полноценный виртуальный альбом Panini для FIFA World Cup 2026:
**1 313 наклеек** с реальными игроками от всех **48 сборных** (данные с Wikipedia),
симулятор вскрытия пакетиков с анимацией карточек, альбом с разворотами по командам,
логотипы клубов, фото игроков и система обмена между пользователями.

| | |
|---|---|
| Бэкенд | Go 1.25 · Gin · GORM · PostgreSQL · Redis |
| Фронтенд | React 19 · TypeScript · Vite · Tailwind CSS 4 · Zustand |
| PWA | Устанавливается на iPhone/Android, safe area для Dynamic Island |
| Данные | Wikipedia squad pages + Wikidata SPARQL (фото P18, логотипы P154) |
| Деплой | GitHub Pages (фронтенд) · Render.com (бэкенд + PostgreSQL) · Upstash (Redis) |

## Быстрый старт (локально)

```bash
docker compose up -d postgres redis        # postgres на порту 5434

cd backend
export DATABASE_URL="postgres://panini:secret@localhost:5434/panini?sslmode=disable"
go run ./cmd/server                        # миграции + автосид + API на :8080

cd ../frontend
npm install
VITE_API_URL=http://localhost:8080 npm run dev   # UI на :5173
```

Или всё в контейнерах: `docker compose up --build`.

## Геймплей

- **Пакетики** (`/packs`): 10 пакетиков каждые 30 минут, 5 наклеек в каждом.
  Редкость: 70% обычные / 25% редкие (50+ матчей за сборную) / 5% легенды
  (Месси, Роналду, Мбаппе, Ямаль, Беллингем…). Кулдаун хранится в Redis
  (`pack_cooldown:{user_id}`, TTL 1800).
- **Альбом** (`/album`): 12 групп × 4 команды, командная карточка + сетка игроков
  на каждом развороте, пунктирные слоты для отсутствующих наклеек.
  На телефоне — нажми карточку внизу, потом нужный слот (вместо drag-and-drop).
  Нажми на приклеенную карточку — откроется в увеличенном виде.
- **Инвентарь** (`/inventory`): все наклейки, которые ещё не в альбоме, и дубли.
- **Обмен** (`/trade`): просматривай дубли других коллекционеров, предлагай
  обмен один-на-один. Принятие обмена выполняется в одной PostgreSQL-транзакции
  с блокировками строк и Redis-локом — ни одна наклейка не теряется.
- **Лидерборд** (`/`): топ коллекционеров по % заполнения альбома.

## Обновление данных

```bash
# Обновить фото и данные игроков
python3 scraper/scrape.py

# Добавить/обновить логотипы клубов
python3 scraper/scrape_logos.py

# Закоммитить и запушить — Render задеплоит и автоматически обновит БД
git add backend/seeddata/stickers.json && git push
```

Сидер делает upsert по `sticker_number` при каждом запуске сервера — данные
обновляются без потери коллекций пользователей. Фото раздаются с Wikimedia Commons,
при отсутствии — отображается силуэт.

## Деплой (бесплатно, без карты)

**Бэкенд → Render.com** (Blueprint в `render.yaml`, автодеплой при пуше):

```
Render.com → New → Blueprint → указать репозиторий
Вручную добавить переменную: REDIS_URL=rediss://... (из Upstash)
```

**Фронтенд → GitHub Pages**: пуш в `main` → Actions автоматически собирает
и публикует `frontend/dist` в ветку `gh-pages`.

Секреты репозитория: `RENDER_DEPLOY_HOOK`, `VITE_API_URL`.

## API

```
POST /api/auth/register | login | logout
GET  /api/album                      GET  /api/album/progress
POST /api/packs/open                 GET  /api/packs/status
POST /api/stickers/:id/stick         GET  /api/inventory
GET  /api/users                      GET  /api/users/:id/inventory
GET  /api/users/:id/album            GET  /api/leaderboard
POST /api/trades                     GET  /api/trades
PUT  /api/trades/:id/accept          PUT  /api/trades/:id/decline
DELETE /api/trades/:id
```

Все маршруты кроме auth и leaderboard требуют `Authorization: Bearer <JWT>`.

---

*Фанатский проект. Данные игроков и фото с Wikipedia/Wikimedia Commons.
Не аффилирован с Panini или FIFA.*
