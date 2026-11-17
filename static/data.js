// ================== DỮ LIỆU GAME (đổi giá, câu hỏi, phần thưởng ở đây, không cần sửa logic) ==================
"use strict";

// Đồng hồ trong game: 1 ngày game = DAY_REAL_MINUTES phút thật (cả phòng thấy cùng một giờ)
const TIME_CFG = {
  DAY_REAL_MINUTES: 24,
  PHASES: [                                   // [giờ bắt đầu, tên, biểu tượng]
    {from: 5,  key: "morning",   name: "Sáng",  icon: "🌤️"},
    {from: 11, key: "noon",      name: "Trưa",  icon: "☀️"},
    {from: 16, key: "afternoon", name: "Chiều", icon: "🌇"},
    {from: 19, key: "night",     name: "Tối",   icon: "🌙"},
  ],
};

// Chỉ số nhân vật: thay đổi mỗi giây tùy việc đang làm
const STAT_CFG = {
  START_COINS: 100,
  DAILY_BONUS: 50,                           // xu thưởng đăng nhập mỗi ngày
  // mỗi giây (số âm = giảm)
  awake:  {energy: -1 / 90, fun: -1 / 120},  // đi lại bình thường
  sleep:  {energy: 0.5, xp: 1 / 60},         // nằm giường ký túc xá
  study:  {energy: -1 / 30, know: 1 / 20, xp: 1 / 20, coins: 1 / 60},   // ngồi bàn học
  park:   {fun: 1 / 15, energy: 1 / 60},     // ngồi ghế công viên
  movie:  {fun: 1 / 6, xp: 1 / 30},          // ngồi ghế rạp khi đang chiếu
  fish:   {fun: 1 / 20},                     // ngồi ở chỗ câu cá
  LOW_ENERGY: 10,
};

// Đồ ăn uống / dịch vụ, giá tính bằng xu
const SHOP = {
  park: [
    {id: "icecream", e: "🍦", name: "Kem ốc quế",  price: 10, fun: 15},
    {id: "milktea",  e: "🥛", name: "Trà sữa trân châu", price: 15, fun: 20, energy: 5},
    {id: "corn",     e: "🌽", name: "Bắp nướng",   price: 8,  fun: 5, energy: 10},
    {id: "balloon",  e: "🎈", name: "Bong bóng bay", price: 12, fun: 10, keep: true, cat: "misc"},
  ],
  popcorn: [
    {id: "pop_salt",  e: "🍿", name: "Bắp rang muối",    price: 12, fun: 10, energy: 5},
    {id: "pop_cara",  e: "🍯", name: "Bắp caramel",      price: 15, fun: 14, energy: 5},
    {id: "pop_butter",e: "🍿", name: "Bắp bơ",           price: 15, fun: 14, energy: 5},
    {id: "pop_matcha",e: "🍵", name: "Bắp trà xanh",     price: 18, fun: 18, energy: 5},
  ],
  drinks: [
    {id: "greentea", e: "🍵", name: "Chai trà xanh",   price: 6, energy: 6},
    {id: "coffee",   e: "☕", name: "Lon cà phê",       price: 8, energy: 15},
    {id: "soda",     e: "🥤", name: "Lon nước ngọt",    price: 6, fun: 6, energy: 3},
  ],
  souvenir: [
    {id: "keychain", e: "🔑", name: "Móc khóa mèo mây",  price: 30, keep: true},
    {id: "standee",  e: "🎎", name: "Standee nhân vật", price: 45, keep: true},
    {id: "poster",   e: "🖼️", name: "Áp phích phim",    price: 25, keep: true},
    {id: "figure",   e: "🗿", name: "Mô hình mini",     price: 60, keep: true},
  ],
};
const TICKET_PRICE = 20;                     // vé xem phim, dùng tới khi rời rạp
const CLAW_PRICE = 5;                        // 1 lượt máy gắp thú
const CLAW_PRIZES = [
  {id: "bear",  e: "🧸", name: "Gấu bông mèo"}, {id: "bunny", e: "🐰", name: "Thỏ trắng"},
  {id: "panda", e: "🐼", name: "Gấu trúc mini"}, {id: "fox",  e: "🦊", name: "Cáo nhỏ"},
];

