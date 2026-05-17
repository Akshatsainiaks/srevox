// Srevox K8s Watcher — Go
// Uses K8s Watch API (single persistent connection per cluster).
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/srevox/watcher/internal/k8s"
	"github.com/srevox/watcher/internal/publisher"
)

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("🔭 Srevox Watcher starting...")

	redisURL   := getEnv("REDIS_URL",    "redis://192.168.133.150:6379")
	clusterID  := getEnv("CLUSTER_ID",  "bf151459-9dd0-4298-a70c-bad244c7efcb")
	clusterName:= getEnv("CLUSTER_NAME","TEST")
	kubeconfig := getEnv("KUBECONFIG",  defaultKubeconfig())

	log.Printf("Redis: %s", redisURL)
	log.Printf("Cluster ID: %s", clusterID)
	log.Printf("Kubeconfig: %s", kubeconfig)

	pub, err := publisher.NewRedisPublisher(redisURL)
	if err != nil {
		log.Fatalf("Redis connection failed: %v", err)
	}
	defer pub.Close()
	log.Println("✅ Redis connected")

	watcher, err := k8s.NewWatcher(k8s.Config{
		KubeconfigPath:  kubeconfig,
		ClusterID:       clusterID,
		ClusterName:     clusterName,
		WatchNamespaces: getEnv("WATCH_NAMESPACES", ""),
		Publisher:       pub,
		RedisChannel:    "srevox:crashes",
	})
	if err != nil {
		log.Fatalf("K8s watcher init failed: %v", err)
	}
	log.Println("✅ K8s connected")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sig
		log.Println("Shutdown signal received")
		cancel()
	}()

	log.Printf("👀 Watching cluster: %s (%s)", clusterName, clusterID)
	if err := watcher.Run(ctx); err != nil && err != context.Canceled {
		log.Fatalf("Watcher error: %v", err)
	}
	log.Println("Watcher stopped cleanly")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func defaultKubeconfig() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return home + "/.kube/config"
}