package main

//go:generate npx buf generate

import (
	"cards/biome"
	"cards/card"
	"cards/gen/proto/biome/biomeconnect"
	"cards/gen/proto/card/cardconnect"
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/bufbuild/connect-go"
	grpcreflect "github.com/bufbuild/connect-grpcreflect-go"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

func NewLogInterceptor() connect.UnaryInterceptorFunc {
	interceptor := func(next connect.UnaryFunc) connect.UnaryFunc {
		return func(
			ctx context.Context,
			req connect.AnyRequest,
		) (connect.AnyResponse, error) {
			resp, err := next(ctx, req)
			if err != nil {
				// slog.Error("connect error", "error", fmt.Sprintf("%+v", err))
				// TODO breadchris this should only be done for local dev
				fmt.Printf("%+v\n", err)
			}
			return resp, err
		}
	}
	return interceptor
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		slog.Debug("request", "method", r.Method, "path", r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func main() {
	interceptors := connect.WithInterceptors(NewLogInterceptor())

	apiRoot := http.NewServeMux()

	cardService := &card.CardService{}
	biomeService := &biome.BiomeService{}

	apiRoot.Handle(cardconnect.NewCardServiceHandler(cardService, interceptors))
	apiRoot.Handle(biomeconnect.NewBiomeServiceHandler(biomeService, interceptors))

	reflector := grpcreflect.NewStaticReflector(
		"card.CardService",
	)
	recoverCall := func(_ context.Context, spec connect.Spec, _ http.Header, p any) error {
		slog.Error("panic", "err", fmt.Sprintf("%+v", p))
		if err, ok := p.(error); ok {
			return err
		}
		return fmt.Errorf("panic: %v", p)
	}
	apiRoot.Handle(grpcreflect.NewHandlerV1(reflector, connect.WithRecover(recoverCall)))
	// Many tools still expect the older version of the server reflection Service, so
	// most servers should mount both handlers.
	apiRoot.Handle(grpcreflect.NewHandlerV1Alpha(reflector, connect.WithRecover(recoverCall)))

	addr := fmt.Sprintf(":%d", 8080)

	slog.Info("starting http server", "addr", addr)

	http.ListenAndServe(addr, h2c.NewHandler(corsMiddleware(apiRoot), &http2.Server{}))

}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		// TODO breadchris how bad is this? lol
		origin := r.Header.Get("Origin")

		// TODO breadchris this should only be done for local dev
		w.Header().Set("Access-Control-Allow-Origin", origin)

		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Authorization, connect-protocol-version")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
