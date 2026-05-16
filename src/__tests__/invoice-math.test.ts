import { round2, computeLineItem, sumTotals } from "@/lib/invoice-math"

describe("round2", () => {
  it("rounds to 2 decimals", () => {
    expect(round2(1.005)).toBe(1.01)
    expect(round2(2.224999)).toBe(2.22)
    expect(round2(9000)).toBe(9000)
    expect(round2(0)).toBe(0)
  })
  it("handles floating point edge cases", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3)
    expect(round2(1.255)).toBe(1.26)
  })
})

describe("computeLineItem — exclusive VAT", () => {
  it("computes net, VAT, gross for a standard 23% line", () => {
    const r = computeLineItem({ quantity: 2, unitPrice: 1500, vatRate: 23 })
    expect(r.netAmount).toBe(3000)
    expect(r.vatAmount).toBe(690)
    expect(r.grossAmount).toBe(3690)
  })
  it("handles 0% VAT (foreign B2B exempt)", () => {
    const r = computeLineItem({ quantity: 1, unitPrice: 9000, vatRate: 0 })
    expect(r.netAmount).toBe(9000)
    expect(r.vatAmount).toBe(0)
    expect(r.grossAmount).toBe(9000)
  })
  it("handles 8% reduced rate", () => {
    const r = computeLineItem({ quantity: 3, unitPrice: 100, vatRate: 8 })
    expect(r.netAmount).toBe(300)
    expect(r.vatAmount).toBe(24)
    expect(r.grossAmount).toBe(324)
  })
  it("rounds fractional quantities cleanly", () => {
    const r = computeLineItem({ quantity: 1.5, unitPrice: 33.33, vatRate: 23 })
    expect(r.netAmount).toBe(50)
    expect(r.vatAmount).toBe(11.5)
    expect(r.grossAmount).toBe(61.5)
  })
})

describe("computeLineItem — inclusive VAT (Ninja imports)", () => {
  it("back-derives net from a VAT-inclusive unit price", () => {
    const r = computeLineItem({ quantity: 1, unitPrice: 123, vatRate: 23, inclusive: true })
    expect(r.grossAmount).toBe(123)
    expect(r.netAmount).toBe(100)
    expect(r.vatAmount).toBe(23)
  })
  it("inclusive with 0% VAT behaves like exclusive", () => {
    const r = computeLineItem({ quantity: 2, unitPrice: 50, vatRate: 0, inclusive: true })
    expect(r.netAmount).toBe(100)
    expect(r.grossAmount).toBe(100)
  })
})

describe("sumTotals", () => {
  it("sums multiple line items", () => {
    const items = [
      computeLineItem({ quantity: 2, unitPrice: 1500, vatRate: 23 }),
      computeLineItem({ quantity: 1, unitPrice: 9000, vatRate: 0 }),
    ]
    const t = sumTotals(items)
    expect(t.subtotal).toBe(12000)
    expect(t.vatTotal).toBe(690)
    expect(t.total).toBe(12690)
  })
  it("returns zeros for an empty invoice", () => {
    const t = sumTotals([])
    expect(t).toEqual({ subtotal: 0, vatTotal: 0, total: 0 })
  })
  it("handles negative line items (credit note)", () => {
    const original = computeLineItem({ quantity: 1, unitPrice: 1000, vatRate: 23 })
    const negated = { netAmount: -original.netAmount, vatAmount: -original.vatAmount, grossAmount: -original.grossAmount }
    const t = sumTotals([negated])
    expect(t.subtotal).toBe(-1000)
    expect(t.vatTotal).toBe(-230)
    expect(t.total).toBe(-1230)
  })
})
