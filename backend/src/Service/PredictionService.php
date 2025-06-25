<?php

declare(strict_types=1);

namespace WinMix\Service;

use WinMix\Repository\MatchRepository;
use WinMix\Model\Match;

class PredictionService
{
    public function __construct(
        private readonly MatchRepository $matchRepository
    ) {}

    public function predict(
        string $homeTeam,
        string $awayTeam,
        string $algorithm = 'default',
        ?string $season = null
    ): array {
        return match ($algorithm) {
            'default' => $this->defaultPrediction($homeTeam, $awayTeam, $season),
            'attack_defense' => $this->attackDefensePrediction($homeTeam, $awayTeam, $season),
            'poisson' => $this->poissonPrediction($homeTeam, $awayTeam, $season),
            'elo' => $this->eloPrediction($homeTeam, $awayTeam, $season),
            'machine_learning' => $this->machineLearningPrediction($homeTeam, $awayTeam, $season),
            'random_forest' => $this->randomForestPrediction($homeTeam, $awayTeam, $season),
            'seasonal_trends' => $this->seasonalTrendsPrediction($homeTeam, $awayTeam, $season),
            default => throw new \InvalidArgumentException("Unknown algorithm: {$algorithm}")
        };
    }

    private function defaultPrediction(string $homeTeam, string $awayTeam, ?string $season): array
    {
        // Combine head-to-head and form analysis
        $h2hStats = $this->calculateHeadToHeadStats($homeTeam, $awayTeam);
        $homeForm = $this->calculateTeamForm($homeTeam, $season);
        $awayForm = $this->calculateTeamForm($awayTeam, $season);

        // Home advantage factor
        $homeAdvantage = 0.15;

        // Base probabilities from H2H
        $homeWinProb = ($h2hStats['home_wins'] / max($h2hStats['total_matches'], 1)) * 100;
        $drawProb = ($h2hStats['draws'] / max($h2hStats['total_matches'], 1)) * 100;
        $awayWinProb = ($h2hStats['away_wins'] / max($h2hStats['total_matches'], 1)) * 100;

        // Adjust with form and home advantage
        $formFactor = ($homeForm['form_index'] - $awayForm['form_index']) * 0.1;
        
        $homeWinProb += $formFactor + ($homeAdvantage * 100);
        $awayWinProb -= $formFactor;

        // Normalize probabilities
        $total = $homeWinProb + $drawProb + $awayWinProb;
        if ($total > 0) {
            $homeWinProb = ($homeWinProb / $total) * 100;
            $drawProb = ($drawProb / $total) * 100;
            $awayWinProb = ($awayWinProb / $total) * 100;
        }

        // Expected goals
        $expectedGoalsHome = $homeForm['avg_goals_for'] * (1 + $homeAdvantage);
        $expectedGoalsAway = $awayForm['avg_goals_for'] * (1 - $homeAdvantage * 0.5);

        return [
            'homeWinProbability' => round($homeWinProb, 1),
            'drawProbability' => round($drawProb, 1),
            'awayWinProbability' => round($awayWinProb, 1),
            'expectedGoals' => [
                'home' => round($expectedGoalsHome, 2),
                'away' => round($expectedGoalsAway, 2)
            ],
            'bothTeamsScore' => $this->calculateBothTeamsScoreProb($homeTeam, $awayTeam),
            'totalGoals' => $this->calculateGoalMarkets($expectedGoalsHome + $expectedGoalsAway),
            'confidence' => $this->calculateConfidence($h2hStats['total_matches'], $homeForm, $awayForm),
            'algorithm' => 'Default (Form + H2H)',
            'details' => [
                'h2h_stats' => $h2hStats,
                'home_form' => $homeForm,
                'away_form' => $awayForm
            ]
        ];
    }