// Vòng quay may mắn ở công viên: w = tỉ lệ
const WHEEL = {
  FREE_PER_DAY: 1,
  PRICE: 20,
  PRIZES: [
    {w: 30, e: "💰", text: "10 xu",       coins: 10},
    {w: 20, e: "💰", text: "25 xu",       coins: 25},
    {w: 8,  e: "💰", text: "80 xu",       coins: 80},
    {w: 2,  e: "💎", text: "200 xu",      coins: 200},
    {w: 15, e: "⚡", text: "+30 năng lượng", energy: 30},
    {w: 15, e: "😊", text: "+30 vui vẻ",  fun: 30},
    {w: 10, e: "🍀", text: "Chúc may mắn lần sau"},
  ],
};

// Bài kiểm tra ở phòng học: mỗi lượt QUIZ_CFG.PER_ROUND câu ngẫu nhiên
const QUIZ_CFG = {PER_ROUND: 5, ENERGY: 10, COINS: 6, KNOW: 2, XP: 5};
const QUIZ = [
  {q: "Thủ đô của Việt Nam là?", a: ["Hà Nội", "Huế", "Đà Nẵng", "TP. Hồ Chí Minh"], c: 0},
  {q: "7 × 8 = ?", a: ["54", "56", "64", "48"], c: 1},
  {q: "Nước sôi ở bao nhiêu độ C (áp suất thường)?", a: ["90", "100", "80", "120"], c: 1},
  {q: "Hành tinh lớn nhất Hệ Mặt Trời?", a: ["Trái Đất", "Sao Thổ", "Sao Mộc", "Sao Hỏa"], c: 2},
  {q: "Con vật nào là động vật có vú?", a: ["Cá mập", "Cá heo", "Cá chép", "Cá ngựa"], c: 1},
  {q: "Một năm thường có bao nhiêu ngày?", a: ["360", "364", "365", "366"], c: 2},
  {q: "Từ tiếng Anh của \"con mèo\"?", a: ["Dog", "Cat", "Cow", "Bird"], c: 1},
  {q: "Sông dài nhất Việt Nam (chảy trên lãnh thổ VN)?", a: ["Sông Hồng", "Sông Đồng Nai", "Sông Mê Kông", "Sông Đà"], c: 1},
  {q: "144 : 12 = ?", a: ["11", "12", "13", "14"], c: 1},
  {q: "Cây xanh hấp thụ khí gì để quang hợp?", a: ["Oxy", "Nitơ", "CO₂", "Heli"], c: 2},
  {q: "Đỉnh núi cao nhất Việt Nam?", a: ["Bà Đen", "Fansipan", "Langbiang", "Tây Côn Lĩnh"], c: 1},
  {q: "Tam giác có tổng các góc bằng?", a: ["90°", "180°", "270°", "360°"], c: 1},
  {q: "Ánh sáng đi nhanh hơn âm thanh. Đúng không?", a: ["Đúng", "Sai", "Bằng nhau", "Tùy ngày"], c: 0},
  {q: "\"Thank you\" nghĩa là?", a: ["Xin chào", "Tạm biệt", "Cảm ơn", "Xin lỗi"], c: 2},
  {q: "Đại dương lớn nhất thế giới?", a: ["Đại Tây Dương", "Ấn Độ Dương", "Bắc Băng Dương", "Thái Bình Dương"], c: 3},
  {q: "15% của 200 là?", a: ["15", "20", "30", "45"], c: 2},
  {q: "Bộ phận nào bơm máu đi khắp cơ thể?", a: ["Phổi", "Tim", "Gan", "Dạ dày"], c: 1},
  {q: "Một giờ có bao nhiêu giây?", a: ["360", "600", "3600", "6000"], c: 2},
  {q: "Chữ cái đầu tiên của bảng chữ cái tiếng Việt?", a: ["A", "Ă", "B", "Â"], c: 0},
  {q: "Băng tan thành nước là hiện tượng gì?", a: ["Bay hơi", "Nóng chảy", "Đông đặc", "Ngưng tụ"], c: 1},
  {q: "Số nguyên tố nhỏ nhất?", a: ["0", "1", "2", "3"], c: 2},
  {q: "Mặt Trời mọc ở hướng nào?", a: ["Bắc", "Nam", "Đông", "Tây"], c: 2},
  {q: "Từ tiếng Anh của \"thư viện\"?", a: ["Library", "Bookstore", "School", "Museum"], c: 0},
  {q: "Chu vi hình vuông cạnh 5 cm?", a: ["10 cm", "20 cm", "25 cm", "15 cm"], c: 1},
  {q: "Loài chim nào không biết bay?", a: ["Chim sẻ", "Đại bàng", "Chim cánh cụt", "Bồ câu"], c: 2},
];

