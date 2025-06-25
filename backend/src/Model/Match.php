<?php

declare(strict_types=1);

namespace WinMix\Model;

use DateTime;

class Match
{
    public function __construct(
        public readonly int $id,
        public readonly string $date,
        public readonly string $homeTeam,
        public readonly string $awayTeam,
        public readonly ?int $homeScore,
        public readonly ?int $awayScore,
        public readonly string $season,
        public readonly string $competition,
        public readonly DateTime $createdAt,
        public readonly DateTime $updatedAt
    ) {}

    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'date' => $this->date,
            'home_team' => $this->homeTeam,
            'away_team' => $this->awayTeam,
            'home_score' => $this->homeScore,
            'away_score' => $this->awayScore,
            'season' => $this->season,
            'competition' => $this->competition,
            'created_at' => $this->createdAt->format('Y-m-d H:i:s'),
            'updated_at' => $this->updatedAt->format('Y-m-d H:i:s')
        ];
    }

    public static function fromArray(array $data): self
    {
        return new self(
            id: (int)$data['id'],
            date: $data['date'],
            homeTeam: $data['home_team'],
            awayTeam: $data['away_team'],
            homeScore: $data['home_score'] !== null ? (int)$data['home_score'] : null,
            awayScore: $data['away_score'] !== null ? (int)$data['away_score'] : null,
            season: $data['season'],
            competition: $data['competition'],
            createdAt: new DateTime($data['created_at']),
            updatedAt: new DateTime($data['updated_at'])
        );
    }

    public function getResult(): string
    {
        if ($this->homeScore === null || $this->awayScore === null) {
            return 'N/A';
        }

        if ($this->homeScore > $this->awayScore) return '1';
        if ($this->homeScore < $this->awayScore) return '2';
        return 'X';
    }

    public function getTotalGoals(): ?int
    {
        if ($this->homeScore === null || $this->awayScore === null) {
            return null;
        }

        return $this->homeScore + $this->awayScore;
    }

    public function bothTeamsScored(): ?bool
    {
        if ($this->homeScore === null || $this->awayScore === null) {
            return null;
        }

        return $this->homeScore > 0 && $this->awayScore > 0;
    }

    public function isOver(float $goalLine): ?bool
    {
        $totalGoals = $this->getTotalGoals();
        
        if ($totalGoals === null) {
            return null;
        }

        return $totalGoals > $goalLine;
    }

    public function getGoalDifference(): ?int
    {
        if ($this->homeScore === null || $this->awayScore === null) {
            return null;
        }

        return abs($this->homeScore - $this->awayScore);
    }

    public function isHighScoring(): ?bool
    {
        $totalGoals = $this->getTotalGoals();
        
        if ($totalGoals === null) {
            return null;
        }

        return $totalGoals >= 4;
    }

    public function getMatchDate(): DateTime
    {
        return new DateTime($this->date);
    }

    public function isRecentMatch(int $days = 30): bool
    {
        $matchDate = $this->getMatchDate();
        $cutoff = new DateTime("-{$days} days");
        
        return $matchDate >= $cutoff;
    }

    public function __toString(): string
    {
        $score = $this->homeScore !== null && $this->awayScore !== null 
            ? " ({$this->homeScore}-{$this->awayScore})" 
            : '';
            
        return "{$this->homeTeam} vs {$this->awayTeam}{$score}";
    }
}