    private function attackDefensePrediction(string $homeTeam, string $awayTeam, ?string $season): array
    {
        $homeStats = $this->matchRepository->calculateTeamStats($homeTeam, $season);
        $awayStats = $this->matchRepository->calculateTeamStats($awayTeam, $season);

        // Attack and defense strength
        $homeAttack = $homeStats['avg_goals_for'];
        $homeDefense = $homeStats['avg_goals_against'];
        $awayAttack = $awayStats['avg_goals_for'];
        $awayDefense = $awayStats['avg_goals_against'];

        // Expected goals based on attack vs defense
        $expectedGoalsHome = $homeAttack / max($awayDefense, 0.5) * 1.15; // Home advantage
        $expectedGoalsAway = $awayAttack / max($homeDefense, 0.5);

        // Probabilities based on goal expectation
        $totalExpected = $expectedGoalsHome + $expectedGoalsAway;
        
        if ($expectedGoalsHome > $expectedGoalsAway + 0.5) {
            $homeWinProb = 50 + min(($expectedGoalsHome - $expectedGoalsAway) * 10, 35);
            $awayWinProb = 50 - min(($expectedGoalsHome - $expectedGoalsAway) * 8, 30);
        } elseif ($expectedGoalsAway > $expectedGoalsHome + 0.5) {
            $awayWinProb = 50 + min(($expectedGoalsAway - $expectedGoalsHome) * 10, 35);
            $homeWinProb = 50 - min(($expectedGoalsAway - $expectedGoalsHome) * 8, 30);
        } else {
            $homeWinProb = 35;
            $awayWinProb = 35;
        }
        
        $drawProb = 100 - $homeWinProb - $awayWinProb;

        return [
            'homeWinProbability' => round($homeWinProb, 1),
            'drawProbability' => round(max($drawProb, 15), 1),
            'awayWinProbability' => round($awayWinProb, 1),
            'expectedGoals' => [
                'home' => round($expectedGoalsHome, 2),
                'away' => round($expectedGoalsAway, 2)
            ],
            'bothTeamsScore' => $this->calculateBTTSFromExpectedGoals($expectedGoalsHome, $expectedGoalsAway),
            'totalGoals' => $this->calculateGoalMarkets($totalExpected),
            'confidence' => $this->calculateConfidenceFromStats($homeStats, $awayStats),
            'algorithm' => 'Attack-Defense Analysis'
        ];
    }

    private function poissonPrediction(string $homeTeam, string $awayTeam, ?string $season): array
    {
        $homeStats = $this->matchRepository->calculateTeamStats($homeTeam, $season);
        $awayStats = $this->matchRepository->calculateTeamStats($awayTeam, $season);

        $homeExpected = $homeStats['avg_goals_for'] * 1.1; // Home advantage
        $awayExpected = $awayStats['avg_goals_for'];

        // Poisson probabilities for different scorelines
        $probabilities = [];
        $homeWinProb = 0;
        $drawProb = 0;
        $awayWinProb = 0;

        for ($homeGoals = 0; $homeGoals <= 5; $homeGoals++) {
            for ($awayGoals = 0; $awayGoals <= 5; $awayGoals++) {
                $homeProb = $this->poissonProbability($homeGoals, $homeExpected);
                $awayProb = $this->poissonProbability($awayGoals, $awayExpected);
                $jointProb = $homeProb * $awayProb;

                $probabilities["{$homeGoals}-{$awayGoals}"] = $jointProb;

                if ($homeGoals > $awayGoals) {
                    $homeWinProb += $jointProb;
                } elseif ($homeGoals < $awayGoals) {
                    $awayWinProb += $jointProb;
                } else {
                    $drawProb += $jointProb;
                }
            }
        }

        return [
            'homeWinProbability' => round($homeWinProb * 100, 1),
            'drawProbability' => round($drawProb * 100, 1),
            'awayWinProbability' => round($awayWinProb * 100, 1),
            'expectedGoals' => [
                'home' => round($homeExpected, 2),
                'away' => round($awayExpected, 2)
            ],
            'bothTeamsScore' => $this->calculateBTTSFromPoisson($probabilities),
            'totalGoals' => $this->calculateGoalMarketsFromPoisson($probabilities),
            'confidence' => 0.8, // Poisson is mathematically reliable
            'algorithm' => 'Poisson Distribution'
        ];
    }

