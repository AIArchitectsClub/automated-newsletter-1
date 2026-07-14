import pg from 'pg'

const { Pool } = pg

let pool = null

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  }
  return pool
}

export async function closeDb() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export async function deleteUserByEmail(email) {
  await getPool().query('DELETE FROM users WHERE email = $1', [email])
}

export async function deleteSubscriberByEmail(email) {
  await getPool().query('DELETE FROM subscribers WHERE email = $1', [email])
}

export async function getSubscriberIdByEmail(email) {
  const { rows } = await getPool().query('SELECT id FROM subscribers WHERE email = $1', [email])
  return rows[0]?.id
}

export async function deleteCampaignBySubject(subject) {
  await getPool().query('DELETE FROM campaigns WHERE subject = $1', [subject])
}

export async function getContributorIdByEmail(email) {
  const { rows } = await getPool().query('SELECT id FROM contributors WHERE email = $1', [email])
  return rows[0]?.id
}

export async function deleteContributorByEmail(email) {
  await getPool().query('DELETE FROM contributors WHERE email = $1', [email])
}

// Cascades to submission_attachments via ON DELETE CASCADE — one delete
// covers both tables.
export async function deleteSubmissionByTitle(title) {
  await getPool().query('DELETE FROM submissions WHERE title = $1', [title])
}

const KNOWN_TABLES = ['users', 'subscribers', 'campaigns', 'submissions', 'submission_attachments', 'contributors']

// `table` is only ever a hardcoded literal from spec files, never
// user input — this allowlist is defense-in-depth against a future typo
// or copy-paste turning into a SQL-injection-shaped footgun, not a
// response to any real untrusted input here.
export async function countRows(table) {
  if (!KNOWN_TABLES.includes(table)) {
    throw new Error(`countRows: unknown table "${table}"`)
  }
  const { rows } = await getPool().query(`SELECT COUNT(*)::int AS count FROM ${table}`)
  return rows[0].count
}
