export type Locale = "uz" | "ru";

export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "shlakoblok_locale";

const UZ_TRANSLATIONS: Record<string, string> = {
  "Продажи": "Sotuvlar",
  "Расходы": "Xarajatlar",
  "Клиенты": "Mijozlar",
  "Отчёты": "Hisobotlar",
  "Изменения и удалённые": "O‘zgarishlar va o‘chirilganlar",
  "Настройки": "Sozlamalar",
  "Выйти": "Chiqish",
  "Разработчик": "Dasturchi",
  "Загрузка...": "Yuklanmoqda...",
  "Язык": "Til",
  "Русский": "Rus tili",
  "Узбекский": "O‘zbek tili",

  "Пользователь": "Foydalanuvchi",
  "Пользователи": "Foydalanuvchilar",
  "Пользователей": "Foydalanuvchilar",
  "Пользователей нет": "Foydalanuvchilar yo‘q",
  "Выберите пользователя": "Foydalanuvchini tanlang",
  "Вход как": "Kirish",
  "Пароль": "Parol",
  "Пароль *": "Parol *",
  "Войти": "Kirish",
  "Вход в систему учёта продаж": "Sotuvlar hisob tizimiga kirish",
  "Неверный пароль": "Parol noto‘g‘ri",
  "Не удалось подключиться к серверу": "Serverga ulanib bo‘lmadi",
  "Имя": "Ism",
  "Имя *": "Ism *",
  "Логин": "Login",
  "Логин *": "Login *",
  "Роль": "Rol",
  "Администратор": "Administrator",
  "Админ": "Administrator",
  "Оператор": "Operator",
  "Новый пользователь": "Yangi foydalanuvchi",
  "Создать": "Yaratish",
  "Удалить пользователя": "Foydalanuvchini o‘chirish",
  "Пароль пользователя": "Foydalanuvchi paroli",
  "добавлен": "qo‘shildi",
  "изменён": "o‘zgartirildi",
  "удалён": "o‘chirildi",
  "Иван Петров": "Ali Valiyev",

  "С": "Dan",
  "По": "Gacha",
  "Сегодня": "Bugun",
  "Вчера": "Kecha",
  "Текущая неделя": "Joriy hafta",
  "Эта неделя": "Joriy hafta",
  "Текущий месяц": "Joriy oy",
  "Этот месяц": "Joriy oy",
  "Прошлый месяц": "O‘tgan oy",
  "Последние 7 дней": "Oxirgi 7 kun",
  "Произвольный период": "Ixtiyoriy davr",
  "Весь период": "Barcha davr",
  "Период": "Davr",

  "Клиент": "Mijoz",
  "Клиентов": "Mijozlar",
  "Новый клиент": "Yangi mijoz",
  "Добавить клиента": "Mijoz qo‘shish",
  "Редактировать клиента": "Mijozni tahrirlash",
  "Марка": "Marka",
  "Марка авто": "Avtomobil markasi",
  "Марка авто *": "Avtomobil markasi *",
  "Гос. номер": "Davlat raqami",
  "Гос. номер *": "Davlat raqami *",
  "Гос. номер автомобиля": "Avtomobil davlat raqami",
  "Гос. номер клиента": "Mijoz davlat raqami",
  "Гос. номер выдачи": "Berishdagi davlat raqami",
  "Гос. номер при выдаче": "Berishdagi davlat raqami",
  "Телефон": "Telefon",
  "Заметки": "Izohlar",
  "Примечание": "Izoh",
  "Баланс": "Balans",
  "Продаж": "Sotuvlar",
  "Клиентов пока нет": "Hozircha mijozlar yo‘q",
  "Баланс, погашение долга и акт сверки": "Balans, qarzni to‘lash va solishtirma dalolatnoma",
  "Поиск по марке, номеру, телефону...": "Marka, davlat raqami yoki telefon bo‘yicha qidirish...",
  "Долг": "Qarz",
  "Долг клиента": "Mijoz qarzi",
  "Предоплата": "Oldindan to‘lov",
  "Предоплата/переплата": "Oldindan to‘lov/ortiqcha to‘lov",
  "Погасить долг": "Qarzni to‘lash",
  "Погасить полностью": "To‘liq to‘lash",
  "Погашение долга": "Qarzni to‘lash",
  "Погашение долга клиента": "Mijoz qarzini to‘lash",
  "Погашения долга": "Qarz to‘lovlari",
  "Текущий долг": "Joriy qarz",
  "Сумма погашения, сум": "To‘lov summasi, so‘m",
  "Частично": "Qisman",
  "Акт сверки": "Solishtirma dalolatnoma",
  "Не удалось сформировать акт сверки": "Solishtirma dalolatnomani shakllantirib bo‘lmadi",
  "Excel-файл с начислениями, оплатами и сальдо как в бухгалтерском акте сверки.": "Buxgalteriya solishtirma dalolatnomasidagi kabi hisoblangan summalar, to‘lovlar va saldo ko‘rsatilgan Excel fayl.",
  "Скачать Excel": "Excel yuklab olish",

  "Расход": "Xarajat",
  "Новый расход": "Yangi xarajat",
  "Журнал расходов": "Xarajatlar jurnali",
  "Журнал расходных операций": "Xarajat operatsiyalari jurnali",
  "Итого за период": "Davr bo‘yicha jami",
  "Расходов за выбранный период нет": "Tanlangan davr uchun xarajatlar yo‘q",
  "Категория": "Toifa",
  "Категория расходов": "Xarajat toifasi",
  "Категория расходов *": "Xarajat toifasi *",
  "Контрагент": "Kontragent",
  "Контрагент *": "Kontragent *",
  "Выберите или введите новую": "Tanlang yoki yangi toifani kiriting",
  "Выберите или введите нового": "Tanlang yoki yangi kontragentni kiriting",
  "Сумма": "Summa",
  "Сумма, сум *": "Summa, so‘m *",

  "Продажи, касса, долги и расходы": "Sotuvlar, kassa, qarzlar va xarajatlar",
  "Продано товара": "Sotilgan tovar",
  "Сумма проданного товара": "Sotilgan tovar summasi",
  "Средняя цена за штуку": "Bir dona uchun o‘rtacha narx",
  "Фактический отпуск со склада (наличка и долг)": "Ombordan haqiqiy berilgan tovar (naqd va qarzga)",
  "Итог всех продаж за период": "Davrdagi barcha sotuvlar jami",
  "Сумма ÷ количество": "Summa ÷ miqdor",
  "Фактический остаток в кассе": "Kassadagi haqiqiy qoldiq",
  "Текущий остаток кассы": "Kassaning joriy qoldig‘i",
  "Сумма предоплат клиентов": "Mijozlarning oldindan to‘lovlari summasi",
  "Сумма долга": "Qarz summasi",
  "Сумма долга клиентов": "Mijozlar qarzi summasi",
  "Расходы за период": "Davr xarajatlari",
  "Сумма всех расходов за период": "Davrdagi barcha xarajatlar summasi",
  "График продаж по дням": "Kunlar bo‘yicha sotuvlar grafigi",
  "Нет продаж за выбранный период": "Tanlangan davr uchun sotuvlar yo‘q",

  "Новая продажа": "Yangi sotuv",
  "Редактировать продажу": "Sotuvni tahrirlash",
  "Оформление продаж и выдача предоплаченного товара": "Sotuvlarni rasmiylashtirish va oldindan to‘langan tovarni berish",
  "Реестр продаж": "Sotuvlar reyestri",
  "Остатки клиентов": "Mijozlar qoldig‘i",
  "Показаны продажи только за выбранный период": "Faqat tanlangan davrdagi sotuvlar ko‘rsatilgan",
  "Поиск по марке или номеру...": "Marka yoki davlat raqami bo‘yicha qidirish...",
  "Нет продаж с не выданным товаром.": "Berilmagan tovar qoldig‘i bo‘lgan sotuvlar yo‘q.",
  "Продаж за период «{period}» пока нет.": "«{period}» davri uchun hozircha sotuvlar yo‘q.",
  "Здесь показаны предоплаченные продажи, по которым клиенту ещё не выдан весь товар. Это товарный остаток, отдельно от денежного долга клиента.": "Bu yerda oldindan to‘langan, ammo mijozga hali to‘liq berilmagan sotuvlar ko‘rsatiladi. Bu tovar qoldig‘i bo‘lib, mijozning pul qarzidan alohida hisoblanadi.",
  "Куплено": "Sotib olindi",
  "Выдано": "Berildi",
  "Осталось": "Qoldi",
  "Цена/шт": "Narx/dona",
  "Остаток предоплаты": "Oldindan to‘lov qoldig‘i",
  "Дата оплаты": "To‘lov sanasi",
  "Выдать": "Berish",
  "Выдать товар": "Tovar berish",
  "Выдача товара": "Tovar berish",
  "Выдачи товара": "Tovar berishlar",
  "Детали": "Tafsilotlar",
  "Детали продажи": "Sotuv tafsilotlari",
  "Печать": "Chop etish",
  "Количество, шт": "Miqdor, dona",
  "Комментарий": "Izoh",
  "Сумма продажи": "Sotuv summasi",
  "История выдач": "Tovar berish tarixi",
  "Выдач пока нет": "Hozircha tovar berishlar yo‘q",
  "Кол-во": "Miqdor",
  "Кол-во, шт *": "Miqdor, dona *",
  "Цена/шт, сум *": "Narx/dona, so‘m *",
  "Итого": "Jami",
  "Итого, сум": "Jami, so‘m",
  "Реально оплаченная сумма, сум *": "Haqiqatda to‘langan summa, so‘m *",
  "Сколько клиент заплатил сейчас": "Mijoz hozir qancha to‘ladi",
  "Это приход денег в кассу. Долг или предоплата считаются в карточке клиента.": "Bu kassaga tushgan pul. Qarz yoki oldindan to‘lov mijoz kartasida hisoblanadi.",
  "Итого по товару": "Tovar bo‘yicha jami",
  "Оплачено": "To‘langan",
  "Оплачено полностью": "To‘liq to‘langan",
  "В долг": "Qarzga",
  "Выдача товара сейчас (необязательно)": "Tovarni hozir berish (ixtiyoriy)",
  "Если оставить пустым — при долге выдаётся весь товар, при полной оплате тоже весь. Укажите меньше купленного, если клиент забирает частями (остаток — во вкладке «Остатки клиентов»).": "Bo‘sh qoldirilsa, qarzga sotilganda ham, to‘liq to‘langanda ham butun tovar beriladi. Mijoz qismlarga bo‘lib olsa, sotib olingan miqdordan kamroq kiriting (qoldiq «Mijozlar qoldig‘i» bo‘limida ko‘rinadi).",
  "Выдать сейчас, шт": "Hozir berish, dona",
  "Товар: Шлакоблок": "Tovar: Shlakoblok",
  "Из базы": "Bazadan",
  "Выберите клиента": "Mijozni tanlang",
  "Сохранить и печать": "Saqlash va chop etish",
  "Только сохранить": "Faqat saqlash",

  "Экспорт в Excel": "Excelga eksport",
  "Скачать за период": "Davr bo‘yicha yuklab olish",
  "Скачать всё": "Hammasini yuklab olish",
  "Скачать все данные программы: продажи, расходы, клиенты, погашения долга, пользователи и сводку.": "Dasturdagi barcha ma’lumotlarni yuklab olish: sotuvlar, xarajatlar, mijozlar, qarz to‘lovlari, foydalanuvchilar va umumiy hisobot.",
  "Начальный остаток кассы": "Kassaning boshlang‘ich qoldig‘i",
  "Начальный остаток, сум": "Boshlang‘ich qoldiq, so‘m",
  "Начальный остаток сохранён": "Boshlang‘ich qoldiq saqlandi",
  "Сумма в кассе на начало работы. Текущий остаток считается так: начальный остаток + оплаченные продажи, предоплаты и погашения долга − расходы.": "Ish boshlanishidagi kassa summasi. Joriy qoldiq: boshlang‘ich qoldiq + to‘langan sotuvlar, oldindan to‘lovlar va qarz to‘lovlari − xarajatlar.",
  "Сейчас в кассе": "Hozir kassada",
  "Сохранить остаток": "Qoldiqni saqlash",
  "Смена пароля": "Parolni o‘zgartirish",
  "Сменить пароль": "Parolni o‘zgartirish",
  "Текущий пароль": "Joriy parol",
  "Новый пароль": "Yangi parol",
  "Подтверждение пароля": "Parolni tasdiqlash",
  "Пароли не совпадают": "Parollar mos kelmadi",
  "Пароль успешно изменён": "Parol muvaffaqiyatli o‘zgartirildi",
  "Пароль, касса, экспорт и пользователи": "Parol, kassa, eksport va foydalanuvchilar",

  "Изменения": "O‘zgarishlar",
  "Удалённые": "O‘chirilganlar",
  "Журнал изменений": "O‘zgarishlar jurnali",
  "История изменений и удалённых записей. Восстановление — только для администратора.": "O‘zgarishlar va o‘chirilgan yozuvlar tarixi. Tiklash faqat administrator uchun.",
  "История изменений и удалённых записей. Восстановление доступно администратору.": "O‘zgarishlar va o‘chirilgan yozuvlar tarixi. Tiklash administratorga mavjud.",
  "Изменений пока нет": "Hozircha o‘zgarishlar yo‘q",
  "Тип": "Turi",
  "Что изменено": "Nima o‘zgartirildi",
  "Когда": "Qachon",
  "Действие": "Amal",
  "Действия": "Amallar",
  "Отменить изменение": "O‘zgarishni bekor qilish",
  "Удалённые записи": "O‘chirilgan yozuvlar",
  "Удалённых записей нет": "O‘chirilgan yozuvlar yo‘q",
  "Описание": "Tavsif",
  "Удалено": "O‘chirildi",
  "Кто удалил": "Kim o‘chirdi",
  "Восстановить": "Tiklash",
  "Удалить": "O‘chirish",
  "Удалить навсегда": "Butunlay o‘chirish",
  "Очистить удалённые": "O‘chirilganlarni tozalash",
  "Удалённая запись восстановлена": "O‘chirilgan yozuv tiklandi",
  "Ошибка восстановления": "Tiklashda xato",
  "Изменение отменено, данные восстановлены": "O‘zgarish bekor qilindi, ma’lumotlar tiklandi",
  "Ошибка отката": "O‘zgarishni qaytarishda xato",
  "Удалить без возможности восстановления?": "Tiklash imkoniyatisiz o‘chirilsinmi?",
  "Запись окончательно удалена": "Yozuv butunlay o‘chirildi",
  "Очистить все удалённые данные без восстановления?": "Barcha o‘chirilgan ma’lumotlar tiklash imkoniyatisiz tozalansinmi?",
  "Корзина очищена": "Savat tozalandi",

  "Кассовый чек": "Kassa cheki",
  "Чек №": "Chek №",
  "Учёт продаж шлакоблоков": "Shlakoblok sotuvlari hisobi",
  "Товар": "Tovar",
  "Наименование": "Nomi",
  "Шлакоблок": "Shlakoblok",
  "Количество": "Miqdor",
  "Цена за шт": "Bir dona narxi",
  "Оплата": "To‘lov",
  "ИТОГО": "JAMI",
  "Спасибо за покупку!": "Xaridingiz uchun rahmat!",
  "Разрешите всплывающие окна для печати чека": "Chekni chop etish uchun qalqib chiquvchi oynalarga ruxsat bering",

  "Сводка": "Umumiy",
  "SHLAKOBLOK CRM — экспорт данных": "SHLAKOBLOK CRM — ma’lumotlar eksporti",
  "Дата экспорта": "Eksport sanasi",
  "Показатель": "Ko‘rsatkich",
  "Значение": "Qiymat",
  "Продаж (шт)": "Sotuvlar (dona)",
  "Выручка по продажам": "Sotuvlar tushumi",
  "Расходов (шт)": "Xarajatlar (dona)",
  "Сумма расходов": "Xarajatlar summasi",
  "Дата регистрации": "Ro‘yxatdan o‘tgan sana",
  "Тип оплаты": "To‘lov turi",
  "Создан": "Yaratilgan",

  "Продажа": "Sotuv",
  "АКТ СВЕРКИ ВЗАИМОРАСЧЁТОВ": "O‘ZARO HISOB-KITOBLARNI SOLISHTIRISH DALOLATNOMASI",
  "Документ / операция": "Hujjat / operatsiya",
  "Дебет (начисление)": "Debet (hisoblangan)",
  "Кредит (оплата)": "Kredit (to‘lov)",
  "Сальдо": "Saldo",
  "Сальдо на начало периода": "Davr boshidagi saldo",
  "ИТОГО за период": "DAVR BO‘YICHA JAMI",
  "Сальдо на конец": "Davr oxiridagi saldo",
  "долг клиента": "mijoz qarzi",
  "предоплата": "oldindan to‘lov",

  "Ошибка": "Xato",
  "Ошибка погашения": "Qarzni to‘lashda xato",
  "Ошибка смены пароля": "Parolni o‘zgartirishda xato",
  "Ошибка создания": "Yaratishda xato",
  "Ошибка сохранения": "Saqlashda xato",
  "Ошибка удаления": "O‘chirishda xato",
  "Ошибка выдачи": "Tovar berishda xato",
  "Удалить клиента и все его продажи?": "Mijoz va uning barcha sotuvlari o‘chirilsinmi?",
  "Удалить расход?": "Xarajat o‘chirilsinmi?",
  "Удалить продажу?": "Sotuv o‘chirilsinmi?",
  "Удалить запись выдачи?": "Tovar berish yozuvi o‘chirilsinmi?",

  "Введите логин и пароль": "Login va parolni kiriting",
  "Ошибка сервера": "Server xatosi",
  "Укажите текущий и новый пароль": "Joriy va yangi parolni kiriting",
  "Новый пароль должен быть не менее 6 символов": "Yangi parol kamida 6 ta belgidan iborat bo‘lishi kerak",
  "Неверный текущий пароль": "Joriy parol noto‘g‘ri",
  "Марка авто и гос. номер обязательны": "Avtomobil markasi va davlat raqami majburiy",
  "Клиент не найден": "Mijoz topilmadi",
  "Укажите сумму погашения": "To‘lov summasini kiriting",
  "Укажите название контрагента": "Kontragent nomini kiriting",
  "Контрагент не найден": "Kontragent topilmadi",
  "Укажите название категории": "Toifa nomini kiriting",
  "Категория не найдена": "Toifa topilmadi",
  "Укажите сумму расхода": "Xarajat summasini kiriting",
  "Укажите категорию и контрагента": "Toifa va kontragentni kiriting",
  "Расход не найден": "Xarajat topilmadi",
  "Укажите гос. номер авто": "Avtomobil davlat raqamini kiriting",
  "Укажите реально оплаченную сумму": "Haqiqatda to‘langan summani kiriting",
  "Укажите количество и цену": "Miqdor va narxni kiriting",
  "Количество выдачи должно быть от 0 до купленного": "Beriladigan miqdor 0 dan sotib olingan miqdorgacha bo‘lishi kerak",
  "Продажа не найдена": "Sotuv topilmadi",
  "Некорректная оплаченная сумма": "To‘langan summa noto‘g‘ri",
  "Сумма продажи меньше уже погашенных платежей": "Sotuv summasi avval to‘langan summalardan kam bo‘lishi mumkin emas",
  "Эта продажа не в долг": "Bu sotuv qarzga emas",
  "Долг по этой продаже уже погашен": "Bu sotuv bo‘yicha qarz allaqachon to‘langan",
  "Частичная выдача доступна только для предоплаты": "Qisman berish faqat oldindan to‘lov uchun mavjud",
  "Укажите количество": "Miqdorni kiriting",
  "Укажите гос. номер": "Davlat raqamini kiriting",
  "Выдача не найдена": "Tovar berish yozuvi topilmadi",
  "Логин, имя и пароль обязательны": "Login, ism va parol majburiy",
  "Пароль должен быть не менее 6 символов": "Parol kamida 6 ta belgidan iborat bo‘lishi kerak",
  "Такой логин уже занят": "Bu login band",
  "Нельзя удалить свой аккаунт": "O‘z akkauntingizni o‘chirib bo‘lmaydi",
  "Пользователь не найден": "Foydalanuvchi topilmadi",
  "Запись не найдена": "Yozuv topilmadi",
  "Неизвестное действие": "Noma’lum amal",
  "Сумма должна быть больше 0": "Summa 0 dan katta bo‘lishi kerak",
  "У клиента нет долга": "Mijozning qarzi yo‘q",

  "Telegram уведомления": "Telegram xabarnomalari",
  "Уведомления Telegram": "Telegram xabarnomalari",
  "Пароль, касса, экспорт, Telegram и пользователи": "Parol, kassa, eksport, Telegram va foydalanuvchilar",
  "Бот": "Bot",
  "Имя бота": "Bot nomi",
  "Группа": "Guruh",
  "Бот — администратор": "Bot — administrator",
  "Статус": "Holat",
  "Подключено": "Ulangan",
  "Не настроено": "Sozlanmagan",
  "Есть ошибка": "Xatolik bor",
  "Да": "Ha",
  "Нет": "Yo‘q",
  "Отправить тестовое сообщение": "Sinov xabarini yuborish",
  "Токен Telegram-бота": "Telegram-bot tokeni",
  "ID Telegram-группы": "Telegram guruhi ID raqami",
  "Токен сохранён. Оставьте пустым, чтобы не менять": "Token saqlangan. O‘zgartirmaslik uchun bo‘sh qoldiring",
  "Токен хранится в зашифрованном виде и никогда не показывается обратно.": "Token shifrlangan holda saqlanadi va qayta ko‘rsatilmaydi.",
  "Сохранить Telegram": "Telegram sozlamalarini saqlash",
  "Настройки Telegram сохранены": "Telegram sozlamalari saqlandi",
  "Не удалось сохранить настройки Telegram": "Telegram sozlamalarini saqlab bo‘lmadi",
  "Укажите ID Telegram-группы": "Telegram guruhi ID raqamini kiriting",
  "Тестовое сообщение отправлено": "Sinov xabari yuborildi",
  "Не удалось отправить тестовое сообщение": "Sinov xabarini yuborib bo‘lmadi",
  "Ошибка проверки Telegram": "Telegram tekshiruvida xato",
  "Telegram не настроен": "Telegram sozlanmagan",
  "Укажите TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в файле .env.": "TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID qiymatlarini .env faylida kiriting.",
  "Уведомления Telegram успешно подключены.": "Telegram xabarnomalari muvaffaqiyatli ulandi.",
  "Время": "Vaqt",

  "Цена": "Narx",
  "Предоплата полностью закрыта": "Oldindan to‘lov to‘liq yopildi",
  "Всего": "Jami",
  "Остаток": "Qoldiq",
  "Выдано сейчас": "Hozir berildi",
  "Всего оплачено": "Jami to‘langan",
  "Всего выдано": "Jami berilgan",

  "создание": "yaratildi",
  "изменение": "o‘zgartirildi",
  "удаление": "o‘chirildi",
  "Клиент (при продаже)": "Mijoz (sotuv vaqtida)",
  "Продажа шлакоблоков": "Shlakoblok sotuvi",
  "Откат изменения": "O‘zgarishni qaytarish",
  "Восстановление данных": "Ma’lumotlarni tiklash",
  "Окончательное удаление": "Butunlay o‘chirish",
  "Очистка корзины": "Savatni tozalash",
  "Исправление выдачи": "Tovar berishni tuzatish",
  "Удаление выдачи": "Tovar berishni o‘chirish"
};