    private function eloPrediction(string $homeTeam, string $awayTeam, ?string $season): array
    {
        $homeElo = $this->calculateEloRating($homeTeam, $season);
        $awayElo = $this->calculateEloRating($awayTeam, $season);

        $eloDiff = $homeElo - $awayElo;
        
        // Convert ELO difference to win probability
        $homeExpected = 1 / (1 + pow(10, -$eloDiff / 400));
        $awayExpected = 1 - $homeExpected;

        // Adjust for draws in football
        $homeWinProb = $homeExpected * 85; // 85% of expected goes to win
        $awayWinProb = $awayExpected * 85;
        $drawProb = 100 - $homeWinProb - $awayWinProb;

        // Expected goals based on ELO strength
        $avgGoals = 2.5;
        $strengthFactor = $eloDiff / 200;
        $expectedGoalsHome = $avgGoals * (0.6 + $strengthFactor * 0.1);
        $expectedGoalsAway = $avgGoals * (0.4 - $strengthFactor * 0.1);

        return [
            'homeWinProbability' => round($homeWinProb, 1),
            'drawProbability' => round($drawProb, 1),
            'awayWinProbability' => round($awayWinProb, 1),
            'expectedGoals' => [
                'home' => round($expectedGoalsHome, 2),
                'away' => round($expectedGoalsAway, 2)
            ],
            'bothTeamsScore' => $this->calculateBTTSFromExpectedGoals($expectedGoalsHome, $expectedGoalsAway),
            'totalGoals' => $this->calculateGoalMarkets($expectedGoalsHome + $expectedGoalsAway),
            'confidence' => 0.75,
            'algorithm' => 'ELO Rating System',
            'details' => [
                'home_elo' => $homeElo,
                'away_elo' => $awayElo,
                'elo_difference' => $eloDiff
            ]
        ];
    }

    private function machineLearningPrediction(string $homeTeam, string $awayTeam, ?string $season): array
    {
        // Ensemble of multiple algorithms
        $algorithms = ['default', 'attack_defense', 'poisson', 'elo'];
        $predictions = [];

        foreach ($algorithms as $algo) {
            if ($algo !== 'machine_learning') {
                $predictions[] = $this->predict($homeTeam, $awayTeam, $algo, $season);
            }
        }

        // Weighted average (can be improved with actual ML model)
        $weights = [0.3, 0.25, 0.25, 0.2]; // Default gets higher weight
        
        $homeWinProb = $drawProb = $awayWinProb = 0;
        $expectedGoalsHome = $expectedGoalsAway = 0;
        $bttsProb = 0;

        foreach ($predictions as $i => $pred) {
            $weight = $weights[$i];
            $homeWinProb += $pred['homeWinProbability'] * $weight;
            $drawProb += $pred['drawProbability'] * $weight;
            $awayWinProb += $pred['awayWinProbability'] * $weight;
            $expectedGoalsHome += $pred['expectedGoals']['home'] * $weight;
            $expectedGoalsAway += $pred['expectedGoals']['away'] * $weight;
            $bttsProb += $pred['bothTeamsScore'] * $weight;
        }

        return [
            'homeWinProbability' => round($homeWinProb, 1),
            'drawProbability' => round($drawProb, 1),
            'awayWinProbability' => round($awayWinProb, 1),
            'expectedGoals' => [
                'home' => round($expectedGoalsHome, 2),
                'away' => round($expectedGoalsAway, 2)
            ],
            'bothTeamsScore' => round($bttsProb, 1),
            'totalGoals' => $this->calculateGoalMarkets($expectedGoalsHome + $expectedGoalsAway),
            'confidence' => 0.85, // Ensemble typically more reliable
            'algorithm' => 'Machine Learning Ensemble'
        ];
    }