// Cấp độ: cấp = 1 + floor(sqrt(xp / LEVEL_K))
const LEVEL_K = 25;

// ================== NÔNG TRẠI ==================
// time = số giây thật từ lúc tưới tới lúc chín; sell = giá bán cho bác nông dân
const CROPS = [
  {id: "carrot",     e: "🥕", name: "Cà rốt",      seed: 5,  time: 90,  sell: 12, xp: 3, leaf: "#4caf50"},
  {id: "tomato",     e: "🍅", name: "Cà chua",     seed: 8,  time: 150, sell: 20, xp: 4, leaf: "#3f8f47"},
  {id: "corn",       e: "🌽", name: "Bắp",         seed: 10, time: 240, sell: 30, xp: 5, leaf: "#7cb342"},
  {id: "sunflower",  e: "🌻", name: "Hướng dương", seed: 12, time: 300, sell: 38, xp: 6, leaf: "#558b2f"},
  {id: "watermelon", e: "🍉", name: "Dưa hấu",     seed: 20, time: 480, sell: 70, xp: 9, leaf: "#2e7d32"},
];
const FARM_PLOTS = 8;

// ================== HỒ CÂU CÁ ==================
// w = độ hiếm (càng lớn càng dễ gặp), rare = mồi xịn làm tăng tỉ lệ gặp
const FISH = [
  {id: "carp",   e: "🐟", name: "Cá chép",      w: 30, price: 8,   color: "#e0a458"},
  {id: "perch",  e: "🐟", name: "Cá rô",        w: 25, price: 10,  color: "#8d9440"},
  {id: "gold",   e: "🐠", name: "Cá vàng",      w: 14, price: 16,  color: "#ffb703"},
  {id: "shrimp", e: "🦐", name: "Tôm càng",     w: 12, price: 12,  color: "#ff8fab"},
  {id: "crab",   e: "🦀", name: "Cua đồng",     w: 8,  price: 15,  color: "#e63946"},
  {id: "koi",    e: "🎏", name: "Cá koi",       w: 5,  price: 40,  color: "#ff6b6b", rare: true},
  {id: "puffer", e: "🐡", name: "Cá nóc",       w: 3,  price: 55,  color: "#f4d35e", rare: true},
  {id: "turtle", e: "🐢", name: "Rùa vàng",     w: 1,  price: 120, color: "#90be6d", rare: true},
  {id: "boot",   e: "👢", name: "Chiếc ủng cũ", w: 6,  price: 1,   color: "#6d4c41"},
];
const BAITS = [
  {id: "worm",       e: "🐛", name: "Mồi giun",    pack: 5, price: 8,  rare: 1},
  {id: "shrimpbait", e: "🍤", name: "Mồi tôm xịn", pack: 5, price: 20, rare: 3},
];
const START_BAIT = 5;                        // người mới được tặng 5 mồi giun

