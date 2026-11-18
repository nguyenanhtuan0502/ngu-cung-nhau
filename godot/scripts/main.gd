extends Node2D
## Màn chính – Giai đoạn 1:
##   màn hình vào game → kết nối server.py → vào công viên → đi lại, thấy người khác (cả người chơi bản web).
## Đi lại: chạm/nhấp chuột vào sàn, hoặc phím mũi tên / WASD.

const PlayerScript := preload("res://scripts/player.gd")
const ParkScript := preload("res://scripts/park.gd")

const SAVE_PATH := "user://save.cfg"                 # lưu tên, token đăng nhập, địa chỉ server
const DEFAULT_SERVER := "ws://127.0.0.1:8080/ws"   # không dùng "localhost": Windows có thể đổi sang IPv6 mà server chỉ nghe IPv4
const FLOOR := Rect2(20, 188, 1080, 397)             # vùng đi lại công viên, khớp FLOORS["park"] trong server.py
const WORLD := Vector2(1120, 600)
const VIEW_W := 640.0                                 # bề ngang thế giới nhìn thấy (camera "Gần")
const SPEED := 95.0

var token := ""
var my_name := ""
var server_url := DEFAULT_SERVER
var my_id := ""
var joined := false                                   # đã vào khu chưa
var kicked := false                                   # bị đá ra vì đăng nhập ở máy khác
var want_reconnect := false
var players := {}                                     # id phiên -> node người chơi
var inst := {}                                        # khu/kênh đang ở
var test_mode := false                                # chạy thử tự động: godot -- --test

var _clock := 0.0
var _steer_sent := -10.0
var _last_steer := -10.0
var _steering := false
var _log_lines: Array[String] = []

var world: Node2D
var people: Node2D
var camera: Camera2D
var lobby: Control
var name_edit: LineEdit
var server_edit: LineEdit
var status_label: Label
var hud: Control
var top_label: Label
var log_label: Label


func _ready() -> void:
	test_mode = "--test" in OS.get_cmdline_user_args()
	_load_save()
	_build_world()
	_build_hud()
	_build_lobby()
	Net.opened.connect(_on_opened)
	Net.closed.connect(_on_closed)
	Net.message.connect(_on_message)
	get_viewport().size_changed.connect(_fit_camera)
	_fit_camera()
	if test_mode:
		name_edit.text = "Godot Test"
		_start_join()
		get_tree().create_timer(10.0).timeout.connect(func():
			print("TEST FAIL: không vào được khu sau 10 giây")
			get_tree().quit(1))


# ---------------- Lưu / đọc dữ liệu trên máy ----------------
func _load_save() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(SAVE_PATH) == OK:
		token = cfg.get_value("acc", "token", "")
		my_name = cfg.get_value("acc", "name", "")
		server_url = cfg.get_value("acc", "server", DEFAULT_SERVER)


func _save() -> void:
	if test_mode:                                     # chạy thử thì không ghi đè tài khoản thật
		return
	var cfg := ConfigFile.new()
	cfg.set_value("acc", "token", token)
	cfg.set_value("acc", "name", my_name)
	cfg.set_value("acc", "server", server_url)
	cfg.save(SAVE_PATH)


# ---------------- Dựng cảnh + giao diện ----------------
func _build_world() -> void:
	world = Node2D.new()
	add_child(world)
	var park := Node2D.new()
	park.set_script(ParkScript)
	world.add_child(park)
	people = Node2D.new()
	people.y_sort_enabled = true                      # ai đứng thấp hơn thì vẽ đè lên trước
	world.add_child(people)
	camera = Camera2D.new()
	camera.position = WORLD / 2
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 6.0
	camera.limit_left = 0
	camera.limit_top = 0
	camera.limit_right = int(WORLD.x)
	camera.limit_bottom = int(WORLD.y)
	world.add_child(camera)


func _fit_camera() -> void:
	var vs := get_viewport_rect().size
	var z := maxf(vs.x / VIEW_W, vs.y / WORLD.y)      # phóng to vừa khung, không lộ ngoài rìa cảnh
	camera.zoom = Vector2(z, z)


