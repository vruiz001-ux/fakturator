// Expensify Integration Service
// API: https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations

const API_URL = "https://integrations.expensify.com/Integration-Server/ExpensifyIntegrations"

export interface ExpensifyCredentials {
  partnerUserID: string
  partnerUserSecret: string
}

export interface ExpensifyExpense {
  merchant: string
  amount: number // in cents (e.g., 3440 = €34.40)
  currency: string
  date: string
  category: string
}

export interface ExpensifyReport {
  reportName: string
  total: number // in cents
  currency: string
  expenses: ExpensifyExpense[]
}

export interface ExpensifyImportResult {
  reports: number
  expenses: number
  imported: number
  errors: string[]
  currencies: string[]
}

// Test connection by fetching policy list
export async function testConnection(creds: ExpensifyCredentials): Promise<{ success: boolean; error?: string }> {
  try {
    const params = new URLSearchParams()
    params.append("requestJobDescription", JSON.stringify({
      type: "get",
      credentials: { partnerUserID: creds.partnerUserID, partnerUserSecret: creds.partnerUserSecret },
      inputSettings: { type: "policyList" },
    }))

    const res = await fetch(API_URL, {
      method: "POST",
      body: params,
      signal: AbortSignal.timeout(15000),
    })

    const data = await res.json()
    if (data.responseCode === 200) {
      return { success: true }
    }
    return { success: false, error: data.responseMessage || "Connection failed" }
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" }
  }
}

// Export all expenses as JSON
export async function fetchExpenses(creds: ExpensifyCredentials, startDate = "2024-01-01", endDate = "2026-12-31"): Promise<ExpensifyReport[]> {
  // Step 1: Request export with template
  const template = '[<#list reports as report>{"reportName":"${report.reportName}","total":${report.total},"currency":"${report.currency}","expenses":[<#list report.transactionList as expense>{"merchant":"${expense.merchant}","amount":${expense.amount},"currency":"${expense.currency}","date":"${expense.posted}","category":"${expense.category}"}<#if expense_has_next>,</#if></#list>]}<#if report_has_next>,</#if></#list>]'

  const exportParams = new URLSearchParams()
  exportParams.append("requestJobDescription", JSON.stringify({
    type: "file",
    credentials: { partnerUserID: creds.partnerUserID, partnerUserSecret: creds.partnerUserSecret },
    onReceive: { immediateResponse: ["returnRandomFileName"] },
    inputSettings: {
      type: "combinedReportData",
      filters: { startDate, endDate },
    },
    outputSettings: { fileExtension: "json" },
  }))
  exportParams.append("template", template)

  const exportRes = await fetch(API_URL, {
    method: "POST",
    body: exportParams,
    signal: AbortSignal.timeout(30000),
  })

  const fileName = await exportRes.text()
  if (!fileName || fileName.includes("responseCode")) {
    throw new Error("Failed to create expense export")
  }

  // Step 2: Download the file
  const downloadParams = new URLSearchParams()
  downloadParams.append("requestJobDescription", JSON.stringify({
    type: "download",
    credentials: { partnerUserID: creds.partnerUserID, partnerUserSecret: creds.partnerUserSecret },
    fileName: fileName.trim(),
  }))

  const downloadRes = await fetch(API_URL, {
    method: "POST",
    body: downloadParams,
    signal: AbortSignal.timeout(30000),
  })

  const reports: ExpensifyReport[] = await downloadRes.json()
  return reports
}
