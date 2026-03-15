"use client"

import { useState, useEffect } from "react"
import {
  ArrowRight, RefreshCw, Lock, Unlock, AlertCircle, CheckCircle2,
  TrendingUp, DollarSign, Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { formatCurrency } from "@/lib/formatters"

export interface FxConversionDisplay {
  originalAmount: number
  originalCurrency: string
  targetCurrency: string
  rate: number
  rateDate: string
  rateSource: string
  convertedAmount: number
  upliftPercent: number
  upliftAmount: number
  finalAmount: number
}

interface FxRebillPanelProps {
  expenseId: string
  originalAmount: number
  originalCurrency: string
  targetCurrency?: string
  isLocked?: boolean
  existingConversion?: FxConversionDisplay
  onRecalculate?: (upliftPercent: number) => void
  onLock?: () => void
  onUnlock?: () => void
}

// Mock FX rates for demo
const MOCK_RATES: Record<string, Record<string, number>> = {
  PLN: { EUR: 0.2326, USD: 0.2533, GBP: 0.1996 },
  USD: { EUR: 0.9183, PLN: 3.9475, GBP: 0.7882 },
  GBP: { EUR: 1.1651, PLN: 5.0085, USD: 1.2688 },
  CHF: { EUR: 1.0228, PLN: 4.3959, USD: 1.1137 },
}

function calculateConversion(
  amount: number,
  from: string,
  to: string,
  upliftPct: number
): FxConversionDisplay | null {
  if (from === to) return null
  const rate = MOCK_RATES[from]?.[to]
  if (!rate) return null

  const converted = Math.round(amount * rate * 100) / 100
  const uplift = Math.round(converted * (upliftPct / 100) * 100) / 100
  return {
    originalAmount: amount,
    originalCurrency: from,
    targetCurrency: to,
    rate,
    rateDate: new Date().toISOString(),
    rateSource: "MOCK",
    convertedAmount: converted,
    upliftPercent: upliftPct,
    upliftAmount: uplift,
    finalAmount: Math.round((converted + uplift) * 100) / 100,
  }
}

export function FxRebillPanel({
  expenseId,
  originalAmount,
  originalCurrency,
  targetCurrency = "EUR",
  isLocked = false,
  existingConversion,
  onRecalculate,
  onLock,
  onUnlock,
}: FxRebillPanelProps) {
  const [upliftPercent, setUpliftPercent] = useState(existingConversion?.upliftPercent ?? 5)
  const [conversion, setConversion] = useState<FxConversionDisplay | null>(
    existingConversion ?? null
  )
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!existingConversion) {
      const calc = calculateConversion(originalAmount, originalCurrency, targetCurrency, upliftPercent)
      setConversion(calc)
    }
  }, [])

  const handleRecalculate = () => {
    if (isLocked) return
    setRefreshing(true)
    setTimeout(() => {
      const calc = calculateConversion(originalAmount, originalCurrency, targetCurrency, upliftPercent)
      setConversion(calc)
      onRecalculate?.(upliftPercent)
      setRefreshing(false)
    }, 500)
  }

  if (originalCurrency === targetCurrency) {
    return null
  }

  return (
    <Card className="border-indigo-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-indigo-500" />
            FX Conversion & Rebilling
          </CardTitle>
          {isLocked ? (
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              <Lock className="h-3 w-3" />
              Locked
            </Badge>
          ) : (
            <Badge variant="default" className="text-xs">Editable</Badge>
          )}
        </div>
        <CardDescription>
          Converting from {originalCurrency} to {targetCurrency} with FX margin
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {conversion ? (
          <>
            {/* Conversion flow */}
            <div className="rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Original</p>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(conversion.originalAmount, conversion.originalCurrency)}
                  </p>
                  <p className="text-xs text-slate-400">{conversion.originalCurrency}</p>
                </div>

                <div className="flex flex-col items-center px-4">
                  <ArrowRight className="h-5 w-5 text-indigo-400" />
                  <p className="text-[10px] text-indigo-500 mt-1 font-medium">
                    @ {conversion.rate.toFixed(4)}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-400 mb-1">Converted</p>
                  <p className="text-lg font-bold text-slate-700">
                    {formatCurrency(conversion.convertedAmount, conversion.targetCurrency)}
                  </p>
                  <p className="text-xs text-slate-400">{conversion.targetCurrency}</p>
                </div>

                <div className="flex flex-col items-center px-4">
                  <TrendingUp className="h-5 w-5 text-amber-400" />
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    +{conversion.upliftPercent}%
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-emerald-500 mb-1">Rebill Amount</p>
                  <p className="text-xl font-bold text-emerald-600">
                    {formatCurrency(conversion.finalAmount, conversion.targetCurrency)}
                  </p>
                  <p className="text-xs text-emerald-500">{conversion.targetCurrency}</p>
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Exchange rate</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-1">
                      <span className="font-mono text-slate-700">
                        1 {conversion.originalCurrency} = {conversion.rate.toFixed(4)} {conversion.targetCurrency}
                      </span>
                      <Info className="h-3 w-3 text-slate-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Source: {conversion.rateSource}</p>
                      <p>Date: {new Date(conversion.rateDate).toLocaleDateString()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Converted amount</span>
                <span className="text-slate-700">{formatCurrency(conversion.convertedAmount, conversion.targetCurrency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  FX uplift ({conversion.upliftPercent}%)
                </span>
                <span className="font-medium text-amber-600">
                  +{formatCurrency(conversion.upliftAmount, conversion.targetCurrency)}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-900">Final rebill amount</span>
                <span className="font-bold text-emerald-600 text-base">
                  {formatCurrency(conversion.finalAmount, conversion.targetCurrency)}
                </span>
              </div>
            </div>

            {/* Uplift control */}
            {!isLocked && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">FX Uplift %</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={upliftPercent}
                        onChange={(e) => setUpliftPercent(parseFloat(e.target.value) || 0)}
                        className="h-8 w-24 text-sm"
                        disabled={isLocked}
                      />
                      <span className="text-sm text-slate-400">%</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRecalculate}
                    disabled={isLocked}
                    loading={refreshing}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Recalculate
                  </Button>
                </div>
              </>
            )}

            {/* Lock/Unlock */}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <Lock className="h-4 w-4 text-slate-400" />
                ) : (
                  <Unlock className="h-4 w-4 text-indigo-500" />
                )}
                <div>
                  <p className="text-xs font-medium text-slate-700">
                    {isLocked ? "Conversion locked" : "Lock conversion"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {isLocked
                      ? "Rate and amount are fixed for invoicing"
                      : "Lock to prevent recalculation once added to invoice"}
                  </p>
                </div>
              </div>
              <Button
                variant={isLocked ? "outline" : "secondary"}
                size="sm"
                onClick={isLocked ? onUnlock : onLock}
              >
                {isLocked ? "Unlock" : "Lock"}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <AlertCircle className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">
              No exchange rate available for {originalCurrency} to {targetCurrency}
            </p>
            <Button variant="outline" size="sm" onClick={handleRecalculate}>
              Try Again
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
