package models

import "time"

type User struct {
	ID           string    `json:"id"`
	Username     string    `json:"username"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Color        string    `json:"color"`
	CreatedAt    time.Time `json:"created_at"`
}

type LatLng struct {
	Lat       float64 `json:"lat"`
	Lng       float64 `json:"lng"`
	Timestamp int64   `json:"timestamp,omitempty"`
}

type Activity struct {
	ID               string    `json:"id"`
	UserID           string    `json:"user_id"`
	Username         string    `json:"username,omitempty"`
	UserColor        string    `json:"user_color,omitempty"`
	Name             string    `json:"name"`
	StartedAt        time.Time `json:"started_at"`
	EndedAt          *time.Time `json:"ended_at,omitempty"`
	DistanceM        float64   `json:"distance_m"`
	DurationS        int       `json:"duration_s"`
	Path             []LatLng  `json:"path,omitempty"`
	TerritoryClaimed int       `json:"territory_claimed"`
	Active           bool      `json:"active"`
}

type TerritoryCell struct {
	CellID    string    `json:"cell_id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username,omitempty"`
	Color     string    `json:"color,omitempty"`
	Bounds    []LatLng  `json:"bounds"`
	ClaimedAt time.Time `json:"claimed_at"`
	ActivityID string   `json:"activity_id,omitempty"`
}

type LeaderboardEntry struct {
	UserID     string `json:"user_id"`
	Username   string `json:"username"`
	Color      string `json:"color"`
	Cells      int    `json:"cells"`
	DistanceM  float64 `json:"distance_m"`
	Activities int    `json:"activities"`
}

type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type StartActivityRequest struct {
	Name string `json:"name"`
}

type TrackPointRequest struct {
	Points []LatLng `json:"points"`
}

type FinishActivityRequest struct {
	Name string `json:"name"`
}
