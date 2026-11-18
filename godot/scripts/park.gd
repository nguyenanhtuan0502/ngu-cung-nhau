extends Node2D
## Cảnh công viên trung tâm (khu ngang 1120x600, giống bản web).
## Tạm vẽ bằng hình khối; sau này thay bằng ảnh nền mà không phải sửa logic đi lại.

const W := 1120.0
const H := 600.0
const FOUNTAIN := Vector2(560, 390)


func _draw() -> void:
	draw_rect(Rect2(0, 0, W, H), Color("#8fd17a"))                    # cỏ
	draw_rect(Rect2(0, 0, W, 188), Color("#6dbb5e"))                  # bãi cây phía sau
	for i in 14:                                                       # hàng cây phía sau
		var x := 40.0 + i * 80.0
		var pink := i % 4 == 1                                         # cây anh đào xen kẽ
		draw_rect(Rect2(x - 5, 120, 10, 50), Color("#7a5230"))
		draw_circle(Vector2(x, 105), 38, Color("#ffb7c5") if pink else Color("#3f9a4a"))
		draw_circle(Vector2(x - 18, 120), 24, Color("#ffc8d3") if pink else Color("#4caf50"))
		draw_circle(Vector2(x + 18, 118), 24, Color("#ffa6b8") if pink else Color("#45a64c"))

	var path := Color("#e9d8a6")                                        # 4 lối đi bằng đá
	draw_rect(Rect2(0, 360, W, 60), path)
	draw_rect(Rect2(530, 188, 60, H - 188), path)
	draw_circle(FOUNTAIN, 130, path)                                   # quảng trường
	draw_arc(FOUNTAIN, 130, 0, TAU, 64, Color("#d4c08a"), 4)

	draw_circle(FOUNTAIN, 62, Color("#b8c0cc"))                        # đài phun nước
	draw_circle(FOUNTAIN, 52, Color("#7ec8e3"))
	draw_circle(FOUNTAIN, 16, Color("#b8c0cc"))
	var t := Time.get_ticks_msec() / 1000.0
	for i in 6:                                                         # tia nước nhảy
		var a := TAU * i / 6.0 + t * 0.6
		draw_circle(FOUNTAIN + Vector2(cos(a), sin(a) * 0.6) * 30.0, 4.0, Color(1, 1, 1, 0.8))

	for b in [Vector2(330, 250), Vector2(790, 250), Vector2(330, 520), Vector2(790, 520)]:   # ghế đá
		draw_rect(Rect2(b.x - 36, b.y - 8, 72, 14), Color("#a0a4ab"))
		draw_rect(Rect2(b.x - 30, b.y + 6, 8, 10), Color("#80848b"))
		draw_rect(Rect2(b.x + 22, b.y + 6, 8, 10), Color("#80848b"))

	draw_rect(Rect2(950, 470, 80, 46), Color("#ffffff"))               # xe kem
	draw_rect(Rect2(950, 455, 80, 16), Color("#ff8fab"))
	draw_circle(Vector2(965, 520), 9, Color("#555"))
	draw_circle(Vector2(1015, 520), 9, Color("#555"))

	draw_rect(Rect2(10, 300, 14, 110), Color("#8d6e63"))               # cổng vào bên trái
	draw_rect(Rect2(10, 290, 70, 16), Color("#a1887f"))
	var font := ThemeDB.fallback_font
	draw_string(font, Vector2(4, 282), "🚪 Cổng vào", HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color("#3e2723"))


func _process(_delta: float) -> void:
	queue_redraw()                                                     # vẽ lại để nước phun chuyển động