// ================== THỜI TRANG (tủ đồ) ==================
// slot: hair | hairColor | shirt | hat | glasses | neck | back. price = mua vĩnh viễn, thuê 1 ngày = price / RENT_FACTOR
const CLOTHES = [
  // tiệm tóc
  {id: "hair_short", slot: "hair", e: "💇", name: "Tóc ngắn", price: 0},
  {id: "hair_long",  slot: "hair", e: "💁", name: "Tóc dài",  price: 40},
  {id: "hair_bun",   slot: "hair", e: "🍡", name: "Tóc búi",  price: 40},
  {id: "hair_spiky", slot: "hair", e: "⚡", name: "Tóc dựng", price: 40},
  {id: "hc_brown",  slot: "hairColor", e: "🟫", name: "Nâu",      price: 0,  color: "#3b2a20"},
  {id: "hc_black",  slot: "hairColor", e: "⬛", name: "Đen",      price: 15, color: "#1c1c22"},
  {id: "hc_blonde", slot: "hairColor", e: "🟨", name: "Vàng",     price: 25, color: "#e9c46a"},
  {id: "hc_pink",   slot: "hairColor", e: "🌸", name: "Hồng",     price: 30, color: "#ff8fab"},
  {id: "hc_blue",   slot: "hairColor", e: "🟦", name: "Xanh",     price: 30, color: "#4cc9f0"},
  {id: "hc_silver", slot: "hairColor", e: "⬜", name: "Bạch kim", price: 45, color: "#d9d9e3"},
  // áo ("" = bộ pyjama chọn lúc vào game)
  {id: "shirt_red",    slot: "shirt", e: "👕", name: "Áo thun đỏ",     price: 20, color: "#e63946"},
  {id: "shirt_mint",   slot: "shirt", e: "👕", name: "Áo thun bạc hà", price: 20, color: "#80ed99"},
  {id: "shirt_navy",   slot: "shirt", e: "👕", name: "Áo thủy thủ",    price: 25, color: "#1d3557", stripe: "#f1faee"},
  {id: "shirt_hoodie", slot: "shirt", e: "🧥", name: "Hoodie tím",     price: 35, color: "#7b2cbf"},
  {id: "shirt_yellow", slot: "shirt", e: "👚", name: "Áo len vàng",    price: 30, color: "#ffd166", stripe: "#f4a261"},
  {id: "shirt_suit",   slot: "shirt", e: "🤵", name: "Vest đen",       price: 60, color: "#22223b", tie: "#e63946"},
  // mũ
  {id: "hat_nightcap", slot: "hat", e: "🌙", name: "Mũ ngủ",       price: 0},
  {id: "hat_none",     slot: "hat", e: "🚫", name: "Không đội",    price: 0},
  {id: "hat_beanie",   slot: "hat", e: "🧶", name: "Mũ len",       price: 20, color: "#e76f51"},
  {id: "hat_cap",      slot: "hat", e: "🧢", name: "Mũ lưỡi trai", price: 25, color: "#277da1"},
  {id: "hat_bow",      slot: "hat", e: "🎀", name: "Nơ hồng",      price: 20, color: "#ff5d8f"},
  {id: "hat_flower",   slot: "hat", e: "🌺", name: "Hoa cài tóc",  price: 15, color: "#ff6b6b"},
  {id: "hat_crown",    slot: "hat", e: "👑", name: "Vương miện",   price: 120, color: "#ffd23f"},
  {id: "hat_witch",    slot: "hat", e: "🧙", name: "Mũ phù thủy",  price: 50, color: "#5a189a"},
  {id: "hat_santa",    slot: "hat", e: "🎅", name: "Mũ Noel",      price: 40, color: "#d62828"},
  // kính
  {id: "gl_none",  slot: "glasses", e: "🚫", name: "Không đeo",     price: 0},
  {id: "gl_round", slot: "glasses", e: "👓", name: "Kính tròn",     price: 20},
  {id: "gl_sun",   slot: "glasses", e: "🕶️", name: "Kính râm",      price: 30},
  {id: "gl_heart", slot: "glasses", e: "💗", name: "Kính trái tim", price: 35},
  // phụ kiện cổ
  {id: "neck_none",   slot: "neck", e: "🚫", name: "Không có",       price: 0},
  {id: "neck_scarf",  slot: "neck", e: "🧣", name: "Khăn quàng đỏ",  price: 20, color: "#d62828"},
  {id: "neck_bowtie", slot: "neck", e: "🎀", name: "Nơ cổ",          price: 15, color: "#3a86ff"},
  {id: "neck_pearl",  slot: "neck", e: "📿", name: "Vòng ngọc trai", price: 45, color: "#f8f9fa"},
  // lưng / cánh
  {id: "back_none",  slot: "back", e: "🚫", name: "Không có",        price: 0},
  {id: "back_bag",   slot: "back", e: "🎒", name: "Ba lô",           price: 30,  color: "#f4a261"},
  {id: "back_cape",  slot: "back", e: "🦸", name: "Áo choàng",       price: 60,  color: "#c1121f"},
  {id: "back_angel", slot: "back", e: "👼", name: "Cánh thiên thần", price: 150, color: "#ffffff"},
  {id: "back_bat",   slot: "back", e: "🦇", name: "Cánh dơi",        price: 100, color: "#3c096c"},
  {id: "back_fairy", slot: "back", e: "🧚", name: "Cánh tiên",       price: 130, color: "#a0e7e5"},
];
const DEFAULT_OUTFIT = {hair: "hair_short", hairColor: "hc_brown", shirt: "", hat: "hat_nightcap", glasses: "gl_none", neck: "neck_none", back: "back_none"};
const WARDROBE_TABS = [
  {slot: "hair", e: "💇", name: "Kiểu tóc"}, {slot: "hairColor", e: "🎨", name: "Màu tóc"}, {slot: "shirt", e: "👕", name: "Áo"},
  {slot: "hat", e: "🎩", name: "Mũ"}, {slot: "glasses", e: "👓", name: "Kính"}, {slot: "neck", e: "🧣", name: "Cổ"}, {slot: "back", e: "🦋", name: "Cánh"},
];
const RENT_FACTOR = 3;
// Cửa hàng trong khu mua sắm: mỗi gian bán những slot nào
const MALL_STORES = [
  {id: "fashion", e: "👕", name: "Thời trang", slots: ["shirt"],                 c1: "#ff8fab", c2: "#ffe5ec"},
  {id: "acc",     e: "🎀", name: "Phụ kiện",   slots: ["hat", "glasses", "neck", "back"], c1: "#9b5de5", c2: "#e0c3fc"},
  {id: "pet",     e: "🐾", name: "Thú cưng",   slots: [],                        c1: "#f4a261", c2: "#ffe8d6"},
  {id: "hair",    e: "✂️", name: "Salon tóc",  slots: ["hair", "hairColor"],     c1: "#4cc9f0", c2: "#caf0f8"},
  {id: "deco",    e: "🛋️", name: "Nội thất",   slots: [],                        c1: "#90be6d", c2: "#e9f5db"},
];

