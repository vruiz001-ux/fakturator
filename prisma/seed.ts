import { PrismaClient } from "../src/generated/prisma"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create organization
  const org = await prisma.organization.create({
    data: {
      id: "org1",
      name: "InvoicePilot Sp. z o.o.",
      address: "ul. Nowy Świat 35",
      city: "Warszawa",
      postalCode: "00-029",
      country: "PL",
      nip: "5272987654",
      phone: "+48 22 123 4567",
      email: "kontakt@invoicepilot.pl",
      bankName: "mBank S.A.",
      bankAccount: "PL 12 1140 2004 0000 3102 7890 1234",
      defaultCurrency: "PLN",
      defaultVatRate: 23,
      defaultPaymentDays: 14,
    },
  })

  // Create user
  const passwordHash = await hash("demo123", 12)
  await prisma.user.create({
    data: {
      id: "user1",
      email: "demo@invoicepilot.pl",
      name: "Vincent Ruiz",
      passwordHash,
      role: "OWNER",
      organizationId: org.id,
    },
  })

  // Create tax settings
  await prisma.taxSetting.create({
    data: {
      organizationId: org.id,
      vatRates: [23, 8, 5, 0],
      defaultVatRate: 23,
      fiscalYearStart: 1,
    },
  })

  // Create expense categories
  const categories = await Promise.all([
    prisma.expenseCategory.create({ data: { organizationId: org.id, name: "Software & Tools", color: "#6366f1", icon: "laptop", isDefault: true } }),
    prisma.expenseCategory.create({ data: { organizationId: org.id, name: "Office Supplies", color: "#f59e0b", icon: "package", isDefault: true } }),
    prisma.expenseCategory.create({ data: { organizationId: org.id, name: "Marketing", color: "#10b981", icon: "megaphone", isDefault: true } }),
    prisma.expenseCategory.create({ data: { organizationId: org.id, name: "Travel", color: "#3b82f6", icon: "plane", isDefault: true } }),
    prisma.expenseCategory.create({ data: { organizationId: org.id, name: "Professional Services", color: "#8b5cf6", icon: "briefcase", isDefault: true } }),
    prisma.expenseCategory.create({ data: { organizationId: org.id, name: "Rent & Utilities", color: "#ef4444", icon: "home", isDefault: true } }),
  ])

  // Create services
  const services = await Promise.all([
    prisma.service.create({ data: { organizationId: org.id, name: "Web Development", description: "Full-stack web application development", defaultRate: 200, defaultUnit: "HOUR", defaultVatRate: 23, category: "Development" } }),
    prisma.service.create({ data: { organizationId: org.id, name: "UI/UX Design", description: "User interface and experience design", defaultRate: 180, defaultUnit: "HOUR", defaultVatRate: 23, category: "Design" } }),
    prisma.service.create({ data: { organizationId: org.id, name: "Consulting", description: "Technical and business consulting", defaultRate: 300, defaultUnit: "HOUR", defaultVatRate: 23, category: "Consulting" } }),
    prisma.service.create({ data: { organizationId: org.id, name: "Monthly Maintenance", description: "Website and application maintenance package", defaultRate: 2500, defaultUnit: "MONTH", defaultVatRate: 23, category: "Maintenance" } }),
    prisma.service.create({ data: { organizationId: org.id, name: "SEO & Marketing", description: "Search engine optimization and digital marketing", defaultRate: 3500, defaultUnit: "MONTH", defaultVatRate: 23, category: "Marketing" } }),
  ])

  // Create clients
  const clients = await Promise.all([
    prisma.client.create({ data: { organizationId: org.id, name: "TechVenture Sp. z o.o.", email: "kontakt@techventure.pl", phone: "+48 22 123 4567", address: "ul. Marszałkowska 100", city: "Warszawa", postalCode: "00-001", nip: "5272987654", contactPerson: "Anna Nowak", notes: "Premium client", tags: ["premium", "tech"] } }),
    prisma.client.create({ data: { organizationId: org.id, name: "Digital Dreams S.A.", email: "biuro@digitaldreams.pl", phone: "+48 71 555 7890", address: "ul. Świdnicka 33", city: "Wrocław", postalCode: "50-066", nip: "8991234567", contactPerson: "Marek Wiśniewski", tags: ["agency", "design"] } }),
    prisma.client.create({ data: { organizationId: org.id, name: "GreenBuild Sp. z o.o.", email: "office@greenbuild.pl", phone: "+48 12 444 5678", address: "ul. Floriańska 15", city: "Kraków", postalCode: "31-021", nip: "6762345678", contactPerson: "Katarzyna Zielińska", tags: ["construction"] } }),
    prisma.client.create({ data: { organizationId: org.id, name: "Nordic Imports Sp. z o.o.", email: "info@nordicimports.pl", phone: "+48 58 333 2211", address: "ul. Długa 45", city: "Gdańsk", postalCode: "80-831", nip: "5832345678", contactPerson: "Piotr Lewandowski", tags: ["import", "international"] } }),
    prisma.client.create({ data: { organizationId: org.id, name: "StartupHub Fundacja", email: "hello@startuphub.pl", phone: "+48 61 222 3344", address: "ul. Półwiejska 20", city: "Poznań", postalCode: "61-888", nip: "7792345678", contactPerson: "Tomasz Kaczmarek", tags: ["startup", "tech"] } }),
  ])

  // Create invoices
  const now = new Date()
  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        organizationId: org.id, clientId: clients[0].id, invoiceNumber: "FV/2026/03/001", type: "VAT", status: "PAID",
        issueDate: new Date("2026-03-01"), saleDate: new Date("2026-03-01"), dueDate: new Date("2026-03-15"),
        subtotal: 16000, vatTotal: 3680, total: 19680, paidAmount: 19680,
        items: { create: [{ serviceId: services[0].id, description: "Web Development - Phase 2", quantity: 80, unit: "HOUR", unitPrice: 200, vatRate: 23, netAmount: 16000, vatAmount: 3680, grossAmount: 19680 }] },
      },
    }),
    prisma.invoice.create({
      data: {
        organizationId: org.id, clientId: clients[1].id, invoiceNumber: "FV/2026/03/002", type: "VAT", status: "SENT",
        issueDate: new Date("2026-03-05"), saleDate: new Date("2026-03-05"), dueDate: new Date("2026-03-19"),
        subtotal: 12300, vatTotal: 2829, total: 15129, paidAmount: 0,
        items: { create: [
          { serviceId: services[1].id, description: "UI/UX Design - Mobile App", quantity: 40, unit: "HOUR", unitPrice: 180, vatRate: 23, netAmount: 7200, vatAmount: 1656, grossAmount: 8856 },
          { serviceId: services[0].id, description: "Frontend Development", quantity: 25.5, unit: "HOUR", unitPrice: 200, vatRate: 23, netAmount: 5100, vatAmount: 1173, grossAmount: 6273, sortOrder: 1 },
        ]},
      },
    }),
    prisma.invoice.create({
      data: {
        organizationId: org.id, clientId: clients[2].id, invoiceNumber: "FV/2026/03/003", type: "VAT", status: "OVERDUE",
        issueDate: new Date("2026-02-15"), saleDate: new Date("2026-02-15"), dueDate: new Date("2026-03-01"),
        subtotal: 4920, vatTotal: 1131.6, total: 6051.6, paidAmount: 0,
        items: { create: [{ serviceId: services[2].id, description: "Technical Consulting", quantity: 16.4, unit: "HOUR", unitPrice: 300, vatRate: 23, netAmount: 4920, vatAmount: 1131.6, grossAmount: 6051.6 }] },
      },
    }),
  ])

  // Create payments
  await prisma.payment.create({
    data: { invoiceId: invoices[0].id, amount: 19680, date: new Date("2026-03-10"), method: "BANK_TRANSFER", reference: "FV/2026/03/001" },
  })

  // Create expenses
  await Promise.all([
    prisma.expense.create({ data: { organizationId: org.id, categoryId: categories[0].id, description: "GitHub Team Plan", date: new Date("2026-03-01"), netAmount: 189, vatRate: 23, vatAmount: 43.47, grossAmount: 232.47 } }),
    prisma.expense.create({ data: { organizationId: org.id, categoryId: categories[2].id, description: "Google Ads Campaign", date: new Date("2026-03-05"), netAmount: 2500, vatRate: 23, vatAmount: 575, grossAmount: 3075 } }),
    prisma.expense.create({ data: { organizationId: org.id, categoryId: categories[5].id, description: "Office Rent - March", date: new Date("2026-03-01"), netAmount: 4500, vatRate: 23, vatAmount: 1035, grossAmount: 5535 } }),
  ])

  console.log("Seed complete!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
