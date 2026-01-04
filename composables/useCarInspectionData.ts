/**
 * 車検証データ取得Composable
 * Cloudflare (REST) と Cloud Run (gRPC) の両方に対応
 */

import type { components } from '#nuxt-api-party/jsonPlaceholder';

type CarInspectionSchema = components["schemas"]["carInspectionSchema"];

interface UseCarInspectionDataOptions {
  lazy?: boolean;
  cache?: boolean;
}

/**
 * gRPCレスポンス(camelCase)からREST API互換形式(PascalCase)に変換
 */
function mapGrpcToSchema(grpc: Record<string, unknown>): CarInspectionSchema {
  return {
    CertInfoImportFileVersion: grpc.certInfoImportFileVersion as string,
    Acceptoutputno: grpc.acceptoutputno as string,
    FormType: grpc.formType as string,
    ElectCertMgNo: grpc.electCertMgNo as string,
    CarId: grpc.carId as string,
    ElectCertPublishdateE: grpc.electCertPublishdateE as string,
    ElectCertPublishdateY: grpc.electCertPublishdateY as string,
    ElectCertPublishdateM: grpc.electCertPublishdateM as string,
    ElectCertPublishdateD: grpc.electCertPublishdateD as string,
    GrantdateE: grpc.grantdateE as string,
    GrantdateY: grpc.grantdateY as string,
    GrantdateM: grpc.grantdateM as string,
    GrantdateD: grpc.grantdateD as string,
    TranspotationBureauchiefName: grpc.transpotationBureauchiefname as string,
    EntryNoCarNo: grpc.entryNoCarNo as string,
    ReggrantdateE: grpc.reggrantdateE as string,
    ReggrantdateY: grpc.reggrantdateY as string,
    ReggrantdateM: grpc.reggrantdateM as string,
    ReggrantdateD: grpc.reggrantdateD as string,
    FirstregistdateE: grpc.firstregistdateE as string,
    FirstregistdateY: grpc.firstregistdateY as string,
    FirstregistdateM: grpc.firstregistdateM as string,
    CarName: grpc.carName as string,
    CarNameCode: grpc.carNameCode as string,
    CarNo: grpc.carNo as string,
    Model: grpc.model as string,
    EngineModel: grpc.engineModel as string,
    OwnernameLowLevelChar: grpc.ownernameLowLevelChar as string,
    OwnernameHighLevelChar: grpc.ownernameHighLevelChar as string,
    OwnerAddressChar: grpc.ownerAddressChar as string,
    OwnerAddressNumValue: grpc.ownerAddressNumValue as string,
    OwnerAddressCode: grpc.ownerAddressCode as string,
    UsernameLowLevelChar: grpc.usernameLowLevelChar as string,
    UsernameHighLevelChar: grpc.usernameHighLevelChar as string,
    UserAddressChar: grpc.userAddressChar as string,
    UserAddressNumValue: grpc.userAddressNumValue as string,
    UserAddressCode: grpc.userAddressCode as string,
    UseheadqrterChar: grpc.useheadqrterChar as string,
    UseheadqrterNumValue: grpc.useheadqrterNumValue as string,
    UseheadqrterCode: grpc.useheadqrterCode as string,
    CarKind: grpc.carKind as string,
    Use: grpc.use as string,
    PrivateBusiness: grpc.privateBusiness as string,
    CarShape: grpc.carShape as string,
    CarShapeCode: grpc.carShapeCode as string,
    NoteCap: grpc.noteCap as string,
    Cap: grpc.cap as string,
    NoteMaxloadage: grpc.noteMaxloadage as string,
    Maxloadage: grpc.maxloadage as string,
    NoteCarWgt: grpc.noteCarWgt as string,
    CarWgt: grpc.carWgt as string,
    NoteCarTotalWgt: grpc.noteCarTotalWgt as string,
    CarTotalWgt: grpc.carTotalWgt as string,
    NoteLength: grpc.noteLength as string,
    Length: grpc.length as string,
    NoteWidth: grpc.noteWidth as string,
    Width: grpc.width as string,
    NoteHeight: grpc.noteHeight as string,
    Height: grpc.height as string,
    FfAxWgt: grpc.ffAxWgt as string,
    FrAxWgt: grpc.frAxWgt as string,
    RfAxWgt: grpc.rfAxWgt as string,
    RrAxWgt: grpc.rrAxWgt as string,
    Displacement: grpc.displacement as string,
    FuelClass: grpc.fuelClass as string,
    ModelSpecifyNo: grpc.modelSpecifyNo as string,
    ClassifyAroundNo: grpc.classifyAroundNo as string,
    ValidPeriodExpirdateE: grpc.validPeriodExpirdateE as string,
    ValidPeriodExpirdateY: grpc.validPeriodExpirdateY as string,
    ValidPeriodExpirdateM: grpc.validPeriodExpirdateM as string,
    ValidPeriodExpirdateD: grpc.validPeriodExpirdateD as string,
    NoteInfo: grpc.noteInfo as string,
    TwodimensionCodeInfoEntryNoCarNo: grpc.twodimensionCodeInfoEntryNoCarNo as string,
    TwodimensionCodeInfoCarNo: grpc.twodimensionCodeInfoCarNo as string,
    TwodimensionCodeInfoValidPeriodExpirdate: grpc.twodimensionCodeInfoValidPeriodExpirdate as string,
    TwodimensionCodeInfoModel: grpc.twodimensionCodeInfoModel as string,
    TwodimensionCodeInfoModelSpecifyNoClassifyAroundNo: grpc.twodimensionCodeInfoModelSpecifyNoClassifyAroundNo as string,
    TwodimensionCodeInfoCharInfo: grpc.twodimensionCodeInfoCharInfo as string,
    TwodimensionCodeInfoEngineModel: grpc.twodimensionCodeInfoEngineModel as string,
    TwodimensionCodeInfoCarNoStampPlace: grpc.twodimensionCodeInfoCarNoStampPlace as string,
    TwodimensionCodeInfoFirstregistdate: grpc.twodimensionCodeInfoFirstregistdate as string,
    TwodimensionCodeInfoFfAxWgt: grpc.twodimensionCodeInfoFfAxWgt as string,
    TwodimensionCodeInfoFrAxWgt: grpc.twodimensionCodeInfoFrAxWgt as string,
    TwodimensionCodeInfoRfAxWgt: grpc.twodimensionCodeInfoRfAxWgt as string,
    TwodimensionCodeInfoRrAxWgt: grpc.twodimensionCodeInfoRrAxWgt as string,
    TwodimensionCodeInfoNoiseReg: grpc.twodimensionCodeInfoNoiseReg as string,
    TwodimensionCodeInfoNearNoiseReg: grpc.twodimensionCodeInfoNearNoiseReg as string,
    TwodimensionCodeInfoDriveMethod: grpc.twodimensionCodeInfoDriveMethod as string,
    TwodimensionCodeInfoOpacimeterMeasCar: grpc.twodimensionCodeInfoOpacimeterMeasCar as string,
    TwodimensionCodeInfoNoxPmMeasMode: grpc.twodimensionCodeInfoNoxPmMeasMode as string,
    TwodimensionCodeInfoNoxValue: grpc.twodimensionCodeInfoNoxValue as string,
    TwodimensionCodeInfoPmValue: grpc.twodimensionCodeInfoPmValue as string,
    TwodimensionCodeInfoSafeStdDate: grpc.twodimensionCodeInfoSafeStdDate as string,
    TwodimensionCodeInfoFuelClassCode: grpc.twodimensionCodeInfoFuelClassCode as string,
    RegistCarLightCar: grpc.registCarLightCar as string,
    // 追加フィールド（REST APIに存在する可能性のあるもの）
    pdfUuid: grpc.pdfUuid as string | undefined,
    jsonUuid: grpc.jsonUuid as string | undefined,
  } as CarInspectionSchema;
}

