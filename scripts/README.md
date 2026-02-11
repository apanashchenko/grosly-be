# 🛠️ Utility Scripts

## check-forbidden-chars.js

Diagnostic script to detect forbidden characters in recipe text that would fail validation.

### Usage

```bash
# Check text directly
node scripts/check-forbidden-chars.js "Your recipe text here"

# Check text from file
node scripts/check-forbidden-chars.js "$(cat test-recipe.json | jq -r '.recipeText')"

# Check from JSON file
node scripts/check-forbidden-chars.js "$(cat your-recipe.txt)"
```

### Example Output

```
📊 Analyzing text...

✅ Valid: false

❌ Forbidden characters found:

┌─────────┬───────────┬──────────────┬─────────┬───────┐
│ (index) │ Character │ Unicode (hex)│ Decimal │ Count │
├─────────┼───────────┼──────────────┼─────────┼───────┤
│    0    │    '     │   \u2019     │  8217   │   15  │
│    1    │    "     │   \u201c     │  8220   │    5  │
│    2    │    "     │   \u201d     │  8221   │    5  │
│    3    │    —     │   \u2014     │  8212   │    2  │
└─────────┴───────────┴──────────────┴─────────┴───────┘

💡 Tips:
- Replace typographic quotes with regular ones
- Replace em-dash/en-dash with regular hyphen
- Remove special Unicode characters

Or add these characters to the regex pattern in DTOs if they should be allowed.
```

### What it checks

The script validates text against the same pattern used in DTOs:
- Latin letters (a-z, A-Z)
- Cyrillic letters (а-я, А-Я, і, ї, є, ґ, І, Ї, Є, Ґ)
- Numbers (0-9)
- Punctuation: `. , ( ) ! ? ' " : / % ° + = * №`
- Typographic: `' ' " " « » – —`
- Whitespace: space, newline, carriage return
- Hyphens: `-` `–` `—`
