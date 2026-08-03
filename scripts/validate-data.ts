import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Zod Schemas
const EraSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  namePl: z.string().optional(),
  discipline: z.enum(['painting', 'music', 'literature', 'philosophy', 'architecture', 'sculpture', 'general']),
  startYear: z.number().int(),
  endYear: z.number().int(),
  color: z.string().regex(/^#([0-9a-fA-F]{3}){1,2}$/),
  description: z.string(),
  descriptionPl: z.string().optional(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().default(1),
  minZoom: z.number().optional().default(1)
}).refine(data => data.startYear < data.endYear, {
  message: "startYear must be strictly less than endYear"
});

const ArtistRelationshipsSchema = z.object({
  influencedBy: z.array(z.string()).default([]),
  influenced: z.array(z.string()).default([]),
  contemporaries: z.array(z.string()).default([]),
  movements: z.array(z.string()).default([])
});

const ArtworkEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  titlePl: z.string().optional(),
  year: z.number().int(),
  medium: z.string().optional(),
  location: z.string().optional(),
  locationPl: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  description: z.string().optional(),
  descriptionPl: z.string().optional()
});

const ArtistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  namePl: z.string().optional(),
  discipline: z.enum(['painting', 'music', 'literature', 'philosophy', 'architecture', 'sculpture']),
  era: z.string().min(1),
  birthYear: z.number().int(),
  deathYear: z.number().int(),
  nationality: z.string().optional(),
  nationalityPl: z.string().optional(),
  bio: z.string().min(10),
  bioPl: z.string().optional(),
  notableWorks: z.array(z.string()),
  notableWorksPl: z.array(z.string()).optional(),
  catalog: z.array(ArtworkEntrySchema).optional(),
  imageUrl: z.string().nullable().optional(),
  impactScore: z.number().min(1.0).max(10.0).optional().default(8.5),
  wikidataId: z.string().optional(),
  metObjectId: z.number().optional(),
  relationships: ArtistRelationshipsSchema.default({}),
  sources: z.array(z.string().url()).min(1)
}).refine(data => data.birthYear < data.deathYear, {
  message: "birthYear must be strictly less than deathYear"
});

type Era = z.infer<typeof EraSchema>;
type Artist = z.infer<typeof ArtistSchema>;

function validate() {
  console.log('🔍 Validating Timeline Data...\n');
  let errors = 0;

  // 1. Read & Validate Eras
  const erasPath = path.join(rootDir, 'data', 'eras.json');
  if (!fs.existsSync(erasPath)) {
    console.error(`❌ Missing eras.json file at ${erasPath}`);
    process.exit(1);
  }

  const rawEras = JSON.parse(fs.readFileSync(erasPath, 'utf-8'));
  const eraMap = new Map<string, Era>();

  if (!Array.isArray(rawEras)) {
    console.error('❌ eras.json must be an array of era objects');
    process.exit(1);
  }

  rawEras.forEach((eraData, idx) => {
    const result = EraSchema.safeParse(eraData);
    if (!result.success) {
      console.error(`❌ Invalid era entry at index ${idx}:`, result.error.format());
      errors++;
    } else {
      if (eraMap.has(result.data.id)) {
        console.error(`❌ Duplicate era ID: "${result.data.id}"`);
        errors++;
      } else {
        eraMap.set(result.data.id, result.data);
      }
    }
  });

  console.log(`✅ Loaded and verified ${eraMap.size} eras.`);

  // 2. Read & Validate Artists
  const artistsDir = path.join(rootDir, 'data', 'artists');
  if (!fs.existsSync(artistsDir)) {
    console.error(`❌ Missing artists directory at ${artistsDir}`);
    process.exit(1);
  }

  const artistFiles = fs.readdirSync(artistsDir).filter(f => f.endsWith('.json'));
  const artistMap = new Map<string, Artist>();

  artistFiles.forEach(file => {
    const filePath = path.join(artistsDir, file);
    const rawContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const result = ArtistSchema.safeParse(rawContent);

    if (!result.success) {
      console.error(`❌ Data validation error in ${file}:`, result.error.format());
      errors++;
    } else {
      const artist = result.data;
      const expectedId = path.basename(file, '.json');
      if (artist.id !== expectedId) {
        console.error(`❌ Mismatched artist ID in ${file}: file name is "${expectedId}" but content ID is "${artist.id}"`);
        errors++;
      }

      if (artistMap.has(artist.id)) {
        console.error(`❌ Duplicate artist ID: "${artist.id}" in ${file}`);
        errors++;
      } else {
        artistMap.set(artist.id, artist);
      }
    }
  });

  console.log(`✅ Loaded and verified ${artistMap.size} artist files.`);

  // 3. Cross-reference checks
  artistMap.forEach((artist, id) => {
    // Era existence check
    if (!eraMap.has(artist.era)) {
      console.error(`❌ Artist "${id}" references non-existent era "${artist.era}"`);
      errors++;
    }

    // Relationships check
    const rels = artist.relationships;
    const checkRefs = (refList: string[], type: string) => {
      refList.forEach(refId => {
        if (!artistMap.has(refId)) {
          console.error(`❌ Artist "${id}" references non-existent artist "${refId}" in ${type}`);
          errors++;
        }
      });
    };

    checkRefs(rels.influencedBy, 'influencedBy');
    checkRefs(rels.influenced, 'influenced');
    checkRefs(rels.contemporaries, 'contemporaries');
  });

  if (errors > 0) {
    console.error(`\n💥 Data validation failed with ${errors} error(s).`);
    process.exit(1);
  }

  console.log('\n🎉 Data validation passed with 0 errors!');
}

validate();
