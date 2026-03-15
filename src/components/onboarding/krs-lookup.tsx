"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search, Building2, CheckCircle2, AlertCircle, Loader2,
  X, MapPin, Hash, Info, FileText, CreditCard,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { KrsSearchResult, KrsCompanyRecord, CompanySourceMetadata } from "@/services/krs/krs.types"
import type { CompanySetup, BillingSetup } from "@/lib/onboarding/onboarding.types"
import { mapKrsToOnboarding } from "@/services/krs/krs-autofill.service"
import { logAudit } from "@/lib/audit/audit.service"

type LookupMethod = "nip" | "name" | "krs"

interface KrsLookupProps {
  onCompanySelected: (
    company: Partial<CompanySetup>,
    billing: Partial<BillingSetup>,
    metadata: CompanySourceMetadata,
    filledFields: string[]
  ) => void
  currentSourceMetadata?: CompanySourceMetadata | null
  onClear?: () => void
}

export function KrsLookup({ onCompanySelected, currentSourceMetadata, onClear }: KrsLookupProps) {
  const [method, setMethod] = useState<LookupMethod>("nip")
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<KrsSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<KrsCompanyRecord | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [nipValidation, setNipValidation] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const queryRef = useRef(query)
  queryRef.current = query

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ─── NIP Lookup ──────────────────────────────────────────

  const handleNipLookup = useCallback(async () => {
    const cleaned = queryRef.current.replace(/[\s\-]/g, "")
    if (cleaned.length !== 10) {
      setNipValidation("NIP must be exactly 10 digits")
      return
    }
    if (!/^\d{10}$/.test(cleaned)) {
      setNipValidation("NIP must contain only digits")
      return
    }
    setNipValidation(null)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/krs?nip=${encodeURIComponent(cleaned)}`)
      const data = await res.json()

      if (data.found && data.company) {
        setSelectedCompany(data.company)
        applyCompany(data.company, "NIP")
      } else {
        setError(data.error || "No company found for this NIP")
      }
    } catch {
      setError("Failed to connect to registry")
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Name / KRS Search ──────────────────────────────────

  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setError(null)
    setNipValidation(null)

    if (method === "nip") return // NIP uses explicit button

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 3) {
      setResults([])
      setShowResults(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const param = method === "krs" ? `krs=${encodeURIComponent(value.trim())}` : `q=${encodeURIComponent(value.trim())}`
        const res = await fetch(`/api/krs?${param}`)
        const data = await res.json()

        if (method === "krs" && data.found && data.company) {
          setSelectedCompany(data.company)
          applyCompany(data.company, "KRS")
        } else if (data.results) {
          setResults(data.results || [])
          setShowResults(true)
          if (data.error) setError(data.error)
        } else if (data.error) {
          setError(data.error)
        }
      } catch {
        setError("Failed to search registry")
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [method])

  // ─── Select from results ────────────────────────────────

  const handleSelect = async (result: KrsSearchResult) => {
    setShowResults(false)
    setLoadingDetails(true)
    setError(null)

    try {
      // Try NIP first (more reliable data), fall back to KRS
      const param = result.nip ? `nip=${result.nip}` : `krs=${result.krsNumber}`
      const res = await fetch(`/api/krs?${param}`)
      const data = await res.json()

      if (data.found && data.company) {
        setSelectedCompany(data.company)
        applyCompany(data.company, result.nip ? "NIP" : "KRS")
      } else {
        setError(data.error || "Company details not available")
      }
    } catch {
      setError("Failed to fetch company details")
    } finally {
      setLoadingDetails(false)
    }
  }

  // ─── Apply company data ─────────────────────────────────

  const applyCompany = (company: KrsCompanyRecord, lookupMethod: string) => {
    const autofill = mapKrsToOnboarding(company)

    autofill.metadata.sourceType = "KRS"
    ;(autofill.metadata as any).lookupMethod = lookupMethod

    onCompanySelected(autofill.company, autofill.billing, autofill.metadata, autofill.filledFields)

    logAudit({
      action: "COMPANY_SETTINGS_UPDATED",
      entityType: "ORGANIZATION",
      actor: "SYSTEM",
      success: true,
      details: {
        source: lookupMethod,
        nip: company.nip,
        krsNumber: company.krsNumber,
        filledFields: autofill.filledFields,
      },
    })
  }

  const handleClear = () => {
    setSelectedCompany(null)
    setQuery("")
    setResults([])
    setError(null)
    setNipValidation(null)
    onClear?.()
  }

  // ─── Already imported ───────────────────────────────────

  if (currentSourceMetadata?.sourceType === "KRS" && currentSourceMetadata.sourceId && !selectedCompany) {
    const lookupMethod = (currentSourceMetadata as any).lookupMethod || "KRS"
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-900">
                Company imported from {lookupMethod === "NIP" ? "NIP registry" : "KRS"}
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">
                {currentSourceMetadata.sourceId.length === 10 && currentSourceMetadata.sourceId.match(/^\d/)
                  ? `NIP: ${currentSourceMetadata.sourceId}`
                  : `KRS: ${currentSourceMetadata.sourceId}`}
                {" "}· Fetched {currentSourceMetadata.fetchedAt ? new Date(currentSourceMetadata.fetchedAt).toLocaleDateString() : "recently"}
              </p>
              {currentSourceMetadata.overriddenFields.length > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  {currentSourceMetadata.overriddenFields.length} field(s) manually edited
                </p>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-xs text-slate-400">
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>
    )
  }

  // ─── Selected company card ──────────────────────────────

  if (selectedCompany) {
    return (
      <div className="space-y-3">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 shrink-0">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedCompany.name}</p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                    {selectedCompany.nip && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        NIP: {selectedCompany.nip}
                      </span>
                    )}
                    {selectedCompany.krsNumber && (
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        KRS: {selectedCompany.krsNumber}
                      </span>
                    )}
                    {selectedCompany.regon && <span>REGON: {selectedCompany.regon}</span>}
                    {selectedCompany.address.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedCompany.address.city}
                      </span>
                    )}
                  </div>
                  {selectedCompany.legalForm && (
                    <Badge variant="secondary" className="mt-1.5 text-[10px]">{selectedCompany.legalForm}</Badge>
                  )}
                  <Badge variant="success" className="mt-1.5 ml-1 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" />
                    Fields auto-filled
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-xs text-slate-400">
                <X className="h-3 w-3 mr-1" />
                Change
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Info className="h-3 w-3" />
          <span>You can edit any auto-filled fields below. Changes are tracked.</span>
        </div>
      </div>
    )
  }

  // ─── Search form ────────────────────────────────────────

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
        <div className="flex items-start gap-3 mb-3">
          <Search className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-900">Find your company</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Search by NIP, company name, or KRS number to auto-fill your details
            </p>
          </div>
        </div>

        {/* Method tabs */}
        <div className="flex gap-1 mb-3 rounded-lg bg-white/70 p-1">
          {([
            { key: "nip" as const, label: "NIP", icon: CreditCard, desc: "Fastest" },
            { key: "name" as const, label: "Company Name", icon: Building2, desc: "" },
            { key: "krs" as const, label: "KRS Number", icon: FileText, desc: "" },
          ]).map((m) => (
            <button
              key={m.key}
              onClick={() => { setMethod(m.key); setQuery(""); setResults([]); setError(null); setNipValidation(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                method === m.key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white"
              }`}
            >
              <m.icon className="h-3.5 w-3.5" />
              {m.label}
              {m.desc && method === m.key && (
                <Badge className="text-[9px] h-3.5 px-1 bg-indigo-500/30 text-white border-0">{m.desc}</Badge>
              )}
            </button>
          ))}
        </div>

        {/* NIP input */}
        {method === "nip" && (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setNipValidation(null); setError(null) }}
                onKeyDown={(e) => e.key === "Enter" && handleNipLookup()}
                placeholder="Enter 10-digit NIP (e.g., 7342867148)"
                className="pl-9 bg-white"
                maxLength={13}
              />
            </div>
            <Button onClick={handleNipLookup} disabled={loading || query.replace(/[\s\-]/g, "").length < 10}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Look up
            </Button>
          </div>
        )}

        {/* Name / KRS input */}
        {method !== "nip" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={method === "krs" ? "Enter KRS number (e.g., 0000331533)" : "Type company name..."}
              className="pl-9 bg-white"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500 animate-spin" />
            )}
          </div>
        )}

        {/* NIP validation error */}
        {nipValidation && (
          <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            {nipValidation}
          </p>
        )}

        {/* Loading details */}
        {loadingDetails && (
          <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching company details from registry...
          </div>
        )}

        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
            {results.map((result) => (
              <button
                key={result.krsNumber || result.nip}
                onClick={() => handleSelect(result)}
                className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-indigo-50 border-b border-slate-100 last:border-0"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 shrink-0 mt-0.5">
                  <Building2 className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{result.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    {result.nip && <span className="text-xs text-slate-400">NIP: {result.nip}</span>}
                    {result.krsNumber && <span className="text-xs text-slate-400">KRS: {result.krsNumber}</span>}
                    {result.city && <span className="text-xs text-slate-400">{result.city}</span>}
                    {result.legalForm && (
                      <Badge variant="secondary" className="text-[10px] h-4">{result.legalForm}</Badge>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {showResults && results.length === 0 && !loading && query.length >= 3 && method !== "nip" && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-center">
            <p className="text-sm text-slate-500">No companies found</p>
            <p className="text-xs text-slate-400 mt-1">Try searching by NIP for a direct registry lookup</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center">
        or enter your company details manually below
      </p>
    </div>
  )
}
