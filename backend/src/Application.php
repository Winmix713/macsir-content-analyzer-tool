<?php

declare(strict_types=1);

namespace WinMix;

use FastRoute\Dispatcher;
use FastRoute\RouteCollector;
use WinMix\Config\Database;
use WinMix\Controller\PredictionController;
use WinMix\Controller\HealthController;
use WinMix\Middleware\CorsMiddleware;
use WinMix\Middleware\RateLimitMiddleware;
use Monolog\Logger;
use Monolog\Handler\StreamHandler;

class Application
{
    private Logger $logger;
    private array $middleware = [];

    public function __construct()
    {
        $this->setupLogger();
        $this->setupMiddleware();
        $this->initializeDatabase();
    }

    public function run(): void
    {
        $httpMethod = $_SERVER['REQUEST_METHOD'];
        $uri = $_SERVER['REQUEST_URI'];

        // Remove query string and decode URI
        if (false !== $pos = strpos($uri, '?')) {
            $uri = substr($uri, 0, $pos);
        }
        $uri = rawurldecode($uri);

        // Apply middleware
        foreach ($this->middleware as $middleware) {
            $middleware->handle();
        }

        $dispatcher = $this->createDispatcher();
        $routeInfo = $dispatcher->dispatch($httpMethod, $uri);

        switch ($routeInfo[0]) {
            case Dispatcher::NOT_FOUND:
                $this->sendJsonResponse(['error' => 'Route not found'], 404);
                break;
                
            case Dispatcher::METHOD_NOT_ALLOWED:
                $this->sendJsonResponse(['error' => 'Method not allowed'], 405);
                break;
                
            case Dispatcher::FOUND:
                $handler = $routeInfo[1];
                $vars = $routeInfo[2];
                
                try {
                    $result = $handler($vars);
                    $this->sendJsonResponse($result);
                } catch (\Throwable $e) {
                    $this->logger->error('Request failed', [
                        'error' => $e->getMessage(),
                        'file' => $e->getFile(),
                        'line' => $e->getLine(),
                        'trace' => $e->getTraceAsString()
                    ]);
                    
                    $this->sendJsonResponse([
                        'error' => 'Internal server error',
                        'message' => $_ENV['APP_DEBUG'] ? $e->getMessage() : 'Something went wrong'
                    ], 500);
                }
                break;
        }
    }

    private function createDispatcher(): Dispatcher
    {
        return \FastRoute\simpleDispatcher(function(RouteCollector $r) {
            // Health check
            $r->get('/health', function() {
                $controller = new HealthController();
                return $controller->check();
            });

            // Predictions
            $r->get('/predictions', function() {
                $controller = new PredictionController();
                return $controller->getPredictions();
            });

            // Teams
            $r->get('/teams', function() {
                $controller = new PredictionController();
                return $controller->getTeams();
            });

            // Statistics
            $r->get('/statistics', function() {
                $controller = new PredictionController();
                return $controller->getStatistics();
            });

            // Match data
            $r->get('/matches', function() {
                $controller = new PredictionController();
                return $controller->getMatches();
            });

            // Team details
            $r->get('/teams/{team}', function($vars) {
                $controller = new PredictionController();
                return $controller->getTeamDetails($vars['team']);
            });

            // Algorithms list
            $r->get('/algorithms', function() {
                $controller = new PredictionController();
                return $controller->getAlgorithms();
            });
        });
    }

    private function setupLogger(): void
    {
        $this->logger = new Logger('winmix');
        
        $logFile = $_ENV['LOG_FILE'] ?? 'php://stdout';
        $logLevel = match($_ENV['LOG_LEVEL'] ?? 'info') {
            'debug' => Logger::DEBUG,
            'info' => Logger::INFO,
            'warning' => Logger::WARNING,
            'error' => Logger::ERROR,
            default => Logger::INFO
        };

        $this->logger->pushHandler(new StreamHandler($logFile, $logLevel));
    }

    private function setupMiddleware(): void
    {
        $this->middleware = [
            new CorsMiddleware(),
            new RateLimitMiddleware($this->logger)
        ];
    }

    private function initializeDatabase(): void
    {
        try {
            Database::createTables();
            $this->logger->info('Database initialized successfully');
        } catch (\Throwable $e) {
            $this->logger->error('Database initialization failed', [
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function sendJsonResponse(array $data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=UTF-8');
        
        $response = [
            'success' => $statusCode < 400,
            'timestamp' => date('c'),
            ...$data
        ];

        echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
}