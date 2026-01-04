# Rust gRPCサービス: DownloadFile RPC 実装指示書

## 概要

フロントエンド（Nuxt）からファイルダウンロード機能が動作しません。
`FilesService.DownloadFile` RPCがS3からファイルを取得してストリーミングで返す実装が必要です。

## 現在の状況

- フロントエンドは `DownloadFile` RPCを呼び出している
- サーバーは応答を返しているが、チャンクデータが空（0バイト）
- ファイルはS3に保存されている（`s3Key`フィールドあり）

## Proto定義

```protobuf
// ファイルダウンロードリクエスト
message DownloadFileRequest {
  string uuid = 1;
}

// ファイルチャンク（ストリーミング用）
message FileChunk {
  bytes data = 1;
  int64 offset = 2;
  int64 total_size = 3;
}

// サービス定義
service FilesService {
  // ファイルをダウンロード（サーバーストリーミング）
  rpc DownloadFile(DownloadFileRequest) returns (stream FileChunk);
}
```

## 実装要件

### 1. DownloadFile RPC の実装

```rust
async fn download_file(
    &self,
    request: Request<DownloadFileRequest>,
) -> Result<Response<Self::DownloadFileStream>, Status> {
    let uuid = request.into_inner().uuid;

    // 1. DBからファイルメタデータを取得
    let file = self.get_file_metadata(&uuid).await?;

    // 2. S3からファイルを取得
    let s3_key = file.s3_key.ok_or_else(|| {
        Status::not_found("File not found in S3")
    })?;

    // 3. S3からストリーミングダウンロード
    let object = self.s3_client
        .get_object()
        .bucket(&self.bucket_name)
        .key(&s3_key)
        .send()
        .await
        .map_err(|e| Status::internal(format!("S3 error: {}", e)))?;

    let total_size = object.content_length().unwrap_or(0) as i64;
    let body = object.body;

    // 4. チャンクに分割してストリーミング
    let chunk_size = 64 * 1024; // 64KB chunks
    let stream = async_stream::try_stream! {
        let mut offset: i64 = 0;
        let mut buffer = Vec::with_capacity(chunk_size);

        let mut reader = body.into_async_read();
        loop {
            buffer.clear();
            let bytes_read = reader
                .take(chunk_size as u64)
                .read_to_end(&mut buffer)
                .await
                .map_err(|e| Status::internal(format!("Read error: {}", e)))?;

            if bytes_read == 0 {
                break;
            }

            yield FileChunk {
                data: buffer.clone(),
                offset,
                total_size,
            };

            offset += bytes_read as i64;
        }
    };

    Ok(Response::new(Box::pin(stream) as Self::DownloadFileStream))
}
```

### 2. 代替案: GetFile で includeBlob をサポート

`DownloadFile`の代わりに、既存の`GetFile` RPCで`include_blob = true`の場合にS3からファイルを取得してBase64で返す方法もあります。

```rust
async fn get_file(
    &self,
    request: Request<GetFileRequest>,
) -> Result<Response<FileResponse>, Status> {
    let req = request.into_inner();
    let uuid = req.uuid;
    let include_blob = req.include_blob;

    // DBからファイルメタデータを取得
    let mut file = self.get_file_metadata(&uuid).await?;

    // include_blob が true の場合、S3からファイルを取得
    if include_blob {
        if let Some(s3_key) = &file.s3_key {
            let object = self.s3_client
                .get_object()
                .bucket(&self.bucket_name)
                .key(s3_key)
                .send()
                .await
                .map_err(|e| Status::internal(format!("S3 error: {}", e)))?;

            let bytes = object.body
                .collect()
                .await
                .map_err(|e| Status::internal(format!("Read error: {}", e)))?
                .into_bytes();

            // Base64エンコード
            file.blob = Some(base64::encode(&bytes));
        }
    }

    Ok(Response::new(FileResponse { file: Some(file) }))
}
```

## 推奨事項

1. **小〜中サイズファイル（< 10MB）**: `GetFile` + `include_blob` が簡単
2. **大サイズファイル（> 10MB）**: `DownloadFile` ストリーミングが効率的

## テスト方法

実装後、以下のコマンドでテスト可能：

```bash
# grpcurl でテスト
grpcurl -d '{"uuid": "c024655f-85b5-49a9-a1b2-3e34e1f4ec2c"}' \
  -H "Authorization: Bearer $TOKEN" \
  rust-logi-747065218280.asia-northeast1.run.app:443 \
  logi.files.FilesService/DownloadFile
```

## フロントエンド側の準備

フロントエンド（Nuxt）側は既に`DownloadFile`を呼び出す実装が完了しています：
- `server/api/grpc/files.ts` - gRPCプロキシ
- `composables/useFileDownload.ts` - ダウンロード処理

Rust側の実装が完了すれば、自動的に動作するようになります。
