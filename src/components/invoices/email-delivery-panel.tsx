"use client"

import { useState } from "react"
import {
  Mail, Send, CheckCircle2, AlertCircle, Clock, RefreshCw,
  ChevronDown, ChevronUp, Plus, X, Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { formatDate } from "@/lib/formatters"

export type EmailEventStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "RESENT"

export interface EmailEvent {
  id: string
  status: EmailEventStatus
  recipients: string[]
  ccRecipients: string[]
  subject: string
  sentAt?: string
  errorMessage?: string
  isAutoSend: boolean
  triggeredBy?: string
  createdAt: string
}

interface EmailDeliveryPanelProps {
  invoiceId: string
  invoiceNumber: string
  clientName: string
  clientEmail?: string
  clientInvoiceEmail?: string
  clientFinanceEmail?: string
  clientCc?: string[]
  autoSendEnabled?: boolean
  events?: EmailEvent[]
  onSend?: (recipients: { to: string[]; cc: string[]; bcc: string[] }) => void
  onResend?: (eventId: string) => void
}

const statusConfig: Record<EmailEventStatus, { icon: any; color: string; label: string }> = {
  PENDING: { icon: Clock, color: "text-amber-500", label: "Pending" },
  SENT: { icon: CheckCircle2, color: "text-emerald-500", label: "Sent" },
  DELIVERED: { icon: CheckCircle2, color: "text-emerald-600", label: "Delivered" },
  FAILED: { icon: AlertCircle, color: "text-red-500", label: "Failed" },
  RESENT: { icon: RefreshCw, color: "text-blue-500", label: "Resent" },
}

// Mock events for demo
const mockEvents: EmailEvent[] = [
  {
    id: "ee1",
    status: "SENT",
    recipients: ["kontakt@techventure.pl"],
    ccRecipients: ["finance@fakturator.pl"],
    subject: "Invoice FV/2026/03/001 from Fakturator Sp. z o.o.",
    sentAt: "2026-03-01T14:30:00Z",
    isAutoSend: true,
    triggeredBy: "SYSTEM",
    createdAt: "2026-03-01T14:30:00Z",
  },
]

export function EmailDeliveryPanel({
  invoiceId,
  invoiceNumber,
  clientName,
  clientEmail,
  clientInvoiceEmail,
  clientFinanceEmail,
  clientCc = [],
  autoSendEnabled = true,
  events = mockEvents,
  onSend,
  onResend,
}: EmailDeliveryPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [showCustomSend, setShowCustomSend] = useState(false)
  const [customTo, setCustomTo] = useState("")
  const [customCc, setCustomCc] = useState("")
  const [sending, setSending] = useState(false)

  const primaryEmail = clientInvoiceEmail || clientEmail
  const lastEvent = events.length > 0 ? events[0] : null

  const handleSend = () => {
    setSending(true)
    const toList = showCustomSend && customTo
      ? customTo.split(",").map((e) => e.trim()).filter(Boolean)
      : primaryEmail ? [primaryEmail] : []
    const ccList = showCustomSend && customCc
      ? customCc.split(",").map((e) => e.trim()).filter(Boolean)
      : clientCc

    onSend?.({ to: toList, cc: ccList, bcc: [] })
    setTimeout(() => setSending(false), 1500)
  }

  const handleResend = (eventId: string) => {
    onResend?.(eventId)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-indigo-500" />
            Email Delivery
          </CardTitle>
          {lastEvent && (
            <Badge
              variant={lastEvent.status === "SENT" || lastEvent.status === "DELIVERED" ? "success" : lastEvent.status === "FAILED" ? "destructive" : "secondary"}
              className="text-xs"
            >
              {statusConfig[lastEvent.status].label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current recipient info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Primary recipient</span>
            <span className="font-medium text-slate-900">{primaryEmail || "Not configured"}</span>
          </div>
          {clientFinanceEmail && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Finance / AP</span>
              <span className="text-slate-700">{clientFinanceEmail}</span>
            </div>
          )}
          {clientCc.length > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">CC</span>
              <span className="text-slate-700 text-right">{clientCc.join(", ")}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Auto-send</span>
            <Badge variant={autoSendEnabled ? "success" : "secondary"} className="text-xs">
              {autoSendEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Send actions */}
        <div className="space-y-2">
          {!showCustomSend ? (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSend}
                loading={sending}
                disabled={!primaryEmail}
              >
                <Send className="h-3.5 w-3.5" />
                {lastEvent ? "Resend Invoice" : "Send Invoice"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowCustomSend(true)}
              >
                <Users className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Custom Recipients</Label>
                <button onClick={() => setShowCustomSend(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="To: email1@example.com, email2@example.com"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="CC: finance@company.com (optional)"
                  value={customCc}
                  onChange={(e) => setCustomCc(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <Button size="sm" className="w-full" onClick={handleSend} loading={sending}>
                <Send className="h-3.5 w-3.5" />
                Send to Custom Recipients
              </Button>
            </div>
          )}
        </div>

        {/* Send history */}
        {events.length > 0 && (
          <>
            <Separator />
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
            >
              <span>Delivery History ({events.length})</span>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {expanded && (
              <div className="space-y-2">
                {events.map((event) => {
                  const config = statusConfig[event.status]
                  const Icon = config.icon
                  return (
                    <div key={event.id} className="rounded-lg border border-slate-100 p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <Icon className={`h-4 w-4 mt-0.5 ${config.color}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{config.label}</p>
                            <p className="text-xs text-slate-400">
                              {event.recipients.join(", ")}
                            </p>
                            {event.sentAt && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                {formatDate(event.sentAt, "dd.MM.yyyy HH:mm")}
                              </p>
                            )}
                            {event.errorMessage && (
                              <p className="text-xs text-red-500 mt-0.5">{event.errorMessage}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {event.isAutoSend && (
                            <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                          )}
                          {event.status === "FAILED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleResend(event.id)}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
