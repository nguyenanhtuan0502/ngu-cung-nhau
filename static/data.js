// ================== DỮ LIỆU GAME ==================
// Giá cả, phần thưởng, tỉ lệ, câu hỏi, cây trồng, cá, quần áo, nội thất… nằm ở file catalog.json (cạnh server.py)
// vì SERVER dùng chung để kiểm tra mọi giao dịch. Trình duyệt nhận nó qua /static/catalog.js (biến CATALOG).
// File này chỉ còn dữ liệu hiển thị: giờ trong game, tốc độ chỉ số, NPC, mùa lễ, tab tủ đồ, cửa hàng.
"use strict";
const {SHOP, TICKET_PRICE, CLAW_PRICE, CLAW_PRIZES, WHEEL, QUIZ_CFG, QUIZ, CROPS, FARM_PLOTS, FISH, BAITS, START_BAIT,
       CLOTHES, RENT_FACTOR, FURNITURE, PET_SHOP, PET_TREAT, LOTTERY} = CATALOG;

// Đồng hồ trong game = GIỜ THẬT VIỆT NAM (UTC+7). Lấy theo giờ SERVER (không dùng đồng hồ máy người chơi),
// nên máy lệch giờ hay ở múi giờ khác thì mọi người vẫn thấy cùng một giờ.
// Thử nhanh giờ khác: thêm &gio=21:30 vào link (chỉ đổi trên máy mình).
const TIME_CFG = {
  TIMEZONE: "Asia/Ho_Chi_Minh",
  UTC_OFFSET_HOURS: 7,
  TIME_SCALE: 1,                              // chỉ dùng khi thử nghiệm (>1 = thời gian chạy nhanh). Chính thức để 1
  DAWN: 5, DUSK: 18.5, TRANSITION_MIN: 30,    // trời sáng hẳn ~5:00, tối hẳn ~18:30; mỗi lần chuyển ~30 phút
  PHASES: [                                   // giờ bắt đầu từng buổi
    {from: 5,    key: "morning",   name: "Sáng",  icon: "🌤️"},
    {from: 11,   key: "noon",      name: "Trưa",  icon: "☀️"},
    {from: 16,   key: "afternoon", name: "Chiều", icon: "🌇"},
    {from: 18.5, key: "night",     name: "Tối",   icon: "🌙"},
  ],
  SHOWTIMES: ["19:00", "21:30"],              // suất chiếu trên bảng giờ chiếu của rạp
};

// Chỉ số nhân vật: thay đổi mỗi giây tùy việc đang làm
const STAT_CFG = {
  START_COINS: CATALOG.START_COINS,          // xu ban đầu / thưởng mỗi ngày: sửa trong catalog.json
  DAILY_BONUS: CATALOG.DAILY_BONUS,
  // mỗi giây (số âm = giảm)
  awake:  {energy: -1 / 90, fun: -1 / 120},  // đi lại bình thường
  sleep:  {energy: 0.5, xp: 1 / 60},         // nằm giường ký túc xá
  study:  {energy: -1 / 30, know: 1 / 20, xp: 1 / 20},   // ngồi bàn học (xu do server trả: STUDY_COINS_PER_MIN)
  park:   {fun: 1 / 15, energy: 1 / 60},     // ngồi ghế công viên
  movie:  {fun: 1 / 6, xp: 1 / 30},          // ngồi ghế rạp khi đang chiếu
  fish:   {fun: 1 / 20},                     // ngồi ở chỗ câu cá
  LOW_ENERGY: 10,
};

// Cấp độ: cấp = 1 + floor(sqrt(xp / LEVEL_K))
const LEVEL_K = 25;

// ================== THỜI TRANG (tủ đồ) ==================
// Danh sách quần áo + giá ở catalog.json (CLOTHES). Đây là bộ mặc mặc định + các tab của tủ đồ.
const DEFAULT_OUTFIT = {gender: "g_f", hair: "short", hairColor: "nau", shirt: "", hat: "hat_nightcap", glasses: "gl_none", neck: "neck_none", back: "back_none"};
const WARDROBE_TABS = [
  {slot: "gender", e: "🚻", name: "Giới tính"}, {slot: "hair", e: "💇", name: "Kiểu tóc"}, {slot: "shirt", e: "👕", name: "Áo"},
  {slot: "hat", e: "🎩", name: "Mũ"}, {slot: "glasses", e: "👓", name: "Kính"}, {slot: "neck", e: "🧣", name: "Cổ"}, {slot: "back", e: "🦋", name: "Cánh"},
];
// Cửa hàng trong khu mua sắm: mỗi gian bán những slot nào
const MALL_STORES = [
  {id: "fashion", e: "👕", name: "Thời trang", slots: ["shirt"],                 c1: "#ff8fab", c2: "#ffe5ec"},
  {id: "acc",     e: "🎀", name: "Phụ kiện",   slots: ["hat", "glasses", "neck", "back"], c1: "#9b5de5", c2: "#e0c3fc"},
  {id: "pet",     e: "🐾", name: "Thú cưng",   slots: [],                        c1: "#f4a261", c2: "#ffe8d6"},
  {id: "hair",    e: "✂️", name: "Salon tóc",  slots: ["hair", "hairColor"],     c1: "#4cc9f0", c2: "#caf0f8"},
  {id: "deco",    e: "🛋️", name: "Nội thất",   slots: [],                        c1: "#90be6d", c2: "#e9f5db"},
];

