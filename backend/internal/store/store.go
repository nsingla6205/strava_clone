package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/nsingla/strava_clone/internal/models"
	"github.com/nsingla/strava_clone/internal/territory"
	_ "modernc.org/sqlite"
)

var userColors = []string{
	"#FC4C02", "#1B9E77", "#D95F02", "#7570B3", "#E7298A",
	"#66A61E", "#E6AB02", "#A6761D", "#0288D1", "#8E24AA",
}

type Store struct {
	db *sql.DB
}

func New(path string) (*Store, error) {
	// modernc.org/sqlite (pure Go) — works in free Docker hosts without CGO.
	db, err := sql.Open("sqlite", path+"?_pragma=foreign_keys(1)&_pragma=busy_timeout(5000)")
	if err != nil {
		return nil, err
	}
	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS users (
		id TEXT PRIMARY KEY,
		username TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		password_hash TEXT NOT NULL,
		color TEXT NOT NULL,
		created_at DATETIME NOT NULL
	);
	CREATE TABLE IF NOT EXISTS activities (
		id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users(id),
		name TEXT NOT NULL,
		started_at DATETIME NOT NULL,
		ended_at DATETIME,
		distance_m REAL NOT NULL DEFAULT 0,
		duration_s INTEGER NOT NULL DEFAULT 0,
		path_json TEXT NOT NULL DEFAULT '[]',
		territory_claimed INTEGER NOT NULL DEFAULT 0,
		active INTEGER NOT NULL DEFAULT 1
	);
	CREATE TABLE IF NOT EXISTS territory (
		cell_id TEXT PRIMARY KEY,
		user_id TEXT NOT NULL REFERENCES users(id),
		activity_id TEXT NOT NULL,
		claimed_at DATETIME NOT NULL
	);
	CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
	CREATE INDEX IF NOT EXISTS idx_territory_user ON territory(user_id);
	`
	_, err := s.db.Exec(schema)
	return err
}

func (s *Store) CreateUser(username, email, passwordHash string) (*models.User, error) {
	var count int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&count); err != nil {
		return nil, err
	}
	u := &models.User{
		ID:           uuid.NewString(),
		Username:     username,
		Email:        email,
		PasswordHash: passwordHash,
		Color:        userColors[count%len(userColors)],
		CreatedAt:    time.Now().UTC(),
	}
	_, err := s.db.Exec(
		`INSERT INTO users (id, username, email, password_hash, color, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
		u.ID, u.Username, u.Email, u.PasswordHash, u.Color, u.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	return u, nil
}

func (s *Store) GetUserByEmail(email string) (*models.User, error) {
	u := &models.User{}
	err := s.db.QueryRow(
		`SELECT id, username, email, password_hash, color, created_at FROM users WHERE email = ?`,
		email,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.Color, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Store) GetUserByID(id string) (*models.User, error) {
	u := &models.User{}
	err := s.db.QueryRow(
		`SELECT id, username, email, password_hash, color, created_at FROM users WHERE id = ?`,
		id,
	).Scan(&u.ID, &u.Username, &u.Email, &u.PasswordHash, &u.Color, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return u, nil
}

func (s *Store) StartActivity(userID, name string) (*models.Activity, error) {
	// End any leftover active activities.
	_, _ = s.db.Exec(
		`UPDATE activities SET active = 0, ended_at = ? WHERE user_id = ? AND active = 1`,
		time.Now().UTC(), userID,
	)
	if name == "" {
		name = "Morning Run"
	}
	a := &models.Activity{
		ID:        uuid.NewString(),
		UserID:    userID,
		Name:      name,
		StartedAt: time.Now().UTC(),
		Path:      []models.LatLng{},
		Active:    true,
	}
	pathJSON, _ := json.Marshal(a.Path)
	_, err := s.db.Exec(
		`INSERT INTO activities (id, user_id, name, started_at, path_json, active) VALUES (?, ?, ?, ?, ?, 1)`,
		a.ID, a.UserID, a.Name, a.StartedAt, string(pathJSON),
	)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (s *Store) getActivity(id string) (*models.Activity, error) {
	a := &models.Activity{}
	var pathJSON string
	var endedAt sql.NullTime
	err := s.db.QueryRow(
		`SELECT id, user_id, name, started_at, ended_at, distance_m, duration_s, path_json, territory_claimed, active
		 FROM activities WHERE id = ?`, id,
	).Scan(&a.ID, &a.UserID, &a.Name, &a.StartedAt, &endedAt, &a.DistanceM, &a.DurationS, &pathJSON, &a.TerritoryClaimed, &a.Active)
	if err != nil {
		return nil, err
	}
	if endedAt.Valid {
		t := endedAt.Time
		a.EndedAt = &t
	}
	_ = json.Unmarshal([]byte(pathJSON), &a.Path)
	if a.Path == nil {
		a.Path = []models.LatLng{}
	}
	return a, nil
}

func (s *Store) GetActivity(id string) (*models.Activity, error) {
	a, err := s.getActivity(id)
	if err != nil {
		return nil, err
	}
	u, err := s.GetUserByID(a.UserID)
	if err == nil {
		a.Username = u.Username
		a.UserColor = u.Color
	}
	return a, nil
}

func (s *Store) TrackPoints(activityID, userID string, points []models.LatLng) (*models.Activity, []models.TerritoryCell, error) {
	a, err := s.getActivity(activityID)
	if err != nil {
		return nil, nil, err
	}
	if a.UserID != userID {
		return nil, nil, fmt.Errorf("forbidden")
	}
	if !a.Active {
		return nil, nil, fmt.Errorf("activity not active")
	}
	if len(points) == 0 {
		return a, nil, nil
	}

	points = territory.KeepMovedPoints(a.Path, points)
	a.Path = append(a.Path, points...)
	a.DistanceM = territory.PathDistanceM(a.Path)
	a.DurationS = int(time.Since(a.StartedAt).Seconds())

	cells := territory.CellsAlongPath(points)
	var claimed []models.TerritoryCell
	now := time.Now().UTC()
	u, _ := s.GetUserByID(userID)

	tx, err := s.db.Begin()
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback()

	for _, cellID := range cells {
		var owner string
		err := tx.QueryRow(`SELECT user_id FROM territory WHERE cell_id = ?`, cellID).Scan(&owner)
		alreadyMine := err == nil && owner == userID
		if err != nil && err != sql.ErrNoRows {
			return nil, nil, err
		}
		if alreadyMine {
			continue
		}
		if err == sql.ErrNoRows {
			_, err = tx.Exec(
				`INSERT INTO territory (cell_id, user_id, activity_id, claimed_at) VALUES (?, ?, ?, ?)`,
				cellID, userID, activityID, now,
			)
		} else {
			_, err = tx.Exec(
				`UPDATE territory SET user_id = ?, activity_id = ?, claimed_at = ? WHERE cell_id = ?`,
				userID, activityID, now, cellID,
			)
		}
		if err != nil {
			return nil, nil, err
		}
		color := "#FC4C02"
		username := ""
		if u != nil {
			color = u.Color
			username = u.Username
		}
		claimed = append(claimed, models.TerritoryCell{
			CellID:     cellID,
			UserID:     userID,
			Username:   username,
			Color:      color,
			Bounds:     territory.CellBounds(cellID),
			ClaimedAt:  now,
			ActivityID: activityID,
		})
	}

	// Recount newly owned cells for this activity (cells currently owned by user from this activity).
	var activityCells int
	_ = tx.QueryRow(
		`SELECT COUNT(*) FROM territory WHERE activity_id = ? AND user_id = ?`, activityID, userID,
	).Scan(&activityCells)
	a.TerritoryClaimed = activityCells

	pathJSON, _ := json.Marshal(a.Path)
	_, err = tx.Exec(
		`UPDATE activities SET path_json = ?, distance_m = ?, duration_s = ?, territory_claimed = ? WHERE id = ?`,
		string(pathJSON), a.DistanceM, a.DurationS, a.TerritoryClaimed, a.ID,
	)
	if err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, nil, err
	}

	if u != nil {
		a.Username = u.Username
		a.UserColor = u.Color
	}
	return a, claimed, nil
}

func (s *Store) FinishActivity(activityID, userID, name string) (*models.Activity, error) {
	a, err := s.getActivity(activityID)
	if err != nil {
		return nil, err
	}
	if a.UserID != userID {
		return nil, fmt.Errorf("forbidden")
	}
	now := time.Now().UTC()
	a.EndedAt = &now
	a.Active = false
	a.DurationS = int(now.Sub(a.StartedAt).Seconds())
	a.DistanceM = territory.PathDistanceM(a.Path)
	if name != "" {
		a.Name = name
	}
	var cells int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM territory WHERE activity_id = ?`, a.ID).Scan(&cells)
	a.TerritoryClaimed = cells

	_, err = s.db.Exec(
		`UPDATE activities SET name = ?, ended_at = ?, distance_m = ?, duration_s = ?, territory_claimed = ?, active = 0 WHERE id = ?`,
		a.Name, now, a.DistanceM, a.DurationS, a.TerritoryClaimed, a.ID,
	)
	if err != nil {
		return nil, err
	}
	u, _ := s.GetUserByID(userID)
	if u != nil {
		a.Username = u.Username
		a.UserColor = u.Color
	}
	return a, nil
}

func (s *Store) ListActivities(userID string, limit int) ([]models.Activity, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.db.Query(
		`SELECT a.id, a.user_id, a.name, a.started_at, a.ended_at, a.distance_m, a.duration_s, a.path_json, a.territory_claimed, a.active,
		        u.username, u.color
		 FROM activities a JOIN users u ON u.id = a.user_id
		 WHERE a.user_id = ? ORDER BY a.started_at DESC LIMIT ?`,
		userID, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanActivities(rows)
}

func (s *Store) ListFeed(limit int) ([]models.Activity, error) {
	if limit <= 0 {
		limit = 30
	}
	rows, err := s.db.Query(
		`SELECT a.id, a.user_id, a.name, a.started_at, a.ended_at, a.distance_m, a.duration_s, a.path_json, a.territory_claimed, a.active,
		        u.username, u.color
		 FROM activities a JOIN users u ON u.id = a.user_id
		 WHERE a.active = 0 ORDER BY a.started_at DESC LIMIT ?`,
		limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return scanActivities(rows)
}

func scanActivities(rows *sql.Rows) ([]models.Activity, error) {
	var out []models.Activity
	for rows.Next() {
		var a models.Activity
		var pathJSON string
		var endedAt sql.NullTime
		if err := rows.Scan(
			&a.ID, &a.UserID, &a.Name, &a.StartedAt, &endedAt, &a.DistanceM, &a.DurationS,
			&pathJSON, &a.TerritoryClaimed, &a.Active, &a.Username, &a.UserColor,
		); err != nil {
			return nil, err
		}
		if endedAt.Valid {
			t := endedAt.Time
			a.EndedAt = &t
		}
		_ = json.Unmarshal([]byte(pathJSON), &a.Path)
		out = append(out, a)
	}
	if out == nil {
		out = []models.Activity{}
	}
	return out, rows.Err()
}

func (s *Store) GetTerritory(minLat, minLng, maxLat, maxLng float64) ([]models.TerritoryCell, error) {
	rows, err := s.db.Query(
		`SELECT t.cell_id, t.user_id, t.activity_id, t.claimed_at, u.username, u.color
		 FROM territory t JOIN users u ON u.id = t.user_id`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.TerritoryCell
	for rows.Next() {
		var c models.TerritoryCell
		if err := rows.Scan(&c.CellID, &c.UserID, &c.ActivityID, &c.ClaimedAt, &c.Username, &c.Color); err != nil {
			return nil, err
		}
		c.Bounds = territory.CellBounds(c.CellID)
		if len(c.Bounds) == 0 {
			continue
		}
		// Rough bbox filter using SW corner.
		sw := c.Bounds[0]
		ne := c.Bounds[2]
		if ne.Lat < minLat || sw.Lat > maxLat || ne.Lng < minLng || sw.Lng > maxLng {
			continue
		}
		out = append(out, c)
	}
	if out == nil {
		out = []models.TerritoryCell{}
	}
	return out, rows.Err()
}

func (s *Store) Leaderboard(limit int) ([]models.LeaderboardEntry, error) {
	if limit <= 0 {
		limit = 20
	}
	rows, err := s.db.Query(`
		SELECT u.id, u.username, u.color,
		       COALESCE(t.cells, 0) AS cells,
		       COALESCE(a.distance_m, 0) AS distance_m,
		       COALESCE(a.activities, 0) AS activities
		FROM users u
		LEFT JOIN (SELECT user_id, COUNT(*) AS cells FROM territory GROUP BY user_id) t ON t.user_id = u.id
		LEFT JOIN (
			SELECT user_id, SUM(distance_m) AS distance_m, COUNT(*) AS activities
			FROM activities WHERE active = 0 GROUP BY user_id
		) a ON a.user_id = u.id
		ORDER BY cells DESC, distance_m DESC
		LIMIT ?
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []models.LeaderboardEntry
	for rows.Next() {
		var e models.LeaderboardEntry
		if err := rows.Scan(&e.UserID, &e.Username, &e.Color, &e.Cells, &e.DistanceM, &e.Activities); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	if out == nil {
		out = []models.LeaderboardEntry{}
	}
	return out, rows.Err()
}

func (s *Store) UserStats(userID string) (map[string]any, error) {
	var cells int
	var distance float64
	var activities int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM territory WHERE user_id = ?`, userID).Scan(&cells)
	_ = s.db.QueryRow(
		`SELECT COALESCE(SUM(distance_m),0), COUNT(*) FROM activities WHERE user_id = ? AND active = 0`,
		userID,
	).Scan(&distance, &activities)
	return map[string]any{
		"cells":      cells,
		"distance_m": distance,
		"activities": activities,
		// ~55m x 55m cells
		"area_km2": float64(cells) * 0.055 * 0.055,
	}, nil
}
