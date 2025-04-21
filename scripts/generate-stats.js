const fs = require('fs');
const path = require('path');

// No need for Octokit, canvas, chart.js if only updating timestamp and inserting static links

async function updateReadme() {
  const readmePath = path.join(process.cwd(), 'profile', 'README.md');
  console.log(`Attempting to update README at path: ${readmePath}`);

  if (!fs.existsSync(readmePath)) {
    console.error(`README file not found at: ${readmePath}`);
    process.exit(1);
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  const lines = readmeContent.split('\n');

  const personalUsername = process.env.PERSONAL_USERNAME || 'fabiendostie';

  const statsCardMd = `[![Fabien Dostie's GitHub stats](https://github-readme-stats.vercel.app/api?username=${personalUsername}&show_icons=true&theme=tokyonight&include_all_commits=true&count_private=true)](https://github.com/anuraghazra/github-readme-stats)`;
  const langCardMd = `[![Top Langs](https://github-readme-stats.vercel.app/api/top-langs/?username=${personalUsername}&layout=compact&theme=tokyonight&langs_count=10&include_all_commits=true&count_private=true)](https://github.com/anuraghazra/github-readme-stats)`;

  const statsStartPlaceholder = '<!--START_STATS_CARD-->';
  const statsEndPlaceholder = '<!--END_STATS_CARD-->';
  const langStartPlaceholder = '<!--START_LANG_CARD-->';
  const langEndPlaceholder = '<!--END_LANG_CARD-->';
  const lastUpdatedPlaceholder = '_Last updated:';

  let newLines = [];
  let processingStats = false;
  let processingLang = false;
  let statsInserted = false;
  let langInserted = false;

  // Find placeholder line numbers
  const statsStartIndex = lines.findIndex(line => line.trim() === statsStartPlaceholder);
  const statsEndIndex = lines.findIndex(line => line.trim() === statsEndPlaceholder);
  const langStartIndex = lines.findIndex(line => line.trim() === langStartPlaceholder);
  const langEndIndex = lines.findIndex(line => line.trim() === langEndPlaceholder);

  console.log(`Placeholders Found: StatsStart=${statsStartIndex}, StatsEnd=${statsEndIndex}, LangStart=${langStartIndex}, LangEnd=${langEndIndex}`);

  if (statsStartIndex !== -1 && statsEndIndex !== -1 && statsStartIndex < statsEndIndex) {
    // Rebuild lines excluding old stats section
    newLines = lines.slice(0, statsStartIndex);
    // Insert new stats section
    newLines.push(statsStartPlaceholder);
    newLines.push(statsCardMd);
    newLines.push(statsEndPlaceholder);
    // Add lines after old stats section
    newLines.push(...lines.slice(statsEndIndex + 1));
    statsInserted = true;
    console.log('Stats card section rebuilt.');
  } else {
    console.warn('Stats card placeholders not found or out of order. Skipping stats update.');
    newLines = [...lines]; // Keep original lines if placeholders are bad
  }

  // Process language card using the potentially modified lines array
  const currentLinesForLang = [...newLines]; // Work on the current state
  newLines = []; // Reset for final build
  const langStartIndexCurrent = currentLinesForLang.findIndex(line => line.trim() === langStartPlaceholder);
  const langEndIndexCurrent = currentLinesForLang.findIndex(line => line.trim() === langEndPlaceholder);

  if (langStartIndexCurrent !== -1 && langEndIndexCurrent !== -1 && langStartIndexCurrent < langEndIndexCurrent) {
    newLines = currentLinesForLang.slice(0, langStartIndexCurrent);
    newLines.push(langStartPlaceholder);
    newLines.push(langCardMd);
    newLines.push(langEndPlaceholder);
    newLines.push(...currentLinesForLang.slice(langEndIndexCurrent + 1));
    langInserted = true;
    console.log('Language card section rebuilt.');
  } else {
    console.warn('Language card placeholders not found or out of order. Skipping language update.');
    newLines = [...currentLinesForLang]; // Keep lines if lang placeholders are bad
  }
  
  // Update timestamp in the final lines array
  const lastUpdatedRegex = new RegExp(`^${lastUpdatedPlaceholder}.*_$`);
  let timestampUpdated = false;
  for (let i = 0; i < newLines.length; i++) {
      if (newLines[i].match(lastUpdatedRegex)) {
          newLines[i] = `${lastUpdatedPlaceholder} ${new Date().toISOString().split('T')[0]}_`;
          timestampUpdated = true;
          console.log('Timestamp line updated.');
          break;
      }
  }
  if (!timestampUpdated) {
      console.warn('Last updated placeholder not found, appending timestamp to end.');
      newLines.push(`${lastUpdatedPlaceholder} ${new Date().toISOString().split('T')[0]}_`);
  }

  const finalContent = newLines.join('\n').trim() + '\n';

  console.log('--- Final README content BEFORE write (snippet) ---'); 
  console.log(finalContent.substring(0, 500)); // Log more content
  console.log('-----------------------------------------------'); 
  
  try {
    fs.writeFileSync(readmePath, finalContent);
    console.log('writeFileSync completed successfully.');
  } catch (writeError) {
    console.error(`Error writing file to ${readmePath}:`, writeError);
    throw writeError;
  }

  console.log('README update process finished.');
}

async function main() {
  try {
    console.log('Starting README update...');
    await updateReadme();
    console.log('README update process finished successfully!'); // This might be premature if write failed but was caught
  } catch (error) {
    console.error('Error updating README:', error);
    process.exit(1);
  }
}

main();