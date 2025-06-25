<?php

declare(strict_types=1);

namespace WinMix\Config;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\DriverManager;
use Doctrine\DBAL\Exception;

class Database
{
    private static ?Connection $connection = null;

    public static function getConnection(): Connection
    {
        if (self::$connection === null) {
            self::$connection = self::createConnection();
        }

        return self::$connection;
    }

    private static function createConnection(): Connection
    {
        $connectionParams = [
            'driver' => $_ENV['DB_DRIVER'] ?? 'pdo_sqlite',
            'path' => $_ENV['DB_PATH'] ?? __DIR__ . '/../../data/winmix.db',
            'host' => $_ENV['DB_HOST'] ?? 'localhost',
            'port' => $_ENV['DB_PORT'] ?? 3306,
            'dbname' => $_ENV['DB_NAME'] ?? 'winmix',
            'user' => $_ENV['DB_USER'] ?? 'root',
            'password' => $_ENV['DB_PASSWORD'] ?? '',
            'charset' => 'utf8mb4',
        ];

        try {
            return DriverManager::getConnection($connectionParams);
        } catch (Exception $e) {
            throw new \RuntimeException('Database connection failed: ' . $e->getMessage(), 0, $e);
        }
    }

    public static function createTables(): void
    {
        $connection = self::getConnection();
        $schemaManager = $connection->createSchemaManager();

        // Create matches table
        if (!$schemaManager->tablesExist(['matches'])) {
            $connection->executeStatement('
                CREATE TABLE matches (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date TEXT NOT NULL,
                    home_team TEXT NOT NULL,
                    away_team TEXT NOT NULL,
                    home_score INTEGER,
                    away_score INTEGER,
                    season TEXT NOT NULL,
                    competition TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ');

            // Create indexes
            $connection->executeStatement('CREATE INDEX idx_matches_teams ON matches(home_team, away_team)');
            $connection->executeStatement('CREATE INDEX idx_matches_date ON matches(date)');
            $connection->executeStatement('CREATE INDEX idx_matches_season ON matches(season)');
        }

        // Create predictions table
        if (!$schemaManager->tablesExist(['predictions'])) {
            $connection->executeStatement('
                CREATE TABLE predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    home_team TEXT NOT NULL,
                    away_team TEXT NOT NULL,
                    algorithm TEXT NOT NULL,
                    home_win_probability REAL NOT NULL,
                    draw_probability REAL NOT NULL,
                    away_win_probability REAL NOT NULL,
                    expected_goals_home REAL NOT NULL,
                    expected_goals_away REAL NOT NULL,
                    both_teams_score REAL NOT NULL,
                    over_15_goals REAL NOT NULL,
                    over_25_goals REAL NOT NULL,
                    over_35_goals REAL NOT NULL,
                    confidence REAL NOT NULL,
                    prediction_data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ');

            $connection->executeStatement('CREATE INDEX idx_predictions_teams ON predictions(home_team, away_team)');
            $connection->executeStatement('CREATE INDEX idx_predictions_algorithm ON predictions(algorithm)');
            $connection->executeStatement('CREATE INDEX idx_predictions_created ON predictions(created_at)');
        }

        // Create teams table
        if (!$schemaManager->tablesExist(['teams'])) {
            $connection->executeStatement('
                CREATE TABLE teams (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    team_key TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    name_hu TEXT NOT NULL,
                    logo_url TEXT,
                    active INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ');

            // Insert default teams
            self::insertDefaultTeams($connection);
        }

        // Create cache table
        if (!$schemaManager->tablesExist(['cache'])) {
            $connection->executeStatement('
                CREATE TABLE cache (
                    cache_key TEXT PRIMARY KEY,
                    cache_value TEXT NOT NULL,
                    expires_at DATETIME NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ');

            $connection->executeStatement('CREATE INDEX idx_cache_expires ON cache(expires_at)');
        }
    }

    private static function insertDefaultTeams(Connection $connection): void
    {
        $teams = [
            ['arsenal', 'Arsenal', 'Arsenal'],
            ['aston-villa', 'Aston Villa', 'Aston Villa'],
            ['brighton', 'Brighton & Hove Albion', 'Brighton'],
            ['burnley', 'Burnley', 'Burnley'],
            ['chelsea', 'Chelsea', 'Chelsea'],
            ['crystal-palace', 'Crystal Palace', 'Crystal Palace'],
            ['everton', 'Everton', 'Everton'],
            ['fulham', 'Fulham', 'Fulham'],
            ['liverpool', 'Liverpool', 'Liverpool'],
            ['luton', 'Luton Town', 'Luton'],
            ['manchester-city', 'Manchester City', 'Manchester City'],
            ['manchester-united', 'Manchester United', 'Manchester United'],
            ['newcastle', 'Newcastle United', 'Newcastle'],
            ['nottingham-forest', 'Nottingham Forest', 'Nottingham Forest'],
            ['sheffield-united', 'Sheffield United', 'Sheffield United'],
            ['tottenham', 'Tottenham Hotspur', 'Tottenham'],
            ['west-ham', 'West Ham United', 'West Ham'],
            ['wolves', 'Wolverhampton Wanderers', 'Wolves'],
            ['brentford', 'Brentford', 'Brentford'],
            ['bournemouth', 'AFC Bournemouth', 'Bournemouth']
        ];

        foreach ($teams as [$key, $name, $nameHu]) {
            $connection->insert('teams', [
                'team_key' => $key,
                'name' => $name,
                'name_hu' => $nameHu,
                'active' => 1
            ]);
        }
    }

    public static function closeConnection(): void
    {
        if (self::$connection !== null) {
            self::$connection->close();
            self::$connection = null;
        }
    }
}