// ================== NỘI THẤT NHÀ RIÊNG ==================
const FURNITURE = [
  {id: "f_bed",    e: "🛏️", name: "Giường",           price: 60, size: 46},
  {id: "f_sofa",   e: "🛋️", name: "Sofa",             price: 50, size: 44},
  {id: "f_tv",     e: "📺", name: "TV",               price: 70, size: 34},
  {id: "f_piano",  e: "🎹", name: "Đàn piano",        price: 90, size: 40},
  {id: "f_guitar", e: "🎸", name: "Đàn guitar",       price: 35, size: 30},
  {id: "f_frame",  e: "🖼️", name: "Tranh",            price: 25, size: 30},
  {id: "f_clock",  e: "🕰️", name: "Đồng hồ",          price: 25, size: 28},
  {id: "f_lamp",   e: "🕯️", name: "Đèn nến",          price: 15, size: 24},
  {id: "f_cactus", e: "🌵", name: "Chậu xương rồng",  price: 12, size: 28},
  {id: "f_sunfl",  e: "🌻", name: "Bình hướng dương", price: 15, size: 28},
  {id: "f_books",  e: "📚", name: "Chồng sách",       price: 15, size: 26},
  {id: "f_teddy",  e: "🧸", name: "Gấu bông to",      price: 30, size: 32},
  {id: "f_tree",   e: "🎄", name: "Cây thông",        price: 45, size: 44},
  {id: "f_rug_r",  e: "🟥", name: "Thảm cam",         price: 20, size: 70, rug: "#e76f51"},
  {id: "f_rug_b",  e: "🟦", name: "Thảm xanh",        price: 20, size: 70, rug: "#4a6fa5"},
];

// ================== TIỆM THÚ CƯNG ==================
const PET_SHOP = [
  {id: "cat",   e: "🐱", name: "Nhận nuôi mèo", price: 50},
  {id: "dog",   e: "🐶", name: "Nhận nuôi chó", price: 50},
  {id: "bunny", e: "🐰", name: "Nhận nuôi thỏ", price: 50},
];
const PET_TREAT = {id: "treat", e: "🦴", name: "Bánh thưởng thú cưng", price: 5, fun: 8};

// ================== VÉ SỐ (quầy thu ngân khu mua sắm) ==================
const LOTTERY = {price: 10, PRIZES: [
  {w: 55,  text: "Không trúng, chúc may mắn lần sau 🍀"},
  {w: 30,  coins: 15,   text: "Giải khuyến khích: 15 xu"},
  {w: 12,  coins: 50,   text: "Giải ba: 50 xu!"},
  {w: 2.5, coins: 200,  text: "Giải nhì: 200 xu!!"},
  {w: .5,  coins: 1000, text: "🎉 ĐỘC ĐẮC 1000 XU!!!"},
]};

