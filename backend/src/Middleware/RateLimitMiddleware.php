<?php

declare(strict_types=1);

namespace WinMix\Middleware;

use Psr\Log\LoggerInterface;

class RateLimitMiddleware
{
    private int $limit;
    private int $window;

    public function __construct(
        private readonly LoggerInterface $logger
    ) {
        $this->limit = (int)($_ENV['API_RATE_LIMIT'] ?? 100);
        $this->window = (int)($_ENV['API_RATE_WINDOW'] ?? 3600);
    }

    public function handle(): void
    {
        $clientId = $this->getClientIdentifier();
        $key = "rate_limit:{$clientId}";

        // Simple file-based rate limiting for now
        // In production, use Redis or database
        $requests = $this->getRequestCount($key);
        
        if ($requests >= $this->limit) {
            $this->logger->warning('Rate limit exceeded', [
                'client_id' => $clientId,
                'requests' => $requests,
                'limit' => $this->limit
            ]);

            header('HTTP/1.1 429 Too Many Requests');
            header('Content-Type: application/json');
            header('Retry-After: ' . $this->window);
            
            echo json_encode([
                'success' => false,
                'error' => 'Rate limit exceeded',
                'limit' => $this->limit,
                'window' => $this->window,
                'timestamp' => date('c')
            ]);
            exit();
        }

        $this->incrementRequestCount($key);
        
        // Add rate limit headers
        header('X-RateLimit-Limit: ' . $this->limit);
        header('X-RateLimit-Remaining: ' . max(0, $this->limit - $requests - 1));
        header('X-RateLimit-Reset: ' . (time() + $this->window));
    }

    private function getClientIdentifier(): string
    {
        // Use IP address as client identifier
        // In production, could use API key or user ID
        return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }

    private function getRequestCount(string $key): int
    {
        $file = sys_get_temp_dir() . '/' . md5($key) . '.txt';
        
        if (!file_exists($file)) {
            return 0;
        }

        $data = file_get_contents($file);
        if ($data === false) {
            return 0;
        }

        $parts = explode('|', $data);
        if (count($parts) !== 2) {
            return 0;
        }

        $timestamp = (int)$parts[0];
        $count = (int)$parts[1];

        // Reset if window has passed
        if (time() - $timestamp > $this->window) {
            unlink($file);
            return 0;
        }

        return $count;
    }

    private function incrementRequestCount(string $key): void
    {
        $file = sys_get_temp_dir() . '/' . md5($key) . '.txt';
        $currentCount = $this->getRequestCount($key);
        
        if ($currentCount === 0) {
            $data = time() . '|1';
        } else {
            $timestamp = time();
            $data = $timestamp . '|' . ($currentCount + 1);
        }

        file_put_contents($file, $data, LOCK_EX);
    }
}