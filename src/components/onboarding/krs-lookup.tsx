"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search, Building2, CheckCircle2, AlertCircle, Loader2,
  ExternalLink, X, MapPin, Hash, Info,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { KrsSearchResult, KrsCompanyRecord, CompanySourceMetadata } from "@/services/krs/krs.types"
import type { CompanySetup, BillingSetup } from "@/lib/onboarding/onboarding.types"

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
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<KrsSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<KrsCompanyRecord | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Debounced search
  const handleSearch = useCallback((value: string) => {
    setQuery(value)
    setError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 3) {
      setResults([])
      setShowResults(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/krs?q=${encodeURIComponent(value.trim())}`)
        const data = await res.json()
        setResults(data.results || [])
        setShowResults(true)
        if (data.error) setError(data.error)
      } catch {
        setError("Failed to search KRS registry")
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [])

  // Select a company from results
  const handleSelect = async (result: KrsSearchResult) => {
    setShowResults(false)
    setLoadingDetails(true)
    setError(null)

    try {
      const res = await fetch(`/api/krs?krs=${encodeURIComponent(result.krsNumber)}`)
      const data = await res.json()

      if (data.found && data.company) {
        setSelectedCompany(data.company)

        // Map to onboarding fields
        const { mapKrsToOnboarding } = await import("@/services/krs/krs-autofill.service")
        const autofill = mapKrsToOnboarding(data.company)

        onCompanySelected(autofill.company, autofill.billing, autofill.metadata, autofill.filledFields)

        // Audit
        const { logAudit } = await import("@/lib/audit/audit.service")
        logAudit({
          action: "COMPANY_SETTINGS_UPDATED",
          entityType: "ORGANIZATION",
          actor: "SYSTEM",
          success: true,
          details: {
            source: "KRS",
            krsNumber: result.krsNumber,
            filledFields: autofill.filledFields,
          },
        })
      } else {
        setError(data.error || "Company details not available")
      }
    } catch {
      setError("Failed to fetch company details from KRS")
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleClear = () => {
    setSelectedCompany(null)
    setQuery("")
    setResults([])
    setError(null)
    onClear?.()
  }

  // If already imported from KRS
  if (currentSourceMetadata?.sourceType === "KRS" && currentSourceMetadata.sourceId && !selectedCompany) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Company imported from KRS</p>
              <p className="text-xs text-emerald-600 mt-0.5">
                KRS: {currentSourceMetadata.sourceId} · Fetched {currentSourceMetadata.fetchedAt ? new Date(currentSourceMetadata.fetchedAt).toLocaleDateString() : "recently"}
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

  // Selected company card
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
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" />
                      KRS: {selectedCompany.krsNumber}
                    </span>
                    {selectedCompany.nip && <span>NIP: {selectedCompany.nip}</span>}
                    {selectedCompany.address.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedCompany.address.city}
                      </span>
                    )}
                  </div>
                  <Badge variant="success" className="mt-2 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-0.5" />
                    Fields auto-filled from KRS
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

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
        <div className="flex items-start gap-3 mb-3">
          <Search className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-indigo-900">Find your company in KRS</p>
            <p className="text-xs text-indigo-600 mt-0.5">
              Search by company name or enter your KRS number for instant lookup
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Company name or KRS number (e.g., 0000331533)..."
            className="pl-9 bg-white"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500 animate-spin" />
          )}
        </div>

        {/* Loading details */}
        {loadingDetails && (
          <div className="mt-3 flex items-center gap-2 text-sm text-indigo-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Fetching company details from KRS registry...
          </div>
        )}

        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white shadow-lg overflow-hidden">
            {results.map((result) => (
              <button
                key={result.krsNumber}
                onClick={() => handleSelect(result)}
                className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-indigo-50 border-b border-slate-100 last:border-0"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 shrink-0 mt-0.5">
                  <Building2 className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{result.name}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                    <span className="text-xs text-slate-400">KRS: {result.krsNumber}</span>
                    {result.nip && <span className="text-xs text-slate-400">NIP: {result.nip}</span>}
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
        {showResults && results.length === 0 && !loading && query.length >= 3 && (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-center">
            <p className="text-sm text-slate-500">No companies found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try entering the exact KRS number (10 digits) for a direct lookup
            </p>
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
