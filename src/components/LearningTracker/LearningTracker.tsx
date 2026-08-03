import React from 'react';
import { Award, GraduationCap } from 'lucide-react';
import { Language } from '../../types/timeline';
import './LearningTracker.css';

interface LearningTrackerProps {
  studiedCount: number;
  totalWorksCount: number;
  lang: Language;
  onClick: () => void;
}

export const LearningTracker: React.FC<LearningTrackerProps> = ({
  studiedCount,
  totalWorksCount,
  lang,
  onClick
}) => {
  const percent = totalWorksCount > 0 ? Math.min(100, Math.round((studiedCount / totalWorksCount) * 100)) : 0;

  // Determine Art Connoisseur Badge Title
  let badgeTitle = lang === 'pl' ? 'Początkujący Odkrywca' : 'Art Beginner';
  if (percent >= 75) badgeTitle = lang === 'pl' ? 'Mistrz Historii Sztuki' : 'Art Grandmaster';
  else if (percent >= 50) badgeTitle = lang === 'pl' ? 'Znawca Renesansu i Baroku' : 'Renaissance & Baroque Expert';
  else if (percent >= 25) badgeTitle = lang === 'pl' ? 'Pasjonat Sztuki' : 'Art Enthusiast';
  else if (percent > 0) badgeTitle = lang === 'pl' ? 'Adept Sztuki' : 'Art Apprentice';

  return (
    <div
      className="learning-tracker-badge"
      onClick={onClick}
      title={`${badgeTitle} (${studiedCount} / ${totalWorksCount} ${lang === 'pl' ? 'Opanowanych Dzieł' : 'Masterworks Studied'})`}
    >
      <GraduationCap size={16} />
      <span>{studiedCount} / {totalWorksCount}</span>
      <div className="learning-progress-bar-bg">
        <div className="learning-progress-bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <Award size={14} style={{ color: percent > 0 ? '#eab308' : 'var(--text-muted)' }} />
    </div>
  );
};
