package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/nsingla/strava_clone/internal/auth"
	"github.com/nsingla/strava_clone/internal/models"
	"github.com/nsingla/strava_clone/internal/store"
)

type API struct {
	Store *store.Store
	Auth  *auth.Service
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (a *API) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	if req.Username == "" || req.Email == "" || len(req.Password) < 6 {
		writeErr(w, http.StatusBadRequest, "username, email, and password (6+ chars) required")
		return
	}
	hash, err := a.Auth.HashPassword(req.Password)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	user, err := a.Store.CreateUser(req.Username, req.Email, hash)
	if err != nil {
		writeErr(w, http.StatusConflict, "username or email already taken")
		return
	}
	token, err := a.Auth.Token(user.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not mint token")
		return
	}
	writeJSON(w, http.StatusCreated, models.AuthResponse{Token: token, User: *user})
}

func (a *API) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, err := a.Store.GetUserByEmail(req.Email)
	if err != nil || !a.Auth.CheckPassword(user.PasswordHash, req.Password) {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	token, err := a.Auth.Token(user.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, "could not mint token")
		return
	}
	writeJSON(w, http.StatusOK, models.AuthResponse{Token: token, User: *user})
}

func (a *API) Me(w http.ResponseWriter, r *http.Request) {
	user, err := a.Store.GetUserByID(auth.UserID(r.Context()))
	if err != nil {
		writeErr(w, http.StatusNotFound, "user not found")
		return
	}
	stats, _ := a.Store.UserStats(user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"user": user, "stats": stats})
}

func (a *API) StartActivity(w http.ResponseWriter, r *http.Request) {
	var req models.StartActivityRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	act, err := a.Store.StartActivity(auth.UserID(r.Context()), req.Name)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, act)
}

func (a *API) TrackPoints(w http.ResponseWriter, r *http.Request) {
	var req models.TrackPointRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid json")
		return
	}
	act, claimed, err := a.Store.TrackPoints(chi.URLParam(r, "id"), auth.UserID(r.Context()), req.Points)
	if err != nil {
		if err.Error() == "forbidden" {
			writeErr(w, http.StatusForbidden, "forbidden")
			return
		}
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"activity": act,
		"claimed":  claimed,
	})
}

func (a *API) FinishActivity(w http.ResponseWriter, r *http.Request) {
	var req models.FinishActivityRequest
	_ = json.NewDecoder(r.Body).Decode(&req)
	act, err := a.Store.FinishActivity(chi.URLParam(r, "id"), auth.UserID(r.Context()), req.Name)
	if err != nil {
		if err.Error() == "forbidden" {
			writeErr(w, http.StatusForbidden, "forbidden")
			return
		}
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, act)
}

func (a *API) GetActivity(w http.ResponseWriter, r *http.Request) {
	act, err := a.Store.GetActivity(chi.URLParam(r, "id"))
	if err != nil {
		writeErr(w, http.StatusNotFound, "not found")
		return
	}
	writeJSON(w, http.StatusOK, act)
}

func (a *API) MyActivities(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListActivities(auth.UserID(r.Context()), 50)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) Feed(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.ListFeed(40)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}

func (a *API) Territory(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	minLat, _ := strconv.ParseFloat(q.Get("min_lat"), 64)
	minLng, _ := strconv.ParseFloat(q.Get("min_lng"), 64)
	maxLat, _ := strconv.ParseFloat(q.Get("max_lat"), 64)
	maxLng, _ := strconv.ParseFloat(q.Get("max_lng"), 64)
	if minLat == 0 && maxLat == 0 {
		minLat, minLng, maxLat, maxLng = -90, -180, 90, 180
	}
	cells, err := a.Store.GetTerritory(minLat, minLng, maxLat, maxLng)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, cells)
}

func (a *API) Leaderboard(w http.ResponseWriter, r *http.Request) {
	list, err := a.Store.Leaderboard(25)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}
