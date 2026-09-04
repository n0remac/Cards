package dice

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

func TestServiceProxyPreservesPublicRequestMetadata(t *testing.T) {
	var receivedHost string
	var receivedOrigin string
	var receivedPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		receivedHost = request.Host
		receivedOrigin = request.Header.Get("Origin")
		receivedPath = request.URL.Path
		writer.WriteHeader(http.StatusNoContent)
	}))
	defer upstream.Close()

	handler, err := NewServiceProxy(upstream.URL)
	if err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodGet, "http://cards.example/dice/ws", nil)
	request.Host = "cards.example"
	request.Header.Set("Origin", "https://cards.example")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("unexpected status: %d", response.Code)
	}
	if receivedHost != "cards.example" || receivedOrigin != "https://cards.example" ||
		receivedPath != "/dice/ws" {
		t.Fatalf("metadata changed: host=%q origin=%q path=%q", receivedHost, receivedOrigin, receivedPath)
	}
}

func TestServiceProxyForwardsWebSocketUpgrade(t *testing.T) {
	upgrader := websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		connection, err := upgrader.Upgrade(writer, request, nil)
		if err != nil {
			return
		}
		defer connection.Close()
		messageType, payload, err := connection.ReadMessage()
		if err == nil {
			_ = connection.WriteMessage(messageType, append([]byte("server:"), payload...))
		}
	}))
	defer upstream.Close()
	handler, err := NewServiceProxy(upstream.URL)
	if err != nil {
		t.Fatal(err)
	}
	public := httptest.NewServer(handler)
	defer public.Close()

	socketURL := "ws" + strings.TrimPrefix(public.URL, "http") + "/dice/ws"
	connection, _, err := websocket.DefaultDialer.Dial(socketURL, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close()
	if err := connection.WriteMessage(websocket.BinaryMessage, []byte("hello")); err != nil {
		t.Fatal(err)
	}
	messageType, payload, err := connection.ReadMessage()
	if err != nil {
		t.Fatal(err)
	}
	if messageType != websocket.BinaryMessage || string(payload) != "server:hello" {
		t.Fatalf("unexpected websocket reply: type=%d payload=%q", messageType, payload)
	}
}

func TestServiceProxyReturnsUnavailableForDownstreamFailure(t *testing.T) {
	handler, err := NewServiceProxy("http://127.0.0.1:1")
	if err != nil {
		t.Fatal(err)
	}
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "http://cards.example/dice/ws", nil))
	if response.Code != http.StatusServiceUnavailable {
		body, _ := io.ReadAll(response.Result().Body)
		t.Fatalf("unexpected response: %d %s", response.Code, body)
	}
}

func TestServiceProxyRejectsInvalidConfiguration(t *testing.T) {
	if _, err := NewServiceProxy("file:///tmp/dice.sock"); err == nil {
		t.Fatal("expected non-HTTP service URL to fail")
	}
}
