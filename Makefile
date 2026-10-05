.PHONY: api web dev

api:
	cd backend && go run ./cmd/server

web:
	cd frontend && npm run dev

dev:
	@echo "Run 'make api' and 'make web' in two terminals"
