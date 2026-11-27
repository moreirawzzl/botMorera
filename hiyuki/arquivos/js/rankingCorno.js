const fs = require('node:fs')
const path = require('node:path')
const file = path.resolve(__dirname, '../../database/ranking-corno.json')

function load() {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Ranking corno:', error.message)
    return {}
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file + '.tmp', JSON.stringify(data))
  fs.renameSync(file + '.tmp', file)
}

function add(groupId, ids) {
  const data = load()
  const scores = data[groupId] || (data[groupId] = {})
  const updated = []

  for (const id of new Set(ids)) {
    const current = Number.isSafeInteger(scores[id]) && scores[id] > 0 ? scores[id] : 0
    scores[id] = current + 1
    updated.push({ id, score: scores[id] })
  }

  if (updated.length) save(data)
  return updated
}

function ranking(groupId, ids) {
  const scores = load()[groupId] || {}
  return [...new Set(ids)].map(id => ({
    id,
    score: Number.isSafeInteger(scores[id]) && scores[id] > 0 ? scores[id] : 0
  })).filter(person => person.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
}

module.exports = { add, ranking }
