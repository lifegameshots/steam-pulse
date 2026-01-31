/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';

export interface GuideStep {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

interface FeatureGuideModalProps {
  featureKey: string; // localStorage 키로 사용
  title: string;
  description: string;
  steps: GuideStep[];
  triggerButton?: React.ReactNode;
  showOnFirstVisit?: boolean;
}

export function FeatureGuideModal({
  featureKey,
  title,
  description,
  steps,
  triggerButton,
  showOnFirstVisit = true,
}: FeatureGuideModalProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const storageKey = `guide_seen_${featureKey}`;

  useEffect(() => {
    if (showOnFirstVisit) {
      const seen = localStorage.getItem(storageKey);
      if (!seen) {
        setOpen(true);
      }
    }
  }, [showOnFirstVisit, storageKey]);

  const handleClose = () => {
    setOpen(false);
    setCurrentStep(0);
    localStorage.setItem(storageKey, 'true');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleOpenManual = () => {
    setOpen(true);
    setCurrentStep(0);
  };

  return (
    <>
      {triggerButton ? (
        <div onClick={handleOpenManual}>{triggerButton}</div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleOpenManual}
          className="text-slate-400 hover:text-white"
        >
          <HelpCircle className="w-4 h-4 mr-1" />
          사용 가이드
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-700">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl text-white">{title}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-slate-400 hover:text-white -mr-2"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <DialogDescription className="text-slate-400">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Step indicator */}
            <div className="flex justify-center gap-2 mb-6">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-500'
                      : 'bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            {/* Current step content */}
            <div className="bg-slate-800/50 rounded-lg p-6 min-h-[180px]">
              <div className="flex items-start gap-4">
                {steps[currentStep].icon && (
                  <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
                    {steps[currentStep].icon}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-white mb-2">
                    {currentStep + 1}. {steps[currentStep].title}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                    {steps[currentStep].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between mt-6">
              <Button
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                이전
              </Button>

              <span className="text-slate-500 text-sm self-center">
                {currentStep + 1} / {steps.length}
              </span>

              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {currentStep === steps.length - 1 ? (
                  '시작하기'
                ) : (
                  <>
                    다음
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default FeatureGuideModal;
