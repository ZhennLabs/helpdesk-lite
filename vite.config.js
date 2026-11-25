import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '127.0.0.1',
        port: 5174,
        strictPort: false,
    },
    build: {
        cssCodeSplit: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', '@inertiajs/react'],
                    'vendor-realtime': ['laravel-echo', 'pusher-js'],
                    'vendor-charts': ['chart.js', 'react-chartjs-2'],
                    'vendor-ui': ['@iconify/react', 'sonner', '@headlessui/react'],
                },
            },
        },
    },
});