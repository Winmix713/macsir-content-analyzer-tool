<?php

declare(strict_types=1);

namespace WinMix\Tests\Unit;

use PHPUnit\Framework\TestCase;
use WinMix\Service\PredictionService;
use WinMix\Repository\MatchRepository;
use WinMix\Model\Match;
use Mockery;

class PredictionServiceTest extends TestCase
{
    private PredictionService $predictionService;
    private MatchRepository $mockRepository;

    protected function setUp(): void
    {
        parent::setUp();
        
        $this->mockRepository = Mockery::mock(MatchRepository::class);
        $this->predictionService = new PredictionService($this->mockRepository);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function testDefaultPredictionReturnsValidResult(): void
    {
        // Arrange
        $homeTeam = 'arsenal';
        $awayTeam = 'chelsea';
        
        $this->mockRepository
            ->shouldReceive('findByTeams')
            ->once()
            ->andReturn([]);
            
        $this->mockRepository
            ->shouldReceive('calculateTeamStats')
            ->twice()
            ->andReturn([
                'total_matches' => 10,
                'wins' => 6,
                'draws' => 2,
                'losses' => 2,
                'win_rate' => 60.0,
                'avg_goals_for' => 1.8,
                'avg_goals_against' => 1.2,
                'goal_difference' => 0.6
            ]);
            
        $this->mockRepository
            ->shouldReceive('findRecentByTeam')
            ->twice()
            ->andReturn([]);

        // Act
        $result = $this->predictionService->predict($homeTeam, $awayTeam, 'default');

        // Assert
        $this->assertIsArray($result);
        $this->assertArrayHasKey('homeWinProbability', $result);
        $this->assertArrayHasKey('drawProbability', $result);
        $this->assertArrayHasKey('awayWinProbability', $result);
        $this->assertArrayHasKey('expectedGoals', $result);
        $this->assertArrayHasKey('bothTeamsScore', $result);
        $this->assertArrayHasKey('totalGoals', $result);
        $this->assertArrayHasKey('confidence', $result);
        $this->assertArrayHasKey('algorithm', $result);
        
        // Validate probability ranges
        $this->assertGreaterThanOrEqual(0, $result['homeWinProbability']);
        $this->assertLessThanOrEqual(100, $result['homeWinProbability']);
        $this->assertGreaterThanOrEqual(0, $result['drawProbability']);
        $this->assertLessThanOrEqual(100, $result['drawProbability']);
        $this->assertGreaterThanOrEqual(0, $result['awayWinProbability']);
        $this->assertLessThanOrEqual(100, $result['awayWinProbability']);
        
        // Validate expected goals
        $this->assertIsArray($result['expectedGoals']);
        $this->assertArrayHasKey('home', $result['expectedGoals']);
        $this->assertArrayHasKey('away', $result['expectedGoals']);
        $this->assertGreaterThanOrEqual(0, $result['expectedGoals']['home']);
        $this->assertGreaterThanOrEqual(0, $result['expectedGoals']['away']);
        
        // Validate confidence
        $this->assertGreaterThanOrEqual(0, $result['confidence']);
        $this->assertLessThanOrEqual(1, $result['confidence']);
        
        // Validate algorithm name
        $this->assertEquals('Default (Form + H2H)', $result['algorithm']);
    }

    public function testPoissonPredictionReturnsValidResult(): void
    {
        // Arrange
        $homeTeam = 'liverpool';
        $awayTeam = 'manchester-city';
        
        $this->mockRepository
            ->shouldReceive('calculateTeamStats')
            ->twice()
            ->andReturn([
                'total_matches' => 20,
                'wins' => 12,
                'draws' => 4,
                'losses' => 4,
                'win_rate' => 60.0,
                'avg_goals_for' => 2.1,
                'avg_goals_against' => 1.3,
                'goal_difference' => 0.8
            ]);

        // Act
        $result = $this->predictionService->predict($homeTeam, $awayTeam, 'poisson');

        // Assert
        $this->assertIsArray($result);
        $this->assertEquals('Poisson Distribution', $result['algorithm']);
        $this->assertEquals(0.8, $result['confidence']);
        
        // Probabilities should sum to approximately 100%
        $totalProbability = $result['homeWinProbability'] + 
                           $result['drawProbability'] + 
                           $result['awayWinProbability'];
        $this->assertEqualsWithDelta(100, $totalProbability, 1.0);
    }

    public function testInvalidAlgorithmThrowsException(): void
    {
        // Arrange
        $homeTeam = 'arsenal';
        $awayTeam = 'chelsea';
        $invalidAlgorithm = 'invalid_algorithm';

        // Assert
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage("Unknown algorithm: {$invalidAlgorithm}");

        // Act
        $this->predictionService->predict($homeTeam, $awayTeam, $invalidAlgorithm);
    }

    public function testEloRatingCalculation(): void
    {
        // Arrange
        $team = 'manchester-united';
        
        $this->mockRepository
            ->shouldReceive('calculateTeamStats')
            ->once()
            ->andReturn([
                'total_matches' => 15,
                'wins' => 9,
                'draws' => 3,
                'losses' => 3,
                'win_rate' => 60.0,
                'avg_goals_for' => 1.9,
                'avg_goals_against' => 1.4,
                'goal_difference' => 0.5
            ]);

        // Act - Use reflection to test private method
        $reflection = new \ReflectionClass($this->predictionService);
        $method = $reflection->getMethod('calculateEloRating');
        $method->setAccessible(true);
        
        $eloRating = $method->invoke($this->predictionService, $team, null);

        // Assert
        $this->assertIsInt($eloRating);
        $this->assertGreaterThan(1000, $eloRating); // Should be above minimum ELO
        $this->assertLessThan(2500, $eloRating); // Should be below maximum reasonable ELO
    }

    public function testMachineLearningEnsembleCombinesAlgorithms(): void
    {
        // Arrange
        $homeTeam = 'tottenham';
        $awayTeam = 'west-ham';
        
        // Mock all required repository calls for the ensemble
        $this->mockRepository
            ->shouldReceive('findByTeams')
            ->andReturn([]);
            
        $this->mockRepository
            ->shouldReceive('calculateTeamStats')
            ->andReturn([
                'total_matches' => 10,
                'wins' => 5,
                'draws' => 3,
                'losses' => 2,
                'win_rate' => 50.0,
                'avg_goals_for' => 1.5,
                'avg_goals_against' => 1.2,
                'goal_difference' => 0.3
            ]);
            
        $this->mockRepository
            ->shouldReceive('findRecentByTeam')
            ->andReturn([]);

        // Act
        $result = $this->predictionService->predict($homeTeam, $awayTeam, 'machine_learning');

        // Assert
        $this->assertEquals('Machine Learning Ensemble', $result['algorithm']);
        $this->assertEquals(0.85, $result['confidence']); // Higher confidence for ensemble
        
        // Should still return valid prediction structure
        $this->assertArrayHasKey('homeWinProbability', $result);
        $this->assertArrayHasKey('drawProbability', $result);
        $this->assertArrayHasKey('awayWinProbability', $result);
    }
}