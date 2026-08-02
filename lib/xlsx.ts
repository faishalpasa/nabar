import ExcelJS from "exceljs"

import { formatDateTime } from "@/lib/format"
import type { GroupOverview, TransactionFeedRow } from "@/lib/types"

const TYPE_LABEL: Record<TransactionFeedRow["type"], string> = {
  deposit: "Setor",
  withdrawal: "Tarik",
}

const STATUS_LABEL: Record<TransactionFeedRow["status"], string> = {
  pending: "Menunggu",
  verified: "Terverifikasi",
  rejected: "Ditolak",
}

const AMOUNT_FORMAT = "#,##0"

/** Nama file aman untuk header Content-Disposition, tanpa karakter path. */
export function filenameFor(groupName: string) {
  const slug = groupName
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
  return `riwayat-${slug || "tabungan"}.xlsx`
}

export async function buildHistoryWorkbook(
  group: GroupOverview,
  rows: TransactionFeedRow[],
) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Riwayat")

  sheet.columns = [
    { width: 18 },
    { width: 22 },
    { width: 10 },
    { width: 16 },
    { width: 16 },
    { width: 30 },
  ]

  sheet.addRow([`Riwayat Tabungan: ${group.name}`]).font = {
    bold: true,
    size: 13,
  }
  sheet.addRow([])

  const header = sheet.addRow([
    "Tanggal",
    "Pencatat",
    "Tipe",
    "Nominal",
    "Status",
    "Catatan",
  ])
  header.font = { bold: true }

  for (const row of rows) {
    sheet.addRow([
      formatDateTime(row.created_at),
      row.display_name,
      TYPE_LABEL[row.type],
      Number(row.signed_amount),
      STATUS_LABEL[row.status],
      row.note ?? "-",
    ])
  }

  sheet.addRow([])

  const addSummaryRow = (label: string, value: number) => {
    const row = sheet.addRow(["", "", label, value])
    row.font = { bold: true }
  }

  addSummaryRow("Total Setoran", Number(group.total_deposits))
  addSummaryRow("Total Ditarik", Number(group.total_withdrawals))
  addSummaryRow("Saldo", Number(group.balance))

  sheet.getColumn(4).numFmt = AMOUNT_FORMAT

  return workbook.xlsx.writeBuffer()
}
