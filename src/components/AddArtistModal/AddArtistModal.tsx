import React, { useState } from 'react';
import { X, Sparkles, PlusCircle } from 'lucide-react';
import { Artist, Discipline, Language, Era } from '../../types/timeline';
import { fetchCulturalEntityData, autoDetectArtistDetails, autoExtractNotableWorks, autoGenerateRelationships } from '../../services/cultureApi';
import { saveCustomArtist, unhideArtist } from '../../services/userStorage';
import './AddArtistModal.css';

interface AddArtistModalProps {
  isOpen: boolean;
  lang: Language;
  eras: Era[];
  onClose: () => void;
  onArtistAdded: (newArtist: Artist) => void;
}

export const AddArtistModal: React.FC<AddArtistModalProps> = ({
  isOpen,
  lang,
  eras,
  onClose,
  onArtistAdded
}) => {
  const [name, setName] = useState<string>('');
  const [discipline, setDiscipline] = useState<Discipline>('painting');
  const [eraId, setEraId] = useState<string>('high-renaissance');
  const [birthYear, setBirthYear] = useState<number>(1850);
  const [deathYear, setDeathYear] = useState<number>(1910);
  const [nationality, setNationality] = useState<string>('European');
  const [bio, setBio] = useState<string>('');
  const [impactScore, setImpactScore] = useState<number>(9.0);
  const [isFetchingWiki, setIsFetchingWiki] = useState<boolean>(false);

  if (!isOpen) return null;

  // Auto-fill from Wikipedia REST API
  const handleAutoFetchWiki = async () => {
    if (!name.trim()) return;
    setIsFetchingWiki(true);
    const data = await fetchCulturalEntityData(name);
    if (data.summary || data.description) {
      const rawText = `${data.description || ''} ${data.summary || ''}`;
      setBio(data.summary || data.description || '');
      const detected = autoDetectArtistDetails(name, rawText, eras);
      if (detected) {
        setDiscipline(detected.discipline);
        setEraId(detected.eraId);
        setBirthYear(detected.birthYear);
        setDeathYear(detected.deathYear);
      }
    }
    setIsFetchingWiki(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-');

    const tempArtist = { id, name, birthYear, deathYear, discipline, bio, eraId };
    const relationships = autoGenerateRelationships(tempArtist, eras as any);
    const notableWorks = await autoExtractNotableWorks(name, bio);

    const newArtist: Artist = {
      ...tempArtist,
      era: eraId,
      nationality,
      impactScore,
      notableWorks,
      catalog: notableWorks.map((work, idx) => ({
        id: `${id}-work-${idx}`,
        title: work,
        year: Math.round(birthYear + (deathYear - birthYear) * 0.5),
        medium: `${discipline} / Masterwork`
      })),
      sources: [],
      relationships
    };

    unhideArtist(id);
    saveCustomArtist(newArtist);
    onArtistAdded(newArtist);
    onClose();
  };

  return (
    <div className="add-artist-overlay" onClick={onClose}>
      <div className="add-artist-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 className="add-artist-title">
            ➕ {lang === 'pl' ? 'Dodaj Nowego Mistrza do Osi Czasu' : 'Add Custom Master to Timeline'}
          </h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Artist Name & Auto Fetch */}
          <div className="form-group">
            <label className="form-label">{lang === 'pl' ? 'Imię i Nazwisko Twórcy' : 'Master Name'}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                style={{ flexGrow: 1 }}
                placeholder="e.g. Frida Kahlo, Frederic Chopin..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <button
                type="button"
                className="secondary-cta-btn"
                onClick={handleAutoFetchWiki}
                disabled={isFetchingWiki || !name.trim()}
                style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
              >
                <Sparkles size={14} color="var(--accent-gold)" />
                <span>{isFetchingWiki ? 'Fetching...' : 'Wikipedia Auto-Fetch'}</span>
              </button>
            </div>
          </div>

          {/* Discipline & Era */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'pl' ? 'Dziedzina' : 'Discipline'}</label>
              <select className="form-select" value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)}>
                <option value="painting">{lang === 'pl' ? 'Malarstwo' : 'Painting'}</option>
                <option value="sculpture">{lang === 'pl' ? 'Rzeźba' : 'Sculpture'}</option>
                <option value="architecture">{lang === 'pl' ? 'Architektura' : 'Architecture'}</option>
                <option value="philosophy">{lang === 'pl' ? 'Filozofia' : 'Philosophy'}</option>
                <option value="music">{lang === 'pl' ? 'Muzyka' : 'Music'}</option>
                <option value="literature">{lang === 'pl' ? 'Literatura' : 'Literature'}</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{lang === 'pl' ? 'Epoka' : 'Era'}</label>
              <select className="form-select" value={eraId} onChange={(e) => setEraId(e.target.value)}>
                {eras.map(e => (
                  <option key={e.id} value={e.id}>{e.name} ({e.startYear}–{e.endYear})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Lifespan Years */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'pl' ? 'Rok Urodzenia (CE)' : 'Birth Year (CE)'}</label>
              <input
                type="number"
                className="form-input"
                value={birthYear}
                onChange={(e) => setBirthYear(parseInt(e.target.value) || 0)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'pl' ? 'Rok Śmierci (CE)' : 'Death Year (CE)'}</label>
              <input
                type="number"
                className="form-input"
                value={deathYear}
                onChange={(e) => setDeathYear(parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          {/* Nationality & CultureDB Rating */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{lang === 'pl' ? 'Narodowość' : 'Nationality'}</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Polish, French, Mexican..."
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">CultureDB Rating (1.0 - 10.0)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                className="form-input"
                value={impactScore}
                onChange={(e) => setImpactScore(parseFloat(e.target.value) || 9.0)}
              />
            </div>
          </div>

          {/* Biography */}
          <div className="form-group">
            <label className="form-label">{lang === 'pl' ? 'Biogram / Opis' : 'Biography Summary'}</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder={lang === 'pl' ? 'Krótki opis osiągnięć mistrza...' : 'Brief description of the master...'}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <button type="submit" className="primary-cta-btn" style={{ marginTop: 8, justifyContent: 'center' }}>
            <PlusCircle size={18} />
            <span>{lang === 'pl' ? 'Zapisz i Dodaj do Osi Czasu' : 'Save & Add to Timeline'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
