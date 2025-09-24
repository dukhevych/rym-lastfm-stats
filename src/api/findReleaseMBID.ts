import { ERYMReleaseType } from '@/helpers/enums';

interface MBReleaseSearchParams {
  artist: string;
  title: string;
  /** Add light fuzziness to terms (Lucene ~) if false. */
  strict?: boolean;
  /** Optionally bias toward a year (not hard filter). */
  year?: number;
  /** Optionally bias toward country code (not hard filter). */
  country?: string;
}

interface FindReleaseMBIDOptions {
  params: MBReleaseSearchParams;
  entityType: ERYMReleaseType;
}

type MBSource = 'release' | 'release-group';

interface MBFindResult {
  mbid: string[] | null;
  source: MBSource | null;
  raw?: any;
}

const BASE_URL = 'https://musicbrainz.org/ws/2/';

export const RYMEntityMBPrimaryType: Record<ERYMReleaseType, string | null> = {
  [ERYMReleaseType.Album]: 'album',
  [ERYMReleaseType.Compilation]: 'album', // will also add secondarytype:compilation
  [ERYMReleaseType.EP]: 'ep',
  [ERYMReleaseType.Single]: 'single',
  [ERYMReleaseType.MusicVideo]: null, // not a release/release-group in MB sense
};

function qEscape(s: string): string {
  // Minimal escaping for Lucene special chars inside quotes
  return s.replace(/["\\]/g, '\\$&');
}

function fuzzyTerm(term: string, strict?: boolean): string {
  // Apply ~ for mild fuzziness on single words when not strict
  if (strict) return `"${qEscape(term)}"`;
  // If it’s multi-word, wrap quoted (phrase) + add per-word fuzziness as a helper clause
  const words = term.trim().split(/\s+/);
  if (words.length === 1) return `${qEscape(words[0])}~`;
  const fuzzyWords = words.map(w => `${qEscape(w)}~`).join(' ');
  // Combine: prefer exact phrase, allow fuzzy per-word match
  return `("${qEscape(term)}" OR (${fuzzyWords}))`;
}

function buildReleaseQuery(p: MBReleaseSearchParams): string {
  const artistQ = `artist:${fuzzyTerm(p.artist, p.strict)}`;
  const titleQ = `release:${fuzzyTerm(p.title, p.strict)}`;
  const statusQ = `status:official`; // prefer official releases
  const extras: string[] = [];

  if (p.year) extras.push(`date:${p.year}`);
  if (p.country) extras.push(`country:${p.country}`);

  return [artistQ, titleQ, statusQ, ...extras].join(' AND ');
}

function buildReleaseGroupQuery(
  p: MBReleaseSearchParams,
  entityType: ERYMReleaseType
): string {
  const artistQ = `artist:${fuzzyTerm(p.artist, p.strict)}`;
  const titleQ = `releasegroup:${fuzzyTerm(p.title, p.strict)}`;
  const clauses: string[] = [artistQ, titleQ];

  const primary = RYMEntityMBPrimaryType[entityType];
  if (primary) clauses.push(`primarytype:${primary}`);

  // Compilation nuance: MB models it as secondary type on a primary "Album"
  if (entityType === ERYMReleaseType.Compilation) {
    clauses.push(`secondarytype:compilation`);
  }

  if (p.year) clauses.push(`firstreleasedate:${p.year}`);
  // country is not a release-group field; omit here

  return clauses.join(' AND ');
}

async function getJson(url: URL) {
  const res = await fetch(url.toString(), {
    headers: {
      // Browsers can’t set User-Agent; MB asks for identification—Origin will show up.
      Accept: 'application/json',
    },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`MusicBrainz request failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Find MusicBrainz MBID for a release by artist/title.
 * Prefers exact release MBID; falls back to release-group MBID if needed.
 */
export async function findReleaseMBID({
  params,
  entityType,
}: FindReleaseMBIDOptions): Promise<MBFindResult> {
  // Track/MusicVideo aren’t modeled as releases; bail early.
  if (entityType === ERYMReleaseType.MusicVideo || entityType === ERYMReleaseType.Single /* single can still be a release; we keep it, this comment is just a reminder */) {
    // NOTE: Singles *are* releases in MB (keep processing). Music videos are not.
    // nothing to do here for music video—continue and let query possibly return nothing
  }

  // 1) Try /release (best for Last.fm’s album MBID expectations)
  {
    const url = new URL(`${BASE_URL}release`);
    url.searchParams.set('fmt', 'json');
    url.searchParams.set('limit', '10');
    url.searchParams.set('query', buildReleaseQuery(params));

    const data = await getJson(url);
    const releases: any[] = Array.isArray(data?.releases) ? data.releases : [];

    // Rank by MB score (0-100 string), prefer exact-ish title & artist matches first
    const rankedWith100Score: { item: any; score: number }[] = [];

    releases.forEach(r => {
      const score = typeof r?.score === 'string' ? parseInt(r.score, 10) : (r?.score ?? 0);

      if (score === 100) {
        rankedWith100Score.push({
          item: r,
          score,
        });
      }
    });

    if (rankedWith100Score.length > 0) {
      return {
        mbid: rankedWith100Score.map(r => r.item.id),
        source: 'release',
        raw: rankedWith100Score,
      };
    }

    const ranked = releases
      .map(r => ({
        item: r,
        score: typeof r?.score === 'string' ? parseInt(r.score, 10) : (r?.score ?? 0),
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.item;

    if (best?.id) {
      return { mbid: [best.id], source: 'release', raw: best };
    }
  }

  // 2) Fall back to /release-group (gives you group MBID if specific release is elusive)
  {
    const url = new URL(`${BASE_URL}release-group`);
    url.searchParams.set('fmt', 'json');
    url.searchParams.set('limit', '10');
    url.searchParams.set('query', buildReleaseGroupQuery(params, entityType));

    const data = await getJson(url);
    const groups: any[] = Array.isArray(data?.['release-groups']) ? data['release-groups'] : [];

    const ranked = groups
      .map(g => ({
        item: g,
        score: typeof g?.score === 'string' ? parseInt(g.score, 10) : (g?.score ?? 0),
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.item;
    if (best?.id) {
      return { mbid: best.id, source: 'release-group', raw: best };
    }
  }

  return { mbid: null, source: null };
}