func _outlined(l: Label, size: int) -> void:
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.7))
	l.add_theme_constant_override("outline_size", 6)


func _build_hud() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	hud = Control.new()
	hud.set_anchors_preset(Control.PRESET_FULL_RECT)
	hud.mouse_filter = Control.MOUSE_FILTER_IGNORE    # chạm xuyên qua HUD xuống sàn
	hud.visible = false
	layer.add_child(hud)

	top_label = Label.new()
	top_label.position = Vector2(14, 10)
	_outlined(top_label, 20)
	hud.add_child(top_label)

	log_label = Label.new()
	log_label.anchor_top = 1.0
	log_label.anchor_bottom = 1.0
	log_label.offset_left = 14
	log_label.offset_right = 620
	log_label.offset_top = -150
	log_label.offset_bottom = -12
	log_label.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
	log_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	log_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_outlined(log_label, 16)
	hud.add_child(log_label)


func _build_lobby() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 10
	add_child(layer)
	lobby = Control.new()
	lobby.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(lobby)

	var bg := ColorRect.new()
	bg.color = Color("#1d2547")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	lobby.add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	lobby.add_child(center)
	var panel := PanelContainer.new()
	center.add_child(panel)
	var margin := MarginContainer.new()
	for side in ["left", "right", "top", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 24)
	panel.add_child(margin)
	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(420, 0)
	box.add_theme_constant_override("separation", 12)
	margin.add_child(box)

	var title := Label.new()
	title.text = "🌙 Thành Phố Mộng Mơ"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 34)
	box.add_child(title)

	name_edit = LineEdit.new()
	name_edit.placeholder_text = "Tên của bạn"
	name_edit.max_length = 14
	name_edit.text = my_name
	name_edit.text_submitted.connect(func(_t): _start_join())
	box.add_child(name_edit)

	var srv := Label.new()
	srv.text = "Địa chỉ server:"
	box.add_child(srv)
	server_edit = LineEdit.new()
	server_edit.text = server_url
	box.add_child(server_edit)

	var btn := Button.new()
	btn.text = "Vào công viên 🌳"
	btn.custom_minimum_size = Vector2(0, 48)
	btn.pressed.connect(_start_join)
	box.add_child(btn)

	status_label = Label.new()
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	box.add_child(status_label)


func _log(text: String) -> void:
	_log_lines.append(text)
	if _log_lines.size() > 4:
		_log_lines.pop_front()
	log_label.text = "\n".join(_log_lines)


func _update_top() -> void:
	var ch := int(inst.get("ch", 0))
	top_label.text = "🌳 Công viên · Kênh %d · %d người" % [ch, players.size()]


# ---------------- Kết nối ----------------
func _start_join() -> void:
	my_name = name_edit.text.strip_edges()
	if my_name == "":
		status_label.text = "Nhập tên trước đã nhé 😊"
		return
	server_url = server_edit.text.strip_edges()
	kicked = false
	_save()
	status_label.text = "Đang kết nối…"
	Net.open(server_url)


func _on_opened() -> void:
	Net.send({"t": "join", "token": token, "name": my_name, "area": "park"})


func _on_closed() -> void:
	if test_mode:
		print("TEST: kết nối bị đóng (joined=%s)" % joined)
	if kicked:
		return
	if joined or want_reconnect:                       # đang chơi thì mất mạng: tự vào lại sau 2 giây
		joined = false
		want_reconnect = true
		_log("Mất kết nối… đang vào lại")
		await get_tree().create_timer(2.0).timeout
		if want_reconnect:
			Net.open(server_url)
	else:
		status_label.text = "Không kết nối được server 😢\nKiểm tra server.py đã chạy và địa chỉ đúng chưa."