// ================== NPC ==================
// path: các điểm đi vòng (1 điểm = đứng yên). Vị trí tính theo giờ server nên ai cũng thấy giống nhau.
const NPCS = {
  park: [
    {id: "ba", name: "Cụ Ba", color: "#6c757d", outfit: {gender: "g_m", hairColor: "hc_silver", hat: "hat_cap", glasses: "gl_round", shirt: "shirt_navy"}, speed: 12,
     path: [[160, 350], [440, 350], [500, 268], [620, 268], [680, 350], [980, 350], [680, 446], [620, 452], [500, 452], [440, 350]],   // công viên ngang 1120x600
     lines: ["Hôm nay trời đẹp ghê cháu ạ!", "Ra xe kem quay thử vòng may mắn đi!", "Bấm 🗺️ bản đồ là tới hồ câu cá liền đó.", "Đi bộ mỗi ngày cho khỏe nha."]},
    {id: "na", name: "Bé Na", color: "#ff8fab", outfit: {hair: "hair_bun", hairColor: "hc_black", hat: "hat_bow"}, speed: 22,
     path: [[330, 540], [420, 505], [480, 565], [380, 580], [310, 565]],
     lines: ["Chơi đuổi bắt không?", "Em thích kem dâu nhất!", "Nông trại có gà con dễ thương lắm!"]},
  ],
  study: [{id: "mai", name: "Cô Mai", color: "#2a9d8f", outfit: {hair: "hair_long", hairColor: "hc_black", glasses: "gl_round", hat: "hat_none"},
    path: [[300, 178], [700, 178]], speed: 8, lines: ["Chào em! Làm bài kiểm tra để lấy điểm nhé.", "Học đều mỗi ngày là giỏi thôi!"], act: "quiz"}],
  cinema: [{id: "kenji", name: "Anh Kenji", color: "#c1121f", outfit: {gender: "g_m", hairColor: "hc_black", hat: "hat_cap", shirt: "shirt_red"},
    path: [[590, 486]], lines: ["Irasshaimase! Mời quý khách mua bắp ạ 🙇", "Phim hôm nay hay lắm ạ!"], act: "popcorn"}],
  farm: [{id: "nam", name: "Bác Năm", color: "#6a994e", outfit: {gender: "g_m", hairColor: "hc_silver", hat: "hat_beanie", neck: "neck_scarf", shirt: "shirt_mint"},
    path: [[200, 440], [290, 440]], speed: 6, lines: ["Mua hạt giống không cháu? Chín rồi mang ra đây bác mua!", "Nhớ tưới nước thì cây mới lớn nhé."], act: "farmer"}],
  fishing: [{id: "lan", name: "Cô Lan", color: "#277da1", outfit: {hair: "hair_bun", hat: "hat_flower"},
    path: [[900, 478]], lines: ["Mồi đây! Câu được cá cô mua hết!", "Mồi tôm xịn dễ ra cá hiếm lắm đó."], act: "bait"}],
  mall: [{id: "thu", name: "Chị Thu", color: "#f72585", outfit: {hair: "hair_long", hairColor: "hc_blonde", neck: "neck_pearl", hat: "hat_none"},
    path: [[500, 256]], lines: ["Chào mừng đến khu mua sắm! Thử vé số không em?", "Tủ đồ 👗 ở thanh trên cùng nhé."], act: "cashier"}],
  // ---- 🎪 Khu vui chơi ----
  arcade: [{id: "ti", name: "Anh Tí", color: "#e63946", outfit: {gender: "g_m", hair: "hair_spiky", hairColor: "hc_black", hat: "hat_cap", shirt: "shirt_red"},
             path: [[560, 392]], lines: ["Bầu cua tôm cá đây! Đặt cược đi bà con ơi 🎲", "Cược vui thôi nha, thua thì nghỉ chút!"], act: "baucua"},
           {id: "hoa", name: "Chị Hoa", color: "#f4a261", outfit: {hair: "hair_bun", hairColor: "hc_brown", hat: "hat_flower", shirt: "shirt_yellow"},
             path: [[920, 384]], lines: ["Quay thưởng miễn phí mỗi ngày nè! 🎡", "Xổ số quay lúc 18:30 nha em 🎫"], act: "lottery"},
           {id: "gau", name: "Bác Gấu", color: "#9c6644", outfit: {gender: "g_m", hairColor: "hc_silver", hat: "hat_beanie", neck: "neck_bowtie", shirt: "shirt_navy"},
             path: [[190, 318], [300, 318]], speed: 8, lines: ["Gắp được gấu thì bán cho bác nhé 🧸", "Gấu S+ hiếm lắm đấy!"], act: "bear"}],
  // ---- 📈 Khu chứng khoán ----
  stock: [{id: "phuong", name: "Cô Phương", color: "#457b9d", outfit: {hair: "hair_long", hairColor: "hc_black", glasses: "gl_round", shirt: "shirt_suit"},
             path: [[500, 252]], lines: ["Đây là sàn ảo để học thôi nhé, đừng bỏ hết trứng vào một giỏ 📊", "Ngồi vào bàn giao dịch để mua bán nha."], act: "stock"},
          {id: "tu", name: "Ông Tư", color: "#6c757d", outfit: {gender: "g_m", hairColor: "hc_silver", glasses: "gl_round", shirt: "shirt_suit", neck: "neck_bowtie"},
             path: [[860, 470]], lines: ["Hồi xưa ông mua cổ phiếu Nông Sản, giờ vẫn giữ 😄", "Đầu tư thì kiên nhẫn con ạ."], act: "stock"},
          {id: "pv", name: "Anh phóng viên", color: "#2a9d8f", outfit: {gender: "g_m", hair: "hair_short", hairColor: "hc_brown", hat: "hat_cap", back: "back_bag", shirt: "shirt_mint"},
             path: [[200, 230], [800, 230]], speed: 20, lines: ["Tin nóng đây! 📰", "Tin tức làm giá cổ phiếu lên xuống đó!"], act: "news"}],
  // ---- 💞 Khu hẹn hò ----
  dating: [{id: "duyen", name: "Cô Duyên", color: "#ff8fab", outfit: {hair: "hair_long", hairColor: "hc_pink", hat: "hat_bow", neck: "neck_pearl", shirt: "shirt_red"},
             path: [[560, 330]], lines: ["Tạo hồ sơ hẹn hò ở chỗ cô nhé 💞", "Nhớ: không chia sẻ số điện thoại hay địa chỉ nha!"], act: "duyen"},
           {id: "banhoa", name: "Chị bán hoa", color: "#90be6d", outfit: {hair: "hair_bun", hairColor: "hc_blonde", hat: "hat_flower", shirt: "shirt_mint"},
             path: [[965, 392]], lines: ["Hoa hồng tặng người thương đây 🌹", "Có đôi rồi thì tặng hoa cho nhau nhé!"], act: "flowers"},
           {id: "hoasi", name: "Chú họa sĩ", color: "#cdb4db", outfit: {gender: "g_m", hair: "hair_short", hairColor: "hc_brown", hat: "hat_beanie", neck: "neck_scarf", shirt: "shirt_navy"},
             path: [[370, 528]], lines: ["Chú vẽ chân dung cho nè 🎨", "Ghé photobooth chụp ảnh kỷ niệm đi!"], act: "painter"}],
};

