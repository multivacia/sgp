import { loadConfig } from './config.js'
import { createApp } from './http/app.js'
import { logger } from './logger.js'

function main(): void {
  const config = loadConfig()
  const app = createApp(config)

  const host = '127.0.0.1'
  app.listen(config.port, host, () => {
    logger.info('SGP Print Agent iniciado', {
      host,
      port: config.port,
      printerName: config.printerName,
      mockPrinter: config.mockPrinter,
      cutMode: config.cutMode,
    })
  })
}

main()
