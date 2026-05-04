export const customerSelectors = {
  checkinInput: '[data-testid="checkin-input"]',
  checkinSubmit: "button:has-text('체크인 확인')",
  profileNicknamePlaceholder: "닉네임",
  profileAgePlaceholder: "나이",
  profileJobPlaceholder: "직무",
  profileCompleteButton: "완료",
  participantsTab: "button:has-text('참가자')",
  contentTab: "button:has-text('콘텐츠')",
  meTab: "button:has-text('설정')",
  reportTab: "button:has-text('설정')",
  reportTarget: '[data-testid="report-target"]',
  reportReason: '[data-testid="report-reason"]',
  reportDetails: '[data-testid="report-details"]',
  reportSubmit: '[data-testid="submit-report"]'
} as const;

export const adminSelectors = {
  dashboardTitle: "라이브 콘솔",
  topbar: ".admin-console-topbar",
  liveConsoleButton: "button:has-text('라이브 콘솔')",
  reportsButton: "button:has-text('신고/제재')",
  sessionPanel: '[data-testid="admin-live-ops-session-panel"]',
  tablesPanel: '[data-testid="admin-live-ops-tables-panel"]',
  participantsPanel: '[data-testid="admin-live-ops-participants-panel"]',
  contentPanel: '[data-testid="admin-live-ops-content-panel"]',
  reportsPanel: '[data-testid="admin-live-ops-content-selected-messages-panel"]',
  round1Button: "button:has-text('1라운드 시작')",
  breakButton: "button:has-text('휴식')",
  round2Button: "button:has-text('2라운드 시작')",
  closedButton: "button:has-text('세션 종료')",
  qrRegenerateButton: "button:has-text('QR 재생성')",
  qrRevokeButton: "button:has-text('QR 폐기')"
} as const;

export const selectors = {
  customer: customerSelectors,
  admin: adminSelectors
} as const;

export const CUSTOMER_SELECTORS = {
  tabs: {
    content: "콘텐츠"
  },
  content: {
    cardTitle: "현장 미션",
    cards: ".table-stage-card",
    bottomSheet: ".rotation-modal"
  }
} as const;

export const SELECTORS = selectors;
