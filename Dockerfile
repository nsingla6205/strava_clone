# --- frontend ---
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- api ---
FROM golang:1.25-bookworm AS api
WORKDIR /src
ENV GOTOOLCHAIN=auto
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

# --- runtime ---
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=api /out/server /app/server
COPY --from=frontend /app/frontend/dist /app/frontend/dist
ENV PORT=8080
ENV FRONTEND_DIR=/app/frontend/dist
ENV DB_PATH=/data/turf.db
RUN mkdir -p /data
EXPOSE 8080
CMD ["/app/server"]
