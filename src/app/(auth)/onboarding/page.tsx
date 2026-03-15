"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Zap, ArrowRight, ArrowLeft, CheckCircle2,
  Building2, Receipt, CreditCard, FileText, Briefcase,
  Users, Wallet, Shield, Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ONBOARDING_STEPS, TOTAL_STEPS } from "@/lib/onboarding/onboarding.types"
import {
  getOnboardingState,
  loadOnboarding,
  updateStepData,
  markStepComplete,
  setCurrentStep,
  goToNextStep,
  goToPrevStep,
  completeOnboarding,
  applyOnboardingToApp,
  addServiceEntry,
  removeServiceEntry,
  updateServiceEntry,
  subscribe,
} from "@/lib/onboarding/onboarding.store"
import { validateStep, canComplete } from "@/lib/onboarding/onboarding.validation"
import { logAudit } from "@/lib/audit/audit.service"

// Step components (lazy loaded by key)
import { StepWelcome } from "@/components/onboarding/step-welcome"
import { StepCompany } from "@/components/onboarding/step-company"
import { StepBilling } from "@/components/onboarding/step-billing"
import { StepBanking } from "@/components/onboarding/step-banking"
import { StepInvoicing } from "@/components/onboarding/step-invoicing"
import { StepServices } from "@/components/onboarding/step-services"
import { StepClients } from "@/components/onboarding/step-clients"
import { StepExpenses } from "@/components/onboarding/step-expenses"
import { StepCompliance } from "@/components/onboarding/step-compliance"
import { StepReview } from "@/components/onboarding/step-review"

const STEP_ICONS: Record<string, any> = {
  Sparkles, Building2, Receipt, CreditCard, FileText,
  Briefcase, Users, Wallet, Shield, CheckCircle2,
}

export default function OnboardingPage() {
  const router = useRouter()
  const [, forceUpdate] = useState(0)
  const [errors, setErrors] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)
  const [sourceMetadata, setSourceMetadata] = useState<any>(null)

  useEffect(() => {
    loadOnboarding()
    return subscribe(() => forceUpdate((n) => n + 1))
  }, [])

  const state = getOnboardingState()
  const { currentStep, completedSteps, data } = state
  const currentStepDef = ONBOARDING_STEPS[currentStep]
  const progress = Math.round((completedSteps.length / TOTAL_STEPS) * 100)

  const handleNext = useCallback(() => {
    // Validate current step
    const result = validateStep(currentStep, data)
    if (!result.valid) {
      const errMap = new Map<string, string>()
      result.errors.forEach((e) => errMap.set(e.field, e.message))
      setErrors(errMap)
      return
    }
    setErrors(new Map())
    goToNextStep()
  }, [currentStep, data])

  const handlePrev = useCallback(() => {
    setErrors(new Map())
    goToPrevStep()
  }, [])

  const handleGoToStep = useCallback((step: number) => {
    setErrors(new Map())
    setCurrentStep(step)
  }, [])

  const handleFinish = useCallback(() => {
    const { ready, missing } = canComplete(data)
    if (!ready) {
      const errMap = new Map<string, string>()
      missing.forEach((m) => errMap.set(`step_${m}`, `${m} section is incomplete`))
      setErrors(errMap)
      return
    }

    setLoading(true)
    try {
      applyOnboardingToApp()
      completeOnboarding()

      logAudit({
        action: "ONBOARDING_COMPLETE",
        entityType: "ORGANIZATION",
        actor: "SYSTEM",
        success: true,
        details: {
          companyName: data.company.legalName,
          currency: data.invoicing.defaultCurrency,
          servicesCount: data.services.services.length,
        },
      })

      setTimeout(() => router.push("/dashboard"), 800)
    } catch (err) {
      setLoading(false)
    }
  }, [data, router])

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepWelcome />
      case 1:
        return (
          <StepCompany
            data={data.company}
            onUpdate={(d) => updateStepData("company", d)}
            errors={errors}
            billingData={data.billing}
            onUpdateBilling={(d) => updateStepData("billing", d)}
            sourceMetadata={sourceMetadata}
            onSourceMetadataChange={setSourceMetadata}
          />
        )
      case 2:
        return (
          <StepBilling
            data={data.billing}
            onUpdate={(d) => updateStepData("billing", d)}
            errors={errors}
          />
        )
      case 3:
        return (
          <StepBanking
            data={data.banking}
            onUpdate={(d) => updateStepData("banking", d)}
            errors={errors}
          />
        )
      case 4:
        return (
          <StepInvoicing
            data={data.invoicing}
            onUpdate={(d) => updateStepData("invoicing", d)}
            errors={errors}
          />
        )
      case 5:
        return (
          <StepServices
            data={data.services}
            onUpdate={(d) => updateStepData("services", d)}
            errors={errors}
            onAddService={addServiceEntry}
            onRemoveService={removeServiceEntry}
            onUpdateService={updateServiceEntry}
          />
        )
      case 6:
        return (
          <StepClients
            data={data.clients}
            onUpdate={(d) => updateStepData("clients", d)}
            errors={errors}
          />
        )
      case 7:
        return (
          <StepExpenses
            data={data.expenses}
            onUpdate={(d) => updateStepData("expenses", d)}
            errors={errors}
          />
        )
      case 8:
        return (
          <StepCompliance
            data={data.compliance}
            onUpdate={(d) => updateStepData("compliance", d)}
            errors={errors}
          />
        )
      case 9:
        return (
          <StepReview
            data={data}
            completedSteps={completedSteps}
            onGoToStep={handleGoToStep}
            validationStatus={canComplete(data)}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Set up Fakturator</h1>
          <p className="mt-1 text-sm text-slate-500">
            Step {currentStep + 1} of {TOTAL_STEPS} — {currentStepDef?.description}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="h-1.5 rounded-full bg-slate-100">
            <div
              className="h-1.5 rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5">
          {ONBOARDING_STEPS.map((step) => {
            const Icon = STEP_ICONS[step.icon] || Sparkles
            const isActive = step.id === currentStep
            const isDone = completedSteps.includes(step.id)
            return (
              <button
                key={step.id}
                onClick={() => (isDone || step.id <= currentStep) && handleGoToStep(step.id)}
                disabled={step.id > currentStep && !isDone}
                className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : isDone
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {isDone && !isActive ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <Icon className="h-3 w-3" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </button>
            )
          })}
        </div>

        {/* Step content */}
        <Card className="border-0 shadow-xl animate-fade-in">
          <CardContent className="p-6 sm:p-8">
            {renderStep()}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
              <Button
                variant="ghost"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                {!currentStepDef?.required && currentStep < TOTAL_STEPS - 1 && (
                  <Button variant="ghost" onClick={() => { markStepComplete(currentStep); goToNextStep() }} className="text-slate-400">
                    Skip
                  </Button>
                )}

                {currentStep < TOTAL_STEPS - 1 ? (
                  <Button onClick={handleNext}>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleFinish} loading={loading} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Launch Fakturator
                  </Button>
                )}
              </div>
            </div>

            {/* Validation errors */}
            {errors.size > 0 && (
              <div className="mt-4 rounded-lg bg-red-50 p-3">
                <p className="text-sm font-medium text-red-800 mb-1">Please fix the following:</p>
                {Array.from(errors.values()).map((err, i) => (
                  <p key={i} className="text-xs text-red-600">• {err}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Autosave indicator */}
        <p className="mt-4 text-center text-xs text-slate-400">
          Your progress is saved automatically
        </p>
      </div>
    </div>
  )
}
