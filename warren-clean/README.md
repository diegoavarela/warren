# Warren Clean - Simple Excel Parser

This is a minimal, clean implementation of the Warren Excel parser.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```
   Or for development with auto-reload:
   ```
   npm run dev
   ```

3. Open the web interface:
   - Open `index.html` in your browser
   - Or serve it with: `python3 -m http.server 8000` and go to http://localhost:8000

## How it works

- Backend runs on port 3003
- Simple POST endpoint at `/api/parse-excel`
- Uses XLSX (SheetJS) library for parsing
- Reads specific cells directly with no transformations

## Expected June values:
- Income: 61,715,728.02
- Expense: -69,286,881.42
- Balance: 26,924,011.97
- Lowest: 17,129,280.86
- Generation: -7,571,153.41