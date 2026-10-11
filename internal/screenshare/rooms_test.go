package screenshare

import "testing"

// a room id alone gives no access to another user's room
func TestRoomsBelongToTheirUser(t *testing.T) {
	rm := &RoomManager{rooms: make(map[string]*Room)}
	room := rm.CreateRoom("alice", "tablet")

	if rm.GetRoom(room.RoomID, "bob") != nil || rm.IsUserRoom(room.RoomID, "bob") {
		t.Error("bob sees alice's room")
	}
	if rm.GetRoom(room.RoomID, "alice") == nil || !rm.IsUserRoom(room.RoomID, "alice") {
		t.Error("alice can't see her room")
	}

	rm.DeleteRoom(room.RoomID, "bob")
	if !rm.IsUserRoom(room.RoomID, "alice") {
		t.Error("bob deleted alice's room")
	}
	rm.DeleteRoom(room.RoomID, "alice")
	if rm.IsUserRoom(room.RoomID, "alice") {
		t.Error("alice can't delete her room")
	}
}
