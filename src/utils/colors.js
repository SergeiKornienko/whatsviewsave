/**
 * Color utilities for user identification
 */

// WhatsApp-inspired color palette for different users
export const userColors = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Yellow
  '#BB8FCE', // Light Purple
  '#85C1E9', // Light Blue
  '#F8C471', // Orange
  '#82E0AA', // Light Green
  '#F1948A', // Light Red
  '#85C1E9', // Sky Blue
  '#D7BDE2', // Lavender
  '#A9DFBF', // Light Mint
  '#F9E79F', // Light Gold
  '#AED6F1', // Powder Blue
  '#D5DBDB', // Light Gray
  '#FADBD8', // Light Pink
];

/**
 * Generate a color for a user based on their name
 * @param {string} userName - The user's name
 * @returns {string} - Hex color code
 */
export function getUserColor(userName) {
  if (!userName) return '#6B7280'; // Gray for system messages
  
  // Create a simple hash from the username
  let hash = 0;
  for (let i = 0; i < userName.length; i++) {
    const char = userName.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a valid index
  const colorIndex = Math.abs(hash) % userColors.length;
  return userColors[colorIndex];
}

/**
 * Create a color map for all participants
 * @param {Array} participants - Array of participant names
 * @returns {Object} - Map of username to color
 */
export function createColorMap(participants) {
  const colorMap = {};
  participants.forEach((participant, index) => {
    colorMap[participant] = userColors[index % userColors.length];
  });
  return colorMap;
}
