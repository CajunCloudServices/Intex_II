module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/impact',
        'http://localhost:4173/donate',
        'http://localhost:4173/login',
      ],
      // Let LHCI manage server startup — avoids flaky port/process race conditions.
      // npm run preview serves on 4173 by default (not 5173, which is the dev server).
      startServerCommand: 'npm run preview -- --port 4173',
      startServerReadyPattern: 'Local:',
      numberOfRuns: 2,
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: 'docs/lighthouse',
    },
  },
};
