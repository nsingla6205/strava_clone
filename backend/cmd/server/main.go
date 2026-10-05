package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/nsingla/strava_clone/internal/auth"
	"github.com/nsingla/strava_clone/internal/handlers"
	"github.com/nsingla/strava_clone/internal/store"
)

func main() {
	port := env("PORT", "8080")
	secret := env("JWT_SECRET", "turf-run-dev-secret-change-me")
	dbPath := env("DB_PATH", filepath.Join("data", "turf.db"))
	frontendDir := env("FRONTEND_DIR", filepath.Join("..", "frontend", "dist"))

	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		log.Fatal(err)
	}

	st, err := store.New(dbPath)
	if err != nil {
		log.Fatal(err)
	}
	defer st.Close()

	authSvc := auth.New(secret)
	api := &handlers.API{Store: st, Auth: authSvc}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Accept", "Authorization", "Content-Type"},
		MaxAge:         300,
	}))

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Write([]byte(`{"ok":true}`))
	})

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/register", api.Register)
		r.Post("/auth/login", api.Login)
		r.Get("/territory", api.Territory)
		r.Get("/leaderboard", api.Leaderboard)
		r.Get("/feed", api.Feed)
		r.Get("/activities/{id}", api.GetActivity)

		r.Group(func(r chi.Router) {
			r.Use(authSvc.Middleware)
			r.Get("/me", api.Me)
			r.Post("/activities", api.StartActivity)
			r.Post("/activities/{id}/track", api.TrackPoints)
			r.Post("/activities/{id}/finish", api.FinishActivity)
			r.Get("/activities", api.MyActivities)
		})
	})

	if info, err := os.Stat(frontendDir); err == nil && info.IsDir() {
		abs, _ := filepath.Abs(frontendDir)
		fileServer := http.FileServer(http.Dir(abs))
		r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
			rel := strings.TrimPrefix(filepath.Clean(req.URL.Path), "/")
			full := filepath.Join(abs, rel)
			if st, err := os.Stat(full); err == nil && !st.IsDir() {
				fileServer.ServeHTTP(w, req)
				return
			}
			http.ServeFile(w, req, filepath.Join(abs, "index.html"))
		})
		log.Printf("Serving frontend from %s", abs)
	} else {
		log.Printf("Frontend dist not found at %s (API only)", frontendDir)
	}

	log.Printf("TurfRun API listening on :%s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