// ================== SỰ KIỆN THEO MÙA ==================
// Đổi trang trí công viên + sảnh rạp theo ngày (tháng-ngày), không cần sửa code. Thử nhanh: thêm &season=xmas vào link.
// Thứ tự ưu tiên: ngày lễ ngắn đặt TRƯỚC mùa dài bao quanh nó (code chọn sự kiện đầu tiên thỏa from <= today <= to).
const SEASONS = [
  // Tết Dương lịch (phần đầu năm 01-01..01-02)
  {key: "newyear",        from: "01-01", to: "01-02", deco: ["🎉", "🎆", "✨"], fall: "✨",  banner: "🎉 Chúc mừng năm mới! Khởi đầu năm mới thật vui tại công viên nhé"},
  // Valentine (đặt trước Tết Nguyên Đán để ưu tiên các ngày 12-15/2)
  {key: "valentine",      from: "02-12", to: "02-15", deco: ["💖", "🌹", "🍫"], fall: "💖",  banner: "💖 Lễ tình nhân ngọt ngào! Ghé công viên hẹn hò cùng người thương nhé"},
  // Tết Nguyên Đán
  {key: "tet",            from: "01-20", to: "02-25", deco: ["🏮", "🧧", "🌼"], fall: "🌸",  banner: "🧧 Chúc mừng năm mới! Công viên đã treo đèn lồng đỏ"},
  // Quốc tế Phụ nữ 8/3
  {key: "womens_day",     from: "03-06", to: "03-09", deco: ["💐", "🌷", "🎀"], fall: "🌷",  banner: "💐 Mừng ngày Quốc tế Phụ nữ 8/3! Muôn hoa khoe sắc rực rỡ ở công viên"},
  // Mùa xuân
  {key: "spring",         from: "03-10", to: "04-24", deco: ["🌸", "🌱", "🦋"], fall: "🌸",  banner: "🌸 Tiết trời mùa xuân ấm áp, trăm hoa đua nở rộn ràng khắp công viên"},
  // Giải phóng miền Nam 30/4 & Quốc tế Lao động 1/5
  {key: "reunification",  from: "04-28", to: "05-02", deco: ["🇻🇳", "⭐", "🎉"], fall: "⭐",  banner: "🇻🇳 Mừng đại lễ 30/4 và 1/5! Cờ đỏ sao vàng tung bay rực rỡ tại công viên"},
  // Quốc tế Thiếu nhi 1/6
  {key: "children",       from: "05-30", to: "06-02", deco: ["🎈", "🧸", "🍭"], fall: "🎈",  banner: "🎈 Chúc mừng Quốc tế Thiếu nhi 1/6! Công viên ngập tràn niềm vui và quà tặng"},
  // Mùa hè
  {key: "summer",         from: "06-03", to: "08-31", deco: ["☀️", "🍉", "🏖️"], fall: null, banner: "☀️ Mùa hè rực nắng đã sang! Ra công viên hóng gió mát và ăn dưa hấu nhé"},
  // Quốc khánh 2/9
  {key: "national_day",   from: "09-01", to: "09-03", deco: ["🇻🇳", "⭐", "🎆"], fall: "⭐",  banner: "🇻🇳 Chào mừng Quốc khánh 2/9! Không khí tưng bừng rực rỡ khắp công viên"},
  // Ngày Tựu trường
  {key: "back_to_school", from: "09-04", to: "09-04", deco: ["🎒", "📚", "🔔"], fall: null, banner: "🎒 Rộn ràng ngày tựu trường! Cùng bạn bè tụ họp tại công viên sau giờ học nhé"},
  // Tết Trung Thu
  {key: "trungthu",       from: "09-05", to: "10-05", deco: ["🏮", "⭐", "🥮"], fall: null, banner: "🥮 Trung Thu rồi! Rước đèn ở công viên nhé"},
  // Phụ nữ Việt Nam 20/10 (đặt trước Halloween để ưu tiên các ngày 18-20/10)
  {key: "vietnam_women",  from: "10-18", to: "10-20", deco: ["🌹", "💐", "🎀"], fall: "🌹",  banner: "🌹 Mừng ngày Phụ nữ Việt Nam 20/10! Gửi ngàn yêu thương đến công viên"},
  // Lễ hội Halloween
  {key: "halloween",      from: "10-20", to: "11-05", deco: ["🎃", "👻", "🦇"], fall: "🍂",  banner: "🎃 Halloween! Coi chừng ma ở công viên"},
  // Nhà giáo Việt Nam 20/11 (đặt trước Mùa thu)
  {key: "teachers_day",   from: "11-18", to: "11-21", deco: ["📚", "💐", "💌"], fall: "💐",  banner: "💐 Tri ân ngày Nhà giáo Việt Nam 20/11! Công viên rực rỡ hoa tươi dâng thầy cô"},
  // Mùa thu
  {key: "autumn",         from: "11-06", to: "11-30", deco: ["🍁", "🍂", "🌰"], fall: "🍁",  banner: "🍁 Thu sang, lá vàng rơi khắp công viên"},
  // Tết Dương lịch (phần cuối năm 12-30..12-31, đặt trước Giáng sinh)
  {key: "newyear",        from: "12-30", to: "12-31", deco: ["🎉", "🎆", "✨"], fall: "✨",  banner: "🎆 Chào đón năm mới rộn ràng! Cùng đếm ngược khoảnh khắc giao thừa tại công viên"},
  // Giáng sinh
  {key: "xmas",           from: "12-01", to: "12-31", deco: ["🎄", "🎁", "⛄"], fall: "❄️",  banner: "🎄 Giáng sinh an lành! Tuyết rơi ở công viên"},
];
