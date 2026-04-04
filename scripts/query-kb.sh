#!/usr/bin/env bash
# Semantic search across the knowledge base.
# Usage: bash scripts/query-kb.sh "natural language question" [--source X] [--category Y] [--limit N]
# Example: bash scripts/query-kb.sh "What do users hate about voice transcription?"
# Example: bash scripts/query-kb.sh "pricing changes" --source competitor-watch --limit 3

QUERY="${1:?Usage: query-kb.sh \"question\" [--source X] [--category Y] [--limit N]}"
shift

# Parse optional flags
SOURCE=""
CATEGORY=""
LIMIT="5"
while [ $# -gt 0 ]; do
  case "$1" in
    --source) SOURCE="$2"; shift 2;;
    --category) CATEGORY="$2"; shift 2;;
    --limit) LIMIT="$2"; shift 2;;
    *) shift;;
  esac
done

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

    const query = process.argv[1];
    const source = process.argv[2] || '';
    const category = process.argv[3] || '';
    const limit = parseInt(process.argv[4]) || 5;

    // Embed the query
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query
    });
    const queryVector = embeddingRes.data[0].embedding;

    // Build filter
    const filter = { status: { \$ne: 'archived' } };
    if (source) filter.source = source;
    if (category) filter.category = category;

    // Vector search
    const pipeline = [
      {
        \$vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector,
          numCandidates: limit * 10,
          limit,
          filter
        }
      },
      {
        \$project: {
          _id: 1,
          content: 1,
          summary: 1,
          source: 1,
          category: 1,
          tags: 1,
          sourceDate: 1,
          status: 1,
          score: { \$meta: 'vectorSearchScore' }
        }
      }
    ];

    const results = await col.aggregate(pipeline).toArray();

    console.log(JSON.stringify({
      query,
      count: results.length,
      results: results.map(r => ({
        id: r._id,
        score: r.score,
        summary: r.summary,
        source: r.source,
        category: r.category,
        tags: r.tags,
        sourceDate: r.sourceDate,
        status: r.status,
        content: r.content
      }))
    }, null, 2));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message, query: process.argv[1], count: 0, results: [] }));
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
" "$QUERY" "$SOURCE" "$CATEGORY" "$LIMIT"
