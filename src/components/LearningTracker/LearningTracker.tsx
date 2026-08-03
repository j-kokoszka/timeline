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
  lang,
  onClick
}) => {
  // Determine Art Connoisseur Badge Title based on total studied items count
  let badgeTitle = lang === 'pl' ? 'Początkujący Odkrywca' : 'Art Beginner';
  if (studiedCount >= 25) badgeTitle = lang === 'pl' ? 'Mistrz Historii Sztuki' : 'Art Grandmaster';
  else if (studiedCount >= 15) badgeTitle = lang === 'pl' ? 'Znawca Renesansu i Baroku' : 'Renaissance & Baroque Expert';
  else if (studiedCount >= 5) badgeTitle = lang === 'pl' ? 'Pasjonat Sztuki' : 'Art Enthusiast';
  else if (studiedCount > 0) badgeTitle = lang === 'pl' ? 'Adept Sztuki' : 'Art Apprentice';

  return (
    <div
      className="learning-tracker-badge"
      onClick={onClick}
      title={`${badgeTitle} (${studiedCount} ${lang === 'pl' ? 'Opanowanych Dzieł' : 'Masterpieces Mastered'})`}
    >
      <GraduationCap size={16} />
      <span>{studiedCount} {lang === 'pl' ? 'Opanowanych' : 'Mastered'}</span>
      <Award size={14} style={{ color: studiedCount > 0 ? '#eab308' : 'var(--text-muted)' }} />
    </div>
  );
};
