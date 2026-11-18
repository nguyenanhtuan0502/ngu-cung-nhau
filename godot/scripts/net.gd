extends Node
## Kết nối WebSocket tới server Python (server.py).
## Đăng ký autoload tên "Net" nên ở đâu cũng gọi được: Net.open(url), Net.send({...}).

signal opened                      # đã kết nối xong
signal closed                      # mất kết nối / không kết nối được
signal message(m: Dictionary)      # nhận 1 tin nhắn JSON từ server

var _ws := WebSocketPeer.new()
var _last := WebSocketPeer.STATE_CLOSED


func open(url: String) -> void:
	_ws = WebSocketPeer.new()
	_last = WebSocketPeer.STATE_CLOSED
	var err := _ws.connect_to_url(url)
	if err != OK:
		push_warning("Không mở được kết nối: %s" % error_string(err))
		closed.emit.call_deferred()


func is_open() -> bool:
	return _ws.get_ready_state() == WebSocketPeer.STATE_OPEN


func send(d: Dictionary) -> void:
	if is_open():
		_ws.send_text(JSON.stringify(d))


func close() -> void:
	_ws.close()


func _process(_delta: float) -> void:
	_ws.poll()
	var s := _ws.get_ready_state()
	if s != _last:                 # trạng thái đổi: báo cho game biết
		_last = s
		if s == WebSocketPeer.STATE_OPEN:
			opened.emit()
		elif s == WebSocketPeer.STATE_CLOSED:
			closed.emit()
	while _ws.get_ready_state() == WebSocketPeer.STATE_OPEN and _ws.get_available_packet_count() > 0:
		var m = JSON.parse_string(_ws.get_packet().get_string_from_utf8())
		if m is Dictionary:
			message.emit(m)
