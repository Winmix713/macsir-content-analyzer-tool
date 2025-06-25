<?php

declare(strict_types=1);

namespace WinMix\Middleware;

class CorsMiddleware
{
    public function handle(): void
    {
        $allowedOrigins = explode(',', $_ENV['CORS_ORIGINS'] ?? '*');
        $allowedMethods = $_ENV['CORS_METHODS'] ?? 'GET,POST,PUT,DELETE,OPTIONS';
        $allowedHeaders = $_ENV['CORS_HEADERS'] ?? 'Content-Type,Authorization';

        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if ($allowedOrigins[0] === '*' || in_array($origin, $allowedOrigins, true)) {
            header('Access-Control-Allow-Origin: ' . ($allowedOrigins[0] === '*' ? '*' : $origin));
        }

        header('Access-Control-Allow-Methods: ' . $allowedMethods);
        header('Access-Control-Allow-Headers: ' . $allowedHeaders);
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');

        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit();
        }
    }
}