/**
 * 現在有効な車検証一覧を取得
 */
export const useCarInspectionData = (options?: UseCarInspectionDataOptions) => {
  const backend = useApiBackend();

  if (backend === 'cloudflare') {
    // 既存のnuxt-api-party使用
    return useJsonPlaceholderData("/api/carInspect/current", {
      method: "GET",
      lazy: options?.lazy ?? false,
      cache: options?.cache ?? false,
      transform: (v) => v ?? undefined,
    });
  } else {
    // Cloud Run gRPC プロキシ使用
    return useFetch<CarInspectionSchema[]>('/api/grpc/car-inspections', {
      method: 'POST',
      body: { method: 'listCurrent', params: {} },
      lazy: options?.lazy ?? false,
      transform: (response: { carInspections?: Record<string, unknown>[] }) => {
        if (!response?.carInspections) return undefined;
        return response.carInspections.map(mapGrpcToSchema);
      },
    });
  }
};

/**
 * 期限切れ・期限間近の車検証一覧を取得
 */
export const useExpiredCarInspectionData = (options?: UseCarInspectionDataOptions) => {
  const backend = useApiBackend();

  if (backend === 'cloudflare') {
    return useJsonPlaceholderData("/api/carInspect/not-current-or-about-expire", {
      method: "GET",
      lazy: options?.lazy ?? true,
      cache: options?.cache ?? false,
      transform: (v) => v ?? undefined,
    });
  } else {
    return useFetch<CarInspectionSchema[]>('/api/grpc/car-inspections', {
      method: 'POST',
      body: { method: 'listExpiredOrAboutToExpire', params: {} },
      lazy: options?.lazy ?? true,
      transform: (response: { carInspections?: Record<string, unknown>[] }) => {
        if (!response?.carInspections) return undefined;
        return response.carInspections.map(mapGrpcToSchema);
      },
    });
  }
};
