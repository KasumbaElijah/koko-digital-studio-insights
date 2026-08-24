'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Check } from 'lucide-react';

interface StrategyEditorProps {
  reportId: string;
  initialGoals: string[];
  initialInsights: string[];
  initialNextSteps: string[];
  onSaveStrategy: (goals: string[], insights: string[], nextSteps: string[]) => Promise<void>;
}

export const StrategyEditor: React.FC<StrategyEditorProps> = ({
  reportId,
  initialGoals,
  initialInsights,
  initialNextSteps,
  onSaveStrategy,
}) => {
  const [goals, setGoals] = useState<string[]>(initialGoals || []);
  const [insights, setInsights] = useState<string[]>(initialInsights || []);
  const [nextSteps, setNextSteps] = useState<string[]>(initialNextSteps || []);

  const [isSaving, setIsSaving] = useState(false);
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
  const removeInsight = (idx: number) => setInsights(insights.filter((_, i) => i !== idx));

  const handleNextStepChange = (idx: number, val: string) => {
    const updated = [...nextSteps];
    updated[idx] = val;
    setNextSteps(updated);
  };

  const addNextStep = () => setNextSteps([...nextSteps, '']);
  const removeNextStep = (idx: number) => setNextSteps(nextSteps.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onSaveStrategy(
        goals.filter((g) => g.trim() !== ''),
        insights.filter((i) => i.trim() !== ''),
        nextSteps.filter((n) => n.trim() !== '')
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 font-heading">
            Strategy & Performance Insights
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Edit report goals, key takeaways, and action items for client presentation.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white text-xs font-semibold rounded-xl hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50"
        >
          {savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" /> Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Strategy'}
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* GOALS */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading">
                GOALS:
              </h3>
              <button
                onClick={addGoal}
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all cursor-pointer"
                title="Add Goal"
              >
                <Plus className="w-4 h-4" />
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

        {/* INSIGHTS */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading">
                INSIGHTS:
              </h3>
              <button
                onClick={addInsight}
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all cursor-pointer"
                title="Add Insight"
              >
                <Plus className="w-4 h-4" />
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

        {/* NEXT STEPS */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wider text-gray-900 uppercase font-heading">
                NEXT STEPS:
              </h3>
              <button
                onClick={addNextStep}
                className="p-1 hover:bg-gray-200 rounded-lg text-gray-600 transition-all cursor-pointer"
                title="Add Next Step"
              >
                <Plus className="w-4 h-4" />
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
