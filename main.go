package main

//go:generate npx buf generate

import (
	"cards/gen/proto/card"
	"cards/gen/proto/card/cardconnect"
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"

	"github.com/bufbuild/connect-go"
	grpcreflect "github.com/bufbuild/connect-grpcreflect-go"
	"github.com/upper/db/v4/adapter/mysql"
	"golang.org/x/net/http2"
	"golang.org/x/net/http2/h2c"
)

type CardService struct {

}

var _ cardconnect.CardServiceHandler = (*CardService)(nil)

func (s *CardService) GetCards(ctx context.Context, req *connect.Request[card.GetCardsRequest]) (*connect.Response[card.GetCardsResponse], error) {

	return connect.NewResponse(&card.GetCardsResponse{
		Cards: []*card.Card{
			{
				Name: "1",
				Description: "A",
			},
		},
	}), nil
}

func (s *CardService) NewCard(ctx context.Context, req *connect.Request[card.Card]) (*connect.Response[card.Card], error) {
	return connect.NewResponse(&card.Card{
		Name: "1",
	}), nil
}

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

var settings = mysql.ConnectionURL{
	Database: `carddatabase`,
	Host:     `localhost`,
	User:     `root`,
	Password: `password`,
}

func main() {
	sess, err := mysql.Open(settings)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer sess.Close()

	interceptors := connect.WithInterceptors(NewLogInterceptor())

	apiRoot := http.NewServeMux()

	cardService := &CardService{}

	apiRoot.Handle(cardconnect.NewCardServiceHandler(cardService, interceptors))

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
