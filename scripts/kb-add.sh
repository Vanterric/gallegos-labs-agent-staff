#!/usr/bin/env bash
# Add an entry to the knowledge base.
# Usage: bash scripts/kb-add.sh <source> <category> <content> [tags]
# Example: bash scripts/kb-add.sh "manual" "architecture" "We chose MongoDB Atlas for the KB because..." "mongodb,knowledge-base"

SOURCE="${1:?Usage: kb-add.sh <source> <category> <content> [tags]}"
CATEGORY="${2:?Missing category}"
CONTENT="${3:?Missing content}"
TAGS="${4:-}"

cd "$(dirname "$0")/.." || exit 1

node -e "
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function run() {
  const openai = new OpenAI.default();
  const client = new MongoClient(process.env.KNOWLEDGE_MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.KNOWLEDGE_DB_NAME || 'knowledge-base');
    const col = db.collection('entries');

    const content = process.argv[1];
    const source = process.argv[2];
    const category = process.argv[3];
    const tags = process.argv[4] ? process.argv[4].split(',').map(t => t.trim()) : [];

    // Generate embedding
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content
    });
    const embedding = embeddingRes.data[0].embedding;

    // Generate summary (first 150 chars)
    const summary = content.length > 150 ? content.slice(0, 147) + '...' : content;

    // Generate ID
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const count = await col.countDocuments({ sourceDate: dateStr });
    const id = 'kb-' + dateStr + '-' + String(count + 1).padStart(3, '0');

    const entry = {
      _id: id,
      content,
      summary,
      embedding,
      source,
      category,
      tags,
      sourceFile: null,
      sourceRepo: null,
      sourceUrl: null,
      product: 'general',
      competitor: null,
      confidence: 1.0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      sourceDate: dateStr,
      status: 'active',
      staleDays: source === 'architectural-decision' ? 99999 : source === 'competitor-watch' ? 90 : 180
    };

    await col.insertOne(entry);
    console.log(JSON.stringify({ ok: true, id, summary }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
" "$CONTENT" "$SOURCE" "$CATEGORY" "$TAGS"
