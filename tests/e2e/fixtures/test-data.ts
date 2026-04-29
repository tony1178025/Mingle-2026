export const testBranch = {
  id: "branch_seongsu",
  name: "성수"
} as const;

export const testSession = {
  id: "session_signature_20260412",
  round1Phase: "ROUND_1",
  round2Phase: "ROUND_2"
} as const;

export const testTables = [
  { label: "테이블 1", id: 1 },
  { label: "테이블 2", id: 2 }
] as const;

export const round1Participant = {
  nickname: "참가자",
  profileImage: "/avatars/male-default.png",
  tableLabel: "테이블 1"
} as const;

export const round2Participant = {
  nickname: "참가자",
  age: "29",
  job: "Engineer",
  jobCategory: "IT"
} as const;

export const adminUser = {
  email: "hq_admin@mingle.local",
  password: "bootstrap-password"
} as const;

export const qrUrls = {
  valid: "/customer?branchId=branch_seongsu&tableId=1&code=1111",
  revoked: "/customer?branchId=branch_seongsu&tableId=1&code=revoked-1111",
  regenerated: "/customer?branchId=branch_seongsu&tableId=1&code=new-2222"
} as const;

export type CustomerOnboardingData = {
  qrUrl: string;
  nickname: string;
  age: string;
  jobCategory: string;
  job: string;
  heightCm: string;
  animalType: string;
  energyType: "E" | "I";
};

export const testCustomerProfile: CustomerOnboardingData = {
  qrUrl: qrUrls.valid,
  nickname: "테스트참가자",
  age: "29",
  jobCategory: "IT",
  job: "Engineer",
  heightCm: "175",
  animalType: "외모:단정|성향:차분",
  energyType: "E"
};

export const TEST_QR_URLS = {
  primaryTable: qrUrls.valid,
  revokedTable: qrUrls.revoked,
  regeneratedTable: qrUrls.regenerated
} as const;

export const TEST_PROFILES = {
  primary: testCustomerProfile
} as const;

export const TEST_DATA = {
  adminUser
} as const;
