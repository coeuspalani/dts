export interface LeetCodeStats {
  username:     string
  totalSolved:  number
  easySolved:   number
  mediumSolved: number
  hardSolved:   number
  points:       number
}

// Exact query LeetCode uses internally — tested working
const QUERY = `
  query getUserProfile($username: String!) {
    matchedUser(username: $username) {
      username
      submitStatsGlobal {
        acSubmissionNum {
          difficulty
          count
        }
      }
    }
  }
`

export async function fetchLeetCodeStats(username: string): Promise<LeetCodeStats> {
  // Try primary endpoint
  const res = await fetch('https://leetcode.com/graphql', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Referer':       'https://leetcode.com',
      'Origin':        'https://leetcode.com',
      'User-Agent':    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept':        'application/json',
    },
    body: JSON.stringify({
      query: QUERY,
      variables: { username },
    }),
    signal: AbortSignal.timeout(12000),
  })

  if (!res.ok) {
    throw new Error(`LeetCode API returned ${res.status} ${res.statusText}`)
  }

  const json = await res.json()

  // Check for GraphQL errors
  if (json.errors?.length) {
    throw new Error(`LeetCode GraphQL error: ${json.errors[0].message}`)
  }

  const user = json?.data?.matchedUser
  if (!user) {
    throw new Error(`LeetCode username "${username}" not found or private`)
  }

  const rows         = (user.submitStatsGlobal?.acSubmissionNum ?? []) as { difficulty: string; count: number }[]
  const easySolved   = rows.find(r => r.difficulty === 'Easy')?.count   ?? 0
  const mediumSolved = rows.find(r => r.difficulty === 'Medium')?.count ?? 0
  const hardSolved   = rows.find(r => r.difficulty === 'Hard')?.count   ?? 0
  const totalSolved  = rows.find(r => r.difficulty === 'All')?.count    ?? (easySolved + mediumSolved + hardSolved)

  // DTS points formula: Easy=1, Medium=2, Hard=3
  const points = easySolved * 1 + mediumSolved * 2 + hardSolved * 3

  return { username, totalSolved, easySolved, mediumSolved, hardSolved, points }
}
