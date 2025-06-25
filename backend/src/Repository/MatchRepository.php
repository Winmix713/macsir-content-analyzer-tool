<?php

declare(strict_types=1);

namespace WinMix\Repository;

use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Exception;
use WinMix\Model\Match;

class MatchRepository
{
    public function __construct(
        private readonly Connection $connection
    ) {}

    /**
     * @return Match[]
     */
    public function findAll(int $limit = 1000, int $offset = 0): array
    {
        try {
            $sql = 'SELECT * FROM matches ORDER BY date DESC LIMIT ? OFFSET ?';
            $result = $this->connection->executeQuery($sql, [$limit, $offset]);
            
            return array_map(
                fn(array $row) => Match::fromArray($row),
                $result->fetchAllAssociative()
            );
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to fetch matches: ' . $e->getMessage(), 0, $e);
        }
    }

    public function findById(int $id): ?Match
    {
        try {
            $sql = 'SELECT * FROM matches WHERE id = ?';
            $result = $this->connection->executeQuery($sql, [$id]);
            $row = $result->fetchAssociative();
            
            return $row ? Match::fromArray($row) : null;
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to fetch match: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @return Match[]
     */
    public function findByTeams(string $homeTeam, string $awayTeam, int $limit = 10): array
    {
        try {
            $sql = '
                SELECT * FROM matches 
                WHERE (home_team = ? AND away_team = ?) 
                   OR (home_team = ? AND away_team = ?)
                ORDER BY date DESC 
                LIMIT ?
            ';
            
            $result = $this->connection->executeQuery(
                $sql, 
                [$homeTeam, $awayTeam, $awayTeam, $homeTeam, $limit]
            );
            
            return array_map(
                fn(array $row) => Match::fromArray($row),
                $result->fetchAllAssociative()
            );
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to fetch team matches: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @return Match[]
     */
    public function findHeadToHead(string $homeTeam, string $awayTeam, int $limit = 10): array
    {
        try {
            $sql = '
                SELECT * FROM matches 
                WHERE home_team = ? AND away_team = ?
                ORDER BY date DESC 
                LIMIT ?
            ';
            
            $result = $this->connection->executeQuery($sql, [$homeTeam, $awayTeam, $limit]);
            
            return array_map(
                fn(array $row) => Match::fromArray($row),
                $result->fetchAllAssociative()
            );
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to fetch H2H matches: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @return Match[]
     */
    public function findRecentByTeam(string $team, int $limit = 5): array
    {
        try {
            $sql = '
                SELECT * FROM matches 
                WHERE home_team = ? OR away_team = ?
                ORDER BY date DESC 
                LIMIT ?
            ';
            
            $result = $this->connection->executeQuery($sql, [$team, $team, $limit]);
            
            return array_map(
                fn(array $row) => Match::fromArray($row),
                $result->fetchAllAssociative()
            );
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to fetch team recent matches: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * @return Match[]
     */
    public function findBySeason(string $season, int $limit = 1000, int $offset = 0): array
    {
        try {
            $sql = 'SELECT * FROM matches WHERE season = ? ORDER BY date DESC LIMIT ? OFFSET ?';
            $result = $this->connection->executeQuery($sql, [$season, $limit, $offset]);
            
            return array_map(
                fn(array $row) => Match::fromArray($row),
                $result->fetchAllAssociative()
            );
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to fetch season matches: ' . $e->getMessage(), 0, $e);
        }
    }

    public function calculateTeamStats(string $team, ?string $season = null): array
    {
        try {
            $whereClause = $season ? 'AND season = ?' : '';
            $params = $season ? [$team, $team, $season] : [$team, $team];
            
            $sql = "
                SELECT 
                    COUNT(*) as total_matches,
                    SUM(CASE 
                        WHEN home_team = ? AND home_score > away_score THEN 1
                        WHEN away_team = ? AND away_score > home_score THEN 1
                        ELSE 0 
                    END) as wins,
                    SUM(CASE 
                        WHEN home_score = away_score THEN 1
                        ELSE 0 
                    END) as draws,
                    AVG(CASE 
                        WHEN home_team = ? THEN home_score
                        WHEN away_team = ? THEN away_score
                        ELSE 0 
                    END) as avg_goals_for,
                    AVG(CASE 
                        WHEN home_team = ? THEN away_score
                        WHEN away_team = ? THEN home_score
                        ELSE 0 
                    END) as avg_goals_against
                FROM matches 
                WHERE (home_team = ? OR away_team = ?) 
                  AND home_score IS NOT NULL 
                  AND away_score IS NOT NULL 
                  {$whereClause}
            ";
            
            $allParams = array_merge([$team, $team, $team, $team, $team, $team, $team, $team], 
                                   $season ? [$season] : []);
            
            $result = $this->connection->executeQuery($sql, $allParams);
            $stats = $result->fetchAssociative();
            
            $totalMatches = (int)$stats['total_matches'];
            $wins = (int)$stats['wins'];
            $draws = (int)$stats['draws'];
            $losses = $totalMatches - $wins - $draws;
            
            return [
                'total_matches' => $totalMatches,
                'wins' => $wins,
                'draws' => $draws,
                'losses' => $losses,
                'win_rate' => $totalMatches > 0 ? round($wins / $totalMatches * 100, 2) : 0,
                'avg_goals_for' => round((float)$stats['avg_goals_for'], 2),
                'avg_goals_against' => round((float)$stats['avg_goals_against'], 2),
                'goal_difference' => round((float)$stats['avg_goals_for'] - (float)$stats['avg_goals_against'], 2)
            ];
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to calculate team stats: ' . $e->getMessage(), 0, $e);
        }
    }

    public function insert(array $matchData): int
    {
        try {
            $this->connection->insert('matches', [
                'date' => $matchData['date'],
                'home_team' => $matchData['home_team'],
                'away_team' => $matchData['away_team'],
                'home_score' => $matchData['home_score'] ?? null,
                'away_score' => $matchData['away_score'] ?? null,
                'season' => $matchData['season'],
                'competition' => $matchData['competition']
            ]);
            
            return (int)$this->connection->lastInsertId();
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to insert match: ' . $e->getMessage(), 0, $e);
        }
    }

    public function update(int $id, array $matchData): bool
    {
        try {
            $affected = $this->connection->update('matches', $matchData, ['id' => $id]);
            return $affected > 0;
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to update match: ' . $e->getMessage(), 0, $e);
        }
    }

    public function delete(int $id): bool
    {
        try {
            $affected = $this->connection->delete('matches', ['id' => $id]);
            return $affected > 0;
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to delete match: ' . $e->getMessage(), 0, $e);
        }
    }

    public function getTotalCount(): int
    {
        try {
            $sql = 'SELECT COUNT(*) FROM matches';
            return (int)$this->connection->executeQuery($sql)->fetchOne();
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to get total count: ' . $e->getMessage(), 0, $e);
        }
    }

    public function getSeasons(): array
    {
        try {
            $sql = 'SELECT DISTINCT season FROM matches ORDER BY season DESC';
            $result = $this->connection->executeQuery($sql);
            
            return array_column($result->fetchAllAssociative(), 'season');
        } catch (Exception $e) {
            throw new \RuntimeException('Failed to get seasons: ' . $e->getMessage(), 0, $e);
        }
    }

    public function importFromJson(string $jsonFile): int
    {
        if (!file_exists($jsonFile)) {
            throw new \InvalidArgumentException("JSON file not found: {$jsonFile}");
        }

        $jsonData = file_get_contents($jsonFile);
        if ($jsonData === false) {
            throw new \RuntimeException("Failed to read JSON file: {$jsonFile}");
        }

        try {
            $data = json_decode($jsonData, true, 512, JSON_THROW_ON_ERROR);
            $matches = $data['matches'] ?? $data;
            
            $imported = 0;
            $this->connection->beginTransaction();
            
            foreach ($matches as $match) {
                // Skip if match already exists
                $existing = $this->connection->executeQuery(
                    'SELECT COUNT(*) FROM matches WHERE date = ? AND home_team = ? AND away_team = ?',
                    [$match['date'], $match['home_team'], $match['away_team']]
                )->fetchOne();
                
                if ($existing > 0) {
                    continue;
                }
                
                $this->insert($match);
                $imported++;
            }
            
            $this->connection->commit();
            return $imported;
            
        } catch (\JsonException $e) {
            $this->connection->rollBack();
            throw new \RuntimeException('Invalid JSON data: ' . $e->getMessage(), 0, $e);
        } catch (Exception $e) {
            $this->connection->rollBack();
            throw new \RuntimeException('Failed to import matches: ' . $e->getMessage(), 0, $e);
        }
    }
}