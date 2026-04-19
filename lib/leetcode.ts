export interface LeetCodeStats {
  username: string
  totalSolved: number
  easySolved: number
  mediumSolved: number
  hardSolved: number
  points: number
}

const QUERY = `query getUserProfile($username: String!) {
  matchedUser(username: $username) {
    submitStatsGlobal { acSubmissionNum { difficulty count } }
  }
}`

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats> {
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Referer': 'https://leetcode.com', 'User-Agent': 'Mozilla/5.0' },
    body: JSON.stringify({ query: QUERY, variables: { username } }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`LeetCode API error: ${res.status}`)
  const json = await res.json()
  const user = json?.data?.matchedUser
  if (!user) throw new Error(`LeetCode user "${username}" not found`)
  const rows        = user.submitStatsGlobal.acSubmissionNum as { difficulty: string; count: number }[]
  const easySolved   = rows.find(r => r.difficulty === 'Easy')?.count   ?? 0
  const mediumSolved = rows.find(r => r.difficulty === 'Medium')?.count ?? 0
  const hardSolved   = rows.find(r => r.difficulty === 'Hard')?.count   ?? 0
  const totalSolved  = rows.find(r => r.difficulty === 'All')?.count    ?? (easySolved + mediumSolved + hardSolved)
  return { username, totalSolved, easySolved, mediumSolved, hardSolved, points: easySolved + mediumSolved * 2 + hardSolved * 3 }
}
