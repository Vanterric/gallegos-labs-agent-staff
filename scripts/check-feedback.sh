#!/usr/bin/env bash
# Check for new Nimbus user feedback since last checked.
# Usage: bash scripts/check-feedback.sh
# Uses Node.js + mongodb driver. Outputs new feedback as JSON.

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd -W 2>/dev/null || pwd)"

node -e "
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), '.feedback-state.json');
const URI = 'mongodb+srv://nimbus:qNdNWk0HpD4eqyzA@nimbus-hub.l8g0brj.mongodb.net/?appName=nimbus-hub';

async function run() {
  let lastChecked = '1970-01-01T00:00:00.000Z';
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (state.lastChecked) lastChecked = state.lastChecked;
  } catch {}

  const client = new MongoClient(URI);
  try {
    await client.connect();
    const db = client.db('nimbus-hub');
    const docs = await db.collection('feedbacks')
      .find({ createdAt: { \$gt: lastChecked } })
      .sort({ createdAt: -1 })
      .toArray();

    const feedback = docs.map(d => ({
      id: d._id,
      category: d.category,
      title: d.title,
      content: d.content,
      userEmail: d.userEmail || 'anonymous',
      createdAt: d.createdAt
    }));

    fs.writeFileSync(STATE_FILE, JSON.stringify({ lastChecked: new Date().toISOString() }, null, 2) + '\n');

    console.log(JSON.stringify({ count: feedback.length, feedback }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message, count: 0, feedback: [] }));
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
"
