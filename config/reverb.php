<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Reverb Server
    |--------------------------------------------------------------------------
    |
    | This option controls the default server used by Reverb to process incoming
    | messages and broadcast them to connected clients. You may configure multiple
    | servers if needed.
    |
    */

    'default' => env('REVERB_SERVER', 'reverb'),

    /*
    |--------------------------------------------------------------------------
    | Reverb Servers
    |--------------------------------------------------------------------------
    |
    | Here you may define each of the Reverb servers used by your application.
    | Each server definition includes configuration for app credentials, allowed
    | origins, scaling options, and SSL certificates.
    |
    */

    'servers' => [

        'reverb' => [
            'host' => env('REVERB_SERVER_HOST', '0.0.0.0'),
            'port' => env('REVERB_SERVER_PORT', 8082),
            'hostname' => env('REVERB_HOST'),
            'options' => [
                'tls' => [],
            ],
            'max_request_size' => env('REVERB_MAX_REQUEST_SIZE', 10_000),
            'pulse_ingest_interval' => env('REVERB_PULSE_INGEST_INTERVAL', 15),
            'telescope_ingest_interval' => env('REVERB_TELESCOPE_INGEST_INTERVAL', 15),
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL'),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => env('REDIS_PORT', '6379'),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => env('REDIS_DB', '0'),
                ],
            ],
            'apps' => [
                [
                    'key' => env('REVERB_APP_KEY', 'helpdesk-lite-key'),
                    'secret' => env('REVERB_APP_SECRET', 'helpdesk-lite-secret'),
                    'app_id' => env('REVERB_APP_ID', 'helpdesk-lite-app'),
                    'options' => [
                        'host' => env('REVERB_HOST'),
                        'port' => env('REVERB_PORT', 8082),
                        'scheme' => env('REVERB_SCHEME', 'http'),
                        'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
                    ],
                    'allowed_origins' => ['*'],
                    'ping_interval' => env('REVERB_APP_PING_INTERVAL', 60),
                    'max_message_size' => env('REVERB_APP_MAX_MESSAGE_SIZE', 10_000),
                ],
            ],
        ],

    ],

];
