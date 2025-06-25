#!/usr/bin/env php
<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use WinMix\Config\Database;
use WinMix\Repository\MatchRepository;

// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->safeLoad();

echo "WinMix Database Migration Tool\n";
echo "==============================\n\n";

try {
    // Initialize database and create tables
    echo "Creating database tables...\n";
    Database::createTables();
    echo "✅ Database tables created successfully.\n\n";

    // Check if we should import data
    if (isset($argv[1]) && $argv[1] === '--import-json') {
        $jsonFile = $argv[2] ?? __DIR__ . '/../../combined_matches.json';
        
        if (file_exists($jsonFile)) {
            echo "Importing data from {$jsonFile}...\n";
            
            $connection = Database::getConnection();
            $matchRepository = new MatchRepository($connection);
            
            $imported = $matchRepository->importFromJson($jsonFile);
            echo "✅ Imported {$imported} matches successfully.\n\n";
        } else {
            echo "⚠️  JSON file not found: {$jsonFile}\n";
            echo "Skipping data import.\n\n";
        }
    }

    // Show database status
    $connection = Database::getConnection();
    $matchCount = $connection->executeQuery('SELECT COUNT(*) FROM matches')->fetchOne();
    $teamCount = $connection->executeQuery('SELECT COUNT(*) FROM teams')->fetchOne();
    
    echo "Database Status:\n";
    echo "- Matches: {$matchCount}\n";
    echo "- Teams: {$teamCount}\n";
    echo "\n✅ Migration completed successfully!\n";

} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\nUsage:\n";
echo "  php bin/migrate.php                    # Create tables only\n";
echo "  php bin/migrate.php --import-json      # Create tables and import from default JSON\n";
echo "  php bin/migrate.php --import-json /path/to/data.json  # Import from specific file\n";