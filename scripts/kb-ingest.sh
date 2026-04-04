#!/usr/bin/env bash
# Bulk ingest findings from the research repo into the knowledge base.
# Usage: bash scripts/kb-ingest.sh [--since YYYY-MM-DD]
# Defaults to ingesting all findings. Use --since to only ingest recent ones.

SINCE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --since) SINCE="$2"; shift 2;;
    *) shift;;
  esac
done

cd "$(dirname "$0")/.." || exit 1

node -e "
const { MongoClient } = require('mongodb');
const OpenAI = require('openai');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const RESEARCH_REPO = path.resolve(process.cwd(), '..', 'gallegos-labs-research');
const FINDINGS_DIR = path.join(RESEARCH_REPO, 'findings', 'raw');
const SINCE = process.argv[1] || '';

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { fm: {}, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { fm: {}, body: text };
  const fm = {};
  text.slice(4, end).split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx > -1) fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, '');
  });
  return { fm, body: text.slice(end + 5) };
}

async function run() {
  const openai = new OpenAI.default();
  const client = new MongoClient(process.env.KNOWLEDGE_MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(process.env.KNOWLEDGE_DB_NAME || 'knowledge-base');
    const col = db.collection('entries');

    let files;
    try {
      files = fs.readdirSync(FINDINGS_DIR).filter(f => f.endsWith('.md') && f !== '.gitkeep');
    } catch {
      console.log(JSON.stringify({ error: 'Findings directory not found', ingested: 0 }));
      return;
    }

    if (SINCE) {
      files = files.filter(f => f >= SINCE);
    }

    let ingested = 0;
    let skipped = 0;

    for (const file of files) {
      const filePath = path.join(FINDINGS_DIR, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const { fm, body } = parseFrontmatter(raw);

      const kbId = 'kb-finding-' + (fm.id || file.replace('.md', ''));

      // Check if already ingested
      const existing = await col.findOne({ _id: kbId });
      if (existing) { skipped++; continue; }

      const content = body.trim();
      if (!content) { skipped++; continue; }

      // Embed
      const embeddingRes = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content
      });
      const embedding = embeddingRes.data[0].embedding;

      const summary = content.length > 150 ? content.slice(0, 147) + '...' : content;
      const category = fm.category || 'general';
      const source = fm.methodology === 'president-annotation' ? 'user-feedback' : 'research-finding';
      const tags = [fm.product, fm.source, fm.category].filter(Boolean);

      await col.insertOne({
        _id: kbId,
        content,
        summary,
        embedding,
        source,
        category,
        tags,
        sourceFile: 'gallegos-labs-research/findings/raw/' + file,
        sourceRepo: 'gallegos-labs-research',
        sourceUrl: fm.source_url || null,
        product: fm.product || 'general',
        competitor: null,
        confidence: 0.8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceDate: fm.date || file.slice(0, 10),
        status: 'active',
        staleDays: 180
      });

      ingested++;
      process.stderr.write('Ingested: ' + file + '\n');
    }

    console.log(JSON.stringify({ ok: true, ingested, skipped, total: files.length }));
  } catch (err) {
    console.log(JSON.stringify({ error: err.message }));
    process.exit(1);
  } finally {
    await client.close();
  }
}

run();
" "$SINCE"
