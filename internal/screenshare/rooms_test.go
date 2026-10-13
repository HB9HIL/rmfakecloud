package screenshare

import (
	"testing"
	"time"
)

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

// restarting the share replaces the tablet's old room and ends waits on it
func TestNewRoomReplacesOld(t *testing.T) {
	rm := &RoomManager{rooms: make(map[string]*Room)}
	old := rm.CreateRoom("alice", "tablet")
	other := rm.CreateRoom("alice", "tablet2")

	done := make(chan struct{})
	go func() {
		rm.WaitForMessages(old.RoomID, 1, time.Minute)
		close(done)
	}()
	room := rm.CreateRoom("alice", "tablet")

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("wait on the replaced room didn't end")
	}
	if rm.IsUserRoom(old.RoomID, "alice") {
		t.Error("old room still exists")
	}
	if !rm.IsUserRoom(other.RoomID, "alice") {
		t.Error("room of the other tablet was removed")
	}
	if rm.FindActiveRoom("alice") != room.RoomID {
		t.Error("new room isn't the active one")
	}
}
