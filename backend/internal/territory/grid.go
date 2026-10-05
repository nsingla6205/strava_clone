package territory

import (
	"fmt"
	"math"

	"github.com/nsingla/strava_clone/internal/models"
)

// CellSizeDeg ~55m at equator (0.0005° ≈ 55m). Fine enough for running territories.
const CellSizeDeg = 0.0005

func CellID(lat, lng float64) string {
	row := int(math.Floor(lat / CellSizeDeg))
	col := int(math.Floor(lng / CellSizeDeg))
	return fmt.Sprintf("%d:%d", row, col)
}

func CellBounds(cellID string) []models.LatLng {
	var row, col int
	fmt.Sscanf(cellID, "%d:%d", &row, &col)
	south := float64(row) * CellSizeDeg
	west := float64(col) * CellSizeDeg
	north := south + CellSizeDeg
	east := west + CellSizeDeg
	return []models.LatLng{
		{Lat: south, Lng: west},
		{Lat: south, Lng: east},
		{Lat: north, Lng: east},
		{Lat: north, Lng: west},
	}
}

// CellsAlongPath returns unique grid cells crossed by the GPS path.
func CellsAlongPath(path []models.LatLng) []string {
	seen := make(map[string]struct{})
	var cells []string

	add := func(lat, lng float64) {
		id := CellID(lat, lng)
		if _, ok := seen[id]; ok {
			return
		}
		seen[id] = struct{}{}
		cells = append(cells, id)
	}

	for i, p := range path {
		add(p.Lat, p.Lng)
		if i == 0 {
			continue
		}
		// Interpolate between points so fast GPS jumps still claim cells.
		prev := path[i-1]
		steps := interpolateSteps(prev, p)
		for s := 1; s < steps; s++ {
			t := float64(s) / float64(steps)
			lat := prev.Lat + (p.Lat-prev.Lat)*t
			lng := prev.Lng + (p.Lng-prev.Lng)*t
			add(lat, lng)
		}
	}
	return cells
}

func interpolateSteps(a, b models.LatLng) int {
	dLat := math.Abs(b.Lat - a.Lat)
	dLng := math.Abs(b.Lng - a.Lng)
	dist := math.Hypot(dLat, dLng)
	steps := int(math.Ceil(dist / (CellSizeDeg * 0.5)))
	if steps < 1 {
		return 1
	}
	if steps > 200 {
		return 200
	}
	return steps
}

// HaversineDistanceM returns distance in meters between two points.
func HaversineDistanceM(a, b models.LatLng) float64 {
	const R = 6371000.0
	toRad := math.Pi / 180
	dLat := (b.Lat - a.Lat) * toRad
	dLng := (b.Lng - a.Lng) * toRad
	lat1 := a.Lat * toRad
	lat2 := b.Lat * toRad
	h := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1)*math.Cos(lat2)*math.Sin(dLng/2)*math.Sin(dLng/2)
	return 2 * R * math.Asin(math.Min(1, math.Sqrt(h)))
}

// KeepMovedPoints drops GPS noise. A still phone reports a new coordinate every
// second; anything under minMoveM, or faster than a sprint, is not real movement.
func KeepMovedPoints(existing, incoming []models.LatLng) []models.LatLng {
	const minMoveM = 12.0
	const maxSpeedMps = 30.0

	var last models.LatLng
	hasLast := false
	if n := len(existing); n > 0 {
		last = existing[n-1]
		hasLast = true
	}

	kept := make([]models.LatLng, 0, len(incoming))
	for _, p := range incoming {
		if !hasLast {
			kept = append(kept, p)
			last = p
			hasLast = true
			continue
		}
		d := HaversineDistanceM(last, p)
		if d < minMoveM {
			continue
		}
		if p.Timestamp > 0 && last.Timestamp > 0 {
			dt := float64(p.Timestamp-last.Timestamp) / 1000
			if dt > 0.2 && d/dt > maxSpeedMps {
				continue
			}
		}
		kept = append(kept, p)
		last = p
	}
	return kept
}

func PathDistanceM(path []models.LatLng) float64 {
	var total float64
	for i := 1; i < len(path); i++ {
		total += HaversineDistanceM(path[i-1], path[i])
	}
	return total
}
