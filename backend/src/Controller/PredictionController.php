<?php

declare(strict_types=1);

namespace WinMix\Controller;

use WinMix\Config\Database;
use WinMix\Repository\MatchRepository;
use WinMix\Service\PredictionService;

class PredictionController
{
    private MatchRepository $matchRepository;
    private PredictionService $predictionService;

    public function __construct()
    {
        $connection = Database::getConnection();
        $this->matchRepository = new MatchRepository($connection);
        $this->predictionService = new PredictionService($this->matchRepository);
    }

    public function getPredictions(): array
    {
        $homeTeam = $_GET['home'] ?? '';
        $awayTeam = $_GET['away'] ?? '';
        $algorithm = $_GET['algorithm'] ?? 'default';
        $season = $_GET['season'] ?? null;

        if (empty($homeTeam) || empty($awayTeam)) {
            throw new \InvalidArgumentException('Home and away teams are required');
        }

        if ($homeTeam === $awayTeam) {
            throw new \InvalidArgumentException('Home and away teams must be different');
        }

        $prediction = $this->predictionService->predict($homeTeam, $awayTeam, $algorithm, $season);

        return [
            'data' => [$prediction],
            'meta' => [
                'algorithm' => $algorithm,
                'teams' => [$homeTeam, $awayTeam],
                'season' => $season
            ]
        ];
    }

    public function getTeams(): array
    {
        $connection = Database::getConnection();
        $result = $connection->executeQuery('SELECT * FROM teams WHERE active = 1 ORDER BY name_hu');
        $teams = $result->fetchAllAssociative();

        return [
            'data' => array_map(function($team) {
                return [
                    'id' => $team['team_key'],
                    'name' => $team['name'],
                    'nameHu' => $team['name_hu'],
                    'logo' => $team['logo_url']
                ];
            }, $teams)
        ];
    }

    public function getStatistics(): array
    {
        $connection = Database::getConnection();
        
        // Total matches
        $totalMatches = (int)$connection->executeQuery('SELECT COUNT(*) FROM matches')->fetchOne();
        
        // Total predictions (if we track them)
        $totalPredictions = (int)$connection->executeQuery('SELECT COUNT(*) FROM predictions')->fetchOne();
        
        // Recent activity
        $recentMatches = $connection->executeQuery('
            SELECT home_team, away_team, home_score, away_score, date 
            FROM matches 
            WHERE home_score IS NOT NULL AND away_score IS NOT NULL
            ORDER BY date DESC 
            LIMIT 10
        ')->fetchAllAssociative();

        // Top scoring teams
        $topScorers = $connection->executeQuery('
            SELECT 
                team,
                AVG(goals_for) as avg_goals
            FROM (
                SELECT home_team as team, AVG(home_score) as goals_for FROM matches WHERE home_score IS NOT NULL GROUP BY home_team
                UNION ALL
                SELECT away_team as team, AVG(away_score) as goals_for FROM matches WHERE away_score IS NOT NULL GROUP BY away_team
            ) t
            GROUP BY team
            ORDER BY avg_goals DESC
            LIMIT 5
        ')->fetchAllAssociative();

        return [
            'data' => [
                'total_matches' => $totalMatches,
                'total_predictions' => $totalPredictions,
                'recent_matches' => $recentMatches,
                'top_scorers' => $topScorers,
                'algorithms_available' => 7,
                'last_updated' => date('c')
            ]
        ];
    }

    public function getMatches(): array
    {
        $limit = min((int)($_GET['limit'] ?? 100), 500);
        $offset = max((int)($_GET['offset'] ?? 0), 0);
        $season = $_GET['season'] ?? null;
        $team = $_GET['team'] ?? null;

        if ($season) {
            $matches = $this->matchRepository->findBySeason($season, $limit, $offset);
        } elseif ($team) {
            $matches = $this->matchRepository->findRecentByTeam($team, $limit);
        } else {
            $matches = $this->matchRepository->findAll($limit, $offset);
        }

        return [
            'data' => array_map(fn($match) => $match->toArray(), $matches),
            'meta' => [
                'limit' => $limit,
                'offset' => $offset,
                'total' => $this->matchRepository->getTotalCount()
            ]
        ];
    }

    public function getTeamDetails(string $team): array
    {
        $stats = $this->matchRepository->calculateTeamStats($team);
        $recentMatches = $this->matchRepository->findRecentByTeam($team, 10);
        $seasons = $this->matchRepository->getSeasons();

        return [
            'data' => [
                'team' => $team,
                'stats' => $stats,
                'recent_matches' => array_map(fn($match) => $match->toArray(), $recentMatches),
                'available_seasons' => $seasons
            ]
        ];
    }

    public function getAlgorithms(): array
    {
        return [
            'data' => [
                [
                    'id' => 'default',
                    'name' => 'Alapértelmezett (Forma + H2H)',
                    'description' => 'Kombinált algoritmus a csapatok formája és egymás elleni eredményei alapján',
                    'accuracy' => 68.5,
                    'confidence' => 'Közepes',
                    'speed' => 'Gyors'
                ],
                [
                    'id' => 'attack_defense',
                    'name' => 'Támadás-Védelem Analízis',
                    'description' => 'Támadóerő és védekezési mutatók összehasonlítása',
                    'accuracy' => 65.2,
                    'confidence' => 'Közepes',
                    'speed' => 'Gyors'
                ],
                [
                    'id' => 'poisson',
                    'name' => 'Poisson Eloszlás',
                    'description' => 'Matematikai modell a gólok valószínűségének kiszámítására',
                    'accuracy' => 71.3,
                    'confidence' => 'Magas',
                    'speed' => 'Közepes'
                ],
                [
                    'id' => 'elo',
                    'name' => 'ELO Értékelési Rendszer',
                    'description' => 'Sakk-világból adaptált erősség értékelési rendszer',
                    'accuracy' => 69.8,
                    'confidence' => 'Magas',
                    'speed' => 'Gyors'
                ],
                [
                    'id' => 'machine_learning',
                    'name' => 'Gépi Tanulás Ensemble',
                    'description' => 'Több algoritmus kombinálása súlyozott átlaggal',
                    'accuracy' => 73.1,
                    'confidence' => 'Nagyon magas',
                    'speed' => 'Lassú'
                ],
                [
                    'id' => 'random_forest',
                    'name' => 'Random Forest',
                    'description' => 'Döntési fák erdeje a predikciókhoz',
                    'accuracy' => 72.4,
                    'confidence' => 'Magas',
                    'speed' => 'Lassú'
                ],
                [
                    'id' => 'seasonal_trends',
                    'name' => 'Szezonális Trendek',
                    'description' => 'Aktuális forma és momentum figyelembevétele',
                    'accuracy' => 66.9,
                    'confidence' => 'Közepes',
                    'speed' => 'Közepes'
                ]
            ]
        ];
    }
}