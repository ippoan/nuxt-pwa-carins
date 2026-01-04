# Rust gRPCサービス: 車検証にファイルUUIDを追加

## 概要

フロントエンドの車検証一覧画面で、PDF/JSONファイルのダウンロードボタンが表示されません。
`ListCurrentCarInspections` RPCのレスポンスに`pdf_uuid`と`json_uuid`フィールドを追加する必要があります。

## 現在の状況

- `CarInspectionService.ListCurrentCarInspections` は車検証データのみを返している
- `CarInspectionFilesService` で別途ファイル紐付け情報を管理している
- フロントエンドは `pdfUuid` と `jsonUuid` が null のためダウンロードボタンが非活性

## 必要な変更

### 1. Proto定義の変更（`car_inspection.proto`）

`CarInspection` メッセージに `pdf_uuid` と `json_uuid` フィールドを追加：

```protobuf
message CarInspection {
  // ... 既存のフィールド ...

  string regist_car_light_car = 74;

  // ファイル紐付け情報（新規追加）
  optional string pdf_uuid = 75;
  optional string json_uuid = 76;
}
```

### 2. Rust側の実装変更

`ListCurrentCarInspections` の実装で、`car_inspection_files` テーブルをJOINしてファイルUUIDを取得：

```rust
// SQLクエリの例
async fn list_current_car_inspections(&self) -> Result<Vec<CarInspection>, Status> {
    let sql = r#"
        SELECT
            ci.*,
            pdf.uuid as pdf_uuid,
            json.uuid as json_uuid
        FROM car_inspections ci
        LEFT JOIN car_inspection_files pdf
            ON ci.elect_cert_mg_no = pdf.elect_cert_mg_no
            AND ci.grantdate_e = pdf.grantdate_e
            AND ci.grantdate_y = pdf.grantdate_y
            AND ci.grantdate_m = pdf.grantdate_m
            AND ci.grantdate_d = pdf.grantdate_d
            AND pdf.type = 'application/pdf'
        LEFT JOIN car_inspection_files json
            ON ci.elect_cert_mg_no = json.elect_cert_mg_no
            AND ci.grantdate_e = json.grantdate_e
            AND ci.grantdate_y = json.grantdate_y
            AND ci.grantdate_m = json.grantdate_m
            AND ci.grantdate_d = json.grantdate_d
            AND json.type = 'application/json'
        WHERE ci.is_current = true
        ORDER BY ci.entry_no_car_no
    "#;

    // ... 実行してCarInspectionにマッピング ...
}
```

### 3. JOIN条件について

`CarInspectionFile` の定義を確認すると、以下のフィールドで車検証と紐付けている：

```protobuf
message CarInspectionFile {
  string uuid = 1;
  string type = 2;              // "application/json" or "application/pdf"
  string elect_cert_mg_no = 3;  // 車検証番号
  string grantdate_e = 4;       // 交付日（和暦）
  string grantdate_y = 5;
  string grantdate_m = 6;
  string grantdate_d = 7;
}
```

JOIN条件は `elect_cert_mg_no` + `grantdate_*` で紐付ける。

## 期待するレスポンス

変更後の `ListCurrentCarInspections` レスポンス例：

```json
{
  "carInspections": [
    {
      "electCertMgNo": "ABC123",
      "entryNoCarNo": "長崎100か4028",
      "carName": "トヨタ",
      // ... 他のフィールド ...
      "pdfUuid": "c024655f-85b5-49a9-a1b2-3e34e1f4ec2c",
      "jsonUuid": "d135766f-96b6-4a88-b2c3-4e45f2f5fd3d"
    }
  ]
}
```

## フロントエンド側の準備状況

フロントエンドは既に `pdfUuid` と `jsonUuid` をマッピングする準備ができています：

```typescript
// composables/useCarInspectionData.ts (行116-117)
pdfUuid: grpc.pdfUuid as string | undefined,
jsonUuid: grpc.jsonUuid as string | undefined,
```

Rust側の変更が完了すれば、自動的にダウンロードボタンが表示されるようになります。

## テスト方法

```bash
# grpcurl でテスト
grpcurl -H "Authorization: Bearer $TOKEN" \
  rust-logi-747065218280.asia-northeast1.run.app:443 \
  logi.car_inspection.CarInspectionService/ListCurrentCarInspections

# レスポンスに pdfUuid, jsonUuid が含まれていることを確認
```

## 代替案（proto変更不要）

proto定義を変更せずに実装する場合、フロントエンド側で2回のAPI呼び出しを行い、クライアント側でデータをマージする方法もあります。ただし、パフォーマンスとコードの複雑さの観点から、Rust側で結合する方法を推奨します。
