/**
 * WhatsApp Poll Parser
 * Detects and parses poll messages from WhatsApp chat exports
 */

/**
 * Parse a poll message and extract poll structure
 * @param {string} message - The message text to analyze
 * @returns {Object|null} - Poll structure or null if not a poll
 */
export function parsePollMessage(message) {
  if (!message || typeof message !== 'string') return null;

  const lines = message
    .trim()
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Check if this looks like a poll message
  if (lines.length < 3) return null;
  
  // Look for poll indicators
  const hasPollIndicator = lines[0].includes('POLL:') || 
                          lines[0].includes('Poll:') ||
                          lines[0].includes('poll:') ||
                          lines[0].includes('📊') ||
                          lines[0].includes('🗳️');

  if (!hasPollIndicator) return null;

  // Look for option indicators
  const hasOptions = lines.some(line => 
    line.includes('OPTION:') || 
    line.includes('Option:') ||
    line.includes('option:') ||
    line.includes('•') ||
    line.includes('✓') ||
    line.includes('☑')
  );

  if (!hasOptions) return null;

  // Extract poll title (usually the first line after POLL: or the second line)
  let title = '';
  if (lines[0].includes('POLL:') || lines[0].includes('Poll:') || lines[0].includes('poll:')) {
    title = lines[0].replace(/^(POLL:|Poll:|poll:)\s*/i, '').trim();
  } else if (lines.length > 1) {
    title = lines[1];
  }

  // Extract options with vote counts
  const options = [];
  const optionRegex = /(?:OPTION:|Option:|option:|•|✓|☑)\s*(.+?)\s*\((\d+).*?\)/i;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(optionRegex);
    
    if (match) {
      const optionText = match[1].trim();
      const voteCount = parseInt(match[2], 10);
      
      if (optionText && !isNaN(voteCount)) {
        options.push({
          text: optionText,
          votes: voteCount
        });
      }
    } else {
      // Try to parse lines that look like options without explicit indicators
      const simpleOptionMatch = line.match(/^(.+?)\s*\((\d+).*?\)$/);
      if (simpleOptionMatch) {
        const optionText = simpleOptionMatch[1].trim();
        const voteCount = parseInt(simpleOptionMatch[2], 10);
        
        if (optionText && !isNaN(voteCount) && optionText.length > 0) {
          options.push({
            text: optionText,
            votes: voteCount
          });
        }
      }
    }
  }

  // Must have at least 2 options to be considered a valid poll
  if (options.length < 2) return null;

  // Calculate total votes and max votes
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0);
  const maxVotes = Math.max(...options.map(option => option.votes));

  return {
    title: title || 'Poll',
    options,
    totalVotes,
    maxVotes: maxVotes || 1 // Avoid division by zero
  };
}

/**
 * Check if a message is likely a poll
 * @param {string} message - The message text to check
 * @returns {boolean} - True if message looks like a poll
 */
export function isPollMessage(message) {
  return parsePollMessage(message) !== null;
}
