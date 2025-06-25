<?php

declare(strict_types=1);

namespace WinMix\Controller;

class HealthController
{
    public function check(): array
    {
        $status = 'ok';
        $checks = [];

        // Database check
        try {
            \WinMix\Config\Database::getConnection()->executeQuery('SELECT 1');
            $checks['database'] = 'ok';
        } catch (\Throwable $e) {
            $checks['database'] = 'error';
            $status = 'error';
        }

        // Memory check
        $memoryUsage = memory_get_usage(true);
        $memoryLimit = ini_get('memory_limit');
        $checks['memory'] = [
            'usage' => $memoryUsage,
            'limit' => $memoryLimit,
            'status' => 'ok'
        ];

        // Disk space check
        $diskFree = disk_free_space('.');
        $checks['disk'] = [
            'free_space' => $diskFree,
            'status' => $diskFree > 100 * 1024 * 1024 ? 'ok' : 'warning' // 100MB threshold
        ];

        return [
            'status' => $status,
            'version' => '2.0.0',
            'timestamp' => date('c'),
            'checks' => $checks,
            'uptime' => $this->getUptime()
        ];
    }

    private function getUptime(): array
    {
        if (function_exists('sys_getloadavg')) {
            $load = sys_getloadavg();
        } else {
            $load = [0, 0, 0];
        }

        return [
            'load_average' => $load,
            'memory_peak' => memory_get_peak_usage(true)
        ];
    }
}