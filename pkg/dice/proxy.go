package dice

import (
	"errors"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
)

const defaultServiceURL = "http://127.0.0.1:8081"

// NewServiceProxy keeps the public WebSocket on the Go server while forwarding
// the complete connection to the Rust room/physics authority.
func NewServiceProxy(rawURL string) (http.Handler, error) {
	if strings.TrimSpace(rawURL) == "" {
		rawURL = defaultServiceURL
	}
	upstream, err := url.Parse(rawURL)
	if err != nil || upstream.Scheme == "" || upstream.Host == "" {
		return nil, errors.New("DICE_SERVICE_URL must be an absolute HTTP URL")
	}
	if upstream.Scheme != "http" && upstream.Scheme != "https" {
		return nil, errors.New("DICE_SERVICE_URL must use http or https")
	}

	proxy := &httputil.ReverseProxy{
		Rewrite: func(request *httputil.ProxyRequest) {
			publicHost := request.In.Host
			request.SetURL(upstream)
			request.SetXForwarded()
			request.Out.Host = publicHost
			request.Out.Header.Set("X-Forwarded-Host", publicHost)
		},
		FlushInterval: -1,
		ErrorHandler: func(writer http.ResponseWriter, request *http.Request, err error) {
			slog.Warn("dice physics service unavailable", "error", err)
			http.Error(writer, "dice physics service unavailable", http.StatusServiceUnavailable)
		},
	}
	return proxy, nil
}

func NewServiceProxyFromEnvironment() (http.Handler, error) {
	return NewServiceProxy(os.Getenv("DICE_SERVICE_URL"))
}
