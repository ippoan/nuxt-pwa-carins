/**
 * gRPC-Web クライアントプラグイン (ブラウザ専用)
 *
 * Connect RPC クライアントを作成し、$grpc として提供
 * Browser → /api/grpc/* → catch-all proxy → cf-grpc-proxy → CloudRun (rust-logi)
 */

import { createClient, type Client, type Interceptor } from '@connectrpc/connect'
import { createGrpcWebTransport } from '@connectrpc/connect-web'
import { CarInspectionService, FilesService } from '@yhonda-ohishi-pub-dev/logi-proto'

type CarInspectionClient = Client<typeof CarInspectionService>
type FilesClient = Client<typeof FilesService>

export default defineNuxtPlugin(() => {
  const { token } = useAuth()

  // JWT ヘッダーを付与
  const authInterceptor: Interceptor = (next) => async (req) => {
    if (token.value) {
      req.header.set('x-auth-token', token.value)
    }
    return next(req)
  }

  const transport = createGrpcWebTransport({
    baseUrl: '/api/grpc',
    interceptors: [authInterceptor],
  })

  const carInspectionClient: CarInspectionClient = createClient(CarInspectionService, transport)
  const filesClient: FilesClient = createClient(FilesService, transport)

  return {
    provide: {
      grpc: {
        carInspections: carInspectionClient,
        files: filesClient,
      },
    },
  }
})

declare module '#app' {
  interface NuxtApp {
    $grpc: {
      carInspections: CarInspectionClient
      files: FilesClient
    }
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $grpc: {
      carInspections: CarInspectionClient
      files: FilesClient
    }
  }
}
