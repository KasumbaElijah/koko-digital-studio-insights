'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Check,
  Eye,
  Printer,
  Lock,
  FileEdit,
} from 'lucide-react';

interface StrategyEditorProps {
  reportId: string;
  initialGoals: string[];
  initialInsights: string[];
  initialNextSteps: string[];
  onSaveStrategy: (
    goals: string[],
    insights: string[],
    nextSteps: string[]
  ) => Promise<void>;
  onSaveAndPreview?: (
    goals: string[],
    insights: string[],
    nextSteps: string[]
  ) => Promise<void>;
  onDownloadPdf?: () => void;
}

export const StrategyEditor: React.FC<StrategyEditorProps> = ({
  reportId,
  initialGoals,
  initialInsights,
  initialNextSteps,
  onSaveStrategy,
  onSaveAndPreview,
  onDownloadPdf,
}) => {
  const [goals, setGoals] = useState<string[]>(initialGoals || []);
  const [insights, setInsights] = useState<string[]>(initialInsights || []);
  const [nextSteps, setNextSteps] = useState<string[]>(initialNextSteps || []);

  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setGoals(initialGoals || []);
    setInsights(initialInsights || []);
    setNextSteps(initialNextSteps || []);
  }, [reportId, initialGoals, initialInsights, initialNextSteps]);

  const handleGoalChange = (idx: number, val: string) => {
    const updated = [...goals];
    updated[idx] = val;
    setGoals(updated);
  };

  const addGoal = () => setGoals([...goals, '']);
  const removeGoal = (idx: number) => setGoals(goals.filter((_, i) => i !== idx));

  const handleInsightChange = (idx: number, val: string) => {
    const updated = [...insights];
    updated[idx] = val;
    setInsights(updated);
  };

  const addInsight = () => setInsights([...insights, '']);
  const removeInsight = (idx: number) =>
    setInsights(insights.filter((_, i) => i !== idx));

  const handleNextStepChange = (idx: number, val: string) => {
    const updated = [...nextSteps];
    updated[idx] = val;
    setNextSteps(updated);
  };

  const addNextStep = () => setNextSteps([...nextSteps, '']);
  const removeNextStep = (idx: number) =>
    setNextSteps(nextSteps.filter((_, i) => i !== idx));

  const getCleanLists = () => ({
    cleanGoals: goals.filter((g) => g.trim() !== ''),
    cleanInsights: insights.filter((i) => i.trim() !== ''),
    cleanNextSteps: nextSteps.filter((n) => n.trim() !== ''),
  });

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      const { cleanGoals, cleanInsights, cleanNextSteps } = getCleanLists();
      await onSaveStrategy(cleanGoals, cleanInsights, cleanNextSteps);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAndOpenPreview = async () => {
    setIsPreviewing(true);
    try {
      const { cleanGoals, cleanInsights, cleanNextSteps } = getCleanLists();
      if (onSaveAndPreview) {
        await onSaveAndPreview(cleanGoals, cleanInsights, cleanNextSteps);
      } else {
        await onSaveStrategy(cleanGoals, cleanInsights, cleanNextSteps);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight text-gray-900 font-heading flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-black" />
              Strategy & Performance Insights
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Lock className="w-3 h-3 text-emerald-600" />
              Pulled Metrics Read-Only • Commentary Editable
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Add your monthly Account Manager commentary for <strong>1. Goals</strong>,{' '}
            <strong>2. Insights</strong>, and <strong>3. Next Steps</strong>, then click{' '}
            <strong>Save &amp; Preview Report</strong> to review alongside live charts and download the PDF.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isPreviewing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" /> Saved to DB!
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Commentary'}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveAndOpenPreview}
            disabled={isSaving || isPreviewing}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            {isPreviewing ? 'Opening Preview...' : 'Save & Preview Report →'}
          </button>

          {onDownloadPdf && (
            <button
              type="button"
              onClick={async () => {
                await handleSave();
                onDownloadPdf();
              }}
              disabled={isSaving || isPreviewing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-black hover:bg-gray-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              Download PDF
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. GOALS */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading">
                1. GOALS:
              </h3>
              <button
                type="button"
                onClick={addGoal}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-200 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 transition-all cursor-pointer"
                title="Add Goal"
              >
                <Plus className="w-3.5 h-3.5" /> Add Goal
              </button>
            </div>
            <div className="space-y-2">
              {goals.map((goal, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold mt-1 text-xs">•</span>
                  <textarea
                    rows={2}
                    value={goal}
                    onChange={(e) => handleGoalChange(idx, e.target.value)}
                    placeholder="Enter strategic goal..."
                    className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg p-2 focus:ring-black focus:border-black outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeGoal(idx)}
                    className="p-1 text-gray-400 hover:text-red-500 mt-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. INSIGHTS */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading">
                2. INSIGHTS:
              </h3>
              <button
                type="button"
                onClick={addInsight}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-200 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 transition-all cursor-pointer"
                title="Add Insight"
              >
                <Plus className="w-3.5 h-3.5" /> Add Insight
              </button>
            </div>
            <div className="space-y-2">
              {insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold mt-1 text-xs">•</span>
                  <textarea
                    rows={2}
                    value={insight}
                    onChange={(e) => handleInsightChange(idx, e.target.value)}
                    placeholder="Enter performance insight..."
                    className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg p-2 focus:ring-black focus:border-black outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeInsight(idx)}
                    className="p-1 text-gray-400 hover:text-red-500 mt-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. NEXT STEPS */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading">
                3. NEXT STEPS:
              </h3>
              <button
                type="button"
                onClick={addNextStep}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white hover:bg-gray-200 border border-gray-200 rounded-lg text-[11px] font-bold text-gray-700 transition-all cursor-pointer"
                title="Add Next Step"
              >
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
            <div className="space-y-2">
              {nextSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-gray-400 font-bold mt-1 text-xs">•</span>
                  <textarea
                    rows={2}
                    value={step}
                    onChange={(e) => handleNextStepChange(idx, e.target.value)}
                    placeholder="Enter actionable next step..."
                    className="w-full text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg p-2 focus:ring-black focus:border-black outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeNextStep(idx)}
                    className="p-1 text-gray-400 hover:text-red-500 mt-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
