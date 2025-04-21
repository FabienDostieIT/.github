const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const Chart = require('chart.js/auto');

// Initialize Octokit with GitHub token
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

// Create assets directory if it doesn't exist
const assetsDir = path.join(process.cwd(), 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

async function fetchPersonalStats() {
  const username = process.env.PERSONAL_USERNAME;
  console.log(`Fetching stats for personal account: ${username}`);
  
  // Get user's public repositories
  const { data: repos } = await octokit.repos.listForUser({
    username,
    per_page: 100,
  });
  
  // Count stars, forks, and contributions
  const stats = {
    repoCount: repos.length,
    stars: repos.reduce((total, repo) => total + repo.stargazers_count, 0),
    forks: repos.reduce((total, repo) => total + repo.forks_count, 0),
    languages: {},
  };
  
  // Get language data for each repo
  for (const repo of repos) {
    if (!repo.fork) {
      try {
        const { data: languages } = await octokit.repos.listLanguages({
          owner: username,
          repo: repo.name,
        });
        
        for (const [language, bytes] of Object.entries(languages)) {
          stats.languages[language] = (stats.languages[language] || 0) + bytes;
        }
      } catch (error) {
        console.error(`Error fetching languages for ${repo.name}:`, error);
      }
    }
  }
  
  return stats;
}

async function fetchOrganizationStats() {
  const orgName = process.env.ORG_NAME;
  console.log(`Fetching stats for organization: ${orgName}`);
  
  // Get organization's public repositories
  const { data: repos } = await octokit.repos.listForOrg({
    org: orgName,
    per_page: 100,
  });
  
  // Count stars, forks, and contributions
  const stats = {
    repoCount: repos.length,
    stars: repos.reduce((total, repo) => total + repo.stargazers_count, 0),
    forks: repos.reduce((total, repo) => total + repo.forks_count, 0),
    languages: {},
  };
  
  // Get language data for each repo
  for (const repo of repos) {
    try {
      const { data: languages } = await octokit.repos.listLanguages({
        owner: orgName,
        repo: repo.name,
      });
      
      for (const [language, bytes] of Object.entries(languages)) {
        stats.languages[language] = (stats.languages[language] || 0) + bytes;
      }
    } catch (error) {
      console.error(`Error fetching languages for ${repo.name}:`, error);
    }
  }
  
  return stats;
}

async function generateLanguageChart(personalStats, orgStats) {
  // Combine language data
  const combinedLanguages = {};
  
  for (const [language, bytes] of Object.entries(personalStats.languages)) {
    combinedLanguages[language] = (combinedLanguages[language] || 0) + bytes;
  }
  
  for (const [language, bytes] of Object.entries(orgStats.languages)) {
    combinedLanguages[language] = (combinedLanguages[language] || 0) + bytes;
  }
  
  // Sort languages by bytes
  const sortedLanguages = Object.entries(combinedLanguages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8); // Take top 8 languages
  
  // Prepare data for chart
  const labels = sortedLanguages.map(([language]) => language);
  const data = sortedLanguages.map(([, bytes]) => bytes);
  
  // Create a canvas
  const canvas = createCanvas(800, 400);
  const ctx = canvas.getContext('2d');
  
  // Generate chart
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0',
          '#9966ff', '#ff9f40', '#c9cbcf', '#7fc97f'
        ],
        borderWidth: 0
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Top Languages by Repo',
          color: 'white',
          font: {
            size: 18
          }
        },
        legend: {
          labels: {
            color: 'white'
          }
        }
      }
    }
  });
  
  // Save chart to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(assetsDir, 'language-chart.png'), buffer);
  
  return {
    languages: sortedLanguages.reduce((obj, [lang, bytes]) => {
      obj[lang] = bytes;
      return obj;
    }, {})
  };
}

async function generateStatsTable(personalStats, orgStats) {
  // Combine stats
  const combined = {
    repoCount: personalStats.repoCount + orgStats.repoCount,
    stars: personalStats.stars + orgStats.stars,
    forks: personalStats.forks + orgStats.forks
  };
  
  // Create comparison table for README
  return `
| Stat | Personal | Organization | Combined |
|------|----------|--------------|----------|
| Repositories | ${personalStats.repoCount} | ${orgStats.repoCount} | ${combined.repoCount} |
| Stars | ${personalStats.stars} | ${orgStats.stars} | ${combined.stars} |
| Forks | ${personalStats.forks} | ${orgStats.forks} | ${combined.forks} |
`;
}

async function updateReadme(statsTable, languageData) {
  // Path to README file
  const readmePath = path.join(process.cwd(), 'profile', 'README.md');
  
  // Read current README
  let readmeContent = fs.existsSync(readmePath) 
    ? fs.readFileSync(readmePath, 'utf8')
    : `# ${process.env.ORG_NAME}\n\nWelcome to our organization GitHub page!\n\n`;
  
  // Format language data for README
  const totalBytes = Object.values(languageData.languages).reduce((a, b) => a + b, 0);
  const languagePercentages = Object.entries(languageData.languages)
    .map(([language, bytes]) => {
      const percentage = ((bytes / totalBytes) * 100).toFixed(1);
      return `${language}: ${percentage}%`;
    })
    .join(' | ');
  
  // Update README content
  const newReadmeContent = `# ${process.env.ORG_NAME}

Welcome to our organization GitHub page! Here you'll find our combined stats from personal and organization repositories.

## Combined GitHub Stats
${statsTable}

## Top Languages
${languagePercentages}

<div align="center">
  <img src="https://github.com/${process.env.ORG_NAME}/.github/raw/main/assets/language-chart.png" alt="Top Languages" width="500">
</div>

_Last updated: ${new Date().toISOString().split('T')[0]}_
`;
  
  // Write updated README
  fs.writeFileSync(readmePath, newReadmeContent);
  console.log('README updated successfully');
}

async function main() {
  try {
    console.log('Starting to generate combined GitHub stats...');
    
    // Fetch stats
    const personalStats = await fetchPersonalStats();
    const orgStats = await fetchOrganizationStats();
    
    // Generate language chart
    const languageData = await generateLanguageChart(personalStats, orgStats);
    
    // Generate stats table
    const statsTable = await generateStatsTable(personalStats, orgStats);
    
    // Update README
    await updateReadme(statsTable, languageData);
    
    console.log('Combined GitHub stats generated successfully!');
  } catch (error) {
    console.error('Error generating combined GitHub stats:', error);
    process.exit(1);
  }
}

main();