extends Node2D
## Một người chơi trong khu (mình hoặc người khác).
## Tạm vẽ chibi bằng hình khối; Giai đoạn 3 sẽ thay bằng sprite ghép lớp (tóc, áo, mũ…).
## Gốc tọa độ (position) là chỗ chân chạm sàn, giống bản web.

const SPEED := 95.0                       # tốc độ đi (px/giây), giống SPEED trong index.html
const SKIN := Color("#ffd9b8")
const HAIR := Color("#6b4226")
const DARK := Color("#2b2d42")

var pid := ""
var pname := ""
var level := 1
var color := Color("#4cc9f0")             # màu áo = màu người chơi chọn
var target := Vector2.ZERO                # điểm đang đi tới (server gửi về)
var is_me := false
var walking := false
var facing := 1.0                         # 1: nhìn phải, -1: nhìn trái
var bubble := ""                          # bong bóng chat
var bubble_left := 0.0
var emote := ""
var emote_left := 0.0
var _t := 0.0


func setup(d: Dictionary, me: bool) -> void:
	pid = str(d.get("id", ""))
	pname = str(d.get("name", "Bạn"))
	level = int(d.get("lv", 1)) if d.get("lv") != null else 1
	color = Color.from_string(str(d.get("color", "#4cc9f0")), Color("#4cc9f0"))
	position = Vector2(float(d.get("x", 0.0)), float(d.get("y", 0.0)))
	target = position
	is_me = me


func say(text: String) -> void:
	bubble = text
	bubble_left = 5.0


func show_emote(e: String) -> void:
	emote = e
	emote_left = 2.5


func _process(delta: float) -> void:
	_t += delta
	var to := target - position
	var dist := to.length()
	walking = dist > 1.0
	if walking:
		if absf(to.x) > 0.5:
			facing = signf(to.x)
		position += to / dist * minf(dist, SPEED * delta)
	bubble_left = maxf(bubble_left - delta, 0.0)
	emote_left = maxf(emote_left - delta, 0.0)
	queue_redraw()


func _draw() -> void:
	var bob := sin(_t * 12.0) * 1.5 if walking else 0.0
	var step := sin(_t * 12.0) * 3.0 if walking else 0.0
	_ellipse(Vector2.ZERO, Vector2(14, 4), Color(0, 0, 0, 0.22))            # bóng dưới chân
	draw_rect(Rect2(-7 + step * 0.4, -11, 5, 11), Color("#4a4e69"))         # 2 chân
	draw_rect(Rect2(2 - step * 0.4, -11, 5, 11), Color("#4a4e69"))
	draw_rect(Rect2(-11, -29 + bob, 22, 20), color)                         # thân (áo)
	draw_rect(Rect2(-11, -29 + bob, 22, 4), color.lightened(0.25))          # cổ áo
	var head := Vector2(0, -44 + bob)                                        # đầu to kiểu chibi
	draw_circle(head, 16, SKIN)
	var hair := PackedVector2Array()                                         # tóc: nửa trên đầu
	for i in 13:
		var a := PI + PI * i / 12.0
		hair.append(head + Vector2(cos(a), sin(a)) * 17.0)
	hair.append(head + Vector2(10 * facing, -4))
	draw_colored_polygon(hair, HAIR)
	var ex := 3.0 * facing                                                   # mắt nhìn theo hướng đi
	draw_circle(head + Vector2(-5.5 + ex, 3), 2.3, DARK)
	draw_circle(head + Vector2(5.5 + ex, 3), 2.3, DARK)
	draw_circle(head + Vector2(-9 + ex, 8), 2.5, Color(1, 0.5, 0.55, 0.45))  # má hồng
	draw_circle(head + Vector2(9 + ex, 8), 2.5, Color(1, 0.5, 0.55, 0.45))

	var font := ThemeDB.fallback_font
	var label := "%s ⭐%d" % [pname, level]                                   # tên + cấp trên đầu
	var name_pos := Vector2(-80, -68 + bob)
	draw_string_outline(font, name_pos, label, HORIZONTAL_ALIGNMENT_CENTER, 160, 13, 4, Color(0, 0, 0, 0.65))
	draw_string(font, name_pos, label, HORIZONTAL_ALIGNMENT_CENTER, 160, 13,
			Color("#fff3b0") if is_me else Color.WHITE)

	if bubble_left > 0.0:                                                    # bong bóng chat
		var sz := font.get_multiline_string_size(bubble, HORIZONTAL_ALIGNMENT_CENTER, 200, 13)
		var box := Rect2(-sz.x / 2 - 8, -86 - sz.y, sz.x + 16, sz.y + 8)
		draw_rect(box, Color(1, 1, 1, 0.95))
		draw_multiline_string(font, box.position + Vector2(8, 4 + font.get_ascent(13)), bubble,
				HORIZONTAL_ALIGNMENT_CENTER, sz.x, 13, -1, DARK)
	elif emote_left > 0.0:                                                   # biểu cảm
		draw_string(font, Vector2(-30, -82), emote, HORIZONTAL_ALIGNMENT_CENTER, 60, 26)


func _ellipse(c: Vector2, r: Vector2, col: Color) -> void:
	draw_set_transform(c, 0.0, Vector2(1.0, r.y / r.x))
	draw_circle(Vector2.ZERO, r.x, col)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