    private function randomForestPrediction(string $homeTeam, string $awayTeam, ?string $season): array
    {
        // Simplified Random Forest simulation
        // In production, this would use actual Random Forest model
        $features = $this->extractFeatures($homeTeam, $awayTeam, $season);
        
        // Simulate multiple decision trees
        $trees = 100;
        $homeWins = $draws = $awayWins = 0;
        
        for ($i = 0; $i < $trees; $i++) {
            $prediction = $this->simulateDecisionTree($features);
            match ($prediction) {
                '1' => $homeWins++,
                'X' => $draws++,
                '2' => $awayWins++
            };
        }

        $homeWinProb = ($homeWins / $trees) * 100;
        $drawProb = ($draws / $trees) * 100;
        $awayWinProb = ($awayWins / $trees) * 100;

        // Expected goals from features
        $expectedGoalsHome = $features['home_attack'] * (1 - $features['away_defense_strength']);
        $expectedGoalsAway = $features['away_attack'] * (1 - $features['home_defense_strength']);

        return [
            'homeWinProbability' => round($homeWinProb, 1),
            'drawProbability' => round($drawProb, 1),
            'awayWinProbability' => round($awayWinProb, 1),
            'expectedGoals' => [
                'home' => round($expectedGoalsHome, 2),
                'away' => round($expectedGoalsAway, 2)
            ],
            'bothTeamsScore' => $this->calculateBTTSFromExpectedGoals($expectedGoalsHome, $expectedGoalsAway),
            'totalGoals' => $this->calculateGoalMarkets($expectedGoalsHome + $expectedGoalsAway),
            'confidence' => 0.82,
            'algorithm' => 'Random Forest'
        ];
    }

    private function seasonalTrendsPrediction(string $homeTeam, string $awayTeam, ?string $season): array
    {
        $homeForm = $this->calculateTeamForm($homeTeam, $season, 10); // Last 10 matches
        $awayForm = $this->calculateTeamForm($awayTeam, $season, 10);
        
        // Seasonal performance trends
        $homeRecent = $this->matchRepository->findRecentByTeam($homeTeam, 5);
        $awayRecent = $this->matchRepository->findRecentByTeam($awayTeam, 5);

        $homeMomentum = $this->calculateMomentum($homeRecent, $homeTeam);
        $awayMomentum = $this->calculateMomentum($awayRecent, $awayTeam);

        // Adjust probabilities based on recent form and momentum
        $baseProbabilities = $this->defaultPrediction($homeTeam, $awayTeam, $season);
        
        $momentumDiff = $homeMomentum - $awayMomentum;
        $adjustment = $momentumDiff * 5; // 5% per momentum point

        $homeWinProb = max(5, min(85, $baseProbabilities['homeWinProbability'] + $adjustment));
        $awayWinProb = max(5, min(85, $baseProbabilities['awayWinProbability'] - $adjustment));
        $drawProb = 100 - $homeWinProb - $awayWinProb;

        return [
            'homeWinProbability' => round($homeWinProb, 1),
            'drawProbability' => round($drawProb, 1),
            'awayWinProbability' => round($awayWinProb, 1),
            'expectedGoals' => $baseProbabilities['expectedGoals'],
            'bothTeamsScore' => $this->calculateBothTeamsScoreProb($homeTeam, $awayTeam),
            'totalGoals' => $baseProbabilities['totalGoals'],
            'confidence' => 0.7,
            'algorithm' => 'Seasonal Trends',
            'details' => [
                'home_momentum' => $homeMomentum,
                'away_momentum' => $awayMomentum,
                'momentum_difference' => $momentumDiff
            ]
        ];
    }

    // Helper methods
    private function calculateHeadToHeadStats(string $homeTeam, string $awayTeam): array
    {
        $matches = $this->matchRepository->findByTeams($homeTeam, $awayTeam, 20);
        
        $homeWins = $draws = $awayWins = 0;
        $homeGoals = $awayGoals = 0;
        $btts = 0;

        foreach ($matches as $match) {
            if ($match->homeScore === null || $match->awayScore === null) continue;

            $totalMatches = count($matches);
            
            if ($match->homeTeam === $homeTeam) {
                if ($match->homeScore > $match->awayScore) $homeWins++;
                elseif ($match->homeScore < $match->awayScore) $awayWins++;
                else $draws++;
                
                $homeGoals += $match->homeScore;
                $awayGoals += $match->awayScore;
            } else {
                if ($match->awayScore > $match->homeScore) $homeWins++;
                elseif ($match->awayScore < $match->homeScore) $awayWins++;
                else $draws++;
                
                $homeGoals += $match->awayScore;
                $awayGoals += $match->homeScore;
            }

            if ($match->bothTeamsScored()) $btts++;
        }

        $totalMatches = $homeWins + $draws + $awayWins;

        return [
            'total_matches' => $totalMatches,
            'home_wins' => $homeWins,
            'draws' => $draws,
            'away_wins' => $awayWins,
            'avg_goals_home' => $totalMatches > 0 ? round($homeGoals / $totalMatches, 2) : 0,
            'avg_goals_away' => $totalMatches > 0 ? round($awayGoals / $totalMatches, 2) : 0,
            'btts_percentage' => $totalMatches > 0 ? round($btts / $totalMatches * 100, 1) : 0
        ];
    }

