// open-next generates this module during the Cloudflare build step.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- generated artifact may be absent during clean Next type-checks
import { default as handler } from './.open-next/worker.js'
import { consumeBackgroundJobBatch, type BackgroundJob, type BackgroundJobEnv } from './lib/background-jobs'
import { pushFeishuBlogReport, type FeishuReportEnv } from './lib/feishu-report'

interface QueueMessage<T> {
  body: T
  ack?: () => void
  retry?: () => void
}

interface QueueBatch<T> {
  messages: Array<QueueMessage<T>>
}

const customWorker = {
  fetch: handler.fetch,

  async scheduled(controller: { scheduledTime: number; cron: string }, env: FeishuReportEnv, ctx?: { waitUntil?: (promise: Promise<unknown>) => void }) {
    const task = pushFeishuBlogReport(env, {
      now: new Date(controller.scheduledTime),
    }).catch((error) => {
      console.error('Feishu report cron failed:', error)
    })

    if (ctx?.waitUntil) {
      ctx.waitUntil(task)
      return
    }

    await task
  },

  async queue(batch: QueueBatch<BackgroundJob>, env: BackgroundJobEnv) {
    await consumeBackgroundJobBatch(batch, env)
  },
}

export default customWorker

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- generated artifact may be absent during clean Next type-checks
export { DOQueueHandler, DOShardedTagCache } from './.open-next/worker.js'
