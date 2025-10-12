#!/usr/bin/env node

import { createInterface } from 'readline';
import { spawn } from 'child_process';

const envApiKey = process.env.MAXCLICKS_API_KEY;

if (envApiKey) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 Maxclicks MCP Inspector                                   ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  Using API key from environment variable                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('\n🚀 Starting MCP Inspector...\n');

    startInspector(envApiKey);
} else {
    // Prompt for API key
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🔍 Maxclicks MCP Inspector                                   ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log('║  This will start the MCP Inspector for testing your server    ║');
    console.log('║                                                               ║');
    console.log('║  Get your API key from:                                       ║');
    console.log('║    https://app.maxclicks.ai/settings/developers               ║');
    console.log('║                                                               ║');
    console.log('║  Tip: You can also set MAXCLICKS_API_KEY env variable         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');

    rl.question('Enter your Maxclicks API Key: ', (apiKey) => {
        rl.close();

        if (!apiKey || apiKey.trim() === '') {
            console.error('\n❌ Error: API key is required');
            process.exit(1);
        }

        console.log('\n🚀 Starting MCP Inspector...\n');
        startInspector(apiKey.trim());
    });
}

function startInspector(apiKey) {
    // Start the inspector with the provided API key
    const inspector = spawn(
        'npx',
        [
            '@modelcontextprotocol/inspector',
            'node',
            'build/index.js',
            '--key',
            apiKey,
        ],
        {
            stdio: 'inherit',
            shell: true,
        }
    );

    inspector.on('error', (error) => {
        console.error('❌ Failed to start inspector:', error);
        process.exit(1);
    });

    inspector.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.log(`\n⚠️  Inspector exited with code ${code}`);
        }
        process.exit(code || 0);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n\n👋 Stopping inspector...');
        inspector.kill('SIGINT');
    });
}
