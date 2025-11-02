'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface OnboardingContextType {
  isOnboardingCompleted: boolean
  currentStep: number
  loading: boolean
  completeOnboarding: () => void
  saveProgress: (step: number) => void
  resetOnboarding: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}

interface OnboardingProviderProps {
  children: ReactNode
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load onboarding status from localStorage
    const loadOnboardingStatus = () => {
      try {
        const savedStatus = localStorage.getItem('onboarding-completed')
        const savedStep = localStorage.getItem('onboarding-current-step')
        
        setIsOnboardingCompleted(savedStatus === 'true')
        setCurrentStep(savedStep ? parseInt(savedStep, 10) : 0)
      } catch (error) {
        console.error('Failed to load onboarding status:', error)
        // Default to not completed if there's an error
        setIsOnboardingCompleted(false)
        setCurrentStep(0)
      } finally {
        setLoading(false)
      }
    }

    loadOnboardingStatus()
  }, [])

  const completeOnboarding = () => {
    try {
      localStorage.setItem('onboarding-completed', 'true')
      localStorage.setItem('onboarding-current-step', '0')
      setIsOnboardingCompleted(true)
      setCurrentStep(0)
    } catch (error) {
      console.error('Failed to complete onboarding:', error)
    }
  }

  const saveProgress = (step: number) => {
    try {
      localStorage.setItem('onboarding-current-step', step.toString())
      setCurrentStep(step)
    } catch (error) {
      console.error('Failed to save onboarding progress:', error)
    }
  }

  const resetOnboarding = () => {
    try {
      localStorage.removeItem('onboarding-completed')
      localStorage.removeItem('onboarding-current-step')
      setIsOnboardingCompleted(false)
      setCurrentStep(0)
    } catch (error) {
      console.error('Failed to reset onboarding:', error)
    }
  }

  const value: OnboardingContextType = {
    isOnboardingCompleted,
    currentStep,
    loading,
    completeOnboarding,
    saveProgress,
    resetOnboarding,
  }

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  )
}
