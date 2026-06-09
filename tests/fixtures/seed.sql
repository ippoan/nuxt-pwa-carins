-- carins integration test seed data
-- migration 適用後に postgres superuser (RLS bypass) で実行される。
-- ID は tests/integration/carins-api.test.ts と一致させること。

SET search_path TO alc_api;

-- Test tenant (require_tenant ミドルウェアが tenants 実在を確認するため必須)
INSERT INTO tenants (id, name, slug) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Carins Test Tenant', 'carins-test-tenant');

-- ============================================================
-- car_inspection: 1 行。NOT NULL の PascalCase TEXT 列は全て埋める必要があるため
-- 意味のある列以外は空文字。ValidPeriodExpirdate は遠未来 (991231) にして
-- /car-inspections/current に必ず乗るようにする。id は SERIAL を明示指定。
-- ============================================================
INSERT INTO car_inspection (id, tenant_id, "CertInfoImportFileVersion", "Acceptoutputno", "FormType", "ElectCertMgNo", "CarId", "ElectCertPublishdateE", "ElectCertPublishdateY", "ElectCertPublishdateM", "ElectCertPublishdateD", "GrantdateE", "GrantdateY", "GrantdateM", "GrantdateD", "TranspotationBureauchiefName", "EntryNoCarNo", "ReggrantdateE", "ReggrantdateY", "ReggrantdateM", "ReggrantdateD", "FirstregistdateE", "FirstregistdateY", "FirstregistdateM", "CarName", "CarNameCode", "CarNo", "Model", "EngineModel", "OwnernameLowLevelChar", "OwnernameHighLevelChar", "OwnerAddressChar", "OwnerAddressNumValue", "OwnerAddressCode", "UsernameLowLevelChar", "UsernameHighLevelChar", "UserAddressChar", "UserAddressNumValue", "UserAddressCode", "UseheadqrterChar", "UseheadqrterNumValue", "UseheadqrterCode", "CarKind", "Use", "PrivateBusiness", "CarShape", "CarShapeCode", "NoteCap", "Cap", "NoteMaxloadage", "Maxloadage", "NoteCarWgt", "CarWgt", "NoteCarTotalWgt", "CarTotalWgt", "NoteLength", "Length", "NoteWidth", "Width", "NoteHeight", "Height", "FfAxWgt", "FrAxWgt", "RfAxWgt", "RrAxWgt", "Displacement", "FuelClass", "ModelSpecifyNo", "ClassifyAroundNo", "ValidPeriodExpirdateE", "ValidPeriodExpirdateY", "ValidPeriodExpirdateM", "ValidPeriodExpirdateD", "NoteInfo", "TwodimensionCodeInfoEntryNoCarNo", "TwodimensionCodeInfoCarNo", "TwodimensionCodeInfoValidPeriodExpirdate", "TwodimensionCodeInfoModel", "TwodimensionCodeInfoModelSpecifyNoClassifyAroundNo", "TwodimensionCodeInfoCharInfo", "TwodimensionCodeInfoEngineModel", "TwodimensionCodeInfoCarNoStampPlace", "TwodimensionCodeInfoFirstregistdate", "TwodimensionCodeInfoFfAxWgt", "TwodimensionCodeInfoFrAxWgt", "TwodimensionCodeInfoRfAxWgt", "TwodimensionCodeInfoRrAxWgt", "TwodimensionCodeInfoNoiseReg", "TwodimensionCodeInfoNearNoiseReg", "TwodimensionCodeInfoDriveMethod", "TwodimensionCodeInfoOpacimeterMeasCar", "TwodimensionCodeInfoNoxPmMeasMode", "TwodimensionCodeInfoNoxValue", "TwodimensionCodeInfoPmValue", "TwodimensionCodeInfoSafeStdDate", "TwodimensionCodeInfoFuelClassCode", "RegistCarLightCar")
  VALUES (901, '11111111-1111-1111-1111-111111111111', '', '', '', 'ECMN-CARINS-001', 'CARINS-CAR-001', '', '', '', '', '5', '06', '01', '01', '', '品川500', '', '', '', '', '', '', '', 'テスト車両', '', '1234', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '5', '99', '12', '31', '', '', '1234', '991231', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '');

-- ============================================================
-- files: 1 行。NOT NULL は tenant_id / filename / type のみ。
-- /files /files/recent が tenant スコープで返す。
-- ============================================================
INSERT INTO files (uuid, tenant_id, filename, type) VALUES
  ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111',
   'carins-seed.pdf', 'application/pdf');

-- ============================================================
-- car_inspection_nfc_tags: 1 行。car_inspection_id=901 を参照。
-- /nfc-tags /nfc-tags/search?uuid=NFC-CARINS-001 が返す。
-- ============================================================
INSERT INTO car_inspection_nfc_tags (tenant_id, nfc_uuid, car_inspection_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'NFC-CARINS-001', 901);
