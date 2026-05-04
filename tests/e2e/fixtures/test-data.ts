import { getE2eBootstrapState } from "@/tests/e2e/fixtures/bootstrap";

const bootstrap = getE2eBootstrapState();

export const testBranch = {
  id: bootstrap.branchId,
  name: "성수"
} as const;

export const testSession = {
  id: bootstrap.sessionId,
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
  nickname: "민수",
  age: "29",
  job: "Engineer",
  jobCategory: "IT"
} as const;

export const adminUser = {
  email: bootstrap.admin.email,
  password: bootstrap.admin.password,
  cookieValue: bootstrap.admin.cookieValue
} as const;

export const qrUrls = {
  valid: bootstrap.qrUrls.tableA,
  revoked: bootstrap.qrUrls.revokedTableA,
  regenerated: bootstrap.qrUrls.regeneratedTableA,
  validTableLabel: "테이블 1",
  revokedTableLabel: "테이블 1",
  regeneratedTableLabel: "테이블 1"
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
