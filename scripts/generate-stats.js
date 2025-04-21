const fs = require('fs');
const path = require('path');

// No need for Octokit, canvas, chart.js if only updating timestamp and inserting static links

async function updateReadme() {
  // Path to README file
  const readmePath = path.join(process.cwd(), 'profile', 'README.md');
  console.log(`Attempting to update README at path: ${readmePath}`); // DEBUG
  
  // Read current README
  let readmeContent = fs.existsSync(readmePath) 
    ? fs.readFileSync(readmePath, 'utf8')
    : `# ${process.env.ORG_NAME || 'GitHub Profile'}\n\nWelcome!\n\n`; // Basic fallback

  const personalUsername = process.env.PERSONAL_USERNAME || 'fabiendostie'; // Use env var or default

  // Define the stats card and language card markdown
  const statsCardMd = `[![Fabien Dostie's GitHub stats](https://github-readme-stats.vercel.app/api?username=${personalUsername}&show_icons=true&theme=tokyonight&include_all_commits=true&count_private=true)](https://github.com/anuraghazra/github-readme-stats)`;
  const langCardMd = `[![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=${personalUsername}&layout=compact&theme=tokyonight&langs_count=10&include_all_commits=true&count_private=true)](https://github.com/anuraghazra/github-readme-stats)`;
  
  // Define placeholders
  const statsStartPlaceholder = '<!--START_STATS_CARD-->';
  const statsEndPlaceholder = '<!--END_STATS_CARD-->';
  const langStartPlaceholder = '<!--START_LANG_CARD-->';
  const langEndPlaceholder = '<!--END_LANG_CARD-->';
  const lastUpdatedPlaceholder = '_Last updated:';
  
  // Replace content between placeholders
  const statsRegex = new RegExp(`${statsStartPlaceholder}[\s\S]*?${statsEndPlaceholder}`);
  const langRegex = new RegExp(`${langStartPlaceholder}[\s\S]*?${langEndPlaceholder}`);
  const lastUpdatedRegex = new RegExp(`${lastUpdatedPlaceholder}.*_`);

  if (readmeContent.match(statsRegex)) {
    readmeContent = readmeContent.replace(statsRegex, `${statsStartPlaceholder}\n${statsCardMd}\n${statsEndPlaceholder}`);
  } else {
    console.warn('Stats card placeholders not found in README.');
  }

  if (readmeContent.match(langRegex)) {
    readmeContent = readmeContent.replace(langRegex, `${langStartPlaceholder}\n${langCardMd}\n${langEndPlaceholder}`);
  } else {
    console.warn('Language card placeholders not found in README.');
  }

  // Update last updated timestamp
  const lastUpdatedText = `${lastUpdatedPlaceholder} ${new Date().toISOString().split('T')[0]}_`;
  if (readmeContent.match(lastUpdatedRegex)) {
      readmeContent = readmeContent.replace(lastUpdatedRegex, lastUpdatedText);
  } else {
      console.warn('Last updated placeholder not found, appending to end.');
      readmeContent += `\n\n${lastUpdatedText}`;
  }

  console.log('--- README content BEFORE write (snippet) ---'); // DEBUG
  console.log(readmeContent.substring(0, 300)); // DEBUG
  console.log('---------------------------------------------'); // DEBUG

  // Write updated README
  try {
    fs.writeFileSync(readmePath, readmeContent.trim() + '\n'); 
    console.log('writeFileSync completed successfully.'); // DEBUG

    // DEBUG: Read the file back immediately after writing
    const contentAfterWrite = fs.readFileSync(readmePath, 'utf8');
    console.log('--- README content AFTER write (read back - snippet) ---'); // DEBUG
    console.log(contentAfterWrite.substring(0, 300)); // DEBUG
    console.log('-----------------------------------------------------'); // DEBUG

  } catch (writeError) {
    console.error(`Error writing file to ${readmePath}:`, writeError); // DEBUG
    throw writeError; // Re-throw error to fail the script
  }

  console.log('README updated successfully with stats cards and timestamp.');
}

async function main() {
  try {
    console.log('Starting README update...');
    await updateReadme();
    console.log('README update process finished successfully!');
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1);
  }
}

main();