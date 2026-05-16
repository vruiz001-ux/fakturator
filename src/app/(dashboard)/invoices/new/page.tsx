import { getInvoiceFormData } from "@/lib/server/invoice-create"
import { InvoiceForm } from "./invoice-form"

export const dynamic = "force-dynamic"

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>
}) {
  const { client } = await searchParams
  const data = await getInvoiceFormData()
  return <InvoiceForm data={data} presetClientId={client} />
}