    private function calculateTeamForm(string $team, ?string $season, int $matches = 5): array
    {
        $recentMatches = $this->matchRepository->findRecentByTeam($team, $matches);
        
        $wins = $draws = $losses = 0;
        $goalsFor = $goalsAgainst = 0;
        $points = 0;

        foreach ($recentMatches as $match) {
            if ($match->homeScore === null || $match->awayScore === null) continue;

            $isHome = $match->homeTeam === $team;
            $teamGoals = $isHome ? $match->homeScore : $match->awayScore;
            $opponentGoals = $isHome ? $match->awayScore : $match->homeScore;

            $goalsFor += $teamGoals;
            $goalsAgainst += $opponentGoals;

            if ($teamGoals > $opponentGoals) {
                $wins++;
                $points += 3;
            } elseif ($teamGoals < $opponentGoals) {
                $losses++;
            } else {
                $draws++;
                $points += 1;
            }
        }

        $totalMatches = $wins + $draws + $losses;
        $formIndex = $totalMatches > 0 ? $points / ($totalMatches * 3) : 0.5;

        return [
            'total_matches' => $totalMatches,
            'wins' => $wins,
            'draws' => $draws,
            'losses' => $losses,
            'points' => $points,
            'form_index' => $formIndex,
            'avg_goals_for' => $totalMatches > 0 ? $goalsFor / $totalMatches : 1.0,
            'avg_goals_against' => $totalMatches > 0 ? $goalsAgainst / $totalMatches : 1.0
        ];
    }

    private function calculateBothTeamsScoreProb(string $homeTeam, string $awayTeam): float
    {
        $homeMatches = $this->matchRepository->findRecentByTeam($homeTeam, 10);
        $awayMatches = $this->matchRepository->findRecentByTeam($awayTeam, 10);
        
        $homeScoreRate = $this->calculateScoringRate($homeMatches, $homeTeam);
        $awayScoreRate = $this->calculateScoringRate($awayMatches, $awayTeam);
        
        // Probability both teams score
        return round($homeScoreRate * $awayScoreRate * 100, 1);
    }

    private function calculateScoringRate(array $matches, string $team): float
    {
        $scored = 0;
        $total = 0;

        foreach ($matches as $match) {
            if ($match->homeScore === null || $match->awayScore === null) continue;
            
            $teamScore = $match->homeTeam === $team ? $match->homeScore : $match->awayScore;
            if ($teamScore > 0) $scored++;
            $total++;
        }

        return $total > 0 ? $scored / $total : 0.7; // Default 70%
    }

    private function calculateGoalMarkets(float $expectedTotal): array
    {
        // Over/Under calculations based on Poisson distribution
        return [
            'over15' => round(min(95, max(5, (1 - exp(-$expectedTotal * 0.8)) * 100)), 1),
            'over25' => round(min(90, max(10, (1 - exp(-$expectedTotal * 0.6)) * 100)), 1),
            'over35' => round(min(85, max(15, (1 - exp(-$expectedTotal * 0.4)) * 100)), 1)
        ];
    }

    private function calculateConfidence(int $h2hMatches, array $homeForm, array $awayForm): float
    {
        $dataQuality = min($h2hMatches / 10, 1.0); // More H2H matches = better
        $formConsistency = 1 - abs($homeForm['form_index'] - $awayForm['form_index']);
        
        return round(($dataQuality * 0.6 + $formConsistency * 0.4), 2);
    }

    private function poissonProbability(int $goals, float $expected): float
    {
        return (pow($expected, $goals) * exp(-$expected)) / $this->factorial($goals);
    }

    private function factorial(int $n): int
    {
        return $n <= 1 ? 1 : $n * $this->factorial($n - 1);
    }

