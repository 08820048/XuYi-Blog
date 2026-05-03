import { NextRequest } from 'next/server'
import { pushFeishuBlogReport } from '@/lib/feishu-report'
import {
  ensureAuthenticatedRequest,
  getRouteEnvWithDb,
  jsonError,
  jsonOk,
} from '@/lib/server/route-helpers'

export async function POST(req: NextRequest) {
  try {
    const route = await getRouteEnvWithDb('数据库未配置')
    if (!route.ok) return route.response

    const authError = await ensureAuthenticatedRequest(req, route.db)
    if (authError) return authError

    const dryRun = req.nextUrl.searchParams.get('dryRun') === '1'
    const result = await pushFeishuBlogReport(route.env, { dryRun })

    return jsonOk({
      success: true,
      sent: result.sent,
      dryRun: result.dryRun,
      text: result.text,
    })
  } catch (error) {
    console.error('Feishu report route error:', error)
    return jsonError(error instanceof Error ? error.message : '飞书报告推送失败', 500)
  }
}

export async function GET(req: NextRequest) {
  return POST(req)
}
