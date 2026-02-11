#!/usr/bin/env node

/**
 * Helper script to detect forbidden characters in recipe text
 * Usage: node scripts/check-forbidden-chars.js "your text here"
 */

// Using negative pattern - forbid dangerous characters instead of whitelisting
const ALLOWED_PATTERN = /^[^<>{}[\]\\$#@`|~^&;]+$/;

function analyzeText(text) {
  console.log('📊 Analyzing text...\n');

  // Check if text matches the pattern
  const isValid = ALLOWED_PATTERN.test(text);

  console.log(`✅ Valid: ${isValid}\n`);

  if (!isValid) {
    console.log('❌ Forbidden characters found:\n');

    // Find all unique characters in text
    const chars = new Set(text.split(''));

    // Check each character
    const forbidden = [];
    chars.forEach((char) => {
      if (!ALLOWED_PATTERN.test(char)) {
        forbidden.push({
          char: char,
          code: char.charCodeAt(0),
          hex: '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'),
          count: text.split(char).length - 1,
        });
      }
    });

    // Sort by frequency
    forbidden.sort((a, b) => b.count - a.count);

    // Display table
    console.table(
      forbidden.map((f) => ({
        Character: f.char,
        'Unicode (hex)': f.hex,
        'Decimal': f.code,
        'Count': f.count,
      }))
    );

    console.log('\n💡 Tips:');
    console.log('- Replace typographic quotes with regular ones');
    console.log('- Replace em-dash/en-dash with regular hyphen');
    console.log('- Remove special Unicode characters');
    console.log(
      '\nOr add these characters to the regex pattern in DTOs if they should be allowed.'
    );
  } else {
    console.log('✨ All characters are allowed!');
  }
}

// Get text from command line arguments
const text = process.argv.slice(2).join(' ');

if (!text) {
  console.log('Usage: node scripts/check-forbidden-chars.js "your text here"');
  console.log('\nOr from file:');
  console.log('node scripts/check-forbidden-chars.js "$(cat your-file.txt)"');
  process.exit(1);
}

analyzeText(text);