    private function calculateEloRating(string $team, ?string $season): int
    {
        // Simplified ELO calculation - in production would maintain actual ELO ratings
        $stats = $this->matchRepository->calculateTeamStats($team, $season);
        
        $baseElo = 1500;
        $winBonus = $stats['wins'] * 15;
        $lossPoint = $stats['losses'] * 10;
        $goalDiff = $stats['goal_difference'] * 5;
        
        return $baseElo + $winBonus - $lossPoint + (int)$goalDiff;
    }

    private function extractFeatures(string $homeTeam, string $awayTeam, ?string $season): array
    {
        $homeStats = $this->matchRepository->calculateTeamStats($homeTeam, $season);
        $awayStats = $this->matchRepository->calculateTeamStats($awayTeam, $season);

        return [
            'home_attack' => $homeStats['avg_goals_for'],
            'home_defense_strength' => 1 / max($homeStats['avg_goals_against'], 0.5),
            'away_attack' => $awayStats['avg_goals_for'],
            'away_defense_strength' => 1 / max($awayStats['avg_goals_against'], 0.5),
            'home_win_rate' => $homeStats['win_rate'] / 100,
            'away_win_rate' => $awayStats['win_rate'] / 100
        ];
    }

    private function simulateDecisionTree(array $features): string
    {
        // Simplified decision tree simulation
        if ($features['home_attack'] > $features['away_defense_strength'] + 0.3) {
            return '1'; // Home win
        } elseif ($features['away_attack'] > $features['home_defense_strength'] + 0.3) {
            return '2'; // Away win
        } elseif (abs($features['home_win_rate'] - $features['away_win_rate']) < 0.1) {
            return 'X'; // Draw
        } else {
            return $features['home_win_rate'] > $features['away_win_rate'] ? '1' : '2';
        }
    }

    private function calculateMomentum(array $matches, string $team): float
    {
        $momentum = 0;
        $weight = 1.0;

        foreach (array_reverse($matches) as $match) {
            if ($match->homeScore === null || $match->awayScore === null) continue;

            $isHome = $match->homeTeam === $team;
            $teamGoals = $isHome ? $match->homeScore : $match->awayScore;
            $opponentGoals = $isHome ? $match->awayScore : $match->homeScore;

            if ($teamGoals > $opponentGoals) {
                $momentum += 3 * $weight; // Win
            } elseif ($teamGoals === $opponentGoals) {
                $momentum += 1 * $weight; // Draw
            }
            // Loss adds 0

            $weight *= 0.8; // Decay older matches
        }

        return $momentum;
    }

    private function calculateBTTSFromExpectedGoals(float $homeExpected, float $awayExpected): float
    {
        // Probability both teams score based on expected goals
        $homeScoreProb = 1 - exp(-$homeExpected);
        $awayScoreProb = 1 - exp(-$awayExpected);
        
        return round($homeScoreProb * $awayScoreProb * 100, 1);
    }

    private function calculateBTTSFromPoisson(array $probabilities): float
    {
        $bttsProb = 0;
        
        foreach ($probabilities as $scoreline => $prob) {
            [$homeGoals, $awayGoals] = explode('-', $scoreline);
            if ((int)$homeGoals > 0 && (int)$awayGoals > 0) {
                $bttsProb += $prob;
            }
        }
        
        return round($bttsProb * 100, 1);
    }

    private function calculateGoalMarketsFromPoisson(array $probabilities): array
    {
        $over15 = $over25 = $over35 = 0;
        
        foreach ($probabilities as $scoreline => $prob) {
            [$homeGoals, $awayGoals] = explode('-', $scoreline);
            $totalGoals = (int)$homeGoals + (int)$awayGoals;
            
            if ($totalGoals > 1.5) $over15 += $prob;
            if ($totalGoals > 2.5) $over25 += $prob;
            if ($totalGoals > 3.5) $over35 += $prob;
        }
        
        return [
            'over15' => round($over15 * 100, 1),
            'over25' => round($over25 * 100, 1),
            'over35' => round($over35 * 100, 1)
        ];
    }

    private function calculateConfidenceFromStats(array $homeStats, array $awayStats): float
    {
        $homeGames = $homeStats['total_matches'];
        $awayGames = $awayStats['total_matches'];
        
        // More games = higher confidence
        $sampleSize = min(($homeGames + $awayGames) / 40, 1.0);
        
        return round(0.6 + $sampleSize * 0.3, 2);
    }
}