func _on_message(m: Dictionary) -> void:
	match str(m.get("t", "")):
		"auth":                                        # đăng nhập xong; tài khoản mới thì server gửi token
			if m.get("token"):
				token = str(m["token"])
				_save()
			if int(m.get("daily", 0)) > 0:
				_log("🎁 Quà mỗi ngày: +%d xu" % int(m["daily"]))
		"welcome":                                     # vào khu: nhận toàn bộ người chơi đang ở đó
			my_id = str(m["id"])
			inst = m.get("inst", {})
			joined = true
			want_reconnect = false
			for p in players.values():
				p.queue_free()
			players.clear()
			for d in m["state"]["players"]:
				_add_player(d)
			lobby.visible = false
			hud.visible = true
			if players.has(my_id):
				camera.position = players[my_id].position
				camera.reset_smoothing()
			_log("Chào %s! Chạm sàn hoặc dùng phím mũi tên / WASD để đi 🌳" % my_name)
			_update_top()
			if test_mode:
				print("TEST OK: vào kênh %d, %d người trong khu" % [int(inst.get("ch", 0)), players.size()])
				get_tree().quit(0)
		"join":
			_add_player(m["p"])
			_log("%s vừa tới đây 👋" % str(m["p"].get("name", "")))
			_update_top()
		"leave":
			var id := str(m.get("id", ""))
			if players.has(id):
				_log("%s đã rời khu này" % players[id].pname)
				players[id].queue_free()
				players.erase(id)
			_update_top()
		"move":
			var p = players.get(str(m.get("id", "")))
			if p == null:
				return
			if p.is_me and _clock - _last_steer < 0.4:  # đang tự lái bằng phím thì bỏ qua để không bị giật
				return
			p.target = Vector2(float(m["x"]), float(m["y"]))
		"chat":
			var p = players.get(str(m.get("id", "")))
			if p:
				p.say(str(m.get("text", "")))
				_log("%s: %s" % [p.pname, str(m.get("text", ""))])
		"emote":
			var p = players.get(str(m.get("id", "")))
			if p:
				p.show_emote(str(m.get("e", "")))
		"kicked":
			kicked = true
			joined = false
			Net.close()
			hud.visible = false
			lobby.visible = true
			status_label.text = str(m.get("msg", "Bạn đã bị ngắt kết nối"))
		"error":
			_log("⚠️ " + str(m.get("msg", "")))


func _add_player(d: Dictionary) -> void:
	var id := str(d.get("id", ""))
	if players.has(id):
		players[id].queue_free()
	var p := Node2D.new()
	p.set_script(PlayerScript)
	p.setup(d, id == my_id)
	people.add_child(p)
	players[id] = p


# ---------------- Điều khiển ----------------
func _clamp_floor(v: Vector2) -> Vector2:
	return Vector2(clampf(v.x, FLOOR.position.x, FLOOR.end.x), clampf(v.y, FLOOR.position.y, FLOOR.end.y))


func _me():
	return players.get(my_id)


func _unhandled_input(event: InputEvent) -> void:
	if not joined or _me() == null:
		return
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		var to := _clamp_floor(world.get_global_mouse_position())      # chạm/nhấp sàn: đi tới đó
		_me().target = to
		Net.send({"t": "move", "x": roundi(to.x), "y": roundi(to.y)})


func _key(a: Key, b: Key) -> float:
	return 1.0 if Input.is_physical_key_pressed(a) or Input.is_physical_key_pressed(b) else 0.0


func _process(delta: float) -> void:
	_clock += delta
	var me = _me()
	if not joined or me == null:
		return
	camera.position = me.position
	var dir := Vector2(_key(KEY_RIGHT, KEY_D) - _key(KEY_LEFT, KEY_A), _key(KEY_DOWN, KEY_S) - _key(KEY_UP, KEY_W))
	if dir != Vector2.ZERO:                            # đi bằng phím
		dir = dir.normalized()
		me.target = _clamp_floor(me.position + dir * SPEED * 0.2)
		_last_steer = _clock
		_steering = true
		if _clock - _steer_sent > 0.12:                # gửi điểm nhìn trước 0.35 giây để người khác thấy mượt
			_steer_sent = _clock
			var ahead := _clamp_floor(me.position + dir * SPEED * 0.35)
			Net.send({"t": "move", "x": roundi(ahead.x), "y": roundi(ahead.y)})
	elif _steering:                                    # nhả phím: dừng đúng chỗ đang đứng
		_steering = false
		me.target = me.position
		Net.send({"t": "move", "x": roundi(me.position.x), "y": roundi(me.position.y)})