function translateDynamicUz(source: string): string | null {
  let match = source.match(/^Можно выдать не более (.+) шт$/);
  if (match) return `Ko‘pi bilan ${match[1]} dona berish mumkin`;

  match = source.match(/^Нельзя уменьшить ниже уже выданного \((.+) шт\)$/);
  if (match) return `Miqdorni allaqachon berilgan (${match[1]} dona) miqdordan kamaytirib bo‘lmaydi`;

  match = source.match(/^Максимальная сумма: (.+) сум$/);
  if (match) return `Maksimal summa: ${match[1]} so‘m`;

  match = source.match(/^Максимальная сумма погашения: (.+)$/);
  if (match) return `Maksimal to‘lov summasi: ${match[1]}`;

  match = source.match(/^(.+): выдача (\d+) шт$/);
  if (match) return `${match[1]}: ${match[2]} dona berildi`;

  match = source.match(/^(.+): (\d+) → (\d+) шт$/);
  if (match) return `${match[1]}: ${match[2]} → ${match[3]} dona`;

  match = source.match(/^(.+) — (\d+) шт$/);
  if (match) return `${match[1]} — ${match[2]} dona`;

  match = source.match(/^(.+) — (.+) сум$/);
  if (match) return `${match[1]} — ${match[2]} so‘m`;

  const inlineReplacements: Array<[string, string]> = [
    ["Марка:", "Marka:"],
    ["Гос. номер:", "Davlat raqami:"],
    ["Телефон:", "Telefon:"],
    ["Примечание:", "Izoh:"],
    ["Кол-во:", "Miqdor:"],
    ["Цена/шт:", "Narx/dona:"],
    ["Итого:", "Jami:"],
    ["Тип оплаты:", "To‘lov turi:"],
    ["Оплачено", "To‘langan"],
    ["В долг", "Qarzga"],
    ["Предоплата", "Oldindan to‘lov"],
    ["Изменены данные", "Ma’lumotlar o‘zgartirildi"],
  ];

  let translated = source;
  for (const [from, to] of inlineReplacements) {
    translated = translated.replaceAll(from, to);
  }
  return translated !== source ? translated : null;
}

export function normalizeLocale(value?: string | null): Locale {
  return value === "ru" ? "ru" : "uz";
}

export function translate(
  locale: Locale,
  source: string,
  vars?: Record<string, string | number>,
): string {
  let value = source;

  if (locale === "uz") {
    value = UZ_TRANSLATIONS[source] ?? translateDynamicUz(source) ?? source;
  }

  if (vars) {
    for (const [key, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${key}}`, String(replacement));
    }
  }

  return value;
}

export function localeToIntl(locale: Locale): string {
  return locale === "ru" ? "ru-RU" : "uz-UZ";
}

export function localeFromCookieString(cookieHeader?: string | null): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  return normalizeLocale(match?.[1]);
}
