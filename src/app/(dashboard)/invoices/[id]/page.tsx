import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getActiveOrgId } from "@/lib/server/active-org"
import { getInvoiceDetail } from "@/lib/server/invoice-data"
import { InvoiceDetailView } from "./invoice-detail-view"

export const dynamic = "force-dynamic"

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const invoice = await getInvoiceDetail(id, orgId)

  if (!invoice) {
    return (
      <div className="space-y-6 p-6">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back to invoices
        </Link>
        <Card>
          <div className="flex flex-col items-center justify-center px-4 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-medium text-slate-900">Invoice not found</h3>
            <p className="mt-1 max-w-sm text-center text-sm text-slate-500">
              No invoice matches this ID in your organization.
            </p>
            <Link href="/invoices" className="mt-4">
              <Button size="sm" variant="outline">Back to invoices</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return <InvoiceDetailView invoice={invoice} />
}
