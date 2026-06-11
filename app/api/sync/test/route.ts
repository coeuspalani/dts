import { NextRequest, NextResponse } from 'next/server'
import { fetchLeetCodeStats } from '@/lib/leetcode'

// GET /api/sync/test?username=coeus_palani
// Use this to verify LeetCode fetching works before full sync
export async function GET(req: NextRequest) {
  const username = new URL(req.url).searchParams.get('username')
  if (!username) {
    return NextResponse.json({ error: 'Pass ?username=your_lc_username' }, { status: 400 })
  }

  try {
    const stats = await fetchLeetCodeStats(username)
    return NextResponse.json({ success: true, data: stats })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}