// ================== NPC ==================
// path: các điểm đi vòng (1 điểm = đứng yên). Vị trí tính theo giờ server nên ai cũng thấy giống nhau.
const NPCS = {
  park: [
    {id: "ba", name: "Cụ Ba", color: "#6c757d", outfit: {hairColor: "hc_silver", hat: "hat_cap", glasses: "gl_round"}, speed: 12,
     path: [[70, 300], [150, 300], [250, 300], [290, 250], [230, 196], [120, 196]],
     lines: ["Hôm nay trời đẹp ghê cháu ạ!", "Ra xe kem quay thử vòng may mắn đi!", "Hồ câu ở phía Nam có cá koi đấy.", "Đi bộ mỗi ngày cho khỏe nha."]},
    {id: "na", name: "Bé Na", color: "#ff8fab", outfit: {hair: "hair_bun", hairColor: "hc_black", hat: "hat_bow"}, speed: 22,
     path: [[180, 440], [250, 410], [180, 470], [110, 420]],
     lines: ["Chơi đuổi bắt không?", "Em thích kem dâu nhất!", "Nông trại có gà con dễ thương lắm!"]},
  ],
  study: [{id: "mai", name: "Cô Mai", color: "#2a9d8f", outfit: {hair: "hair_long", hairColor: "hc_black", glasses: "gl_round", hat: "hat_none"},
    path: [[150, 172], [250, 172]], speed: 8, lines: ["Chào em! Làm bài kiểm tra để lấy điểm nhé.", "Học đều mỗi ngày là giỏi thôi!"], act: "quiz"}],
  cinema: [{id: "kenji", name: "Anh Kenji", color: "#c1121f", outfit: {hairColor: "hc_black", hat: "hat_cap"},
    path: [[180, 448]], lines: ["Irasshaimase! Mời quý khách mua bắp ạ 🙇", "Phim hôm nay hay lắm ạ!"], act: "popcorn"}],
  farm: [{id: "nam", name: "Bác Năm", color: "#6a994e", outfit: {hairColor: "hc_silver", hat: "hat_beanie", neck: "neck_scarf"},
    path: [[46, 410], [92, 410]], speed: 6, lines: ["Mua hạt giống không cháu? Chín rồi mang ra đây bác mua!", "Nhớ tưới nước thì cây mới lớn nhé."], act: "farmer"}],
  fishing: [{id: "lan", name: "Cô Lan", color: "#277da1", outfit: {hair: "hair_bun", hat: "hat_flower"},
    path: [[300, 478]], lines: ["Mồi đây! Câu được cá cô mua hết!", "Mồi tôm xịn dễ ra cá hiếm lắm đó."], act: "bait"}],
  mall: [{id: "thu", name: "Chị Thu", color: "#f72585", outfit: {hair: "hair_long", hairColor: "hc_blonde", neck: "neck_pearl", hat: "hat_none"},
    path: [[180, 256]], lines: ["Chào mừng đến khu mua sắm! Thử vé số không em?", "Tủ đồ 👗 ở thanh trên cùng nhé."], act: "cashier"}],
};

// ================== SỰ KIỆN THEO MÙA ==================
// Đổi trang trí công viên + sảnh rạp theo ngày (tháng-ngày), không cần sửa code. Thử nhanh: thêm &season=xmas vào link.
const SEASONS = [
  {key: "tet",       from: "01-20", to: "02-25", deco: ["🏮", "🧧", "🌼"], fall: "🌸", banner: "🧧 Chúc mừng năm mới! Công viên đã treo đèn lồng đỏ"},
  {key: "trungthu",  from: "09-05", to: "10-05", deco: ["🏮", "⭐", "🥮"], fall: null, banner: "🥮 Trung Thu rồi! Rước đèn ở công viên nhé"},
  {key: "halloween", from: "10-20", to: "11-05", deco: ["🎃", "👻", "🦇"], fall: "🍂", banner: "🎃 Halloween! Coi chừng ma ở công viên"},
  {key: "autumn",    from: "11-06", to: "11-30", deco: ["🍁", "🍂", "🌰"], fall: "🍁", banner: "🍁 Thu sang, lá vàng rơi khắp công viên"},
  {key: "xmas",      from: "12-01", to: "12-31", deco: ["🎄", "🎁", "⛄"], fall: "❄️", banner: "🎄 Giáng sinh an lành! Tuyết rơi ở công viên"},
];
