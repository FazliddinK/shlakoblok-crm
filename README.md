# SHLAKOBLOK CRM

CRM-система учёта продаж шлакоблоков для работы в браузере по локальной сети.

## Возможности

- **Авторизация** — вход по логину и паролю, смена пароля
- **Пользователи** — добавление операторов и администраторов (только для admin)
- **Клиенты** — марка авто, гос. номер, телефон
- **Продажи** — шлакоблок, количество, цена за штуку, общая сумма
- **Печать чека** — термопринтер через браузер (80 мм)
- **Отчёты** — выручка, количество, топ клиентов, график по дням
- **Telegram** — уведомления в группу при каждом создании, изменении и удалении

## Запуск через Docker Compose

Подходит для Windows (Docker Desktop), Linux и сервера Ubuntu.

### Требования

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) или Docker + Compose (Linux)

### Шаги

```bash
# 1. Перейдите в папку проекта
cd shlakoblok-crm

# 2. Создайте файл настроек (если ещё нет)
cp .env.example .env
# Отредактируйте .env — Telegram, SESSION_SECRET

# 3. Сборка и запуск
docker compose up -d --build

# 4. Просмотр логов
docker compose logs -f
```

Откройте в браузере: **http://localhost:43123**

Логин: `admin` / Пароль: `admin123`

### Полезные команды

```bash
docker compose down          # остановить
docker compose up -d --build # пересобрать после изменений
docker compose restart       # перезапуск
```

База данных хранится в Docker-томе `shlakoblok-data` и не удаляется при перезапуске.

---

## Установка на Ubuntu Server (без Docker)

```bash
# 1. Установите Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Скопируйте проект на сервер и установите зависимости
cd /opt/shlakoblok-crm
npm install

# 3. Настройте переменные окружения
cp .env.example .env
nano .env
```

### Переменные `.env`

```env
DATABASE_URL="file:./data/shlakoblok.db"
SESSION_SECRET="длинная-случайная-строка-минимум-32-символа"
TELEGRAM_BOT_TOKEN="ваш-токен-бота"
TELEGRAM_CHAT_ID="-1004435680345"
```

```bash
# 4. Создайте базу данных
mkdir -p prisma/data
npm run db:setup

# 5. Соберите и запустите
npm run build
npm start
```

Приложение будет доступно по адресу `http://IP-СЕРВЕРА:43123` для всех компьютеров в локальной сети.

### Автозапуск (systemd)

```ini
# /etc/systemd/system/shlakoblok-crm.service
[Unit]
Description=SHLAKOBLOK CRM
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/shlakoblok-crm
ExecStart=/usr/bin/npm start
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable shlakoblok-crm
sudo systemctl start shlakoblok-crm
```

## Вход

- **Логин:** `admin`
- **Пароль:** `admin123`

Смените пароль после первого входа в разделе **Настройки**.

## Пользователи

Администратор может в **Настройки → Пользователи**:
- добавить нового оператора или администратора
- сменить пароль любому пользователю
- удалить пользователя

Каждый пользователь может сменить свой пароль в **Настройки → Смена пароля**.

## Печать чека

1. Оформите продажу → нажмите **«Сохранить и печать»**
2. Браузер откроет окно печати
3. Выберите термопринтер (80 мм), настройте в Windows/Linux как принтер по умолчанию
4. Разрешите всплывающие окна для сайта CRM

## Telegram-уведомления

Бот отправляет сообщение в группу при каждом:
- добавлении / изменении / удалении клиента
- добавлении / изменении / удалении продажи

Убедитесь, что бот добавлен в группу как администратор.

## Стек

- Next.js 16, TypeScript, Tailwind CSS, shadcn/ui
- SQLite (Prisma ORM)
- iron-session (авторизация)
